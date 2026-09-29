import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  ClipboardList,
  Cog,
  Factory,
  FlaskConical,
  Warehouse,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listBreakdowns, listChecklist, listPreventive, pmState } from "@/data/maintenance";
import { inwardStage, listInward, listOutward, materialLabel, outwardStage, packedKg, productLabel, todayIso, waitingLong } from "@/data/movements";
import { analyseFormula, approvedFormula, nutrientCard } from "@/data/planning";
import { listBatches, listDowntime, listProcessLog, liveBatch, type BatchRow } from "@/data/production";
import { listFinishQc, listProcessQc, listRawQc, listSamples } from "@/data/qc";
import { STORE_ALERTS, STORE_RACKS, STORE_TOTALS } from "@/data/store";
import {
  POWER_FACTOR_TARGET,
  compressorBand,
  fuelReading,
  listBoiler,
  listCompressor,
  listFuel,
  listPower,
  listWater,
  powerReading,
  pressureBand,
  waterReading,
} from "@/data/utility";

function num(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function packedMt(row: BatchRow) {
  return (num(row.bags) * 50) / 1000;
}

function shortProduct(value: string) {
  return productLabel(value).split("—")[0].trim();
}

function ageHours(date: string, time = "") {
  if (!date) return 0;
  const clock = /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  const stamp = new Date(`${date}T${clock}`);
  if (Number.isNaN(stamp.getTime())) return 0;
  return Math.max(0, (Date.now() - stamp.getTime()) / 36e5);
}

function ageText(hours: number) {
  if (hours < 1) return "under 1 h";
  if (hours < 48) return `${Math.floor(hours)} h`;
  return `${Math.floor(hours / 24)} d`;
}

function latestStamp(dates: string[]) {
  const clean = dates.map((date) => date.slice(0, 10)).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  if (!clean.length) return "No saved record";
  return `Latest record ${dayLabel(clean[clean.length - 1])}`;
}

function currentStage(batch: BatchRow | undefined, logs: { batchNo: string; date: string; time: string; stage: string }[]) {
  if (!batch) return "";
  if (batch.status === "Completed") return "Completed";
  const latest = logs
    .filter((row) => row.batchNo === batch.batchNo && row.stage)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .at(-1);
  if (latest?.stage) return latest.stage;
  if (packedMt(batch) > 0) return "Weighing & Packing";
  if (batch.status === "In progress") return "Milling";
  return batch.status || "Scheduled";
}

function RangeDot({ band, detail }: { band: string; detail?: string }) {
  const known = band === "Normal" || band === "Watch" || band === "Critical" || band === "Check";
  const tone = band === "Normal" ? "is-ok" : band === "Watch" ? "is-watch" : known ? "is-bad" : "is-none";
  const label = detail || (known ? band : "No range configured");
  return <i className={`cf-dash-range ${tone}`} title={label} aria-label={label} />;
}

function DayBars({ points }: { points: { label: string; date: string; mt: number; plan: number; live?: boolean; tip: string }[] }) {
  const navigate = useNavigate();
  const width = 680;
  const height = 176;
  const pad = { l: 28, r: 8, t: 14, b: 26 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const max = Math.max(10, ...points.map((point) => Math.max(point.mt, point.plan)));
  const slot = plotW / Math.max(points.length, 1);
  const y = (value: number) => pad.t + plotH - (value / max) * plotH;
  return (
    <svg className="cf-dash-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Packed tonnes for the past 7 days and today, with the plan marked">
      <defs>
        <linearGradient id="cf-bar-done" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="cf-bar-today" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6c453" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {[0, max / 2, max].map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} stroke="#efe4d6" />
          <text x={pad.l - 4} y={y(tick) + 3} textAnchor="end">{Math.round(tick)}</text>
        </g>
      ))}
      {points.map((point, index) => {
        const barW = Math.min(22, slot - 10);
        const x = pad.l + slot * index + (slot - barW) / 2;
        const top = y(point.mt);
        return (
          <g key={point.date} className="is-link" onClick={() => navigate(`/production/batch-history?date=${point.date}`)}>
            <title>{point.tip} Open this day’s production sheet.</title>
            <rect x={x} y={top} width={barW} height={Math.max(pad.t + plotH - top, point.mt ? 2 : 0)} rx="6" fill={point.live ? "url(#cf-bar-today)" : "url(#cf-bar-done)"} />
            {point.plan > 0 ? <line x1={x - 2} x2={x + barW + 2} y1={y(point.plan)} y2={y(point.plan)} stroke="#f6c453" strokeWidth="3" strokeLinecap="round" /> : null}
            <text x={x + barW / 2} y={Math.max(top - 4, 12)} textAnchor="middle">{point.mt ? point.mt.toFixed(1) : ""}</text>
            <text x={x + barW / 2} y={height - 8} textAnchor="middle">{point.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StoreBars({ rows }: { rows: { label: string; stockMt: number }[] }) {
  const width = 480;
  const height = Math.max(132, rows.length * 28 + 16);
  const pad = { l: 92, r: 54, t: 8, b: 8 };
  const max = Math.max(10, ...rows.map((row) => row.stockMt));
  const plotW = width - pad.l - pad.r;
  const slot = (height - pad.t - pad.b) / Math.max(rows.length, 1);
  const colors = ["#1f9d4e", "#3d74c4", "#7c5cbf", "#9a3412", "#a16207"];
  return (
    <svg className="cf-dash-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stock in metric tons">
      {rows.map((store, index) => {
        const y = pad.t + slot * index + 6;
        const bar = Math.max(slot - 14, 10);
        const barW = (store.stockMt / max) * plotW;
        return (
          <g key={store.label}>
            <text x={pad.l - 8} y={y + bar / 2 + 3} textAnchor="end">{store.label}</text>
            <rect x={pad.l} y={y} width={plotW} height={bar} rx={bar / 2} fill="#f3e6d4" />
            <rect x={pad.l} y={y} width={Math.max(barW, 0)} height={bar} rx={bar / 2} fill={colors[index % colors.length]} />
            <text x={pad.l + barW + 6} y={y + bar / 2 + 3}>{store.stockMt.toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DecisionDonut({ pass, hold, reject, pending }: { pass: number; hold: number; reject: number; pending: number }) {
  const total = pass + hold + reject + pending;
  if (!total) return <p className="cf-dash-empty">No QC checks recorded today</p>;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const parts = [
    { key: "Pass", count: pass, color: "#1f9d4e" },
    { key: "Hold", count: hold, color: "#e0a106" },
    { key: "Reject", count: reject, color: "#c2410c" },
    { key: "Pending", count: pending, color: "#94a3b8" },
  ];
  let cursor = 0;
  return (
    <div className="cf-dash-donut">
      <svg viewBox="0 0 110 110" role="img" aria-label={`${total} QC checks today`}>
        <circle cx="55" cy="55" r={radius} fill="none" stroke="#f3eadf" strokeWidth="12" />
        {parts.map((part) => {
          if (!part.count) return null;
          const length = (part.count / total) * circumference;
          const node = (
            <circle
              key={part.key}
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke={part.color}
              strokeWidth="12"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-cursor}
              transform="rotate(-90 55 55)"
            />
          );
          cursor += length;
          return node;
        })}
        <text x="55" y="52" textAnchor="middle" className="cf-dash-rate">{total}</text>
        <text x="55" y="66" textAnchor="middle" className="cf-dash-sub">checks</text>
      </svg>
      <ul>
        {parts.map((part) => (
          <li key={part.key}>
            <i style={{ background: part.color }} />
            {part.key}
            <b>{part.count}</b>
            <span>{Math.round((part.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Attention = {
  id: string;
  urgency: number;
  hours: number;
  date: string;
  section: string;
  title: string;
  age: string;
  who: string;
  next: string;
  to: string;
};

const AWAITING_SAMPLE = new Set(["Collected", "Received", "Testing", "Awaiting review"]);

export function DashboardPage() {
  const { user } = useAuth();
  const rawName = (user?.name || user?.email || "there").trim();
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = todayIso();
  const [stockKind, setStockKind] = useState<"raw" | "finished">("raw");
  const [picked, setPicked] = useState("");

  const data = useMemo(() => {
    const batches = listBatches();
    const inwardAll = listInward();
    const outwardAll = listOutward();
    const inward = inwardAll.filter((row) => row.date === today);
    const outward = outwardAll.filter((row) => row.date === today);
    const raw = listRawQc();
    const process = listProcessQc();
    const finish = listFinishQc();
    const samples = listSamples();
    const rawToday = raw.filter((row) => row.date === today);
    const processToday = process.filter((row) => row.date === today);
    const finishToday = finish.filter((row) => row.date === today);
    const qc = [...rawToday, ...processToday, ...finishToday];
    const powerAll = listPower();
    const boilerAll = listBoiler();
    const waterAll = listWater();
    const fuelAll = listFuel();
    const airAll = listCompressor();
    const logs = listProcessLog();
    const downtime = listDowntime();
    const breakdowns = listBreakdowns();
    const preventive = listPreventive();
    const checks = listChecklist().filter((row) => row.date === today && row.result === "Attention");
    const days = [7, 6, 5, 4, 3, 2, 1, 0].map((ago) => {
      const date = isoDaysAgo(ago);
      const rows = batches.filter((row) => row.date === date);
      const mt = rows.reduce((sum, row) => sum + packedMt(row), 0);
      const plan = rows.reduce((sum, row) => sum + num(row.qtyMt), 0);
      const variance = mt - plan;
      const tip = rows.length
        ? `${dayLabel(date)}: planned ${plan.toFixed(2)} MT, packed ${mt.toFixed(2)} MT, variance ${variance.toFixed(2)} MT`
        : `${dayLabel(date)}: no production recorded`;
      return { label: dayLabel(date), date, mt, plan, live: date === today, tip };
    });
    const live = liveBatch(batches);
    const attention: Attention[] = [];
    const push = (item: Attention) => attention.push(item);

    downtime.filter((row) => !row.end.trim()).forEach((row) => {
      const hours = ageHours(row.date, row.start);
      push({
        id: row.id,
        urgency: 1,
        hours,
        date: row.date,
        section: "Production stoppage",
        title: `${row.machine} · ${row.reason || row.stage}`,
        age: ageText(hours),
        who: row.person || "Not assigned",
        next: row.action || "Record the restart",
        to: "/production/reports",
      });
    });
    logs.filter((row) => row.state === "Check" && row.ack !== "Acknowledged").forEach((row) => {
      const hours = ageHours(row.date, row.time);
      push({
        id: row.id,
        urgency: 2,
        hours,
        date: row.date,
        section: "Process check",
        title: `${row.batchNo} · ${row.stage} · ${row.name}`,
        age: ageText(hours),
        who: row.operator || "Not assigned",
        next: row.action || "Acknowledge the reading",
        to: "/production/reports",
      });
    });
    boilerAll.filter((row) => row.date === today).forEach((row) => {
      const band = pressureBand(row.boiler, row.pressure);
      if (band.band !== "Watch" && band.band !== "Critical") return;
      const hours = ageHours(row.date);
      push({
        id: row.id,
        urgency: band.band === "Critical" ? 2 : 8,
        hours,
        date: row.date,
        section: "Utility alert",
        title: `${row.boiler} steam ${row.pressure} kg/cm²`,
        age: ageText(hours),
        who: row.operator || "Not assigned",
        next: band.band === "Critical" ? "Reduce load and log the action" : `Bring pressure inside ${band.label}`,
        to: "/utility/boiler",
      });
    });
    airAll.filter((row) => row.date === today && compressorBand(row.pressure) === "Check").forEach((row) => {
      const hours = ageHours(row.date, row.start);
      push({
        id: row.id,
        urgency: 8,
        hours,
        date: row.date,
        section: "Utility alert",
        title: `${row.compressor || "Compressor"} ${row.pressure} kg/cm²`,
        age: ageText(hours),
        who: row.operator || "Not assigned",
        next: "Bring air pressure inside 6.0–7.5",
        to: "/utility/compressor",
      });
    });
    powerAll.filter((row) => row.date === today && row.powerFactor.trim() && num(row.powerFactor) < POWER_FACTOR_TARGET).forEach((row) => {
      const hours = ageHours(row.date);
      push({
        id: `pf-${row.id}`,
        urgency: 8,
        hours,
        date: row.date,
        section: "Utility alert",
        title: `Shift ${row.shift} power factor ${row.powerFactor}`,
        age: ageText(hours),
        who: "Utility",
        next: `Raise power factor to ${POWER_FACTOR_TARGET}`,
        to: "/utility/power",
      });
    });
    const latestFuel = new Map<string, (typeof fuelAll)[number]>();
    [...fuelAll].sort((a, b) => a.date.localeCompare(b.date)).forEach((row) => latestFuel.set(row.fuel, row));
    latestFuel.forEach((row) => {
      const closing = num(fuelReading(row).closing);
      const low = row.unit === "L" ? closing < 50 : closing < 1;
      if (!low) return;
      const hours = ageHours(row.date);
      push({
        id: `fuel-${row.id}`,
        urgency: 8,
        hours,
        date: row.date,
        section: "Utility alert",
        title: `${row.fuel} stock ${fuelReading(row).closing} ${row.unit || ""}`.trim(),
        age: ageText(hours),
        who: row.recordedBy || "Not assigned",
        next: "Record a receipt on the fuel log",
        to: "/utility/fuel",
      });
    });
    inwardAll.forEach((row) => {
      const stage = inwardStage(row);
      const waiting = stage === "Awaiting weighment" || stage === "Awaiting QC" || stage === "Accepted" || stage === "Awaiting unloading";
      if (!waiting || !waitingLong(row.date, row.time)) return;
      const hours = ageHours(row.date, row.time);
      const next = stage === "Awaiting weighment" ? "Weigh the vehicle" : stage === "Awaiting QC" ? "Complete the gate quality check" : stage === "Awaiting unloading" ? "Unload and post the GRN" : "Move the load into storage";
      push({
        id: row.id,
        urgency: 3,
        hours,
        date: row.date,
        section: "Inward vehicle",
        title: `${row.vehicleNo || "Vehicle"} · ${materialLabel(row.material)} · ${stage}`,
        age: ageText(hours),
        who: row.gateOperator || row.inspector || "Not assigned",
        next,
        to: stage === "Awaiting weighment" ? "/inward-outward/weighbridge" : stage === "Awaiting QC" ? "/inward-outward/quality-check" : "/inward-outward/goods-receipt",
      });
    });
    breakdowns.filter((row) => row.status !== "Closed").forEach((row) => {
      const hours = ageHours(row.date, row.from);
      push({
        id: row.id,
        urgency: 4,
        hours,
        date: row.date,
        section: "Open breakdown",
        title: `${row.machine} · ${row.fault}`,
        age: ageText(hours),
        who: row.attended || "Not assigned",
        next: row.status === "Open" ? "Assign the repair" : "Finish the repair and verify the close",
        to: "/maintenance/breakdown",
      });
    });
    preventive.filter((row) => pmState(row, today) === "Overdue").forEach((row) => {
      const hours = ageHours(row.dueDate || row.date);
      push({
        id: row.id,
        urgency: 5,
        hours,
        date: row.dueDate || row.date,
        section: "Overdue preventive",
        title: `${row.machine} · ${row.job}`,
        age: ageText(hours),
        who: row.assigned || row.by || "Not assigned",
        next: "Complete the preventive job",
        to: "/maintenance/preventive",
      });
    });
    const qcItems = [
      ...raw.filter((row) => row.decision === "Hold" || row.decision === "Pending").map((row) => ({ id: row.id, date: row.date, decision: row.decision, title: `${row.material} · ${row.sampleNo}`, who: row.inspector || row.technician || "Not assigned", to: "/qc/raw-material" })),
      ...process.filter((row) => row.decision === "Hold" || row.decision === "Pending").map((row) => ({ id: row.id, date: row.date, decision: row.decision, title: `${row.stage} · ${row.sampleNo}`, who: row.inspector || row.reviewer || "Not assigned", to: "/qc/in-process" })),
      ...finish.filter((row) => row.decision === "Hold" || row.decision === "Pending").map((row) => ({ id: row.id, date: row.date, decision: row.decision, title: `${shortProduct(row.product)} · ${row.sampleNo || row.batchNo}`, who: row.reviewer || "Not assigned", to: "/qc/finished-feed" })),
    ];
    qcItems.forEach((row) => {
      const hours = ageHours(row.date);
      push({
        id: row.id,
        urgency: row.decision === "Hold" ? 6 : 7,
        hours,
        date: row.date,
        section: row.decision === "Hold" ? "QC hold" : "QC pending test",
        title: row.title,
        age: ageText(hours),
        who: row.who,
        next: row.decision === "Hold" ? "Release or reject the lot" : "Finish the test",
        to: row.to,
      });
    });
    samples.filter((row) => AWAITING_SAMPLE.has(row.status)).forEach((row) => {
      const hours = ageHours(row.date);
      push({
        id: row.id,
        urgency: 7,
        hours,
        date: row.date,
        section: "QC pending test",
        title: `${row.sampleNo} · ${row.status}`,
        age: ageText(hours),
        who: row.collectedBy || row.receivedBy || "Not assigned",
        next: row.status === "Awaiting review" ? "Review and release the sample" : "Test the sample",
        to: "/qc/samples",
      });
    });
    checks.forEach((row) => {
      const hours = ageHours(row.date);
      push({
        id: row.id,
        urgency: 9,
        hours,
        date: row.date,
        section: "Checklist",
        title: `${row.machine} · ${row.check}`,
        age: ageText(hours),
        who: row.inspector || "Not assigned",
        next: row.action || "Record the corrective action",
        to: "/maintenance/checklist",
      });
    });
    STORE_ALERTS.forEach((row) => {
      const hours = num((row.ago.match(/(\d+)/) || [])[1]);
      push({
        id: row.material,
        urgency: 10,
        hours,
        date: "",
        section: "Low-stock material",
        title: `${row.material} · ${row.place}`,
        age: row.ago,
        who: "Not assigned",
        next: "Reorder or transfer stock",
        to: "/warehouse-store/material-details",
      });
    });
    attention.sort((a, b) => a.urgency - b.urgency || b.hours - a.hours);

    return {
      batches,
      live,
      logs,
      inward,
      outward,
      inwardAll,
      outwardAll,
      qc,
      raw,
      process,
      finish,
      samples,
      power: powerAll.filter((row) => row.date === today),
      boiler: boilerAll.filter((row) => row.date === today),
      water: waterAll.filter((row) => row.date === today),
      fuelAll,
      air: airAll.filter((row) => row.date === today),
      breakdowns,
      preventive,
      days,
      attention,
    };
  }, [today]);

  const racks = Object.values(STORE_RACKS).flat();
  const usableMt = racks.reduce((sum, rack) => sum + ((rack.status === "In Stock" || rack.status === "Low Stock") && rack.stockMt ? rack.stockMt : 0), 0);
  const reservedRacks = racks.filter((rack) => rack.status === "Reserved").length;
  const heldMaterials = [...new Set(data.raw.filter((row) => row.decision === "Hold").map((row) => row.material))];
  const stockMt = STORE_TOTALS.reduce((sum, store) => sum + store.stockMt, 0);
  const atGate = data.inwardAll.filter((row) => inwardStage(row) === "Awaiting weighment");
  const stalled = data.attention.filter((row) => row.section === "Inward vehicle").length;
  const todayTickets = data.inward.length + data.outward.length;
  const pass = data.qc.filter((row) => row.decision === "Pass").length;
  const hold = data.qc.filter((row) => row.decision === "Hold").length;
  const reject = data.qc.filter((row) => row.decision === "Reject").length;
  const pending = data.qc.filter((row) => row.decision === "Pending").length;
  const units = data.power.reduce((sum, row) => sum + num(powerReading(row).units), 0);
  const husk = data.boiler.reduce((sum, row) => sum + num(row.fuelUsed), 0);
  const waterKl = data.water.reduce((sum, row) => sum + num(waterReading(row).used), 0);
  const steamRows = data.boiler.filter((row) => row.pressure.trim());
  const steam = steamRows[0];
  const steamBand = steam ? pressureBand(steam.boiler, steam.pressure).band : "";
  const powerFactors = data.power.map((row) => num(row.powerFactor)).filter((value) => value > 0);
  const powerBand = powerFactors.length ? (Math.min(...powerFactors) < POWER_FACTOR_TARGET ? "Watch" : "Normal") : "";
  const utilityToday = data.power.length + data.boiler.length + data.water.length + data.air.length > 0;
  const openJobs = data.breakdowns.filter((row) => row.status !== "Closed");
  const overdue = data.preventive.filter((row) => pmState(row, today) === "Overdue");
  const downMachines = new Set(openJobs.map((row) => row.machine)).size;
  const livePacked = data.live ? packedMt(data.live) : 0;
  const livePlan = data.live ? num(data.live.qtyMt) : 0;
  const liveLeft = livePlan - livePacked;
  const stage = currentStage(data.live, data.logs);
  const planRows = data.batches.filter((row, index, all) => (row.date === today || row.status === "In progress") && all.findIndex((item) => item.id === row.id) === index);
  const selected = planRows.find((row) => row.id === picked) || data.live || planRows[0];
  const formulaOnBatch = selected ? approvedFormula(selected.product, selected.date) : [];
  const formulaNow = selected && !formulaOnBatch.length ? approvedFormula(selected.product, today) : [];
  const formula = formulaOnBatch.length ? formulaOnBatch : formulaNow;
  const calculated = analyseFormula(formula);
  const targets = selected ? nutrientCard().filter((row) => row.product === selected.product) : [];
  const formulaVersion = formula.find((row) => row.version)?.version || selected?.formulaVersion || "";
  const openHolds = [
    ...data.raw.filter((row) => row.decision === "Hold").map((row) => ({ id: row.id, label: row.material, ref: row.sampleNo, to: `/qc/raw-material?date=${row.date}` })),
    ...data.process.filter((row) => row.decision === "Hold").map((row) => ({ id: row.id, label: row.stage, ref: row.sampleNo, to: `/qc/in-process?date=${row.date}` })),
    ...data.finish.filter((row) => row.decision === "Hold").map((row) => ({ id: row.id, label: shortProduct(row.product), ref: row.sampleNo || row.batchNo, to: `/qc/finished-feed?date=${row.date}` })),
  ];
  const awaiting = [
    ...data.raw.filter((row) => row.decision === "Pending").map((row) => ({ id: row.id, label: row.material, ref: row.sampleNo, state: "Pending test", to: `/qc/raw-material?date=${row.date}` })),
    ...data.process.filter((row) => row.decision === "Pending").map((row) => ({ id: row.id, label: row.stage, ref: row.sampleNo, state: "Pending test", to: `/qc/in-process?date=${row.date}` })),
    ...data.finish.filter((row) => row.decision === "Pending").map((row) => ({ id: row.id, label: shortProduct(row.product), ref: row.sampleNo || row.batchNo, state: "Pending test", to: `/qc/finished-feed?date=${row.date}` })),
    ...data.samples.filter((row) => AWAITING_SAMPLE.has(row.status)).map((row) => ({ id: row.id, label: row.sampleNo, ref: row.source, state: row.status, to: `/qc/samples?date=${row.date}` })),
  ];
  const finished = new Map<string, { usable: number; held: number }>();
  data.outwardAll.forEach((row) => {
    const stageName = outwardStage(row);
    if (stageName === "Issued" || stageName === "Exited" || stageName === "Cancelled") return;
    const tonnes = num(packedKg(row.bagWeightKg, row.bagCount)) / 1000;
    if (!tonnes) return;
    const key = shortProduct(row.product);
    const bucket = finished.get(key) || { usable: 0, held: 0 };
    if ((row.qcRelease || "Released") === "Released") bucket.usable += tonnes;
    else bucket.held += tonnes;
    finished.set(key, bucket);
  });
  const finishedRows = [...finished.entries()].map(([label, bucket]) => ({ label, stockMt: bucket.usable, held: bucket.held }));
  const huskStock = [...data.fuelAll].filter((row) => row.fuel === "Rice husk").sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const dieselStock = [...data.fuelAll].filter((row) => row.fuel === "Diesel").sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const chartHasPacked = data.days.some((day) => day.mt > 0);
  const utilityAlert = data.attention.some((row) => row.section === "Utility alert");

  return (
    <div className="cf-page cf-sheet-page cf-dash-home">
      <header className="cf-dash-hero">
        <div>
          <p>CatelFeed · Plant overview</p>
          <h1>{hello}, {name}</h1>
          <p>Today&apos;s plant activity and operational status</p>
        </div>
      </header>

      <div className="cf-dash-kpis">
        <Link to={`/inward-outward?date=${today}`}>
          <ArrowLeftRight size={15} />
          <span>Inward / Outward</span>
          <strong>{atGate.length} at gate</strong>
          <em className={!todayTickets || stalled ? "is-alert" : ""}>
            {todayTickets ? `${todayTickets} tickets today` : "No inward tickets today"}
            {stalled ? ` · ${stalled} waiting` : ""}
          </em>
        </Link>
        <Link to={`/warehouse-store/material-details?date=${today}`}>
          <Warehouse size={15} />
          <span>Warehouse</span>
          <strong>{usableMt.toLocaleString("en-IN", { maximumFractionDigits: 1 })} MT</strong>
          <em className={STORE_ALERTS.length ? "is-alert" : ""}>
            {STORE_ALERTS.length ? `${STORE_ALERTS.length} low-stock items` : "No low-stock items"}
          </em>
        </Link>
        <Link to={`/production/batch-history?date=${data.live?.date || today}`}>
          <Factory size={15} />
          <span>Production</span>
          <strong>{data.live ? data.live.batchNo : "—"}</strong>
          <em>{data.live ? `${stage} · ${data.live.status}` : "No batch running"}</em>
        </Link>
        <Link to={`/production/batch-history?date=${data.live?.date || today}`}>
          <ClipboardList size={15} />
          <span>Plan vs packed</span>
          <strong>{data.live && livePlan ? `${Math.round((livePacked / livePlan) * 100)}%` : "—"}</strong>
          <em>
            {data.live
              ? `${livePacked.toFixed(1)} packed · ${liveLeft.toFixed(1)} MT left`
              : "No batch running"}
          </em>
        </Link>
        <Link to={`/qc/raw-material?date=${today}`}>
          <FlaskConical size={15} />
          <span>QC</span>
          <strong>{data.qc.length ? `${Math.round((pass / data.qc.length) * 100)}%` : "—"}</strong>
          <em className={hold || reject ? "is-alert" : ""}>
            {data.qc.length ? `${pending} pending · ${hold} hold · ${reject} rejected` : "No QC checks recorded today"}
          </em>
        </Link>
        <Link to={`/utility/power?date=${today}`}>
          <Cog size={15} />
          <span>Utility</span>
          <strong>{utilityToday ? units.toLocaleString("en-IN") : "—"}</strong>
          <em className={utilityAlert ? "is-alert" : ""}>
            {utilityToday ? `${husk.toLocaleString("en-IN")} kg husk${utilityAlert ? " · alert" : ""}` : "No utility readings entered for this shift"}
          </em>
        </Link>
        <Link to={`/maintenance/breakdown?date=${openJobs[0]?.date || today}`}>
          <Wrench size={15} />
          <span>Maintenance</span>
          <strong>{openJobs.length ? `${openJobs.length} open` : "None open"}</strong>
          <em className={overdue.length || downMachines ? "is-alert" : ""}>
            {overdue.length ? `${overdue.length} overdue PM` : "No overdue PM"}
            {downMachines ? ` · ${downMachines} unavailable` : ""}
          </em>
        </Link>
      </div>

      <div className="cf-dash-board">
        <section>
          <header>
            <h2>Production · 7 days and today</h2>
            <span className="cf-dash-meta">{latestStamp(data.days.filter((day) => day.mt || day.plan).map((day) => day.date))}</span>
            <Link to={`/production/batch-history?date=${today}`}>Open</Link>
          </header>
          <p className="cf-dash-key"><i className="is-brown" />Packed tonnes<i className="is-gold" />Plan and today</p>
          <DayBars points={data.days} />
          <p className="cf-dash-note">
            {chartHasPacked
              ? "Each bar is packed production (bags × 50 kg) for that day. The gold mark is the plan. Click a day to open its production sheet."
              : "No packed production in the past 7 days."}
          </p>
        </section>
        <section>
          <header>
            <h2>Store stock</h2>
            <div className="cf-dash-toggle" role="group" aria-label="Stock type">
              <button type="button" className={stockKind === "raw" ? "is-on" : ""} onClick={() => setStockKind("raw")}>Raw materials</button>
              <button type="button" className={stockKind === "finished" ? "is-on" : ""} onClick={() => setStockKind("finished")}>Finished goods</button>
            </div>
            <Link to={`/warehouse-store/material-details?date=${today}`}>Open</Link>
          </header>
          {stockKind === "raw" ? (
            <>
              <StoreBars rows={STORE_TOTALS.map((store) => ({ label: `Store ${store.id}`, stockMt: store.stockMt }))} />
              <p className="cf-dash-note">
                Store totals {stockMt.toFixed(1)} MT. Usable rack stock {usableMt.toFixed(1)} MT. {reservedRacks} racks reserved, with no quantity.
                {heldMaterials.length ? ` QC hold still open on ${heldMaterials.join(", ")}. That lot is not deducted from the rack total.` : " No raw material is on QC hold."}
              </p>
              <p className="cf-dash-meta">Rack book, not a shift reading</p>
              <table className="cf-dash-table">
                <tbody>
                  {STORE_ALERTS.map((row) => (
                    <tr key={row.material}>
                      <td><Link to={`/warehouse-store/material-details?date=${today}`}>{row.material}</Link></td>
                      <td>{row.place}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : finishedRows.length ? (
            <>
              <StoreBars rows={finishedRows.map((row) => ({ label: row.label, stockMt: row.stockMt }))} />
              <p className="cf-dash-note">
                Usable finished goods still in the plant, from bagging tickets that are not yet issued.
                {finishedRows.some((row) => row.held > 0)
                  ? ` Held or unreleased: ${finishedRows.filter((row) => row.held > 0).map((row) => `${row.label} ${row.held.toFixed(2)} MT`).join(", ")}.`
                  : " Nothing is held back from release."}
              </p>
              <p className="cf-dash-meta">{latestStamp(data.outwardAll.map((row) => row.date))}</p>
            </>
          ) : (
            <p className="cf-dash-empty">No finished goods are waiting in the plant.</p>
          )}
        </section>
      </div>

      <div className="cf-dash-board is-equal">
        <section>
          <header>
            <h2>QC decisions</h2>
            <span className="cf-dash-meta">{data.qc.length ? latestStamp(data.qc.map((row) => row.date)) : "No QC checks recorded today"}</span>
            <Link to={`/qc/raw-material?date=${today}`}>Open</Link>
          </header>
          <DecisionDonut pass={pass} hold={hold} reject={reject} pending={pending} />
          <table className="cf-dash-table">
            <tbody>
              <tr><td colSpan={3}>On hold</td></tr>
              {openHolds.length === 0 ? (
                <tr><td colSpan={3}>No materials or products on hold.</td></tr>
              ) : openHolds.map((row) => (
                <tr key={row.id}>
                  <td><Link to={row.to}>{row.label}</Link></td>
                  <td>{row.ref}</td>
                  <td><span className="cf-store-tag is-low">Hold</span></td>
                </tr>
              ))}
              <tr><td colSpan={3}>Awaiting test or review</td></tr>
              {awaiting.length === 0 ? (
                <tr><td colSpan={3}>No samples are waiting.</td></tr>
              ) : awaiting.map((row) => (
                <tr key={row.id}>
                  <td><Link to={row.to}>{row.label}</Link></td>
                  <td>{row.ref}</td>
                  <td>{row.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <header>
            <h2>Plan vs packed</h2>
            <span className="cf-dash-meta">{selected ? latestStamp([selected.date]) : "No batch running"}</span>
            <Link to={`/production-planning/formulation?date=${selected?.date || today}`}>Formulation</Link>
          </header>
          {planRows.length === 0 ? (
            <p className="cf-dash-empty">No batches planned for today</p>
          ) : (
            <table className="cf-dash-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Product</th>
                  <th>Plan</th>
                  <th>Packed</th>
                  <th>Left</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((row) => {
                  const plan = num(row.qtyMt);
                  const packed = packedMt(row);
                  const left = plan - packed;
                  const pct = plan ? Math.min(100, (packed / plan) * 100) : 0;
                  return (
                    <tr key={row.id} className={selected?.id === row.id ? "is-on is-pick" : "is-pick"} onClick={() => setPicked(row.id)}>
                      <td><Link to={`/production/batch-history?date=${row.date}`}>{row.batchNo}</Link>{row.date !== today ? ` · ${dayLabel(row.date)}` : ""}</td>
                      <td>{shortProduct(row.product)}</td>
                      <td>{plan.toFixed(2)}</td>
                      <td>{packed.toFixed(2)}</td>
                      <td>{left.toFixed(2)}</td>
                      <td><span className="cf-dash-progress" title={`${pct.toFixed(0)}% packed`}><span style={{ width: `${pct}%` }} /></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {planRows.some((row) => row.date !== today) ? <p className="cf-dash-note">Batches still in progress stay on this list even when they were opened on an earlier date.</p> : null}
          <p className="cf-dash-key">
            {selected
              ? `Approved formula · ${shortProduct(selected.product)}${formulaVersion ? ` · v${formulaVersion.replace(/^v/i, "")}` : ""}${formulaNow.length ? ` · effective ${dayLabel(formulaNow[0].effectiveFrom || formulaNow[0].date)}` : ""}`
              : "No batch selected"}
          </p>
          {selected && !formula.length ? (
            <p className="cf-dash-empty">No approved formula is on file for this batch.</p>
          ) : (
            <ul className="cf-dash-nuts">
              {(targets.length ? targets : calculated.map((row) => ({ nutrient: row.nutrient, target: "" }))).map((row) => {
                const hit = calculated.find((item) => item.nutrient === row.nutrient);
                return (
                  <li key={row.nutrient}>
                    <span>{row.nutrient}</span>
                    <b>{hit ? `${hit.value.toFixed(1)}%` : "—"}{row.target ? <em> target {row.target}%</em> : null}</b>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="cf-dash-board is-equal">
        <section>
          <header>
            <h2>Utility today</h2>
            {utilityToday ? <span className="cf-dash-meta">{latestStamp([...data.power, ...data.boiler, ...data.water, ...data.air].map((row) => row.date))}</span> : null}
            <Link to={`/utility/boiler?date=${today}`}>Open</Link>
          </header>
          {utilityToday ? (
            <div className="cf-dash-utils">
              <p><span>Grid units</span><strong><Link to={`/utility/power?date=${today}`}><RangeDot band={powerBand} detail={powerBand ? `Power factor target ${POWER_FACTOR_TARGET}` : "No power factor entered"} />{units.toLocaleString("en-IN")}</Link></strong></p>
              <p><span>Boiler husk</span><strong><Link to={`/utility/boiler?date=${today}`}><RangeDot band="" detail="No consumption range configured" />{husk.toLocaleString("en-IN")} kg</Link></strong></p>
              <p><span>Water</span><strong><Link to={`/utility/water?date=${today}`}><RangeDot band="" detail="No operating range configured" />{waterKl} KL</Link></strong></p>
              <p><span>Steam</span><strong><Link to={`/utility/boiler?date=${steam?.date || today}`}><RangeDot band={steamBand} detail={steam ? pressureBand(steam.boiler, steam.pressure).label : "No steam reading"} />{steam ? `${steam.pressure} kg/cm²` : "—"}</Link></strong></p>
            </div>
          ) : (
            <p className="cf-dash-empty">No utility readings entered for this shift</p>
          )}
          {data.power.length ? (
            <table className="cf-dash-table">
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>EB units</th>
                  <th>DG hours</th>
                  <th>Fuel used kg</th>
                </tr>
              </thead>
              <tbody>
                {data.power.map((row) => {
                  const steamRow = data.boiler.find((item) => item.shift === row.shift);
                  const reading = powerReading(row);
                  return (
                    <tr key={row.id}>
                      <td><Link to={`/utility/power?date=${row.date}`}>Shift {row.shift}</Link></td>
                      <td>{reading.units || "—"}</td>
                      <td>{row.dgHours || "—"}</td>
                      <td>{steamRow?.fuelUsed || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
          <p className="cf-dash-note">
            <Link to={huskStock?.date ? `/utility/fuel?date=${huskStock.date}` : "/utility/fuel"}>Husk stock {huskStock ? `${fuelReading(huskStock).closing} ${huskStock.unit || "kg"}` : "not recorded"}</Link>
            <Link to={dieselStock?.date ? `/utility/fuel?date=${dieselStock.date}` : "/utility/fuel"}>Diesel {dieselStock ? `${fuelReading(dieselStock).closing} ${dieselStock.unit || "L"}` : "not recorded"}</Link>
          </p>
          <p className="cf-dash-meta">{latestStamp([huskStock?.date || "", dieselStock?.date || ""])}</p>
        </section>
        <section>
          <header>
            <h2>Needs attention</h2>
            <span className="cf-dash-meta">{data.attention.length ? latestStamp(data.attention.map((row) => row.date)) : "Nothing waiting"}</span>
            <Link to={`/maintenance/breakdown?date=${openJobs[0]?.date || today}`}>Open</Link>
          </header>
          {data.attention.length === 0 ? (
            <p className="cf-dash-empty">Nothing needs a decision right now.</p>
          ) : (
            <table className="cf-dash-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Age</th>
                  <th>Responsible</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {data.attention.map((row) => (
                  <tr key={`${row.section}-${row.id}`}>
                    <td><Link to={row.date ? `${row.to}?date=${row.date}` : row.to}>{row.section}</Link><span>{row.title}</span></td>
                    <td>{row.age}</td>
                    <td>{row.who}</td>
                    <td>{row.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
