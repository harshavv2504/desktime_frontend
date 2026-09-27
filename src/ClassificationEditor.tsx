import { useState } from 'react';
import type { Activity, Category } from './types';

export default function ClassificationEditor({initial,events,save}:{initial:Category[];events:Activity[];save:(rules:Category[])=>Promise<unknown>}) {
  const [rules,setRules]=useState(initial),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const update=(i:number,patch:Partial<Category>)=>setRules(r=>r.map((x,j)=>j===i?{...x,...patch}:x));
  const catalog=[...new Set(events.filter(e=>e.state==='active').map(e=>e.domain||e.app))].filter(x=>x.toLowerCase().includes(query.toLowerCase())&&!rules.some(r=>r.match===x));
  return <div>
    <p className="help">The productive list marks work apps and websites as productive; it does not block or hide them. Employee rules override company rules; first matching rule wins within each scope. Changes recalculate historical reports. Unmatched activity is unrated.</p>
    <label>Search discovered applications and websites<input value={query} onChange={e=>setQuery(e.target.value)} /></label>
    <div className="catalog-list">{catalog.slice(0,50).map(value=><button className="secondary" key={value} onClick={()=>setRules(r=>[...r,{match:value,category:'productive',match_kind:'exact'}])}>+ {value}</button>)}</div>
    {rules.map((rule,i)=><fieldset className="classification-rule" key={i}>
      <legend>Rule {i+1}</legend>
      <label>Application or website<input value={rule.match} maxLength={256} onChange={e=>update(i,{match:e.target.value})}/></label>
      <label>Target<select value={rule.target || 'any'} onChange={e=>update(i,{target:e.target.value as Category['target']})}><option value="any">App or website</option><option value="app">Application only</option><option value="domain">Website only</option></select></label>
      <label>Employee ID (blank = whole company)<input value={rule.employee_id || ''} onChange={e=>update(i,{employee_id:e.target.value})}/></label>
      <label>Rating<select value={rule.category} onChange={e=>update(i,{category:e.target.value as Category['category']})}>{['productive','neutral','unproductive','unrated'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Match<select value={rule.match_kind||'contains'} onChange={e=>update(i,{match_kind:e.target.value as Category['match_kind']})}><option value="exact">Exact app/domain</option><option value="contains">Contains text</option><option value="domain">Domain and subdomains</option></select></label>
      <button className="secondary" disabled={i===0} onClick={()=>setRules(r=>{const next=[...r];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}>Move up</button>
      <button className="secondary" onClick={()=>setRules(r=>r.filter((_,j)=>i!==j))}>Remove rule {i+1}</button>
    </fieldset>)}
    <button className="secondary" onClick={()=>setRules(r=>[...r,{match:'',category:'productive',match_kind:'exact'}])}>Add rule</button>
    {error&&<p role="alert">{error}</p>}
    <button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{if(rules.some(r=>!r.match.trim()))throw Error('Enter a value for every rule.');await save(rules.map(r=>({...r,match:r.match.trim()})));}catch(e){setError(e instanceof Error?e.message:'Save failed');}finally{setBusy(false);}}}>{busy?'Saving…':'Save categories'}</button>
  </div>;
}
