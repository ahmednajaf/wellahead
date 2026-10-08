import type { Plan } from './api';

// Prepared fictional demo, not a recorded model response.
// Recommendations are a snapshot of Rob's existing matrix (2026-09-18).
// Actions and sources come from his existing evidence catalogue; no new rules.
export const emmaDemoSnapshot: { intake: string; plan: Plan } = {
  "intake": "I’m Emma and I’m 35. Generally I feel pretty healthy. I don’t take any regular medication and I’m not seeing my GP for anything at the moment. I had my appendix removed when I was younger but otherwise I’ve never had any major health problems. My mum had breast cancer when she was 42, which is something I worry about. My dad has high blood pressure. I’d mainly like to make sure I’m healthy and understand whether there’s anything I should be checking as I get older.",
  "plan": {
    "route": "prevention",
    "profile": {
      "answers": [
        "35",
        "Generally I feel pretty healthy. I don’t take any regular medication and I’m not seeing my GP for anything at the moment. I had my appendix removed when I was younger but otherwise I’ve never had any major health problems.",
        "My mum had breast cancer when she was 42, which is something I worry about. My dad has high blood pressure.",
        "",
        "",
        "I’d mainly like to make sure I’m healthy and understand whether there’s anything I should be checking as I get older."
      ],
      "records": [],
      "facts": [
        {
          "key": "no_medications",
          "value": "true",
          "evidence": "I don’t take any regular medication"
        },
        {
          "key": "active_management",
          "value": "false",
          "evidence": "I’m not seeing my GP for anything at the moment"
        },
        {
          "key": "operation",
          "value": "Appendix removed when younger",
          "evidence": "I had my appendix removed when I was younger"
        },
        {
          "key": "family_history",
          "value": "Mother had breast cancer at 42",
          "evidence": "My mum had breast cancer when she was 42"
        },
        {
          "key": "family_history",
          "value": "Father has high blood pressure",
          "evidence": "My dad has high blood pressure"
        },
        {
          "key": "goal",
          "value": "Understand which health checks to discuss as I get older",
          "evidence": "make sure I’m healthy and understand whether there’s anything I should be checking as I get older"
        }
      ]
    },
    "intro": "Emma, your family history and the checks you would like to understand are the starting point for this example plan.",
    "actions": [
      {
        "id": "familyCancer",
        "title": "Talk through your family cancer history",
        "idea": "Tell your GP about the cancer in your family. If you can, note who was affected, the type of cancer and their age at diagnosis.",
        "reason": "Because you mentioned cancer in your family.",
        "context": "My mum had breast cancer when she was 42, which is something I worry about",
        "step": "Tell your GP about the cancer in your family. If you can, note who was affected, the type of cancer and their age at diagnosis.",
        "uncertainty": "This alone does not tell us your risk or whether you need extra screening or genetic testing.",
        "systems": [],
        "sources": [
          {
            "url": "https://digital.nhs.uk/ndrs/patients/family-history-of-cancer",
            "title": "Family history of cancer",
            "publisher": "NHS"
          },
          {
            "url": "https://www.genomicseducation.hee.nhs.uk/genotes/in-the-clinic/presentation-patient-with-a-family-history-of-cancer/",
            "title": "Understanding a cancer family history",
            "publisher": "NHS"
          }
        ]
      },
      {
        "id": "goal",
        "title": "Choose one step you can repeat",
        "idea": "Choose one action that matters to you. Decide when and where you will try it, and what support would help.",
        "reason": "Built around what matters to you.",
        "context": "I’d mainly like to make sure I’m healthy and understand whether there’s anything I should be checking as I get older.",
        "step": "Choose one action that matters to you. Decide when and where you will try it, and what support would help.",
        "uncertainty": "You can change your goal as you learn what works for you. You do not need to do everything at once.",
        "systems": [],
        "sources": [
          {
            "url": "https://www.nice.org.uk/guidance/ph49/chapter/recommendations",
            "title": "PH49 · Behaviour change: individual approaches",
            "publisher": "NICE"
          }
        ]
      }
    ],
    "followUp": "Would you prefer an in-person assessment or a video appointment?",
    "uncertainty": "A prepared fictional example, not a health assessment. Suitability and screening decisions stay with your clinician.",
    "recommendations": {
      "version": "1.0",
      "jurisdiction": "England",
      "primary": {
        "id": "reassured",
        "title": "Be.Reassured",
        "trigger": "You want GP-led or comprehensive prevention, or shared relevant medical or family history.",
        "explanation": "An option to discuss with Bupa, subject to suitability and availability. This does not replace care for an existing condition.",
        "status": "suggested",
        "clinicianReview": true,
        "authority": "Bupa",
        "sourceUrl": "https://www.bupa.co.uk/health/health-assessments",
        "ruleVersion": "1.0",
        "jurisdiction": "England",
        "sourceUpdatedAt": null,
        "lastVerifiedAt": "2026-09-18"
      },
      "optional": [
        {
          "id": "breast_option",
          "title": "Breast health pathway",
          "trigger": "Breast cancer in the family.",
          "explanation": "NICE familial-risk review comes before private imaging selection.",
          "status": "conditional",
          "clinicianReview": true,
          "authority": "Bupa",
          "sourceUrl": "https://www.bupa.co.uk/health/health-assessments/tests",
          "ruleVersion": "1.0",
          "jurisdiction": "England",
          "sourceUpdatedAt": null,
          "lastVerifiedAt": "2026-09-18",
          "availableWithSelectedProduct": true
        }
      ],
      "nhs": [],
      "nice": [
        {
          "id": "qrisk3",
          "title": "Formal cardiovascular risk review",
          "trigger": "Age 25–84; no established CVD was reported.",
          "explanation": "A clinician can confirm suitability and use QRISK3 with a complete history. This app does not calculate your risk.",
          "status": "confirm_suitability",
          "clinicianReview": true,
          "authority": "NICE",
          "sourceUrl": "https://www.nice.org.uk/guidance/ng238/chapter/recommendations",
          "ruleVersion": "1.0",
          "jurisdiction": "England",
          "sourceUpdatedAt": null,
          "lastVerifiedAt": "2026-09-18"
        },
        {
          "id": "familial_breast",
          "title": "Familial breast-cancer review",
          "trigger": "Mother had breast cancer at 42 Father has high blood pressure",
          "explanation": "Record affected relatives on both sides, cancer types and ages at diagnosis. A clinician applies NICE referral criteria before considering imaging; family history alone does not mean a mammogram is needed.",
          "status": "family_history_review",
          "clinicianReview": true,
          "authority": "NICE",
          "sourceUrl": "https://www.nice.org.uk/guidance/cg164/chapter/recommendations",
          "ruleVersion": "1.0",
          "jurisdiction": "England",
          "sourceUpdatedAt": null,
          "lastVerifiedAt": "2026-09-18"
        }
      ],
      "followUps": [
        "Would you prefer an in-person assessment or a video appointment?"
      ],
      "uncertainties": [
        "Conflicting family history details; please confirm.",
        "Screening eligibility and recall depend on confirmed history. Private options do not replace NHS programmes."
      ],
      "status": "prevention"
    }
  }
};
