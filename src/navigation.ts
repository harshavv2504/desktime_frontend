import { useCallback, useEffect, useState } from 'react';
import type { View } from './types';
export const pagePaths: Record<View,string> = {overview:'/overview',team:'/team-and-devices',attendance:'/attendance',usage:'/apps-and-websites',productivity:'/productivity-rules',timeline:'/activity-timeline',projects:'/projects-and-tasks',screenshots:'/screenshots',settings:'/workspace-settings'};
export function viewFromPath(path: string): View {
 return (Object.entries(pagePaths).find(([,url])=>url===path.replace(/\/$/,''))?.[0] as View) || 'overview';
}
export function usePageNavigation(): [View,(view:View)=>void] {
 const [view,update]=useState<View>(()=>viewFromPath(window.location.pathname));
 const navigate=useCallback((next:View)=>{
   if(window.location.pathname!==pagePaths[next]) window.history.pushState(null,'',pagePaths[next]);
   update(next);
 },[]);
 useEffect(()=>{
   const onPop=()=>update(viewFromPath(window.location.pathname));
   window.addEventListener('popstate',onPop);
   return ()=>window.removeEventListener('popstate',onPop);
 },[]);
 useEffect(()=>{ document.title=`${pagePaths[view].slice(1).split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')} | Voicedots`; },[view]);
 return [view,navigate];
}
