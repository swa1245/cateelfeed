import { weekFinishQc, weekProcessQc, weekRawQc, weekSamples } from "@/data/history";
import { recentDates } from "@/data/movements";

export const QC_DECISIONS = ["Pending", "Pass", "Hold", "Reject"] as const;
export const QC_SHIFTS = ["A", "B", "C", "Lab"] as const;
export const PROCESS_STAGES = ["Mixing", "Conditioning", "Pelleting", "Cooling"] as const;
export const FEED_TYPES = ["Type I", "Type II"] as const;
export const FEED_FORMS = ["Pellet", "Mash"] as const;
export const SAMPLE_TYPES = ["Raw material", "In-process", "Finished feed", "Retest"] as const;
export const SAMPLE_STATUS = ["Collected", "Received", "Testing", "Awaiting review", "Released", "Retained", "Disposed"] as const;
export const OBSERVE = ["Ok", "Fail", "Not applicable"] as const;
export const PELLET_RESULTS = ["Pass", "Fail", "Not applicable"] as const;
export const LOT_RELEASE = ["Sample only", "Lot confirmed"] as const;
export const REASON_CODES = ["", "Moisture", "Protein", "Fat", "Fibre", "Aflatoxin B1", "Physical", "Foreign matter", "Infestation", "Specification", "Other"] as const;
export const TEMP_POINTS = ["Mash bin", "Conditioner", "Pellet discharge", "Cooler outlet"] as const;
export const TEST_STATUS = ["Pending", "Pass", "Fail", "Not applicable"] as const;

/** BIS IS 2052:2023 figures already used on the QC board. Other limits are the mill card. */
export const BIS_LIMITS = [
  { check: "Moisture %", typeI: "11 max", typeII: "11 max" },
  { check: "Crude protein %", typeI: "22 min", typeII: "20 min" },
  { check: "Aflatoxin B1 (ppb)", typeI: "20 max", typeII: "20 max" },
] as const;

type Row = { id: string; date: string };

export type RawQcRow = Row & {
  sampleNo: string;
  shift: string;
  material: string;
  supplier: string;
  moisture: string;
  cp: string;
  fat: string;
  fibre: string;
  aflatoxin: string;
  colour: string;
  odour: string;
  foreignMatter: string;
  infestation: string;
  fungal: string;
  packaging: string;
  decision: string;
  reasonCode: string;
  remarks: string;
  gateRef: string;
  supplierLot: string;
  internalLot: string;
  collectedAt: string;
  sampleLocation: string;
  sampleQty: string;
  method: string;
  inspector: string;
  technician: string;
  coaRef: string;
  retestDate: string;
  retestResult: string;
  lotRelease: string;
};

export type ProcessQcRow = Row & {
  batchNo: string;
  shift: string;
  stage: string;
  moisture: string;
  durability: string;
  fines: string;
  temp: string;
  decision: string;
  remarks: string;
  orderNo: string;
  sampleNo: string;
  product: string;
  formulaVersion: string;
  line: string;
  machine: string;
  sampleAt: string;
  testAt: string;
  moistureMin: string;
  moistureMax: string;
  tempPoint: string;
  operator: string;
  inspector: string;
  reviewer: string;
  corrective: string;
  retestRef: string;
};

export type FinishQcRow = Row & {
  batchNo: string;
  shift: string;
  product: string;
  feedType: string;
  form: string;
  moisture: string;
  cp: string;
  fat: string;
  fibre: string;
  aia: string;
  salt: string;
  calcium: string;
  phosphorus: string;
  availableP: string;
  urea: string;
  vitaminA: string;
  vitaminD3: string;
  vitaminE: string;
  aflatoxin: string;
  pellet: string;
  durability: string;
  fines: string;
  decision: string;
  reasonCode: string;
  orderNo: string;
  formulaVersion: string;
  mfgDate: string;
  sampleNo: string;
  sampleAt: string;
  method: string;
  testStatus: string;
  reviewer: string;
  retestRef: string;
  coaRef: string;
};

