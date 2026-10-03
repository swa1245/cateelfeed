import { recentDates } from "@/data/movements";
import type { PreventiveRow, BreakdownRow, ChecklistRow, SpareRow } from "@/data/maintenance";
import type { PlanRow, FormulaRow, NutrientRow, ApprovalEvent } from "@/data/planning";
import type { BatchRow, MaterialIssueRow, ReportRow, ProcessLogRow, ShiftReportRow, BatchReportRow, DowntimeRow } from "@/data/production";
import type { FinishQcRow, ProcessQcRow, RawQcRow, SampleRow } from "@/data/qc";
import type { BoilerRow, CompressorRow, FuelRow, PowerRow, WaterRow } from "@/data/utility";
import type { FlowRow, MovementRow, StockReportRow } from "@/data/warehouse";

const DAY = [
  { product: "cf-700", label: "CF 700", bags: 80, shift: "A" },
  { product: "cf-900", label: "CF 900", bags: 90, shift: "A" },
  { product: "cf-500", label: "CF 500", bags: 70, shift: "B" },
  { product: "cf-1000", label: "CF 1000", bags: 60, shift: "A" },
  { product: "madhur-mix", label: "Madhur Mix", bags: 50, shift: "B" },
  { product: "calf-starter", label: "Calf Starter", bags: 40, shift: "A" },
  { product: "mineral", label: "Mineral mixture", bags: 24, shift: "B" },
  { product: "cf-900", label: "CF 900", bags: 80, shift: "A" },
] as const;

const FORMULA: Record<string, [string, string][]> = {
  "cf-700": [
    ["maize", "42.9"],
    ["oil-cake", "21.4"],
    ["rice-polish", "11.4"],
    ["wheat-bran", "8.6"],
    ["dorb", "4.3"],
    ["limestone", "3.6"],
    ["salt", "1.4"],
    ["premix", "0.7"],
    ["molasses", "5.7"],
  ],
  "cf-900": [
    ["maize", "38.0"],
    ["oil-cake", "24.0"],
    ["rice-polish", "10.0"],
    ["wheat-bran", "8.0"],
    ["dorb", "6.0"],
    ["limestone", "4.0"],
    ["salt", "1.5"],
    ["premix", "1.0"],
    ["molasses", "7.5"],
  ],
  "cf-500": [
    ["maize", "45.0"],
    ["oil-cake", "16.0"],
    ["rice-polish", "12.0"],
    ["wheat-bran", "12.0"],
    ["dorb", "6.0"],
    ["limestone", "3.0"],
    ["salt", "1.0"],
    ["premix", "0.5"],
    ["molasses", "4.5"],
  ],
  "cf-1000": [
    ["maize", "36.0"],
    ["oil-cake", "28.0"],
    ["rice-polish", "8.0"],
    ["wheat-bran", "8.0"],
    ["dorb", "5.0"],
    ["limestone", "4.0"],
    ["salt", "1.5"],
    ["premix", "1.0"],
    ["molasses", "8.5"],
  ],
  "madhur-mix": [
    ["maize", "50.0"],
    ["oil-cake", "18.0"],
    ["molasses", "12.0"],
    ["wheat-bran", "10.0"],
    ["premix", "1.0"],
    ["salt", "1.0"],
    ["limestone", "3.0"],
    ["rice-polish", "5.0"],
  ],
  "calf-starter": [
    ["maize", "48.0"],
    ["oil-cake", "22.0"],
    ["wheat-bran", "12.0"],
    ["premix", "2.0"],
    ["limestone", "3.0"],
    ["salt", "1.0"],
    ["molasses", "6.0"],
    ["rice-polish", "6.0"],
  ],
  mineral: [
    ["limestone", "40.0"],
    ["salt", "20.0"],
    ["dorb", "20.0"],
    ["premix", "10.0"],
    ["maize", "10.0"],
  ],
};

const TODAY_GRADES = ["cf-700", "cf-500", "cf-900", "madhur-mix"] as const;

const NUTRIENTS: Record<string, [string, string, string, string][]> = {
  "cf-700": [
    ["Crude protein", "16.5", "16.0", "18.0"],
    ["Crude fat", "4.5", "3.5", "6.0"],
    ["Crude fibre", "6.0", "0.0", "8.0"],
    ["Ash", "8.0", "0.0", "10.0"],
    ["Calcium", "0.9", "0.8", "1.2"],
    ["Phosphorus", "0.7", "0.5", "1.0"],
    ["Moisture", "11.0", "0.0", "11.0"],
  ],
  "cf-900": [
    ["Crude protein", "20.0", "18.0", "22.0"],
    ["Crude fat", "5.5", "4.0", "7.0"],
    ["Crude fibre", "7.0", "0.0", "10.0"],
    ["Calcium", "1.0", "0.8", "1.4"],
    ["Phosphorus", "0.8", "0.5", "1.1"],
    ["Moisture", "11.0", "0.0", "11.0"],
  ],
  "cf-500": [
    ["Crude protein", "18.0", "16.0", "20.0"],
    ["Crude fat", "3.5", "2.5", "5.0"],
    ["Crude fibre", "8.0", "0.0", "12.0"],
    ["Calcium", "0.8", "0.6", "1.2"],
    ["Phosphorus", "0.6", "0.4", "0.9"],
    ["Moisture", "11.0", "0.0", "11.0"],
  ],
  "madhur-mix": [
    ["Crude protein", "14.0", "12.0", "16.0"],
    ["Crude fat", "3.5", "2.5", "5.0"],
    ["Crude fibre", "8.0", "0.0", "12.0"],
    ["Calcium", "0.8", "0.6", "1.2"],
    ["Phosphorus", "0.5", "0.4", "0.8"],
    ["Moisture", "11.0", "0.0", "11.0"],
  ],
};

