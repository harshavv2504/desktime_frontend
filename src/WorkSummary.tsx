import type { Attendance } from './types';
import { duration } from './reports';

export default function WorkSummary({ rows }: { rows: Attendance[] }) {
  const sum = (key: keyof Attendance) => rows.reduce((n,r) => n + Number(r[key] || 0),0);
  const productive=sum('productive'), active=sum('active'), required=sum('required');
  const metrics = [
    ['Productive', duration(productive)], ['Neutral', duration(sum('neutral'))],
    ['Unproductive', duration(sum('unproductive'))], ['Unrated', duration(sum('unrated'))],
    ['Productivity', active ? `${(100*productive/active).toFixed(1)}%` : 'No activity'],
    ['Effectiveness', required ? `${(100*productive/required).toFixed(1)}%` : 'Set minimum hours'],
    ['Credited work', duration(sum('credited'))], ['Required work', required ? duration(required) : 'Not configured'],
    ['Remaining target', duration(sum('remaining'))], ['Lunch', duration(sum('lunch'))],
    ['Other breaks', duration(sum('break'))], ['Break overrun', duration(sum('break_overrun'))],
  ];
  return <section className="card work-summary" aria-label="Productivity and work targets">
    <div className="card-head"><h2>Productivity & work targets</h2></div>
    <div className="work-counters">{metrics.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <p className="card-body help">Productivity = productive / active time. Effectiveness = productive / required time. Credited work includes active time, optional idle time and paid breaks up to daily allowances. Unrated apps need classification. Overlapping devices count once; the most recently started active sample determines classification. Targets cover all scheduled days in the selected range.</p>
  </section>;
}
