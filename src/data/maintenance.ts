import { weekBreakdowns, weekChecklist, weekPreventive, weekSpares } from "@/data/history";
import { todayIso } from "@/data/movements";

export const MACHINES = [
  "Hammer mill",
  "Mixer",
  "Conditioner",
  "Pellet mill",
  "Cooler",
  "Bucket elevator",
  "Bagging line",
  "Boiler",
  "Compressor",
] as const;

export const JOB_STATUS = ["Open", "In progress", "Closed"] as const;
export const FREQUENCIES = ["Daily", "Weekly", "Monthly"] as const;
export const CHECKS = ["Lubrication", "Belt", "Bearing", "Noise", "Temperature", "Guard"] as const;
export const CHECK_RESULTS = ["Ok", "Attention", "Not applicable"] as const;
export const DONE = ["Yes", "No"] as const;
export const FAULT_TYPES = ["Mechanical", "Electrical", "Instrumentation", "Other"] as const;
export const PM_RESULTS = ["Completed", "Not completed", "Skipped", "Deferred"] as const;
export const INSPECT_TYPES = ["Routine", "Pre-start", "Post-maintenance", "Other"] as const;
export const SPARE_UNITS = ["Nos", "Kg", "L", "Set"] as const;

export const SPARE_STOCK: Record<string, number> = {
  "Hammer mill screen 3 mm": 4,
  "Roller shell": 1,
  "Bearing grease": 8,
};

type Row = { id: string; date: string };

export type BreakdownRow = Row & {
  shift: string;
  machine: string;
  fault: string;
  from: string;
  to: string;
  hours: string;
  attended: string;
  status: string;
  remarks: string;
  faultType?: string;
  reportedAt?: string;
  endDate?: string;
  rootCause?: string;
  action?: string;
  verifiedBy?: string;
  impact?: string;
};

export type PreventiveRow = Row & {
  machine: string;
  frequency: string;
  job: string;
  done: string;
  by: string;
  remarks: string;
  dueDate?: string;
  assigned?: string;
  completedAt?: string;
  nextDue?: string;
  result?: string;
  deferReason?: string;
  approvedBy?: string;
  jobRef?: string;
};

export type ChecklistRow = Row & {
  shift: string;
  machine: string;
  check: string;
  result: string;
  remarks: string;
  inspectType?: string;
  inspector?: string;
  reviewer?: string;
  action?: string;
  jobRef?: string;
};

export type SpareRow = Row & {
  part: string;
  machine: string;
  qty: string;
  unit: string;
  issuedTo: string;
  jobRef: string;
  remarks: string;
  location?: string;
  stock?: string;
  time?: string;
  issuedBy?: string;
  receivedBy?: string;
  returned?: string;
  condition?: string;
  approval?: string;
  supplier?: string;
  purchaseRef?: string;
  usedQty?: string;
};

const BREAK_KEY = "catelfeed_maint_break_w7";
const PREV_KEY = "catelfeed_maint_prev_w7";
const CHECK_KEY = "catelfeed_maint_check_w7";
const SPARE_KEY = "catelfeed_maint_spare_w7";

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

export function nextMaintId(prefix: string, rows: { id: string }[]) {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.id).split("-")[1]);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 1000);
  return `${prefix}-${n + 1}`;
}

