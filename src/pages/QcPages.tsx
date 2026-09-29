import { useMemo, useState, type ReactNode } from "react";
import { Activity, ClipboardList, FileBarChart, FlaskConical, Package, Plus, Save, Search } from "lucide-react";
import { SheetDatePicker } from "@/components/SheetDatePicker";
import { SheetSelect } from "@/components/SheetSelect";
import { FEED_PRODUCTS, RAW_MATERIALS, SUPPLIERS, formatSheetDate, listInward, materialLabel, sheetDateFromQuery, todayIso } from "@/data/movements";
import {
  BIS_LIMITS,
  FEED_FORMS,
  FEED_TYPES,
  LOT_RELEASE,
  OBSERVE,
  PELLET_RESULTS,
  PROCESS_STAGES,
  QC_DECISIONS,
  QC_SHIFTS,
  REASON_CODES,
  SAMPLE_STATUS,
  SAMPLE_TYPES,
  TEMP_POINTS,
  aflatoxinMax,
  boundLabel,
  compareResult,
  finishBound,
  finishTestApplies,
  listFinishQc,
  listProcessQc,
  listRawQc,
  listSamples,
  nextQcId,
  nextSampleNo,
  pelletMetricsApply,
  rawChemApplies,
  rawPhysicalApplies,
  saveFinishQc,
  saveProcessQc,
  saveRawQc,
  saveSamples,
  type FinishQcRow,
  type ProcessQcRow,
  type RawQcRow,
  type SampleRow,
} from "@/data/qc";

type Row = { id: string; date: string };

function useRows<T extends Row>(load: () => T[], persist: (rows: T[]) => void) {
  const [rows, setRows] = useState(load);
  const [date, setDate] = useState(sheetDateFromQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const savedDates = useMemo(
    () => [...new Set(rows.map((row) => row.date).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [rows],
  );
  const commit = (next: T[]) => {
    persist(next);
    setRows(load());
  };
  const flash = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2400);
  };
  return { rows, date, setDate, search, setSearch, status, flash, commit, savedDates };
}

function textCell(value: string, onChange: (value: string) => void, kind: "text" | "number" = "text") {
  return (
    <td>
      <input
        className="cf-cell"
        inputMode={kind === "number" ? "decimal" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </td>
  );
}

function choiceCell(value: string, options: readonly string[], onChange: (value: string) => void) {
  return (
    <td>
      <SheetSelect
        compact
        value={value}
        placeholder="Select"
        options={options.map((item) => ({ value: item, label: item }))}
        onChange={onChange}
      />
    </td>
  );
}

function visible<T extends Row>(rows: T[], date: string, search: string, fields: (row: T) => string[]) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (row.date !== date) return false;
    if (!query) return true;
    return fields(row).join(" ").toLowerCase().includes(query);
  });
}