function stamp(index: number) {
  return recentDates(7)[index].slice(5).replace("-", "");
}

function batchNo(index: number) {
  return `B-${String(900 + index).padStart(4, "0")}`;
}

function packed(bags: number) {
  return ((bags * 50) / 1000).toFixed(2);
}

/** Today's mill plan. Batch count × batch size equals the planned tonnes. */
export function todayMillPlans(date: string): PlanRow[] {
  const mark = date.slice(5).replace("-", "");
  return [
    {
      id: `PL-MILL-${mark}-A`,
      date,
      shift: "A",
      product: "cf-700",
      planMt: "56.00",
      batchMt: "7.00",
      batches: "8",
      form: "Pellet",
      status: "Running",
      remarks: "Morning grade on the mill",
    },
    {
      id: `PL-MILL-${mark}-A2`,
      date,
      shift: "A",
      product: "cf-500",
      planMt: "28.00",
      batchMt: "7.00",
      batches: "4",
      form: "Pellet",
      status: "Released",
      remarks: "Second grade on shift A",
    },
    {
      id: `PL-MILL-${mark}-B`,
      date,
      shift: "B",
      product: "cf-900",
      planMt: "42.00",
      batchMt: "7.00",
      batches: "6",
      form: "Pellet",
      status: "Released",
      remarks: "Afternoon high-protein grade",
    },
    {
      id: `PL-MILL-${mark}-C`,
      date,
      shift: "C",
      product: "madhur-mix",
      planMt: "12.00",
      batchMt: "4.00",
      batches: "3",
      form: "Mash",
      status: "Draft",
      remarks: "Night mash, waiting release",
    },
  ];
}

export function weekPlans(): PlanRow[] {
  const dates = recentDates(7);
  return dates.flatMap((date, index) => {
    if (index === dates.length - 1) return todayMillPlans(date);
    const day = DAY[index];
    const mt = packed(day.bags);
    return [
      {
        id: `PL-${stamp(index)}-A`,
        date,
        shift: day.shift,
        product: day.product,
        planMt: mt,
        batchMt: mt,
        batches: "1",
        form: day.product === "calf-starter" ? "Mash" : "Pellet",
        status: "Done",
        remarks: `${batchNo(index)} packed`,
      },
    ];
  });
}

export function todayFormula(date: string): FormulaRow[] {
  const mark = date.slice(5).replace("-", "");
  const rows: FormulaRow[] = [];
  TODAY_GRADES.forEach((product) => {
    (FORMULA[product] || []).forEach(([material, inclusion], line) => {
      rows.push({
        id: `FM-MILL-${mark}-${product}-${line + 1}`,
        date,
        product,
        material,
        inclusion,
        kgPerMt: (Number(inclusion) * 10).toFixed(1),
        remarks: "",
        version: "1",
        effectiveFrom: date,
        status: "Approved",
      });
    });
  });
  return rows;
}

export function weekFormula(): FormulaRow[] {
  const dates = recentDates(7);
  const rows: FormulaRow[] = [];
  dates.forEach((date, index) => {
    if (index === dates.length - 1) {
      rows.push(...todayFormula(date));
      return;
    }
    Object.entries(FORMULA).forEach(([product, lines]) => {
      lines.forEach(([material, inclusion], line) => {
        rows.push({
          id: `FM-${product}-${stamp(index)}-${line + 1}`,
          date,
          product,
          material,
          inclusion,
          kgPerMt: (Number(inclusion) * 10).toFixed(1),
          remarks: "",
          version: "1",
          effectiveFrom: date,
          status: "Approved",
        });
      });
    });
  });
  return rows;
}

export function todayNutrients(date: string): NutrientRow[] {
  const mark = date.slice(5).replace("-", "");
  const rows: NutrientRow[] = [];
  TODAY_GRADES.forEach((product) => {
    (NUTRIENTS[product] || []).forEach(([nutrient, target, min, max], line) => {
      rows.push({
        id: `NT-MILL-${mark}-${product}-${line + 1}`,
        date,
        product,
        nutrient,
        target,
        min,
        max,
        unit: "%",
        basis: "As-fed",
        mandatory: "Yes",
        status: "Approved",
        version: "1",
      });
    });
  });
  return rows;
}

