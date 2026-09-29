export const SUPPLIERS = [
  "Sangli Grain Traders",
  "Kupwad Oil Mill",
  "Miraj Rice Polish Co.",
  "Kolhapur Molasses Tankers",
  "Ashta Packaging",
] as const;

export const RAW_MATERIALS = [
  { value: "maize", label: "Maize" },
  { value: "oil-cake", label: "Oil cake" },
  { value: "rice-polish", label: "Rice polish" },
  { value: "wheat-bran", label: "Wheat bran" },
  { value: "dorb", label: "De-oiled rice bran" },
  { value: "limestone", label: "Limestone" },
  { value: "salt", label: "Salt" },
  { value: "premix", label: "Premix" },
  { value: "molasses", label: "Molasses" },
  { value: "bags", label: "Packing bags" },
] as const;

export const STORAGE_POINTS = [
  { value: "quarantine", label: "Quarantine bay" },
  { value: "godown", label: "Raw-material godown" },
  { value: "silo", label: "Silo" },
  { value: "molasses-tank", label: "Molasses tank" },
] as const;

export const FEED_PRODUCTS = [
  { value: "cf-1000", label: "CF 1000 — high-yield buffalo" },
  { value: "cf-900", label: "CF 900 — bypass fat & protein" },
  { value: "cf-700", label: "CF 700 — milk & health" },
  { value: "cf-500", label: "CF 500" },
  { value: "madhur-mix", label: "Madhur Mix" },
  { value: "calf-starter", label: "Calf Starter" },
  { value: "mineral", label: "Mineral mixture" },
] as const;

export const OUTLETS = [
  "Plant counter — Kupwad",
  "Ashta outlet",
  "Dudhgaon outlet",
  "Kurundwad dealer",
  "Kodoli dealer",
] as const;

export const COLOUR_OPTIONS = ["Normal", "Dark", "Off-colour"] as const;
export const MOISTURE_OPTIONS = ["Within spec", "High"] as const;
export const FOREIGN_OPTIONS = ["Nil", "Present"] as const;
export const INFESTATION_OPTIONS = ["None", "Present"] as const;
export const ENTRY_TYPES = ["Purchase", "Return", "Transfer", "Other"] as const;
export const REJECT_REASONS = ["Moisture", "Infestation", "Foreign matter", "Colour", "Documents", "Other"] as const;
export const READING_SOURCES = ["Manual", "Scale"] as const;
export const QC_RELEASE = ["Pending", "Released", "Hold", "Rejected"] as const;
export const DOC_STATUS = ["Draft", "Generated", "Issued", "Cancelled"] as const;

export type InwardStatus =
  | "at-gate"
  | "weighed"
  | "accepted"
  | "rejected"
  | "received";

export type InwardTicket = {
  id: string;
  createdAt: string;
  date: string;
  time: string;
  vehicleNo: string;
  supplier: string;
  material: string;
  poChallan: string;
  driver: string;
  bagCount: string;
  grossKg: string;
  tareKg: string;
  colour: string;
  moisture: string;
  foreignMatter: string;
  infestation: string;
  qcNote: string;
  decision: "" | "accepted" | "rejected";
  storage: string;
  grnNo: string;
  status: InwardStatus;
  entryType?: string;
  gateOperator?: string;
  weighbridgeId?: string;
  weighOperator?: string;
  grossAt?: string;
  grossSource?: string;
  originalGross?: string;
  weighReason?: string;
  weighAuth?: string;
  inspectedAt?: string;
  inspector?: string;
  rejectReason?: string;
  overrideBy?: string;
  leftAt?: string;
  grnAt?: string;
  receiver?: string;
  unloadAt?: string;
  poQty?: string;
  lotId?: string;
  qcRelease?: string;
  closed?: string;
};

export type OutwardStatus = "bagged" | "picked" | "weighed" | "dispatched";

export type OutwardTicket = {
  id: string;
  createdAt: string;
  date: string;
  time: string;
  product: string;
  batchNo: string;
  bagWeightKg: string;
  bagCount: string;
  godown: string;
  customer: string;
  salesOrder: string;
  emptyKg: string;
  loadedKg: string;
  invoiceNo: string;
  challanNo: string;
  gatePassNo: string;
  status: OutwardStatus;
  line?: string;
  shift?: string;
  bagType?: string;
  rejectedBags?: string;
  orderNo?: string;
  availableBags?: string;
  pickedAt?: string;
  pickedBy?: string;
  vehicleNo?: string;
  weighbridgeId?: string;
  weighedAt?: string;
  weighOperator?: string;
  weighSource?: string;
  reweighReason?: string;
  reweighBy?: string;
  originalLoaded?: string;
  issuedBy?: string;
  exitAt?: string;
  docStatus?: string;
  cancelReason?: string;
  qcRelease?: string;
};

