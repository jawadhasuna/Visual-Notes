/**
 * Demo payload for the front end.
 *
 * The sample note is the SYNTHETIC case published in the study's
 * Multimedia Appendix 1 (Table S1) — created by the research team purely
 * to illustrate the format. No credentialed PhysioNet text is stored in
 * this repository, and none should ever be committed to it.
 */

export type LaneId = "resp" | "hem" | "neuro" | "id" | "gu";

export type Lane = {
  id: LaneId;
  label: string;
  abbr: string;
  /** Categorical lane colour — data, not brand chrome. */
  color: string;
};

export type Route = "IV" | "PO" | "NEB" | "GTT" | "O2" | "NIV" | null;

export type LaneNode = {
  lane: LaneId;
  shift: number;
  finding: string;
  intervention?: string;
  orders?: string;
  route?: Route;
};

export type VisualNote = {
  admission: string[];
  outcome: string[];
  lanes: Lane[];
  nodes: LaneNode[];
};

export const LANES: Lane[] = [
  { id: "resp", label: "Respiratory", abbr: "Resp", color: "#d9556e" },
  { id: "hem", label: "Hemodynamic", abbr: "Hem", color: "#dd8a3a" },
  { id: "neuro", label: "Neurological", abbr: "Neuro", color: "#8b6fd1" },
  { id: "id", label: "Infectious Disease", abbr: "ID", color: "#2fa86b" },
  { id: "gu", label: "Genitourinary", abbr: "GU", color: "#3b8fd4" },
];

export const SAMPLE_NOTE = `START_OF_RECORD=synthetic_case_001||||1||||
68 yo female admitted from ED with acute shortness of breath, fever, and low blood pressure. CXR concerning for RLL pneumonia. Started on oxygen by face mask, IV fluids, ceftriaxone, azithromycin, and low-dose norepinephrine. Foley placed. Patient anxious but follows commands.
||||END_OF_RECORD

START_OF_RECORD=synthetic_case_001||||2||||
Overnight patient became more tachypneic with increasing oxygen requirement. Placed on BiPAP with improved work of breathing. BP improved after fluids and norepinephrine was weaned off. Urine output adequate. Patient remains febrile.
||||END_OF_RECORD

START_OF_RECORD=synthetic_case_001||||3||||
Patient tolerated transition from BiPAP to nasal cannula. Afebrile this shift. Ambulated to chair with assistance. Foley removed. Eating small amounts. Antibiotics continued.
||||END_OF_RECORD

START_OF_RECORD=synthetic_case_001||||4||||
Patient stable on room air, denies shortness of breath, tolerating diet, ambulating with walker. Discharged home with oral antibiotics and follow-up with PCP.
||||END_OF_RECORD`;

export const DEMO_RESULT: VisualNote = {
  admission: [
    "68F admitted from ED",
    "Acute SOB, fever, hypotension",
    "CXR: right lower lobe pneumonia",
  ],
  outcome: [
    "Discharged home",
    "Stable on room air, tolerating diet",
    "Oral antibiotics, PCP follow-up",
  ],
  lanes: LANES,
  nodes: [
    // Respiratory
    {
      lane: "resp",
      shift: 1,
      finding: "Acute shortness of breath; RLL pneumonia on CXR",
      intervention: "Oxygen by face mask",
      orders: "FACE MASK O2, CXR",
      route: "O2",
    },
    {
      lane: "resp",
      shift: 2,
      finding: "More tachypneic; rising oxygen requirement",
      intervention: "BiPAP started, work of breathing improved",
      orders: "NON-INVASIVE VENTILATION",
      route: "NIV",
    },
    {
      lane: "resp",
      shift: 3,
      finding: "Tolerated transition off BiPAP",
      intervention: "Weaned to nasal cannula",
      orders: "NASAL CANNULA",
      route: "O2",
    },
    {
      lane: "resp",
      shift: 4,
      finding: "Stable on room air; denies shortness of breath",
      intervention: "Supplemental oxygen discontinued",
      orders: "ROOM AIR",
      route: null,
    },

    // Hemodynamic
    {
      lane: "hem",
      shift: 1,
      finding: "Hypotension on admission",
      intervention: "IV fluids and low-dose norepinephrine",
      orders: "IV FLUIDS, NOREPINEPHRINE GTT",
      route: "GTT",
    },
    {
      lane: "hem",
      shift: 2,
      finding: "Blood pressure improved after fluid resuscitation",
      intervention: "Norepinephrine weaned off",
      orders: "PRESSOR DISCONTINUED",
      route: "GTT",
    },

    // Neurological
    {
      lane: "neuro",
      shift: 1,
      finding: "Anxious; follows commands",
      intervention: "Reassurance and orientation",
      orders: "NEURO CHECKS",
      route: null,
    },
    {
      lane: "neuro",
      shift: 3,
      finding: "Ambulated to chair with assistance",
      intervention: "Mobility as tolerated; eating small amounts",
      orders: "OUT OF BED, DIET ADVANCED",
      route: null,
    },
    {
      lane: "neuro",
      shift: 4,
      finding: "Ambulating with walker; tolerating diet",
      intervention: "Discharge mobility plan",
      orders: "PT/OT, DISCHARGE PLANNING",
      route: null,
    },

    // Infectious disease
    {
      lane: "id",
      shift: 1,
      finding: "Febrile; right lower lobe pneumonia",
      intervention: "Ceftriaxone and azithromycin started",
      orders: "CEFTRIAXONE IV, AZITHROMYCIN IV",
      route: "IV",
    },
    {
      lane: "id",
      shift: 2,
      finding: "Remains febrile",
      intervention: "Antibiotics continued",
      orders: "ANTIBIOTICS IV",
      route: "IV",
    },
    {
      lane: "id",
      shift: 3,
      finding: "Afebrile this shift",
      intervention: "Antibiotics continued",
      orders: "ANTIBIOTICS IV",
      route: "IV",
    },
    {
      lane: "id",
      shift: 4,
      finding: "Afebrile; infection resolving",
      intervention: "Transitioned to oral antibiotics",
      orders: "ORAL ANTIBIOTICS",
      route: "PO",
    },

    // Genitourinary
    {
      lane: "gu",
      shift: 1,
      finding: "Foley catheter placed",
      intervention: "Hourly urine output monitoring",
      orders: "FOLEY CATHETER, STRICT I&O",
      route: null,
    },
    {
      lane: "gu",
      shift: 2,
      finding: "Urine output adequate",
      intervention: "Continue intake and output",
      orders: "STRICT I&O",
      route: null,
    },
    {
      lane: "gu",
      shift: 3,
      finding: "Foley removed",
      intervention: "Voiding trial",
      orders: "FOLEY DISCONTINUED",
      route: null,
    },
  ],
};

export const SHIFTS = [1, 2, 3, 4];
