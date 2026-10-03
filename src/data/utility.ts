import { weekAir, weekBoiler, weekFuel, weekPower, weekWater } from "@/data/history";
import { recentDates } from "@/data/movements";

export const BOILERS = ["Boiler 1", "Boiler 2"] as const;
export const BOILER_FUELS = ["Rice husk", "Coal", "Firewood", "Diesel"] as const;
export const YES_NO = ["Yes", "No"] as const;
export const WATER_SOURCES = ["Borewell", "Municipal", "Tanker"] as const;
export const WATER_USES = ["Boiler", "Process", "Domestic", "All"] as const;
export const FUEL_UNITS = ["MT", "L"] as const;
export const OIL_LEVELS = ["Ok", "Low", "Needs inspection"] as const;
export const RUN_STATUS = ["Running", "Stopped"] as const;
export const FEED_KINDS = ["Consumed KL", "Meter reading"] as const;
export const WATER_ENTRIES = ["Meter", "Stock level", "Tanker receipt"] as const;
export const FUEL_TXN = ["Receipt", "Issue", "Adjustment", "Return"] as const;
export const COMPRESSORS = ["Compressor 1", "Compressor 2"] as const;

export const BOILER_LIMITS: Record<string, { warn: number; critical: number; label: string }> = {
  "Boiler 1": { warn: 9, critical: 10, label: "7.5–9.0" },
  "Boiler 2": { warn: 8, critical: 9, label: "6.5–8.0" },
};

export const COMPRESSOR_RANGE = { min: 6, max: 7.5, label: "6.0–7.5" };
export const POWER_FACTOR_TARGET = 0.95;

type Row = { id: string; date: string };

export type BoilerRow = Row & {
  shift: string;
  boiler: string;
  pressure: string;
  feedWater: string;
  fuel: string;
  fuelUsed: string;
  blowdown: string;
  hours: string;
  operator: string;
  remarks: string;
  start?: string;
  stop?: string;
  steam?: string;
  feedTemp?: string;
  dosing?: string;
  safety?: string;
  verifiedBy?: string;
  feedKind?: string;
};

export type PowerRow = Row & {
  shift: string;
  ebOpen: string;
  ebClose: string;
  units: string;
  dgHours: string;
  diesel: string;
  powerFactor: string;
  remarks: string;
  meterId?: string;
  dgId?: string;
  dgOpen?: string;
  dgClose?: string;
  dgUnits?: string;
  dieselOpen?: string;
  dieselClose?: string;
  verifiedBy?: string;
  resetReason?: string;
};

export type WaterRow = Row & {
  source: string;
  opening: string;
  closing: string;
  used: string;
  purpose: string;
  remarks: string;
  shift?: string;
  meterId?: string;
  entryType?: string;
  receipt?: string;
  deliveryRef?: string;
  qualityRef?: string;
  purpose2?: string;
  recordedBy?: string;
  verifiedBy?: string;
  resetReason?: string;
};

export type FuelRow = Row & {
  fuel: string;
  unit: string;
  opening: string;
  receipt: string;
  issued: string;
  closing: string;
  supplier: string;
  remarks: string;
  shift?: string;
  location?: string;
  txnType?: string;
  receiptRef?: string;
  purchaseOrder?: string;
  deliveryNo?: string;
  issuedTo?: string;
  recordedBy?: string;
  verifiedBy?: string;
  adjustment?: string;
  adjustReason?: string;
  approvedBy?: string;
};

export type CompressorRow = Row & {
  shift: string;
  pressure: string;
  hours: string;
  oil: string;
  drain: string;
  status: string;
  remarks: string;
  compressor?: string;
  start?: string;
  stop?: string;
  drainQty?: string;
  verifiedBy?: string;
  abnormal?: string;
  maintRef?: string;
  operator?: string;
};

const BOILER_KEY = "catelfeed_util_boiler_w7";
const POWER_KEY = "catelfeed_util_power_w7";
const WATER_KEY = "catelfeed_util_water_w7";
const FUEL_KEY = "catelfeed_util_fuel_w7";
const AIR_KEY = "catelfeed_util_air_w7";

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

