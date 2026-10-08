export const comparisonModels = Object.freeze({
  before: '/models/ahmed-before-after/before.glb',
  after: '/models/ahmed-before-after/after.glb',
});

const defaultLoaders = {
  webgl: async (host, url) => (await import('../../../server/public/avatar.js')).createAvatar(host, url),
  software: async (host, url) => (await import('../../../server/public/avatar-software.js')).createSoftwareAvatar(host, url),
};

// Reuse Rob's renderers. Load each variant once and transfer the current view.
export function createAvatarComparison(container, loaders = defaultLoaders) {
  const entries = new Map();
  let active = null, disposed = false, selection = 0;

  async function load(variant) {
    const host = document.createElement('div');
    host.className = 'avatar-renderer'; host.hidden = true;
    container.append(host);
    const entry = { host, viewer: null, kind: active?.kind || 'webgl', promise: null };
    entries.set(variant, entry);
    entry.promise = (async () => {
      try {
        if (entry.kind === 'textured-canvas') entry.viewer = await loaders.software(host, comparisonModels[variant]);
        else {
          try { entry.viewer = await loaders.webgl(host, comparisonModels[variant]); }
          catch (error) {
            // Pick the fallback on first load; keep one renderer type thereafter
            // so rotation, zoom and face framing transfer without approximation.
            if (active || disposed) throw error;
            entry.viewer = await loaders.software(host, comparisonModels[variant]);
            entry.kind = 'textured-canvas';
          }
        }
        if (disposed) { entry.viewer.dispose(); host.remove(); return null; }
        return entry;
      } catch (error) {
        entries.delete(variant); host.remove(); throw error;
      }
    })();
    return entry.promise;
  }

  return {
    async select(variant) {
      if (!Object.hasOwn(comparisonModels, variant)) throw Error('Unknown comparison view');
      if (disposed) return null;
      const request = ++selection;
      const entry = await (entries.get(variant)?.promise || load(variant));
      if (disposed || request !== selection || !entry) return null;
      const view = active?.viewer.getView();
      if (active) active.host.hidden = true;
      entry.host.hidden = false;
      entry.viewer.setView(view || entry.viewer.getView());
      active = entry;
      container.dataset.model = 'colleague';
      container.dataset.variant = variant;
      container.dataset.renderer = entry.kind;
      return entry.kind;
    },
    face() { active?.viewer.face(); },
    reset() { active?.viewer.reset(); },
    zoom(delta) { active?.viewer.zoom(delta); },
    dispose() {
      if (disposed) return;
      disposed = true; selection++;
      for (const entry of entries.values()) {
        if (entry.viewer) { entry.viewer.dispose(); entry.host.remove(); }
        // An in-flight renderer needs its parent until its own cleanup runs.
      }
      active = null;
    },
  };
}
