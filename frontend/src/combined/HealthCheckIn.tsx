import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, Square, X } from 'lucide-react';
import { useRecording } from './useRecording';

export default function HealthCheckIn({ pending, error, onSubmit, onClose }: {
  pending: boolean;
  error: string;
  onSubmit: (message: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState('');
  const voice = useRecording(setMessage);
  const recording = voice.state !== 'idle';
  useEffect(() => {
    const node = dialog.current!; node.showModal();
    return () => { node.close(); window.speechSynthesis?.cancel(); };
  }, []);
  function close() { dialog.current?.close(); voice.cancel(); onClose(); }
  return <dialog ref={dialog} className="health-checkin" aria-labelledby="checkin-title" aria-describedby="checkin-description" onCancel={event => { event.preventDefault(); close(); }}>
    <header className="checkin-header"><span>Well Ahead · AI agent</span><button type="button" className="icon-button" aria-label="Close health check-in" onClick={close}><X size={19} /></button></header>
    <h2 id="checkin-title">How’s your health today?</h2>
    <p id="checkin-description" className="checkin-greeting">Tell me what’s on your mind. I’ll check what you share, then help you review your plan.</p>
    <form onSubmit={event => { event.preventDefault(); if (!pending && !recording && message.trim() && message.length <= 2500) onSubmit(message.trim()); }}>
      <label className="sr-only" htmlFor="checkin-message">Your health check-in</label>
      <textarea id="checkin-message" rows={4} maxLength={2500} required value={message} readOnly={pending || recording} onChange={event => setMessage(event.target.value)} placeholder="Speak or type how you’re feeling…" />
      <div className="checkin-controls">
        {voice.state === 'listening' ? <button type="button" className="checkin-mic" onClick={voice.stop}><Square size={16} />Stop recording</button> : <button type="button" autoFocus className="checkin-mic" disabled={pending || recording} onClick={() => { window.speechSynthesis?.cancel(); void voice.start(); }}><Mic size={17} />Start speaking</button>}
        <button className="checkin-send" aria-label="Send health check-in" disabled={pending || recording || !message.trim() || message.length > 2500}><ArrowUp size={18} /></button>
      </div>
    </form>
    <p className="checkin-status" role="status">{pending ? 'Preparing your updated plan…' : voice.state === 'listening' ? 'I’m listening. Stop when you’re ready.' : voice.state === 'transcribing' ? 'Writing down your words…' : voice.state === 'requesting' ? 'Opening your microphone…' : message ? 'Review your words, then send when you’re ready.' : 'Speak naturally. You can review your words before sending.'}</p>
    {voice.state === 'listening' && <div className="recording-meter"><span>{voice.seconds}s / 180s</span><meter min={0} max={1} value={voice.level} aria-label="Microphone sound level" /></div>}
    {voice.playback && <div className="audio-playback"><audio controls src={voice.playback} aria-label="Your check-in recording" /><button type="button" className="text-button" onClick={voice.discard}>Remove recording</button></div>}
    {message.length > 2500 && <p role="alert" className="error">Please shorten your check-in to 2,500 characters before sending.</p>}
    {(error || voice.error) && <p role="alert" className="error">{error || voice.error}</p>}
    {(pending || recording) && <button type="button" className="text-button checkin-cancel" onClick={close}>Cancel check-in</button>}
    <p className="checkin-privacy">Voice and text are processed to help build your health plan. This agent supports prevention planning and can direct you to human help.</p>
  </dialog>;
}