function LogSheet<T extends Row>({
  title,
  icon,
  note,
  rows,
  date,
  savedDates,
  onDateChange,
  search,
  onSearch,
  placeholder,
  onAdd,
  onSave,
  status,
  empty,
  headers,
  render,
  wide,
}: {
  title: string;
  icon: ReactNode;
  note: string;
  rows: T[];
  date: string;
  savedDates: string[];
  onDateChange: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  onAdd: () => void;
  onSave: () => void;
  status: string;
  empty: string;
  headers: string[];
  render: (row: T) => ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="cf-page cf-sheet-page cf-qc">
      <section className="cf-sheet">
        <header className="cf-sheet-banner">
          <div className="cf-sheet-title">
            <span className="cf-sheet-icon">{icon}</span>
            <div>
              <p>Quality control</p>
              <h1>{title}</h1>
              <p>{note}</p>
            </div>
          </div>
          <div className="cf-sheet-actions">
            <div className="cf-sheet-stat">
              <span>Entries</span>
              <strong>{rows.length}</strong>
            </div>
            <button type="button" className="cf-sheet-save" onClick={onSave}>
              <Save size={16} strokeWidth={2.4} />
              Save sheet
            </button>
          </div>
        </header>
        {status ? <p className="cf-sheet-flash">{status}</p> : null}
        <div className="cf-sheet-filters">
          <label>
            <span>Date</span>
            <SheetDatePicker value={date} onChange={onDateChange} />
          </label>
          <label>
            <span>Saved sheets</span>
            <SheetSelect
              value={savedDates.includes(date) ? date : ""}
              placeholder={savedDates.length ? `Open a saved date… (${savedDates.length})` : "No saved sheets yet"}
              options={savedDates.map((item) => ({ value: item, label: formatSheetDate(item) }))}
              onChange={(next) => {
                if (next) onDateChange(next);
              }}
            />
          </label>
          <label className="cf-sheet-search">
            <span>Search</span>
            <span className="cf-sheet-search-box">
              <Search size={15} />
              <input value={search} placeholder={placeholder} onChange={(event) => onSearch(event.target.value)} />
            </span>
          </label>
          <button type="button" className="cf-sheet-add" onClick={onAdd}>
            <Plus size={16} strokeWidth={2.4} />
            Add row
          </button>
        </div>
        <div className="cf-sheet-scroll">
          <table className={`cf-sheet-table${wide ? " is-wide" : ""}`}>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="cf-sheet-empty" colSpan={headers.length}>
                    {empty}
                  </td>
                </tr>
              ) : (
                rows.map((row) => <tr key={row.id}>{render(row)}</tr>)
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function tone(decision: string) {
  if (decision === "Pass" || decision === "Released") return "is-ok";
  if (decision === "Reject" || decision === "Rejected") return "is-empty";
  return "is-low";
}

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function aflatoxinLimit(material: string) {
  return /maize|corn|rice bran/i.test(material) ? 50 : 20;
}

function DecisionDonut({ pass, hold, reject }: { pass: number; hold: number; reject: number }) {
  const total = Math.max(pass + hold + reject, 1);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const parts = [
    { key: "Pass", count: pass, color: "#1f9d4e" },
    { key: "Hold", count: hold, color: "#e0a106" },
    { key: "Reject", count: reject, color: "#c2410c" },
  ];
  let cursor = 0;
  const rate = Math.round((pass / total) * 100);
  return (
    <div className="cf-qc-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={`${rate} percent of today's checks passed`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e4c9a8" strokeWidth="14" />
        {parts.map((part) => {
          if (!part.count) return null;
          const length = (part.count / total) * circumference;
          const node = (
            <circle
              key={part.key}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={part.color}
              strokeWidth="14"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-cursor}
              transform="rotate(-90 70 70)"
            />
          );
          cursor += length;
          return node;
        })}
        <text x="70" y="66" textAnchor="middle" className="cf-qc-donut-rate">{rate}%</text>
        <text x="70" y="84" textAnchor="middle" className="cf-qc-donut-sub">passed</text>
      </svg>
      <ul>
        {parts.map((part) => (
          <li key={part.key}>
            <i style={{ background: part.color }} />
            {part.key}
            <b>{part.count}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function labelX(barEnd: number, limitX: number) {
  const next = barEnd + 6;
  if (next < limitX && next + 16 > limitX - 2) return limitX + 5;
  return next;
}

function AflatoxinChart({ rows }: { rows: { id: string; material: string; aflatoxin: string }[] }) {
  const width = 960;
  const height = 200;
  const pad = { l: 108, r: 28, t: 8, b: 22 };
  const max = 50;
  const plotW = width - pad.l - pad.r;
  const slot = (height - pad.t - pad.b) / Math.max(rows.length, 1);
  const limitX = pad.l + (20 / max) * plotW;
  return (
    <svg className="cf-qc-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Aflatoxin B1 in incoming materials, 20 ppb line">
      <line x1={limitX} x2={limitX} y1={pad.t} y2={height - pad.b} stroke="#9a3412" strokeDasharray="3 3" />
      {rows.map((row, index) => {
        const value = num(row.aflatoxin);
        const over = value > aflatoxinLimit(row.material);
        const y = pad.t + slot * index + 6;
        const bar = Math.max(slot - 12, 8);
        const barW = (Math.min(value, max) / max) * plotW;
        return (
          <g key={row.id}>
            <text x={pad.l - 8} y={y + bar / 2 + 3} textAnchor="end">{row.material}</text>
            <rect x={pad.l} y={y} width={Math.max(barW, 2)} height={bar} rx="3" fill={over ? "#d97706" : "#1f9d4e"} />
            <text x={labelX(pad.l + barW, limitX)} y={y + bar / 2 + 3} textAnchor="start">{value}</text>
          </g>
        );
      })}
      {[0, 25, 50].map((tick) => (
        <text key={tick} x={pad.l + (tick / max) * plotW} y={height - 4} textAnchor="middle">{tick}</text>
      ))}
    </svg>
  );
}

function ProcessChart({ rows }: { rows: { stage: string; moisture: string; temp: string }[] }) {
  const width = 720;
  const height = 200;
  const pad = { l: 28, r: 10, t: 12, b: 28 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const maxMoisture = 20;
  const maxTemp = 100;
  const slot = plotW / Math.max(rows.length, 1);
  const x = (index: number) => pad.l + slot * index + slot / 2;
  const yMoisture = (value: number) => pad.t + plotH - (value / maxMoisture) * plotH;
  const line = rows.map((row, index) => `${x(index)},${yMoisture(num(row.moisture))}`).join(" ");
  const short: Record<string, string> = { Conditioner: "Cond." };
  return (
    <svg className="cf-qc-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Batch moisture and temperature from mash to cooler">
      {[0, 10, 20].map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={yMoisture(tick)} y2={yMoisture(tick)} stroke="#d4b48a" />
          <text x={pad.l - 4} y={yMoisture(tick) + 3} textAnchor="end">{tick}</text>
        </g>
      ))}
      {rows.map((row, index) => {
        const barH = (num(row.temp) / maxTemp) * plotH;
        return (
          <rect
            key={row.stage}
            x={x(index) - 10}
            y={pad.t + plotH - barH}
            width="20"
            height={barH}
            rx="3"
            fill="#7eb0e8"
          />
        );
      })}
      <polyline points={line} fill="none" stroke="#1f9d4e" strokeWidth="2.5" strokeLinejoin="round" />
      {rows.map((row, index) => (
        <circle key={`${row.stage}-dot`} cx={x(index)} cy={yMoisture(num(row.moisture))} r="3.5" fill="#fff" stroke="#1f9d4e" strokeWidth="2" />
      ))}
      {rows.map((row, index) => (
        <text key={`${row.stage}-label`} x={x(index)} y={height - 8} textAnchor="middle">{short[row.stage] || row.stage}</text>
      ))}
    </svg>
  );
}

function FinishBars({
  rows,
  field,
  max,
  limitFor,
  higherIsBad,
  label,
}: {
  rows: { id: string; product: string; feedType: string; moisture: string; cp: string }[];
  field: "moisture" | "cp";
  max: number;
  limitFor: (row: { feedType: string }) => number;
  higherIsBad: boolean;
  label: string;
}) {
  const width = 760;
  const height = 112;
  const pad = { l: 58, r: 40, t: 4, b: 4 };
  const plotW = width - pad.l - pad.r;
  const slot = (height - pad.t - pad.b) / Math.max(rows.length, 1);
  return (
    <svg className="cf-qc-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {rows.map((row, index) => {
        const value = num(row[field]);
        const limit = limitFor(row);
        const bad = higherIsBad ? value > limit : value < limit;
        const y = pad.t + slot * index + 3;
        const bar = Math.max(slot - 8, 8);
        const barW = (Math.min(value, max) / max) * plotW;
        const limitX = pad.l + (limit / max) * plotW;
        return (
          <g key={row.id}>
            <text x={pad.l - 6} y={y + bar / 2 + 3} textAnchor="end">{row.product}</text>
            <rect x={pad.l} y={y} width={Math.max(barW, 2)} height={bar} rx="3" fill={bad ? "#d97706" : "#9a3412"} />
            <line x1={limitX} x2={limitX} y1={y - 1} y2={y + bar + 1} stroke="#3b2415" strokeWidth="1.5" />
            <text x={width - 4} y={y + bar / 2 + 3} textAnchor="end">{value}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function QcOverviewPage() {
  const raw = useMemo(() => listRawQc().filter((row) => row.date === todayIso()), []);
  const process = useMemo(() => listProcessQc().filter((row) => row.date === todayIso()), []);
  const finish = useMemo(() => listFinishQc().filter((row) => row.date === todayIso()), []);
  const recent = [
    ...raw.map((row) => ({ kind: "Incoming", ref: row.material, detail: row.sampleNo, decision: row.decision })),
    ...process.map((row) => ({ kind: "In-process", ref: row.batchNo, detail: row.stage, decision: row.decision })),
    ...finish.map((row) => ({ kind: "Finished", ref: row.product, detail: row.batchNo, decision: row.decision })),
  ];
  const pass = recent.filter((row) => row.decision === "Pass").length;
  const hold = recent.filter((row) => row.decision === "Hold").length;
  const reject = recent.filter((row) => row.decision === "Reject").length;
  const cooler = process.find((row) => row.stage === "Cooling" || row.stage === "Cooler");
  const pellet = process.find((row) => row.stage === "Pelleting" || row.stage === "Pellet");

  return (
    <div className="cf-page cf-store cf-qc-home">
      <header className="cf-page-head">
        <div>
          <p>Quality control</p>
          <h1>QC Overview</h1>
          <p>Lab checks on incoming ingredients, the pellet line, and finished feed</p>
        </div>
      </header>
      <div className="cf-qc-kpis">
        <article>
          <Package size={16} />
          <span>Incoming today</span>
          <strong>{raw.length}</strong>
          <em>{raw.filter((row) => row.decision === "Pass").length} passed</em>
          <i className="cf-qc-meter"><b style={{ width: `${raw.length ? (raw.filter((row) => row.decision === "Pass").length / raw.length) * 100 : 0}%` }} /></i>
        </article>
        <article>
          <Activity size={16} />
          <span>In-process today</span>
          <strong>{process.length}</strong>
          <em>{process.filter((row) => row.decision === "Pass").length} passed</em>
          <i className="cf-qc-meter"><b style={{ width: `${process.length ? (process.filter((row) => row.decision === "Pass").length / process.length) * 100 : 0}%` }} /></i>
        </article>
        <article>
          <FileBarChart size={16} />
          <span>Finished feed</span>
          <strong>{finish.length}</strong>
          <em>{finish.filter((row) => row.decision === "Pass").length} passed</em>
          <i className="cf-qc-meter"><b style={{ width: `${finish.length ? (finish.filter((row) => row.decision === "Pass").length / finish.length) * 100 : 0}%` }} /></i>
        </article>
        <article>
          <FlaskConical size={16} />
          <span>On hold</span>
          <strong>{hold}</strong>
          <em className="is-hold">{reject} rejected</em>
          <i className="cf-qc-meter is-hold"><b style={{ width: `${recent.length ? (hold / recent.length) * 100 : 0}%` }} /></i>
        </article>
      </div>
      <div className="cf-qc-charts is-top">
        <section className="cf-qc-decision">
          <h2>Today’s decisions</h2>
          <DecisionDonut pass={pass} hold={hold} reject={reject} />
        </section>
        <section>
          <header>
            <h2>Incoming aflatoxin B1</h2>
            <span>ppb</span>
          </header>
          <AflatoxinChart rows={raw} />
          <p className="cf-qc-key"><i className="is-ok" />Under limit<i className="is-low" />Over limit<span>Dashed line is 20 ppb. Grains and rice bran may go to 50.</span></p>
        </section>
      </div>
      <div className="cf-qc-charts is-bottom">
        <section>
          <header>
            <h2>Pellet line · B-0902</h2>
            <span>Shift B</span>
          </header>
          <div className="cf-qc-split">
            <aside>
              <p><span>Cooler outlet</span><strong>{cooler ? `${cooler.moisture}%` : "—"}</strong></p>
              <p><span>Temperature</span><em>{cooler ? `${cooler.temp} °C` : "—"}</em></p>
              <p><span>Durability</span><b>{pellet?.durability || "—"}%</b></p>
              <p><span>Fines</span><b>{cooler?.fines || "—"}%</b></p>
            </aside>
            <div>
              <p className="cf-qc-key"><i className="is-line" />Moisture %<i className="is-bar" />Temperature °C</p>
              <ProcessChart rows={process} />
            </div>
          </div>
        </section>
        <section>
          <header>
            <h2>Finished feed vs BIS limit</h2>
            <span>mark = limit</span>
          </header>
          <p className="cf-qc-key">Moisture % · max 11</p>
          <FinishBars
            rows={finish}
            field="moisture"
            max={14}
            higherIsBad
            limitFor={() => 11}
            label="Finished feed moisture against 11 percent maximum"
          />
          <p className="cf-qc-key">Crude protein % · Type I min 22, Type II min 20</p>
          <FinishBars
            rows={finish}
            field="cp"
            max={26}
            higherIsBad={false}
            limitFor={(row) => (row.feedType === "Type II" ? 20 : 22)}
            label="Finished feed protein against the type minimum"
          />
          <ul className="cf-qc-limits">
            {BIS_LIMITS.map((row) => (
              <li key={row.check}>
                <b>{row.check}</b>
                <span>I {row.typeI}</span>
                <span>II {row.typeII}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="cf-qc-list">
        <h2>Decision list</h2>
        <table className="cf-qc-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Item</th>
              <th>Ref</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((row) => (
              <tr key={`${row.kind}-${row.detail}-${row.ref}`}>
                <td>{row.kind}</td>
                <td>{row.ref}</td>
                <td>{row.detail}</td>
                <td>
                  <span className={`cf-store-tag ${tone(row.decision)}`}>{row.decision}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function readCell(value: string, title?: string) {
  return (
    <td>
      <input className="cf-cell" readOnly value={value} title={title} />
    </td>
  );
}

function withCurrent(current: string, options: readonly string[]) {
  return current && !options.includes(current) ? [current, ...options] : [...options];
}

const MATERIAL_OPTIONS = RAW_MATERIALS.filter((item) => item.value !== "bags").map((item) => item.label);
const PRODUCT_OPTIONS = FEED_PRODUCTS.map((item) => item.label.split("—")[0].trim());

function gateChoices() {
  return listInward()
    .filter((row) => row.grossKg)
    .map((row) => `${row.vehicleNo} · ${materialLabel(row.material)}`);
}

function measureCell(value: string, applies: boolean, spec: string, onChange: (value: string) => void) {
  if (!applies) return readCell("Not applicable", spec);
  return (
    <td>
      <input
        className="cf-cell"
        inputMode="decimal"
        value={value}
        title={spec}
        placeholder={spec}
        onChange={(event) => onChange(event.target.value)}
      />
    </td>
  );
}

function rawTests(row: RawQcRow) {
  const checks = [
    compareResult(row.moisture, rawChemApplies(row.material, "moisture") ? { max: /molasses/i.test(row.material) ? 25 : 14 } : null),
    compareResult(row.cp, rawChemApplies(row.material, "cp") ? {} : null),
    compareResult(row.fat, rawChemApplies(row.material, "fat") ? {} : null),
    compareResult(row.fibre, rawChemApplies(row.material, "fibre") ? {} : null),
    compareResult(row.aflatoxin, rawChemApplies(row.material, "aflatoxin") ? { max: aflatoxinMax(row.material) } : null),
  ];
  const watch = (["colour", "odour", "foreignMatter", "infestation", "fungal", "packaging"] as const).map((key) =>
    rawPhysicalApplies(row.material, key) ? (row[key] === "Fail" ? "Fail" : row[key] ? "Pass" : "Pending") : "Not applicable",
  );
  const all = [...checks.filter((item) => item !== "Not applicable"), ...watch.filter((item) => item !== "Not applicable")];
  if (all.some((item) => item === "Fail")) return "Fail";
  if (all.some((item) => item === "Pending")) return "Pending";
  return all.length ? "Pass" : "Not applicable";
}

export function RawMaterialQcPage() {
  const sheet = useRows(listRawQc, saveRawQc);
  const samples = listSamples().map((row) => row.sampleNo).filter(Boolean);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.sampleNo, row.material, row.supplier, row.gateRef, row.internalLot, row.decision]);
  const patch = (id: string, next: Partial<RawQcRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  };
  return (
    <LogSheet
      wide
      title="RAW MATERIAL QC"
      icon={<Package size={18} />}
      note="A Pass is the sample result only. The incoming load stays unreleased until Lot release is set to Lot confirmed for that receipt."
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Sample, material, lot, supplier…"
      status={sheet.status}
      empty="No raw-material checks for this date."
      headers={["Sample ID", "Shift", "Gate receipt", "Supplier lot", "Internal lot", "Material", "Supplier", "Collected", "Location", "Qty", "Inspector", "Technician", "Moisture %", "CP %", "Fat %", "Fibre %", "Aflatoxin B1 ppb", "Method", "Tests", "Colour", "Odour", "Foreign matter", "Infestation", "Fungal growth", "Packaging", "Decision", "Reason", "Remarks", "COA", "Retest date", "Retest result", "Lot release"]}
      onAdd={() => {
        const row: RawQcRow = {
          id: nextQcId("QR", sheet.rows),
          date: sheet.date,
          sampleNo: nextSampleNo(listSamples(), "RM"),
          shift: "Lab",
          material: "Maize",
          supplier: SUPPLIERS[0],
          moisture: "",
          cp: "",
          fat: "",
          fibre: "",
          aflatoxin: "",
          colour: "Ok",
          odour: "Ok",
          foreignMatter: "Ok",
          infestation: "Ok",
          fungal: "Ok",
          packaging: "Ok",
          decision: "Pending",
          reasonCode: "",
          remarks: "",
          gateRef: "",
          supplierLot: "",
          internalLot: "",
          collectedAt: "",
          sampleLocation: "Quarantine bay",
          sampleQty: "1 kg",
          method: "Mill lab",
          inspector: "",
          technician: "",
          coaRef: "",
          retestDate: "",
          retestResult: "",
          lotRelease: "Sample only",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Sample row added. It does not release the incoming load.");
      }}
      onSave={() => sheet.flash("Raw material sheet saved. Lot release is still separate from the sample decision.")}
      render={(row) => (
        <>
          {choiceCell(row.sampleNo, withCurrent(row.sampleNo, samples), (sampleNo) => patch(row.id, { sampleNo }))}
          {choiceCell(row.shift, QC_SHIFTS, (shift) => patch(row.id, { shift }))}
          {choiceCell(row.gateRef, withCurrent(row.gateRef, gateChoices()), (gateRef) => patch(row.id, { gateRef }))}
          {textCell(row.supplierLot, (supplierLot) => patch(row.id, { supplierLot }))}
          {textCell(row.internalLot, (internalLot) => patch(row.id, { internalLot }))}
          {choiceCell(row.material, withCurrent(row.material, MATERIAL_OPTIONS), (material) => patch(row.id, { material }))}
          {choiceCell(row.supplier, withCurrent(row.supplier, SUPPLIERS), (supplier) => patch(row.id, { supplier }))}
          {textCell(row.collectedAt, (collectedAt) => patch(row.id, { collectedAt }))}
          {textCell(row.sampleLocation, (sampleLocation) => patch(row.id, { sampleLocation }))}
          {textCell(row.sampleQty, (sampleQty) => patch(row.id, { sampleQty }))}
          {textCell(row.inspector, (inspector) => patch(row.id, { inspector }))}
          {textCell(row.technician, (technician) => patch(row.id, { technician }))}
          {measureCell(row.moisture, rawChemApplies(row.material, "moisture"), "max 14 %", (moisture) => patch(row.id, { moisture }))}
          {measureCell(row.cp, rawChemApplies(row.material, "cp"), "%", (cp) => patch(row.id, { cp }))}
          {measureCell(row.fat, rawChemApplies(row.material, "fat"), "%", (fat) => patch(row.id, { fat }))}
          {measureCell(row.fibre, rawChemApplies(row.material, "fibre"), "%", (fibre) => patch(row.id, { fibre }))}
          {measureCell(row.aflatoxin, rawChemApplies(row.material, "aflatoxin"), `max ${aflatoxinMax(row.material)} ppb`, (aflatoxin) => patch(row.id, { aflatoxin }))}
          {textCell(row.method, (method) => patch(row.id, { method }))}
          {readCell(rawTests(row))}
          {(["colour", "odour", "foreignMatter", "infestation", "fungal", "packaging"] as const).map((key) =>
            rawPhysicalApplies(row.material, key)
              ? choiceCell(row[key], OBSERVE.filter((item) => item !== "Not applicable"), (value) => patch(row.id, { [key]: value }))
              : readCell("Not applicable"),
          )}
          {choiceCell(row.decision, QC_DECISIONS, (decision) => patch(row.id, { decision }))}
          {choiceCell(row.reasonCode, REASON_CODES, (reasonCode) => patch(row.id, { reasonCode }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
          {textCell(row.coaRef, (coaRef) => patch(row.id, { coaRef }))}
          {textCell(row.retestDate, (retestDate) => patch(row.id, { retestDate }))}
          {textCell(row.retestResult, (retestResult) => patch(row.id, { retestResult }))}
          {choiceCell(row.lotRelease, LOT_RELEASE, (lotRelease) => patch(row.id, { lotRelease }))}
        </>
      )}
    />
  );
}

export function InProcessQcPage() {
  const sheet = useRows(listProcessQc, saveProcessQc);
  const samples = listSamples().map((row) => row.sampleNo).filter(Boolean);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.batchNo, row.orderNo, row.sampleNo, row.stage, row.machine, row.decision]);
  const patch = (id: string, next: Partial<ProcessQcRow>) => {
    sheet.commit(
      sheet.rows.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...next };
        if (next.stage && !pelletMetricsApply(merged.stage)) {
          merged.durability = "";
          merged.fines = "";
        }
        return merged;
      }),
    );
  };
  return (
    <LogSheet
      wide
      title="IN-PROCESS QC"
      icon={<Activity size={18} />}
      note="Durability and fines apply to pelleting and cooling. Mixing and conditioning mark them Not applicable instead of zero."
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Order, batch, sample, stage…"
      status={sheet.status}
      empty="No in-process checks for this date."
      headers={["Order", "Batch", "Sample ID", "Product", "Formula", "Line", "Machine", "Stage", "Shift", "Sample time", "Test time", "Moisture %", "Moisture range", "Durability %", "Fines %", "Temp °C", "Temp point", "Operator", "Inspector", "Reviewer", "Decision", "Corrective action", "Retest", "Remarks"]}
      onAdd={() => {
        const row: ProcessQcRow = {
          id: nextQcId("QP", sheet.rows),
          date: sheet.date,
          batchNo: "",
          shift: "A",
          stage: "Mixing",
          moisture: "",
          durability: "",
          fines: "",
          temp: "",
          decision: "Pending",
          remarks: "",
          orderNo: "",
          sampleNo: nextSampleNo(listSamples(), "PR"),
          product: "CF 700",
          formulaVersion: "",
          line: "Pellet line 1",
          machine: "",
          sampleAt: "",
          testAt: "",
          moistureMin: "",
          moistureMax: "",
          tempPoint: "Mash bin",
          operator: "",
          inspector: "",
          reviewer: "",
          corrective: "",
          retestRef: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("In-process sheet saved.")}
      render={(row) => {
        const pellets = pelletMetricsApply(row.stage);
        const range = row.moistureMin || row.moistureMax ? `${row.moistureMin || "—"}–${row.moistureMax || "—"}` : "";
        return (
          <>
            {textCell(row.orderNo, (orderNo) => patch(row.id, { orderNo }))}
            {textCell(row.batchNo, (batchNo) => patch(row.id, { batchNo }))}
            {choiceCell(row.sampleNo, withCurrent(row.sampleNo, samples), (sampleNo) => patch(row.id, { sampleNo }))}
            {choiceCell(row.product, withCurrent(row.product, PRODUCT_OPTIONS), (product) => patch(row.id, { product }))}
            {textCell(row.formulaVersion, (formulaVersion) => patch(row.id, { formulaVersion }))}
            {textCell(row.line, (line) => patch(row.id, { line }))}
            {textCell(row.machine, (machine) => patch(row.id, { machine }))}
            {choiceCell(row.stage, withCurrent(row.stage, PROCESS_STAGES), (stage) => patch(row.id, { stage }))}
            {choiceCell(row.shift, QC_SHIFTS, (shift) => patch(row.id, { shift }))}
            {textCell(row.sampleAt, (sampleAt) => patch(row.id, { sampleAt }))}
            {textCell(row.testAt, (testAt) => patch(row.id, { testAt }))}
            {measureCell(row.moisture, true, range || "%", (moisture) => patch(row.id, { moisture }))}
            {textCell(`${row.moistureMin}–${row.moistureMax}`, (value) => {
              const [moistureMin = "", moistureMax = ""] = value.split(/–|-/);
              patch(row.id, { moistureMin: moistureMin.trim(), moistureMax: moistureMax.trim() });
            })}
            {measureCell(row.durability, pellets, "pellet %", (durability) => patch(row.id, { durability }))}
            {measureCell(row.fines, pellets, "pellet %", (fines) => patch(row.id, { fines }))}
            {textCell(row.temp, (temp) => patch(row.id, { temp }))}
            {choiceCell(row.tempPoint, TEMP_POINTS, (tempPoint) => patch(row.id, { tempPoint }))}
            {textCell(row.operator, (operator) => patch(row.id, { operator }))}
            {textCell(row.inspector, (inspector) => patch(row.id, { inspector }))}
            {textCell(row.reviewer, (reviewer) => patch(row.id, { reviewer }))}
            {choiceCell(row.decision, QC_DECISIONS, (decision) => patch(row.id, { decision }))}
            {textCell(row.corrective, (corrective) => patch(row.id, { corrective }))}
            {textCell(row.retestRef, (retestRef) => patch(row.id, { retestRef }))}
            {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
          </>
        );
      }}
    />
  );
}

function finishTests(row: FinishQcRow) {
  const names = ["moisture", "cp", "fat", "fibre", "aia", "salt", "calcium", "phosphorus", "availableP", "urea", "aflatoxin"] as const;
  const results = names.map((name) => compareResult(row[name], finishTestApplies(row, name) ? finishBound(row.feedType, name) : null));
  if (row.form === "Pellet") {
    results.push(row.pellet === "Fail" ? "Fail" : row.pellet === "Pass" ? "Pass" : "Pending");
  }
  const scored = results.filter((item) => item !== "Not applicable");
  if (scored.some((item) => item === "Fail")) return "Fail";
  if (scored.some((item) => item === "Pending")) return "Pending";
  return "Pass";
}

export function FinishedFeedQcPage() {
  const sheet = useRows(listFinishQc, saveFinishQc);
  const samples = listSamples().map((row) => row.sampleNo).filter(Boolean);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.batchNo, row.orderNo, row.sampleNo, row.product, row.feedType, row.decision]);
  const patch = (id: string, next: Partial<FinishQcRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...next, testStatus: finishTests({ ...row, ...next }) } : row)));
  };
  return (
    <LogSheet
      wide
      title="FINISHED FEED QC"
      icon={<FileBarChart size={18} />}
      note="Mill card from IS 2052 style limits: moisture max 11, Type I protein min 22, Type II protein min 20, aflatoxin B1 max 20 ppb. Vitamins apply to mineral products only. This card is not the full standard."
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Batch, order, sample, product…"
      status={sheet.status}
      empty="No finished-feed checks for this date."
      headers={["Batch", "Order", "Formula", "Mfg date", "Sample ID", "Sample time", "Shift", "Product", "Type", "Form", "Moisture %", "CP %", "Fat %", "Fibre %", "AIA %", "Salt %", "Calcium %", "Phosphorus %", "Available P %", "Urea %", "Vit A", "Vit D3", "Vit E", "Aflatoxin B1 ppb", "Pellet", "Durability %", "Fines %", "Method", "Tests", "Reviewer", "Decision", "Reason", "Retest", "COA"]}
      onAdd={() => {
        const row: FinishQcRow = {
          id: nextQcId("QF", sheet.rows),
          date: sheet.date,
          batchNo: "",
          shift: "A",
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
          orderNo: "",
          formulaVersion: "",
          mfgDate: sheet.date,
          sampleNo: nextSampleNo(listSamples(), "FF"),
          sampleAt: "",
          method: "Mill lab",
          testStatus: "Pending",
          reviewer: "",
          retestRef: "",
          coaRef: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill the applicable tests, then save.");
      }}
      onSave={() => sheet.flash("Finished feed sheet saved.")}
      render={(row) => {
        const pelletFeed = row.form === "Pellet";
        const cell = (key: "moisture" | "cp" | "fat" | "fibre" | "aia" | "salt" | "calcium" | "phosphorus" | "availableP" | "urea" | "aflatoxin", unit: string) =>
          measureCell(row[key], finishTestApplies(row, key), boundLabel(finishBound(row.feedType, key), unit), (value) => patch(row.id, { [key]: value }));
        return (
          <>
            {textCell(row.batchNo, (batchNo) => patch(row.id, { batchNo }))}
            {textCell(row.orderNo, (orderNo) => patch(row.id, { orderNo }))}
            {textCell(row.formulaVersion, (formulaVersion) => patch(row.id, { formulaVersion }))}
            {textCell(row.mfgDate, (mfgDate) => patch(row.id, { mfgDate }))}
            {choiceCell(row.sampleNo, withCurrent(row.sampleNo, samples), (sampleNo) => patch(row.id, { sampleNo }))}
            {textCell(row.sampleAt, (sampleAt) => patch(row.id, { sampleAt }))}
            {choiceCell(row.shift, QC_SHIFTS, (shift) => patch(row.id, { shift }))}
            {choiceCell(row.product, withCurrent(row.product, PRODUCT_OPTIONS), (product) => patch(row.id, { product }))}
            {choiceCell(row.feedType, FEED_TYPES, (feedType) => patch(row.id, { feedType }))}
            {choiceCell(row.form, FEED_FORMS, (form) => patch(row.id, { form, pellet: form === "Mash" ? "Not applicable" : row.pellet === "Not applicable" ? "Pass" : row.pellet }))}
            {cell("moisture", "%")}
            {cell("cp", "%")}
            {cell("fat", "%")}
            {cell("fibre", "%")}
            {cell("aia", "%")}
            {cell("salt", "%")}
            {cell("calcium", "%")}
            {cell("phosphorus", "%")}
            {cell("availableP", "%")}
            {cell("urea", "%")}
            {measureCell(row.vitaminA, finishTestApplies(row, "vitaminA"), "IU, mineral products", (vitaminA) => patch(row.id, { vitaminA }))}
            {measureCell(row.vitaminD3, finishTestApplies(row, "vitaminD3"), "IU, mineral products", (vitaminD3) => patch(row.id, { vitaminD3 }))}
            {measureCell(row.vitaminE, finishTestApplies(row, "vitaminE"), "IU, mineral products", (vitaminE) => patch(row.id, { vitaminE }))}
            {cell("aflatoxin", "ppb")}
            {choiceCell(pelletFeed ? row.pellet : "Not applicable", pelletFeed ? PELLET_RESULTS.filter((item) => item !== "Not applicable") : ["Not applicable"], (pellet) => patch(row.id, { pellet }))}
            {measureCell(row.durability, pelletFeed, "%", (durability) => patch(row.id, { durability }))}
            {measureCell(row.fines, pelletFeed, "%", (fines) => patch(row.id, { fines }))}
            {textCell(row.method, (method) => patch(row.id, { method }))}
            {readCell(finishTests(row))}
            {textCell(row.reviewer, (reviewer) => patch(row.id, { reviewer }))}
            {choiceCell(row.decision, QC_DECISIONS, (decision) => patch(row.id, { decision }))}
            {choiceCell(row.reasonCode, REASON_CODES, (reasonCode) => patch(row.id, { reasonCode }))}
            {textCell(row.retestRef, (retestRef) => patch(row.id, { retestRef }))}
            {textCell(row.coaRef, (coaRef) => patch(row.id, { coaRef }))}
          </>
        );
      }}
    />
  );
}

export function SampleRegisterPage() {
  const sheet = useRows(listSamples, saveSamples);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.sampleNo, row.source, row.ref, row.drawnFrom, row.status, row.sealNo]);
  const patch = (id: string, next: Partial<SampleRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  };
  return (
    <LogSheet
      wide
      title="SAMPLE REGISTER"
      icon={<ClipboardList size={18} />}
      note="Sample ID is unique across QC. Retain tracks quantity, storage, expiry, and whether the sample can still be retested."
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Sample, lot, location, status…"
      status={sheet.status}
      empty="No samples for this date."
      headers={["Sample ID", "Type", "Shift", "Collected", "Received", "Collected by", "Received by", "Location", "Lot / receipt", "Method", "Increments", "Qty", "Seal", "Retain qty", "Storage", "Retain until", "Disposal", "Status"]}
      onAdd={() => {
        const sampleNo = nextSampleNo(sheet.rows, "RM");
        const row: SampleRow = {
          id: nextQcId("QS", sheet.rows),
          date: sheet.date,
          sampleNo,
          shift: "Lab",
          source: "Raw material",
          ref: "",
          drawnFrom: "",
          retainQty: "500 g",
          storage: "Retain cupboard",
          retainUntil: "",
          disposal: "Held",
          status: "Collected",
          collectedAt: "",
          receivedAt: "",
          collectedBy: "",
          receivedBy: "",
          method: "Composite",
          increments: "3",
          sampleQty: "1 kg",
          sealNo: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash(`${sampleNo} added. Save the register to keep it.`);
      }}
      onSave={() => {
        const ids = sheet.rows.map((row) => row.sampleNo.trim()).filter(Boolean);
        if (new Set(ids).size !== ids.length) {
          sheet.flash("Each sample ID must be unique.");
          return;
        }
        sheet.flash("Sample register saved.");
      }}
      render={(row) => (
        <>
          {readCell(row.sampleNo)}
          {choiceCell(row.source, SAMPLE_TYPES, (source) => patch(row.id, { source }))}
          {choiceCell(row.shift, QC_SHIFTS, (shift) => patch(row.id, { shift }))}
          {textCell(row.collectedAt, (collectedAt) => patch(row.id, { collectedAt }))}
          {textCell(row.receivedAt, (receivedAt) => patch(row.id, { receivedAt }))}
          {textCell(row.collectedBy, (collectedBy) => patch(row.id, { collectedBy }))}
          {textCell(row.receivedBy, (receivedBy) => patch(row.id, { receivedBy }))}
          {textCell(row.drawnFrom, (drawnFrom) => patch(row.id, { drawnFrom }))}
          {textCell(row.ref, (ref) => patch(row.id, { ref }))}
          {textCell(row.method, (method) => patch(row.id, { method }))}
          {textCell(row.increments, (increments) => patch(row.id, { increments }))}
          {textCell(row.sampleQty, (sampleQty) => patch(row.id, { sampleQty }))}
          {textCell(row.sealNo, (sealNo) => patch(row.id, { sealNo }))}
          {textCell(row.retainQty, (retainQty) => patch(row.id, { retainQty }))}
          {textCell(row.storage, (storage) => patch(row.id, { storage }))}
          {textCell(row.retainUntil, (retainUntil) => patch(row.id, { retainUntil }))}
          {choiceCell(row.disposal, ["Held", "Available", "Disposed"], (disposal) => patch(row.id, { disposal }))}
          {choiceCell(row.status, SAMPLE_STATUS, (status) => patch(row.id, { status }))}
        </>
      )}
    />
  );
}
