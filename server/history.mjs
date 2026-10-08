// Small extraction contract: facts must quote the user's words; unknowns are omitted.
// The model extracts history, while recommendations.mjs owns all decision rules.
export const FACT_KEYS = [
  'sex_at_birth', 'has_cervix', 'country', 'condition', 'medication', 'operation',
  'current_symptom', 'active_management', 'family_history', 'smoking_status',
  'pack_years', 'alcohol', 'exercise', 'diet', 'sleep', 'goal', 'remote', 'gp_input',
  'comprehensive', 'advanced_fitness', 'genetic_interest', 'coronary_concern',
  'bowel_concern', 'prostate_testicular_concern', 'no_conditions', 'no_medications',
  'egfr', 'albuminuria', 'previous_cvd_risk', 'risk_underestimation',
  'higher_risk_ethnicity', 'pregnant', 'screening_cervical', 'screening_breast',
  'screening_bowel', 'screening_AAA', 'screening_diabetic_eye', 'screening_lung',
  'screening_NHS_health_check'
];
export const factsSchema = { type: 'array', maxItems: 35, items: {
  type: 'object', additionalProperties: false,
  properties: { key: { type: 'string', enum: FACT_KEYS }, value: { type: 'string', maxLength: 180 }, evidence: { type: 'string', maxLength: 300 } },
  required: ['key', 'value', 'evidence']
} };
export const FACT_PROMPT = `Also return facts, each with an exact evidence quote from the supplied intake or reviewed record. Omit unknown facts. Never infer sex, anatomy, ethnicity, diagnoses, symptoms or preferences. An affected relative is family_history, never the user's condition. Negated conditions are not positive condition facts. Stable conditions are not current_symptom or active_management. active_management means an explicitly unresolved/current management issue. Boolean preferences use true/false. sex_at_birth uses female/male only when explicitly stated. smoking_status uses current/former/never. Screening values use a stated ISO date YYYY-MM-DD, never, completed, due, overdue, up_to_date, or unknown; never invent dates. condition values use standard plain English. family_history values preserve relative, cancer/condition, age at diagnosis and maternal/paternal side when stated. advanced_fitness requires an explicit performance or advanced cardiovascular fitness goal, not ordinary walking. comprehensive requires an explicit comprehensive assessment preference. remote requires an explicit remote preference. no_conditions/no_medications require explicit denial. Do not include a fact whose evidence contradicts its value.`;

export const FACT_EXAMPLES = `Facts are required whenever relevant information is stated. Do not return an empty facts array for an informative intake. Allowed keys: ${FACT_KEYS.join(', ')}.
For "I want a remote assessment with GP input", include {"key":"remote","value":"true","evidence":"I want a remote assessment with GP input"} and {"key":"gp_input","value":"true","evidence":"I want a remote assessment with GP input"}.
For "My mum had breast cancer at 38", include {"key":"family_history","value":"Mother had breast cancer at 38","evidence":"My mum had breast cancer at 38"}.
For "I have no conditions and no medicines", include no_conditions=true and no_medications=true, each with that exact quote. Never turn a relative's illness into the user's condition.`;

const normalise = value => String(value).toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
export function groundedFacts(facts, texts) {
  const originals = texts.map(normalise);
  if (!Array.isArray(facts)) return [];
  return facts.slice(0, 35).filter(f => FACT_KEYS.includes(f?.key) && typeof f.value === 'string' && f.value.length <= 180 && typeof f.evidence === 'string' && f.evidence.trim().length >= 2 && originals.some(s => s.includes(normalise(f.evidence))));
}

export function buildHistory(profile, facts = [], originalIntake = '') {
  const texts = [originalIntake || profile.answers.join('. '), ...(profile.records || []).map(r => r.text)];
  const accepted = groundedFacts(facts, texts);
  const all = key => accepted.filter(f => f.key === key).map(f => f.value);
  const one = key => {
    const values = [...new Set(all(key))];
    return values.length === 1 ? values[0] : null; // Conflicting facts remain unknown.
  };
  const bool = key => one(key) === 'true' ? true : one(key) === 'false' ? false : null;
  const number = key => one(key) != null && Number.isFinite(Number(one(key))) ? Number(one(key)) : null;
  const age = Number(profile.answers[0].match(/\b\d{1,3}\b/)?.[0]);
  return {
    demographics: { age: age >= 1 && age <= 120 ? age : null, sex_at_birth: one('sex_at_birth'), has_cervix: bool('has_cervix'), country: one('country') || 'England' },
    general_health: profile.answers[1] || null,
    conditions: all('condition'), medications: all('medication'), operations: all('operation'), symptoms: all('current_symptom'),
    family_history: all('family_history'),
    lifestyle: Object.fromEntries(['smoking_status', 'pack_years', 'alcohol', 'exercise', 'diet', 'sleep'].map(k => [k, k === 'pack_years' ? number(k) : one(k)])),
    screening_history: Object.fromEntries(['cervical', 'breast', 'bowel', 'AAA', 'diabetic_eye', 'lung', 'NHS_health_check'].map(k => [k, one(`screening_${k}`)])),
    goals: all('goal'), active_management: bool('active_management') === true,
    preferences: Object.fromEntries(['remote', 'gp_input', 'comprehensive', 'advanced_fitness', 'genetic_interest', 'coronary_concern', 'bowel_concern', 'prostate_testicular_concern'].map(k => [k, bool(k)])),
    no_conditions: bool('no_conditions') === true, no_medications: bool('no_medications') === true,
    egfr: number('egfr'), albuminuria: bool('albuminuria'), previous_cvd_risk: number('previous_cvd_risk'),
    risk_underestimation: all('risk_underestimation'), higher_risk_ethnicity: bool('higher_risk_ethnicity'), pregnant: bool('pregnant'),
    facts: accepted, uncertainties: FACT_KEYS.filter(key => new Set(all(key)).size > 1).map(key => `Conflicting ${key.replaceAll('_', ' ')} details; please confirm.`)
  };
}
