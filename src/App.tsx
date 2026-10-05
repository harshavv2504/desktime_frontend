import TargetOverview from './TargetOverview';
import ScreenshotGallery from './ScreenshotGallery';
import Recordings from './Recordings';
import EmployeePolicyEditor from './EmployeePolicyEditor';
import WorkSummary from './WorkSummary';
import ClassificationEditor from './ClassificationEditor';
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
  verificationText,
  reviewSignals,
  csvText,
  days,
  duration,
  exportRows,
  filterQuery,
  groupEvents,
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
  productivity: "Productivity rules",
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
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card">
      {(title || action) && <div className="card-heading">
        {title && <h2>{title}</h2>}
        {action}
      </div>}
      {children}
    </section>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  const [page, setPage] = useState(0);
  const current=Math.min(page,Math.max(0,Math.ceil(rows.length/25)-1));

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
            {rows.slice(current*25, current*25+25).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-pagination"><span>{current*25+1}–{Math.min(current*25+25,rows.length)} of {rows.length} records</span><div><button className="secondary" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><button className="secondary" disabled={(current+1)*25>=rows.length} onClick={()=>setPage(current+1)}>Next</button></div></div>
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
  api,
  view,
  data,
  employee,
  open,
  navigate,
}: {
  api: RequestApi;
  view: View;
  data: Workspace;
  employee: string;
  open: (m: ModalState) => void;
  navigate: (v: View) => void;
}) {
  const [reviewOnly, setReviewOnly] = useState(false);
  const [signalType,setSignalType]=useState("all"),[activityState,setActivityState]=useState("all");
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
              "Work policy",
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
              <div><small>{d.work_policy?.schedule_mode === "flexible" ? "Flexible" : "Fixed"} | {(d.work_policy?.minimum_minutes ?? data.policy.minimum_minutes ?? 480)/60}h/day</small><button className="text-button" onClick={() => open({kind:"employee-policy",device:d})}>Edit work policy</button></div>,
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
    return <><TargetOverview data={data} onAttendance={()=>navigate('attendance')}/><WorkSummary rows={data.report.attendance} onRules={()=>navigate('productivity')} onSettings={()=>navigate('settings')}/></>;
  }
  if (view === "team")
    return (
      <Card>
        {team()}
        <p className="card-body help">
          Devices appear offline after 60 seconds without a heartbeat.
        </p>
      </Card>
    );
  if (view === "attendance")
    return <Card><Table headers={['Date','Employee','Active time','Work target','Remaining','Productivity','Details']} rows={data.report.attendance.map(a=>[
      a.date,person(a),duration(a.active),<div className="stacked-cell"><strong>{duration(a.credited||0)}</strong><small>{a.required?`of ${duration(a.required)}`:'No target set'}</small></div>,a.required?duration(a.remaining||0):'—',a.productivity==null?'No activity':`${a.productivity.toFixed(1)}%`,
      <details className="attendance-details"><summary>View breakdown</summary><dl>{[['First activity',timeText(a.first)],['Last activity',timeText(a.last)],['Idle',duration(a.idle)],['Locked',duration(a.locked)],['Private',duration(a.paused)],['Unknown',duration(a.unknown)],['Lunch',duration(a.lunch||0)],['Other breaks',duration(a.break||0)],['Break overrun',duration(a.break_overrun||0)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
    ])}/><p className="card-body help">Unknown time is not confirmed absence. Overlapping device intervals count once. Export CSV for all time categories.</p></Card>;
  if (view === "usage")
    return (
      <Card action={<button className="secondary" onClick={() => open({ kind: "categories" })}>Manage classifications</button>}>
        <Table
          headers={[
            "Employee",
            "Application",
            "Website",
            "Window / file context",
            "Category",
            "Active time",
          ]}
          rows={groupEvents(data.report.usage_events || data.report.events, "usage", true).map((e) => [
            person(e),
            e.app,
            e.domain || "—",
            <span className="window-context" title={e.window_title || undefined}>{e.window_title || "No context recorded"}</span>,
            <Badge value={e.category} />,
            duration(e.seconds),
          ])}
        />
        <p className="card-body help">Unrated means no matching classification rule. Window context is shown only when recorded by the updated employee app; older activity cannot be reconstructed. Different observed windows are listed separately.</p>
      </Card>
    );
  if (view === "timeline")
    return <Card>
      <div className="timeline-toolbar"><label className="review-filter"><input type="checkbox" checked={reviewOnly} onChange={e=>{setReviewOnly(e.target.checked);if(e.target.checked&&signalType==='none')setSignalType('all');}}/>Only verification flags</label><label>Verification type<select value={signalType} onChange={e=>{setSignalType(e.target.value);if(e.target.value==='none')setReviewOnly(false);}}><option value="all">All patterns</option><option value="bounded_pointer">Restricted pointer movement</option><option value="regular_clicks">Regular click timing</option><option value="none">No verification flag</option></select></label><label>Activity state<select value={activityState} onChange={e=>setActivityState(e.target.value)}><option value="all">All activity</option><option value="active">Active</option><option value="idle">Idle</option><option value="paused">Paused</option><option value="locked">Locked</option></select></label><span className="help">{data.report.events.filter(e=>reviewSignals(e).length).length} flagged activities</span><details><summary>About verification signals</summary><p>Needs verification means an observed input pattern, not proof of misconduct. A stationary pointer and non-active periods are excluded. Repetitive tasks can still require review. Work time and productivity are unchanged.</p><p>Pointer: repeated movement within 50 × 50 pixels for 5 minutes. Clicks: 30 or more over 60 seconds, with 95% of intervals within ±15% (minimum 20ms). Requires the updated employee app.</p></details></div>
      <Table headers={['Employee','Time (IST)','Application / website','Window / file context','State','Verification','Duration']} rows={[...data.report.events].filter(e=>(activityState==='all'||e.state===activityState)&&(!reviewOnly||reviewSignals(e).length>0)&&(signalType==='all'||(signalType==='none'?reviewSignals(e).length===0:reviewSignals(e).some(s=>s.kind===signalType)))).sort((a,b)=>a.start.localeCompare(b.start)).map(e=>[
        person(e),<div className="stacked-cell"><strong>{timeText(e.start)}</strong><small>to {timeText(e.end)}</small></div>,e.domain||e.app,
        <div className="window-context">{e.window_title||'Not available'}{(e.project||e.task)&&<small>{[e.project,e.task].filter(Boolean).join(' · ')}</small>}</div>,<Badge value={e.state}/>,
        reviewSignals(e).length?<div className="verification-evidence"><strong>Needs verification</strong><small>{verificationText(e)}</small></div>:'No flag',duration(e.seconds)
      ])}/>
    </Card>;
  if (view === "projects")
    return (
      <Card
       
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
          rows={groupEvents(data.report.usage_events || data.report.events, "projects").map((e) => [
            person(e),
            e.project || "Unassigned",
            e.task || "—",
            duration(e.seconds),
          ])}
        />
      </Card>
    );
  return <ScreenshotGallery data={data} api={api} open={shot=>open({kind:'shot',shot})}/>;
}

function Settings({data,session,api,refresh,open,logout,notify}: {
  data: Workspace; session: Session; api: RequestApi; refresh: () => void;
  open: (m: ModalState) => void; logout: () => void; notify: (s: string) => void;
}) {
  const p=data.policy;
  const [tab,setTab]=useState('schedule');
  return <div className="settings-grid">
    <Card title="Work policy">
      <div className="settings-tabs" role="tablist" aria-label="Work policy sections">{[['schedule','Working hours'],['targets','Targets & breaks'],['capture','Tracking & storage']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} aria-controls={`panel-${id}`} id={`tab-${id}`} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
      <div className="card-body">
        <Form key={JSON.stringify(p)} label="Save work policy" submit={async d=>{
          const body: Record<string,unknown>={work_start:d.get('work_start'),work_end:d.get('work_end'),work_days:d.getAll('day').map(Number),holidays:String(d.get('holidays')).split(/\s+/).filter(Boolean),minimum_minutes:Math.round(Number(d.get('minimum_hours'))*60)};
          for(const key of ['lunch_minutes','break_minutes','idle_seconds','retention_days','screenshot_seconds','screenshot_retention_days']) if(d.has(key))body[key]=Number(d.get(key));
          body.flag_recording_enabled=d.get('flag_recording_enabled')==='on';
          for(const key of ['credit_idle','lunch_paid','break_paid'])body[key]=false;
          if(Number(body.screenshot_seconds)>0&&Number(body.screenshot_seconds)<60)throw Error('Screenshot interval must be 0 or at least 60 seconds.');
          if(!body.work_days || !(body.work_days as number[]).length)throw Error('Select at least one working day.');
          await api('policy',body);notify('Work policy saved.');refresh();
        }}>
          <div id="panel-schedule" role="tabpanel" aria-labelledby="tab-schedule" hidden={tab!=='schedule'}>
            <div className="section-description"><h3>Your team’s schedule</h3><p>Tracking follows these working days and hours. All times are India Standard Time.</p></div>
            <div className="form-grid"><label>Workday starts (IST)<input name="work_start" type="time" defaultValue={p.work_start} required /></label><label>Workday ends (IST)<input name="work_end" type="time" defaultValue={p.work_end} required /></label>
              <fieldset className="full"><legend>Working days</legend><div className="check-grid">{days.map((day,i)=><label key={day}><input type="checkbox" name="day" value={i} defaultChecked={p.work_days.includes(i)}/>{day}</label>)}</div></fieldset>
              <label className="full">Holidays<textarea name="holidays" rows={4} placeholder="2026-12-25" defaultValue={p.holidays.join('\n')}/><small>One date per line, in YYYY-MM-DD format.</small></label>
            </div>
          </div>
          <div id="panel-targets" role="tabpanel" aria-labelledby="tab-targets" hidden={tab!=='targets'}>
            <div className="section-description"><h3>Daily goals, lunch & breaks</h3><p>Set a work target in hours and break allowances in minutes. Changes apply from today.</p></div>
            <div className="form-grid"><label className="full">Minimum work hours per day<div className="input-unit"><input type="number" name="minimum_hours" min={0} max={24} step="any" required defaultValue={(p.minimum_minutes||0)/60}/><span>hours / day</span></div><small>0 leaves the target unconfigured.</small></label>
              <label>Lunch allowance<div className="input-unit"><input type="number" name="lunch_minutes" min={0} max={1440} required defaultValue={p.lunch_minutes||0}/><span>minutes</span></div></label>
              <label>Other break allowance<div className="input-unit"><input type="number" name="break_minutes" min={0} max={1440} required defaultValue={p.break_minutes||0}/><span>minutes</span></div></label>
            </div>
            <p className="policy-note">The daily target is net work time. Lunch, other breaks, idle, and paused time do not count toward it.</p>
          </div>
          <div id="panel-capture" role="tabpanel" aria-labelledby="tab-capture" hidden={tab!=='capture'}>
            <div className="section-description"><h3>Activity & screenshots</h3><p>Choose when inactivity begins, how often screenshots are taken, and how long records stay available.</p></div>
            <div className="form-grid">{([['idle_seconds','Idle threshold',30,3600,'seconds'],['screenshot_seconds','Screenshot interval',0,3600,'seconds'],['retention_days','Activity retention',1,3650,'days'],['screenshot_retention_days','Screenshot retention',1,365,'days']] as const).map(([key,label,min,max,unit])=>p[key]!==undefined&&<label key={key}>{label}<div className="input-unit"><input type="number" name={key} min={min} max={max} required defaultValue={p[key]}/><span>{unit}</span></div></label>)}</div>
            <label className="review-filter recording-policy"><input type="checkbox" name="flag_recording_enabled" defaultChecked={p.flag_recording_enabled || false}/>Record up to 2 minutes when activity needs verification</label><p className="help">Includes pointer movement and click markers, without audio. Employees see a recording notice. Stops on pause, break, or end of approved work time. Maximum one clip per device every 30 minutes; clips are deleted after 7 days.</p>
            <p className="inline-note">Screenshots are manager-controlled. Use 0 to disable, or an interval of 60–3,600 seconds. Capture stops during breaks and outside work hours.</p>
          </div>
        </Form>
      </div>
    </Card>
    <div className="settings-aside">
      <Card title="Connect an employee"><div className="card-body"><p className="help">Create a one-time enrollment code, then install the employee app on their Windows laptop.</p><div className="form-actions"><button className="primary" onClick={()=>open({kind:'invite'})}>Add employee</button><a className="secondary" href="/downloads/DeskTime-Employee.exe">Download EXE</a></div><details className="server-details"><summary>Employee server address</summary><input aria-label="Employee server address" readOnly value={session.server_url}/></details></div></Card>
      <Card title="Productivity & projects"><div className="card-body"><p className="help">Classify work apps and websites to make productivity reports meaningful.</p><div className="stack-actions"><button className="secondary" onClick={()=>open({kind:'categories'})}>Whitelist apps & sites →</button><button className="secondary" onClick={()=>open({kind:'projects'})}>Manage projects</button></div></div></Card>
      <Card title="Manager account"><div className="card-body"><div className="account-line"><span className="avatar">{initials(session.username)}</span><div><strong>{session.username}</strong><small>Workspace administrator</small></div></div><div className="form-actions"><button className="secondary" onClick={()=>open({kind:'password'})}>Change password</button><button className="text-button" onClick={()=>open({kind:'audit'})}>View audit log</button><button className="text-button" onClick={logout}>Sign out</button></div></div></Card>
    </div>
  </div>;
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
  const [shotList] = useState(()=>modal.kind==='shot'?data.shots.filter(s=>s.employee_id===modal.shot.employee_id).sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id)):[]);
  const [shotIndex,setShotIndex] = useState(()=>modal.kind==='shot'?Math.max(0,shotList.findIndex(s=>s.id===modal.shot.id)):0);
  const selectedShot=modal.kind==='shot'?(shotList[shotIndex]||modal.shot):null;
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  useEffect(() => {
    if (modal.kind !== "shot" && modal.kind !== "audit") return;
    const c = new AbortController();
    setLoaded(null);setError("");
    api<{ image?: string; audit?: Audit[] }>(
      modal.kind === "audit"
        ? "audit"
        : "shot?" + new URLSearchParams({ id: selectedShot!.id }),
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
  }, [modal, api, selectedShot]);
  async function save(path: string, body: unknown) {
    await api(path, body);
    close();
    refresh();
    notify("Changes saved.");
  }
  const title = {
    invite: code ? "Ready to connect" : "Add an employee",
    projects: "Manage projects",
    categories: "Productivity rules & whitelist",
    password: "Change manager password",
    revoke: "Revoke device access",
    "employee-policy": "Employee work policy",
    audit: "Administration audit",
    shot: "Screenshot",
  }[modal.kind];
  let content: ReactNode;
  switch (modal.kind) {
    case "employee-policy":
      content=<EmployeePolicyEditor device={modal.device} company={data.policy} save={body=>save("employee-policy",body)}/>;
      break;
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
      content = <ClassificationEditor initial={data.categories} events={data.report.events} save={rules=>save('categories',rules)} />;
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
      content = <div className="capture-viewer">
       <div className="capture-caption"><strong>{data.devices.find(d=>d.employee_id===selectedShot!.employee_id)?.employee_name||selectedShot!.employee_id}</strong><span>{selectedShot!.employee_id} | {timeText(selectedShot!.time)} IST</span><span>{shotIndex+1} / {shotList.length||1}</span></div>
       <div className="capture-stage">
        <button className="capture-arrow previous" aria-label="Previous screenshot" disabled={shotIndex===0} onClick={()=>setShotIndex(i=>i-1)}>&lsaquo;</button>
        {error?<p role="alert">{error}</p>:loaded?.image?<img className="capture-image" alt={`Screenshot for ${selectedShot!.employee_id} recorded ${timeText(selectedShot!.time)} IST`} src={`data:image/${loaded.image.startsWith('iVBOR')?'png':'jpeg'};base64,${loaded.image}`}/>:<p role="status">Loading screenshot...</p>}
        <button className="capture-arrow next" aria-label="Next screenshot" disabled={shotIndex>=shotList.length-1} onClick={()=>setShotIndex(i=>i+1)}>&rsaquo;</button>
       </div><p className="capture-help">Use the left and right arrow keys to browse this employee's captures.</p>
      </div>;

      break;
  }
  return (
    <dialog
      ref={ref}
      className={`workspace-dialog dialog-${modal.kind}`}
      aria-labelledby="dialog-title"
      onKeyDown={e=>{if(modal.kind==='shot'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setShotIndex(i=>Math.max(0,Math.min(shotList.length-1,i+(e.key==='ArrowRight'?1:-1))));}}}
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
        {error && modal.kind!=="shot" ? (
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
        !["settings", "productivity"].includes(view) &&
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
                Voicedots team workspace
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
                        overview: "Track work targets and see who needs your attention.",
                        team: "Your people, their devices, and the latest connection status.",
                        attendance: "Work hours and attendance, day by day.",
                        usage: "Understand where active time is spent.",
                        productivity: "Whitelist work apps and sites. Turn activity into meaningful productivity reports.",
                        timeline: "A chronological view of the workday.",
                        projects: "See where your team’s time goes.",
                        screenshots: "Review captures from employees under your screenshot policy.",
                        settings:
                          "Set up your workspace, work hours, and capture preferences.",
                      }[view]
                    }
                  </p>
                </div>
                <div className="heading-actions">
                  {!["settings", "screenshots", "productivity"].includes(view) && (
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
              {!["settings", "productivity"].includes(view) && (
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
                ) : view === "productivity" ? (
                  <Card><ClassificationEditor key={JSON.stringify(data.categories)} initial={data.categories} events={data.report.events} save={async rules => {await api('categories',rules);setToast('Productivity rules saved. Reports recalculated.');refresh();}} /></Card>
                ) : (
                  <Reports
                    api={api}
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
              {view === "screenshots" && <Recordings api={api} filters={filters} revision={revision}/>}
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
