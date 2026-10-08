// Preventive_Health_Recommendation_Matrix_v1.docx, England, version 1.0.
// Pure functions: no model calls, network, prices, diagnoses or calculated risk scores.
export const RULE_VERSION = '1.0';
const CHECKED = '2026-09-18';
const URLS = {
  bupa: 'https://www.bupa.co.uk/health/health-assessments',
  optional: 'https://www.bupa.co.uk/health/health-assessments/tests',
  nhs: 'https://www.nhs.uk/tests-and-treatments/nhs-screening/',
  healthCheck: 'https://www.nhs.uk/tests-and-treatments/nhs-health-check/',
  cvd: 'https://www.nice.org.uk/guidance/ng238/chapter/recommendations',
  diabetes: 'https://www.nice.org.uk/guidance/ph38/chapter/recommendations',
  breast: 'https://www.nice.org.uk/guidance/cg164/chapter/recommendations'
};
export const BUPA_CATALOGUE = {
  motivated: 'Be.Motivated', reassured: 'Be.Reassured', ahead: 'Be.Ahead',
  mature: 'Mature Health', home: 'Be.Healthy at Home', homePlus: 'Be.Healthy at Home Plus'
};
const ADD_ON_PRODUCTS = new Set(['reassured', 'ahead', 'mature']);
function recommendation(id, title, trigger, explanation, source, review = false, status = 'consider') {
  return { id, title, trigger, explanation, status, clinicianReview: review,
    authority: ['bupa', 'optional'].includes(source) ? 'Bupa' : ['nhs', 'healthCheck'].includes(source) ? 'NHS' : 'NICE',
    sourceUrl: URLS[source], ruleVersion: RULE_VERSION, jurisdiction: 'England',
    sourceUpdatedAt: null, lastVerifiedAt: CHECKED };
}
const conditionText = h => h.conditions.join(' ').toLowerCase();
const has = (h, pattern) => pattern.test(conditionText(h));
const CVD = /\b(coronary|heart disease|heart attack|angina|stroke|transient ischaemic|tia|peripheral arterial)\b/;
const DIABETES = /\bdiabetes\b/;
const EXCLUSIONS = /\b(heart disease|coronary|heart attack|angina|kidney disease|ckd|diabetes|hypertension|high blood pressure|atrial fibrillation|transient ischaemic|tia|familial hypercholesterol\w*|heart failure|peripheral arterial|stroke)\b/;

export function selectBupa(h) {
  const p = h.preferences;
  const complexity = h.conditions.length > 0 || h.medications.length > 0 || h.family_history.length > 0;
  let id = 'motivated', why = 'A basic preventive and lifestyle assessment is the default starting point.';
  if (h.demographics.age >= 65 && p.remote !== true) { id = 'mature'; why = 'You are 65 or over and have not requested a remote assessment.'; }
  else if (p.remote === true) { id = p.gp_input === true ? 'homePlus' : 'home'; why = p.gp_input === true ? 'You prefer remote care with GP input.' : 'You prefer remote care without a stated requirement for GP input.'; }
  else if (p.comprehensive === true && p.advanced_fitness === true) { id = 'ahead'; why = 'You asked for a comprehensive assessment and have an advanced fitness goal.'; }
  else if (p.comprehensive === true || p.gp_input === true || complexity) { id = 'reassured'; why = 'You want GP-led or comprehensive prevention, or shared relevant medical or family history.'; }
  return recommendation(id, BUPA_CATALOGUE[id], why, 'An option to discuss with Bupa, subject to suitability and availability. This does not replace care for an existing condition.', 'bupa', complexity || h.demographics.age == null, 'suggested');
}

export function screeningStatus(value, years, today) {
  if (['never', 'due', 'overdue', 'up_to_date', 'completed'].includes(value)) return value === 'never' ? 'due' : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'check_history';
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value || date > today) return 'check_history';
  const due = new Date(date); due.setUTCFullYear(due.getUTCFullYear() + years);
  return due < today ? 'overdue' : due.toISOString().slice(0, 10) === today.toISOString().slice(0, 10) ? 'due' : 'up_to_date';
}

