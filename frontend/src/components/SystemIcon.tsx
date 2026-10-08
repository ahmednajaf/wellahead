import type { HealthSystem } from '../lib/systems';
// One asset boundary for the launcher and future viewer placeholder.
// PNGs are complete app icons; only fallback glyphs receive a coloured surface.
export default function SystemIcon({system, count=0, className=''}:{system:HealthSystem;count?:number;className?:string}) {
  return <span className={`system-icon ${system.iconSrc ? 'asset-icon' : system.tone} ${className}`} aria-hidden="true">
    {system.iconSrc ? <img src={system.iconSrc} alt="" draggable={false}/> : <system.Icon size={44} strokeWidth={1.65}/>}
    {count>0 && <span className="action-badge">{count}</span>}
  </span>;
}