export function weekNutrients(): NutrientRow[] {
  const dates = recentDates(7);
  const rows: NutrientRow[] = [];
  dates.forEach((date, index) => {
    if (index === dates.length - 1) {
      rows.push(...todayNutrients(date));
      return;
    }
    Object.entries(NUTRIENTS).forEach(([product, lines]) => {
      lines.forEach(([nutrient, target, min, max], line) => {
        rows.push({
          id: `NT-${product}-${stamp(index)}-${line + 1}`,
          date,
          product,
          nutrient,
          target,
          min,
          max,
          unit: "%",
          basis: "As-fed",
          mandatory: "Yes",
          status: "Approved",
          version: "1",
        });
      });
    });
  });
  return rows;
}

export function weekApprovals(): ApprovalEvent[] {
  const first = recentDates(7)[0];
  return (["cf-700", "cf-900", "cf-500"] as const).map((product, index) => ({
    id: `AP-${index + 1}`,
    sheet: "formula" as const,
    product,
    version: "1",
    action: "Approved",
    at: `${first}T07:00:00`,
    note: "Grade sheet released to the mill",
  }));
}

export function weekBatches(): BatchRow[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): BatchRow => {
    const day = DAY[index];
    const mt = packed(day.bags);
    return {
      id: `BH-${stamp(index)}`,
      date,
      time: "06:30",
      endTime: "14:20",
      batchNo: batchNo(index),
      product: day.product,
      shift: day.shift,
      qtyMt: mt,
      bags: String(day.bags),
      status: "Completed",
      remarks: "Pelleted and packed",
      orderNo: `PL-${stamp(index)}-A`,
      formulaVersion: "1",
      producedMt: mt,
      reconReason: "",
      reconBy: "Supervisor",
    };
  });
  const today = dates[dates.length - 1];
  rows.push({
    id: "BH-RUN",
    date: today,
    time: "09:00",
    endTime: "",
    batchNo: "B-0908",
    product: "cf-700",
    shift: "B",
    qtyMt: "50.00",
    bags: "365",
    status: "In progress",
    remarks: "Pellet press running",
    orderNo: "PL-RUN",
    formulaVersion: "1",
    producedMt: "",
  });
  return rows;
}

const ISSUE_LINES: [string, number, string][] = [
  ["maize", 0.429, "Silo"],
  ["oil-cake", 0.214, "Godown"],
  ["molasses", 0.057, "Molasses tank"],
];

export function weekIssues(): MaterialIssueRow[] {
  const dates = recentDates(7);
  const rows: MaterialIssueRow[] = [];
  dates.forEach((date, index) => {
    const day = DAY[index];
    const mt = (day.bags * 50) / 1000;
    ISSUE_LINES.forEach(([material, share, source], line) => {
      const kg = Math.round(mt * 1000 * share);
      rows.push({
        id: `RM-${stamp(index)}-${line + 1}`,
        date,
        batchNo: batchNo(index),
        shift: day.shift,
        material,
        requiredKg: String(kg),
        qtyKg: String(kg),
        status: "Done",
        source,
        formulaVersion: "1",
        lotId: `ML-${stamp(index)}`,
        startTime: "06:40",
        endTime: "07:05",
        weighedBy: "Mill",
        verifiedBy: "Supervisor",
        scaleId: "WB-2",
        qcStatus: "Released",
        tolerancePct: "0.5",
      });
    });
  });
  const today = dates[dates.length - 1];
  const running: [string, string, string, string][] = [
    ["maize", "3000", "3000", "Done"],
    ["oil-cake", "1500", "1500", "Done"],
    ["rice-polish", "800", "800", "Done"],
    ["wheat-bran", "600", "600", "Done"],
    ["dorb", "300", "300", "Done"],
    ["limestone", "250", "250", "Done"],
    ["salt", "100", "100", "Done"],
    ["premix", "50", "50", "Done"],
    ["molasses", "400", "220", "Short"],
  ];
  running.forEach(([material, requiredKg, qtyKg], line) => {
    rows.push({
      id: `RM-RUN-${line + 1}`,
      date: today,
      batchNo: "B-0908",
      shift: "B",
      material,
      requiredKg,
      qtyKg,
      status: "Done",
      source: material === "molasses" ? "Molasses tank" : material === "maize" ? "Silo" : "Godown",
      formulaVersion: "1",
      lotId: `ML-${stamp(dates.length - 1)}`,
      startTime: "09:10",
      endTime: material === "molasses" ? "" : "09:40",
      weighedBy: "Mill",
      verifiedBy: material === "molasses" ? "" : "Supervisor",
      scaleId: "WB-2",
      qcStatus: "Released",
      tolerancePct: "0.5",
    });
  });
  return rows;
}

export function weekReports(): ReportRow[] {
  const dates = recentDates(7);
  return dates.flatMap((date, index) => {
    const day = DAY[index];
    const rows: ReportRow[] = [
      {
        id: `RP-${stamp(index)}`,
        date,
        time: "14:30",
        shift: day.shift,
        level: "Note",
        title: "Batch packed and closed",
        batchNo: batchNo(index),
        bags: String(day.bags),
        note: `${packed(day.bags)} MT moved to the finished godown`,
        category: "Process",
        machine: "Bagging line",
        ack: "Acknowledged",
      },
    ];
    if (index === dates.length - 1) {
      rows.push({
        id: "RP-RUN",
        date,
        time: "11:10",
        shift: "B",
        level: "Watch",
        title: "Molasses still short",
        batchNo: "B-0908",
        bags: "365",
        note: "220 kg of 400 kg weighed",
        category: "Material",
        machine: "Mixer",
        ack: "Open",
      });
    }
    return rows;
  });
}