export function nextUtilId(prefix: string, rows: { id: string }[]) {
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

function clean(value: number, places = 2) {
  return value.toFixed(places).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function fuelMeasure(fuel: string) {
  return fuel === "Diesel" ? "L" : "kg";
}

export function pressureBand(boiler: string, pressure: string) {
  const limit = BOILER_LIMITS[boiler];
  const value = Number(pressure);
  if (!limit || !String(pressure || "").trim() || !Number.isFinite(value)) return { band: "", label: limit?.label || "Set per boiler" };
  if (value >= limit.critical) return { band: "Critical", label: limit.label };
  if (value >= limit.warn) return { band: "Watch", label: limit.label };
  return { band: "Normal", label: limit.label };
}

export function powerReading(row: PowerRow) {
  let warning = "";
  let units = row.units || "";
  if (String(row.ebOpen || "").trim() && String(row.ebClose || "").trim()) {
    const diff = num(row.ebClose) - num(row.ebOpen);
    if (diff < 0 && !row.resetReason?.trim()) {
      units = "";
      warning = "Closing meter is below opening. Record an authorized reset reason instead of a negative unit count.";
    } else if (diff < 0) {
      units = row.units || "0";
      warning = "Meter reset recorded. Units stay as entered.";
    } else units = clean(diff, 0);
  }
  let dgUnits = row.dgUnits || "";
  if (String(row.dgOpen || "").trim() && String(row.dgClose || "").trim()) {
    const diff = num(row.dgClose) - num(row.dgOpen);
    dgUnits = diff < 0 ? "" : clean(diff, 0);
  }
  const factor = Number(row.powerFactor);
  if (String(row.powerFactor || "").trim() && Number.isFinite(factor) && factor > 1) {
    warning = "Enter power factor as a decimal, for example 0.95.";
  }
  return { units, dgUnits, warning };
}

export function waterReading(row: WaterRow) {
  const entryType = row.entryType || (row.source === "Tanker" ? "Tanker receipt" : num(row.closing) < num(row.opening) && num(row.used) > 0 ? "Stock level" : "Meter");
  if (entryType === "Tanker receipt") return { entryType, used: row.receipt || "0", warning: "" };
  if (!String(row.opening || "").trim() || !String(row.closing || "").trim()) return { entryType, used: row.used || "", warning: "" };
  if (entryType === "Stock level") return { entryType, used: clean(num(row.opening) - num(row.closing)), warning: "" };
  if (num(row.closing) < num(row.opening) && !row.resetReason?.trim()) {
    return { entryType, used: "", warning: "Closing is below opening. Record a meter reset, or mark the line as a stock level." };
  }
  return { entryType, used: clean(num(row.closing) - num(row.opening)), warning: "" };
}

export function fuelReading(row: FuelRow) {
  const adjustment = row.adjustReason?.trim() && row.approvedBy?.trim() ? num(row.adjustment) : 0;
  const closing = num(row.opening) + num(row.receipt) - num(row.issued) + adjustment;
  const warning = String(row.adjustment || "").trim() && adjustment === 0 ? "A stock adjustment needs a reason and an approver." : "";
  return { closing: clean(closing, row.unit === "L" ? 0 : 2), warning };
}

export function compressorBand(pressure: string) {
  const value = Number(pressure);
  if (!String(pressure || "").trim() || !Number.isFinite(value)) return "";
  if (value < COMPRESSOR_RANGE.min || value > COMPRESSOR_RANGE.max) return "Check";
  return "Normal";
}

export function utilitySummary(date: string) {
  const boilers = listBoiler().filter((row) => row.date === date);
  const power = listPower().filter((row) => row.date === date);
  const water = listWater().filter((row) => row.date === date);
  const fuel = listFuel().filter((row) => row.date === date);
  const running = boilers.filter((row) => num(row.hours) > 0).length;
  const units = power.reduce((sum, row) => sum + num(powerReading(row).units), 0);
  const used = water.reduce((sum, row) => sum + num(waterReading(row).used), 0);
  const huskIssued = fuel.filter((row) => row.fuel === "Rice husk").reduce((sum, row) => sum + num(row.issued), 0);
  const huskBurned = boilers.filter((row) => row.fuel === "Rice husk").reduce((sum, row) => sum + num(row.fuelUsed), 0) / 1000;
  const low = fuel.filter((row) => (row.unit === "L" ? num(fuelReading(row).closing) < 50 : num(fuelReading(row).closing) < 1));
  const fuelNote = low.length ? low.map((row) => row.fuel).join(", ") : Math.abs(huskIssued - huskBurned) > 0.05 ? "Husk ledger differs from boiler" : "None";
  return [
    { label: "Boilers running", value: String(running) },
    { label: "Power consumed", value: `${clean(units, 0)} units` },
    { label: "Water used", value: `${clean(used)} KL` },
    { label: "Fuel stock alerts", value: fuelNote, bad: fuelNote !== "None" },
  ];
}

function boilerSeed(): BoilerRow[] {
  return weekBoiler();
}

function powerSeed(): PowerRow[] {
  return weekPower();
}

function waterSeed(): WaterRow[] {
  return weekWater();
}

function fuelSeed(): FuelRow[] {
  return weekFuel();
}

function airSeed(): CompressorRow[] {
  return weekAir();
}

export function listBoiler(): BoilerRow[] {
  const seeded = boilerSeed();
  return ensureRecent(BOILER_KEY, read(BOILER_KEY, seeded), seeded).map((row) => ({
    ...row,
    feedKind: row.feedKind || "Consumed KL",
  }));
}
export function saveBoiler(rows: BoilerRow[]) {
  write(BOILER_KEY, rows);
}
export function listPower(): PowerRow[] {
  const seeded = powerSeed();
  return ensureRecent(POWER_KEY, read(POWER_KEY, seeded), seeded).map((row) => {
    const reading = powerReading(row);
    return { ...row, meterId: row.meterId || "EB-1", dgId: row.dgId || "DG-1", units: reading.units, dgUnits: reading.dgUnits };
  });
}
export function savePower(rows: PowerRow[]) {
  write(POWER_KEY, rows);
}
export function listWater(): WaterRow[] {
  const seeded = waterSeed();
  return ensureRecent(WATER_KEY, read(WATER_KEY, seeded), seeded).map((row) => {
    const reading = waterReading(row);
    return { ...row, entryType: reading.entryType, used: reading.used, shift: row.shift || "A" };
  });
}
export function saveWater(rows: WaterRow[]) {
  write(WATER_KEY, rows);
}
export function listFuel(): FuelRow[] {
  return read(FUEL_KEY, fuelSeed()).map((row) => ({
    ...row,
    closing: fuelReading(row).closing,
    txnType: row.txnType || (num(row.receipt) > 0 ? "Receipt" : "Issue"),
    location: row.location || "Fuel yard",
    shift: row.shift || "A",
  }));
}
export function saveFuel(rows: FuelRow[]) {
  write(FUEL_KEY, rows);
}
export function listCompressor(): CompressorRow[] {
  const seeded = airSeed();
  return ensureRecent(AIR_KEY, read(AIR_KEY, seeded), seeded).map((row) => ({
    ...row,
    compressor: row.compressor || "Compressor 1",
  }));
}
export function saveCompressor(rows: CompressorRow[]) {
  write(AIR_KEY, rows);
}