function num(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shiftDate(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function breakdownHours(row: BreakdownRow) {
  if (!row.from || !row.to) return { hours: "", warning: "" };
  const endDate = row.endDate || row.date;
  const start = new Date(`${row.date}T${row.from}`);
  const end = new Date(`${endDate}T${row.to}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { hours: row.hours || "", warning: "" };
  if (end < start) return { hours: "", warning: "End is before the start. Enter the end date when the repair crosses midnight." };
  const hours = (end.getTime() - start.getTime()) / 36e5;
  return { hours: hours.toFixed(2).replace(/\.00$/, ""), warning: "" };
}

export function responseMinutes(row: BreakdownRow) {
  if (!row.reportedAt || !row.from) return "";
  const reported = new Date(`${row.date}T${row.reportedAt}`);
  const attended = new Date(`${row.date}T${row.from}`);
  if (Number.isNaN(reported.getTime()) || Number.isNaN(attended.getTime()) || attended < reported) return "";
  return `${Math.round((attended.getTime() - reported.getTime()) / 60000)} min`;
}

export function closeBlocked(row: BreakdownRow) {
  return row.status === "Closed" && !row.verifiedBy?.trim();
}

export function pmResult(row: PreventiveRow) {
  if (row.result) return row.result;
  return row.done === "Yes" ? "Completed" : "Not completed";
}

export function pmNextDue(row: PreventiveRow) {
  const base = row.dueDate || row.date;
  if (row.frequency === "Weekly") return shiftDate(base, 7);
  if (row.frequency === "Monthly") return shiftDate(base, 30);
  return shiftDate(base, 1);
}

export function pmState(row: PreventiveRow, today = todayIso()) {
  const result = pmResult(row);
  if (result === "Completed") return "Done";
  if (result === "Skipped" || result === "Deferred") return result;
  const due = row.dueDate || (row.frequency === "Monthly" && row.done === "No" ? shiftDate(row.date, -1) : row.date);
  return due < today ? "Overdue" : "Due";
}

export function spareStock(part: string) {
  return SPARE_STOCK[part];
}

export function spareWarning(row: SpareRow) {
  const stock = spareStock(row.part);
  if (stock == null || !String(row.qty || "").trim()) return "";
  if (num(row.qty) > stock && !row.approval?.trim()) return `Only ${stock} ${row.unit || "Nos"} in store. An exceptional issue needs approval.`;
  return "";
}

export function maintenanceSummary(date: string) {
  const breaks = listBreakdowns().filter((row) => row.date === date);
  const pm = listPreventive();
  const today = todayIso();
  return [
    { label: "Open breakdowns", value: String(breaks.filter((row) => row.status === "Open").length), bad: breaks.some((row) => row.status === "Open") },
    { label: "Under repair", value: String(breaks.filter((row) => row.status === "In progress").length) },
    { label: "PM due", value: String(pm.filter((row) => pmState(row, today) === "Due" && (row.dueDate || row.date) === date).length) },
    { label: "PM overdue", value: String(pm.filter((row) => pmState(row, today) === "Overdue").length), bad: pm.some((row) => pmState(row, today) === "Overdue") },
  ];
}

function breakSeed(): BreakdownRow[] {
  return weekBreakdowns();
}

function prevSeed(): PreventiveRow[] {
  return weekPreventive();
}

function checkSeed(): ChecklistRow[] {
  return weekChecklist();
}

function spareSeed(): SpareRow[] {
  return weekSpares();
}

export function listBreakdowns(): BreakdownRow[] {
  return read(BREAK_KEY, breakSeed()).map((row) => {
    const span = breakdownHours(row);
    return { ...row, faultType: row.faultType || "Mechanical", hours: span.hours || row.hours };
  });
}
export function saveBreakdowns(rows: BreakdownRow[]) {
  write(BREAK_KEY, rows);
}
export function listPreventive(): PreventiveRow[] {
  return read(PREV_KEY, prevSeed()).map((row) => {
    const result = pmResult(row);
    const dueDate = row.dueDate || (row.frequency === "Monthly" && result !== "Completed" ? shiftDate(row.date, -1) : row.date);
    return {
      ...row,
      result,
      dueDate,
      done: result === "Completed" ? "Yes" : "No",
      nextDue: result === "Completed" ? row.nextDue || pmNextDue({ ...row, dueDate }) : row.nextDue || "",
    };
  });
}
export function savePreventive(rows: PreventiveRow[]) {
  write(PREV_KEY, rows);
}
export function listChecklist(): ChecklistRow[] {
  return read(CHECK_KEY, checkSeed()).map((row) => ({
    ...row,
    inspectType: row.inspectType || "Routine",
    action: row.action || (row.result === "Attention" ? row.remarks : ""),
  }));
}
export function saveChecklist(rows: ChecklistRow[]) {
  write(CHECK_KEY, rows);
}
export function listSpares(): SpareRow[] {
  return read(SPARE_KEY, spareSeed()).map((row) => {
    const stock = spareStock(row.part);
    return { ...row, stock: stock == null ? row.stock || "" : String(stock), location: row.location || "Maintenance store", usedQty: row.usedQty || row.qty };
  });
}
export function saveSpares(rows: SpareRow[]) {
  write(SPARE_KEY, rows);
}