export function weekLogs(): ProcessLogRow[] {
  const dates = recentDates(7);
  const points = [
    ["09:10", "Milling", "Milling feed rate", "5.0 t/h", "Sensor"],
    ["10:20", "Pellet Machine", "Die temperature", "52 °C", "Sensor"],
    ["11:05", "Cooler", "Cooler outlet", "38 °C", "Manual"],
  ] as const;
  const rows: ProcessLogRow[] = [];
  dates.forEach((date, index) => {
    points.forEach(([time, stage, name, value, source], line) => {
      rows.push({
        id: `PLG-${stamp(index)}-${line + 1}`,
        date,
        time,
        batchNo: batchNo(index),
        stage,
        name,
        value,
        state: "Normal",
        source,
        operator: "Mill",
        ack: "Acknowledged",
        action: "",
      });
    });
  });
  const today = dates[dates.length - 1];
  rows.push({
    id: "PLG-RUN",
    date: today,
    time: "11:40",
    batchNo: "B-0908",
    stage: "Sieves",
    name: "Sieve efficiency",
    value: "92.5%",
    state: "Normal",
    source: "Manual",
    operator: "QC",
    ack: "Open",
    action: "Watch vibration",
  });
  return rows;
}

export function weekShiftReports(): ShiftReportRow[] {
  const dates = recentDates(7);
  return dates.flatMap((date, index) => {
    const day = DAY[index];
    const mt = packed(day.bags);
    const rows: ShiftReportRow[] = [
      {
        id: `SR-${stamp(index)}`,
        date,
        shift: day.shift,
        plannedMt: mt,
        actualMt: mt,
        packedMt: mt,
        bags: String(day.bags),
        consumption: "Within the approved formula",
        batchTimes: `${batchNo(index)} 06:30–14:20`,
        downtime: "0.3 h",
        downtimeReason: "Die check",
        carryOver: "None",
      },
    ];
    if (index === dates.length - 1) {
      rows.push({
        id: "SR-RUN",
        date,
        shift: "B",
        plannedMt: "50.00",
        actualMt: "18.25",
        packedMt: "18.25",
        bags: "365",
        consumption: "Molasses short 180 kg",
        batchTimes: "B-0908 09:00 onwards",
        downtime: "0.2 h",
        downtimeReason: "Sieve check",
        carryOver: "Packing continues",
      });
    }
    return rows;
  });
}

export function weekBatchReports(): BatchReportRow[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): BatchReportRow => {
    const day = DAY[index];
    const mt = packed(day.bags);
    return {
      id: `BR-${stamp(index)}`,
      date,
      batchNo: batchNo(index),
      orderNo: `PL-${stamp(index)}-A`,
      formulaVersion: "1",
      ingredients: `Approved ${day.label} formula`,
      deviations: "None",
      goodMt: mt,
      rejectMt: "0",
      wasteMt: "0.00",
      qcDecision: "Pass",
      operator: "Mill",
      supervisor: "Supervisor",
    };
  });
  rows.push({
    id: "BR-RUN",
    date: dates[dates.length - 1],
    batchNo: "B-0908",
    orderNo: "PL-RUN",
    formulaVersion: "1",
    ingredients: "Approved CF 700 formula",
    deviations: "Molasses 220 of 400 kg",
    goodMt: "18.25",
    rejectMt: "0",
    wasteMt: "",
    qcDecision: "Pending",
    operator: "Mill",
    supervisor: "",
  });
  return rows;
}

export function weekDowntime(): DowntimeRow[] {
  const dates = recentDates(7);
  return dates.map((date, index) => ({
    id: `DT-${stamp(index)}`,
    date,
    shift: DAY[index].shift,
    machine: index % 2 === 0 ? "Pellet mill" : "Sieve",
    stage: index % 2 === 0 ? "Pellet Machine" : "Sieves",
    start: "11:10",
    end: "11:25",
    reason: index % 2 === 0 ? "Die check" : "Vibration high",
    severity: "Watch",
    qtyMt: "0.10",
    action: "Cleared and restarted",
    person: "Mill",
    maintenance: "No",
  }));
}

const RAW_DAY = [
  ["Maize", "Sangli Grain Traders", "12.4", "9.5", "4.0", "2.2", "12"],
  ["Wheat bran", "Agri Solutions", "11.8", "15.2", "3.8", "10.4", "14"],
  ["Rice polish", "Miraj Rice Polish Co.", "10.6", "13.0", "14.0", "8.0", "16"],
  ["De-oiled rice bran", "Green Yield", "10.8", "14.8", "1.5", "9.1", "18"],
  ["Oil cake", "Kupwad Oil Mill", "10.2", "40.0", "8.0", "12.0", "8"],
  ["Limestone", "Shivam Minerals", "3.2", "0.6", "0.2", "0.4", "0"],
  ["Salt", "Tata Chemicals", "0.4", "0.0", "0.0", "0.0", "0"],
  ["Molasses", "Kolhapur Molasses Tankers", "22.0", "4.2", "0.1", "0.0", "0"],
] as const;

