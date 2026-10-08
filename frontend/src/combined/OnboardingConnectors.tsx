import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { emmaBloodReport } from './emma-blood-results';
export default function OnboardingConnectors({ pending, onExample }: { pending:boolean; onExample:()=>void }) {
  const [preview,setPreview]=useState(false);
  return <><div className="onboarding-connectors" aria-label="Connections">
    <button type="button" className="connection-pill" disabled={pending} onClick={()=>setPreview(true)}><span className="bupa-mark">bupa</span><span className="connection-state">Connect</span></button>
  </div>{preview && <BupaPreview onClose={()=>setPreview(false)} onExample={()=>{setPreview(false);onExample();}} />}</>;
}
function BupaPreview({onClose,onExample}:{onClose:()=>void;onExample:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const node=dialog.current!;node.showModal();return()=>node.close();},[]);
  const close=()=>{dialog.current?.close();onClose();};
  return <dialog ref={dialog} className="upstream-calendar-dialog" aria-labelledby="bupa-title" onCancel={event=>{event.preventDefault();close();}}>
    <header><h2 id="bupa-title">Bupa example connection</h2><button type="button" className="icon-button" aria-label="Close Bupa preview" onClick={close}><X size={18}/></button></header>
    <h3>{emmaBloodReport.patient} · {emmaBloodReport.age}</h3><p>Explore Emma’s health profile with {emmaBloodReport.results.length} blood results, grouped across her health areas.</p>
    <p className="dialog-small">Synthetic results from the supplied CSV. No Bupa account is connected. Your own story is kept separate.</p>
    <button type="button" className="primary-button" onClick={()=>{dialog.current?.close();onExample();}}>Open Emma’s profile</button>
  </dialog>;
}
