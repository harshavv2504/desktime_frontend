import { useState } from 'react';
import type { Activity, Category } from './types';

export default function ClassificationEditor({initial,events,save}:{initial:Category[];events:Activity[];save:(rules:Category[])=>Promise<unknown>}) {
  const [rules,setRules]=useState(initial),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(initial);
  const browser=(name:string)=>/^(chrome|msedge|firefox|brave|opera|vivaldi|iexplore|arc)\.exe$/i.test(name);
  const [drag,setDrag]=useState<{index?:number;match:string;target?:Category['target']}|null>(null);
  const move=(category:Category['category'],item=drag)=>{if(!item)return;if(item.index!==undefined)update(item.index,{category});else setRules(r=>[...r,{match:item.match,target:item.target,category,match_kind:item.target==='domain'?'domain':'exact'}]);setDrag(null);};
  const [over,setOver]=useState<string|null>(null);
  const dirty=JSON.stringify(rules)!==JSON.stringify(saved);
  const update=(i:number,patch:Partial<Category>)=>setRules(r=>r.map((x,j)=>j===i?{...x,...patch}:x));
  const catalog=[...new Map(events.filter(e=>e.state==='active').flatMap(e=>[
    ...(e.app&&!browser(e.app)?[{match:e.app,target:'app' as const}]:[]),...(e.domain?[{match:e.domain,target:'domain' as const}]:[])
  ]).map(x=>[`${x.target}:${x.match}`,x])).values()].filter(x=>x.match.toLowerCase().includes(query.toLowerCase())&&!rules.some(r=>r.match.toLowerCase()===x.match.toLowerCase()&&(r.target===x.target || !r.target || r.target==='any')&&!r.employee_id));
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
  const items=[...catalog.map(item=>({...item,index:undefined as number|undefined,category:'unrated' as Category['category'],employee_id:''})),...rules.map((r,index)=>({...r,index})).filter(r=>!browser(r.match)&&r.match.toLowerCase().includes(query.toLowerCase()))];
  const card=(item:typeof items[number])=><div className={`category-tool kanban-card ${drag?.match===item.match&&drag?.index===item.index?'is-dragging':''}`} key={`${item.index??'new'}:${item.target}:${item.match}`} draggable={!busy} tabIndex={0} aria-label={`Move ${item.match}`} onKeyDown={e=>{const keys:Record<string,Category['category']>={'0':'unrated','1':'productive','2':'neutral','3':'unproductive'};if(keys[e.key]){e.preventDefault();move(keys[e.key],item);}}} onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.match);setDrag(item);}} onDragEnd={()=>{setDrag(null);setOver(null);}}><span className="drag-grip" aria-hidden="true">&#x283f;</span><div><strong>{item.match||'New rule'}</strong><small>{item.target==='domain'?'Website':'Application'}{item.employee_id?` / ${item.employee_id}`:''}</small></div></div>;
  const zone=(category:Category['category'])=>({onDragOver:(e:React.DragEvent)=>{if(!drag)return;e.preventDefault();e.dataTransfer.dropEffect='move';setOver(category);},onDragLeave:(e:React.DragEvent)=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver(null);},onDrop:(e:React.DragEvent)=>{e.preventDefault();move(category);setOver(null);}});
  return <div className="rules-editor kanban-editor">
    <section className={`discovered-tools unrated-tray ${over==='unrated'?'drop-active':''}`} {...zone('unrated')} aria-label="unrated drop zone">
      <div className="section-row"><div><h3>Unrated <span className="count-pill">{items.filter(i=>i.category==='unrated').length}</span></h3><p className="help">Drag cards into a column. Drag them back here to remove their rating.</p></div><label className="search-field"><span className="sr-only">Search discovered applications and websites</span><input type="search" placeholder="Search apps or domains..." value={query} onChange={e=>setQuery(e.target.value)} /></label></div>
      <div className="unrated-cards">{items.filter(i=>i.category==='unrated').map(card)}</div>
      {!items.some(i=>i.category==='unrated')&&<p className="help">{query?'No matching unrated tools.':'All discovered tools are rated. Drop a card here to unrate it.'}</p>}
    </section>
    <div className="category-board">{(['productive','neutral','unproductive'] as const).map(category=><section key={category} className={`category-lane ${category} ${over===category?'drop-active':''}`} {...zone(category)} aria-label={`${category} drop zone`}><h3><span className="lane-dot"/>{category[0].toUpperCase()+category.slice(1)} <span className="count-pill">{items.filter(i=>i.category===category).length}</span></h3><div className="category-items">{items.filter(i=>i.category===category).map(card)}</div><div className="kanban-drop-hint">{over===category?'Release to move here':'Drop cards here'}</div></section>)}</div>
    <p className="help">Browsers are rated by website. Keyboard: focus a card and press 1 Productive, 2 Neutral, 3 Unproductive, or 0 Unrated.</p>
    {rules.some(r=>browser(r.match))&&<p className="help">Browser application rules are ignored. Classify the websites visited instead.</p>}

    <details className="advanced-classification"><summary>Add or edit advanced rules</summary>
    <div className="section-row rule-list-heading"><div><h3>Classification rules <span className="count-pill">{rules.length}</span></h3><p className="help">Employee rules override company rules. Within each scope, the first matching rule wins.</p></div><button className="secondary" onClick={()=>setRules(r=>[...r,{match:'',category:'productive',match_kind:'exact',target:'app'}])}>+ Add rule</button></div>
    {!rules.length && <div className="rules-empty"><h3>Build your productive list</h3><p>Choose a discovered tool above or add a rule for an app like Code.exe or a site like github.com.</p></div>}
    <div className="rule-list">{rules.map((rule,i)=><fieldset className="classification-rule" key={i}>
      <legend>Rule {i+1}</legend>
      <div className="rule-main">
        <label>Application or website<input value={rule.match} placeholder={rule.target==='domain'?'github.com':'Code.exe'} maxLength={256} onChange={e=>update(i,{match:e.target.value})}/></label>
        <label>Target<select value={rule.target || 'any'} onChange={e=>update(i,{target:e.target.value as Category['target'],match_kind:e.target.value==='domain'?'domain':'exact'})}><option value="app">Application</option><option value="domain">Website</option><option value="any">App or website</option></select></label>
        <label>Rating<select className={`rating-select ${rule.category}`} value={rule.category} onChange={e=>update(i,{category:e.target.value as Category['category']})}><option value="productive">Productive</option><option value="neutral">Neutral</option><option value="unproductive">Unproductive</option><option value="unrated">Unrated</option></select></label>
        <button className="remove-rule" aria-label={`Remove rule ${i+1}`} onClick={()=>setRules(r=>r.filter((_,j)=>i!==j))}>×</button>
      </div>
      <details className="rule-options"><summary>{rule.employee_id?`Employee: ${rule.employee_id}`:'Whole company'} · {rule.match_kind==='domain'?'Includes subdomains':rule.match_kind==='contains'?'Contains text':'Exact match'} · Advanced</summary><div className="rule-advanced"><label>Employee ID (blank = whole company)<input placeholder="All employees" value={rule.employee_id || ''} onChange={e=>update(i,{employee_id:e.target.value})}/></label><label>Match<select value={rule.match_kind||'contains'} onChange={e=>update(i,{match_kind:e.target.value as Category['match_kind']})}><option value="exact">Exact app/domain</option><option value="contains">Contains text</option><option value="domain">Domain and subdomains</option></select></label><button className="secondary" disabled={i===0} onClick={()=>setRules(r=>{const next=[...r];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}>Move up</button></div></details>
    </fieldset>)}</div>
    </details>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="rules-save"><span>{dirty?'You have unsaved changes.':'Rules are up to date.'}<small>Saving recalculates productivity in historical reports.</small></span><button className="primary" disabled={busy} onClick={submit}>{busy?'Saving…':'Save productivity rules'}</button></div>
  </div>;
}
