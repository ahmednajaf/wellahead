import { Droplet, ShieldPlus, PersonStanding } from 'lucide-react';
import { systems as originalSystems, type HealthSystem } from '../lib/systems';
import type { Plan } from './api';

// Presentation only: section 7 of Preventive_Health_Recommendation_Matrix_v1.docx.
// These domains do not create eligibility rules or imply that an empty area is healthy.
const original = (id: string, name: string): HealthSystem => ({ ...originalSystems.find(s => s.id === id)!, name });
export const systems: HealthSystem[] = [
  original('brain', 'Brain, mental health & sleep'),
  original('eyes', 'Eyes'),
  original('oral', 'Oral'),
  original('lungs', 'Lungs'),
  original('heart', 'Heart'),
  { id:'blood', name:'Blood & nutrition', matrixArea:'Blood and nutrition', Icon:Droplet, tone:'rose', iconSrc:'/icons/blood.png', recommendationKeys:[] },
  original('liver', 'Liver'),
  original('metabolic', 'Hormones'),
  original('gut', 'Digestive'),
  original('kidneys', 'Kidneys & urinary'),
  original('reproductive', 'Sexual health'),
  original('muscles', 'Muscles, bones & joints'),
  original('skin', 'Skin'),
  { id:'immune', name:'Immune', matrixArea:'Immune', Icon:ShieldPlus, tone:'teal', iconSrc:'/icons/immune.png', recommendationKeys:[] },
  { id:'whole', name:'Whole person', matrixArea:'Whole person', Icon:PersonStanding, tone:'violet', iconSrc:'/icons/whole.png', recommendationKeys:[] },
];

export function relatedActions(plan: Plan, id: string) {
  const key = id === 'metabolic' ? 'metabolism' : id;
  return plan.actions.filter(a => a.systems.includes(key) || (id === 'muscles' && (a.systems.includes('bones') || ['move', 'strength'].includes(a.id))) || (id === 'blood' && a.id === 'food') || (id === 'whole' && ['goal', 'familyCancer'].includes(a.id)));
}

// Route already-produced matrix rows to their display domain. Never inspect history
// or regenerate rules here. Unknown rule IDs remain visible in the full health plan.
const ruleDomains: Record<string, string> = {
  cervical:'reproductive', breast:'reproductive', bowel:'gut', AAA:'heart',
  diabetic_eye:'eyes', lung:'lungs', NHS_health_check:'whole',
  established_cvd:'heart', high_cvd:'heart', older_cvd:'heart', qrisk3:'heart',
  underestimation:'heart', lipids:'heart', diabetes_risk:'metabolic', familial_breast:'reproductive',
  coronary:'heart', breast_option:'reproductive', colon:'gut', dna:'whole', prostate:'reproductive',
};
export type MatrixItem = { id:string; title:string; status:string; explanation:string; trigger:string; authority:string; sourceUrl:string; clinicianReview?:boolean; availableWithSelectedProduct?:boolean };
export function domainRecommendations(plan: Plan, id: string) {
  const data = plan.recommendations;
  return [
    { title:'Your Bupa assessment option', items: id === 'whole' && data?.primary ? [data.primary] as MatrixItem[] : [] },
    { title:'Optional Bupa discussions', items: (data?.optional || []).filter((r: MatrixItem) => ruleDomains[r.id] === id) as MatrixItem[] },
    { title:'NHS screening and checks', items: (data?.nhs || []).filter((r: MatrixItem) => ruleDomains[r.id] === id) as MatrixItem[] },
    { title:'Risk reviews with a clinician', items: (data?.nice || []).filter((r: MatrixItem) => ruleDomains[r.id] === id) as MatrixItem[] },
  ].filter(group => group.items.length);
}
export function linkedItemCount(plan: Plan, id: string) {
  return relatedActions(plan, id).length + domainRecommendations(plan, id).reduce((sum, group) => sum + group.items.length, 0);
}