const IN_KEY = "catelfeed_inward_w7";
const OUT_KEY = "catelfeed_outward_w7";

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

export function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Oldest first: the seven days before today, then today. */
export function recentDates(past = 7) {
  return Array.from({ length: past + 1 }, (_, index) => isoDaysAgo(past - index));
}

/** Opens a log sheet on the date named in ?date=, otherwise today. */
export function sheetDateFromQuery() {
  if (typeof window === "undefined") return todayIso();
  const date = new URLSearchParams(window.location.search).get("date") || "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIso();
}

export function formatSheetDate(iso: string) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso || "";
  return `${match[3]}/${match[2]}/${match[1].slice(2)}`;
}

const INWARD_LOADS = [
  { material: "maize", supplier: "Sangli Grain Traders", vehicle: "MH-10-AB-1101", driver: "Ramesh Patil", bags: "200", gross: "12400", tare: "4200", storage: "silo", colour: "Yellow", moisture: "12.4" },
  { material: "wheat-bran", supplier: "Agri Solutions", vehicle: "MH-10-AB-1102", driver: "Suresh Kale", bags: "160", gross: "9800", tare: "3800", storage: "godown", colour: "Brown", moisture: "11.8" },
  { material: "rice-polish", supplier: "Miraj Rice Polish Co.", vehicle: "MH-10-AB-1103", driver: "Anil Jadhav", bags: "140", gross: "8600", tare: "3600", storage: "silo", colour: "Tan", moisture: "10.6" },
  { material: "oil-cake", supplier: "Kupwad Oil Mill", vehicle: "MH-10-AB-1104", driver: "Vijay More", bags: "180", gross: "11200", tare: "4000", storage: "godown", colour: "Brown", moisture: "10.2" },
  { material: "dorb", supplier: "Green Yield", vehicle: "MH-10-AB-1105", driver: "Kiran Patil", bags: "120", gross: "7400", tare: "3400", storage: "godown", colour: "Grey", moisture: "10.8" },
  { material: "limestone", supplier: "Shivam Minerals", vehicle: "MH-10-AB-1106", driver: "Nitin Sawant", bags: "100", gross: "6200", tare: "3100", storage: "godown", colour: "White", moisture: "3.2" },
  { material: "salt", supplier: "Tata Chemicals", vehicle: "MH-10-AB-1107", driver: "Prakash Desai", bags: "80", gross: "4800", tare: "2800", storage: "godown", colour: "White", moisture: "0.4" },
  { material: "molasses", supplier: "Kolhapur Molasses Tankers", vehicle: "MH-10-AB-1108", driver: "Sunil Pawar", bags: "0", gross: "18600", tare: "8200", storage: "molasses-tank", colour: "Dark", moisture: "22.0" },
] as const;

function inwardSeed(): InwardTicket[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): InwardTicket => {
    const load = INWARD_LOADS[index];
    const rejected = index === 3;
    return {
      id: `IN-${date.slice(5).replace("-", "")}`,
      createdAt: `${date}T08:10:00`,
      date,
      time: "08:10",
      vehicleNo: load.vehicle,
      supplier: load.supplier,
      material: load.material,
      poChallan: `PO-${118 + index}`,
      driver: load.driver,
      bagCount: load.bags,
      grossKg: load.gross,
      tareKg: load.tare,
      colour: load.colour,
      moisture: rejected ? "16.4" : load.moisture,
      foreignMatter: rejected ? "High" : "Nil",
      infestation: "Nil",
      qcNote: rejected ? "Moisture above the card" : "Sample drawn at the gate",
      decision: rejected ? "rejected" : "accepted",
      storage: rejected ? "" : load.storage,
      grnNo: rejected ? "" : `GRN-${date.slice(5).replace("-", "")}`,
      status: rejected ? "rejected" : "received",
      entryType: "Purchase",
      gateOperator: "Gate",
      weighbridgeId: "WB-1",
      weighOperator: "Weighbridge",
      grossAt: `${date} 08:25`,
      grossSource: "Manual",
      originalGross: load.gross,
      inspectedAt: `${date} 08:40`,
      inspector: "QC",
      rejectReason: rejected ? "Moisture" : "",
      leftAt: rejected ? `${date} 09:10` : "",
      grnAt: rejected ? "" : `${date} 09:20`,
      receiver: rejected ? "" : "Store",
      unloadAt: rejected ? "" : `${date} 09:30`,
      poQty: String(Math.round((Number(load.gross) - Number(load.tare)) / 10) / 100),
      lotId: `ML-${date.slice(5).replace("-", "")}`,
      qcRelease: rejected ? "Rejected" : "Released",
      closed: rejected ? "No" : "Yes",
    };
  });
  const today = dates[dates.length - 1];
  rows.push({
    id: "IN-GATE",
    createdAt: `${today}T06:40:00`,
    date: today,
    time: "06:40",
    vehicleNo: "MH-10-AB-4412",
    supplier: "Sangli Grain Traders",
    material: "maize",
    poChallan: "PO-210",
    driver: "Ramesh Patil",
    bagCount: "180",
    grossKg: "",
    tareKg: "",
    colour: "",
    moisture: "",
    foreignMatter: "",
    infestation: "",
    qcNote: "",
    decision: "",
    storage: "",
    grnNo: "",
    status: "at-gate",
    entryType: "Purchase",
    gateOperator: "Gate",
    qcRelease: "Pending",
    closed: "No",
  });
  return rows;
}

