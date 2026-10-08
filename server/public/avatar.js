import * as THREE from 'three';
import { GLTFLoader } from '/anatomy/vendor/loaders/GLTFLoader.js';
import { OrbitControls } from '/anatomy/vendor/OrbitControls.js';

// Draw only on interaction/resize, not a perpetual animation loop.
export async function createAvatar(container, modelUrl = '/assets/anatomy/colleague.glb?v=textured-1') {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .01, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb4a2ae, 2.2));
  const light = new THREE.DirectionalLight(0xfff6ee, 2.2); light.position.set(2, 3, 4); scene.add(light);
  const fill = new THREE.DirectionalLight(0xdbe7ff, 1); fill.position.set(-3, 1, 2); scene.add(fill);
  let model;
  try { model = (await new GLTFLoader().loadAsync(modelUrl)).scene; }
  catch (e) { renderer.dispose(); throw e; }
  let texturedHead = false;
  model.traverse(o => { if (o.isMesh && /AvatarHead/.test(o.name)) texturedHead = Boolean(o.material?.map?.image); });
  if (!texturedHead) { renderer.dispose(); throw new Error('Personalised face texture missing'); }
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const scale = 2 / Math.max(size.x, size.y, size.z);
  model.position.sub(center); const group = new THREE.Group(); group.add(model); group.scale.setScalar(scale); scene.add(group);
  container.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.minDistance = 2; controls.maxDistance = 7; controls.enableDamping = false;
  const draw = () => renderer.render(scene, camera);
  function reset() { controls.minDistance=2; camera.position.set(0, 0, 4.4); controls.target.set(0, 0, 0); controls.update(); draw(); }
  function resize() { const r = container.getBoundingClientRect(); if (!r.width || !r.height) return; camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); renderer.setSize(r.width, r.height); draw(); }
  const observer = new ResizeObserver(resize); observer.observe(container);
  controls.addEventListener('change', draw);
  function zoom(delta) { camera.position.multiplyScalar(Math.max(.6, Math.min(1.4, 1 - delta))); camera.position.setLength(THREE.MathUtils.clamp(camera.position.length(), 2, 7)); controls.update(); draw(); }
  function keyboard(e) {
    if (container.hidden) return;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key)) e.preventDefault(); else return;
    if (e.key === '0') reset(); else if (['+','=','-'].includes(e.key)) zoom(e.key === '-' ? -.1 : .1);
    else { group.rotation[e.key.includes('Left') || e.key.includes('Right') ? 'y' : 'x'] += ['ArrowLeft','ArrowUp'].includes(e.key) ? -.12 : .12; draw(); }
  }
  container.parentElement.addEventListener('keydown', keyboard); reset(); resize();
  return {
    getView() { return { camera:camera.position.toArray(), target:controls.target.toArray(), rotation:group.rotation.toArray(), minDistance:controls.minDistance }; },
    setView(view) { camera.position.fromArray(view.camera); controls.target.fromArray(view.target); group.rotation.fromArray(view.rotation); controls.minDistance=view.minDistance; controls.update(); resize(); },
    face() { group.rotation.set(0,0,0); controls.target.set(0,.78,0); camera.position.set(0,.78,1.1); controls.minDistance=.6; controls.update(); draw(); }, reset() { group.rotation.set(0,0,0); reset(); }, zoom, dispose() { observer.disconnect(); controls.dispose(); renderer.dispose(); container.parentElement.removeEventListener('keydown', keyboard); model.traverse(o => { o.geometry?.dispose(); for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); } }); renderer.domElement.remove(); } };
}
