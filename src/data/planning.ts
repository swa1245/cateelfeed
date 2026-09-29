import { weekApprovals, weekFormula, weekNutrients, weekPlans } from "@/data/history";

export type PlanRow = {
  id: string;
  date: string;
  shift: string;
  product: string;
  planMt: string;
  batchMt: string;
  batches: string;
  form: string;
  status: string;
  remarks: string;
};

export type FormulaStatus = "Draft" | "Approved" | "Superseded";

export type FormulaRow = {
  id: string;
  date: string;
  product: string;
  material: string;
  inclusion: string;
  kgPerMt: string;
  remarks: string;
  version: string;
  effectiveFrom: string;
  status: FormulaStatus;
};

export type NutrientRow = {
  id: string;
  date: string;
  product: string;
  nutrient: string;
  target: string;
  min: string;
  max: string;
  unit: string;
  basis: string;
  mandatory: string;
  status: string;
  version: string;
};

export type ApprovalEvent = {
  id: string;
  sheet: "formula" | "nutrient";
  product: string;
  version: string;
  action: string;
  at: string;
  note: string;
};

export const PLAN_STATUSES = ["Draft", "Released", "Running", "Done"] as const;
export const FEED_FORMS = ["Pellet", "Mash"] as const;
export const FORMULA_STATUSES = ["Draft", "Approved", "Superseded"] as const;
export const NUTRIENT_UNITS = ["%", "ppm", "ppb"] as const;
export const NUTRIENT_BASIS = ["As-fed", "Dry matter"] as const;
export const YES_NO = ["Yes", "No"] as const;
export const NUTRIENT_NAMES = [
  "Crude protein",
  "Crude fat",
  "Crude fibre",
  "Ash",
  "Calcium",
  "Phosphorus",
  "Moisture",
] as const;

const PLAN_KEY = "catelfeed_plan_w7";
const FORMULA_KEY = "catelfeed_formula_w7";
const NUTRIENT_KEY = "catelfeed_nutrient_w7";
const APPROVAL_KEY = "catelfeed_plan_approvals_w7";
const NUTRIENT_CARD_KEY = "catelfeed_nutrient_card_v1";

function read<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

function write<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function stampFormula(row: FormulaRow): FormulaRow {
  const inclusion = String(row.inclusion ?? "");
  return {
    ...row,
    version: row.version || "1",
    effectiveFrom: row.effectiveFrom || row.date,
    status: row.status || "Approved",
    kgPerMt: ((Number(inclusion) || 0) * 10).toFixed(1),
  };
}

function stampNutrient(row: NutrientRow): NutrientRow {
  return {
    ...row,
    unit: row.unit || "%",
    basis: row.basis || "As-fed",
    mandatory: row.mandatory || "No",
    status: row.status || "Approved",
    version: row.version || "1",
  };
}

export function listPlans() {
  return read<PlanRow>(PLAN_KEY, weekPlans());
}

export function savePlans(rows: PlanRow[]) {
  write(PLAN_KEY, rows);
}

export function listFormula() {
  return read<FormulaRow>(FORMULA_KEY, weekFormula()).map(stampFormula);
}

export function saveFormula(rows: FormulaRow[]) {
  write(FORMULA_KEY, rows);
}

export function listNutrients() {
  return read<NutrientRow>(NUTRIENT_KEY, weekNutrients()).map(stampNutrient);
}

export function saveNutrients(rows: NutrientRow[]) {
  write(NUTRIENT_KEY, rows);
}

export function nextPlanId(prefix: string, rows: { id: string }[]) {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.id).replace(/\D/g, ""));
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 2400);
  return `${prefix}-${n + 1}`;
}

export type BatchCheck = {
  plan: number;
  batch: number;
  count: number;
  batchQty: number;
  gap: number;
  fullBatches: number;
  remainder: number;
  shortFinal: boolean;
  mismatch: boolean;
};

