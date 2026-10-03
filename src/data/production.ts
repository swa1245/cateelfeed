import { weekBatchReports, weekBatches, weekDowntime, weekIssues, weekLogs, weekReports, weekShiftReports } from "@/data/history";
import { materialLabel, recentDates } from "@/data/movements";
import { approvedFormula } from "@/data/planning";
import { listRawQc } from "@/data/qc";

export type BatchRow = {
  id: string;
  date: string;
  time: string;
  endTime: string;
  batchNo: string;
  product: string;
  shift: string;
  qtyMt: string;
  bags: string;
  status: string;
  remarks: string;
  orderNo?: string;
  formulaVersion?: string;
  producedMt?: string;
  reconReason?: string;
  reconBy?: string;
};

export type MaterialIssueRow = {
  id: string;
  date: string;
  batchNo: string;
  shift: string;
  material: string;
  requiredKg: string;
  qtyKg: string;
  status: string;
  source: string;
  formulaVersion?: string;
  lotId?: string;
  startTime?: string;
  endTime?: string;
  weighedBy?: string;
  verifiedBy?: string;
  scaleId?: string;
  qcStatus?: string;
  tolerancePct?: string;
  exceptionReason?: string;
  exceptionBy?: string;
};

export type ReportRow = {
  id: string;
  date: string;
  time: string;
  shift: string;
  level: string;
  title: string;
  batchNo: string;
  bags: string;
  note: string;
  category?: string;
  machine?: string;
  ack?: string;
};

export type ProcessParam = {
  id: string;
  name: string;
  value: string;
  state: string;
  range?: string;
  source?: string;
  at?: string;
  operator?: string;
};

export type ProcessLogRow = {
  id: string;
  date: string;
  time: string;
  batchNo: string;
  stage: string;
  name: string;
  value: string;
  state: string;
  source: string;
  operator: string;
  ack: string;
  action: string;
};

export type ShiftReportRow = {
  id: string;
  date: string;
  shift: string;
  plannedMt: string;
  actualMt: string;
  packedMt: string;
  bags: string;
  consumption: string;
  batchTimes: string;
  downtime: string;
  downtimeReason: string;
  carryOver: string;
};

export type BatchReportRow = {
  id: string;
  date: string;
  batchNo: string;
  orderNo: string;
  formulaVersion: string;
  ingredients: string;
  deviations: string;
  goodMt: string;
  rejectMt: string;
  wasteMt: string;
  qcDecision: string;
  operator: string;
  supervisor: string;
};

export type DowntimeRow = {
  id: string;
  date: string;
  shift: string;
  machine: string;
  stage: string;
  start: string;
  end: string;
  reason: string;
  severity: string;
  qtyMt: string;
  action: string;
  person: string;
  maintenance: string;
};

export const SHIFTS = ["A", "B", "C"] as const;
export const BATCH_STATUSES = ["In progress", "Completed", "Pending"] as const;
export const WEIGH_STATUSES = ["Done", "Pending", "Short", "Over", "Hold", "Exception"] as const;
export const REPORT_LEVELS = ["Note", "Watch", "Alert"] as const;
export const REPORT_CATEGORIES = ["Process", "Material", "Quality", "Maintenance", "Utility", "Other"] as const;
export const REPORT_ACK = ["Open", "Acknowledged"] as const;
export const PARAM_STATES = ["Normal", "Watch", "Check"] as const;
export const READING_SOURCES = ["Manual", "Sensor"] as const;
export const PROCESS_STAGES = ["Weighing", "Milling", "Mixer", "Pellet Machine", "Cooler", "Sieves", "Product Tank", "Weighing & Packing"] as const;

export const GRADE_NUTRIENTS = [
  { nutrient: "Crude protein", pct: "16.5" },
  { nutrient: "Crude fat", pct: "4.5" },
  { nutrient: "Crude fibre", pct: "6.0" },
  { nutrient: "Ash", pct: "8.0" },
  { nutrient: "Calcium", pct: "0.9" },
  { nutrient: "Phosphorus", pct: "0.7" },
];