export type SampleRow = Row & {
  sampleNo: string;
  shift: string;
  source: string;
  ref: string;
  drawnFrom: string;
  retainQty: string;
  storage: string;
  retainUntil: string;
  disposal: string;
  status: string;
  collectedAt: string;
  receivedAt: string;
  collectedBy: string;
  receivedBy: string;
  method: string;
  increments: string;
  sampleQty: string;
  sealNo: string;
};

const RAW_KEY = "catelfeed_qc_raw_w7";
const PROCESS_KEY = "catelfeed_qc_process_w7";
const FINISH_KEY = "catelfeed_qc_finish_w7";
const SAMPLE_KEY = "catelfeed_qc_samples_w7";

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

function ensureRecent<T extends { id: string; date: string }>(key: string, rows: T[], fresh: T[]) {
  const ids = new Set(rows.map((row) => row.id));
  const covered = new Set(rows.map((row) => row.date));
  const window = new Set(recentDates(7));
  const extra = fresh.filter((row) => window.has(row.date) && !covered.has(row.date) && !ids.has(row.id));
  if (!extra.length) return rows;
  const next = [...rows, ...extra];
  write(key, next);
  return next;
}

export function nextQcId(prefix: string, rows: { id: string }[]) {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.id).split("-")[1]);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 1000);
  return `${prefix}-${n + 1}`;
}

export function nextSampleNo(rows: { sampleNo: string }[], kind: "RM" | "PR" | "FF" | "RT") {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.sampleNo).replace(/\D/g, ""));
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 2400);
  return `${kind}-${n + 1}`;
}

function text(value: unknown, fallback = "") {
  return value == null || value === "" ? fallback : String(value);
}

const STAGE_NAMES: Record<string, string> = {
  Mash: "Mixing",
  Conditioner: "Conditioning",
  Pellet: "Pelleting",
  Cooler: "Cooling",
};

const SAMPLE_STATUS_NAMES: Record<string, string> = {
  "In lab": "Testing",
  Rejected: "Disposed",
  Incoming: "Raw material",
  "Finished feed": "Finished feed",
  "In-process": "In-process",
};

function stampRaw(row: Partial<RawQcRow> & { physical?: string }): RawQcRow {
  const physical = text(row.physical);
  const foreign = physical === "Foreign matter" ? "Fail" : physical === "Ok" ? "Ok" : text(row.foreignMatter, "Ok");
  return {
    id: text(row.id),
    date: text(row.date),
    sampleNo: text(row.sampleNo),
    shift: text(row.shift, "A"),
    material: text(row.material),
    supplier: text(row.supplier),
    moisture: text(row.moisture),
    cp: text(row.cp),
    fat: text(row.fat),
    fibre: text(row.fibre),
    aflatoxin: text(row.aflatoxin),
    colour: text(row.colour, physical === "Off colour" ? "Fail" : "Ok"),
    odour: text(row.odour, "Ok"),
    foreignMatter: foreign,
    infestation: text(row.infestation, physical === "Infested" ? "Fail" : "Ok"),
    fungal: text(row.fungal, "Ok"),
    packaging: text(row.packaging, "Ok"),
    decision: text(row.decision, "Pending"),
    reasonCode: text(row.reasonCode),
    remarks: text(row.remarks),
    gateRef: text(row.gateRef),
    supplierLot: text(row.supplierLot),
    internalLot: text(row.internalLot),
    collectedAt: text(row.collectedAt),
    sampleLocation: text(row.sampleLocation),
    sampleQty: text(row.sampleQty),
    method: text(row.method, "Mill lab"),
    inspector: text(row.inspector),
    technician: text(row.technician),
    coaRef: text(row.coaRef),
    retestDate: text(row.retestDate),
    retestResult: text(row.retestResult),
    lotRelease: text(row.lotRelease, "Sample only"),
  };
}

