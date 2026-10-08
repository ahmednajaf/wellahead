export const atelierModels = Object.freeze({ heart:'heart', brain:'brain', lungs:'lungs', metabolic:'pancreas', gut:'intestine', kidneys:'kidneys', liver:'liver', eyes:'eyeball', skin:'skin' });

// Match the upstream viewer interface; load heavy rendering code only on demand.
export function createAtelier(container, status) {
  let viewer, disposed = false;
  const controller = new AbortController();
  return {
    async focus(id) {
      status.textContent = 'Loading reference anatomy…';
      try {
        if (!Object.values(atelierModels).includes(id)) throw Error('Unknown model');
        const { createAtelierViewer } = await import('./atelier-viewer.js');
        if (disposed) return;
        viewer = await createAtelierViewer(container, `/models/atelier/${id}.glb`, controller.signal);
        if (disposed) { viewer.dispose(); return; }
        container.dataset.model = id;
        container.dataset.source = 'atelier';
        container.dataset.renderer = viewer.renderer;
        status.textContent = viewer.renderer === 'textured-canvas' ? 'Reference anatomy · canvas view' : 'Reference anatomy';
      } catch {
        if (!disposed) status.textContent = 'This anatomy model could not load. Your health plan is still available.';
      }
    },
    reset() { viewer?.reset(); },
    zoom(delta) { viewer?.zoom(delta); },
    dispose() { disposed = true; controller.abort(); viewer?.dispose(); },
  };
}