export function weekRawQc(): RawQcRow[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): RawQcRow => {
    const [material, supplier, moisture, cp, fat, fibre, aflatoxin] = RAW_DAY[index];
    return {
      id: `QR-${stamp(index)}`,
      date,
      sampleNo: `RM-${stamp(index)}`,
      shift: "A",
      material,
      supplier,
      moisture,
      cp,
      fat,
      fibre,
      aflatoxin,
      colour: "Ok",
      odour: "Ok",
      foreignMatter: "Ok",
      infestation: "Ok",
      fungal: "Ok",
      packaging: "Ok",
      decision: "Pass",
      reasonCode: "",
      remarks: "Centre and bag edge sampled",
      gateRef: `IN-${stamp(index)}`,
      supplierLot: `SL-${stamp(index)}`,
      internalLot: `ML-${stamp(index)}`,
      collectedAt: `${date} 08:20`,
      sampleLocation: "Quarantine bay",
      sampleQty: "1 kg",
      method: "Mill lab",
      inspector: "QC",
      technician: "Lab",
      coaRef: `COA-${stamp(index)}`,
      retestDate: "",
      retestResult: "",
      lotRelease: "Lot confirmed",
    };
  });
  const today = dates[dates.length - 1];
  rows.push({
    id: "QR-HOLD",
    date: today,
    sampleNo: "RM-HOLD",
    shift: "B",
    material: "Wheat bran",
    supplier: "Agri Solutions",
    moisture: "12.0",
    cp: "15.2",
    fat: "3.8",
    fibre: "10.4",
    aflatoxin: "22",
    colour: "Ok",
    odour: "Ok",
    foreignMatter: "Fail",
    infestation: "Ok",
    fungal: "Ok",
    packaging: "Ok",
    decision: "Hold",
    reasonCode: "Aflatoxin B1",
    remarks: "Aflatoxin B1 above 20 ppb. The sample does not release the load.",
    gateRef: "Gate",
    supplierLot: "WB-HOLD",
    internalLot: "ML-HOLD",
    collectedAt: `${today} 11:10`,
    sampleLocation: "Quarantine bay",
    sampleQty: "1 kg",
    method: "Mill lab",
    inspector: "QC",
    technician: "Lab",
    coaRef: "",
    retestDate: "",
    retestResult: "",
    lotRelease: "Sample only",
  });
  return rows;
}

export function weekProcessQc(): ProcessQcRow[] {
  const dates = recentDates(7);
  const stages = [
    ["Mixing", "12.2", "", "", "32", "11", "14", "Mash bin", "Mixer 1"],
    ["Cooling", "11.2", "93", "2.4", "38", "10", "12", "Cooler outlet", "Cooler"],
  ] as const;
  const rows: ProcessQcRow[] = [];
  dates.forEach((date, index) => {
    const day = DAY[index];
    stages.forEach(([stage, moisture, durability, fines, temp, moistureMin, moistureMax, tempPoint, machine], line) => {
      rows.push({
        id: `QP-${stamp(index)}-${line + 1}`,
        date,
        batchNo: batchNo(index),
        shift: day.shift,
        stage,
        moisture,
        durability,
        fines,
        temp,
        decision: "Pass",
        remarks: "In range",
        orderNo: `PL-${stamp(index)}-A`,
        sampleNo: `PR-${stamp(index)}-${line + 1}`,
        product: day.label,
        formulaVersion: "1",
        line: "Pellet line 1",
        machine,
        sampleAt: `${date} 10:${line === 0 ? "10" : "40"}`,
        testAt: `${date} 10:${line === 0 ? "25" : "55"}`,
        moistureMin,
        moistureMax,
        tempPoint,
        operator: "Mill",
        inspector: "QC",
        reviewer: "QC",
        corrective: "",
        retestRef: "",
      });
    });
  });
  return rows;
}

export function weekFinishQc(): FinishQcRow[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): FinishQcRow => {
    const day = DAY[index];
    return {
      id: `QF-${stamp(index)}`,
      date,
      batchNo: batchNo(index),
      shift: day.shift,
      product: day.label,
      feedType: "Type I",
      form: day.product === "calf-starter" ? "Mash" : "Pellet",
      moisture: "10.6",
      cp: "18.4",
      fat: "4.2",
      fibre: "8.0",
      aia: "2.6",
      salt: "0.8",
      calcium: "0.9",
      phosphorus: "0.7",
      availableP: "0.4",
      urea: "0.1",
      vitaminA: "7000",
      vitaminD3: "800",
      vitaminE: "20",
      aflatoxin: "8",
      pellet: "Pass",
      durability: "93",
      fines: "2.4",
      decision: "Pass",
      reasonCode: "",
      orderNo: `PL-${stamp(index)}-A`,
      formulaVersion: "1",
      mfgDate: date,
      sampleNo: `FF-${stamp(index)}`,
      sampleAt: `${date} 15:10`,
      method: "Mill lab",
      testStatus: "Pass",
      reviewer: "QC",
      retestRef: "",
      coaRef: `COA-FF-${stamp(index)}`,
    };
  });
  const today = dates[dates.length - 1];
  rows.push({
    id: "QF-RUN",
    date: today,
    batchNo: "B-0908",
    shift: "B",
    product: "CF 700",
    feedType: "Type I",
    form: "Pellet",
    moisture: "",
    cp: "",
    fat: "",
    fibre: "",
    aia: "",
    salt: "",
    calcium: "",
    phosphorus: "",
    availableP: "",
    urea: "",
    vitaminA: "",
    vitaminD3: "",
    vitaminE: "",
    aflatoxin: "",
    pellet: "Pass",
    durability: "",
    fines: "",
    decision: "Pending",
    reasonCode: "",
    orderNo: "PL-RUN",
    formulaVersion: "1",
    mfgDate: today,
    sampleNo: "FF-RUN",
    sampleAt: `${today} 12:10`,
    method: "Mill lab",
    testStatus: "Pending",
    reviewer: "",
    retestRef: "",
    coaRef: "",
  });
  return rows;
}

