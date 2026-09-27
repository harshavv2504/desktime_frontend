import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { ApiError, errorMessage, requestApi } from "./api";
import Icon from "./Icon";
import voicedotsLogo from "./assets/voicedotslogo.svg";
import {
  csvText,
  days,
  duration,
  exportRows,
  filterQuery,
  groupEvents,
  hours,
  initials,
  istDate,
  statusOf,
  timeKeys,
  timeText,
} from "./reports";
import type {
  Audit,
  Category,
  Filters,
  ModalState,
  RequestApi,
  Session,
  View,
  Workspace,
} from "./types";

const titles: Record<View, string> = {
  overview: "Overview",
  team: "Team & devices",
  attendance: "Attendance",
  usage: "Apps & websites",
  timeline: "Activity timeline",
  projects: "Projects & tasks",
  screenshots: "Screenshots",
  settings: "Workspace settings",
};
function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return rows.length ? (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 1500).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 1500 && (
        <p className="table-count">
          Showing 1,500 rows. Export CSV for the complete result.
        </p>
      )}
    </>
  ) : (
    <div className="empty">
      <strong>No records in this period</strong>
      <p>Connected employee apps upload activity during their work schedule.</p>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  return <span className={`badge ${value}`}>{value}</span>;
}
function Person({ name, id }: { name: string; id: string }) {
  return (
    <div className="person">
      <span className="avatar">{initials(name)}</span>
      <div>
        <strong>{name}</strong>
        <small>{id}</small>
      </div>
    </div>
  );
}
function Form({
  children,
  submit,
  label = "Save",
}: {
  children: ReactNode;
  submit: (data: FormData) => Promise<void>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await submit(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="dialog-form" onSubmit={onSubmit}>
      {children}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy} type="submit">
        {busy ? "Working…" : label}
      </button>
    </form>
  );
}
function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  return (
    <div className="login-layout">
      <section className="login-brand">
        <div className="brand">
          <img className="brand-logo" src={voicedotsLogo} alt="V" />
          <span>oiceDots</span>
        </div>
        <div className="login-editorial">
          <span className="section-kicker">THE VOICEDOTS WORKSPACE</span>
          <h1>
            Every workday.
            <br />A clearer picture.
          </h1>
          <p>Your team, their time, and the work behind it.</p>
          <div className="login-index">
            <div>
              <span>01</span>
              <strong>People & attendance</strong>
            </div>
            <div>
              <span>02</span>
              <strong>Applications & activity</strong>
            </div>
            <div>
              <span>03</span>
              <strong>Projects & reports</strong>
            </div>
          </div>
          <p className="login-brand-footer">Voicedots · Team operations</p>
        </div>
      </section>
      <main className="login-main">
        <div className="login-card">
          <span className="section-kicker">MANAGER ACCESS</span>
          <h2>Manager sign in</h2>
          <p className="muted">Sign in to your Voicedots workspace.</p>
          <Form
            label="Sign in"
            submit={async (d) =>
              onLogin(
                await requestApi<Session>(
                  "login",
                  undefined,
                  Object.fromEntries(d),
                ),
              )
            }
          >
            <label>
              Username
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
          </Form>
        </div>
      </main>
    </div>
  );
}

