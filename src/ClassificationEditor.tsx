import { useState } from 'react';
import type { Activity, Category } from './types';

export default function ClassificationEditor({initial,events,save}:{initial:Category[];events:Activity[];save:(rules:Category[])=>Promise<unknown>}) {
  const [rules,setRules]=useState(initial),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(initial);
  const dirty=JSON.stringify(rules)!==JSON.stringify(saved);
  const update=(i:number,patch:Partial<Category>)=>setRules(r=>r.map((x,j)=>j===i?{...x,...patch}:x));
  const catalog=[...new Map(events.filter(e=>e.state==='active').flatMap(e=>[
    ...(e.app?[{match:e.app,target:'app' as const}]:[]),...(e.domain?[{match:e.domain,target:'domain' as const}]:[])
  ]).map(x=>[`${x.target}:${x.match}`,x])).values()].filter(x=>x.match.toLowerCase().includes(query.toLowerCase())&&!rules.some(r=>r.match.toLowerCase()===x.match.toLowerCase()&&(r.target===x.target || !r.target || r.target==='any')&&!r.employee_id));
  const whitelist=(item:{match:string;target:'app'|'domain'})=>setRules(r=>[...r,{...item,category:'productive',match_kind:item.target==='domain'?'domain':'exact'}]);
  async function submit() {
    setBusy(true);setError('');
    try {
      const normalized=rules.map(r=>({...r,match:r.match.trim(),...(r.employee_id?{employee_id:r.employee_id.trim()}:{})}));
      if(normalized.some(r=>!r.match))throw Error('Enter an application or website for every rule.');
      if(normalized.some(r=>r.target==='domain' && /[/:\s]/.test(r.match)))throw Error('For websites, enter only the domain, such as github.com. Remove https:// and page paths.');
      await save(normalized);setRules(normalized);setSaved(normalized);
    } catch(e) {setError(e instanceof Error?e.message:'Save failed. Your edits are still here.');}
    finally {setBusy(false);}
  }
  return <div className="rules-editor">
    <div className="rules-intro"><div className="rule-intro-icon">✓</div><div><h3>Your productive app & website whitelist</h3><p>Mark approved work tools as <b>Productive</b>. Other tools can be neutral or unproductive. Unmatched activity stays unrated; this list classifies time and does not block websites.</p></div></div>
    <section className="discovered-tools">
      <div className="section-row"><div><h3>Discovered on your team’s devices</h3><p className="help">Add a productive rule in one click, then save below.</p></div><label className="search-field"><span className="sr-only">Search discovered applications and websites</span><input type="search" placeholder="Search apps or domains…" value={query} onChange={e=>setQuery(e.target.value)} /></label></div>
      <div className="catalog-list">{catalog.slice(0,30).map(item=><button className="catalog-chip" key={`${item.target}:${item.match}`} aria-label={`Whitelist ${item.match}`} onClick={()=>whitelist(item)}><span className="catalog-icon">{item.target==='app'?'▣':'◎'}</span><span>{item.match}<small>{item.target==='app'?'Application':'Website + subdomains'}</small></span><b>+</b></button>)}</div>
      {!catalog.length && <p className="help catalog-empty">{query?'No matching tools. Add a rule manually below.':'No unclassified tools in this period. You can still add apps or domains manually.'}</p>}
    </section>
    <div className="section-row rule-list-heading"><div><h3>Classification rules <span className="count-pill">{rules.length}</span></h3><p className="help">Employee rules override company rules. Within each scope, the first matching rule wins.</p></div><button className="secondary" onClick={()=>setRules(r=>[...r,{match:'',category:'productive',match_kind:'exact',target:'app'}])}>+ Add rule</button></div>
    {!rules.length && <div className="rules-empty"><h3>Build your productive list</h3><p>Choose a discovered tool above or add a rule for an app like Code.exe or a site like github.com.</p></div>}
    <div className="rule-list">{rules.map((rule,i)=><fieldset className="classification-rule" key={i}>
      <legend>Rule {i+1}</legend>
      <div className="rule-main">
        <label>Application or website<input value={rule.match} placeholder={rule.target==='domain'?'github.com':'Code.exe'} maxLength={256} onChange={e=>update(i,{match:e.target.value})}/></label>
        <label>Target<select value={rule.target || 'any'} onChange={e=>update(i,{target:e.target.value as Category['target'],match_kind:e.target.value==='domain'?'domain':'exact'})}><option value="app">Application</option><option value="domain">Website</option><option value="any">App or website</option></select></label>
        <label>Rating<select className={`rating-select ${rule.category}`} value={rule.category} onChange={e=>update(i,{category:e.target.value as Category['category']})}><option value="productive">Productive / whitelist</option><option value="neutral">Neutral</option><option value="unproductive">Unproductive</option><option value="unrated">Unrated</option></select></label>
        <button className="remove-rule" aria-label={`Remove rule ${i+1}`} onClick={()=>setRules(r=>r.filter((_,j)=>i!==j))}>×</button>
      </div>
      <details className="rule-options"><summary>{rule.employee_id?`Employee: ${rule.employee_id}`:'Whole company'} · {rule.match_kind==='domain'?'Includes subdomains':rule.match_kind==='contains'?'Contains text':'Exact match'} · Advanced</summary><div className="rule-advanced"><label>Employee ID (blank = whole company)<input placeholder="All employees" value={rule.employee_id || ''} onChange={e=>update(i,{employee_id:e.target.value})}/></label><label>Match<select value={rule.match_kind||'contains'} onChange={e=>update(i,{match_kind:e.target.value as Category['match_kind']})}><option value="exact">Exact app/domain</option><option value="contains">Contains text</option><option value="domain">Domain and subdomains</option></select></label><button className="secondary" disabled={i===0} onClick={()=>setRules(r=>{const next=[...r];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}>Move up</button></div></details>
    </fieldset>)}</div>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="rules-save"><span>{dirty?'You have unsaved changes.':'Rules are up to date.'}<small>Saving recalculates productivity in historical reports.</small></span><button className="primary" disabled={busy} onClick={submit}>{busy?'Saving…':'Save productivity rules'}</button></div>
  </div>;
}