function outwardSeed(): OutwardTicket[] {
  const dates = recentDates(7);
  const customers = ["Warana Dairy", "Sangli Milk Union", "Kolhapur Feeds", "Ashta Cattle Farm"];
  const products = ["cf-700", "cf-900", "cf-500", "cf-1000", "madhur-mix", "calf-starter", "mineral", "cf-900"];
  const rows = dates.map((date, index): OutwardTicket => {
    const bags = String(40 + index * 5);
    const packed = String(50 * Number(bags));
    return {
      id: `BG-${date.slice(5).replace("-", "")}`,
      createdAt: `${date}T15:10:00`,
      date,
      time: "15:10",
      product: products[index],
      batchNo: `B-${String(900 + index).padStart(4, "0")}`,
      bagWeightKg: "50",
      bagCount: bags,
      godown: "Finished godown",
      customer: customers[index % customers.length],
      salesOrder: `SO-${80 + index}`,
      emptyKg: "3200",
      loadedKg: String(3200 + Number(packed)),
      invoiceNo: `INV-${date.slice(5).replace("-", "")}`,
      challanNo: `CH-${date.slice(5).replace("-", "")}`,
      gatePassNo: `GP-${date.slice(5).replace("-", "")}`,
      status: "dispatched",
      line: "Bagging 1",
      shift: "A",
      bagType: "50 kg PP",
      rejectedBags: "0",
      orderNo: `SO-${80 + index}`,
      availableBags: bags,
      pickedAt: `${date} 14:20`,
      pickedBy: "Dispatch",
      vehicleNo: `MH-09-CD-22${index}`,
      weighbridgeId: "WB-1",
      weighedAt: `${date} 14:40`,
      weighOperator: "Weighbridge",
      weighSource: "Manual",
      issuedBy: "Stores",
      exitAt: `${date} 15:05`,
      docStatus: "Issued",
      qcRelease: "Released",
    };
  });
  const today = dates[dates.length - 1];
  rows.push({
    id: "BG-YARD",
    createdAt: `${today}T11:20:00`,
    date: today,
    time: "11:20",
    product: "cf-700",
    batchNo: "B-0908",
    bagWeightKg: "50",
    bagCount: "120",
    godown: "Finished godown",
    customer: "",
    salesOrder: "",
    emptyKg: "",
    loadedKg: "",
    invoiceNo: "",
    challanNo: "",
    gatePassNo: "",
    status: "bagged",
    line: "Bagging 1",
    shift: "B",
    bagType: "50 kg PP",
    rejectedBags: "2",
    orderNo: "SO-90",
    availableBags: "120",
    qcRelease: "Released",
    docStatus: "Draft",
  });
  return rows;
}

function stampDate<T extends { createdAt: string; date: string; time: string }>(row: T): T {
  return {
    ...row,
    date: row.date || String(row.createdAt || "").slice(0, 10) || todayIso(),
    time: row.time || "",
  };
}

export function deriveInward(row: InwardTicket): InwardTicket {
  const stamped = stampDate(row);
  const decision =
    stamped.decision ||
    (stamped.status === "rejected"
      ? "rejected"
      : stamped.status === "accepted" || stamped.status === "received"
        ? "accepted"
        : "");
  const net = netKg(stamped.grossKg, stamped.tareKg);
  let status: InwardStatus = "at-gate";
  let grnNo = stamped.grnNo;
  if (decision === "rejected") status = "rejected";
  else if (decision === "accepted" && stamped.tareKg && stamped.storage && net) {
    status = "received";
    if (!grnNo) grnNo = `GRN-${stamped.id.split("-")[1] || "0000"}`;
  } else if (decision === "accepted") status = "accepted";
  else if (stamped.grossKg) status = "weighed";
  return { ...stamped, decision, status, grnNo };
}