const BATCH_KEY = "catelfeed_batches_w7";
const ISSUE_KEY = "catelfeed_material_issues_w7";
const REPORT_KEY = "catelfeed_prod_reports_w7";
const PARAM_KEY = "catelfeed_process_params_w7";
const LOG_KEY = "catelfeed_process_log_w7";
const SHIFT_REPORT_KEY = "catelfeed_shift_report_w7";
const BATCH_REPORT_KEY = "catelfeed_batch_report_w7";
const DOWNTIME_KEY = "catelfeed_downtime_w7";

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

function num(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const PARAM_RULES: Record<string, { min?: number; max?: number; watch?: number; label: string }> = {
  "Milling feed rate": { min: 4.5, max: 5.5, label: "4.5–5.5 t/h" },
  "Mixer speed": { min: 16, max: 20, label: "16–20 rpm" },
  "Pellet machine load": { max: 100, watch: 90, label: "watch from 90 A" },
  "Die temperature": { min: 45, max: 60, label: "45–60 °C" },
  "Cooler outlet": { max: 40, label: "≤ 40 °C" },
  "Sieve efficiency": { min: 90, label: "≥ 90%" },
  "Premix addition": { min: 5, max: 5.5, label: "5.0–5.5 kg" },
  "Production rate": { min: 4.5, max: 5.5, label: "4.5–5.5 t/h" },
};

function readingNumber(value: string) {
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function paramReading(name: string, value: string) {
  const rule = PARAM_RULES[name];
  const n = readingNumber(value);
  let state: (typeof PARAM_STATES)[number] = "Normal";
  if (rule && n != null) {
    if ((rule.max != null && n > rule.max) || (rule.min != null && n < rule.min)) state = "Check";
    else if (rule.watch != null && n >= rule.watch) state = "Watch";
  }
  return { state, range: rule?.label || "Plant card" };
}

export function qcReleaseFor(material: string) {
  const name = materialLabel(material).toLowerCase();
  const rows = listRawQc().filter((row) => {
    const sample = row.material.toLowerCase();
    return sample === name || sample.includes(name) || name.includes(sample);
  });
  if (!rows.length) return "No sample";
  if (rows.some((row) => row.decision === "Reject")) return "Rejected";
  if (rows.some((row) => row.lotRelease === "Lot confirmed" && row.decision === "Pass")) return "Released";
  return "Quarantine";
}

export function weighLine(row: MaterialIssueRow) {
  const required = num(row.requiredKg);
  const weighed = num(row.qtyKg);
  const variance = weighed - required;
  const variancePct = required ? (variance / required) * 100 : 0;
  const tolerance = num(row.tolerancePct) || 0.5;
  const qc = row.qcStatus || qcReleaseFor(row.material);
  let status: (typeof WEIGH_STATUSES)[number] = "Pending";
  if (!String(row.qtyKg || "").trim()) status = "Pending";
  else if (qc === "Rejected") status = "Hold";
  else if (Math.abs(variancePct) <= tolerance && required > 0) status = qc === "Released" ? "Done" : "Hold";
  else if (variance < 0) status = "Short";
  else status = "Over";
  if (row.exceptionReason?.trim() && row.exceptionBy?.trim() && status !== "Pending") status = "Exception";
  return { required, weighed, variance, variancePct, tolerance, qc, status };
}

export function reconcileBatch(row: BatchRow) {
  const planned = num(row.qtyMt);
  const packed = (num(row.bags) * 50) / 1000;
  const produced = row.producedMt?.trim() ? num(row.producedMt) : packed;
  const unpacked = produced - packed;
  const shortfall = planned - produced;
  const needsReason = Math.abs(shortfall) > 0.05 || Math.abs(unpacked) > 0.05;
  return { planned, produced, packed, unpacked, shortfall, needsReason };
}

export function formulaLines(product: string, date: string, qtyMt: number) {
  return approvedFormula(product, date).map((row) => ({
    material: row.material,
    requiredKg: ((num(row.kgPerMt) * qtyMt) || 0).toFixed(0),
    formulaVersion: `v${row.version || "1"}`,
  }));
}

function withBatchShift<T extends { batchNo: string; shift?: string }>(rows: T[]) {
  const known = new Map(listBatches().map((row) => [row.batchNo, row.shift]));
  return rows.map((row) => ({ ...row, shift: row.shift || known.get(row.batchNo) || "A" }));
}

export function listBatches() {
  const seeded = weekBatches();
  return ensureRecent(BATCH_KEY, read<BatchRow>(BATCH_KEY, seeded), seeded);
}

export function saveBatches(rows: BatchRow[]) {
  write(BATCH_KEY, rows);
}

export function listMaterialIssues(): MaterialIssueRow[] {
  return withBatchShift(read<MaterialIssueRow>(ISSUE_KEY, weekIssues())).map((row) => {
    const line = weighLine({ ...row, tolerancePct: row.tolerancePct || "0.5" });
    return { ...row, tolerancePct: row.tolerancePct || "0.5", qcStatus: line.qc, status: line.status };
  });
}

export function saveMaterialIssues(rows: MaterialIssueRow[]) {
  write(ISSUE_KEY, rows);
}

export function listReports() {
  return withBatchShift(read<ReportRow>(REPORT_KEY, weekReports())).map((row) => ({
    ...row,
    category: row.category || (row.level === "Watch" ? "Process" : "Other"),
    machine: row.machine || "",
    ack: row.ack || "Open",
  }));
}

export function saveReports(rows: ReportRow[]) {
  write(REPORT_KEY, rows);
}

export function listProcessParams() {
  return read<ProcessParam>(PARAM_KEY, [
    { id: "PP-1", name: "Milling feed rate", value: "5.0 t/h", state: "Normal", source: "Sensor", at: "09:10", operator: "Mill" },
    { id: "PP-2", name: "Mixer speed", value: "18 rpm", state: "Normal", source: "Sensor", at: "09:20", operator: "Mill" },
    { id: "PP-3", name: "Pellet machine load", value: "78 A", state: "Normal", source: "Sensor", at: "10:05", operator: "Mill" },
    { id: "PP-4", name: "Die temperature", value: "52 °C", state: "Normal", source: "Sensor", at: "10:05", operator: "Mill" },
    { id: "PP-5", name: "Cooler outlet", value: "38 °C", state: "Normal", source: "Manual", at: "11:05", operator: "QC" },
    { id: "PP-6", name: "Sieve efficiency", value: "92.5%", state: "Normal", source: "Manual", at: "11:40", operator: "QC" },
    { id: "PP-7", name: "Premix addition", value: "5.2 kg", state: "Normal", source: "Manual", at: "09:30", operator: "Mill" },
    { id: "PP-8", name: "Production rate", value: "5.0 t/h", state: "Normal", source: "Sensor", at: "11:00", operator: "Mill" },
  ]).map((row) => {
    const reading = paramReading(row.name, row.value);
    return { ...row, state: reading.state, range: reading.range, source: row.source || "Sensor", at: row.at || "", operator: row.operator || "" };
  });
}

export function listProcessLog() {
  return read<ProcessLogRow>(LOG_KEY, weekLogs());
}

export function saveProcessLog(rows: ProcessLogRow[]) {
  write(LOG_KEY, rows);
}

export function listShiftReports() {
  return read<ShiftReportRow>(SHIFT_REPORT_KEY, weekShiftReports());
}

export function saveShiftReports(rows: ShiftReportRow[]) {
  write(SHIFT_REPORT_KEY, rows);
}

export function listBatchReports() {
  return read<BatchReportRow>(BATCH_REPORT_KEY, weekBatchReports());
}

export function saveBatchReports(rows: BatchReportRow[]) {
  write(BATCH_REPORT_KEY, rows);
}

export function listDowntime() {
  return read<DowntimeRow>(DOWNTIME_KEY, weekDowntime());
}

export function saveDowntime(rows: DowntimeRow[]) {
  write(DOWNTIME_KEY, rows);
}

export function saveProcessParams(rows: ProcessParam[]) {
  write(PARAM_KEY, rows);
}

export function liveBatch(rows: BatchRow[]) {
  return (
    rows.find((row) => row.status === "In progress") ||
    [...rows].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0]
  );
}

export function nextProdId(prefix: string, rows: { id: string }[]) {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.id).split("-")[1]);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 2400);
  return `${prefix}-${n + 1}`;
}
