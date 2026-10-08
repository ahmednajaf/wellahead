import { Identity } from './Onboarding';
import type { ReactNode } from 'react';
import type { Profile } from './api';

const labels = ['Age', 'Your health and medicines', 'Family history', 'Daily habits', 'Previous checks', 'What matters to you'];
// Display the fields already extracted by Rob's backend; no client inference.
export default function Confirmation({ text, profile, onEdit, onConfirm, exampleNotice }: {
  text: string; profile: Profile; onEdit: () => void; onConfirm: () => void; exampleNotice?: ReactNode;
}) {
  return <main className="onboarding combined-review"><header className="onboard-header"><Identity /></header><section className="review-content">
    {exampleNotice}
    <button type="button" className="text-button" onClick={onEdit}>← Back to your story</button>
    <h1>Here’s what we understood</h1><p>Check these details before opening your plan.</p>
    <div className="review-grid">{labels.map((label,i) => <article className="profile-card" key={label}><h2>{label}</h2><p>{profile.answers[i] || 'Not mentioned'}</p></article>)}</div>
    {profile.facts.length > 0 && <section className="profile-card extracted-facts"><h2>Details used for your checks and services</h2><p>Quoted from your story or a note you selected.</p>{profile.facts.map((f,i) => <div key={i}><strong>{f.key.replaceAll('_',' ')}: {f.value}</strong><blockquote>{f.evidence}</blockquote></div>)}</section>}
    <details className="profile-card"><summary>Your original words</summary><p>{text}</p></details>
    {profile.records.length > 0 && <section className="profile-card"><h2>Notes you included</h2>{profile.records.map((r,i) => <details key={i}><summary>{r.title}</summary><p>{r.text}</p></details>)}</section>}
    <p className="fine-print">Missing information stays unknown. To correct a detail, edit your story and review the updated profile.</p>
    <div className="review-actions"><button className="secondary-button" onClick={onEdit}>Edit my story</button><button className="primary-button" onClick={onConfirm}>Looks right</button></div>
  </section></main>;
}
