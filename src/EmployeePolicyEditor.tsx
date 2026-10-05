import {useFormChanges} from './useFormChanges';
import {useEffect,useState, type FormEvent} from 'react';
import type {Device,Policy} from './types';
import {days} from './reports';

export default function EmployeePolicyEditor({device,company,save}:{device:Device;company:Policy;save:(body:unknown)=>Promise<unknown>}) {
  const changes=useFormChanges();
  const assigned=device.work_policy || company;
  const [inherit,setInherit]=useState(assigned.inherited ?? true);
  const [mode,setMode]=useState(assigned.schedule_mode || 'fixed');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{changes.check();},[inherit,mode]);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(busy||!changes.dirty)return;setError('');const data=new FormData(e.currentTarget);
    const body=inherit?{employee_id:device.employee_id,inherit:true}:{employee_id:device.employee_id,inherit:false,
      arrangement:data.get('arrangement'),schedule_mode:mode,minimum_minutes:Math.round(Number(data.get('hours'))*60),
      work_start:data.get('work_start'),work_end:data.get('work_end'),work_days:data.getAll('work_days').map(Number)};
    setBusy(true);try{await save(body);changes.saved();}catch(e){setError(e instanceof Error?e.message:'Could not save policy.');}finally{setBusy(false);}
  }
  return <form ref={changes.ref} onChange={changes.check} className="dialog-form" onSubmit={submit}>
    <p><b>{device.employee_name}</b> · {device.employee_id}</p>
    <p className="help">Manager-controlled. Applies to all this employee’s devices from today. Employees can start or end sessions, but cannot edit their schedule or target.</p>
    <label>Policy source<select name="policy_source" value={inherit?'company':'override'} onChange={e=>setInherit(e.target.value==='company')}><option value="company">Use company settings</option><option value="override">Assign employee work policy</option></select></label>
    {inherit?<p className="policy-note">Company target: {(company.minimum_minutes || 0)/60} hours/day. Schedule: {company.work_start}–{company.work_end} IST.</p>:<>
      <div className="form-grid">
        <label>Work arrangement<select name="arrangement" defaultValue={assigned.arrangement || 'full_time'}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="consultant">Consultant</option></select></label>
        <label>Required productive hours per day<input name="hours" type="number" min={1/60} max={24} step="any" required defaultValue={(assigned.minimum_minutes ?? 480)/60}/></label>
      </div>
      <label>Schedule<select name="schedule_mode" value={mode} onChange={e=>setMode(e.target.value as 'fixed'|'flexible')}><option value="fixed">Fixed hours</option><option value="flexible">Flexible hours</option></select></label>
      <div className="form-grid" hidden={mode==='flexible'}>
        <label>Start time (IST)<input name="work_start" type="time" required defaultValue={assigned.work_start}/></label>
        <label>End time (IST)<input name="work_end" type="time" required defaultValue={assigned.work_end}/></label>
      </div>
      {mode==='flexible'&&<p className="policy-note">Work at any time on approved days. The updated employee app requires Start work and End work; sessions end at midnight IST or app restart. Older apps must be updated before flexible tracking starts.</p>}
      <fieldset><legend>Working days (IST)</legend><div className="check-grid">{days.map((day,i)=><label key={day}><input name="work_days" type="checkbox" value={i} defaultChecked={assigned.work_days.includes(i)}/>{day}</label>)}</div></fieldset>
      <p className="help">Breaks and idle time are excluded. Productivity uses this daily target. Company holidays and screenshot policy still apply.</p>
    </>}
    {error&&<p role="alert" className="error">{error}</p>}
    <button className="primary" disabled={busy||!changes.dirty}>{busy?'Saving…':'Approve & save work policy'}</button>
  </form>;
}
