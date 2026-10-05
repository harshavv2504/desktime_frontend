import {useState} from 'react';
import type {Attendance, Workspace} from './types';
import {duration, initials, statusOf} from './reports';

export function employeeTargets(rows:Attendance[]){
  const people=new Map<string,{id:string;name:string;required:number;worked:number;remaining:number;days:number;unmetDays:number}>();
  for(const row of rows){
    const p=people.get(row.employee_id)||{id:row.employee_id,name:row.employee_name,required:0,worked:0,remaining:0,days:0,unmetDays:0};
    const required=row.required||0, worked=row.credited||0;
    p.required+=required;p.worked+=worked;p.remaining+=Math.max(0,required-worked);
    if(required>0){p.days++;if(worked<required)p.unmetDays++;}
    people.set(p.id,p);
  }
  return [...people.values()].sort((a,b)=>b.remaining-a.remaining||a.name.localeCompare(b.name));
}
export default function TargetOverview({data,onAttendance}:{data:Workspace;onAttendance:()=>void}){
 const [scope,setScope]=useState('unmet');
 const people=employeeTargets(data.report.attendance);
 const unmet=people.filter(p=>p.remaining>0),met=people.filter(p=>p.required>0&&!p.remaining),unset=people.filter(p=>!p.required);
 const visible=scope==='all'?people:scope==='met'?met:scope==='unset'?unset:unmet;
 return <section className="target-overview">
  <div className="target-kpis">{[['Targets remaining',unmet.length,'Employees with work left'],['Targets reached',met.length,'All assigned days completed'],['Work remaining',duration(unmet.reduce((s,p)=>s+p.remaining,0)),'Across assigned daily targets'],['No target assigned',unset.length,'No required hours in this period']].map(([title,value,note])=><div className="target-kpi" key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
  <section className="card target-card"><div className="card-heading"><div><h2>Employee work targets</h2><p>See who still has work remaining in the selected period.</p></div><button className="text-button" onClick={onAttendance}>Daily breakdown &rarr;</button></div>
  <div className="target-toolbar" role="group" aria-label="Filter work targets">{[['unmet',`Unreached (${unmet.length})`],['met',`Reached (${met.length})`],['unset',`No target (${unset.length})`],['all',`All employees (${people.length})`]].map(([value,title])=><button key={value} className={scope===value?'selected':''} aria-pressed={scope===value} onClick={()=>setScope(value)}>{title}</button>)}</div>
  {visible.length?<div className="table-scroll"><table><thead><tr>{['Employee','Work completed','Remaining','Progress','Current status'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{visible.map(p=>{
   const devices=data.devices.filter(d=>d.employee_id===p.id&&!d.revoked);const statuses=devices.map(statusOf);const current=statuses.includes('active')?'Working now':statuses.includes('idle')?'Idle':statuses.includes('paused')?'Paused':statuses.includes('locked')?'Locked':'Offline';
   const percent=p.required?Math.round(100*(p.required-p.remaining)/p.required):0;
   return <tr key={p.id}><td><div className="person"><span className="avatar">{initials(p.name)}</span><div><strong>{p.name}</strong><small>{p.id}</small></div></div></td><td><strong>{duration(p.worked)}</strong><small className="target-sub">{p.required?`of ${duration(p.required)} required`:'No target assigned'}</small></td><td><strong className={p.remaining?'target-shortfall':'target-complete'}>{p.required?p.remaining?duration(p.remaining):'Reached':'--'}</strong><small className="target-sub">{p.unmetDays?`${p.unmetDays} assigned day${p.unmetDays===1?'':'s'} remaining`:''}</small></td><td><div className="target-progress"><progress aria-label={`${p.name} target completion`} value={percent} max={100}/><span>{p.required?`${percent}%`:'--'}</span></div></td><td><span className={`target-status ${current==='Working now'?'working':''}`}>{current}</span></td></tr>;
  })}</tbody></table></div>:<div className="empty"><strong>{people.length?scope==='unmet'?'No unreached targets in this period':'No employees in this group':'No records in this period'}</strong><p>Targets follow each employee's manager-approved policy.</p></div>}
  <p className="target-footnote">Breaks and idle time are excluded. Each day is assessed separately; overtime does not erase another day's shortfall. A target still in progress is not an absence or a missed deadline.</p>
  </section>
 </section>;
}
