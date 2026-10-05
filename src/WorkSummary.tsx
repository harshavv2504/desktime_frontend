import type { Attendance } from './types';
import { duration } from './reports';

export default function WorkSummary({ rows, onRules, onSettings }: { rows: Attendance[]; onRules?: () => void; onSettings?: () => void }) {
  const sum = (key: keyof Attendance) => rows.reduce((n,r) => n + Number(r[key] || 0),0);
  const productive=sum('productive'), active=sum('active'), required=sum('required');
  const unrated=sum('unrated'), credited=rows.reduce((n,r)=>n+Math.min(r.productive||0,r.required||0),0);
  const categories = [['Productive', productive], ['Neutral',sum('neutral')], ['Unproductive',sum('unproductive')], ['Unrated',unrated]] as const;
  return <section className="card work-summary" aria-label="Productivity and work targets">
    <div className="card-heading"><h2>Productivity & work targets</h2>{onRules && <button className="text-button" onClick={onRules}>Manage productivity rules →</button>}</div>
    <div className="productivity-layout">
      <div className="productivity-score">
        <span className="eyebrow">PRODUCTIVITY</span>
        <strong>{required ? `${(Math.min(100,100*credited/required)).toFixed(1)}%` : '—'}</strong>
        <p>{required ? 'Productive time / required work time' : 'Work target not configured'}</p>
        <div className="productivity-bar" aria-label="Required work time by classification">{categories.map(([label,value])=><span key={label} className={label.toLowerCase()} style={{width: `${required ? value/Math.max(required,active)*100 : 0}%`}} />)}</div>
        {unrated>0 && <div className="classification-prompt"><span>{duration(unrated)} needs classification.</span>{onRules && <button className="text-button" onClick={onRules}>Whitelist apps & sites</button>}</div>}
      </div>
      <div className="category-metrics">{categories.map(([label,value])=><div key={label}><span><i className={`status-dot ${label.toLowerCase()}`} />{label}</span><strong>{duration(value)}</strong></div>)}</div>
      <div className="work-target">
        <span className="eyebrow">WORK TARGET</span><strong>{duration(credited)} <small>credited</small></strong>
        <progress aria-label="Work target progress" value={Math.min(credited,required)} max={required || 1} />
        <p>{required ? `${duration(required-credited)} remaining of ${duration(required)}` : 'Minimum work hours not configured'}</p>
        {required ? <span className="help">Work target completed <b>{(100*credited/required).toFixed(1)}%</b></span> : onSettings && <button className="text-button" onClick={onSettings}>Set work target →</button>}
      </div>
    </div>
    <div className="break-summary"><span>Lunch <b>{duration(sum('lunch'))}</b></span><span>Other breaks <b>{duration(sum('break'))}</b></span><details><summary>How totals work</summary><p>Productivity is productive time divided by required work time. An 8-hour target with 4 productive hours means 50% productivity. Only productive activity counts. Lunch and breaks are unrestricted. Completion is capped per day; extra time cannot cover another day. Targets cover scheduled days in this date range. Overlapping devices count once.</p></details></div>
  </section>;
}
