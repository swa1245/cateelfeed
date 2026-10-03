import { weekFlows, weekMoves, weekStockReports } from "@/data/history";

export const STORES = ["A", "B", "C"] as const;
export const FLOW_DIRECTIONS = ["Inbound", "Outbound"] as const;
export const FLOW_STATUSES = ["Received", "Issued", "Pending"] as const;
export const MOVE_TYPES = ["Inward", "Issue", "Transfer"] as const;
export const REPORT_STATUSES = ["OK", "Low"] as const;

type Row = { id: string; date: string };

export type Warehouse = {
  id: string;
  name: string;
  location: string;
};

export type StorageRack = {
  id: string;
  warehouseId: string;
  name: string;
  capacityTon: number;
};

export type RackLot = {
  id: string;
  rackId: string;
  material: string;
  lot: string;
  qtyTon: number;
};

export type WarehouseStorage = {
  warehouses: Warehouse[];
  racks: StorageRack[];
  lots: RackLot[];
};

export type ReadyStockRow = {
  id: string;
  date: string;
  batchNo: string;
  product: string;
  qtyTon: number;
  bags: number;
  rackId: string;
  status: "Ready" | "Held";
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

const STORAGE_KEY = "catelfeed_wh_storage_v1";
const READY_KEY = "catelfeed_wh_ready_v1";
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

function lot(id: string, rackId: string, material: string, lotCode: string, qtyTon: number): RackLot {
  return { id, rackId, material, lot: lotCode, qtyTon };
}

function storageSeed(): WarehouseStorage {
  return {
    warehouses: [
      { id: "WH-1", name: "Raw Material Warehouse", location: "Shed A" },
      { id: "WH-2", name: "Premix Store", location: "Shed B" },
      { id: "WH-3", name: "Finished Feed Warehouse", location: "Dispatch bay" },
    ],
    racks: [
      { id: "RK-1", warehouseId: "WH-1", name: "Rack 1", capacityTon: 50 },
      { id: "RK-2", warehouseId: "WH-1", name: "Rack 2", capacityTon: 50 },
      { id: "RK-3", warehouseId: "WH-1", name: "Rack 3", capacityTon: 40 },
      { id: "RK-4", warehouseId: "WH-1", name: "Rack 4", capacityTon: 30 },
      { id: "RK-5", warehouseId: "WH-2", name: "Rack 1", capacityTon: 12 },
      { id: "RK-6", warehouseId: "WH-2", name: "Rack 2", capacityTon: 10 },
      { id: "RK-7", warehouseId: "WH-2", name: "Rack 3", capacityTon: 8 },
      { id: "RK-8", warehouseId: "WH-3", name: "Rack 1", capacityTon: 80 },
      { id: "RK-9", warehouseId: "WH-3", name: "Rack 2", capacityTon: 60 },
      { id: "RK-10", warehouseId: "WH-3", name: "Rack 3", capacityTon: 40 },
    ],
    lots: [
      lot("LT-1", "RK-1", "Maize", "M-21", 22),
      lot("LT-2", "RK-1", "Soybean Meal", "S-14", 12.5),
      lot("LT-3", "RK-1", "Wheat Bran", "W-08", 8),
      lot("LT-4", "RK-2", "Maize", "M-22", 18),
      lot("LT-5", "RK-2", "Rice Bran", "R-03", 14),
      lot("LT-6", "RK-3", "DDGS", "D-11", 26),
      lot("LT-7", "RK-3", "Limestone", "L-02", 6.5),
      lot("LT-8", "RK-5", "Vitamin Premix", "V-04", 4.2),
      lot("LT-9", "RK-5", "Methionine", "ME-01", 2.8),
      lot("LT-10", "RK-6", "Salt", "SA-06", 6.4),
      lot("LT-11", "RK-7", "Vitamin Premix", "V-05", 7.6),
      lot("LT-12", "RK-8", "Cattle Feed 700", "CF700-18", 45),
      lot("LT-13", "RK-8", "Cattle Feed 500", "CF500-09", 18),
      lot("LT-14", "RK-9", "Cattle Feed 700", "CF700-19", 22),
      lot("LT-15", "RK-10", "Cattle Feed 500", "CF500-10", 41),
    ],
  };
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

export function loadWarehouseStorage(): WarehouseStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = storageSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as WarehouseStorage;
    if (!parsed || !Array.isArray(parsed.warehouses) || !Array.isArray(parsed.racks) || !Array.isArray(parsed.lots)) {
      const seed = storageSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return storageSeed();
  }
}

export function saveWarehouseStorage(data: WarehouseStorage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function readySeed(): ReadyStockRow[] {
  return [
    { id: "RS-1", date: "2026-09-27", batchNo: "B-0901", product: "CF 700", qtyTon: 18.5, bags: 370, rackId: "RK-8", status: "Ready" },
    { id: "RS-2", date: "2026-09-28", batchNo: "B-0902", product: "CF 700", qtyTon: 16.2, bags: 324, rackId: "RK-8", status: "Ready" },
    { id: "RS-3", date: "2026-09-28", batchNo: "B-0903", product: "CF 500", qtyTon: 10.3, bags: 206, rackId: "RK-8", status: "Ready" },
    { id: "RS-4", date: "2026-09-29", batchNo: "B-0904", product: "CF 700", qtyTon: 14, bags: 280, rackId: "RK-9", status: "Ready" },
    { id: "RS-5", date: "2026-09-30", batchNo: "B-0905", product: "CF 700", qtyTon: 8, bags: 160, rackId: "RK-9", status: "Ready" },
    { id: "RS-6", date: "2026-09-30", batchNo: "B-0906", product: "CF 500", qtyTon: 12.4, bags: 248, rackId: "RK-9", status: "Held" },
    { id: "RS-7", date: "2026-10-01", batchNo: "B-0907", product: "CF 500", qtyTon: 9.6, bags: 192, rackId: "RK-10", status: "Ready" },
  ];
}

export function loadReadyStock(): ReadyStockRow[] {
  try {
    const raw = localStorage.getItem(READY_KEY);
    if (!raw) {
      const seed = readySeed();
      localStorage.setItem(READY_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as ReadyStockRow[];
    if (!Array.isArray(parsed)) {
      const seed = readySeed();
      localStorage.setItem(READY_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return readySeed();
  }
}

export function saveReadyStock(rows: ReadyStockRow[]) {
  write(READY_KEY, rows);
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
