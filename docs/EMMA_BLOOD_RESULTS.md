# Emma’s Bupa demo blood results

Bupa Connect now previews **Emma Thompson, 35** and opens the same cached Emma
profile used by the demo button. It waits three seconds, shows the six-section
confirmation, then opens the dashboard. No ASR, Luna or other model/API request
is made for either unchanged demo route. This is an example connection, not a
live Bupa integration.

## Source and preservation

The user supplied `mock_normal_patient_blood_results.csv`: 77 synthetic results,
all for Emma Thompson, age 35, sex Female, with `Demo patient=True`.

- Untouched source: the CSV in Downloads.
- Byte-for-byte project copy: `frontend/src/combined/data/mock_normal_patient_blood_results.csv`.
- SHA-256: `29f812442fd5e53699a88da4e5ab0f91668bab205118eb851fc881e923d56f50`.
- Display data: `frontend/src/combined/emma-blood-results.ts`, read using Python’s
  standard CSV reader. Tests reconstruct every source row, including metadata.

Results stay as strings so `<1.0`, `41.0`, `µ` units, quoted commas and early
follicular-phase notes are retained. No collection date or reference ranges
were supplied. The filename is not used to classify values as normal.
The supplied sex metadata is displayed only; it does not change screening rules.

## Display mappings

Primary categories come directly from the CSV. Related markers are additional
display associations, not inferred diagnoses or assessments of organ function.

| Dashboard area | Supplied primary category | Additional related markers |
| --- | --- | --- |
| Brain, mental health & sleep | None | Vitamin B12, Folate |
| Eyes | None | Vitamin B12 |
| Oral | None | Calcium, Vitamin D |
| Lungs | None | RBC, Haemoglobin |
| Heart | Heart | None |
| Blood & nutrition | Blood & nutrition | None |
| Liver | Liver | None |
| Hormones | Hormones | None |
| Digestive | None | Iron, Ferritin, Vitamin B12, Folate |
| Kidneys & urinary | Kidneys & urinary | None |
| Sexual health | Sexual health | None |
| Muscles, bones & joints | Muscles, bones & joints | Vitamin D |
| Skin | None | Zinc |
| Immune | Immune | WBC |
| Whole person | Whole person | None |

The six areas without primary tests explicitly say no dedicated tests were
provided. Every result belongs to exactly one primary category and can be shown
again where related. A result is never duplicated within one area. Dashboard
result counts are separate from recommendation badges and completion scores.

Rationale for the related associations:

- [NHS blood tests](https://www.nhs.uk/tests-and-treatments/blood-tests/): blood
  counts and commonly used organ-related laboratory panels.
- [NHS B12 and folate deficiency](https://www.nhs.uk/conditions/vitamin-b12-or-folate-deficiency-anaemia/):
  nervous-system and vision relevance, nutritional absorption, and the role of
  red blood cells and haemoglobin in transporting oxygen. These associations
  do not imply Emma has a deficiency or that these results assess lung function.
- [NHS vitamin D](https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/):
  calcium regulation and relevance to bones, teeth and muscles.
- [NHS vitamins and minerals](https://www.nhs.uk/conditions/vitamins-and-minerals/others/):
  zinc’s role in tissue repair. Zinc is not a skin-health score.

## Boundaries

The report is attached only to the cached fictional Emma plan. No real history,
credentials or health-data storage are introduced. Leaving the demo restores
the previous draft and clears the displayed report. Edited histories, added
records and check-ins still use Rob’s existing backend; the CSV is not silently
sent with them or attached to their resulting plans.

Values do not alter matrix recommendations, diagnoses, screening eligibility,
appointments or the optimisation score. No range flags, trends, calculated risk,
or treatment suggestions are generated. The existing 3D viewers remain reference
illustrations, and Whole Person retains the before/after switch.

## Verification

Frontend tests cover exact source preservation, all fifteen mappings, original
category ownership, qualifiers, phase notes, separate score counts, cached
loading, cancellation and restoring the personal draft. Browser coverage blocks
every API request while opening Emma through Bupa and visiting all fifteen areas,
then verifies mobile layout and returning to the personal story.