function stampProcess(row: Partial<ProcessQcRow>): ProcessQcRow {
  const stage = STAGE_NAMES[text(row.stage)] || text(row.stage, "Mixing");
  return {
    id: text(row.id),
    date: text(row.date),
    batchNo: text(row.batchNo),
    shift: text(row.shift, "A"),
    stage,
    moisture: text(row.moisture),
    durability: text(row.durability),
    fines: text(row.fines),
    temp: text(row.temp),
    decision: text(row.decision, "Pending"),
    remarks: text(row.remarks),
    orderNo: text(row.orderNo),
    sampleNo: text(row.sampleNo),
    product: text(row.product),
    formulaVersion: text(row.formulaVersion),
    line: text(row.line, "Pellet line 1"),
    machine: text(row.machine),
    sampleAt: text(row.sampleAt),
    testAt: text(row.testAt),
    moistureMin: text(row.moistureMin),
    moistureMax: text(row.moistureMax),
    tempPoint: text(row.tempPoint, stage === "Conditioning" ? "Conditioner" : stage === "Pelleting" ? "Pellet discharge" : stage === "Cooling" ? "Cooler outlet" : "Mash bin"),
    operator: text(row.operator),
    inspector: text(row.inspector),
    reviewer: text(row.reviewer),
    corrective: text(row.corrective),
    retestRef: text(row.retestRef),
  };
}

function stampFinish(row: Partial<FinishQcRow> & { pellet?: string }): FinishQcRow {
  const pellet = text(row.pellet);
  const pelletResult = pellet === "Ok" ? "Pass" : pellet === "Soft" ? "Fail" : pellet || "Pass";
  return {
    id: text(row.id),
    date: text(row.date),
    batchNo: text(row.batchNo),
    shift: text(row.shift, "A"),
    product: text(row.product),
    feedType: text(row.feedType, "Type I"),
    form: text(row.form, "Pellet"),
    moisture: text(row.moisture),
    cp: text(row.cp),
    fat: text(row.fat),
    fibre: text(row.fibre),
    aia: text(row.aia),
    salt: text(row.salt),
    calcium: text(row.calcium),
    phosphorus: text(row.phosphorus),
    availableP: text(row.availableP),
    urea: text(row.urea),
    vitaminA: text(row.vitaminA),
    vitaminD3: text(row.vitaminD3),
    vitaminE: text(row.vitaminE),
    aflatoxin: text(row.aflatoxin),
    pellet: pelletResult,
    durability: text(row.durability),
    fines: text(row.fines),
    decision: text(row.decision, "Pending"),
    reasonCode: text(row.reasonCode),
    orderNo: text(row.orderNo),
    formulaVersion: text(row.formulaVersion),
    mfgDate: text(row.mfgDate, text(row.date)),
    sampleNo: text(row.sampleNo),
    sampleAt: text(row.sampleAt),
    method: text(row.method, "Mill lab"),
    testStatus: text(row.testStatus, "Pending"),
    reviewer: text(row.reviewer),
    retestRef: text(row.retestRef),
    coaRef: text(row.coaRef),
  };
}

function stampSample(row: Partial<SampleRow> & { retain?: string; source?: string }): SampleRow {
  const retain = text(row.retain);
  const source = SAMPLE_STATUS_NAMES[text(row.source)] || text(row.source, "Raw material");
  const status = SAMPLE_STATUS_NAMES[text(row.status)] || text(row.status, "Collected");
  return {
    id: text(row.id),
    date: text(row.date),
    sampleNo: text(row.sampleNo),
    shift: text(row.shift, "A"),
    source,
    ref: text(row.ref),
    drawnFrom: text(row.drawnFrom),
    retainQty: text(row.retainQty, retain === "No" ? "0" : retain === "Yes" ? "500 g" : ""),
    storage: text(row.storage, "Retain cupboard"),
    retainUntil: text(row.retainUntil),
    disposal: text(row.disposal, "Held"),
    status,
    collectedAt: text(row.collectedAt),
    receivedAt: text(row.receivedAt),
    collectedBy: text(row.collectedBy),
    receivedBy: text(row.receivedBy),
    method: text(row.method, "Composite"),
    increments: text(row.increments, "3"),
    sampleQty: text(row.sampleQty, "1 kg"),
    sealNo: text(row.sealNo),
  };
}

function rawSeed(): RawQcRow[] {
  return weekRawQc();
}

