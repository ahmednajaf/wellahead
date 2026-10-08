import { useEffect, useRef, useState } from 'react';
import { recordingWav } from '../../../server/public/audio-wav.js';
import { transcriptProblem } from '../../../server/public/transcript-quality.js';

export function useRecording(onText: (text: string) => void) {
  const [state, setState] = useState('idle'), [level, setLevel] = useState(0), [seconds, setSeconds] = useState(0), [playback, setPlayback] = useState(''), [error, setError] = useState('');
  const session = useRef(0), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), context = useRef<AudioContext | null>(null), timer = useRef<ReturnType<typeof setInterval> | null>(null), url = useRef(''), request = useRef<AbortController | null>(null);
  const handlers = useRef({ onText }); handlers.current = { onText };
  function release() { if (timer.current) clearInterval(timer.current); timer.current = null; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; void context.current?.close().catch(() => {}); context.current = null; }
  function cancel() { session.current++; request.current?.abort(); if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state === 'recording') recorder.current.stop(); } release(); setState('idle'); setLevel(0); }
  function discard() { if (url.current) URL.revokeObjectURL(url.current); url.current = ''; setPlayback(''); }
  useEffect(() => { const exit = () => { cancel(); discard(); }; window.addEventListener('pagehide', exit); return () => { window.removeEventListener('pagehide', exit); exit(); }; }, []);
  async function start() {
    if (state !== 'idle') return;
    const current = ++session.current; setError(''); setState('requesting'); setSeconds(0);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      if (current !== session.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
      const recording = new MediaRecorder(media, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined); recorder.current = recording;
      let analyser: AnalyserNode | null = null, samples: Float32Array<ArrayBuffer> | null = null, peak = 0;
      try { const audio = new AudioContext(); context.current = audio; await audio.resume(); analyser = audio.createAnalyser(); analyser.fftSize = 2048; audio.createMediaStreamSource(media).connect(analyser); samples = new Float32Array(analyser.fftSize); } catch { /* Recording still works without metering. */ }
      if (current !== session.current) return;
      const chunks: Blob[] = []; const started = performance.now();
      recording.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recording.onerror = () => { if (current === session.current) { cancel(); setError('The recording was interrupted. Please try again or type.'); } };
      recording.onstop = async () => {
        release(); if (current !== session.current) return; setLevel(0);
        const blob = new Blob(chunks, { type: recording.mimeType }); discard(); url.current = URL.createObjectURL(blob); setPlayback(url.current);
        if (performance.now() - started < 650 || (analyser && peak < .007)) { setState('idle'); setError('I didn’t hear enough clear speech. Check the playback or type your answers.'); return; }
        setState('transcribing'); request.current = new AbortController();
        try {
          const wav = await recordingWav(blob);
          if (current !== session.current) return;
          const response = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: wav, signal: AbortSignal.any([request.current.signal, AbortSignal.timeout(190000)]) });
          if (!response.ok) throw new Error();
          const result = await response.json(); if (current !== session.current) return;
          if (typeof result.text !== 'string' || result.text.length > 8000 || transcriptProblem(result.text)) throw new Error();
          handlers.current.onText(result.text);
        } catch { if (current === session.current) setError('Transcription did not finish. Your recording is here to review; try again or type.'); }
        finally { if (current === session.current) setState('idle'); }
      };
      recording.start(250); setState('listening');
      timer.current = setInterval(() => {
        const now = performance.now(), elapsed = Math.floor((now - started) / 1000); setSeconds(elapsed);
        if (analyser && samples) {
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, v) => sum + v*v, 0) / samples.length);
          peak = Math.max(peak, rms); setLevel(Math.min(1, rms*12));

        }
        if (elapsed >= 180 && recording.state === 'recording') recording.stop();
      }, 100);
    } catch { if (current === session.current) { cancel(); setError('Microphone access is unavailable. You can type instead.'); } }
  }
  return { state, level, seconds, playback, error, start, stop: () => { if (recorder.current?.state === 'recording') { setState('transcribing'); recorder.current.stop(); } }, cancel, discard };
}
