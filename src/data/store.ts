export type RackStatus = "In Stock" | "Low Stock" | "Empty" | "Reserved" | "Overflow";

export type RackRow = {
  rack: string;
  material: string;
  stockMt: number | null;
  bags: number | null;
  supplier: string;
  grade: string;
  cp: string;
  fat: string;
  moisture: string;
  inward: string;
  expiry: string;
  status: RackStatus;
};

export type StoreId = "A" | "B" | "C";

export const STORE_TOTALS = [
  { id: "A" as const, stockMt: 452.8, share: 36.3 },
  { id: "B" as const, stockMt: 638.5, share: 51.2 },
  { id: "C" as const, stockMt: 157.3, share: 12.6 },
];

export const STORE_ALERTS = [
  { material: "Wheat Bran", place: "Store B5", note: "12.5 MT left (below min level)", ago: "2h ago" },
  { material: "Vitamin Premix", place: "Store A2", note: "5 bags left (below min level)", ago: "3h ago" },
  { material: "Salt", place: "Store C1", note: "8.2 MT left (below reorder level)", ago: "4h ago" },
  { material: "Maize (Corn)", place: "Store A1", note: "25 MT left (below reorder level)", ago: "5h ago" },
];

export const STOCK_TREND = [
  { day: "02 Sep", mt: 108, bags: 410 },
  { day: "03 Sep", mt: 124, bags: 458 },
  { day: "04 Sep", mt: 96, bags: 372 },
  { day: "05 Sep", mt: 132, bags: 510 },
  { day: "06 Sep", mt: 126, bags: 468 },
  { day: "07 Sep", mt: 112, bags: 430 },
  { day: "08 Sep", mt: 120.5, bags: 482 },
];

export const TREND_CALLOUT = {
  material: "DDGS",
  currentMt: "120.5 MT",
  bags: "482 Bags",
  minLevel: "50 MT",
  reorderLevel: "70 MT",
};

export type LayoutTone = "ok" | "low" | "empty" | "hold" | "over" | "out";

export type LayoutCell = {
  rack: string;
  label: string;
  stock: string;
  tone: LayoutTone;
};

const cell = (rack: string, label: string, stock: string, tone: LayoutTone): LayoutCell => ({
  rack,
  label,
  stock,
  tone,
});

export const STORE_A_LAYOUT: { row: string; cells: LayoutCell[] }[] = [
  {
    row: "Row 1",
    cells: [
      cell("A1", "DDGS", "120.5 MT", "ok"),
      cell("A2", "Maize (Corn)", "85.0 MT", "ok"),
      cell("A3", "Soybean Meal", "72.8 MT", "ok"),
      cell("A4", "Wheat Bran", "43.2 MT", "ok"),
      cell("A5", "Rice Bran", "38.6 MT", "ok"),
    ],
  },
  {
    row: "Row 2",
    cells: [
      cell("A6", "Limestone", "25.4 MT", "ok"),
      cell("A7", "DCP", "18.9 MT", "ok"),
      cell("A8", "Salt", "12.6 MT", "ok"),
      cell("A9", "Vitamin Premix", "5.8 MT", "low"),
      cell("A10", "Methionine", "8.4 MT", "ok"),
    ],
  },
  {
    row: "Row 3",
    cells: ["A11", "A12", "A13", "A14", "A15"].map((rack) => cell(rack, "Empty", "", "empty")),
  },
  {
    row: "Row 4",
    cells: ["A16", "A17", "A18", "A19", "A20"].map((rack) => cell(rack, "Reserved", "", "hold")),
  },
  {
    row: "Row 5",
    cells: [
      cell("B1", "Overflow", "", "over"),
      cell("B2", "Overflow", "", "over"),
      cell("B3", "Overflow", "", "over"),
      cell("B4", "Overflow", "", "over"),
      cell("B5", "Wheat Bran", "12.5 MT", "low"),
    ],
  },
];

export const PARAM_SUMMARY = [
  { material: "DDGS", cp: "28.0", fat: "10.5", moisture: "10.2", status: "OK" },
  { material: "Maize (Corn)", cp: "9.5", fat: "4.0", moisture: "12.8", status: "OK" },
  { material: "Soybean Meal", cp: "46.0", fat: "1.5", moisture: "11.1", status: "OK" },
  { material: "Wheat Bran", cp: "15.2", fat: "3.8", moisture: "12.0", status: "OK" },
  { material: "Rice Bran", cp: "14.8", fat: "12.5", moisture: "10.8", status: "OK" },
  { material: "Limestone", cp: "0.6", fat: "0.2", moisture: "3.5", status: "OK" },
];

export const RECENT_MOVES = [
  { title: "DDGS — Inward", detail: "08 Sep 2026 · 120 MT · ABC Feeds", tone: "in" },
  { title: "Wheat Bran — Issue", detail: "08 Sep 2026 · 10 MT · Production", tone: "out" },
  { title: "Maize (Corn) — Inward", detail: "06 Sep 2026 · 85 MT · Shree Ram Agro", tone: "in" },
  { title: "Vitamin Premix — Issue", detail: "03 Sep 2026 · 5 bags · Production", tone: "out" },
];

