export type View =
  | "overview"
  | "team"
  | "attendance"
  | "usage"
  | "productivity"
  | "timeline"
  | "projects"
  | "screenshots"
  | "settings";
export interface Session {
  username: string;
  csrf: string;
  server_url: string;
}
export interface Employee {
  employee_id: string;
  employee_name: string;
}
export interface Device extends Employee {
  work_policy?: Policy;
  id: string;
  revoked: boolean;
  last_seen: string | null;
  state: string;
  app: string;
}
export interface Activity extends Employee {
  verification_signals?: VerificationSignal[];
  window_title?: string;
  id: string;
  device_id: string;
  start: string;
  end: string;
  seconds: number;
  state: string;
  app: string;
  domain: string;
  project: string;
  task: string;
  category: string;
}
export interface Attendance extends Employee {
  productive?: number; neutral?: number; unproductive?: number; unrated?: number;
  credited?: number; required?: number; remaining?: number; overtime?: number;
  lunch?: number; break?: number; paid_break?: number; break_overrun?: number;
  productivity?: number | null; effectiveness?: number | null; shortfall?: number;
  date: string;
  first: string | null;
  last: string | null;
  active: number;
  idle: number;
  locked: number;
  paused: number;
  unknown: number;
}
export interface Report {
  usage_events?: Activity[];
  events: Activity[];
  attendance: Attendance[];
}
export interface Shot {
  id: string;
  employee_id: string;
  time: string;
}
export interface Policy {
  flag_recording_enabled?: boolean;
  schedule_mode?: "fixed" | "flexible";
  arrangement?: "full_time" | "part_time" | "consultant";
  inherited?: boolean;
  minimum_minutes?: number; credit_idle?: boolean;
  lunch_minutes?: number; lunch_paid?: boolean;
  break_minutes?: number; break_paid?: boolean;
  work_start: string;
  work_end: string;
  work_days: number[];
  holidays: string[];
  idle_seconds: number;
  retention_days: number;
  screenshot_seconds: number;
  screenshot_retention_days?: number;
  effective_from?: string;
}
export interface Category {
  match: string;
  category: "productive" | "neutral" | "unproductive" | "unrated";
  target?: "any" | "app" | "domain";
  employee_id?: string;
  match_kind?: "contains" | "exact" | "domain";
}
export interface Workspace {
  devices: Device[];
  report: Report;
  shots: Shot[];
  policy: Policy;
  projects: string[];
  categories: Category[];
}
export interface Filters {
  from: string;
  through: string;
  employee: string;
}
export interface Audit {
  time: string;
  action: string;
  detail: string;
}
export type RequestApi = <T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
) => Promise<T>;
export type ModalState =
  | {
      [K in "invite" | "projects" | "categories" | "password" | "audit"]: {
        kind: K;
      };
    }["invite" | "projects" | "categories" | "password" | "audit"]
  | { kind: "revoke"; device: Device }
  | { kind: "employee-policy"; device: Device }
  | { kind: "shot"; shot: Shot };

export type VerificationSignal =
  | {kind: 'bounded_pointer'; window_seconds: number; span_x_px: number; span_y_px: number; sample_count: number}
  | {kind: 'regular_clicks'; window_seconds: number; click_count: number; median_interval_ms: number; tolerance_ms: number; regularity: number};