export function nhsRecommendations(h, today) {
  const { age, sex_at_birth: sex, has_cervix: cervix } = h.demographics;
  if (age == null) return [];
  const rows = [], history = h.screening_history;
  const add = (id, title, trigger, years) => rows.push(recommendation(id, title, trigger,
    'Check your last invitation or result with your GP or screening service. Follow any personalised recall advice.', 'nhs', false, screeningStatus(history[id], years, today)));
  if (age >= 25 && age <= 64 && cervix === true) add('cervical', 'Cervical screening', 'Age 25–64 and you confirmed you have a cervix.', 5);
  if (age >= 50 && age < 71 && sex === 'female') add('breast', 'Breast screening', 'Age 50–70 and female sex at birth was explicitly supplied; confirm programme registration.', 3);
  if (age >= 71 && sex === 'female') rows.push(recommendation('breast', 'Breast screening self-referral', 'Age over 70.', 'Ask the screening service about self-referral.', 'nhs', false, 'self_referral'));
  if (age >= 50 && age <= 74) add('bowel', 'Bowel cancer screening', 'Age 50–74.', 2);
  if (age >= 75) rows.push(recommendation('bowel', 'Bowel screening kit', 'Age 75 or over.', 'You can request a kit every two years; check your last test first.', 'nhs', false, 'self_request'));
  if (age >= 65 && sex === 'male') rows.push(recommendation('AAA', 'Abdominal aortic aneurysm screening', 'Male and age 65 or over.', 'A one-off programme. Confirm whether you have already been screened.', 'nhs', false,
    history.AAA === 'completed' || (screeningStatus(history.AAA, 200, today) === 'up_to_date') ? 'completed' : history.AAA === 'never' ? age === 65 ? 'due' : 'self_referral' : 'check_history'));
  if (has(h, DIABETES)) rows.push(recommendation('diabetic_eye', 'Diabetic eye screening', 'You reported diabetes.', 'Check that you are participating and follow your programme recall interval.', 'nhs', false, 'check_participation'));
  if (age >= 55 && age <= 74 && ['current', 'former'].includes(h.lifestyle.smoking_status)) rows.push(recommendation('lung', 'Lung screening invitation', 'Age 55–74 and a current or former smoker.', 'Ask about local eligibility and invitation status; this is not an automatic scan recommendation.', 'nhs', false, 'check_eligibility'));
  if (age >= 40 && age <= 74) {
    const excluded = has(h, EXCLUSIONS) || /statin|atorvastatin|simvastatin|rosuvastatin|pravastatin/i.test(h.medications.join(' ')) || h.previous_cvd_risk >= 20;
    const confirmed = h.no_conditions && h.no_medications && !excluded;
    rows.push(recommendation('NHS_health_check', 'NHS Health Check', excluded ? 'A stated condition, statin or previous risk result excludes the routine programme.' : 'Age 40–74; eligibility also depends on existing conditions and medicines.',
      excluded ? 'Use your established-condition follow-up with your care team instead.' : 'Confirm eligibility and your last check with your GP; the usual interval is five years.',
      'healthCheck', excluded, excluded ? 'not_eligible' : confirmed ? screeningStatus(history.NHS_health_check, 5, today) : 'check_eligibility'));
  }
  return rows;
}

export function niceRecommendations(h) {
  const rows = [], age = h.demographics.age, family = h.family_history.join(' ');
  const highRisk = has(h, /type 1 diabetes|familial hypercholesterol|inherited lipid/) || (h.egfr != null && h.egfr < 60) || h.albuminuria === true;
  if (has(h, CVD)) rows.push(recommendation('established_cvd', 'Existing cardiovascular care', 'You reported established cardiovascular disease.', 'Discuss prevention within your existing care plan rather than calculating a primary-prevention score.', 'cvd', true, 'condition_follow_up'));
  else if (highRisk) rows.push(recommendation('high_cvd', 'Condition-specific cardiovascular review', 'Type 1 diabetes, inherited lipid disorder, low eGFR or albuminuria was stated.', 'Use the relevant clinician-led pathway; a generic risk score is not the decision-maker.', 'cvd', true, 'clinician_review'));
  else if (age >= 85) rows.push(recommendation('older_cvd', 'Age-tailored cardiovascular review', 'Age 85 or over.', 'Discuss prevention with a clinician; do not calculate QRISK3 outside its age range.', 'cvd', true, 'clinician_review'));
  else if (age >= 25 && age <= 84) rows.push(recommendation('qrisk3', 'Formal cardiovascular risk review', 'Age 25–84; no established CVD was reported.', 'A clinician can confirm suitability and use QRISK3 with a complete history. This app does not calculate your risk.', 'cvd', true, 'confirm_suitability'));
  if (h.risk_underestimation.length || has(h, /hiv|severe mental|lupus|autoimmune|inflammatory/) || /corticosteroid|antipsychotic/i.test(h.medications.join(' '))) rows.push(recommendation('underestimation', 'Clinician interpretation of risk', 'A condition or medicine that may affect risk estimates was reported.', 'Ask a clinician to interpret any cardiovascular risk estimate in context.', 'cvd', true));
  if (has(h, /high cholesterol|dyslipid|abnormal lipid/) || /premature|heart attack.{0,25}(?:[1-4]\d|50)\b/i.test(family)) rows.push(recommendation('lipids', 'Review cholesterol and family history', 'Abnormal lipids or possible premature family cardiovascular history.', 'Review clinical findings, a full lipid profile and family history together.', 'cvd', true));
  if (!has(h, DIABETES) && h.pregnant !== true && (age >= 40 || (age >= 25 && age <= 39 && h.higher_risk_ethnicity === true) || has(h, /hypertension|obesity|polycystic|gestational|fatty liver|cardiovascular|stroke/))) rows.push(recommendation('diabetes_risk', 'Type 2 diabetes risk assessment', 'Age or a stated risk factor matches the prevention matrix.', 'Confirm suitability, including pregnancy status, and use a validated risk assessment first. A clinician decides whether a blood test is needed.', 'diabetes', true));
  if (/breast cancer/i.test(family)) rows.push(recommendation('familial_breast', 'Familial breast-cancer review', family, 'Record affected relatives on both sides, cancer types and ages at diagnosis. A clinician applies NICE referral criteria before considering imaging; family history alone does not mean a mammogram is needed.', 'breast', true, 'family_history_review'));
  return rows;
}

