import test from 'node:test';
import assert from 'node:assert/strict';
import { medgemmaJSON } from '../providers.mjs';
import { transcribeAudio } from '../transcription.mjs';
const schema = { type: 'object', additionalProperties: false, required: ['route'], properties: { route: { type: 'string', enum: ['prevention', 'human', 'emergency'] } } };
test('MedGemma sends chat with constrained JSON and validates the returned route', async () => {
  const result = await medgemmaJSON('Safety instructions', { answer: 'walking' }, schema, {
    tokenProvider: async () => 'test-token', fetchImpl: async (url, req) => {
      assert.match(url, /europe-west4.*:predict$/);
      const instance = JSON.parse(req.body).instances[0];
      assert.equal(instance['@requestFormat'], 'chatCompletions');
      assert.deepEqual(instance.response_format.json_schema.schema, schema);
      assert.match(instance.messages[0].content[0].text, /^Safety instructions/);
      return Response.json({ predictions: { choices: [{ finish_reason: 'stop', message: { content: '{"route":"prevention"}' } }] } });
    }
  });
  assert.equal(result.route, 'prevention');
});
test('MedGemma rejects nested errors, truncated output and invalid schema values', async () => {
  for (const data of [
    { predictions: { error: { message: 'failed' } } },
    { predictions: { choices: [{ finish_reason: 'length', message: { content: '{}' } }] } },
    { predictions: { choices: [{ finish_reason: 'stop', message: { content: '{"route":"unsafe"}' } }] } }
  ]) await assert.rejects(medgemmaJSON('', {}, schema, { tokenProvider: async () => 'test', fetchImpl: async () => Response.json(data) }));
});
test('MedASR sends top-level base64 and strips only the trailing end token', async () => {
  const audio = Buffer.from('test audio');
  const result = await transcribeAudio(audio, 'audio/webm', { provider: 'vertex', tokenProvider: async () => 'test', fetchImpl: async (url, req) => {
    assert.match(url, /europe-west1.*:predict$/);
    assert.deepEqual(JSON.parse(req.body), { file: audio.toString('base64'), model: 'medasr', language: 'en', temperature: 0 });
    return Response.json({ text: 'I like walking.</s>' });
  } });
  assert.equal(result, 'I like walking.');
});
