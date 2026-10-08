import type { BloodReport } from './blood-results';

// Exact supplied CSV values; strings preserve qualifiers, precision and units.
// Synthetic data only. No ranges, dates or interpretations were supplied.
export const emmaBloodReport: BloodReport = {
  "patient": "Emma Thompson",
  "age": 35,
  "sex": "Female",
  "demo": true,
  "sourceFile": "mock_normal_patient_blood_results.csv",
  "sourceSha256": "29f812442fd5e53699a88da4e5ab0f91668bab205118eb851fc881e923d56f50",
  "results": [
    {
      "id": "emma-blood-01",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "WBC",
      "value": "6.1",
      "units": "K/µL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-02",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "RBC",
      "value": "4.45",
      "units": "M/µL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-03",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Haemoglobin",
      "value": "13.4",
      "units": "g/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-04",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Haematocrit",
      "value": "41.0",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-05",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "MCV",
      "value": "92",
      "units": "fL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-06",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "MCH",
      "value": "30.1",
      "units": "pg",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-07",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "MCHC",
      "value": "32.7",
      "units": "g/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-08",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "RDW",
      "value": "13.0",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-09",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Platelets",
      "value": "245",
      "units": "K/µL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-10",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "MPV",
      "value": "9.8",
      "units": "fL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-11",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Reticulocytes",
      "value": "1.2",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-12",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Iron",
      "value": "92",
      "units": "µg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-13",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "TIBC",
      "value": "310",
      "units": "µg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-14",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Ferritin",
      "value": "72",
      "units": "ng/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-15",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Iron saturation",
      "value": "30",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-16",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Vitamin B12",
      "value": "620",
      "units": "pg/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-17",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Folate",
      "value": "16.0",
      "units": "ng/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-18",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Vitamin D",
      "value": "42",
      "units": "ng/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-19",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Magnesium, RBC",
      "value": "5.1",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-20",
      "system": "blood",
      "category": "Blood & nutrition",
      "biomarker": "Zinc",
      "value": "91",
      "units": "µg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-21",
      "system": "immune",
      "category": "Immune",
      "biomarker": "Neutrophils",
      "value": "58",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-22",
      "system": "immune",
      "category": "Immune",
      "biomarker": "Lymphocytes",
      "value": "31",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-23",
      "system": "immune",
      "category": "Immune",
      "biomarker": "Monocytes",
      "value": "7",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-24",
      "system": "immune",
      "category": "Immune",
      "biomarker": "Eosinophils",
      "value": "3",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-25",
      "system": "immune",
      "category": "Immune",
      "biomarker": "Basophils",
      "value": "1",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-26",
      "system": "heart",
      "category": "Heart",
      "biomarker": "Total cholesterol",
      "value": "168",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-27",
      "system": "heart",
      "category": "Heart",
      "biomarker": "LDL-C",
      "value": "82",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-28",
      "system": "heart",
      "category": "Heart",
      "biomarker": "HDL-C",
      "value": "70",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-29",
      "system": "heart",
      "category": "Heart",
      "biomarker": "Triglycerides",
      "value": "62",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-30",
      "system": "heart",
      "category": "Heart",
      "biomarker": "Chol/HDL ratio",
      "value": "2.4",
      "units": "ratio",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-31",
      "system": "heart",
      "category": "Heart",
      "biomarker": "ApoB",
      "value": "72",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-32",
      "system": "heart",
      "category": "Heart",
      "biomarker": "ApoA1",
      "value": "175",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-33",
      "system": "heart",
      "category": "Heart",
      "biomarker": "Lipoprotein(a)",
      "value": "14",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-34",
      "system": "heart",
      "category": "Heart",
      "biomarker": "hs-CRP",
      "value": "0.4",
      "units": "mg/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-35",
      "system": "heart",
      "category": "Heart",
      "biomarker": "Homocysteine",
      "value": "7.5",
      "units": "µmol/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-36",
      "system": "heart",
      "category": "Heart",
      "biomarker": "CoQ10",
      "value": "1.1",
      "units": "µg/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-37",
      "system": "heart",
      "category": "Heart",
      "biomarker": "OmegaCheck EPA+DPA+DHA",
      "value": "6.2",
      "units": "% by wt",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-38",
      "system": "heart",
      "category": "Heart",
      "biomarker": "EPA",
      "value": "0.8",
      "units": "% by wt",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-39",
      "system": "heart",
      "category": "Heart",
      "biomarker": "DPA",
      "value": "1.1",
      "units": "% by wt",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-40",
      "system": "heart",
      "category": "Heart",
      "biomarker": "DHA",
      "value": "4.3",
      "units": "% by wt",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-41",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "Fasting glucose",
      "value": "86",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-42",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "HbA1c",
      "value": "5.2",
      "units": "%",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-43",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "Fasting insulin",
      "value": "5.5",
      "units": "µIU/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-44",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "TSH",
      "value": "1.8",
      "units": "µIU/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-45",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "Free T4",
      "value": "1.25",
      "units": "ng/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-46",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "Free T3",
      "value": "3.1",
      "units": "pg/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-47",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "Reverse T3",
      "value": "17",
      "units": "ng/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-48",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "TPO antibodies",
      "value": "8",
      "units": "IU/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-49",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "Thyroglobulin antibodies",
      "value": "12",
      "units": "IU/mL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-50",
      "system": "metabolic",
      "category": "Hormones",
      "biomarker": "Cortisol, morning",
      "value": "13.5",
      "units": "µg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-51",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "FSH",
      "value": "6.8",
      "units": "mIU/mL",
      "notes": "Synthetic demo, early follicular phase"
    },
    {
      "id": "emma-blood-52",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "LH",
      "value": "7.2",
      "units": "mIU/mL",
      "notes": "Synthetic demo, early follicular phase"
    },
    {
      "id": "emma-blood-53",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "Oestradiol",
      "value": "85",
      "units": "pg/mL",
      "notes": "Synthetic demo, early follicular phase"
    },
    {
      "id": "emma-blood-54",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "Progesterone",
      "value": "0.8",
      "units": "ng/mL",
      "notes": "Synthetic demo, early follicular phase"
    },
    {
      "id": "emma-blood-55",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "DHEA-S",
      "value": "190",
      "units": "µg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-56",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "Total testosterone",
      "value": "27",
      "units": "ng/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-57",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "Free testosterone",
      "value": "0.35",
      "units": "ng/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-58",
      "system": "reproductive",
      "category": "Sexual health",
      "biomarker": "SHBG",
      "value": "72",
      "units": "nmol/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-59",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "Creatinine",
      "value": "0.75",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-60",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "eGFR",
      "value": "105",
      "units": "mL/min",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-61",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "BUN",
      "value": "14",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-62",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "Sodium",
      "value": "140",
      "units": "mmol/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-63",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "Potassium",
      "value": "4.2",
      "units": "mmol/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-64",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "Chloride",
      "value": "102",
      "units": "mmol/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-65",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "CO₂",
      "value": "25",
      "units": "mmol/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-66",
      "system": "kidneys",
      "category": "Kidneys & urinary",
      "biomarker": "Uric acid",
      "value": "4.1",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-67",
      "system": "liver",
      "category": "Liver",
      "biomarker": "ALT",
      "value": "16",
      "units": "U/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-68",
      "system": "liver",
      "category": "Liver",
      "biomarker": "AST",
      "value": "19",
      "units": "U/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-69",
      "system": "liver",
      "category": "Liver",
      "biomarker": "ALP",
      "value": "58",
      "units": "U/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-70",
      "system": "liver",
      "category": "Liver",
      "biomarker": "Bilirubin",
      "value": "0.6",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-71",
      "system": "liver",
      "category": "Liver",
      "biomarker": "Albumin",
      "value": "4.5",
      "units": "g/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-72",
      "system": "liver",
      "category": "Liver",
      "biomarker": "Total protein",
      "value": "7.0",
      "units": "g/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-73",
      "system": "muscles",
      "category": "Muscles, bones & joints",
      "biomarker": "Calcium",
      "value": "9.4",
      "units": "mg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-74",
      "system": "muscles",
      "category": "Muscles, bones & joints",
      "biomarker": "CK",
      "value": "95",
      "units": "U/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-75",
      "system": "whole",
      "category": "Whole person",
      "biomarker": "Lead",
      "value": "<1.0",
      "units": "µg/dL",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-76",
      "system": "whole",
      "category": "Whole person",
      "biomarker": "Arsenic",
      "value": "3",
      "units": "µg/L",
      "notes": "Synthetic demo result"
    },
    {
      "id": "emma-blood-77",
      "system": "whole",
      "category": "Whole person",
      "biomarker": "Mercury",
      "value": "2.0",
      "units": "µg/L",
      "notes": "Synthetic demo result"
    }
  ]
};
