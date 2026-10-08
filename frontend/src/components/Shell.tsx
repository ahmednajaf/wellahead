import { Home, LayoutGrid, ListChecks, UserRound, LogOut } from 'lucide-react';
export type Page = 'home' | 'health' | 'plan' | 'profile';
export default function Shell({page,onNavigate,onReset,children}:{page:Page;onNavigate:(p:Page)=>void;onReset:()=>void;children:React.ReactNode}) {
  return <div className="app-shell dock-layout">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="app-dock" aria-label="Application dock">
      <nav aria-label="Main navigation">
        {([['home','Home',Home],['health','My Health',LayoutGrid],['plan','Health Plan',ListChecks]] as const).map(([id,label,Icon]) =>
          <button key={id} className="dock-button" aria-label={label} aria-current={page===id?'page':undefined} onClick={()=>onNavigate(id)}>
            <Icon size={21}/><span className="dock-tooltip" aria-hidden="true">{label}</span>
          </button>
        )}
      </nav>
      <div className="dock-bottom">
        <button type="button" className="dock-button apple-health-connector" aria-label="Apple Health" aria-disabled="true"><img src="/icons/apple-health.jpg" className="apple-health-logo" width={30} height={30} alt="" aria-hidden="true"/><span className="dock-tooltip" aria-hidden="true">Apple Health</span></button>
        <button className="dock-button" aria-label="Your profile" onClick={()=>onNavigate('profile')}><UserRound size={21}/><span className="dock-tooltip" aria-hidden="true">Your profile</span></button>
        <button className="dock-button" aria-label="Clear & start again" onClick={onReset}><LogOut size={20}/><span className="dock-tooltip" aria-hidden="true">Clear & start again</span></button>
      </div>
    </aside>
    <main className="app-main" id="main-content" tabIndex={-1}>{children}</main>
  </div>;
}
