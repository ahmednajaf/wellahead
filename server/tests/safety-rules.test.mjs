import test from 'node:test';
import assert from 'node:assert/strict';
import { hasExplicitEmergency } from '../public/safety-rules.js';
import { checkAnswer, makePlan } from '../core.mjs';
process.env.OPENAI_API_KEY ||= 'test-only';
const model = result => async () => Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });

const routine = [
  'My father had a heart attack.', 'My father has severe chest pain today.',
  'I had severe chest pain in 2019.', 'I used to have severe chest pain.',
  'I had severe chest pain yesterday and it resolved.',
  'I have no severe chest pain.', 'I do not have any severe chest pain.',
  'I am not having severe chest pain.', 'I have never had severe chest pain.',
  'I am worried that I might get severe chest pain.',
  'What if I have severe chest pain?', 'If I cannot breathe, what should I do?',
  'For example, I have severe chest pain.',
  'I get breathless after running and want to get fitter.',
  "I can't breathe through my nose.", "I can't breathe when I run.",
  'I have asthma and use an inhaler.', 'I have high blood pressure and take medication.',
  'I feel tired after work.', 'I want to lose weight.', 'I want to quit smoking.',
  'I am anxious about cancer in my family.', 'I am unsure when my last check was.',
  'I have mild chest pain now.', 'I had an overdose ten years ago.',
  'I read about suicide prevention.', 'I do not want to kill myself.',
  'My previous severe chest pain has gone.', 'No urgent chest pain.',
];
for (const value of routine) test(`no automatic 999: ${value}`, () => assert.equal(hasExplicitEmergency(value), false));

const urgent = [
  'I have chest pain.', "I'm having chest pain.",
  'I have urgent chest pain.', 'Urgent chest pain right now.',
  'I have severe chest pain right now.', 'I am having crushing chest pain.',
  'I have chest pain that does not go away.',
  'I have chest pain spreading to my left arm.',
  'I have chest pain and feel short of breath.',
  'I cannot breathe.', "I can't breathe.", 'I have severe difficulty breathing.',
  'I feel anxious and I cannot breathe.',
  'My face is drooping.', 'My speech is suddenly slurred.',
  'I have taken an overdose.', 'I want to kill myself.',
  'I have no history of problems but I have severe chest pain now.',
  'I had severe chest pain in 2019 but I have urgent chest pain now.',
  'I have no chest pain and I cannot breathe.',
];
for (const value of urgent) test(`explicit emergency: ${value}`, () => assert.equal(hasExplicitEmergency(value), true));

test('family history cannot be interrupted at the speech safety stage', async () => {
  const result = await checkAnswer('I am worried about my family history.', '', { fetchImpl: model({ route: 'emergency' }) });
  assert.equal(result.route, 'prevention'); assert.equal(result.primary, undefined);
});
const familyInput = "I'm relatively healthy, but there's some cancer in my family history.";
for (const route of ['human', 'emergency']) test(`grounded current anxiety uses the matrix handoff regardless of model ${route} flags`, async () => {
  const intake = 'I am 31. I feel anxious. I enjoy walking.';
  let calls = 0;
  const result = await makePlan({ intake }, { fetchImpl: async (url, request) => {
    const schema = JSON.parse(request.body).text.format.schema;
    assert.equal(schema.properties.route, undefined);
    if (++calls === 1) return model({ route, age: '31', medical: 'I feel anxious.', family: '', lifestyle: 'I enjoy walking.', checks: '', priority: '', facts: [{ key: 'current_symptom', value: 'anxiety', evidence: 'I feel anxious.' }] })();
    return model({ route, answer: 'Try making time for a walk you enjoy.', followUp: '', actions: [{ id: 'move', title: 'A familiar walking route', idea: 'Choose a walking route you enjoy.', reason: 'You enjoy walking.', anchor: 'I enjoy walking.', backup: '' }] })();
  } });
  assert.equal(calls, 1);
  assert.equal(result.route, 'human');
  assert.equal(result.actions, undefined);
  assert.equal(result.primary.href, 'tel:111');
  assert.equal(result.recommendations.status, 'clinician_review');
  assert.doesNotMatch(JSON.stringify(result), /tel:999/);
});
for (const text of [familyInput, 'I am 31. My father had cancer.', 'I am generally healthy. There is cancer in my family history.', 'My mum had breast cancer at 38.']) {
  test(`routine family history stays preventive: ${text}`, async () => {
    assert.deepEqual(await checkAnswer(text, '', { fetchImpl: () => { throw Error('No model may override this context'); } }), { route: 'prevention' });
  });
}
for (const route of ['human', 'emergency']) test(`model ${route} and invented symptom facts cannot interrupt family-history-only intake`, async () => {
  let calls = 0;
  const result = await makePlan({ intake: familyInput }, { fetchImpl: async (url, request) => {
    const schema = JSON.parse(request.body).text.format.schema;
    assert.equal(schema.properties.route, undefined); assert.ok(!schema.required.includes('route'));
    if (++calls === 1) return model({ route, age:'', medical:"I'm relatively healthy", family:'cancer in my family history', lifestyle:'', checks:'', priority:'', facts:[{key:'current_symptom',value:'cancer',evidence:'cancer in my family history'},{key:'active_management',value:'true',evidence:'cancer in my family history'},{key:'family_history',value:'cancer in family',evidence:'cancer in my family history'}] })();
    return model({route,answer:'Make a note of your family history.',followUp:'',actions:[{id:'familyCancer',title:'A family history note',idea:'Note what you know for a routine GP discussion.',reason:'You mentioned family history.',anchor:familyInput,backup:''}]})();
  } });
  assert.equal(calls,2); assert.equal(result.route,'prevention'); assert.equal(result.actions[0].id,'familyCancer');
  assert.doesNotMatch(JSON.stringify(result),/tel:999|tel:111|Call 999/);
});
test('explicit breathing emergency after family history still interrupts before any model call', async () => {
  const result=await makePlan({intake:'There is cancer in my family history. I cannot breathe.'},{fetchImpl:()=>{throw Error('No API expected');}});
  assert.equal(result.route,'emergency');assert.equal(result.primary.href,'tel:999');
});
