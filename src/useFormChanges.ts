import {useEffect,useRef,useState} from 'react';
export function useFormChanges() {
 const ref=useRef<HTMLFormElement>(null),baseline=useRef('');
 const [dirty,setDirty]=useState(false);
 const snapshot=()=>JSON.stringify(Array.from(new FormData(ref.current!).entries()));
 useEffect(()=>{baseline.current=snapshot();},[]);
 const check=()=>setDirty(snapshot()!==baseline.current);
 const saved=()=>{baseline.current=snapshot();setDirty(false);};
 return {ref,dirty,check,saved};
}
