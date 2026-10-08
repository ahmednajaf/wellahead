import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistory, groundedFacts } from '../history.mjs';
import { recommend, selectBupa, screeningStatus } from '../recommendations.mjs';
import { makePlan } from '../core.mjs';
const today = new Date('2026-09-18T00:00:00Z');
function history(age = 50, updates = {}) {
  const h = buildHistory({ answers: [String(age ?? ''), '', '', '', '', ''], records: [] });
  return { ...h, ...updates, demographics: { ...h.demographics, ...updates.demographics }, preferences: { ...h.preferences, ...updates.preferences }, screening_history: { ...h.screening_history, ...updates.screening_history }, lifestyle: { ...h.lifestyle, ...updates.lifestyle } };
}
const result = h => recommend(h, { today });
const find = (h, section, id) => result(h)[section].find(r => r.id === id);

test('Bupa selector precedence covers all six products and does not upsell a walking goal', () => {
  for (const [h, id] of [
    [history(31), 'motivated'], [history(65), 'mature'],
    [history(70, { preferences: { remote: true } }), 'home'],
    [history(70, { preferences: { remote: true, gp_input: true } }), 'homePlus'],
    [history(31, { preferences: { comprehensive: true, advanced_fitness: true } }), 'ahead'],
    [history(31, { preferences: { comprehensive: true } }), 'reassured'],
    [history(31, { family_history: ['Mother had bowel cancer at 48'] }), 'reassured'],
    [history(31, { goals: ['walk outdoors'] }), 'motivated']
  ]) assert.equal(selectBupa(h).id, id);
});
test('missing age/anatomy and other jurisdictions never invent eligibility', () => {
  assert.deepEqual(result(history(null)).nhs, []);
  const h = history(60);
  for (const id of ['breast', 'cervical', 'AAA']) assert.equal(find(h, 'nhs', id), undefined);
  const other = result(history(60, { demographics: { country: 'Scotland' } }));
  assert.equal(other.status, 'check_jurisdiction'); assert.equal(other.primary, null);
});
test('current symptoms and active management pause preventive test selection; stable history does not', () => {
  for (const change of [{ symptoms: ['new rash'] }, { active_management: true }]) {
    const r = result(history(50, change));
    assert.equal(r.status, 'clinician_review'); assert.equal(r.primary, null); assert.deepEqual(r.optional, []);
  }
  assert.ok(result(history(50, { conditions: ['hypertension'] })).primary);
});
test('screening dates distinguish unknown, due, overdue and current without inventing dates', () => {
  for (const [date, expected] of [[null,'check_history'],['never','due'],['2021-09-18','due'],['2021-09-17','overdue'],['2025-01-01','up_to_date'],['2028-01-01','check_history'],['2025-02-31','check_history']]) assert.equal(screeningStatus(date,5,today),expected);
});
test('NHS age boundaries, anatomy, and request pathways', () => {
  for (const age of [24,25,64,65]) assert.equal(Boolean(find(history(age,{demographics:{has_cervix:true}}),'nhs','cervical')),age>=25&&age<=64);
  for (const age of [49,50,70,71]) {
    const r=find(history(age,{demographics:{sex_at_birth:'female'}}),'nhs','breast');
    assert.equal(Boolean(r),age>=50); if(age===71)assert.equal(r.status,'self_referral');
  }
  assert.equal(find(history(49),'nhs','bowel'),undefined);
  assert.equal(find(history(74),'nhs','bowel').status,'check_history');
  assert.equal(find(history(75),'nhs','bowel').status,'self_request');
  assert.equal(find(history(65,{demographics:{sex_at_birth:'male'},screening_history:{AAA:'never'}}),'nhs','AAA').status,'due');
  assert.equal(find(history(66,{demographics:{sex_at_birth:'male'},screening_history:{AAA:'never'}}),'nhs','AAA').status,'self_referral');
  assert.equal(find(history(66,{demographics:{sex_at_birth:'male'},screening_history:{AAA:'2099-01-01'}}),'nhs','AAA').status,'check_history');
});
test('NHS Health Check excludes each stated disease, statins and high prior score', () => {
  for(const condition of ['heart disease','chronic kidney disease','diabetes','hypertension','atrial fibrillation','TIA','familial hypercholesterolaemia','heart failure','peripheral arterial disease','stroke']) assert.equal(find(history(50,{conditions:[condition]}),'nhs','NHS_health_check').status,'not_eligible',condition);
  for(const medications of [['atorvastatin'],['statin']]) assert.equal(find(history(50,{medications}),'nhs','NHS_health_check').status,'not_eligible');
  assert.equal(find(history(50,{previous_cvd_risk:20}),'nhs','NHS_health_check').status,'not_eligible');
  assert.equal(find(history(50),'nhs','NHS_health_check').status,'check_eligibility');
  assert.equal(find(history(50,{no_conditions:true,no_medications:true,screening_history:{NHS_health_check:'never'}}),'nhs','NHS_health_check').status,'due');
});
test('NICE high-risk and established disease rules override QRISK3 age eligibility', () => {
  for(const changes of [{conditions:['type 1 diabetes']},{egfr:59},{albuminuria:true},{conditions:['familial hypercholesterolaemia']},{conditions:['stroke']}]) assert.equal(find(history(50,changes),'nice','qrisk3'),undefined);
  assert.ok(find(history(50,{conditions:['type 2 diabetes']}),'nice','qrisk3'));
  assert.ok(find(history(84),'nice','qrisk3'));
  assert.equal(find(history(85),'nice','qrisk3'),undefined);
  assert.ok(find(history(85),'nice','older_cvd'));
});
test('diabetes and lung rules respect diagnoses, pregnancy and ever smoking', () => {
  assert.ok(find(history(40),'nice','diabetes_risk'));
  assert.equal(find(history(39),'nice','diabetes_risk'),undefined);
  assert.ok(find(history(30,{higher_risk_ethnicity:true}),'nice','diabetes_risk'));
  assert.equal(find(history(50,{pregnant:true}),'nice','diabetes_risk'),undefined);
  assert.equal(find(history(50,{conditions:['type 2 diabetes']}),'nice','diabetes_risk'),undefined);
  assert.ok(find(history(50,{conditions:['type 2 diabetes']}),'nhs','diabetic_eye'));
  assert.ok(find(history(55,{lifestyle:{smoking_status:'former'}}),'nhs','lung'));
  assert.equal(find(history(75,{lifestyle:{smoking_status:'current'}}),'nhs','lung'),undefined);
});
test('family cancer triggers clinical review, never an unconditional mammogram or colon test', () => {
  const h=history(31,{family_history:['Mother had breast cancer at 38','Father had bowel cancer at 48']});
  assert.equal(find(h,'nice','familial_breast').clinicianReview,true);
  for(const row of result(h).optional) { assert.equal(row.status,'conditional'); assert.equal(row.clinicianReview,true); }
});
test('DNA is opt-in and optional availability does not upgrade the chosen product', () => {
  assert.equal(result(history(31)).optional.length,0);
  const r=result(history(31,{preferences:{genetic_interest:true}}));
  assert.equal(r.primary.id,'motivated'); assert.equal(r.optional[0].id,'dna');
  assert.equal(r.optional[0].availableWithSelectedProduct,false);
});
test('every recommendation includes explanation and rule/source provenance', () => {
  const r=result(history(60,{family_history:['Mother had breast cancer at 38'],lifestyle:{smoking_status:'former'}}));
  for(const item of [r.primary,...r.optional,...r.nhs,...r.nice]) {
    for(const key of ['id','title','trigger','explanation','authority','sourceUrl','ruleVersion','jurisdiction','lastVerifiedAt']) assert.ok(item[key],key);
    assert.equal(typeof item.clinicianReview,'boolean');
  }
});
test('extraction requires exact source quotes; contradictory preferences stay unknown', () => {
  const facts=[{key:'remote',value:'true',evidence:'I want video.'},{key:'remote',value:'false',evidence:'I want in person.'},{key:'condition',value:'diabetes',evidence:'fabricated quotation'}];
  assert.equal(groundedFacts(facts,['I want video. I want in person.']).length,2);
  const h=buildHistory({answers:['31','','','','',''],records:[]},facts,'I want video. I want in person.');
  assert.equal(h.preferences.remote,null); assert.deepEqual(h.conditions,[]); assert.ok(h.uncertainties.length);
});

test('intake facts reach deterministic recommendations independently of lifestyle writing', async () => {
  process.env.OPENAI_API_KEY ||= 'test-only';
  const intake = 'I am 68. I want a remote assessment with GP input. I enjoy walking.';
  let calls = 0;
  const plan = await makePlan({ intake }, { fetchImpl: async () => {
    const result = ++calls === 1 ? {
      route: 'prevention', age: '68', medical: '', family: '', lifestyle: 'I enjoy walking.', checks: '', priority: 'I want a remote assessment with GP input.',
      facts: ['remote', 'gp_input'].map(key => ({ key, value: 'true', evidence: 'I want a remote assessment with GP input.' }))
    } : { route: 'prevention', answer: 'Try a short walk at a time that suits you.', followUp: '', actions: [{ id: 'move', title: 'Your walking break', idea: 'Try a short walk when it suits your day.', reason: 'You enjoy walking.', anchor: 'I enjoy walking.', backup: '' }] };
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  } });
  assert.equal(plan.recommendations.primary.id, 'homePlus');
  assert.equal(plan.actions[0].id, 'move');
});
