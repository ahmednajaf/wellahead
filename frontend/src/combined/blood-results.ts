export type BloodResult = {
  id: string; system: string; category: string; biomarker: string;
  value: string; units: string; notes: string;
};
export type BloodReport = {
  patient: string; age: number; sex: string; demo: true;
  sourceFile: string; sourceSha256: string; results: BloodResult[];
};

// Display associations only. Primary categories come verbatim from the CSV.
// Related markers are not organ-function tests, diagnoses or recommendation rules.
// Rationale and NHS sources: docs/EMMA_BLOOD_RESULTS.md.
const related: Record<string, { markers: string[]; context: string }> = {
  brain: { markers: ['Vitamin B12', 'Folate'], context: 'Related nutritional markers. These do not assess brain health, mental health or sleep.' },
  eyes: { markers: ['Vitamin B12'], context: 'B12 is relevant to nervous-system function, including vision. This is not an eye examination.' },
  oral: { markers: ['Calcium', 'Vitamin D'], context: 'Related to bone and tooth mineral health. These results do not assess teeth or gums.' },
  lungs: { markers: ['Haemoglobin', 'RBC'], context: 'Red blood cells carry oxygen using haemoglobin. These are not lung-function or oxygen-saturation tests.' },
  gut: { markers: ['Iron', 'Ferritin', 'Vitamin B12', 'Folate'], context: 'Related nutritional markers. These do not assess bowel health or establish an absorption problem.' },
  skin: { markers: ['Zinc'], context: 'Zinc is involved in tissue repair. This result is not a skin examination or a test for skin cancer.' },
  muscles: { markers: ['Vitamin D'], context: 'Vitamin D is related to bone and muscle health; this is not an assessment of strength or mobility.' },
  immune: { markers: ['WBC'], context: 'White blood cells are part of the immune system. A count does not measure overall immune health.' },
};

export function bloodResultsFor(report: BloodReport | undefined, system: string) {
  const direct = report?.results.filter(result => result.system === system) || [];
  const additional = report?.results.filter(result => result.system !== system && related[system]?.markers.includes(result.biomarker)) || [];
  return { direct, related: additional, context: related[system]?.context || '', count: direct.length + additional.length };
}