export function weekSamples(): SampleRow[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): SampleRow => ({
    id: `QS-${stamp(index)}`,
    date,
    sampleNo: `RM-${stamp(index)}`,
    shift: "A",
    source: "Raw material",
    ref: `IN-${stamp(index)}`,
    drawnFrom: "Quarantine bay",
    retainQty: "500 g",
    storage: "Retain cupboard",
    retainUntil: date,
    disposal: "Held",
    status: "Retained",
    collectedAt: `${date} 08:20`,
    receivedAt: `${date} 08:35`,
    collectedBy: "QC",
    receivedBy: "Lab",
    method: "Composite",
    increments: "3",
    sampleQty: "1 kg",
    sealNo: `S-${stamp(index)}`,
  }));
  const today = dates[dates.length - 1];
  rows.push({
    id: "QS-TEST",
    date: today,
    sampleNo: "RM-HOLD",
    shift: "B",
    source: "Raw material",
    ref: "ML-HOLD",
    drawnFrom: "Quarantine bay",
    retainQty: "500 g",
    storage: "Retain cupboard",
    retainUntil: "",
    disposal: "Held",
    status: "Testing",
    collectedAt: `${today} 11:10`,
    receivedAt: `${today} 11:20`,
    collectedBy: "QC",
    receivedBy: "Lab",
    method: "Composite",
    increments: "3",
    sampleQty: "1 kg",
    sealNo: "S-HOLD",
  });
  return rows;
}

export function weekBoiler(): BoilerRow[] {
  const dates = recentDates(7);
  return dates.flatMap((date, index) =>
    (["A", "B"] as const).map((shift, shiftIndex) => ({
      id: `UB-${stamp(index)}-${shift}`,
      date,
      shift,
      boiler: "Boiler 1",
      pressure: shift === "A" ? "8.4" : "8.2",
      feedWater: shift === "A" ? "4.2" : "3.8",
      fuel: "Rice husk",
      fuelUsed: String(760 + index * 8 + shiftIndex * 20),
      blowdown: "Yes",
      hours: shift === "A" ? "8.0" : "7.5",
      operator: shift === "A" ? "Ramesh" : "Suresh",
      remarks: "Steam to conditioner",
      start: shift === "A" ? "06:00" : "14:00",
      stop: shift === "A" ? "14:00" : "21:30",
      steam: shift === "A" ? "6.4" : "5.8",
      feedTemp: "82",
      dosing: "Ok",
      safety: "Ok",
      verifiedBy: "Utility",
      feedKind: "Consumed KL",
    })),
  );
}

export function weekPower(): PowerRow[] {
  const dates = recentDates(7);
  return dates.flatMap((date, index) => {
    const open = 12000 + index * 430;
    return (["A", "B"] as const).map((shift, shiftIndex) => {
      const ebOpen = open + shiftIndex * 220;
      const ebClose = ebOpen + (shift === "A" ? 230 : 200);
      return {
        id: `UP-${stamp(index)}-${shift}`,
        date,
        shift,
        ebOpen: String(ebOpen),
        ebClose: String(ebClose),
        units: String(ebClose - ebOpen),
        dgHours: shift === "B" ? "0.5" : "0",
        diesel: shift === "B" ? "4" : "0",
        powerFactor: "0.96",
        remarks: shift === "B" ? "DG for 30 min" : "Grid only",
        meterId: "EB-1",
        dgId: "DG-1",
        dgOpen: "800",
        dgClose: shift === "B" ? "812" : "800",
        dgUnits: shift === "B" ? "12" : "0",
        dieselOpen: "420",
        dieselClose: shift === "B" ? "416" : "420",
        verifiedBy: "Utility",
      };
    });
  });
}

export function weekWater(): WaterRow[] {
  return recentDates(7).map((date, index) => {
    const opening = 100 + index * 3;
    const used = 12;
    return {
      id: `UW-${stamp(index)}`,
      date,
      source: "Borewell",
      opening: String(opening),
      closing: String(opening + used),
      used: String(used),
      purpose: "All",
      remarks: "Boiler and process",
      shift: "A",
      meterId: "WM-1",
      entryType: "Meter",
      receipt: "",
      deliveryRef: "",
      qualityRef: "Plant water",
      purpose2: "Process",
      recordedBy: "Utility",
      verifiedBy: "Utility",
    };
  });
}

