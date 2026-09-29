import { weekFlows, weekMoves, weekStockReports } from "@/data/history";
import { recentDates } from "@/data/movements";
import { STORE_RACKS, type StoreId } from "@/data/store";

export const STORES = ["A", "B", "C"] as const;
export const STOCK_STATUSES = ["In Stock", "Low Stock", "Empty", "Reserved"] as const;
export const FLOW_DIRECTIONS = ["Inbound", "Outbound"] as const;
export const FLOW_STATUSES = ["Received", "Issued", "Pending"] as const;
export const MOVE_TYPES = ["Inward", "Issue", "Transfer"] as const;
export const REPORT_STATUSES = ["OK", "Low"] as const;

type Row = { id: string; date: string };

export type MaterialDetailRow = Row & {
  store: StoreId | "";
  rack: string;
  material: string;
  stockMt: string;
  bags: string;
  supplier: string;
  grade: string;
  cp: string;
  fat: string;
  moisture: string;
  inward: string;
  expiry: string;
  status: string;
};

export type FlowRow = Row & {
  time: string;
  shift: string;
  direction: string;
  material: string;
  qtyMt: string;
  bags: string;
  store: string;
  rack: string;
  party: string;
  reference: string;
  status: string;
};

export type MovementRow = Row & {
  time: string;
  shift: string;
  movement: string;
  material: string;
  qtyMt: string;
  bags: string;
  from: string;
  to: string;
  reference: string;
};

export type StockReportRow = Row & {
  shift: string;
  material: string;
  openingMt: string;
  inwardMt: string;
  issuedMt: string;
  closingMt: string;
  bags: string;
  minMt: string;
  reorderMt: string;
  status: string;
};

const MATERIAL_KEY = "catelfeed_wh_materials_w7";
const FLOW_KEY = "catelfeed_wh_inbound_w7";
const MOVE_KEY = "catelfeed_wh_moves_w7";
const REPORT_KEY = "catelfeed_wh_reports_w7";

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

export function nextWhId(prefix: string, rows: { id: string }[]) {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.id).split("-")[1]);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 1000);
  return `${prefix}-${n + 1}`;
}

function materialSeed(): MaterialDetailRow[] {
  const rows: MaterialDetailRow[] = [];
  recentDates(7).forEach((date, index) => {
    (Object.keys(STORE_RACKS) as StoreId[]).forEach((store) => {
      STORE_RACKS[store].forEach((rack) => {
        if (rack.stockMt == null) return;
        const drift = 1 + (index - 7) * 0.01;
        const stock = Math.max(0.1, rack.stockMt * drift);
        rows.push({
          id: `MD-${date.slice(5).replace("-", "")}-${rack.rack}`,
          date,
          store,
          rack: rack.rack,
          material: rack.material,
          stockMt: stock.toFixed(1),
          bags: String(rack.bags ?? ""),
          supplier: rack.supplier,
          grade: rack.grade === "—" ? "" : rack.grade,
          cp: rack.cp,
          fat: rack.fat,
          moisture: rack.moisture,
          inward: date,
          expiry: rack.expiry === "—" ? "" : rack.expiry,
          status: rack.status,
        });
      });
    });
  });
  return rows;
}

function flowSeed(): FlowRow[] {
  return weekFlows();
}

function movementSeed(): MovementRow[] {
  return weekMoves();
}

function reportSeed(): StockReportRow[] {
  return weekStockReports();
}

export function listMaterialDetails() {
  return read(MATERIAL_KEY, materialSeed());
}
export function saveMaterialDetails(rows: MaterialDetailRow[]) {
  write(MATERIAL_KEY, rows);
}
export function listFlows() {
  return read(FLOW_KEY, flowSeed());
}
export function saveFlows(rows: FlowRow[]) {
  write(FLOW_KEY, rows);
}
export function listMovements() {
  return read(MOVE_KEY, movementSeed());
}
export function saveMovements(rows: MovementRow[]) {
  write(MOVE_KEY, rows);
}
export function listStockReports() {
  return read(REPORT_KEY, reportSeed());
}
export function saveStockReports(rows: StockReportRow[]) {
  write(REPORT_KEY, rows);
}
