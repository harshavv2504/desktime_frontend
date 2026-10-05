import type { Activity } from './types';

export function parseContext(title: string) {
  const parts = title.split(' | ').map(p => p.trim()).filter(Boolean);
  const path = parts[0] || '';
  const absolute = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(path);
  return { file: absolute ? path.split(/[\\/]/).filter(Boolean).pop() : '', path: absolute ? path : '', workspace: absolute && parts.length > 2 ? parts[1] : '' };
}
export function preciseTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));
}
export function ActivityDetails({event:e}: {event:Activity}) {
  const title = e.window_title?.trim() || '';
  const context = parseContext(title);
  const browser = /^(chrome|msedge)\.exe$/i.test(e.app);
  return <div className="activity-context">
    {title ? <><strong>{context.file || title}</strong>{context.path && <span className="context-path">{context.path}</span>}{context.workspace && <span>Workspace: {context.workspace}</span>}{context.path && <details><summary>Recorded window title</summary><span>{title}</span></details>}</> : <span className="context-missing">{e.state !== 'active' ? `No window context recorded during ${e.state} time` : browser ? e.domain ? `Website: ${e.domain}` : 'Website not captured' : 'Window title not captured'}</span>}
    {(e.project || e.task) && <small>Assigned: {[e.project,e.task].filter(Boolean).join(' / ')}</small>}
  </div>;
}