function processSeed(): ProcessQcRow[] {
  return weekProcessQc();
}

function finishSeed(): FinishQcRow[] {
  return weekFinishQc();
}

function sampleSeed(): SampleRow[] {
  return weekSamples();
}

export function listRawQc() {
  const seeded = rawSeed();
  return ensureRecent(RAW_KEY, read(RAW_KEY, seeded), seeded).map((row) => stampRaw(row));
}
export function saveRawQc(rows: RawQcRow[]) {
  write(RAW_KEY, rows);
}
export function listProcessQc() {
  const seeded = processSeed();
  return ensureRecent(PROCESS_KEY, read(PROCESS_KEY, seeded), seeded).map((row) => stampProcess(row));
}
export function saveProcessQc(rows: ProcessQcRow[]) {
  write(PROCESS_KEY, rows);
}
export function listFinishQc() {
  const seeded = finishSeed();
  return ensureRecent(FINISH_KEY, read(FINISH_KEY, seeded), seeded).map((row) => stampFinish(row));
}
export function saveFinishQc(rows: FinishQcRow[]) {
  write(FINISH_KEY, rows);
}
export function listSamples() {
  return read(SAMPLE_KEY, sampleSeed()).map((row) => stampSample(row));
}
export function saveSamples(rows: SampleRow[]) {
  write(SAMPLE_KEY, rows);
}

export function pelletMetricsApply(stage: string) {
  return stage === "Pelleting" || stage === "Cooling" || stage === "Pellet" || stage === "Cooler";
}

export function rawChemApplies(material: string, test: "moisture" | "cp" | "fat" | "fibre" | "aflatoxin") {
  const name = material.toLowerCase();
  if (/molasses/.test(name)) return test === "moisture";
  if (/limestone|salt|premix|bag/.test(name)) return test === "moisture";
  return true;
}

export function rawPhysicalApplies(material: string, check: "colour" | "odour" | "foreignMatter" | "infestation" | "fungal" | "packaging") {
  const name = material.toLowerCase();
  if (/molasses/.test(name)) return check === "colour" || check === "odour" || check === "foreignMatter";
  if (/limestone|salt|premix/.test(name)) return check !== "odour" && check !== "fungal";
  return true;
}

export function aflatoxinMax(material: string) {
  return /maize|corn|rice bran|dorb|de-oiled rice/.test(material.toLowerCase()) ? 50 : 20;
}

type Bound = { min?: number; max?: number };

export function finishBound(feedType: string, test: string): Bound | null {
  const typeII = feedType === "Type II";
  const card: Record<string, Bound> = {
    moisture: { max: 11 },
    cp: { min: typeII ? 20 : 22 },
    fat: { min: typeII ? 2.5 : 3 },
    fibre: { max: typeII ? 12 : 10 },
    aia: { max: typeII ? 4 : 3 },
    salt: { max: 2 },
    calcium: { min: 0.5 },
    phosphorus: { min: 0.5 },
    availableP: { min: 0.2 },
    urea: { max: 1 },
    aflatoxin: { max: 20 },
  };
  return card[test] || null;
}

export function finishTestApplies(row: Pick<FinishQcRow, "product" | "form">, test: string) {
  if (test === "vitaminA" || test === "vitaminD3" || test === "vitaminE") return /mineral/i.test(row.product);
  if (test === "urea") return true;
  return true;
}

export function compareResult(value: string, bound: Bound | null) {
  if (!bound) return "Not applicable";
  if (!value.trim()) return "Pending";
  const n = Number(value);
  if (!Number.isFinite(n)) return "Pending";
  if (bound.max != null && n > bound.max) return "Fail";
  if (bound.min != null && n < bound.min) return "Fail";
  return "Pass";
}

export function boundLabel(bound: Bound | null, unit: string) {
  if (!bound) return "Not applicable";
  if (bound.max != null && bound.min != null) return `${bound.min}–${bound.max} ${unit}`;
  if (bound.max != null) return `max ${bound.max} ${unit}`;
  if (bound.min != null) return `min ${bound.min} ${unit}`;
  return unit;
}
