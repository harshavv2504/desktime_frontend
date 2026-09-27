export type View =
  | "overview"
  | "team"
  | "attendance"
  | "usage"
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
  id: string;
  revoked: boolean;
  last_seen: string | null;
  state: string;
  app: string;
}
export interface Activity extends Employee {
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
  events: Activity[];
  attendance: Attendance[];
}
export interface Shot {
  id: string;
  employee_id: string;
  time: string;
}
export interface Policy {
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
  category: "productive" | "neutral" | "unproductive";
  match_kind?: "contains" | "exact";
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
  | { kind: "shot"; shot: Shot };
