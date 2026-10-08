import { test, expect } from 'vitest';
import { systems, domainRecommendations, relatedActions, linkedItemCount } from '../combined/domains';
import type { Plan, Action } from '../combined/api';

test('launcher follows the matrix’s fifteen domains and retains all twelve original PNGs', () => {
 expect(systems.map(s=>s.name)).toEqual(['Brain, mental health & sleep','Eyes','Oral','Lungs','Heart','Blood & nutrition','Liver','Hormones','Digestive','Kidneys & urinary','Sexual health','Muscles, bones & joints','Skin','Immune','Whole person']);
 expect(new Set(systems.map(s=>s.iconSrc)).size).toBe(15);
 expect(systems.map(s=>s.iconSrc)).toEqual(expect.arrayContaining(['heart','brain','lungs','metabolism','digestive','kidneys','musculoskeletal','reproductive','liver','eyes','dental','skin'].map(s=>`/icons/${s}.png`)));
});
test('display groups existing matrix results without altering status, authority or eligibility', () => {
 const check={id:'NHS_health_check', title:'NHS Health Check', status:'not_eligible', authority:'NHS'};
 const qrisk={id:'qrisk3',title:'Formal cardiovascular risk review',status:'confirm_suitability',authority:'NICE'};
 const plan={actions:[],recommendations:{primary:{id:'motivated',title:'Be.Motivated'},optional:[],nhs:[check],nice:[qrisk]}} as unknown as Plan;
 const before=JSON.stringify(plan);
 expect(domainRecommendations(plan,'whole').map(g=>g.title)).toEqual(['Your Bupa assessment option','NHS screening and checks']);
 expect(domainRecommendations(plan,'whole')[1].items[0]).toBe(check);
 expect(domainRecommendations(plan,'heart')[0].items[0]).toBe(qrisk);
 expect(linkedItemCount(plan,'heart')).toBe(1);expect(linkedItemCount(plan,'immune')).toBe(0);
 expect(JSON.stringify(plan)).toBe(before);
});
test('nutrition and general goals map into the new domains without inventing actions', () => {
 const actions=[{id:'food',systems:['gut']},{id:'goal',systems:[]}] as Action[];
 const plan={actions} as Plan;
 expect(relatedActions(plan,'blood')).toEqual([actions[0]]);
 expect(relatedActions(plan,'whole')).toEqual([actions[1]]);
 expect(relatedActions(plan,'immune')).toEqual([]);
});
