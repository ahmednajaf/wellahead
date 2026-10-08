import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readAvatarGLB } from '../public/avatar-software.js';

for (const variant of ['before', 'after']) test(`${variant} avatar export retains geometry and embedded textures`, async () => {
  const bytes = await readFile(new URL(`../../frontend/public/models/ahmed-before-after/${variant}.glb`, import.meta.url));
  const model = readAvatarGLB(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.ok(model.parts.length >= 5);
  assert.ok(model.images.length >= 5);
  for (const part of model.parts) {
    assert.equal(part.indices.length % 3, 0);
    assert.equal(part.uv.length / 2, part.positions.length / 3);
    for (const value of part.positions) assert.ok(Number.isFinite(value) && Math.abs(value) <= 1.001);
    for (const index of part.indices) assert.ok(index < part.positions.length / 3);
    if (part.image != null) assert.ok(model.images[part.image].bytes.length > 100);
  }
  assert.throws(() => readAvatarGLB(new ArrayBuffer(32)), /Invalid avatar/);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.ok(gltf.images.every(image => Number.isInteger(image.bufferView) && !image.uri));
  assert.ok(gltf.nodes.every(node => !node.name?.includes('Studio floor') && node.camera === undefined));
  assert.equal(gltf.animations, undefined);
});
