import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, Mic, Plus, Square } from 'lucide-react';
import { RecordEditor } from './Connections';
import { useRecording } from './useRecording';
import OnboardingConnectors from './OnboardingConnectors';
import ExampleProfiles from './ExampleProfiles';
import type { ExampleProfileId } from './example-profiles';
import type { RecordNote } from './api';
export function Identity() { return <span className="brand"><span className="brand-symbol" aria-hidden="true">✧</span>Well Ahead</span>; }
const questions = ['How old are you, and how’s your health?', 'What runs in your family?', 'What would you like to improve?'];
export default function Onboarding({ text, setText, records, setRecords, pending, error, onSubmit, onCancel, onExample, exampleId, exampleNotice, onSelectExample }: { text: string; setText: (s: string) => void; records: RecordNote[]; setRecords: (v: RecordNote[]) => void; pending: boolean; error: string; onSubmit: () => void; onCancel: () => void; onExample: () => void; exampleId: ExampleProfileId | null; exampleNotice: ReactNode; onSelectExample: (id: ExampleProfileId | null) => void }) {
  const [notes, setNotes] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (exampleId) input.current?.focus({ preventScroll: true }); }, [exampleId]);
  const voice = useRecording(setText);
  const active = voice.state !== 'idle';
  function edit(value: string) { if (active) voice.cancel(); setText(value); }
  return <main className="onboarding combined-onboarding"><header className="onboard-header"><Identity /><ExampleProfiles selected={exampleId} disabled={pending || active} onSelect={id => { voice.discard(); onSelectExample(id); }} /></header><section className="onboard-content">
    <h1>A little about you</h1><p className="onboard-lead">Three questions, one conversation</p>
    <div className="intake-questions"><ol>{questions.map((q, i) => <li key={q}><span>{i+1}</span>{q}</li>)}</ol></div>
    <form onSubmit={e => { e.preventDefault(); if (!active && !pending) { window.speechSynthesis?.cancel(); onSubmit(); } }}>
      <div className="prompt-surface" data-listening={voice.state === 'listening'} onClick={event => { if (!(event.target as HTMLElement).closest('button, textarea, input, a')) input.current?.focus(); }}>
        <div className="composer-status"><p role="status">{pending ? 'Getting your story ready to review…' : voice.state === 'listening' ? 'I’m listening. Take your time.' : voice.state === 'transcribing' ? 'Writing down your words…' : voice.state === 'requesting' ? 'Opening your microphone…' : 'Speak or type naturally.'}</p></div>
        <label className="sr-only" htmlFor="combined-history">Tell us about your health</label><textarea ref={input} id="combined-history" value={text} onChange={e => edit(e.target.value)} maxLength={8000} required rows={2} readOnly={pending} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!active && !pending && text.trim()) event.currentTarget.form?.requestSubmit(); } }} placeholder="Start with what’s on your mind…" />
        <div className="prompt-toolbar"><div className="voice-controls">{voice.state === 'listening' ? <button type="button" className="icon-button" aria-label="Stop recording" onClick={voice.stop}><Square size={18} /></button> : <button type="button" className="icon-button" aria-label="Start recording" disabled={pending || active} onClick={() => { window.speechSynthesis?.cancel(); void voice.start(); }}><Mic size={20} /></button>}<button type="button" className="icon-button" aria-label="Add a record" disabled={pending || active || records.length >= 5} onClick={() => setNotes(true)}><Plus size={20} /></button></div><button className="send-button" type="submit" title="Continue · Enter" aria-label="Review my health profile" disabled={pending || active || !text.trim()}><ArrowUp size={20} /></button></div>
      </div>
    </form>
    <OnboardingConnectors pending={pending || active} onExample={onExample} />
    {exampleNotice}
    {voice.state === 'listening' && <div className="recording-meter"><span>{voice.seconds}s / 180s</span><meter value={voice.level} min={0} max={1} aria-label="Microphone sound level" /></div>}
    {voice.playback && <div className="audio-playback"><audio controls src={voice.playback} aria-label="Your recording" /><button type="button" className="text-button" onClick={voice.discard}>Remove recording</button></div>}
    {(pending || active) && <button type="button" className="text-button" onClick={() => { voice.cancel(); onCancel(); }}>Cancel</button>}
    {(error || voice.error) && <p role="alert" className="error">{error || voice.error}</p>}
    {notes && <RecordEditor onClose={() => setNotes(false)} onAdd={record => { setRecords([...records, record]); setNotes(false); }} />}
    {records.map((r, i) => <details className="onboarding-record" key={`${exampleId}-${i}`}><summary>{r.title}</summary><small>{r.source}</small><p>{r.text}</p><button type="button" className="text-button" aria-label={`Remove ${r.title}`} disabled={pending || active} onClick={() => setRecords(records.filter((_, n) => n !== i))}>Remove record</button></details>)}
  </section><footer className="onboard-footer"><p className="privacy-note">Your words help build your health profile.<br />Review your profile before opening your plan.</p><details className="medical-help"><summary>Medical help</summary><p>UK: <a href="tel:999">999 for emergencies</a> · <a href="tel:111">NHS 111 if unsure what to do</a> · Your GP for routine advice. This app has not called anyone.</p></details></footer></main>;
}
