import {useEffect,useRef,useState} from 'react';
import type {RequestApi,Shot,Workspace} from './types';
import {initials,timeText} from './reports';
function Preview({shot,api}:{shot:Shot;api:RequestApi}){
 const ref=useRef<HTMLSpanElement>(null);const [image,setImage]=useState('');const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const abort=new AbortController();let started=false;
  const observer=new IntersectionObserver(entries=>{if(started||!entries.some(e=>e.isIntersecting))return;started=true;observer.disconnect();
   api<{image:string}>('shot?'+new URLSearchParams({id:shot.id}),undefined,abort.signal).then(r=>{if(!abort.signal.aborted)setImage(`data:image/${r.image.startsWith('iVBOR')?'png':'jpeg'};base64,${r.image}`);}).catch(()=>{if(!abort.signal.aborted)setFailed(true);});
  },{rootMargin:'100px'});
  if(ref.current)observer.observe(ref.current);
  return()=>{abort.abort();observer.disconnect();};
 },[shot.id,api]);
 return <span className="screenshot-preview" ref={ref}>{image?<img src={image} alt=""/>:<span>{failed?'Preview unavailable':'Loading preview...'}</span>}</span>;
}
function EmployeeGallery({shots,name,api,open}:{shots:Shot[];name:string;api:RequestApi;open:(shot:Shot)=>void}){
 const [limit,setLimit]=useState(12);
 return <section className="card employee-gallery"><div className="card-heading"><div className="person"><span className="avatar">{initials(name)}</span><div><h2>{name}</h2><small>{shots[0].employee_id} | {shots.length} capture{shots.length===1?'':'s'}</small></div></div><span className="help">Newest first | IST</span></div>
 <div className="employee-captures">{shots.slice(0,limit).map(shot=><button className="screenshot-tile" key={shot.id} onClick={()=>open(shot)} aria-label={`Open screenshot for ${name}, ${timeText(shot.time)} IST`}><Preview shot={shot} api={api}/><span className="screenshot-tile-caption"><strong>{timeText(shot.time)} IST</strong><span>View &nearr;</span></span></button>)}</div>
 {shots.length>limit&&<div className="gallery-more"><button className="secondary" onClick={()=>setLimit(n=>n+12)}>Show more captures ({shots.length-limit} remaining)</button></div>}
 </section>;
}
export default function ScreenshotGallery({data,api,open}:{data:Workspace;api:RequestApi;open:(shot:Shot)=>void}){
 const groups=new Map<string,Shot[]>();
 for(const shot of data.shots){const list=groups.get(shot.employee_id)||[];list.push(shot);groups.set(shot.employee_id,list);}
 if(!groups.size)return <section className="card"><div className="empty"><strong>No screenshots in this period</strong><p>Try another date range or employee.</p></div></section>;
 return <div className="screenshot-groups">{[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([id,shots])=><EmployeeGallery key={id} name={data.devices.find(d=>d.employee_id===id)?.employee_name||id} shots={shots.sort((a,b)=>b.time.localeCompare(a.time)||a.id.localeCompare(b.id))} api={api} open={open}/>)}</div>;
}