export function weekFuel(): FuelRow[] {
  const dates = recentDates(7);
  let husk = 22;
  let diesel = 480;
  const rows: FuelRow[] = [];
  dates.forEach((date, index) => {
    const huskReceipt = index % 3 === 0 ? 6 : 0;
    const huskIssued = 1.6;
    const dieselReceipt = index % 4 === 0 ? 80 : 0;
    const dieselIssued = 8;
    rows.push({
      id: `UF-H-${stamp(index)}`,
      date,
      fuel: "Rice husk",
      unit: "MT",
      opening: husk.toFixed(2),
      receipt: huskReceipt ? huskReceipt.toFixed(2) : "0",
      issued: huskIssued.toFixed(2),
      closing: (husk + huskReceipt - huskIssued).toFixed(2),
      supplier: huskReceipt ? "Local husk yard" : "",
      remarks: "Issued to Boiler 1",
      shift: "A",
      location: "Fuel yard",
      txnType: huskReceipt ? "Receipt" : "Issue",
      receiptRef: huskReceipt ? `HR-${stamp(index)}` : "",
      purchaseOrder: huskReceipt ? `PO-H-${stamp(index)}` : "",
      deliveryNo: huskReceipt ? `DN-${stamp(index)}` : "",
      issuedTo: "Boiler 1",
      recordedBy: "Utility",
      verifiedBy: "Stores",
    });
    husk = husk + huskReceipt - huskIssued;
    rows.push({
      id: `UF-D-${stamp(index)}`,
      date,
      fuel: "Diesel",
      unit: "L",
      opening: String(diesel),
      receipt: String(dieselReceipt),
      issued: String(dieselIssued),
      closing: String(diesel + dieselReceipt - dieselIssued),
      supplier: dieselReceipt ? "Plant pump" : "Plant stock",
      remarks: "DG set",
      shift: "A",
      location: "Fuel yard",
      txnType: dieselReceipt ? "Receipt" : "Issue",
      receiptRef: dieselReceipt ? `DR-${stamp(index)}` : "",
      issuedTo: "DG-1",
      recordedBy: "Utility",
      verifiedBy: "Stores",
    });
    diesel = diesel + dieselReceipt - dieselIssued;
  });
  return rows;
}

export function weekAir(): CompressorRow[] {
  return recentDates(7).flatMap((date, index) =>
    (["A", "B"] as const).map((shift) => ({
      id: `UA-${stamp(index)}-${shift}`,
      date,
      shift,
      pressure: shift === "A" ? "7.0" : "6.8",
      hours: shift === "A" ? "8.0" : "7.5",
      oil: "Ok",
      drain: "Yes",
      status: "Running",
      remarks: "Bagging and conveying",
      compressor: "Compressor 1",
      start: shift === "A" ? "06:00" : "14:00",
      stop: shift === "A" ? "14:00" : "21:30",
      drainQty: "2",
      verifiedBy: "Utility",
      abnormal: "No",
      operator: shift === "A" ? "Ramesh" : "Suresh",
    })),
  );
}

export function weekBreakdowns(): BreakdownRow[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): BreakdownRow => {
    const open = index === dates.length - 1;
    return {
      id: `MB-${stamp(index)}`,
      date,
      shift: open ? "B" : "A",
      machine: open ? "Bucket elevator" : index % 2 === 0 ? "Hammer mill" : "Pellet mill",
      fault: open ? "Belt slip" : index % 2 === 0 ? "Screen worn" : "Die choke",
      from: open ? "10:15" : "09:20",
      to: open ? "" : "10:35",
      hours: open ? "" : "1.25",
      attended: open ? "" : "Ramesh",
      status: open ? "Open" : "Closed",
      remarks: open ? "Tension to be set after the batch" : "Repair completed in the shift",
      faultType: "Mechanical",
      reportedAt: open ? "10:05" : "09:10",
      endDate: open ? "" : date,
      rootCause: open ? "" : "Wear",
      action: open ? "Assign the repair" : "Parts replaced and trial run taken",
      verifiedBy: open ? "" : "Supervisor",
      impact: open ? "Bagging slowed" : "Short stop",
    };
  });
  return rows;
}

export function weekPreventive(): PreventiveRow[] {
  const dates = recentDates(7);
  const rows = dates.map((date, index): PreventiveRow => ({
    id: `MP-${stamp(index)}`,
    date,
    machine: "Pellet mill",
    frequency: "Daily",
    job: "Grease roller bearings",
    done: "Yes",
    by: "Suresh",
    remarks: "Completed in the shift",
    dueDate: date,
    assigned: "Suresh",
    completedAt: `${date} 07:10`,
    nextDue: date,
    result: "Completed",
    jobRef: `MP-${stamp(index)}`,
  }));
  const due = dates[dates.length - 3];
  rows.push({
    id: "MP-OVER",
    date: due,
    machine: "Mixer",
    frequency: "Monthly",
    job: "Check ribbon clearance",
    done: "No",
    by: "",
    remarks: "Still open",
    dueDate: due,
    assigned: "",
    result: "Not completed",
    jobRef: "MP-OVER",
  });
  return rows;
}

