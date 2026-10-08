import { PLAN_PROMPT, EXTRACTION_PROMPT } from './prompts.mjs';
import { modelJSON } from './model-json.mjs';
export { PLAN_PROMPT } from './prompts.mjs';
export { modelJSON } from './model-json.mjs';
import { factsSchema, buildHistory, groundedFacts } from './history.mjs';
import { recommend } from './recommendations.mjs';
import { quickRoute } from './public/safety-rules.js';
export { quickRoute } from './public/safety-rules.js';
import { sources, retrieveEvidence, materialize } from './evidence.mjs';
import { transcriptProblem, LANGUAGE_ERROR } from './public/transcript-quality.js';

import { TEXT_MODEL, TEXT_TIMEOUT, PLAN_TIMEOUT } from './providers.mjs';
export { TEXT_MODEL, TRANSCRIPTION_MODEL } from './providers.mjs';

function emergencyContact() {
  return {
    route: 'emergency', title: 'Please get help now',
    message: 'Call 999 now and ask for an ambulance. Do not drive yourself to A&E.',
    primary: { label: 'Call 999', href: 'tel:999' },
    note: 'UK numbers. Elsewhere, call your local emergency number. This app has not contacted anyone.',
    sources: [sources.emergency, sources.chest]
  };
}

// Restore Rob's pre-0440844 scope handoff. The model cannot choose a route;
// the existing medication rule and matrix clinician-review flag own this decision.
function humanContact() {
  return {
    route: 'human', title: 'A person can help with this',
    message: 'A healthcare professional can help with symptoms or treatment. This app is for staying well.',
    primary: { label: 'Call NHS 111', href: 'tel:111' },
    secondary: { label: 'Find your GP', href: 'https://www.nhs.uk/service-search/find-a-gp' },
    note: 'For routine advice, contact your GP. NHS 111 can help if you need medical help now. In an emergency, call 999. This app has not contacted anyone.',
    sources: [sources.urgent]
  };
}

function validateRecords(records) {
  return Array.isArray(records) ? records.slice(0, 5).map(r => ({ title: String(r?.title || 'Selected record').slice(0, 160), text: String(r?.text || '').slice(0, 6000), source: String(r?.source || 'User provided').slice(0, 100) })) : [];
}

export function validateProfile(value) {
  if (!value || !Array.isArray(value.answers) || value.answers.length !== 6 || value.answers.some(x => typeof x !== 'string' || x.length > 2500)) throw new Error('Please provide six short answers.');
  if (value.answers.every(x => !x.trim())) throw new Error('Please answer at least one question.');
  const records = validateRecords(value.records);
  return { answers: value.answers.map(x => x.trim()), records };
}

// Legacy API compatibility only; the browser checks only through /api/plan on Submit.
export async function checkAnswer(text) {
  const fast = quickRoute(text);
  if (fast) return fast === 'emergency' ? emergencyContact() : humanContact();
  return { route: 'prevention' };
}