function optionalRecommendations(h, primary) {
  const family = h.family_history.join(' '), p = h.preferences, rows = [];
  const add = (id, title, trigger, explanation, review = true) => rows.push({ ...recommendation(id, title, trigger, explanation, 'optional', review, review ? 'conditional' : 'optional'), availableWithSelectedProduct: ADD_ON_PRODUCTS.has(primary.id) });
  const risks = [has(h, /hypertension|high blood pressure/), has(h, DIABETES), has(h, /high cholesterol/), h.lifestyle.smoking_status === 'current'].filter(Boolean).length;
  if (p.coronary_concern || risks >= 2 || /premature|coronary|heart attack/i.test(family)) add('coronary', 'Coronary check discussion', 'Coronary concern, multiple risk factors or relevant family history.', 'Start with formal cardiovascular risk assessment. Do not assume imaging is indicated.');
  if (/breast cancer/i.test(family)) add('breast_option', 'Breast health pathway', 'Breast cancer in the family.', 'NICE familial-risk review comes before private imaging selection.');
  if (/bowel|colorectal|colon cancer/i.test(family) || p.bowel_concern) add('colon', 'Colon check discussion', 'Bowel-cancer family history or explicit concern.', 'Ask about clinical risk assessment before selecting private screening.');
  if (p.genetic_interest) add('dna', 'DNA Health Check', 'You explicitly want genetic health information.', 'A preference-based private option, separate from NHS screening. Confirm availability and implications with Bupa.', false);
  if (p.prostate_testicular_concern) add('prostate', 'Prostate or testicular health discussion', 'You raised a prostate or testicular concern.', 'Ask a clinician about the appropriate pathway. PSA is not an NHS population-screening programme.');
  return rows;
}

function followUps(h) {
  const questions = [], family = h.family_history.join(' ');
  if (h.demographics.age == null) questions.push('How old are you?');
  if (/breast cancer/i.test(family) && !/\b(?:age[ds]?|at)\s+\d{2}\b/i.test(family)) questions.push('How old were your relatives when breast cancer was diagnosed, and which side of the family were they on?');
  else if (/heart|coronary/i.test(family) && !/\b(?:age[ds]?|at)\s+\d{2}\b/i.test(family)) questions.push('What heart condition did your relative have, and at what age?');
  if (h.lifestyle.smoking_status === 'former' && h.lifestyle.pack_years == null) questions.push('When did you stop smoking, how many cigarettes a day, and for how many years?');
  if (h.medications.some(m => /^(medication|medicine|tablets)$/i.test(m))) questions.push('Which medicine do you take, and what is it for?');
  if (h.operations.some(o => /^(operation|surgery)$/i.test(o))) questions.push('What operation did you have, when and why?');
  if (h.preferences.remote == null) questions.push('Would you prefer an in-person assessment or a video appointment?');
  return questions;
}

export function recommend(h, { today = new Date() } = {}) {
  const base = { version: RULE_VERSION, jurisdiction: 'England', primary: null, optional: [], nhs: [], nice: [], followUps: followUps(h), uncertainties: [...h.uncertainties] };
  if (h.demographics.country.toLowerCase() !== 'england') return { ...base, status: 'check_jurisdiction', uncertainties: [...base.uncertainties, 'These programme rules apply to England. Confirm the guidance for your location.'] };
  if (h.demographics.age != null && h.demographics.age < 19) return { ...base, status: 'clinician_review' };
  if (h.symptoms.length || h.active_management) return { ...base, status: 'clinician_review', uncertainties: [...base.uncertainties, 'Discuss the current concern with your clinician before choosing a preventive assessment.'] };
  const primary = selectBupa(h);
  return { ...base, status: 'prevention', primary, optional: optionalRecommendations(h, primary), nhs: nhsRecommendations(h, today), nice: niceRecommendations(h),
    uncertainties: [...base.uncertainties, ...(h.demographics.age == null ? ['Age is unknown; age-based screening has not been selected.'] : []), 'Screening eligibility and recall depend on confirmed history. Private options do not replace NHS programmes.'] };
}
