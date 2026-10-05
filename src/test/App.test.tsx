import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App, { parseCategories } from "../App";
import { csvText, filterQuery, groupEvents, duration, exportRows } from "../reports";
import type { Activity } from "../types";

const session = {
  username: "manager",
  csrf: "csrf-test",
  server_url: "https://backend.example",
};
const device = {
  id: "device-1234",
  employee_id: "EMP1",
  employee_name: "Alice",
  revoked: false,
  last_seen: new Date().toISOString(),
  state: "active",
  app: "Code.exe",
};
const event: Activity = {
  ...device,
  device_id: device.id,
  start: "2026-09-25T04:00:00Z",
  end: "2026-09-25T05:00:00Z",
  seconds: 3600,
  domain: "",
  project: "Build",
  task: "React",
  category: "productive",
};
function setup(loggedIn = true, events: Activity[] = [event]) {
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    const path = url.split("?")[0];
    const results: Record<string, unknown> = {
      "/api/session": session,
      "/api/login": session,
      "/api/devices": { devices: [device] },
      "/api/report": {
        events,
        attendance: [
          {
            ...device,
            date: "2026-09-25",
            first: event.start,
            last: event.end,
            active: 3600,
            idle: 120,
            locked: 0,
            paused: 0,
            unknown: 60,
          },
        ],
      },
      "/api/screenshots": {
        screenshots: [{ id: "shot1", employee_id: "EMP1", time: event.start }],
      },
      "/api/policy": {
        policy: {
          work_start: "09:00",
          work_end: "18:45",
          work_days: [0, 1, 2, 3, 4],
          holidays: [],
          idle_seconds: 300,
          retention_days: 365,
          screenshot_seconds: 0,
        },
      },
      "/api/projects": { projects: ["Build"] },
      "/api/categories": {
        categories: [
          { match: "Code.exe", category: "productive", match_kind: "exact" },
        ],
      },
      "/api/invite": { code: "PRIVATE-CODE" },
      "/api/shot": { image: "aGVsbG8=" },
      "/api/audit": { audit: [] },
    };
    if (!loggedIn && path === "/api/session")
      return new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
      });
    return new Response(
      JSON.stringify(
        options?.method === "POST" &&
          !["/api/login", "/api/invite"].includes(path)
          ? {}
          : results[path] || {},
      ),
      { status: 200 },
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(<App />);
  return fetcher;
}
describe("React dashboard", () => {
  it("signs in using a cookie request and renders each report without HTML injection", async () => {
    const fetcher = setup(false);
    fireEvent.change(await screen.findByLabelText("Username"), {
      target: { value: "manager" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Team at a glance");
    for (const title of [
      "Attendance",
      "Apps & websites",
      "Activity timeline",
      "Projects & tasks",
      "Team & devices",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: title }));
      expect(
        screen.getByRole("heading", { name: title, level: 1 }),
      ).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
    }
    expect(
      fetcher.mock.calls.find(([url]) => url === "/api/login")?.[1]
        ?.credentials,
    ).toBe("same-origin");
  });
  it("creates enrollment codes with CSRF and closes dialogs", async () => {
    const fetcher = setup();
    await screen.findByText("Team at a glance");
    fireEvent.click(screen.getByRole("button", { name: "Add employee" }));
    fireEvent.change(screen.getByLabelText("Employee name"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText("Employee ID"), {
      target: { value: "EMP2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create enrollment code" }),
    );
    await screen.findByText("PRIVATE-CODE");
    const request = fetcher.mock.calls.find(
      ([url]) => url === "/api/invite",
    )![1]!;
    expect(request.headers).toHaveProperty("X-CSRF-Token", "csrf-test");
    expect(JSON.parse(String(request.body))).toEqual({
      employee_name: "Bob",
      employee_id: "EMP2",
    });
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("loads screenshots only on demand and supports settings edits", async () => {
    const fetcher = setup();
    await screen.findByText("Team at a glance");
    expect(
      fetcher.mock.calls.some(([url]) => url.startsWith("/api/shot?")),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Screenshots" }));
    fireEvent.click(screen.getByRole("button", { name: /Open screenshot/ }));
    expect(
      await screen.findByRole("img", { name: /Screenshot for/ }),
    ).toHaveAttribute("src", "data:image/jpeg;base64,aGVsbG8=");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Workspace settings" }));
    fireEvent.change(screen.getByLabelText("Idle threshold (seconds)"), {
      target: { value: "180" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
    await screen.findByText("Schedule saved.");
    const request = fetcher.mock.calls.find(
      ([url, opts]) => url === "/api/policy" && opts?.method === "POST",
    )![1]!;
    expect(JSON.parse(String(request.body))).toMatchObject({
      idle_seconds: 180,
      work_days: [0, 1, 2, 3, 4],
    });
  });
  it("applies report date filters and signs out without leaving employee data", async () => {
    const fetcher = setup();
    await screen.findByText("Team at a glance");
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText("Through"), {
      target: { value: "2026-09-25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([url]) =>
          url.includes("date=2026-09-01&end=2026-09-25"),
        ),
      ).toBe(true),
    );
    await screen.findByText("Team at a glance");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { name: "Manager sign in" });
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
  it("preserves exact classification rules and rejects invalid rules", () => {
    expect(parseCategories("Code.exe, productive, exact")[0].match_kind).toBe(
      "exact",
    );
    expect(() => parseCategories("Code.exe, wrong")).toThrow();
  });
  it("validates ranges, protects CSV formulas, and only groups active time", () => {
    expect(() =>
      filterQuery({ from: "2026-01-01", through: "2026-09-25", employee: "" }),
    ).toThrow();
    expect(csvText([["=SUM(A1)", 'a"b']])).toContain('"\'=SUM(A1)","a""b"');
    expect(
      groupEvents(
        [event, { ...event }, { ...event, state: "idle" }],
        "usage",
      )[0].seconds,
    ).toBe(7200);
    expect(event.seconds).toBe(3600);
  });
  it("keeps distinct file contexts separate without splitting overview app totals", () => {
    const events = [{...event, window_title: 'C:\\company\\main.py'}, {...event, window_title: 'C:\\personal\\main.py'}];
    expect(groupEvents(events, 'usage', true)).toHaveLength(2);
    expect(groupEvents(events, 'usage')).toHaveLength(1);
    expect(duration(5)).toBe('5s');
    expect(duration(65)).toBe('1m 5s');
    expect(duration(0.25)).toBe('<1s');
  });
  it("shows context and classification controls on Apps and websites", async () => {
    setup();
    await screen.findByText('Team at a glance');
    fireEvent.click(screen.getByRole('button', {name: 'Apps & websites'}));
    await screen.findByRole('columnheader', {name: 'Window / file context'});
    expect(screen.getByRole('button', {name: 'Manage classifications'})).toBeInTheDocument();
    expect(screen.getByText('No context recorded')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('\u00e2\u20ac');
  });
  it("shows review evidence and filters unflagged activity without changing durations", async () => {
    setup(true, [event, {...event, id: 'flagged', app: 'ReviewedEditor.exe', verification_signals: [
      {kind: 'bounded_pointer', window_seconds: 300, span_x_px: 20, span_y_px: 30, sample_count: 61},
      {kind: 'regular_clicks', window_seconds: 60, click_count: 61, median_interval_ms: 1000, tolerance_ms: 150, regularity: 1}
    ]}]);
    await screen.findByText('Team at a glance');
    fireEvent.click(screen.getByRole('button', {name: 'Activity timeline'}));
    expect(screen.getByText('Needs verification')).toBeInTheDocument();
    expect(screen.getByText(/Pointer within 20/)).toHaveTextContent('61 regular clicks');
    fireEvent.click(screen.getByLabelText('Only verification flags'));
    expect(screen.queryByText('No flag')).not.toBeInTheDocument();
    expect(screen.getByText('ReviewedEditor.exe')).toBeInTheDocument();
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
  });

  it("exports verification evidence with unchanged recorded seconds", () => {
    const row = {...event, verification_signals: [{kind: 'bounded_pointer' as const, window_seconds: 300, span_x_px: 0, span_y_px: 0, sample_count: 61}]};
    const workspace = {devices: [], report: {events: [row], attendance: []}, shots: [], policy: {} as import('../types').Policy, projects: [], categories: []};
    const rows = exportRows('timeline', workspace, '');
    expect(rows[0]).toContain('Verification evidence (review only)');
    expect(rows[1]).toContain('Pointer within 0 × 0 px for 300s (61 samples)');
    expect(rows[1]).toContain(3600);
  });

});
