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
export const duration = (seconds: number) =>
  `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
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

export function groupEvents(events: Activity[], mode: "usage" | "projects") {
  const result = new Map<string, Activity>();
  for (const event of events) {
    if (event.state !== "active") continue;
    const key = JSON.stringify(
      mode === "usage"
        ? [event.employee_id, event.app, event.domain, event.category]
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
          "Category",
          "Seconds",
        ],
        ...groupEvents(data.report.events, "usage").map((e) => [
          e.employee_id,
          e.employee_name,
          e.app,
          e.domain,
          e.category,
          e.seconds,
        ]),
      ];
    case "projects":
      return [
        ["Employee ID", "Project", "Task", "Seconds"],
        ...groupEvents(data.report.events, "projects").map((e) => [
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
          "State",
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
          e.state,
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
          "Unknown h",
        ],
        ...data.report.attendance.map((a) => [
          a.date,
          a.employee_id,
          a.employee_name,
          timeText(a.first),
          timeText(a.last),
          ...timeKeys.map((k) => hours(a[k])),
        ]),
      ];
  }
}