function Reports({
  view,
  data,
  employee,
  open,
  navigate,
}: {
  view: View;
  data: Workspace;
  employee: string;
  open: (m: ModalState) => void;
  navigate: (v: View) => void;
}) {
  const devices = data.devices.filter(
    (d) => !employee || d.employee_id === employee,
  );
  const person = (e: { employee_name: string; employee_id: string }) => (
    <Person name={e.employee_name} id={e.employee_id} />
  );
  const team = (compact = false) => (
    <Table
      headers={
        compact
          ? ["Employee", "Status", "Last sync (IST)"]
          : [
              "Employee",
              "Status",
              "Current app",
              "Last sync (IST)",
              "Device",
              "Access",
            ]
      }
      rows={devices.map((d) =>
        compact
          ? [person(d), <Badge value={statusOf(d)} />, timeText(d.last_seen)]
          : [
              person(d),
              <Badge value={statusOf(d)} />,
              d.app || "—",
              timeText(d.last_seen),
              <span title={d.id}>{d.id.slice(0, 8)}</span>,
              !d.revoked && (
                <button
                  className="text-button"
                  onClick={() => open({ kind: "revoke", device: d })}
                >
                  Revoke
                </button>
              ),
            ],
      )}
    />
  );
  if (view === "overview") {
    const totals = timeKeys.map((k) =>
      data.report.attendance.reduce((s, r) => s + r[k], 0),
    );
    const usage = groupEvents(data.report.events, "usage").slice(0, 5);
    return (
      <>
        <div className="metrics">
          {[
            [
              "Connected devices",
              devices.filter(
                (d) => !["offline", "revoked"].includes(statusOf(d)),
              ).length,
            ],
            ["Active time", duration(totals[0])],
            ["Idle time", duration(totals[1])],
            ["Unknown time", duration(totals[4])],
          ].map(([label, value], index) => (
            <section className="metric" key={label}>
              <span className="metric-label">
                {label}
                <Icon name={index === 0 ? "team" : "clock"} />
              </span>
              <strong className="metric-value">{value}</strong>
              <span className="metric-detail">
                {
                  [
                    `${devices.length} enrolled devices · live status`,
                    "Recorded activity in this period",
                    "Time beyond the idle threshold",
                    "Scheduled time without coverage",
                  ][index]
                }
              </span>
            </section>
          ))}
        </div>
        <div className="grid-two">
          <Card
            title="Team at a glance"
            action={
              <button className="text-button" onClick={() => navigate("team")}>
                View team →
              </button>
            }
          >
            {team(true)}
          </Card>
          <Card title="Most-used apps & websites">
            <div className="card-body">
              {usage.length ? (
                usage.map((e, i) => (
                  <div className="app-row" key={i}>
                    <div>
                      <span>{e.domain || e.app}</span>
                      <small>{duration(e.seconds)}</small>
                    </div>
                    <progress
                      max={usage[0].seconds || 1}
                      value={e.seconds}
                      aria-label={`${e.domain || e.app} usage`}
                    />
                  </div>
                ))
              ) : (
                <p>No app usage yet.</p>
              )}
            </div>
          </Card>
        </div>
        <Card title="Recorded time breakdown">
          <div
            className="distribution"
            role="img"
            aria-label={timeKeys
              .map((key, i) => `${key}: ${duration(totals[i])}`)
              .join(", ")}
          >
            {totals.some(Boolean) ? (
              <svg
                viewBox="0 0 1000 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {totals.map((value, i) => {
                  const total = totals.reduce((a, b) => a + b, 0);
                  return (
                    <rect
                      key={i}
                      className={`segment segment-${i}`}
                      x={
                        (1000 * totals.slice(0, i).reduce((a, b) => a + b, 0)) /
                        total
                      }
                      y="0"
                      width={(1000 * value) / total}
                      height="20"
                    />
                  );
                })}
              </svg>
            ) : (
              <p>No recorded time in this period</p>
            )}
          </div>
          <div className="card-body time-breakdown">
            {timeKeys.map((k, i) => (
              <div className={`time-item time-item-${i}`} key={k}>
                <strong>{duration(totals[i])}</strong>
                <span>{k === "paused" ? "Private / paused" : k}</span>
              </div>
            ))}
          </div>
        </Card>
      </>
    );
  }
  if (view === "team")
    return (
      <Card title="Employee devices">
        {team()}
        <p className="card-body help">
          Devices appear offline after 60 seconds without a heartbeat.
        </p>
      </Card>
    );
  if (view === "attendance")
    return (
      <Card title="Daily attendance">
        <Table
          headers={[
            "Date",
            "Employee",
            "First activity (IST)",
            "Last activity (IST)",
            "Active h",
            "Idle h",
            "Locked h",
            "Private h",
            "Unknown h",
          ]}
          rows={data.report.attendance.map((a) => [
            a.date,
            person(a),
            timeText(a.first),
            timeText(a.last),
            ...timeKeys.map((k) => hours(a[k])),
          ])}
        />
        <p className="card-body help">
          Unknown time is not confirmed absence. Overlapping device intervals
          count once.
        </p>
      </Card>
    );
  if (view === "usage")
    return (
      <Card title="Application & website usage">
        <Table
          headers={[
            "Employee",
            "Application",
            "Website",
            "Category",
            "Active time",
          ]}
          rows={groupEvents(data.report.events, "usage").map((e) => [
            person(e),
            e.app,
            e.domain || "—",
            <Badge value={e.category} />,
            duration(e.seconds),
          ])}
        />
      </Card>
    );
  if (view === "timeline")
    return (
      <Card title="Activity intervals">
        <Table
          headers={[
            "Employee",
            "Start (IST)",
            "End (IST)",
            "Application / website",
            "State",
            "Project",
            "Task",
            "Duration",
          ]}
          rows={[...data.report.events]
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((e) => [
              person(e),
              timeText(e.start),
              timeText(e.end),
              e.domain || e.app,
              <Badge value={e.state} />,
              e.project || "—",
              e.task || "—",
              duration(e.seconds),
            ])}
        />
      </Card>
    );
  if (view === "projects")
    return (
      <Card
        title="Project time"
        action={
          <button
            className="secondary"
            onClick={() => open({ kind: "projects" })}
          >
            Manage projects
          </button>
        }
      >
        <Table
          headers={["Employee", "Project", "Task", "Active time"]}
          rows={groupEvents(data.report.events, "projects").map((e) => [
            person(e),
            e.project || "Unassigned",
            e.task || "—",
            duration(e.seconds),
          ])}
        />
      </Card>
    );
  return data.shots.length ? (
    <div className="photo-grid">
      {data.shots.map((s) => (
        <button
          key={s.id}
          className="photo-card"
          onClick={() => open({ kind: "shot", shot: s })}
        >
          <span className="photo-placeholder" aria-hidden>
            ▧
          </span>
          <strong>{s.employee_id}</strong>
          <small>{timeText(s.time)} IST</small>
          <small>Open screenshot →</small>
        </button>
      ))}
    </div>
  ) : (
    <Card title="Captured screenshots">
      <div className="empty">
        <strong>No screenshots in this period</strong>
        <p>
          Captures require a screenshot policy and employee opt-in. They remain
          off by default.
        </p>
      </div>
    </Card>
  );
}

