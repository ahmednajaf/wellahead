// A guard for this English-language demo, not a general language classifier.
// Latin names and accents are allowed. Predominantly non-Latin output must be
// re-recorded/corrected, never silently translated into a medical history.
export function transcriptProblem(value) {
  if (typeof value !== 'string' || !value.trim()) return 'empty';
  const letters = value.match(/\p{Letter}/gu) || [];
  const latin = value.match(/\p{Script_Extensions=Latin}/gu) || [];
  if (letters.length && latin.length / letters.length < 0.65) return 'unexpected_language';
  return null;
}
export const LANGUAGE_ERROR = 'The transcription came back in an unexpected language, so it has not been used. Please listen to your recording, then record again in English or type your answers.';
