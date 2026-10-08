// Shared by browser and server. Only explicit, current statements trigger 999.
// This is a narrow demo interruption rule, not a symptom checker or triage tool.
const URGENT_PATTERNS = [
  /\bi(?: have| am having|'m having) chest (?:pain|pressure)\b/,
  /\b(?:urgent|severe|crushing|persistent) chest (?:pain|pressure)\b/,
  /\bchest (?:pain|pressure)\b.{0,70}\b(?:won't go away|does not go away|spreading to (?:my |the )?(?:left |right )?(?:arm|jaw)|sweating|sweaty|short of breath)\b/,
  /\b(?:can't|cannot|can not) breathe\b/,
  /\bsevere difficulty breathing\b/,
  /\b(?:my face is drooping|my speech is suddenly slurred)\b/,
  /\b(?:i have|i've|i just) (?:taken an overdose|overdosed)\b/,
  /\bi (?:want to|am going to|plan to) (?:kill myself|end my life)\b/
];
const NON_CURRENT = /\b(?:if|example|hypothetical|worried (?:about|that)|afraid|fear|history of|used to|years? ago|last (?:year|month|week)|yesterday|in (?:19|20)\d\d|previously|in the past|when i had)\b/;
const NEGATION = /\b(?:no|not|never|without|denies|deny|don't|do not|didn't|did not)\b/;

export function hasExplicitEmergency(value) {
  const clauses = String(value).toLowerCase().replace(/[’‘]/g, "'")
    .split(/[.!?;\n]|\b(?:but|however)\b|,?\s+and\s+(?=i\b)/);
  return clauses.some(clause => {
    const text = clause.trim();
    if (NON_CURRENT.test(text)) return false;
    // Past-tense accounts and somebody else's history are not current self-reports.
    if (/\b(?:i had|i was|my (?:mother|father|mum|dad|sister|brother|grandmother|grandfather|family))\b/.test(text)) return false;
    return URGENT_PATTERNS.some(pattern => {
      const match = pattern.exec(text);
      if (!match) return false;
      if (/breathe/.test(match[0]) && /through (?:my |the )?nose|(?:when|after|while) i (?:run|exercise)|after running|during exercise/.test(text) && !/at rest|right now/.test(text)) return false;
      if (/kill myself|end my life/.test(match[0]) && /laughing|joking|figure of speech/.test(text)) return false;
      const prefix = text.slice(0, match.index);
      if (NEGATION.test(prefix) || /\b(?:has gone|went away|resolved|no longer|not now)\b/.test(text.slice(match.index))) return false;
      // Require a present self-report, or a short direct symptom statement.
      return /\b(?:i have|i am having|i'm having|i feel|i am|i'm)\b/.test(prefix)
        || /^i\b|^my\b/.test(match[0])
        || !prefix || /^(?:help[,:]?\s*|i\s*)$/.test(prefix);
    });
  });
}

export function quickRoute(text) {
  if (hasExplicitEmergency(text)) return 'emergency';
  // Rob's earlier deterministic medication-change handoff (bc70dff).
  if (/\b(?:should|can|could|want to)\s+(?:i\s+)?(?:stop|change|double|increase|reduce)\b.{0,35}\b(?:medicine|medication|dose|tablets|insulin|statin|amlodipine)\b/i.test(text)) return 'human';
  return null;
}
