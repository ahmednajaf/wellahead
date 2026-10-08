import { useEffect, useRef } from 'react';
import { createAnatomy } from '../../../server/public/anatomy.js';
import { atelierModels, createAtelier } from './atelier-models.js';
import SystemIcon from '../components/SystemIcon';
import type { HealthSystem } from '../lib/systems';
import { safeLink, type Plan } from './api';
import { relatedActions, domainRecommendations } from './domains';
import WholePersonComparison from './WholePersonComparison';
import BloodResults from './BloodResults';
const modelIds: Record<string, string> = { heart:'heart', brain:'brain', lungs:'lungs', metabolic:'metabolism', gut:'gut', kidneys:'kidneys', muscles:'muscles', reproductive:'reproductive', liver:'liver', eyes:'eyes', skin:'skin', whole:'colleague' };
const descriptions: Record<string, string> = { metabolic:'A reference pancreas, one organ involved in metabolism and hormones.', muscles:'A reference left knee, representing part of the musculoskeletal system.', reproductive:'A reference uterus. This does not assume anything about your anatomy.', kidneys:'Reference kidneys and urinary anatomy.', gut:'Reference intestinal anatomy.', skin:'A reference skin cross-section.', whole:'Explore an illustrative before and after of your journey.' };
export default function SystemDetail({ system, plan, onBack, onPlan, onCalendar }: { system: HealthSystem; plan: Plan; onBack: () => void; onPlan: () => void; onCalendar: (item: { title: string }) => void }) {
  const container = useRef<HTMLDivElement>(null), status = useRef<HTMLDivElement>(null), viewer = useRef<{ focus: (id: string) => Promise<void>; reset: () => void; zoom: (delta: number) => void; dispose: () => void } | null>(null);
  const atelier = atelierModels[system.id as keyof typeof atelierModels];
  const model = atelier || modelIds[system.id];
  useEffect(() => {
    if (!model || !container.current || !status.current) return;
    // Give the imperative upstream viewer its own DOM lifecycle under React.
    const host = container.current, canvas = document.createElement('div'), controls = document.createElement('div');
    canvas.className = 'mesh-canvas'; canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Interactive model. Arrow keys rotate; plus and minus zoom; zero resets.');
    controls.className = 'mesh-controls anatomy-controls'; host.replaceChildren(canvas, controls);
    const anatomy = atelier ? createAtelier(canvas, status.current) : createAnatomy(canvas, status.current); viewer.current = anatomy; let disposed = false;
    void anatomy.focus(model).finally(() => { if (disposed) anatomy.dispose(); });
    return () => { disposed = true; anatomy.dispose(); host.replaceChildren(); viewer.current = null; };
  }, [model, atelier]);
  const actions = relatedActions(plan, system.id);
  const groups = domainRecommendations(plan, system.id);
  return <><button className="text-button back-link" onClick={onBack}>← Back to your health</button><header className="page-heading"><div><div className="eyebrow">EXPLORE YOUR HEALTH</div><h1>{system.name}</h1><p>{descriptions[system.id] || (model ? 'Explore reference anatomy from a new perspective.' : 'Your story and plan, grouped by this health domain.')}</p></div></header><div className={`detail-layout${system.id === 'whole' ? ' whole-body-detail' : ''}`}>
    {system.id === 'whole' ? <WholePersonComparison /> : <section className="organ-viewer-slot live-anatomy" aria-label={`${system.name} anatomy viewer`}>{model ? <><span className="viewer-kicker">ANATOMY, UP CLOSE</span><div ref={container} className="mesh-host" /><div ref={status} role="status" /><div className="mesh-controls"><span>Drag to turn · scroll to zoom</span><button aria-label="Zoom out" onClick={() => viewer.current?.zoom(-.1)}>−</button><button aria-label="Zoom in" onClick={() => viewer.current?.zoom(.1)}>+</button><button onClick={() => viewer.current?.reset()}>Reset</button></div></> : <div className="placeholder-composition"><SystemIcon system={system} className="placeholder-icon" /><p>No reference anatomy model is supplied for {system.name.toLowerCase()}.</p></div>}</section>}
    <div className="detail-results-column">{plan.bloodResults && <BloodResults report={plan.bloodResults} system={system.id} name={system.name} />}
    {system.id !== 'whole' && <aside className="detail-copy"><span className="eyebrow">CONNECTED TO YOUR STORY</span><h2>Your priorities</h2>{actions.length ? actions.map(a => <article className="priority-card" key={a.id}><h3>{a.title}</h3><p>{a.idea}</p><p>{a.reason}</p></article>) : <p>No lifestyle action is linked to this area. That is not an assessment of its health.</p>}{groups.map(group => <section className="domain-checks" key={group.title}><h3>{group.title}</h3>{group.items.map(item => <details key={item.id}><summary>{item.title} · {item.status.replaceAll('_',' ')}</summary><p>{item.explanation}</p><p>Why this appears: {item.trigger}</p>{item.clinicianReview && <p>Discuss this with a clinician before choosing a test.</p>}{item.availableWithSelectedProduct === false && <p>Not listed as an add-on to your selected assessment; confirm options with Bupa.</p>}<a href={safeLink(item.sourceUrl)} target="_blank" rel="noopener noreferrer">{item.authority} guidance ↗</a></details>)}</section>)}<button className="primary-button" onClick={onPlan}>View your full health plan →</button>
      <button className="secondary-button" onClick={() => onCalendar(actions[0] || { title: 'Make time for your next step' })}>Add to Google Calendar</button><p className="fine-print">{system.id === 'whole' ? 'A personalised likeness, not a medical scan or an assessment of health.' : 'Reference anatomy, not a scan of you. It does not show health or risk.'}</p>
    </aside>}</div></div></>;
}
