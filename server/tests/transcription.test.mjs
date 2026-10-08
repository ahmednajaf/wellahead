import test from 'node:test';
import assert from 'node:assert/strict';
import { transcriptProblem } from '../public/transcript-quality.js';
import { transcribeAudio } from '../transcription.mjs';
import { makePlan } from '../core.mjs';
process.env.OPENAI_API_KEY ||= 'test-only-key';

test('reported Chinese transcript is rejected, not translated or silently accepted', async () => {
  assert.equal(transcriptProblem('三十一年歲。'), 'unexpected_language');
  await assert.rejects(transcribeAudio(new Uint8Array(200), 'audio/mp4', {
    fetchImpl: async () => Response.json({ text: '三十一年歲。' })
  }), e => e.status === 422 && e.code === 'unexpected_language');
});
test('English, digits and accented names are accepted; silence is not', () => {
  for (const s of ["I'm 31 years old.", 'I am thirty-one years old.', '31', 'My name is José and I take no medicines.']) assert.equal(transcriptProblem(s), null);
  assert.equal(transcriptProblem('  '), 'empty');
});
test('transcription requests the cheap model, explicit English and a neutral context prompt', async () => {
  const result = await transcribeAudio(new Uint8Array(200), 'audio/mp4', { fetchImpl: async (url, req) => {
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
    assert.equal(req.body.get('model'), 'gpt-4o-mini-transcribe');
    assert.equal(req.body.get('language'), 'en');
    assert.equal(req.body.get('temperature'), '0');
    assert.match(req.body.get('prompt'), /Keep the transcript in English/);
    assert.doesNotMatch(req.body.get('prompt'), /31|thirty|56|fifty/);
    assert.equal(req.body.get('file').type, 'audio/mp4');
    return Response.json({ text: "I'm 31 years old." });
  } });
  assert.equal(result, "I'm 31 years old.");
});
test('an unexpected-language typed intake cannot reach the planner', async () => {
  await assert.rejects(makePlan({ intake: '三十一年歲。' }, { fetchImpl: () => { throw Error('must not call'); } }), e => e.code === 'unexpected_language');
});
test('one narrative becomes six fields; unmentioned fields remain unknown', async () => {
  let calls = 0;
  const result = await makePlan({ intake: 'I am thirty-one years old. I want more time outdoors.' }, { fetchImpl: async (url, req) => {
    calls++;
    const body = JSON.parse(req.body);
    if (calls === 1) assert.match(body.instructions, /ONE recording/);
    else {
      const profile = JSON.parse(body.input).profile;
      assert.deepEqual(profile.answers, ['31', '', '', '', '', 'I want more time outdoors.']);
    }
    const output = calls === 1 ? { route: 'prevention', age: '31', medical: '', family: '', lifestyle: '', checks: '', priority: 'I want more time outdoors.' } : { route:'prevention', answer:'Make more room for the outdoors.', followUp:'', actions:[{id:'move', title:'An outdoor lunch break', idea:'Try stepping outside at a time that fits your day.',reason:'You want more time outdoors.',anchor:'I want more time outdoors.',backup:''}] };
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  } });
  assert.equal(calls, 2); assert.equal(result.route, 'prevention'); assert.equal(result.priority, 'I want more time outdoors.');
});
test('an emergency anywhere in the combined recording interrupts before extraction', async () => {
  const result = await makePlan({ intake: 'I am 31. I like walking. I have severe chest pain right now.' }, { fetchImpl: () => { throw Error('must not call'); } });
  assert.equal(result.route, 'emergency');
});
