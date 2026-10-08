// Curated, source-checked paraphrases. No patient data is sent to a search engine.
// Keeping the bounded evidence set local avoids search latency and third-party claims.
export const checkedAt = '2026-09-17';
export const sources = {
  familyCancer: { publisher: 'NHS', title: 'Family history of cancer', url: 'https://digital.nhs.uk/ndrs/patients/family-history-of-cancer', passage: 'People concerned about a family history of cancer should speak to their GP. The GP can arrange a detailed family-history review if appropriate. Screening or genetic testing depends on that assessment; a family history alone does not establish inherited risk.' },
  cancerHistory: { publisher: 'NHS', title: 'Understanding a cancer family history', url: 'https://www.genomicseducation.hee.nhs.uk/genotes/in-the-clinic/presentation-patient-with-a-family-history-of-cancer/', passage: 'A family-history assessment considers the cancer types, affected relatives, their ages at diagnosis and any known inherited gene changes. The need for further assessment depends on these details.' },
  activity: { publisher: 'NHS', title: 'Physical activity for adults', url: 'https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-for-adults-aged-19-to-64/', passage: 'Adults should be active daily, break up long sitting periods and aim for 150 minutes of moderate activity weekly. Speak to a GP first after prolonged inactivity or with medical conditions or concerns.' },
  older: { publisher: 'NHS', title: 'Physical activity for older adults', url: 'https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-older-adults/', passage: 'Adults aged 65 and over should move daily and include strength, balance and flexibility on at least two days weekly. Activity should suit fitness and medical circumstances.' },
  food: { publisher: 'NHS', title: 'The Eatwell Guide', url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/', passage: 'A balanced diet includes a variety of fruit and vegetables, higher-fibre starchy foods and protein sources. Aim for balance across a day or week. People with special dietary needs may need a registered dietitian.' },
  smoking: { publisher: 'NHS', title: 'Quit smoking', url: 'https://www.nhs.uk/better-health/quit-smoking/', passage: 'Stopping smoking benefits health. Local stop smoking services offer free advice and support to help people stop.' },
  pressure: { publisher: 'NHS', title: 'High blood pressure', url: 'https://www.nhs.uk/conditions/high-blood-pressure/', passage: 'High blood pressure often has no symptoms. Checks identify it; follow-up and management matter. People aged 40 and over should have a check at least every five years.' },
  goals: { publisher: 'NICE', title: 'PH49 · Behaviour change: individual approaches', url: 'https://www.nice.org.uk/guidance/ph49/chapter/recommendations', passage: 'Agree goals with the person, prioritise actions and develop an action plan specifying when, where and how the action will happen. Adapt support to the person’s needs and circumstances.' },
  emergency: { publisher: 'NHS', title: 'When to call 999', url: 'https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/', passage: 'Call 999 for life-threatening emergencies.' },
  chest: { publisher: 'NHS', title: 'Chest pain', url: 'https://www.nhs.uk/symptoms/chest-pain/', passage: 'Sudden chest pain that does not go away, spreads, or occurs with sweating, sickness, light-headedness or breathlessness needs 999. Other chest pain needs medical advice.' },
  urgent: { publisher: 'NHS', title: 'When to use NHS 111', url: 'https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/', passage: 'Use NHS 111 when medical help is needed now and you are unsure what to do.' }
};

// The model selects actions; the server supplies all clinical wording and links.
export const actions = {
  familyCancer: { title: 'Talk through your family cancer history', area: 'whole', systems: [], icon: 'family', tag: 'Family history', step: 'Tell your GP about the cancer in your family. If you can, note who was affected, the type of cancer and their age at diagnosis.', why: 'These details help your GP decide whether a family-history review would be useful.', uncertainty: 'This alone does not tell us your risk or whether you need extra screening or genetic testing.', sourceIds: ['familyCancer', 'cancerHistory'], cta: 'NHS family-history guidance', url: sources.familyCancer.url },
  move: { title: 'Make a little room for movement', area: 'heart', systems: ['heart', 'lungs', 'brain'], icon: 'move', tag: 'Everyday movement', step: 'Choose a short walk or another activity you enjoy. Pick a time that fits your day.', why: 'Regular activity supports heart health. Breaking up long periods of sitting is also worthwhile.', uncertainty: 'Start at a level that suits you. Speak to a GP first if you have been inactive for some time or have a medical condition or concern.', sourceIds: ['activity', 'older'], cta: 'Explore NHS activity guidance', url: sources.activity.url },
  strength: { title: 'Build strength for everyday life', area: 'muscles', systems: ['muscles', 'bones'], icon: 'strength', tag: 'Strength & balance', step: 'Choose a suitable strengthening activity. The NHS recommends working the main muscle groups on at least two days a week.', why: 'Strengthening activities are part of the NHS guidance for staying active.', uncertainty: 'The right activity depends on your ability and health. Ask a professional for an adapted starting point if you have pain, falls or mobility concerns.', sourceIds: ['activity', 'older'], cta: 'Explore NHS strength guidance', url: sources.older.url },
  food: { title: 'Try one nourishing swap', area: 'gut', systems: ['gut'], icon: 'food', tag: 'Food & nutrition', step: 'Try adding vegetables to a familiar meal or choosing a higher-fibre version of a food you enjoy.', why: 'The Eatwell Guide recommends variety and balance across your day or week.', uncertainty: 'Keep following any prescribed diet. A dietitian can help if you have special dietary needs.', sourceIds: ['food'], cta: 'Open the NHS Eatwell Guide', url: sources.food.url },
  smoking: { title: 'Find support to stop smoking', area: 'lungs', systems: ['lungs', 'heart'], icon: 'lungs', tag: 'Smoke-free support', step: 'Talk to a stop smoking adviser about a quit plan that feels possible for you.', why: 'Stopping smoking benefits your health. NHS services can support you through it.', uncertainty: 'This step is for people who currently smoke. Your experience and the support you need will be individual.', sourceIds: ['smoking'], cta: 'Find NHS stop smoking support', url: sources.smoking.url },
  pressure: { title: 'Ask about a blood pressure check', area: 'heart', systems: ['heart'], icon: 'heart', tag: 'Preventive checks', step: 'Ask your pharmacy or GP when your next blood pressure check is due.', why: 'High blood pressure often has no symptoms. A check can help identify it.', uncertainty: 'A check alone does not improve health. Follow-up matters if a reading is raised. Your clinician may recommend a different schedule for you.', sourceIds: ['pressure'], cta: 'Read NHS blood pressure guidance', url: sources.pressure.url },
  goal: { title: 'Choose one step you can repeat', area: 'whole', systems: [], icon: 'goal', tag: 'Your starting point', step: 'Choose one action that matters to you. Decide when and where you will try it, and what support would help.', why: 'NICE recommends agreeing personal goals and making a practical action plan.', uncertainty: 'You can change your goal as you learn what works for you. You do not need to do everything at once.', sourceIds: ['goals'], cta: 'Read the NICE guidance', url: sources.goals.url }
};

export function familyCancerContext(profile) {
  // Only affirmed family history makes this card eligible. A user correction takes
  // precedence over imported notes. Unknown history is not a positive finding.
  const family = profile.answers[2].trim();
  const clauses = family.split(/[.!?;\n]|\bbut\b/i);
  const cancer = /\b(cancer|leuka?emia|lymphoma|melanoma|sarcoma)\b/i;
  const negated = /\b(no(?: known)? (?:family )?(?:history of )?(?:\w+ )?(?:cancer|leuka?emia|lymphoma|melanoma)|no one|nobody|none|never had|not (?:have|had)|without (?:a )?(?:family )?history|(?:unsure|not sure|do not know|don't know) (?:if|whether|about)|family history (?:is )?unknown)\b/i;
  const affirmed = clauses.find(c => cancer.test(c) && !negated.test(c));
  if (affirmed) return { text: affirmed.trim(), source: 'your answers' };
  if (family && !/^(not sure|unknown|unsure|i don.t know)\.?$/i.test(family)) return null;
  for (const record of profile.records || []) {
    const match = record.text.split(/[.!?;\n]|\bbut\b/i).find(c => cancer.test(c) && /\b(family|mother|father|mum|dad|sister|brother|grandmother|grandfather|aunt|uncle|parent|relative)\b/i.test(c) && !negated.test(c));
    if (match) return { text: match.trim(), source: 'a record you added' };
  }
  return null;
}

export function retrieveEvidence(profile) {
  const text = profile.answers.join(' ').toLowerCase();
  const currentSmoking = /\b(i smoke|i am smoking|i'm smoking|currently smok(?:e|ing)|still smok(?:e|ing))\b/.test(text);
  const notSmoking = /\b(never smoked|do not smoke|don't smoke|non[- ]?smoker|stopped smoking|have quit smoking|quit smoking \d)\b/.test(text);
  const smoker = currentSmoking && !notSmoking;
  const ageMatch = profile.answers[0].match(/\b(\d{2,3})\b/);
  const age = ageMatch ? Number(ageMatch[1]) : null;
  const ids = ['move', 'strength', 'food', 'goal'];
  if (familyCancerContext(profile)) ids.unshift('familyCancer');
  if (age >= 40) ids.push('pressure');
  if (smoker) ids.push('smoking');
  return ids.map(id => ({ id, ...actions[id], evidence: sourceIdsFor(id, profile).map(sourceId => ({ id: sourceId, ...sources[sourceId] })) }));
}

export function materialize(ids, profile) {
  return ids.map(id => {
    const context = profile ? personalContext(id, profile) : null;
    return { id, ...actions[id], ...context, sources: sourceIdsFor(id, profile).map(sourceId => ({ id: sourceId, ...sources[sourceId], checkedAt })) };
  });
}

function sourceIdsFor(id, profile) {
  const age = Number(profile?.answers[0].match(/\b\d{1,3}\b/)?.[0]);
  return actions[id].sourceIds.filter(sourceId => !(age >= 19 && age < 65 && sourceId === 'older') && !(age >= 65 && sourceId === 'activity'));
}

function personalContext(id, profile) {
  const family = familyCancerContext(profile);
  const priority = profile.answers[5];
  const habits = profile.answers[3];
  const quote = value => value.length > 180 ? value.slice(0, 177) + '…' : value;
  if (id === 'familyCancer' && family) return { reason: 'Because you mentioned cancer in your family.', context: quote(family.text), contextSource: family.source };
  if (id === 'smoking') return { reason: 'Because you said you currently smoke.', context: quote(habits), contextSource: 'your answers' };
  if (id === 'pressure') return { reason: `A routine check to consider at ${profile.answers[0].match(/\d+/)?.[0]}.`, context: quote(profile.answers[4]), contextSource: 'your answers' };
  if (id === 'goal' && priority) return { reason: 'Built around what matters to you.', context: quote(priority), contextSource: 'your answers' };
  const relevant = ({ move: /walk|active|movement|exercise|desk|sitting|outdoor/i, strength: /strength|balance|muscle|gym/i, food: /food|meal|diet|vegetable|cook|eat/i })[id];
  const detail = relevant && [priority, habits].find(v => relevant.test(v));
  if (detail) return { reason: 'Fits the habits and goals you shared.', context: quote(detail), contextSource: 'your answers' };
  return { reason: 'An everyday option you can adapt.', context: '', contextSource: '' };
}
