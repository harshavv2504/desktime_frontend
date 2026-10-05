import {useEffect,useState} from 'react';
import type {Filters,RequestApi,VerificationSignal} from './types';
import {filterQuery,timeText} from './reports';
type Clip={id:string;employee_id:string;time:string;duration:number;signals:VerificationSignal[]};
export default function Recordings({api,filters,revision}:{api:RequestApi;filters:Filters;revision:number}){
 const [clips,setClips]=useState<Clip[]>([]),[error,setError]=useState(''),[playing,setPlaying]=useState<{clip:Clip;url:string}|null>(null),[busy,setBusy]=useState('');
 useEffect(()=>{const c=new AbortController();setError('');api<{recordings:Clip[]}>('recordings?'+filterQuery(filters),undefined,c.signal).then(r=>setClips(r.recordings||[])).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>c.abort();},[api,filters,revision]);
 useEffect(()=>setPlaying(null),[filters]);
 async function play(clip:Clip){setBusy(clip.id);setError('');try{const r=await api<{url:string}>('recording?id='+clip.id);setPlaying({clip,url:r.url});}catch(e){setError(e instanceof Error?e.message:'Could not load recording.')}finally{setBusy('')}}
 return <section className="card recordings"><div className="card-heading"><div><h2>Verification recordings</h2><p className="help">Review evidence alongside activity. A flag alone does not establish misuse. Clips expire after 7 days.</p></div></div><div className="card-body">
 {error&&<p role="alert" className="error">{error}</p>}
 {playing&&<div className="recording-player"><div className="section-row"><strong>{playing.clip.employee_id} · {timeText(playing.clip.time)}</strong><button className="secondary" onClick={()=>setPlaying(null)}>Close recording</button></div><video key={playing.url} controls preload="metadata" src={playing.url} onError={()=>setError('Playback link may have expired. Open this recording again.')} aria-label="Verification recording"/><p className="help">Pointer and click markers included · No audio</p></div>}
 {!clips.length?<p className="help">No verification recordings in this period. Enable flag-triggered recording in Workspace settings → Tracking & storage.</p>:<div className="table-wrap"><table><thead><tr><th>Employee</th><th>Captured (IST)</th><th>Trigger</th><th>Length</th><th>Review</th></tr></thead><tbody>{clips.map(c=><tr key={c.id}><td>{c.employee_id}</td><td>{timeText(c.time)}</td><td>{c.signals.map(s=>s.kind==='bounded_pointer'?'Pointer stayed within a small area':'Repeated click timing').join('; ')}</td><td>{Math.round(c.duration)} sec</td><td><button className="secondary" disabled={busy===c.id} onClick={()=>play(c)}>{busy===c.id?'Opening…':'Watch recording'}</button></td></tr>)}</tbody></table></div>}
 </div></section>;
}