function qty(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function checkBatch(row: Pick<PlanRow, "planMt" | "batchMt" | "batches">): BatchCheck {
  const plan = qty(row.planMt);
  const batch = qty(row.batchMt);
  const count = qty(row.batches);
  const batchQty = batch * count;
  const gap = batchQty - plan;
  const fullBatches = batch > 0 ? Math.floor((plan + 0.0001) / batch) : 0;
  const covered = fullBatches * batch;
  const remainder = plan > covered ? plan - covered : 0;
  const shortFinal = batch > 0 && remainder > 0.05 && remainder < batch - 0.05;
  const mismatch = plan > 0 && batch > 0 && Math.abs(gap) > 0.05;
  return { plan, batch, count, batchQty, gap, fullBatches, remainder, shortFinal, mismatch };
}

export function suggestBatchCount(planMt: string, batchMt: string) {
  const plan = qty(planMt);
  const batch = qty(batchMt);
  if (plan <= 0 || batch <= 0) return "";
  return String(Math.ceil(plan / batch - 1e-9));
}

export type GradeSpec = {
  product: string;
  nutrient: string;
  target: string;
  min: string;
  max: string;
  unit: string;
  basis: string;
  mandatory: string;
};

const GRADE_CARD: GradeSpec[] = [
  ["cf-700", "Crude protein", "16.5", "16.0", "18.0", "Yes"],
  ["cf-700", "Crude fat", "4.5", "3.5", "6.0", "Yes"],
  ["cf-700", "Crude fibre", "6.0", "0.0", "8.0", "Yes"],
  ["cf-700", "Ash", "8.0", "0.0", "10.0", "Yes"],
  ["cf-700", "Calcium", "0.9", "0.8", "1.2", "Yes"],
  ["cf-700", "Phosphorus", "0.7", "0.5", "1.0", "Yes"],
  ["cf-700", "Moisture", "11.0", "0.0", "11.0", "Yes"],
  ["cf-900", "Crude protein", "20.0", "18.0", "22.0", "Yes"],
  ["cf-900", "Crude fat", "5.5", "4.0", "7.0", "Yes"],
  ["cf-900", "Crude fibre", "7.0", "0.0", "10.0", "Yes"],
  ["cf-900", "Calcium", "1.0", "0.8", "1.4", "Yes"],
  ["cf-900", "Phosphorus", "0.8", "0.5", "1.1", "Yes"],
  ["cf-900", "Moisture", "11.0", "0.0", "11.0", "Yes"],
  ["cf-500", "Crude protein", "18.0", "16.0", "20.0", "Yes"],
  ["cf-500", "Crude fat", "3.5", "2.5", "5.0", "Yes"],
  ["cf-500", "Crude fibre", "8.0", "0.0", "12.0", "Yes"],
  ["cf-500", "Calcium", "0.8", "0.6", "1.2", "Yes"],
  ["cf-500", "Phosphorus", "0.6", "0.4", "0.9", "Yes"],
  ["cf-500", "Moisture", "11.0", "0.0", "11.0", "Yes"],
].map(([product, nutrientName, target, min, max, mandatory]) => ({
  product,
  nutrient: nutrientName,
  target,
  min,
  max,
  unit: "%",
  basis: "As-fed",
  mandatory,
}));

export function nutrientCard() {
  return read<GradeSpec>(NUTRIENT_CARD_KEY, GRADE_CARD);
}

export function saveNutrientCard(rows: GradeSpec[]) {
  write(NUTRIENT_CARD_KEY, rows);
}

export function specFor(product: string, nutrientName: string) {
  return nutrientCard().find((row) => row.product === product && row.nutrient === nutrientName);
}

export function mandatoryMissing(product: string, rows: NutrientRow[]) {
  const have = new Set(rows.filter((row) => row.product === product).map((row) => row.nutrient));
  return nutrientCard().filter((row) => row.product === product && row.mandatory === "Yes" && !have.has(row.nutrient));
}

export type NutrientOrderIssue = "ok" | "order" | "off-card";

export function nutrientIssue(row: NutrientRow): NutrientOrderIssue {
  const min = qty(row.min);
  const target = qty(row.target);
  const max = qty(row.max);
  if (row.min.trim() && row.target.trim() && row.max.trim() && !(min <= target && target <= max)) return "order";
  const spec = specFor(row.product, row.nutrient);
  if (!spec) return "ok";
  const same =
    row.target.trim() === spec.target &&
    row.min.trim() === spec.min &&
    row.max.trim() === spec.max &&
    (row.unit || "%") === spec.unit &&
    (row.basis || "As-fed") === spec.basis;
  return same ? "ok" : "off-card";
}

/** Mill-book nutrient content of each ingredient, percent as-fed. */
const BOOK: Record<string, Record<string, number>> = {
  maize: { "Crude protein": 9, "Crude fat": 4, "Crude fibre": 2.5, Ash: 1.5, Calcium: 0.02, Phosphorus: 0.3, Moisture: 12 },
  "oil-cake": { "Crude protein": 40, "Crude fat": 8, "Crude fibre": 12, Ash: 7, Calcium: 0.2, Phosphorus: 0.6, Moisture: 10 },
  "rice-polish": { "Crude protein": 13, "Crude fat": 15, "Crude fibre": 8, Ash: 10, Calcium: 0.08, Phosphorus: 1.4, Moisture: 10 },
  "wheat-bran": { "Crude protein": 15, "Crude fat": 4, "Crude fibre": 11, Ash: 6, Calcium: 0.15, Phosphorus: 1.1, Moisture: 11 },
  dorb: { "Crude protein": 14, "Crude fat": 1.5, "Crude fibre": 12, Ash: 10, Calcium: 0.1, Phosphorus: 1.5, Moisture: 10 },
  limestone: { "Crude protein": 0, "Crude fat": 0, "Crude fibre": 0, Ash: 98, Calcium: 38, Phosphorus: 0, Moisture: 1 },
  salt: { "Crude protein": 0, "Crude fat": 0, "Crude fibre": 0, Ash: 99, Calcium: 0, Phosphorus: 0, Moisture: 1 },
  premix: { "Crude protein": 0, "Crude fat": 0, "Crude fibre": 0, Ash: 80, Calcium: 15, Phosphorus: 8, Moisture: 5 },
  molasses: { "Crude protein": 4, "Crude fat": 0, "Crude fibre": 0, Ash: 10, Calcium: 0.8, Phosphorus: 0.1, Moisture: 25 },
};

export function analyseFormula(rows: FormulaRow[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const share = qty(row.inclusion) / 100;
    const book = BOOK[row.material];
    if (!book || share <= 0) continue;
    for (const [nutrientName, pct] of Object.entries(book)) {
      totals.set(nutrientName, (totals.get(nutrientName) || 0) + share * pct);
    }
  }
  return [...totals.entries()].map(([nutrientName, value]) => ({ nutrient: nutrientName, value }));
}

export function listApprovals() {
  return read<ApprovalEvent>(APPROVAL_KEY, weekApprovals());
}

export function logApproval(event: Omit<ApprovalEvent, "id" | "at">) {
  const rows = listApprovals();
  const next: ApprovalEvent = {
    ...event,
    id: nextPlanId("AP", rows),
    at: new Date().toISOString(),
  };
  write(APPROVAL_KEY, [next, ...rows].slice(0, 40));
  return next;
}

export function approvedFormula(product: string, date: string, rows = listFormula()) {
  const versions = rows.filter(
    (row) => row.product === product && row.status === "Approved" && (row.effectiveFrom || row.date) <= date,
  );
  if (!versions.length) return [];
  const latest = versions.reduce((best, row) => ((row.effectiveFrom || row.date) > (best.effectiveFrom || best.date) ? row : best));
  return versions.filter((row) => row.version === latest.version && (row.effectiveFrom || row.date) === (latest.effectiveFrom || latest.date));
}

export function formulaProblems(rows: FormulaRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.material) continue;
    const key = `${row.product}::${row.version || "1"}::${row.material}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return rows.map((row) => {
    const missing = !row.material.trim() || !row.inclusion.trim();
    const inclusion = qty(row.inclusion);
    const invalid = row.inclusion.trim() !== "" && (inclusion < 0 || inclusion > 100);
    const duplicate = (counts.get(`${row.product}::${row.version || "1"}::${row.material}`) || 0) > 1;
    return { id: row.id, missing, invalid, duplicate };
  });
}
