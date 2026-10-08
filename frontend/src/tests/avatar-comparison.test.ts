import { describe, expect, it, vi } from 'vitest';
import { createAvatarComparison } from '../combined/avatar-comparison.js';

function renderer() {
  let view = { yaw: 0, zoom: 1, targetY: 0 };
  return {
    getView: () => ({ ...view }),
    setView: vi.fn(next => { view = { ...next }; }),
    face: vi.fn(() => { view = { yaw: 0, zoom: 3.5, targetY: .78 }; }),
    reset: vi.fn(), zoom: vi.fn(), dispose: vi.fn(),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('whole person comparison lifecycle', () => {
  it('caches both models, transfers the live camera and delegates controls to the visible one', async () => {
    const host = document.createElement('div'), before = renderer(), after = renderer();
    const webgl = vi.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    const viewer = createAvatarComparison(host, { webgl, software: vi.fn() });
    await viewer.select('before');
    expect(host.dataset.variant).toBe('before'); expect(webgl).toHaveBeenCalledTimes(1);
    before.setView({ yaw: .6, zoom: 2, targetY: 0 });
    await viewer.select('after'); expect(after.getView()).toEqual(before.getView());
    viewer.face(); viewer.zoom(.1);
    expect(after.face).toHaveBeenCalledOnce(); expect(after.zoom).toHaveBeenCalledWith(.1);
    await viewer.select('before'); expect(before.getView()).toEqual(after.getView());
    expect(webgl).toHaveBeenCalledTimes(2); expect(host.querySelectorAll('div:not([hidden])')).toHaveLength(1);
    viewer.dispose(); viewer.dispose();
    expect(before.dispose).toHaveBeenCalledOnce(); expect(after.dispose).toHaveBeenCalledOnce(); expect(host.children).toHaveLength(0);
  });
  it('keeps the software fallback for both variants when WebGL is unavailable', async () => {
    const webgl = vi.fn().mockRejectedValue(Error('WebGL unavailable'));
    const software = vi.fn().mockImplementation(async () => renderer());
    const host = document.createElement('div'), viewer = createAvatarComparison(host, { webgl, software });
    await viewer.select('before'); await viewer.select('after');
    expect(webgl).toHaveBeenCalledOnce(); expect(software).toHaveBeenCalledTimes(2);
    expect(host.dataset.renderer).toBe('textured-canvas'); viewer.dispose();
  });
  it('keeps the current model visible on failure and allows retrying the other model', async () => {
    const webgl = vi.fn().mockResolvedValueOnce(renderer()).mockRejectedValueOnce(Error('Load failed')).mockResolvedValueOnce(renderer());
    const host = document.createElement('div'), viewer = createAvatarComparison(host, { webgl, software: vi.fn() });
    await viewer.select('before'); await expect(viewer.select('after')).rejects.toThrow('Load failed');
    expect(host.dataset.variant).toBe('before'); expect(host.querySelectorAll('div:not([hidden])')).toHaveLength(1);
    await viewer.select('after'); expect(host.dataset.variant).toBe('after'); viewer.dispose();
  });
  it('disposes a late model if the user leaves before loading finishes', async () => {
    const pending = deferred<ReturnType<typeof renderer>>(), model = renderer();
    const host = document.createElement('div'), viewer = createAvatarComparison(host, { webgl: vi.fn().mockReturnValue(pending.promise), software: vi.fn() });
    const loading = viewer.select('before'); viewer.dispose(); pending.resolve(model);
    expect(await loading).toBeNull(); expect(model.dispose).toHaveBeenCalledOnce();
    expect(host.children).toHaveLength(0); expect(host.dataset.variant).toBeUndefined();
  });
});
