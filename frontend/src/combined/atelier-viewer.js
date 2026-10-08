import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/loaders/GLTFLoader.js';
import { OrbitControls } from '../../../vendor/OrbitControls.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';

function disposeModel(model) {
  const textures = new Set(), materials = new Set(), geometries = new Set(), images = new Set();
  model.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) { textures.add(value); images.add(value.image); }
    }
  });
  textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose()); images.forEach(image => image?.close?.());
}

export async function createAtelierViewer(container, url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw Error('Model unavailable');
  const buffer = await response.arrayBuffer();
  signal.throwIfAborted();
  const model = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '')).scene;
  let render, disposed = false;
  const release = () => { if (disposed) return; disposed = true; render?.dispose(); disposeModel(model); };
  try {
    signal.throwIfAborted();
    const box = new THREE.Box3().setFromObject(model), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const group = new THREE.Group(); model.position.sub(center); group.add(model); group.scale.setScalar(2 / Math.max(size.x,size.y,size.z)); group.updateMatrixWorld(true);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true }); } catch { /* Same-model canvas fallback below. */ }
    if (renderer) render = webglView(container, group, renderer);
    else {
      const { createSoftwareOrgan } = await import('./atelier-software.js');
      signal.throwIfAborted();
      render = createSoftwareOrgan(container, group);
    }
    return { ...render, dispose: release };
  } catch (error) { release(); throw error; }
}

function webglView(container, group, renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32,1,.01,100);
  scene.add(group, new THREE.HemisphereLight(0xffffff,0xb4a2ae,2.2));
  const key = new THREE.DirectionalLight(0xfff6ee,2.2); key.position.set(2,3,4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdbe7ff,1); fill.position.set(-3,1,2); scene.add(fill);
  container.append(renderer.domElement);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enablePan = false; controls.enableDamping = false; controls.minDistance = 2.5; controls.maxDistance = 8;
  let disposed = false;
  const draw = () => { if (!disposed) renderer.render(scene,camera); };
  function reset() { group.rotation.set(0,0,0); camera.position.set(0,0,4.6); controls.target.set(0,0,0); controls.update(); draw(); }
  function zoom(delta) { camera.position.setLength(THREE.MathUtils.clamp(camera.position.length() * (1-delta),2.5,8)); controls.update(); draw(); }
  function resize() { const r=container.getBoundingClientRect(); if (!r.width || !r.height) return; camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); renderer.setSize(r.width,r.height); draw(); }
  function keyboard(event) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === '0') reset();
    else if (['+','=','-'].includes(event.key)) zoom(event.key === '-' ? -.1 : .1);
    else { group.rotation[['ArrowLeft','ArrowRight'].includes(event.key) ? 'y' : 'x'] += ['ArrowLeft','ArrowUp'].includes(event.key) ? -.12 : .12; draw(); }
  }
  const observer = new ResizeObserver(resize); observer.observe(container);
  controls.addEventListener('change',draw); container.addEventListener('keydown',keyboard); reset(); resize();
  return { renderer:'webgl', reset, zoom, dispose() { disposed=true; observer.disconnect(); controls.dispose(); renderer.dispose(); renderer.forceContextLoss(); container.removeEventListener('keydown',keyboard); renderer.domElement.remove(); } };
}
