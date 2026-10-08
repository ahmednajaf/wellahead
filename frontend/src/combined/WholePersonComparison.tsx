import { useEffect, useRef, useState } from 'react';
import { createAvatarComparison } from './avatar-comparison.js';

type Variant = 'before' | 'after';
export default function WholePersonComparison() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createAvatarComparison> | null>(null);
  const [variant, setVariant] = useState<Variant>('before');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  async function select(next: Variant, viewer = controller.current) {
    if (!viewer) return;
    setLoading(true); setError('');
    try {
      const kind = await viewer.select(next);
      if (controller.current !== viewer || !kind) return;
      setVariant(next); setReady(true);
    } catch {
      if (controller.current === viewer) setError('This view could not load. Choose Before or After to try again.');
    } finally {
      if (controller.current === viewer) setLoading(false);
    }
  }
  useEffect(() => {
    if (!host.current) return;
    const viewer = createAvatarComparison(host.current);
    controller.current = viewer;
    void select('before', viewer);
    return () => { controller.current = null; viewer.dispose(); };
  }, []);

  return <section className="organ-viewer-slot live-anatomy whole-person-comparison" aria-label="Whole person before and after viewer">
    <div className="comparison-toolbar">
      <span className="viewer-kicker">YOUR JOURNEY</span>
      <div className="comparison-switch" role="group" aria-label="Compare before and after">
        {(['before', 'after'] as const).map(value => <button key={value} type="button" aria-pressed={variant === value} disabled={loading} onClick={() => void select(value)}>{value === 'before' ? 'Before' : 'After'}</button>)}
      </div>
    </div>
    <div ref={host} className="mesh-canvas" tabIndex={0} aria-label="Interactive model. Arrow keys rotate; plus and minus zoom; zero resets." aria-busy={loading} />
    <div className="comparison-status" role="status">{error || (loading ? 'Loading your comparison…' : `${variant === 'before' ? 'Before' : 'After'} view`)}</div>
    <div className="mesh-controls comparison-controls">
      <span>Drag to turn · scroll to zoom</span>
      <button disabled={!ready || loading} onClick={() => controller.current?.face()}>Face detail</button>
      <button disabled={!ready || loading} aria-label="Zoom out" onClick={() => controller.current?.zoom(-.1)}>−</button>
      <button disabled={!ready || loading} aria-label="Zoom in" onClick={() => controller.current?.zoom(.1)}>+</button>
      <button disabled={!ready || loading} onClick={() => controller.current?.reset()}>Reset</button>
    </div>
    <p className="comparison-note">Illustrative before and after, not a prediction of appearance or health outcomes.</p>
  </section>;
}
