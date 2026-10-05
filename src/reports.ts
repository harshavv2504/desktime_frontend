import type { Activity, Device, Filters, View, Workspace } from "./types";

export const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const timeKeys = [
  "active",
  "idle",
  "locked",
  "paused",
  "unknown",
] as const;
export const istDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const timeText = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "—";
export const duration = (seconds: number) => {
  const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  if (value > 0 && value < 1) return "<1s";
  if (value < 60) return `${Math.floor(value)}s`;
  if (value < 3600) return `${Math.floor(value / 60)}m ${Math.floor(value % 60)}s`;
  return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
};
export const hours = (seconds: number) => (seconds / 3600).toFixed(2);
export const initials = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export const statusOf = (d: Device) =>
  d.revoked
    ? "revoked"
    : !d.last_seen || Date.now() - Date.parse(d.last_seen) > 60000
      ? "offline"
      : d.state;

export function filterQuery(f: Filters) {
  const span = (Date.parse(f.through) - Date.parse(f.from)) / 86400000;
  if (!f.from || !f.through || !Number.isFinite(span) || span < 0 || span > 91)
    throw new Error("Choose a date range of 1–92 days.");
  return new URLSearchParams({
    date: f.from,
    end: f.through,
    employee: f.employee,
  }).toString();
}

export function groupEvents(events: Activity[], mode: "usage" | "projects", includeContext = false) {
  const result = new Map<string, Activity>();
  for (const event of events) {
    if (event.state !== "active") continue;
    const key = JSON.stringify(
      mode === "usage"
        ? [event.employee_id, event.app, event.domain, event.category, includeContext ? event.window_title || "" : ""]
        : [event.employee_id, event.project, event.task],
    );
    const row = result.get(key);
    if (row) row.seconds += event.seconds;
    else result.set(key, { ...event });
  }
  return [...result.values()].sort((a, b) => b.seconds - a.seconds);
}

export function csvText(rows: unknown[][]) {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return "\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export function exportRows(
  view: View,
  data: Workspace,
  employee: string,
): unknown[][] {
  switch (view) {
    case "team":
      return [
        ["Employee ID", "Employee", "Status", "App", "Last seen IST", "Device"],
        ...data.devices
          .filter((d) => !employee || employee === d.employee_id)
          .map((d) => [
            d.employee_id,
            d.employee_name,
            statusOf(d),
            d.app,
            timeText(d.last_seen),
            d.id,
          ]),
      ];
    case "usage":
      return [
        [
          "Employee ID",
          "Employee",
          "Application",
          "Domain",
          "Window title (observed)",
          "Category",
          "Seconds",
        ],
        ...groupEvents(data.report.usage_events || data.report.events, "usage", true).map((e) => [
          e.employee_id,
          e.employee_name,
          e.app,
          e.domain,
          e.window_title || "",
          e.category,
          e.seconds,
        ]),
      ];
    case "projects":
      return [
        ["Employee ID", "Project", "Task", "Seconds"],
        ...groupEvents(data.report.usage_events || data.report.events, "projects").map((e) => [
          e.employee_id,
          e.project,
          e.task,
          e.seconds,
        ]),
      ];
    case "timeline":
      return [
        [
          "Employee ID",
          "Start IST",
          "End IST",
          "App",
          "Domain",
          "Window title (observed)",
          "State",
          "Verification evidence (review only)",
          "Project",
          "Task",
          "Seconds",
        ],
        ...data.report.events.map((e) => [
          e.employee_id,
          timeText(e.start),
          timeText(e.end),
          e.app,
          e.domain,
          e.window_title || "",
          e.state,
          verificationText(e),
          e.project,
          e.task,
          e.seconds,
        ]),
      ];
    default:
      return [
        [
          "Date",
          "Employee ID",
          "Employee",
          "First IST",
          "Last IST",
          "Active h",
          "Idle h",
          "Locked h",
          "Private h",
          "Unknown h", "Productive h", "Neutral h", "Unproductive h", "Unrated h", "Productive target completed h", "Required h", "Remaining h", "Lunch h", "Break h",
        ],
        ...data.report.attendance.map((a) => [
          a.date,
          a.employee_id,
          a.employee_name,
          timeText(a.first),
          timeText(a.last),
          ...timeKeys.map((k) => hours(a[k])),
          ...(['productive','neutral','unproductive','unrated','credited','required','remaining','lunch','break'] as const).map(k=>hours(a[k] || 0)),
        ]),
      ];
  }
}

export function verificationText(e: Activity): string {
  return reviewSignals(e).map(s => s.kind === 'bounded_pointer'
    ? `Pointer within ${s.span_x_px} × ${s.span_y_px} px for ${Math.round(s.window_seconds)}s (${s.sample_count} samples)`
    : `${s.click_count} regular clicks over ${Math.round(s.window_seconds)}s; interval ${s.median_interval_ms}ms ± ${s.tolerance_ms}ms; ${Math.round(s.regularity * 100)}% consistent`
  ).join('; ');
}

export function reviewSignals(e:Activity){
 return e.state==='active'?(e.verification_signals||[]).filter(s=>s.kind!=='bounded_pointer'||s.span_x_px>0||s.span_y_px>0):[];
}