export async function makePlan(value, options = {}) {
  const started = performance.now();
  let historyFacts = [];
  const originalIntake = typeof value?.intake === 'string' ? value.intake.trim() : '';
  // One check of original submitted words, never model summaries or imported records.
  if (typeof value?.intake === 'string' && (!originalIntake || originalIntake.length > 8000)) throw new Error('Please give a short recording or written answer first.');
  const submitted = originalIntake || validateProfile(value).answers.filter((_, i) => i !== 2).join('. ');
  const fast = quickRoute(submitted);
  if (fast) return fast === 'emergency' ? emergencyContact() : humanContact();
  if (typeof value?.intake === 'string') {
    const intake = value.intake.trim();
    if (value.age != null && (!Number.isInteger(value.age) || value.age < 1 || value.age > 120)) throw new Error('Please check your age.');
    if (transcriptProblem(intake)) { const e = new Error(LANGUAGE_ERROR); e.status = 422; e.code = 'unexpected_language'; throw e; }
    const fields = ['age', 'medical', 'family', 'lifestyle', 'checks', 'priority'];
    const schema = { type: 'object', additionalProperties: false, properties: { facts: factsSchema, ...Object.fromEntries(fields.map(k => [k, { type: 'string' }])) }, required: [...fields, 'facts'] };
    const extracted = await modelJSON(EXTRACTION_PROMPT,
      { intake, age: value.age ?? null, records: validateRecords(value.records) }, schema,
      { timeout: TEXT_TIMEOUT, ...options, maxOutputTokens: 2200 });
    if (fields.some(k => typeof extracted[k] !== 'string')) throw new Error('INVALID_INTAKE');
    historyFacts = extracted.facts || [];
    // A stated feeling can be extracted as a symptom fact while all six display
    // fields are blank. Retain its exact, grounded quote for profile review;
    // this does not create a diagnosis, fact, or recommendation.
    if (!extracted.medical.trim()) {
      const quotes = groundedFacts(historyFacts, [intake]).filter(f => f.key === 'current_symptom' && !extracted.family.includes(f.evidence)).map(f => f.evidence);
      extracted.medical = [...new Set(quotes)].join('\n').slice(0, 2500);
    }
    value = { answers: fields.map(k => k === 'age' && value.age != null ? String(value.age) : extracted[k]), records: value.records };
    const remaining = Math.floor((options.timeout || PLAN_TIMEOUT) - (performance.now() - started));
    if (remaining <= 0) throw new Error('INTAKE_TIMEOUT');
    options = { ...options, timeout: remaining };
  }
  const profile = validateProfile(value);
  const age = Number(profile.answers[0].match(/\b(\d{1,3})\b/)?.[1]);
  if (age && age < 19) return { route: 'prevention', profile: { ...profile, facts: [] }, intro: 'This demo uses guidance for adults aged 19 and over, so it cannot offer an adult prevention plan for your age.', followUp: '', actions: [], uncertainty: 'No adult recommendations have been generated.' };
  // Current-concern facts must also be backed by the own-health review field.
  // A family-history quote cannot manufacture a personal symptom handoff.
  const ownHealthFacts = new Set(groundedFacts(historyFacts, [profile.answers[1]]));
  const history = buildHistory(profile, Array.isArray(historyFacts) ? historyFacts.filter(f => !['current_symptom','active_management'].includes(f?.key) || ownHealthFacts.has(f)) : [], originalIntake);
  const recommendations = recommend(history);
  if (recommendations.status === 'clinician_review') return { ...humanContact(), recommendations };
  const catalogue = retrieveEvidence(profile);
  // Schema-constrained source excerpts prevent copied summaries from masquerading
  // as verbatim user quotes, without requiring a slow repair-model call.
  const originalSources = [...(originalIntake ? [originalIntake] : profile.answers), ...profile.records.map(r => r.text)];
  const anchors = [...new Set(originalSources.flatMap(s => (s.match(/[^.!?;\n]+[.!?;]?/g) || []).flatMap(part => part.match(/.{1,139}(?:\s|$)|.{1,140}/g) || []).map(s => s.trim()).filter(Boolean)))].slice(0, 120);
  const actionProperties = Object.fromEntries(['id', 'title', 'idea', 'reason', 'anchor', 'backup'].map(k => [k, k === 'id' ? { type: 'string', enum: catalogue.map(x => x.id) } : k === 'anchor' ? { type: 'string', enum: anchors } : { type: 'string', maxLength: ({ title: 90, idea: 420, reason: 240, backup: 220 })[k] }]));
  const schema = { type: 'object', additionalProperties: false, properties: {
    answer: { type: 'string', maxLength: 650 }, followUp: { type: 'string', maxLength: 240 },
    actions: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, properties: actionProperties, required: Object.keys(actionProperties) } }
  }, required: ['answer', 'followUp', 'actions'] };
  const result = await modelJSON(PLAN_PROMPT, { profile, originalIntake, anchors, catalogue }, schema, { ...options, maxOutputTokens: 1200 });
  const normalise = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const supplied = [...(originalIntake ? [originalIntake] : profile.answers), ...profile.records.map(r => r.text)].map(normalise);
  const ids = result.actions?.map(a => a.id) || [];
  if (!ids.length || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !catalogue.some(x => x.id === id))) throw new Error('UNSUPPORTED_PLAN');
  const required = ['familyCancer', 'smoking'].filter(id => catalogue.some(a => a.id === id));
  if (required.some(id => !ids.includes(id))) throw new Error('MISSING_PERSONAL_PRIORITY');
  // Anchors must be actual supplied words. URLs and clinical instructions cannot be
  // injected through model-written presentation fields; clinical copy stays in the catalogue.
  const unsafe = /https?:|\b(?:999|111)\b|\b(?:prescrib\w*|\d+\s*(?:mg|mcg|tablets?|percent|%)|(?:get|book|need|arrange) (?:a |an )?(?:scan|genetic test|blood test)|(?:stop|change|double|reduce) (?:your |the )?(?:medicine|medication|dose)|(?:prevent|cure|reduce your risk of) cancer)\b/i;
  for (const a of result.actions) {
    if (['title', 'idea', 'reason', 'anchor', 'backup'].some(k => typeof a[k] !== 'string' || a[k].length > ({ title: 90, idea: 420, reason: 240, anchor: 180, backup: 220 })[k])) throw new Error('INVALID_PERSONAL_IDEA');
    if (normalise(a.anchor).length < 2 || !supplied.some(s => s.includes(normalise(a.anchor)))) throw new Error('UNSUPPORTED_PERSONAL_ANCHOR');
    if (unsafe.test([a.title, a.idea, a.reason, a.backup].join(' '))) throw new Error('UNSUPPORTED_PERSONAL_ADVICE');
  }
  if (typeof result.answer !== 'string' || result.answer.length > 650 || typeof result.followUp !== 'string' || result.followUp.length > 240 || unsafe.test(result.answer + ' ' + result.followUp)) throw new Error('INVALID_PERSONAL_ANSWER');
  if (ids.includes('familyCancer')) result.actions.sort((a,b) => Number(b.id === 'familyCancer') - Number(a.id === 'familyCancer'));
  const personalised = result.actions.map(a => ({ ...materialize([a.id], profile)[0], title: a.title, idea: a.idea, reason: a.reason, context: a.anchor, backup: a.backup }));
  return { route: 'prevention', profile: { ...profile, facts: history.facts }, recommendations, intro: result.answer, followUp: recommendations.followUps[0] || result.followUp, priority: profile.answers[5] || '', actions: personalised, model: TEXT_MODEL, evidenceMode: 'curated', uncertainty: 'A starting point, not a health assessment. Adapt it with your GP if you need to.' };
}