export function deriveOutward(row: OutwardTicket): OutwardTicket {
  const stamped = stampDate(row);
  const net = netKg(stamped.loadedKg, stamped.emptyKg);
  let status: OutwardStatus = "bagged";
  if (stamped.invoiceNo && stamped.challanNo && stamped.gatePassNo) status = "dispatched";
  else if (stamped.emptyKg && stamped.loadedKg && net) status = "weighed";
  else if (stamped.customer && stamped.salesOrder) status = "picked";
  const docStatus = stamped.cancelReason ? "Cancelled" : stamped.invoiceNo ? "Issued" : stamped.docStatus || "Draft";
  return { ...stamped, status, docStatus, qcRelease: stamped.qcRelease || "Released" };
}

export function listInward() {
  return read(IN_KEY, inwardSeed()).map(deriveInward);
}

export function saveInward(rows: InwardTicket[]) {
  write(IN_KEY, rows.map(deriveInward));
}

export function listOutward() {
  return read(OUT_KEY, outwardSeed()).map(deriveOutward);
}

export function saveOutward(rows: OutwardTicket[]) {
  write(OUT_KEY, rows.map(deriveOutward));
}

export function nextId(prefix: string, rows: { id: string }[]) {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.id).split("-")[1]);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 2400);
  return `${prefix}-${n + 1}`;
}

export function netKg(gross: string, tare: string) {
  const g = Number(gross);
  const t = Number(tare);
  if (!Number.isFinite(g) || !Number.isFinite(t) || g <= 0 || t < 0 || g <= t) return "";
  return String(Math.round((g - t) * 10) / 10);
}

export function packedKg(bagWeight: string, bagCount: string) {
  const weight = Number(bagWeight);
  const count = Number(bagCount);
  if (!Number.isFinite(weight) || !Number.isFinite(count) || weight <= 0 || count < 0) return "";
  return String(Math.round(weight * count));
}

export function inwardStage(row: InwardTicket) {
  if (row.closed === "Yes") return "Closed";
  if (row.decision === "rejected" || row.status === "rejected") return "Rejected";
  if (row.status === "received") return "Received";
  if (row.decision === "accepted" && row.tareKg && !row.grnNo) return "Awaiting unloading";
  if (row.decision === "accepted") return "Accepted";
  if (row.grossKg) return "Awaiting QC";
  return "Awaiting weighment";
}

export function outwardStage(row: OutwardTicket) {
  if (row.docStatus === "Cancelled" || row.cancelReason) return "Cancelled";
  if (row.status === "dispatched" && row.exitAt) return "Exited";
  if (row.status === "dispatched") return "Issued";
  if (row.status === "weighed") return "Documents pending";
  if (row.status === "picked") return "Awaiting weighment";
  if ((row.qcRelease || "Released") === "Released") return "Ready for pick";
  return "Bagging";
}

export function inwardOpen(stage: string) {
  if (stage === "Awaiting weighment") return "/inward-outward/weighbridge";
  if (stage === "Awaiting QC" || stage === "Rejected") return "/inward-outward/quality-check";
  if (stage === "Accepted" || stage === "Awaiting unloading" || stage === "Received" || stage === "Closed") return "/inward-outward/goods-receipt";
  return "/inward-outward/gate-entry";
}

export function outwardOpen(stage: string) {
  if (stage === "Bagging" || stage === "Ready for pick") return "/inward-outward/dispatch";
  if (stage === "Awaiting weighment") return "/inward-outward/dispatch-weigh";
  if (stage === "Documents pending" || stage === "Issued" || stage === "Exited" || stage === "Cancelled") return "/inward-outward/documents";
  return "/inward-outward/bagging";
}

export function duplicateVehicle(rows: InwardTicket[], vehicle: string, exceptId = "") {
  const key = vehicle.trim().toLowerCase();
  if (!key) return false;
  return rows.some((row) => {
    if (row.id === exceptId || row.vehicleNo.trim().toLowerCase() !== key) return false;
    const stage = inwardStage(row);
    return stage === "Awaiting weighment" || stage === "Awaiting QC" || stage === "Accepted" || stage === "Awaiting unloading";
  });
}

export function waitingLong(date: string, time: string) {
  if (!date) return false;
  const stamp = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(stamp.getTime())) return false;
  return Date.now() - stamp.getTime() > 2 * 60 * 60 * 1000;
}

export function materialLabel(value: string) {
  return RAW_MATERIALS.find((m) => m.value === value)?.label || value || "—";
}

export function productLabel(value: string) {
  return FEED_PRODUCTS.find((m) => m.value === value)?.label || value || "—";
}

export function storageForMaterial(material: string) {
  if (material === "molasses") return "molasses-tank";
  if (material === "maize" || material === "rice-polish") return "silo";
  return "godown";
}
