import test from 'node:test';
import assert from 'node:assert/strict';
import { pcmWav } from '../public/audio-wav.js';
test('microphone WAV has 16 kHz mono PCM header and bounded signed samples', async () => {
  const blob = pcmWav(new Float32Array([-2, -1, 0, 1, 2]));
  const data = await blob.arrayBuffer(); const view = new DataView(data);
  assert.equal(blob.type, 'audio/wav');
  assert.equal(new TextDecoder().decode(data.slice(0, 4)), 'RIFF');
  assert.equal(view.getUint32(4, true), data.byteLength - 8);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(34, true), 16);
  assert.deepEqual(Array.from({length:5}, (_,i) => view.getInt16(44+i*2,true)), [-32768,-32768,0,32767,32767]);
});