export function weekChecklist(): ChecklistRow[] {
  const dates = recentDates(7);
  return dates.flatMap((date, index) => {
    const today = index === dates.length - 1;
    const checks: ChecklistRow[] = [
      {
        id: `MC-${stamp(index)}-1`,
        date,
        shift: "A",
        machine: "Pellet mill",
        check: "Lubrication",
        result: "Ok",
        remarks: "Greased",
        inspectType: "Pre-start",
        inspector: "Suresh",
        reviewer: "Supervisor",
        action: "",
      },
      {
        id: `MC-${stamp(index)}-2`,
        date,
        shift: "A",
        machine: "Hammer mill",
        check: "Noise",
        result: today ? "Attention" : "Ok",
        remarks: today ? "Bearing noise on start-up" : "Normal",
        inspectType: "Routine",
        inspector: "Ramesh",
        reviewer: "Supervisor",
        action: today ? "Plan a bearing check after the batch" : "",
      },
    ];
    return checks;
  });
}

export function weekSpares(): SpareRow[] {
  return recentDates(7).map((date, index) => ({
    id: `MS-${stamp(index)}`,
    date,
    part: index % 2 === 0 ? "Hammer mill screen 3 mm" : "Bearing grease",
    machine: index % 2 === 0 ? "Hammer mill" : "Pellet mill",
    qty: "1",
    unit: index % 2 === 0 ? "Nos" : "Kg",
    issuedTo: "Ramesh",
    jobRef: `MB-${stamp(index)}`,
    remarks: "Issued against the shift job",
    location: "Maintenance store",
    time: "10:00",
    issuedBy: "Stores",
    receivedBy: "Ramesh",
    returned: "0",
    condition: "New",
    usedQty: "1",
  }));
}

const STOCK = [
  ["Maize (Corn)", "A", "A2", "Sangli Grain Traders"],
  ["Wheat Bran", "B", "B5", "Agri Solutions"],
  ["Soybean Meal", "B", "B2", "Kupwad Oil Mill"],
  ["Rice Bran", "A", "A5", "Miraj Rice Polish Co."],
] as const;

export function weekFlows(): FlowRow[] {
  return recentDates(7).flatMap((date, index) => [
    {
      id: `IO-${stamp(index)}-IN`,
      date,
      time: "09:20",
      shift: "A",
      direction: "Inbound",
      material: STOCK[index % STOCK.length][0],
      qtyMt: (8 + index).toFixed(1),
      bags: String(40 + index * 4),
      store: STOCK[index % STOCK.length][1],
      rack: STOCK[index % STOCK.length][2],
      party: STOCK[index % STOCK.length][3],
      reference: `IN-${stamp(index)}`,
      status: "Received",
    },
    {
      id: `IO-${stamp(index)}-OUT`,
      date,
      time: "11:05",
      shift: "A",
      direction: "Outbound",
      material: "Wheat Bran",
      qtyMt: "2.0",
      bags: "8",
      store: "A",
      rack: "A4",
      party: "Production",
      reference: batchNo(index),
      status: "Issued",
    },
  ]);
}

export function weekMoves(): MovementRow[] {
  return recentDates(7).flatMap((date, index) => [
    {
      id: `SM-${stamp(index)}-IN`,
      date,
      time: "09:20",
      shift: "A",
      movement: "Inward",
      material: STOCK[index % STOCK.length][0],
      qtyMt: (8 + index).toFixed(1),
      bags: String(40 + index * 4),
      from: STOCK[index % STOCK.length][3],
      to: `Store ${STOCK[index % STOCK.length][2]}`,
      reference: `IN-${stamp(index)}`,
    },
    {
      id: `SM-${stamp(index)}-ISS`,
      date,
      time: "11:05",
      shift: "A",
      movement: "Issue",
      material: "Wheat Bran",
      qtyMt: "2.0",
      bags: "8",
      from: "Store A4",
      to: "Production",
      reference: batchNo(index),
    },
  ]);
}

export function weekStockReports(): StockReportRow[] {
  return recentDates(7).flatMap((date, index) =>
    [
      ["Maize (Corn)", 80, 40, 55],
      ["Wheat Bran", 40, 20, 30],
      ["Vitamin Premix", 6, 8, 10],
    ].map(([material, opening, minMt, reorderMt], line) => {
      const inward = line === 0 ? 8 + index : 0;
      const issued = line === 2 ? 0.2 : 2;
      const closing = Number(opening) + inward - issued;
      return {
        id: `WR-${stamp(index)}-${line + 1}`,
        date,
        shift: "A",
        material: String(material),
        openingMt: Number(opening).toFixed(1),
        inwardMt: inward.toFixed(1),
        issuedMt: issued.toFixed(1),
        closingMt: closing.toFixed(1),
        bags: String(Math.round(closing * 4)),
        minMt: String(minMt),
        reorderMt: String(reorderMt),
        status: closing < Number(reorderMt) ? "Low" : "OK",
      };
    }),
  );
}
