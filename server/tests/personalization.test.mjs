import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlan } from '../core.mjs';
import { familyCancerContext, retrieveEvidence } from '../evidence.mjs';
process.env.OPENAI_API_KEY ||= 'test-only-key';
const profile = family => ({ answers: ['31', '', family, '', '', 'Stay well'], records: [] });
const reply = value => Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const action=(id,anchor,idea='Make a note of what you know and leave unknown details blank.')=>({id,anchor,title:'Your family-history note',idea,reason:'Built around the history you shared.',backup:''});
const selection=(actions)=>async()=>reply({route:'prevention',answer:'Bring your questions to a GP conversation.',followUp:'What would you like your GP to help you understand?',actions});

test('age 31 and family cancer history always receives a relevant first step', async () => {
  const result = await makePlan(profile('Family history of cancer.'), {fetchImpl:selection([action('familyCancer','Family history of cancer.')])});
  assert.equal(result.actions[0].id, 'familyCancer');
  assert.equal(result.actions.length, 1);
  assert.match(result.actions[0].idea,/note/);
  assert.match(result.actions[0].step, /GP/);
  assert.match(result.actions[0].uncertainty, /does not tell us your risk/);
  assert.equal(result.actions[0].area, 'whole');
  assert.equal(result.actions[0].sources[0].url, 'https://digital.nhs.uk/ndrs/patients/family-history-of-cancer');
  assert.equal(result.actions.some(a => a.id === 'pressure'), false);
});
test('unknown, negated and own cancer histories do not invent family cancer', () => {
  for (const family of ['', 'Not sure.', 'No family history of cancer.', 'No cancer in my family.', 'I do not have a family history of cancer.', 'I am not sure if cancer runs in my family.']) {
    assert.equal(familyCancerContext(profile(family)), null, family);
    assert.equal(retrieveEvidence(profile(family)).some(a => a.id === 'familyCancer'), false);
  }
  const own = profile(''); own.answers[1] = 'I had cancer in 2020.';
  assert.equal(familyCancerContext(own), null);
});
test('uncertain diagnosis age does not erase confirmed cancer in a relative', () => {
  for (const family of ['My mother had breast cancer, age unknown.', 'My dad had bowel cancer but I do not know when.']) assert.ok(familyCancerContext(profile(family)), family);
});
test('reviewed record can supply family history; an explicit user correction wins', () => {
  const p = profile(''); p.records = [{text:'Mother had breast cancer aged 42.',source:'My note',title:'Record'}];
  assert.equal(familyCancerContext(p).source, 'a record you added');
  p.answers[2] = 'No family history of cancer.';
  assert.equal(familyCancerContext(p), null);
});
test('one recording retains family history and turns it into the first card', async () => {
  let calls = 0;
  const result = await makePlan({intake:'I am 31 years old and have a family history of cancer.'}, {fetchImpl:async () => {
    return ++calls === 1 ? reply({route:'prevention',age:'31',medical:'',family:'family history of cancer',lifestyle:'',checks:'',priority:''}) : selection([action('familyCancer','family history of cancer')])();
  }});
  assert.equal(result.actions[0].id, 'familyCancer');
  assert.equal(result.actions[0].context, 'family history of cancer');
  assert.equal(result.priority, '');
});
test('missing a known family history cannot silently become generic lifestyle advice', async () => {
 await assert.rejects(makePlan(profile('Family history of cancer'),{fetchImpl:selection([action('goal','Stay well')])}),/MISSING_PERSONAL_PRIORITY/);
});
test('activity source links match the stated age group', async () => {
 for(const [age,source] of [['31','activity'],['70','older']]) {
  const p=profile('');p.answers[0]=age;p.answers[3]='I enjoy walking';
  const result=await makePlan(p,{fetchImpl:selection([action('move','I enjoy walking','Try planning your next walk around somewhere you enjoy.')])});
  assert.deepEqual(result.actions[0].sources.map(s=>s.id),[source]);
 }
});
test('confirmed age overrides transcript extraction and invalid ages are rejected',async()=>{
 let calls=0;const result=await makePlan({intake:'I am fifty six. I enjoy walking.',age:31},{fetchImpl:async()=>++calls===1?reply({route:'prevention',age:'56',medical:'',family:'',lifestyle:'I enjoy walking',checks:'',priority:''}):selection([action('move','I enjoy walking')])()});
 assert.deepEqual(result.actions[0].sources.map(s=>s.id),['activity']);
 await assert.rejects(makePlan({intake:'hello',age:200}),/check your age/);
});

test('a paraphrase invented during extraction cannot be displayed as the user’s exact words',async()=>{
 let calls=0;await assert.rejects(makePlan({intake:'I am 31. I work at home and enjoy photos.'},{fetchImpl:async()=>++calls===1?reply({route:'prevention',age:'31',medical:'',family:'',lifestyle:'I am a professional photographer',checks:'',priority:''}):selection([action('move','I am a professional photographer')])()}),/UNSUPPORTED_PERSONAL_ANCHOR/);
});

test('the model schema only permits anchor excerpts actually present in the original intake', async()=>{
 let calls=0;const intake='I am 31. I work from home and love photography.';
 await makePlan({intake},{fetchImpl:async(url,request)=>{
  if(++calls===1)return reply({route:'prevention',age:'31',medical:'',family:'',lifestyle:'Home worker who likes photos',checks:'',priority:''});
  const body=JSON.parse(request.body);const allowed=body.text.format.schema.properties.actions.items.properties.anchor.enum;
  assert.ok(allowed.includes('I work from home and love photography.'));assert.ok(allowed.every(q=>intake.includes(q)));assert.ok(!allowed.includes('Home worker who likes photos'));
  return selection([action('move',allowed[1])])();
 }});
});
