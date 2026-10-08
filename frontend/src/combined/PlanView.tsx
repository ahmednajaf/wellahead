import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { renderRecommendations } from '../../../server/public/recommendations-view.js';
import { safeLink, type Plan } from './api';
export default function PlanView({ plan, focusId, onRefine }: { plan: Plan; focusId?: string; onRefine: (text: string) => void }) {
  const rules = useRef<HTMLDivElement>(null), [chosen, setChosen] = useState(''), [reply, setReply] = useState('');
  useEffect(() => { if (rules.current) renderRecommendations(rules.current, plan.recommendations); }, [plan]);
  useEffect(() => {
    if (!focusId) return;
    const frame = requestAnimationFrame(() => {
      const detail = Array.from(rules.current?.querySelectorAll<HTMLDetailsElement>('details[data-recommendation-id]') || [])
        .find(item => item.dataset.recommendationId === focusId);
      if (!detail) return;
      detail.open = true;
      detail.querySelector('summary')?.focus({ preventScroll: true });
      detail.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [plan, focusId]);
  function read() { window.speechSynthesis?.cancel(); const speech = new SpeechSynthesisUtterance([plan.intro, ...plan.actions.map(a => `${a.title}. ${a.idea}. ${a.step}. ${a.uncertainty}`)].join(' ')); speech.lang = 'en-GB'; window.speechSynthesis?.speak(speech); }
  return <section className="combined-plan"><div className="plan-summary"><div><span className="eyebrow">MADE AROUND YOU</span><h2>Your next chapter</h2><p>{plan.intro}</p></div><button className="icon-button" aria-label="Listen to my plan" disabled={!window.speechSynthesis} onClick={read}><Volume2 size={20} /></button></div>
    <div ref={rules} className="matrix-results" />
    <div className="combined-actions">{plan.actions.map(a => <article className="profile-card" key={a.id}><h3>{a.title}</h3><p>{a.idea}</p><p className="fine-print">{a.reason}</p><details><summary>Why this fits you & guidance</summary><blockquote>{a.context}</blockquote>{a.backup && <p>If that’s tricky: {a.backup}</p>}<p>{a.step}</p><p>{a.uncertainty}</p>{a.sources.map(s => <a key={s.url} href={safeLink(s.url)} target="_blank" rel="noopener noreferrer">{s.publisher} · {s.title} ↗</a>)}</details><button type="button" className="secondary-button" aria-pressed={chosen === a.id} onClick={() => setChosen(chosen === a.id ? '' : a.id)}>{chosen === a.id ? '✓ My first step' : 'Make this my first step'}</button></article>)}</div>
    {plan.followUp && <form className="profile-card plan-followup" onSubmit={e => { e.preventDefault(); if (reply.trim()) onRefine(reply.trim()); }}><label htmlFor="followup"><strong>{plan.followUp}</strong></label><input id="followup" maxLength={1000} required value={reply} onChange={e => setReply(e.target.value)} /><button className="primary-button">Review added context</button></form>}
    <p className="fine-print">{plan.uncertainty}</p>
  </section>;
}
