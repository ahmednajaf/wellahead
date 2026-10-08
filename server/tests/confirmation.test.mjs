import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlan } from '../core.mjs';
process.env.OPENAI_API_KEY ||= 'test-only-key';
const response = value => Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
test('the UI submits original words to Rob’s single plan contract', async () => {
 const intake='I am 56. I take ramipril. I enjoy walking.';let calls=0;
 const result=await makePlan({intake,records:[]},{fetchImpl:async()=>response(++calls===1?
  {age:'56',medical:'I take ramipril.',family:'',lifestyle:'I enjoy walking.',checks:'',priority:'',facts:[{key:'medication',value:'ramipril',evidence:'I take ramipril.'}]}:
  {answer:'Make time for a familiar walk.',followUp:'',actions:[{id:'move',title:'A familiar walk',idea:'Choose a route you enjoy.',reason:'You enjoy walking.',anchor:'I enjoy walking.',backup:''}]})});
 assert.equal(calls,2);assert.equal(result.route,'prevention');assert.ok(result.recommendations);assert.equal(result.actions[0].id,'move');
 assert.deepEqual(result.profile.answers,['56','I take ramipril.','','I enjoy walking.','','']);
 assert.deepEqual(result.profile.facts,[{key:'medication',value:'ramipril',evidence:'I take ramipril.'}]);
 assert.deepEqual(result.profile.records,[]);
});
test('a submitted story interrupts before extraction for an explicit emergency',async()=>{
 const result=await makePlan({intake:'I have chest pain.',records:[]},{fetchImpl:()=>{throw Error('No model expected');}});
 assert.equal(result.route,'emergency');assert.equal(result.primary.href,'tel:999');
});
test('the retired custom review payload is not a second backend plan interface',async()=>{
 await assert.rejects(makePlan({review:{intake:'I am 56.',answers:['56','','','','',''],facts:[],records:[]}}),/six short answers/);
});

test('an anxiety-only story reaches Rob’s clinician handoff even with empty review fields', async () => {
 const intake='I am feeling super anxious';let calls=0;
 const result=await makePlan({intake},{fetchImpl:async()=>response(++calls===1?
  {age:'',medical:'',family:'',lifestyle:'',checks:'',priority:'',facts:[{key:'current_symptom',value:'anxiety',evidence:intake}]}:
  {answer:'You could note what you want to discuss.',followUp:'What would you like to focus on?',actions:[{id:'goal',title:'A note for your conversation',idea:'Write down what you want to discuss.',reason:'You mentioned how you are feeling.',anchor:intake,backup:''}]})});
 assert.equal(calls,1);assert.equal(result.route,'human');
 assert.equal(result.primary.href,'tel:111');
 assert.equal(result.recommendations.status,'clinician_review');
 assert.equal(result.actions,undefined);
});

test('ungrounded symptom facts cannot fill an empty review field', async () => {
 let calls=0;
 await assert.rejects(makePlan({intake:'Hello'},{fetchImpl:async()=>{calls++;return response({age:'',medical:'',family:'',lifestyle:'',checks:'',priority:'',facts:[{key:'current_symptom',value:'anxiety',evidence:'I am feeling super anxious'}]});}}),/Please answer at least one question/);
 assert.equal(calls,1);
});