const filled = (
  rack: string,
  material: string,
  stockMt: number,
  bags: number,
  supplier: string,
  grade: string,
  cp: string,
  fat: string,
  moisture: string,
  inward: string,
  expiry: string,
  status: RackStatus = "In Stock",
): RackRow => ({
  rack,
  material,
  stockMt,
  bags,
  supplier,
  grade,
  cp,
  fat,
  moisture,
  inward,
  expiry,
  status,
});

const blank = (rack: string, status: RackStatus): RackRow => ({
  rack,
  material: status,
  stockMt: null,
  bags: null,
  supplier: "",
  grade: "",
  cp: "",
  fat: "",
  moisture: "",
  inward: "",
  expiry: "",
  status,
});

export const STORE_RACKS: Record<StoreId, RackRow[]> = {
  A: [
    filled("A1", "DDGS", 120.5, 482, "ABC Feeds Pvt. Ltd.", "Standard", "28.0", "10.5", "10.2", "06 Sep 2026", "03 Jan 2027"),
    filled("A2", "Maize (Corn)", 85, 340, "Shree Ram Agro", "Food Grade", "9.5", "4.0", "12.8", "05 Sep 2026", "02 Jan 2027"),
    filled("A3", "Soybean Meal", 72.8, 295, "Ravi Traders", "Solvent Extracted", "46.0", "1.5", "11.1", "04 Sep 2026", "01 Jan 2027"),
    filled("A4", "Wheat Bran", 43.2, 198, "Agri Solutions", "Standard", "15.2", "3.8", "12.0", "02 Sep 2026", "28 Dec 2026"),
    filled("A5", "Rice Bran", 38.6, 165, "Green Yield", "Standard", "14.8", "12.5", "10.8", "01 Sep 2026", "27 Dec 2026"),
    filled("A6", "Limestone", 25.4, 110, "Shivam Minerals", "Feed Grade", "0.6", "0.2", "3.5", "28 Aug 2026", "25 Dec 2026"),
    filled("A7", "DCP (Dicalcium Phosphate)", 18.9, 72, "Sahyadri Minerals", "Feed Grade", "18.0", "1.0", "2.5", "26 Aug 2026", "20 Dec 2026"),
    filled("A8", "Salt", 12.6, 54, "Tata Chemicals", "—", "0.0", "0.0", "0.1", "22 Aug 2026", "—"),
    filled("A9", "Vitamin Premix", 5.8, 24, "NutriCare", "Premix", "12.0", "8.5", "2.0", "18 Aug 2026", "17 Nov 2026", "Low Stock"),
    filled("A10", "Methionine", 8.4, 32, "Global Nutrients", "Feed Grade", "98.5", "0.5", "1.0", "15 Aug 2026", "—"),
    blank("A11", "Empty"),
    blank("A12", "Empty"),
    blank("A13", "Empty"),
    blank("A14", "Empty"),
    blank("A15", "Empty"),
    blank("A16", "Reserved"),
    blank("A17", "Reserved"),
    blank("A18", "Reserved"),
    blank("A19", "Reserved"),
    blank("A20", "Reserved"),
    blank("B1", "Overflow"),
    blank("B2", "Overflow"),
    blank("B3", "Overflow"),
    blank("B4", "Overflow"),
    blank("B5", "Overflow"),
  ],
  B: [
    filled("B1", "Maize (Corn)", 210.4, 840, "Sangli Grain Traders", "Food Grade", "9.2", "3.8", "12.4", "07 Sep 2026", "04 Jan 2027"),
    filled("B2", "Soybean Meal", 164.2, 650, "Kupwad Oil Mill", "Solvent Extracted", "46.5", "1.4", "10.6", "06 Sep 2026", "02 Jan 2027"),
    filled("B3", "Wheat Bran", 96.8, 390, "Agri Solutions", "Standard", "15.0", "3.6", "12.2", "04 Sep 2026", "30 Dec 2026"),
    filled("B4", "Rice Bran", 88.1, 350, "Miraj Rice Polish Co.", "Standard", "14.2", "12.1", "11.0", "03 Sep 2026", "28 Dec 2026"),
    filled("B5", "Wheat Bran", 12.5, 48, "Agri Solutions", "Standard", "15.1", "3.7", "12.4", "01 Sep 2026", "20 Dec 2026", "Low Stock"),
    filled("B6", "DDGS", 66.5, 260, "ABC Feeds Pvt. Ltd.", "Standard", "27.4", "10.2", "10.0", "29 Aug 2026", "22 Dec 2026"),
  ],
  C: [
    filled("C1", "Salt", 8.2, 32, "Tata Chemicals", "—", "0.0", "0.0", "0.2", "02 Sep 2026", "—", "Low Stock"),
    filled("C2", "Molasses", 74.6, 0, "Kolhapur Molasses Tankers", "Feed Grade", "4.2", "0.1", "22.0", "08 Sep 2026", "08 Dec 2026"),
    filled("C3", "Limestone", 41.5, 160, "Shivam Minerals", "Feed Grade", "0.5", "0.1", "3.2", "27 Aug 2026", "20 Dec 2026"),
    filled("C4", "Vitamin Premix", 18.4, 72, "NutriCare", "Premix", "11.6", "8.2", "2.1", "20 Aug 2026", "18 Nov 2026"),
    filled("C5", "Packing Bags", 14.6, 5840, "Ashta Packaging", "50 kg", "—", "—", "—", "05 Sep 2026", "—"),
  ],
};