function Settings({
  data,
  session,
  api,
  refresh,
  open,
  logout,
  notify,
}: {
  data: Workspace;
  session: Session;
  api: RequestApi;
  refresh: () => void;
  open: (m: ModalState) => void;
  logout: () => void;
  notify: (s: string) => void;
}) {
  const p = data.policy;
  return (
    <div className="settings-grid">
      <Card title="Work schedule & capture policy">
        <div className="card-body">
          <Form
            key={JSON.stringify(p)}
            label="Save schedule"
            submit={async (d) => {
              const body: Record<string, unknown> = {
                work_start: d.get("work_start"),
                work_end: d.get("work_end"),
                work_days: d.getAll("day").map(Number),
                holidays: String(d.get("holidays"))
                  .split(/\s+/)
                  .filter(Boolean),
              };
              for (const k of [
                "idle_seconds",
                "retention_days",
                "screenshot_seconds",
                "screenshot_retention_days",
              ])
                if (d.has(k)) body[k] = Number(d.get(k));
              if (
                Number(body.screenshot_seconds) > 0 &&
                Number(body.screenshot_seconds) < 60
              )
                throw new Error(
                  "Screenshot interval must be 0 or at least 60 seconds.",
                );
              await api("policy", body);
              notify("Schedule saved.");
              refresh();
            }}
          >
            <div className="form-grid">
              <div className="form-section full">
                <span>01</span>
                <div>
                  <h3>Working hours</h3>
                  <p>
                    Set the days and hours your team works. All times are IST.
                  </p>
                </div>
              </div>
              <label>
                Workday starts (IST)
                <input
                  name="work_start"
                  type="time"
                  defaultValue={p.work_start}
                  required
                />
              </label>
              <label>
                Workday ends (IST)
                <input
                  name="work_end"
                  type="time"
                  defaultValue={p.work_end}
                  required
                />
              </label>
              <fieldset className="full">
                <legend>Workdays</legend>
                <div className="check-grid">
                  {days.map((day, i) => (
                    <label key={day}>
                      <input
                        type="checkbox"
                        name="day"
                        value={i}
                        defaultChecked={p.work_days.includes(i)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="form-section full">
                <span>02</span>
                <div>
                  <h3>Activity & captures</h3>
                  <p>
                    Manage idle detection, screenshots, and how long records are
                    kept.
                  </p>
                </div>
              </div>
              {(
                [
                  ["idle_seconds", "Idle threshold (seconds)", 30, 3600],
                  ["retention_days", "Activity retention (days)", 1, 3650],
                  [
                    "screenshot_retention_days",
                    "Screenshot retention (days)",
                    1,
                    365,
                  ],
                  [
                    "screenshot_seconds",
                    "Screenshot interval (seconds; 0 = off)",
                    0,
                    3600,
                  ],
                ] as const
              ).map(
                ([key, label, min, max]) =>
                  p[key] !== undefined && (
                    <label key={key}>
                      {label}
                      <input
                        type="number"
                        name={key}
                        min={min}
                        max={max}
                        defaultValue={p[key]}
                        required
                      />
                    </label>
                  ),
              )}
              <label className="full">
                Holidays (one YYYY-MM-DD per line)
                <textarea
                  name="holidays"
                  rows={3}
                  defaultValue={p.holidays.join("\n")}
                />
              </label>
            </div>
            <p className="help">
              Screenshots require employee opt-in. Enabled intervals must be
              60–3,600 seconds.
            </p>
          </Form>
        </div>
      </Card>
      <div>
        <Card title="Employee setup">
          <div className="card-body">
            <label>
              Employee server address
              <input readOnly value={session.server_url} />
            </label>
            <div className="form-actions">
              <button
                className="primary"
                onClick={() => open({ kind: "invite" })}
              >
                Add employee
              </button>
              <a href="/downloads/DeskTime-Employee.exe">
                Download employee EXE
              </a>
            </div>
            <p className="help">
              Chrome and Edge website tracking is built into the employee EXE.
            </p>
          </div>
        </Card>
        <Card title="Projects & classification">
          <div className="card-body form-actions">
            <button
              className="secondary"
              onClick={() => open({ kind: "projects" })}
            >
              Edit projects
            </button>
            <button
              className="secondary"
              onClick={() => open({ kind: "categories" })}
            >
              Edit categories
            </button>
          </div>
        </Card>
        <Card title="Manager account">
          <div className="card-body">
            <p>
              Signed in as <strong>{session.username}</strong>
            </p>
            <div className="form-actions">
              <button
                className="secondary"
                onClick={() => open({ kind: "password" })}
              >
                Change password
              </button>
              <button
                className="text-button"
                onClick={() => open({ kind: "audit" })}
              >
                View audit log
              </button>
              <button className="text-button" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function parseCategories(value: string): Category[] {
  return value
    .split("\n")
    .filter((x) => x.trim())
    .map((line) => {
      const parts = line.split(",").map((x) => x.trim());
      const kind = ["exact", "contains"].includes(parts.at(-1) || "")
        ? parts.pop()!
        : "contains";
      const category = parts.pop();
      const match = parts.join(",").trim();
      if (
        !match ||
        !["productive", "neutral", "unproductive"].includes(category || "")
      )
        throw new Error(
          "Each rule needs an app/domain, category, and optional contains or exact match type.",
        );
      return {
        match,
        category: category as Category["category"],
        match_kind: kind as Category["match_kind"],
      };
    });
}
function Dialog({
  modal,
  data,
  session,
  api,
  close,
  refresh,
  signedOut,
  notify,
}: {
  modal: ModalState;
  data: Workspace;
  session: Session;
  api: RequestApi;
  close: () => void;
  refresh: () => void;
  signedOut: () => void;
  notify: (s: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [code, setCode] = useState(""),
    [loaded, setLoaded] = useState<{ image?: string; audit?: Audit[] } | null>(
      null,
    ),
    [error, setError] = useState("");
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  useEffect(() => {
    if (modal.kind !== "shot" && modal.kind !== "audit") return;
    const c = new AbortController();
    api<{ image?: string; audit?: Audit[] }>(
      modal.kind === "audit"
        ? "audit"
        : "shot?" + new URLSearchParams({ id: modal.shot.id }),
      undefined,
      c.signal,
    )
      .then((d) => {
        if (!c.signal.aborted) setLoaded(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      });
    return () => c.abort();
  }, [modal, api]);
  async function save(path: string, body: unknown) {
    await api(path, body);
    close();
    refresh();
    notify("Changes saved.");
  }
  const title = {
    invite: code ? "Ready to connect" : "Add an employee",
    projects: "Manage projects",
    categories: "Application & website categories",
    password: "Change manager password",
    revoke: "Revoke device access",
    audit: "Administration audit",
    shot: "Screenshot",
  }[modal.kind];
  let content: ReactNode;
  switch (modal.kind) {
    case "invite":
      content = code ? (
        <>
          <p>The code expires in 24 hours and connects one device.</p>
          <label>
            Server address
            <input readOnly value={session.server_url} />
          </label>
          <div className="code-box">{code}</div>
          <button
            className="primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `Voicedots\nServer: ${session.server_url}\nEnrollment code: ${code}`,
                );
                notify("Setup details copied.");
              } catch {
                notify(
                  "Clipboard unavailable. Select and copy the details above.",
                );
              }
            }}
          >
            Copy setup details
          </button>
          <p>
            <a href="/downloads/DeskTime-Employee.exe">Download employee app</a>
          </p>
        </>
      ) : (
        <Form
          label="Create enrollment code"
          submit={async (d) =>
            setCode(
              (await api<{ code: string }>("invite", Object.fromEntries(d)))
                .code,
            )
          }
        >
          <label>
            Employee name
            <input name="employee_name" maxLength={100} required />
          </label>
          <label>
            Employee ID
            <input name="employee_id" maxLength={100} required />
          </label>
        </Form>
      );
      break;
    case "projects":
      content = (
        <Form
          label="Save projects"
          submit={(d) =>
            save(
              "projects",
              String(d.get("projects"))
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
            )
          }
        >
          <label>
            One project name per line
            <textarea
              name="projects"
              rows={9}
              defaultValue={data.projects.join("\n")}
            />
          </label>
        </Form>
      );
      break;
    case "categories":
      content = (
        <Form
          label="Save categories"
          submit={(d) =>
            save("categories", parseCategories(String(d.get("categories"))))
          }
        >
          <label>
            One rule per line: app or domain, category, match type
            <textarea
              name="categories"
              rows={9}
              defaultValue={data.categories
                .map(
                  (c) =>
                    `${c.match}, ${c.category}, ${c.match_kind || "contains"}`,
                )
                .join("\n")}
            />
          </label>
          <p className="help">
            Categories: productive, neutral, unproductive. Match types:
            contains, exact. Rules apply in order.
          </p>
        </Form>
      );
      break;
    case "password":
      content = (
        <Form
          label="Change password"
          submit={async (d) => {
            if (d.get("password") !== d.get("confirm"))
              throw new Error("New passwords do not match.");
            await api("password", Object.fromEntries(d));
            signedOut();
            notify("Password changed. Sign in again.");
          }}
        >
          <label>
            Current password
            <input
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={14}
              maxLength={256}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={14}
              maxLength={256}
              required
            />
          </label>
          <p className="help">
            All sessions for this account will be signed out.
          </p>
        </Form>
      );
      break;
    case "revoke":
      content = (
        <Form
          label="Revoke this device"
          submit={() => save("revoke", { device_id: modal.device.id })}
        >
          <p>
            Revoke {modal.device.employee_name}'s device{" "}
            {modal.device.id.slice(0, 8)}? New uploads will be blocked. Existing
            reports remain available.
          </p>
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
        </Form>
      );
      break;
    case "audit":
      content = loaded ? (
        <Table
          headers={["Time (IST)", "Action", "Details"]}
          rows={(loaded.audit || []).map((a) => [
            timeText(a.time),
            a.action,
            <span className="audit-text">{a.detail}</span>,
          ])}
        />
      ) : (
        <p>Loading audit records…</p>
      );
      break;
    case "shot":
      content = loaded?.image ? (
        <img
          className="capture-image"
          alt={`Screenshot for ${modal.shot.employee_id} recorded ${timeText(modal.shot.time)} IST`}
          src={`data:image/${loaded.image.startsWith("iVBOR") ? "png" : "jpeg"};base64,${loaded.image}`}
        />
      ) : (
        <p>Loading capture…</p>
      );
      break;
  }
  return (
    <dialog
      ref={ref}
      className={["audit", "shot"].includes(modal.kind) ? "wide" : ""}
      aria-labelledby="dialog-title"
      onCancel={close}
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="text-button"
          aria-label="Close dialog"
          onClick={close}
        >
          ×
        </button>
      </div>
      <div className="dialog-body">
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : (
          content
        )}
      </div>
    </dialog>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [checking, setChecking] = useState(true),
    [data, setData] = useState<Workspace | null>(null),
    [view, setView] = useState<View>("overview"),
    [modal, setModal] = useState<ModalState | null>(null);
  const [draft, setDraft] = useState<Filters>(() => ({
      from: istDate(),
      through: istDate(),
      employee: "",
    })),
    [filters, setFilters] = useState(draft),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState(""),
    [toast, setToast] = useState("");
  const signedOut = useCallback(() => {
    setSession(null);
    setData(null);
    setModal(null);
    setUpdated("");
  }, []);
  const api: RequestApi = useCallback(
    async <T,>(path: string, body?: unknown, signal?: AbortSignal) => {
      try {
        return await requestApi<T>(path, session?.csrf, body, signal);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && !signal?.aborted)
          signedOut();
        throw e;
      }
    },
    [session?.csrf, signedOut],
  );
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const c = new AbortController();
    requestApi<Session>("session", undefined, undefined, c.signal)
      .then((s) => {
        if (!c.signal.aborted) setSession(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!c.signal.aborted) setChecking(false);
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!session) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    const q = filterQuery(filters);
    Promise.all([
      api<{ devices: Workspace["devices"] }>("devices", undefined, c.signal),
      api<Workspace["report"]>("report?" + q, undefined, c.signal),
      api<{ screenshots: Workspace["shots"] }>(
        "screenshots?" + q,
        undefined,
        c.signal,
      ),
      api<{ policy: Workspace["policy"] }>("policy", undefined, c.signal),
      api<{ projects: string[] }>("projects", undefined, c.signal),
      api<{ categories: Category[] }>("categories", undefined, c.signal),
    ])
      .then(([d, report, s, p, projects, categories]) => {
        if (!c.signal.aborted) {
          setData({
            devices: d.devices,
            report,
            shots: s.screenshots,
            policy: p.policy,
            projects: projects.projects,
            categories: categories.categories,
          });
          setUpdated(timeText(new Date().toISOString()));
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [session, filters, revision, api]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        session &&
        !document.hidden &&
        !modal &&
        view !== "settings" &&
        !loading
      )
        refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [session, modal, view, loading, refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function logout() {
    try {
      await api("logout", {});
      signedOut();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function exportCSV() {
    if (!data) return;
    const rows = exportRows(view, data, filters.employee);
    const url = URL.createObjectURL(
      new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `voicedots-${view}-${filters.from}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(`Exported ${rows.length - 1} rows.`);
  }
  const names = new Map(
    (data?.devices || []).map((d) => [d.employee_id, d.employee_name]),
  );
  for (const e of data?.report.events || [])
    names.set(e.employee_id, e.employee_name);
  if (checking)
    return (
      <main className="loading" role="status">
        Opening workspace…
      </main>
    );
  return (
    <>
      {session ? (
        <div className="workspace">
          <aside className="sidebar">
            <div className="brand">
              <img className="brand-logo" src={voicedotsLogo} alt="V" />
              <span>oiceDots</span>
            </div>
            <div className="workspace-label">
              <span className="workspace-monogram">V</span>
              <div>
                Voicedots<small>Team operations</small>
              </div>
            </div>
            <div className="nav-heading">WORKSPACE</div>
            <nav aria-label="Workspace">
              {(Object.keys(titles) as View[]).map((v) => (
                <button
                  key={v}
                  className={`nav-item ${view === v ? "selected" : ""}`}
                  aria-current={view === v ? "page" : undefined}
                  onClick={() => setView(v)}
                >
                  <Icon name={v} />
                  <span>{titles[v]}</span>
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              {data && (
                <>
                  <strong>
                    {data.policy.work_start}–{data.policy.work_end} IST
                  </strong>
                  <p>{data.policy.work_days.map((d) => days[d]).join(" · ")}</p>
                </>
              )}
              <div className="profile">
                <span className="avatar">{initials(session.username)}</span>
                <span>{session.username}</span>
              </div>
              <button className="text-button" onClick={logout}>
                Sign out
              </button>
            </div>
          </aside>
          <main className="main">
            <header className="topbar">
              <span className="breadcrumb">
                Workspace <span>/</span> <strong>{titles[view]}</strong>
              </span>
              <span className="sync-indicator" role="status">
                {loading
                  ? "Updating…"
                  : updated
                    ? `Updated ${updated} IST`
                    : "Sync unavailable"}
              </span>
            </header>
            <div className="page">
              <div className="page-heading">
                <div>
                  <h1>{titles[view]}</h1>
                  <p className="muted">
                    {
                      {
                        overview: "A closer look at your team’s workday.",
                        team: "Your people, their devices, and the latest connection status.",
                        attendance: "Work hours and attendance, day by day.",
                        usage: "Understand where active time is spent.",
                        timeline: "A chronological view of the workday.",
                        projects: "See where your team’s time goes.",
                        screenshots: "Review captures from opted-in employees.",
                        settings:
                          "Set up your workspace, work hours, and capture preferences.",
                      }[view]
                    }
                  </p>
                </div>
                <div className="heading-actions">
                  {!["settings", "screenshots"].includes(view) && (
                    <button
                      className="secondary"
                      disabled={!data || loading}
                      onClick={exportCSV}
                    >
                      <Icon name="download" />
                      Export CSV
                    </button>
                  )}
                  <button
                    className="primary"
                    disabled={!data}
                    onClick={() => setModal({ kind: "invite" })}
                  >
                    <Icon name="plus" />
                    Add employee
                  </button>
                </div>
              </div>
              {view !== "settings" && (
                <form
                  className="filter-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      filterQuery(draft);
                      setData(null);
                      setFilters({ ...draft });
                    } catch (e) {
                      setError(errorMessage(e));
                    }
                  }}
                >
                  <label>
                    From
                    <input
                      type="date"
                      required
                      value={draft.from}
                      onChange={(e) =>
                        setDraft({ ...draft, from: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Through
                    <input
                      type="date"
                      required
                      value={draft.through}
                      onChange={(e) =>
                        setDraft({ ...draft, through: e.target.value })
                      }
                    />
                  </label>
                  <label className="employee-filter">
                    Employee
                    <select
                      value={draft.employee}
                      onChange={(e) =>
                        setDraft({ ...draft, employee: e.target.value })
                      }
                    >
                      <option value="">All employees</option>
                      {[...names].map(([id, name]) => (
                        <option key={id} value={id}>
                          {name} ({id})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="primary" type="submit" disabled={loading}>
                    Apply filters
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                  >
                    Refresh
                  </button>
                  <span className="filter-note">All times IST</span>
                </form>
              )}
              {error && (
                <p className="notice error" role="alert">
                  {error}{" "}
                  <button className="text-button" onClick={refresh}>
                    Retry
                  </button>
                </p>
              )}
              {data ? (
                view === "settings" ? (
                  <Settings
                    data={data}
                    session={session}
                    api={api}
                    refresh={refresh}
                    open={setModal}
                    logout={logout}
                    notify={setToast}
                  />
                ) : (
                  <Reports
                    view={view}
                    data={data}
                    employee={filters.employee}
                    open={setModal}
                    navigate={setView}
                  />
                )
              ) : (
                <p className="loading">
                  {loading
                    ? "Loading your workspace…"
                    : "Workspace data is unavailable."}
                </p>
              )}
            </div>
          </main>
          {modal && data && (
            <Dialog
              modal={modal}
              data={data}
              session={session}
              api={api}
              close={() => setModal(null)}
              refresh={refresh}
              signedOut={signedOut}
              notify={setToast}
            />
          )}
        </div>
      ) : (
        <Login
          onLogin={(s) => {
            setError("");
            setView("overview");
            setSession(s);
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
