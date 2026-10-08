import test from 'node:test';
import assert from 'node:assert/strict';
import { quickRoute, checkAnswer, makePlan, validateProfile } from '../core.mjs';
import { retrieveEvidence } from '../evidence.mjs';

const profile = { answers: ['56', 'No diagnosed conditions.', 'My father had high blood pressure.', 'I work at a desk. I do not smoke.', 'Not sure.', 'More walks with my family.'], records: [] };
const response = result => async () => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }), { status: 200 });
process.env.OPENAI_API_KEY ||= 'test-only-key';

test('current emergency symptoms interrupt without an API call', async () => {
  for (const text of ['I have severe chest pain right now', 'I cannot breathe', 'I have no history of problems but I have crushing chest pain now', 'I want to kill myself']) {
    assert.equal(quickRoute(text), 'emergency', text);
    const result = await checkAnswer(text, '', { fetchImpl: () => { throw Error('Should not call API'); } });
    assert.equal(result.primary.href, 'tel:999');
    assert.match(result.note, /has not contacted/);
  }
});
test('negation and historical facts do not trigger emergency keywords', () => {
  for (const text of ['I do not have severe chest pain', 'I have no severe chest pain', 'My father had severe chest pain years ago', 'I had severe chest pain in 2019', 'For example, if someone has severe chest pain']) assert.equal(quickRoute(text), null, text);
});
test('medicine-change questions use Rob’s human handoff without an emergency redirect or model call', async () => {
 const text='Should I stop my blood pressure medicine?';assert.equal(quickRoute(text), 'human');
 const result=await makePlan({intake:text},{fetchImpl:()=>{throw Error('No model expected');}});assert.equal(result.route,'human');assert.equal(result.primary.href,'tel:111');
});
test('non-emergency input does not use a model safety gate', async () => {
  const result = await checkAnswer('I have a new rash', '', { fetchImpl: response({ route: 'human' }) });
  assert.equal(result.route, 'prevention'); assert.equal(result.primary, undefined);
});
test('safety classification never calls the model', async () => { assert.deepEqual(await checkAnswer('I feel anxious', '', { fetchImpl: () => { throw Error('No model expected'); } }), { route: 'prevention' }); });
test('missing data stays missing and oversized input is rejected', () => {
  assert.equal(validateProfile({ answers: ['', '', '', '', '', 'Stay well'] }).answers[0], '');
  assert.throws(() => validateProfile({ answers: ['x'] }));
  assert.throws(() => validateProfile({ answers: Array(6).fill('') }));
  assert.throws(() => validateProfile({ answers: ['x'.repeat(2501), '', '', '', '', ''] }));
});
test('smoking advice is excluded for a non-smoker and age-based check excluded if age unknown', () => {
  assert.equal(retrieveEvidence(profile).some(a => a.id === 'smoking'), false);
  assert.equal(retrieveEvidence({ answers: ['', '', '', 'I smoke ten cigarettes a day.', '', ''] }).some(a => a.id === 'smoking'), true);
  assert.equal(retrieveEvidence({ answers: ['61', '', '', 'I smoke ten cigarettes a day and want to stop.', '', 'Help to quit smoking.'] }).some(a => a.id === 'smoking'), true);
  assert.equal(retrieveEvidence({ answers: ['', '', '', '', '', ''] }).some(a => a.id === 'pressure'), false);
});
const creative = (id, anchor='I work at a desk.') => ({id,title:'A lunch-break walking loop',idea:'Try a walk when you close your laptop for lunch.',reason:'This fits your desk-based day.',anchor,backup:''});
test('creative ideas survive while clinical guidance and citations remain server owned', async () => {
  const result = await makePlan(profile, {fetchImpl:response({route:'prevention',answer:'Make your lunch break a chance to get outside.',followUp:'',actions:[creative('move')]})});
  assert.equal(result.actions[0].idea,'Try a walk when you close your laptop for lunch.');
  assert.match(result.intro,/lunch break/);assert.match(result.actions[0].step,/short walk/);
  assert.equal(result.actions[0].sources[0].publisher,'NHS');assert.ok(result.actions[0].uncertainty);
});
test('invented, duplicate and inappropriate actions fail closed', async () => {
  for(const ids of [['invented'],['move','move'],['smoking'],[]]) await assert.rejects(makePlan(profile,{fetchImpl:response({route:'prevention',answer:'',followUp:'',actions:ids.map(id=>creative(id))})}));
});
test('invented personal anchors and injected clinical instructions are rejected', async () => {
  for(const action of [{...creative('move'),anchor:'I own a dog'}, {...creative('move'),idea:'Reduce your medication.'}, {...creative('move'),idea:'Visit https://bad.example for advice'}]) await assert.rejects(makePlan(profile,{fetchImpl:response({route:'prevention',answer:'A plan for your day.',followUp:'',actions:[action]})}));
});
test('ungrounded model emergency cannot manufacture a 999 route', async () => {
  const result=await makePlan(profile,{fetchImpl:response({route:'emergency',answer:'Try a lunch break outdoors.',followUp:'',actions:[creative('move')]})});
  assert.equal(result.route,'prevention');assert.equal(result.primary,undefined);assert.equal(result.actions.length,1);
});
test('people under 19 receive a non-emergency scope notice without model use', async () => {
  const result = await makePlan({ answers: ['16', '', '', '', '', 'Fitness'] }, { fetchImpl: () => { throw Error('No API expected'); } });
  assert.equal(result.route, 'prevention'); assert.match(result.intro, /19/); assert.deepEqual(result.actions, []);
});

test('model-written emergency phone instructions are rejected, never routed', async () => {
  for (const answer of ['Call 999 now.', 'Call 111 about anxiety.']) {
    await assert.rejects(makePlan(profile, { fetchImpl: response({ answer, followUp: '', actions: [creative('move')] }) }), /INVALID_PERSONAL_ANSWER/);
  }
});
