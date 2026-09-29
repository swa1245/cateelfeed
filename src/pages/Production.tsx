import { useMemo, useState, type ReactNode } from "react";
import weighingFig from "@/assets/mill/mill-weighing.png";
import millingFig from "@/assets/mill/mill-milling.png";
import mixerFig from "@/assets/mill/mill-mixer.png";
import pelletFig from "@/assets/mill/mill-pellet.png";
import coolerFig from "@/assets/mill/mill-cooler.png";
import sievesFig from "@/assets/mill/mill-sieves.png";
import tankFig from "@/assets/mill/mill-tank.png";
import packingFig from "@/assets/mill/mill-packing.png";
import { Link } from "react-router-dom";
import { FileBarChart, Layers, Package, Plus, Save, Search } from "lucide-react";
import { SheetDatePicker } from "@/components/SheetDatePicker";
import { SheetSelect } from "@/components/SheetSelect";
import { FEED_PRODUCTS, RAW_MATERIALS, formatSheetDate, materialLabel, productLabel, sheetDateFromQuery } from "@/data/movements";
import {
  BATCH_STATUSES,
  GRADE_NUTRIENTS,
  PROCESS_STAGES,
  READING_SOURCES,
  REPORT_ACK,
  REPORT_CATEGORIES,
  REPORT_LEVELS,
  SHIFTS,
  formulaLines,
  listBatchReports,
  listBatches,
  listDowntime,
  listMaterialIssues,
  listProcessLog,
  listProcessParams,
  listReports,
  listShiftReports,
  liveBatch,
  nextProdId,
  paramReading,
  reconcileBatch,
  saveBatchReports,
  saveBatches,
  saveDowntime,
  saveMaterialIssues,
  saveProcessLog,
  saveReports,
  saveShiftReports,
  weighLine,
  type BatchReportRow,
  type BatchRow,
  type DowntimeRow,
  type MaterialIssueRow,
  type ProcessLogRow,
  type ProcessParam,
  type ReportRow,
  type ShiftReportRow,
} from "@/data/production";

const FIGURES: Record<string, string> = {
  weighing: weighingFig,
  milling: millingFig,
  mixer: mixerFig,
  pellet: pelletFig,
  cooler: coolerFig,
  sieves: sievesFig,
  tank: tankFig,
  packing: packingFig,
};

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

function shortProduct(value: string) {
  return productLabel(value).split("—")[0].trim() || "Unnamed";
}

function paramValue(params: ProcessParam[], name: string) {
  return params.find((row) => row.name === name)?.value || "—";
}

function pillClass(value: string) {
  const key = value.toLowerCase().replace(/\s+/g, "-");
  return `cf-pill cf-pill-${key}`;
}

function sortBatches(rows: BatchRow[]) {
  return [...rows].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
}

function millBoard(order: BatchRow | undefined, issues: MaterialIssueRow[], params: ProcessParam[]) {
  const lines = issues.filter((row) => row.batchNo && row.batchNo === order?.batchNo);
  const required = lines.reduce((sum, row) => sum + (Number(row.requiredKg) || 0), 0);
  const weighed = lines.reduce((sum, row) => sum + (Number(row.qtyKg) || 0), 0);
  const done = lines.filter((row) => row.status === "Done" || row.status === "Exception").length;
  const bags = Number(order?.bags) || 0;
  const targetKg = (Number(order?.qtyMt) || 0) * 1000;
  const packedKg = bags * 50;
  const progress = targetKg ? Math.min(100, Math.round((packedKg / targetKg) * 1000) / 10) : 0;
  const finished = order?.status === "Completed";
  const moving = order?.status === "In progress";
  const weighState = !lines.length ? "Pending" : done === lines.length && weighed >= required ? "Done" : "Running";
  const stage = (running: boolean) => (finished ? "Done" : running ? "Running" : "Pending");
  const stages = [
    {
      name: "Weighing",
      icon: "weighing",
      to: "/production/raw-material",
      state: finished ? "Done" : weighState,
      metrics: [
        { label: "", value: lines.length ? `${done} / ${lines.length} Materials` : "No materials" },
        {
          label: "Total Weighed",
          value: `${Math.round(weighed).toLocaleString("en-IN")} kg / ${Math.round(required).toLocaleString("en-IN")} kg`,
        },
      ],
    },
    {
      name: "Milling",
      icon: "milling",
      to: "/production/reports",
      state: stage(moving),
      metrics: [
        { label: "Feed Rate", value: paramValue(params, "Milling feed rate") },
        { label: "Total Milled", value: `${(packedKg / 1000).toFixed(1)} t` },
      ],
    },
    {
      name: "Mixer",
      icon: "mixer",
      to: "/production/reports",
      state: stage(moving),
      metrics: [
        { label: "Mixing Time", value: moving || finished ? "3.5 min" : "—" },
        { label: "Premix Added", value: paramValue(params, "Premix addition") },
      ],
    },
    {
      name: "Pellet Machine",
      icon: "pellet",
      to: "/production/reports",
      state: stage(moving),
      metrics: [
        { label: "Die Temp.", value: paramValue(params, "Die temperature") },
        { label: "Amperage", value: paramValue(params, "Pellet machine load") },
      ],
    },
    {
      name: "Cooler",
      icon: "cooler",
      to: "/production/reports",
      state: stage(moving),
      metrics: [
        { label: "Outlet Temp.", value: paramValue(params, "Cooler outlet") },
        { label: "Cooler Fan", value: moving || finished ? "On" : "Off" },
      ],
    },
    {
      name: "Sieves",
      icon: "sieves",
      to: "/production/reports",
      state: stage(moving),
      metrics: [
        { label: "Pellet %", value: paramValue(params, "Sieve efficiency").replace("%", " %") },
        { label: "Oversize", value: moving || finished ? "2.1 %" : "—" },
      ],
    },
    {
      name: "Product Tank",
      icon: "tank",
      to: "/production/batch-history",
      state: finished ? "Done" : "Pending",
      metrics: [
        { label: "Tank Level", value: `${progress} %` },
        { label: "Current Stock", value: `${(packedKg / 1000).toFixed(1)} MT` },
      ],
    },
    {
      name: "Weighing & Packing",
      icon: "packing",
      to: "/production/batch-history",
      state: finished ? "Done" : moving ? "Next" : "Pending",
      metrics: [
        { label: "Bags Packed", value: bags.toLocaleString("en-IN") },
        { label: "Bag Weight", value: "50 kg" },
      ],
    },
  ];
  return { lines, required, weighed, bags, packedKg, progress, stages };
}

function MillFigure({ kind }: { kind: string }) {
  const src = FIGURES[kind];
  if (!src) return null;
  return <img className="cf-mill" src={src} alt="" />;
}

function BatchBook({ rows }: { rows: BatchRow[] }) {
  return (
    <table className="cf-ledger">
      <thead>
        <tr>
          <th>Batch</th>
          <th>Product</th>
          <th>Qty (MT)</th>
          <th>Start</th>
          <th>Expected end</th>
          <th>Status</th>
          <th>Bags</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={7}>No batches posted yet.</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id}>
              <td>{row.batchNo || "—"}</td>
              <td>{shortProduct(row.product)}</td>
              <td>{row.qtyMt || "—"}</td>
              <td>
                {formatSheetDate(row.date)} {row.time}
              </td>
              <td>{row.endTime || "—"}</td>
              <td>
                <span className={pillClass(row.status || "Pending")}>{row.status || "Pending"}</span>
              </td>
              <td>{row.bags || "—"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function WeighBook({ rows }: { rows: MaterialIssueRow[] }) {
  const required = rows.reduce((sum, row) => sum + (Number(row.requiredKg) || 0), 0);
  const weighed = rows.reduce((sum, row) => sum + (Number(row.qtyKg) || 0), 0);
  const share = required ? Math.round((weighed / required) * 100) : 0;
  return (
    <table className="cf-ledger">
      <thead>
        <tr>
          <th>S.No</th>
          <th>Material</th>
          <th>Required (kg)</th>
          <th>Weighed (kg)</th>
          <th>Variance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6}>No weigh lines for this batch.</td>
          </tr>
        ) : (
          rows.map((row, index) => {
            const line = weighLine(row);
            return (
            <tr key={row.id}>
              <td>{index + 1}</td>
              <td>{materialLabel(row.material)}</td>
              <td>{line.required.toLocaleString("en-IN")}</td>
              <td>{line.weighed.toLocaleString("en-IN")}</td>
              <td>{line.variance > 0 ? "+" : ""}{Math.round(line.variance).toLocaleString("en-IN")} kg</td>
              <td>
                <span className={pillClass(line.status)}>{line.status}</span>
              </td>
            </tr>
            );
          })
        )}
        {rows.length > 0 ? (
          <tr className="cf-ledger-total">
            <td />
            <td>Total</td>
            <td>{required.toLocaleString("en-IN")}</td>
            <td>{weighed.toLocaleString("en-IN")}</td>
            <td>{Math.round(weighed - required).toLocaleString("en-IN")} kg</td>
            <td>{share}%</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function AlertBook({ rows }: { rows: ReportRow[] }) {
  const list = [...rows].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  if (list.length === 0) return <p className="cf-muted">No alerts posted yet.</p>;
  return (
    <ul className="cf-alerts">
      {list.map((row) => (
        <li key={row.id}>
          <i className={pillClass(row.level || "Note")} />
          <div>
            <strong>{row.title || "Untitled"}</strong>
            <p>
              {row.batchNo || "No batch"} · {row.note || "—"}
            </p>
          </div>
          <time>
            {formatSheetDate(row.date)} {row.time}
          </time>
        </li>
      ))}
    </ul>
  );
}

function minutesOf(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function spanLabel(minutes: number) {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  return `${hours} h ${mins} min`;
}

function TempChart({ peak }: { peak: number }) {
  const factors = [0.74, 0.82, 0.88, 0.93, 0.97, 1];
  const labels = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];
  const points = factors.map((factor) => Math.round(peak * factor));
  const width = 240;
  const height = 92;
  const coords = points.map((value, index) => {
    const x = 16 + (index * (width - 32)) / (points.length - 1);
    const y = 12 + (1 - value / Math.max(peak, 1)) * (height - 28);
    return { x, y, value, label: labels[index] };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <svg className="cf-temp" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pellet temperature through the shift">
      <polyline points={line} />
      {coords.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="3.5" />
          <text x={point.x} y={height - 4} textAnchor="middle">
            {point.label.slice(0, 2)}
          </text>
        </g>
      ))}
      <text x={width - 8} y={coords[coords.length - 1].y - 8} textAnchor="end">
        {peak}°C
      </text>
    </svg>
  );
}

export function ProductionOverviewPage() {
  const batches = listBatches();
  const issues = listMaterialIssues();
  const reports = listReports();
  const params = listProcessParams();
  const [batchId, setBatchId] = useState("");
  const order = batches.find((row) => row.id === batchId) || liveBatch(batches);
  const choose = (rows: BatchRow[]) => {
    const next = sortBatches(rows)[0];
    if (next) setBatchId(next.id);
  };
  const products = [...new Set(batches.map((row) => row.product).filter(Boolean))];
  const quantities = [...new Set(batches.map((row) => row.qtyMt).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
  const statuses = [...new Set(batches.map((row) => row.status).filter(Boolean))];
  const starts = sortBatches(batches)
    .map((row) => ({ value: `${row.date}|${row.time}`, label: `${formatSheetDate(row.date)} ${row.time}`.trim() }))
    .filter((item, index, list) => list.findIndex((other) => other.value === item.value) === index);
  const ends = [...new Set(batches.map((row) => row.endTime).filter(Boolean))].sort();
  const board = millBoard(order, issues, params);
  const recentBatches = sortBatches(batches.filter((row) => row.product === order?.product)).slice(0, 5);
  const recentAlerts = [...reports]
    .filter((row) => row.batchNo === order?.batchNo)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const packedMt = (board.packedKg / 1000).toFixed(2);
  const rate = paramValue(params, "Production rate");
  const die = Number.parseFloat(paramValue(params, "Die temperature")) || 52;
  const sent =
    reports.find((row) => row.batchNo === order?.batchNo && /grade|sent/i.test(row.title)) ||
    reports.find((row) => row.batchNo === order?.batchNo);
  const startMin = minutesOf(order?.time || "");
  const endMin = minutesOf(order?.endTime || "");
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const shiftMinutes = startMin != null && endMin != null ? Math.max(endMin - startMin, 0) : 0;
  const finished = order?.status === "Completed";
  const elapsed = finished
    ? shiftMinutes
    : startMin == null
      ? 0
      : Math.min(Math.max(nowMin - startMin, 0), shiftMinutes || Math.max(nowMin - startMin, 0));
  const remaining = finished ? 0 : shiftMinutes ? Math.max(shiftMinutes - elapsed, 0) : 0;

  return (
    <div className="cf-page cf-sheet-page cf-prod">
      <section className="cf-order">
        <div className="cf-order-main">
          <p>Production order</p>
          <div className="cf-order-fields">
            <div>
              <span>Product</span>
              <SheetSelect
                value={order?.product || ""}
                placeholder="Product"
                options={products.map((item) => ({ value: item, label: shortProduct(item) }))}
                onChange={(product) => choose(batches.filter((row) => row.product === product))}
              />
            </div>
            <div>
              <span>Quantity (MT)</span>
              <SheetSelect
                value={order?.qtyMt || ""}
                placeholder="Quantity"
                options={quantities.map((item) => ({ value: item, label: item }))}
                onChange={(qtyMt) => choose(batches.filter((row) => row.qtyMt === qtyMt))}
              />
            </div>
            <div>
              <span>Batch</span>
              <SheetSelect
                value={order?.batchNo || ""}
                placeholder="Batch"
                options={sortBatches(batches).map((row) => ({ value: row.batchNo, label: row.batchNo }))}
                onChange={(batchNo) => choose(batches.filter((row) => row.batchNo === batchNo))}
              />
            </div>
            <div>
              <span>Status</span>
              <SheetSelect
                value={order?.status || ""}
                placeholder="Status"
                options={statuses.map((item) => ({ value: item, label: item }))}
                onChange={(status) => choose(batches.filter((row) => row.status === status))}
              />
            </div>
            <div>
              <span>Start time</span>
              <SheetSelect
                value={order ? `${order.date}|${order.time}` : ""}
                placeholder="Start"
                options={starts}
                onChange={(start) => choose(batches.filter((row) => `${row.date}|${row.time}` === start))}
              />
            </div>
            <div>
              <span>Expected end</span>
              <SheetSelect
                value={order?.endTime || ""}
                placeholder="End"
                options={ends.map((item) => ({ value: item, label: item }))}
                onChange={(endTime) => choose(batches.filter((row) => row.endTime === endTime))}
              />
            </div>
          </div>
        </div>
        <aside className="cf-order-sent">
          <span className="cf-pill cf-pill-note">Sent</span>
          <strong>Grade sent to the mill</strong>
          <p>
            {sent ? `${formatSheetDate(sent.date)} ${sent.time}` : "Waiting for a note"}
          </p>
          <Link to="/production-planning">View details</Link>
        </aside>
      </section>

      <section className="cf-prod-panel">
        <header>
          <h2>Production process flow</h2>
          <p>
            {packedMt} MT packed of {order?.qtyMt || "0"} MT
          </p>
        </header>
        <div className="cf-stage-row">
          <ol className="cf-stages">
            {board.stages.map((step, index) => (
              <li key={step.name}>
                <Link to={step.to} className="cf-stage-link">
                  <MillFigure kind={step.icon} />
                  <strong>
                    {index + 1}. {step.name}
                  </strong>
                </Link>
                <span className={pillClass(step.state)}>{step.state}</span>
                <div className="cf-stage-stats">
                  {step.metrics.map((metric) => (
                    <p key={`${metric.label}-${metric.value}`}>
                      {metric.label ? <span>{metric.label}</span> : null}
                      <b>{metric.value}</b>
                    </p>
                  ))}
                </div>
                <Link to={step.to} className="cf-stage-more">
                  View Details
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="cf-plant">
        <section className="cf-prod-panel">
          <header className="cf-ledger-head">
            <div>
              <h2>Raw material weighing</h2>
              <p>{order ? `Open order ${order.batchNo}` : "Waiting for a batch"}</p>
            </div>
            <Link to="/production/raw-material">View full list</Link>
          </header>
          <WeighBook rows={board.lines} />
        </section>
        <section className="cf-prod-panel">
          <header className="cf-ledger-head">
            <div>
              <h2>Key process parameters</h2>
              <p>Live readings for this order</p>
            </div>
            <Link to="/production/reports">View all</Link>
          </header>
          <ul className="cf-params">
            {params.map((row) => (
              <li key={row.id}>
                <span>{row.name}</span>
                <b>{row.value}</b>
                <em className={pillClass(row.state)}>{row.state}</em>
                <small>{row.range}{row.source ? ` · ${row.source}` : ""}</small>
              </li>
            ))}
          </ul>
          <p className="cf-plan-alert">Latest batch readings stay on the process log. A single Normal card is the latest value, not the whole run.</p>
        </section>
        <div className="cf-plant-side">
          <section className="cf-prod-panel">
            <header>
              <h2>Production progress</h2>
              <p>
                {packedMt} MT of {order?.qtyMt || "0"} MT
              </p>
            </header>
            <div className="cf-progress">
              <div className="cf-progress-ring" style={{ background: `conic-gradient(#9a3412 ${board.progress}%, #f3e6d4 0)` }}>
                <span>
                  <strong>{board.progress}%</strong>
                  of the order
                </span>
              </div>
            </div>
            <ol className="cf-track">
              {board.stages.map((step) => (
                <li key={step.name} className={`is-${step.state.toLowerCase().replace(/\s+/g, "-")}`}>
                  <strong>{step.name}</strong>
                  <em>{step.state}</em>
                </li>
              ))}
            </ol>
          </section>
          <div className="cf-plant-meters">
            <section className="cf-prod-panel">
              <header>
                <h2>Product temperature</h2>
                <p>Pellet machine, die</p>
              </header>
              <TempChart peak={die} />
            </section>
            <section className="cf-prod-panel cf-rate">
              <header>
                <h2>Production rate</h2>
                <p>Target {rate}</p>
              </header>
              <strong>{rate}</strong>
              <p>Batch duration {spanLabel(elapsed)}</p>
              <p>Remaining {spanLabel(remaining)}</p>
            </section>
          </div>
        </div>
      </div>

      <div className="cf-floor cf-floor-lower">
        <section className="cf-prod-panel">
          <header className="cf-ledger-head">
            <div>
              <h2>Current formulation</h2>
              <p>{order ? `Nutrients on ${shortProduct(order.product)}` : "Nutrients on this grade"}</p>
            </div>
            <Link to="/production-planning">View full formulation</Link>
          </header>
          <table className="cf-ledger">
            <thead>
              <tr>
                <th>Nutrient</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {GRADE_NUTRIENTS.map((row) => (
                <tr key={row.nutrient}>
                  <td>{row.nutrient}</td>
                  <td>{row.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="cf-prod-panel">
          <header className="cf-ledger-head">
            <div>
              <h2>Batch history</h2>
              <p>Last five batches</p>
            </div>
            <Link to="/production/batch-history">View all batches</Link>
          </header>
          <BatchBook rows={recentBatches} />
        </section>
        <section className="cf-prod-panel">
          <header className="cf-ledger-head">
            <div>
              <h2>Alerts</h2>
              <p>From the mill floor</p>
            </div>
            <Link to="/production/reports">View all</Link>
          </header>
          <AlertBook rows={recentAlerts} />
        </section>
      </div>
    </div>
  );
}

function Register<T extends Row>({
  kicker,
  title,
  subtitle,
  icon,
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
  extra,
  wide,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
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
  extra?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="cf-page cf-sheet-page cf-prod">
      {extra}
      <section className="cf-sheet">
        <header className="cf-sheet-banner">
          <div className="cf-sheet-title">
            <span className="cf-sheet-icon">{icon}</span>
            <div>
              <p>{kicker}</p>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className="cf-sheet-actions">
            <div className="cf-sheet-stat">
              <span>Entries</span>
              <strong>{rows.length}</strong>
            </div>
            <button type="button" className="cf-sheet-save" onClick={onSave}>
              <Save size={16} strokeWidth={2.4} />
              Save report
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
            <span>Saved reports</span>
            <SheetSelect
              value={savedDates.includes(date) ? date : ""}
              placeholder={savedDates.length ? `Open a saved date… (${savedDates.length})` : "No saved reports yet"}
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

function textCell(value: string, onChange: (value: string) => void, kind: "text" | "number" | "date" | "time" = "text") {
  if (kind === "date") {
    return (
      <td>
        <SheetDatePicker compact value={value} onChange={onChange} />
      </td>
    );
  }
  return (
    <td>
      <input
        className="cf-cell"
        type={kind === "time" ? "time" : "text"}
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

export function BatchHistoryPage() {
  const sheet = useRows(listBatches, saveBatches);
  const query = sheet.search.trim().toLowerCase();
  const rows = sheet.rows.filter((row) => {
    if (row.date !== sheet.date) return false;
    if (!query) return true;
    return [row.batchNo, productLabel(row.product), row.shift, row.status, row.remarks].join(" ").toLowerCase().includes(query);
  });
  const update = (id: string, patch: Partial<BatchRow>) => {
    let blocked = "";
    const next = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...patch };
      if (patch.status === "Completed" && row.status !== "Completed") {
        const gap = reconcileBatch(merged);
        if (!merged.producedMt?.trim()) {
          blocked = "Enter actual produced tonnes before completing the batch.";
          return row;
        }
        if (gap.needsReason && (!merged.reconReason?.trim() || !merged.reconBy?.trim())) {
          blocked = `Planned ${gap.planned.toFixed(2)} MT, produced ${gap.produced.toFixed(2)} MT, packed ${gap.packed.toFixed(2)} MT. Unpacked ${gap.unpacked.toFixed(2)} MT, shortfall ${gap.shortfall.toFixed(2)} MT. Record the reason and who confirmed it. This is not booked as waste automatically.`;
          return row;
        }
      }
      return merged;
    });
    sheet.commit(next);
    if (blocked) sheet.flash(blocked);
  };

  return (
    <Register
      kicker="Production"
      title="BATCH HISTORY"
      subtitle="Completing a batch asks for produced tonnes and a reason when packed or produced tonnes differ from the plan."
      wide
      extra={
        <div className="cf-plan-extra">
          {rows.map((row) => {
            const gap = reconcileBatch(row);
            return (
              <p key={row.id} className={`cf-plan-alert ${gap.needsReason ? "is-bad" : "is-ok"}`}>
                {row.batchNo}: planned {gap.planned.toFixed(2)} MT, produced {gap.produced.toFixed(2)} MT, packed {gap.packed.toFixed(2)} MT, unpacked {gap.unpacked.toFixed(2)} MT, shortfall {gap.shortfall.toFixed(2)} MT.
              </p>
            );
          })}
        </div>
      }
      icon={<Layers size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Search batch, product, shift, status…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onAdd={() =>
        sheet.commit([
          {
            id: nextProdId("BH", sheet.rows),
            date: sheet.date,
            time: "",
            endTime: "",
            batchNo: "",
            product: "",
            shift: "A",
            qtyMt: "",
            bags: "",
            status: "Pending",
            remarks: "",
          },
          ...sheet.rows,
        ])
      }
      empty="No batches yet. Click Add row."
      headers={["Batch", "Order", "Formula", "Shift", "Product", "Planned MT", "Produced MT", "Start date", "Start time", "Expected end", "Status", "Bags", "Reason", "Confirmed by"]}
      render={(row) => (
        <>
          {textCell(row.batchNo, (batchNo) => update(row.id, { batchNo }))}
          {textCell(row.orderNo || "", (orderNo) => update(row.id, { orderNo }))}
          {textCell(row.formulaVersion || "", (formulaVersion) => update(row.id, { formulaVersion }))}
          {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
          <td>
            <SheetSelect
              compact
              value={row.product}
              placeholder="Select"
              options={FEED_PRODUCTS.map((item) => ({ ...item }))}
              onChange={(product) => update(row.id, { product })}
            />
          </td>
          {textCell(row.qtyMt, (qtyMt) => update(row.id, { qtyMt }), "number")}
          {textCell(row.producedMt || "", (producedMt) => update(row.id, { producedMt }), "number")}
          {textCell(row.date, (date) => update(row.id, { date }), "date")}
          {textCell(row.time, (time) => update(row.id, { time }), "time")}
          {textCell(row.endTime, (endTime) => update(row.id, { endTime }), "time")}
          {choiceCell(row.status, BATCH_STATUSES, (status) => update(row.id, { status }))}
          {textCell(row.bags, (bags) => update(row.id, { bags }), "number")}
          {textCell(row.reconReason || "", (reconReason) => update(row.id, { reconReason }))}
          {textCell(row.reconBy || "", (reconBy) => update(row.id, { reconBy }))}
        </>
      )}
    />
  );
}

export function RawMaterialPage() {
  const sheet = useRows(listMaterialIssues, saveMaterialIssues);
  const query = sheet.search.trim().toLowerCase();
  const rows = sheet.rows.filter((row) => {
    if (row.date !== sheet.date) return false;
    if (!query) return true;
    return [row.batchNo, materialLabel(row.material), row.shift, row.source, row.status, row.lotId].join(" ").toLowerCase().includes(query);
  });
  const update = (id: string, patch: Partial<MaterialIssueRow>) => {
    sheet.commit(
      sheet.rows.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...patch, tolerancePct: row.tolerancePct || patch.tolerancePct || "0.5" };
        const line = weighLine(merged);
        return { ...merged, qcStatus: line.qc, status: line.status };
      }),
    );
  };
  const fillFormula = () => {
    const batches = listBatches().filter((row) => row.date === sheet.date);
    const target = batches.find((row) => row.status === "In progress") || batches[0];
    if (!target) {
      sheet.flash("No production batch on this date.");
      return;
    }
    const lines = formulaLines(target.product, target.date, Number(target.qtyMt) || 0);
    if (!lines.length) {
      sheet.flash("No approved formula is effective for this product and date.");
      return;
    }
    const existing = new Set(sheet.rows.filter((row) => row.batchNo === target.batchNo).map((row) => row.material));
    const added = lines
      .filter((line) => !existing.has(line.material))
      .map((line, index) => {
        const draft: MaterialIssueRow = {
          id: nextProdId("RM", sheet.rows) + index,
          date: sheet.date,
          batchNo: target.batchNo,
          shift: target.shift,
          material: line.material,
          requiredKg: line.requiredKg,
          qtyKg: "",
          status: "Pending",
          source: "",
          formulaVersion: line.formulaVersion,
          tolerancePct: "0.5",
        };
        const weighed = weighLine(draft);
        return { ...draft, qcStatus: weighed.qc, status: weighed.status };
      });
    if (!added.length) {
      sheet.flash("This batch already has a line for every formula material.");
      return;
    }
    sheet.commit([...added, ...sheet.rows]);
    sheet.flash(`Added ${added.length} lines from the approved formula. Existing weighments were left as they are.`);
  };

  return (
    <Register
      kicker="Production"
      title="RAW MATERIAL"
      subtitle="Status is calculated from the weighed quantity, a 0.5% tolerance, and the QC lot release. A supervisor exception needs a reason and a name."
      wide
      extra={
        <div className="cf-plan-actions">
          <button type="button" className="cf-btn-ghost" onClick={fillFormula}>Fill missing lines from approved formula</button>
        </div>
      }
      icon={<Package size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Search batch, material, lot, status…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onAdd={() =>
        sheet.commit([
          {
            id: nextProdId("RM", sheet.rows),
            date: sheet.date,
            batchNo: "",
            shift: "A",
            material: "",
            requiredKg: "",
            qtyKg: "",
            status: "Pending",
            source: "",
            tolerancePct: "0.5",
            qcStatus: "Pending",
          },
          ...sheet.rows,
        ])
      }
      empty="No issues yet. Click Add row."
      headers={["Batch", "Formula", "Shift", "Material", "Lot", "Required (kg)", "Weighed (kg)", "Variance", "Tolerance %", "Start", "End", "Weighed by", "Verified by", "Scale", "QC", "Status", "Exception reason", "Exception by", "Issued from", "Date"]}
      render={(row) => {
        const line = weighLine(row);
        return (
        <>
          {textCell(row.batchNo, (batchNo) => update(row.id, { batchNo }))}
          {textCell(row.formulaVersion || "", (formulaVersion) => update(row.id, { formulaVersion }))}
          {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
          <td>
            <SheetSelect
              compact
              value={row.material}
              placeholder="Select"
              options={RAW_MATERIALS.map((item) => ({ ...item }))}
              onChange={(material) => update(row.id, { material })}
            />
          </td>
          {textCell(row.lotId || "", (lotId) => update(row.id, { lotId }))}
          {textCell(row.requiredKg, (requiredKg) => update(row.id, { requiredKg }), "number")}
          {textCell(row.qtyKg, (qtyKg) => update(row.id, { qtyKg }), "number")}
          <td>{row.qtyKg ? `${line.variance > 0 ? "+" : ""}${line.variance.toFixed(0)} kg (${line.variancePct.toFixed(1)}%)` : "—"}</td>
          {textCell(row.tolerancePct || "0.5", (tolerancePct) => update(row.id, { tolerancePct }), "number")}
          {textCell(row.startTime || "", (startTime) => update(row.id, { startTime }), "time")}
          {textCell(row.endTime || "", (endTime) => update(row.id, { endTime }), "time")}
          {textCell(row.weighedBy || "", (weighedBy) => update(row.id, { weighedBy }))}
          {textCell(row.verifiedBy || "", (verifiedBy) => update(row.id, { verifiedBy }))}
          {textCell(row.scaleId || "", (scaleId) => update(row.id, { scaleId }))}
          <td><span className={pillClass(line.qc)}>{line.qc}</span></td>
          <td><span className={pillClass(line.status)}>{line.status}</span></td>
          {textCell(row.exceptionReason || "", (exceptionReason) => update(row.id, { exceptionReason }))}
          {textCell(row.exceptionBy || "", (exceptionBy) => update(row.id, { exceptionBy }))}
          {textCell(row.source, (source) => update(row.id, { source }))}
          {textCell(row.date, (date) => update(row.id, { date }), "date")}
        </>
        );
      }}
    />
  );
}

const REPORT_TABS = [
  ["events", "Event log"],
  ["shift", "Shift report"],
  ["batch", "Batch report"],
  ["downtime", "Downtime"],
  ["log", "Process log"],
] as const;

export function ProductionReportsPage() {
  const [tab, setTab] = useState<(typeof REPORT_TABS)[number][0]>("events");
  const [shift, setShift] = useState("");
  const [batch, setBatch] = useState("");
  const [machine, setMachine] = useState("");
  const [level, setLevel] = useState("");
  const sheet = useRows(listReports, saveReports);
  const query = sheet.search.trim().toLowerCase();
  const rows = sheet.rows.filter((row) => {
    if (row.date !== sheet.date) return false;
    if (shift && row.shift !== shift) return false;
    if (batch && row.batchNo !== batch) return false;
    if (machine && (row.machine || "") !== machine) return false;
    if (level && row.level !== level) return false;
    if (!query) return true;
    return [row.title, row.batchNo, row.shift, row.level, row.note, row.category, row.machine].join(" ").toLowerCase().includes(query);
  });
  const update = (id: string, patch: Partial<ReportRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const filters = (
    <div className="cf-report-bar">
      <div className="cf-report-tabs" role="tablist">
        {REPORT_TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "is-on" : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === "events" ? (
        <div className="cf-report-filters">
          <label>
            Shift
            <SheetSelect
              compact
              value={shift}
              placeholder="All"
              options={[{ value: "", label: "All" }, ...SHIFTS.map((item) => ({ value: item, label: item }))]}
              onChange={setShift}
            />
          </label>
          <label>
            Severity
            <SheetSelect
              compact
              value={level}
              placeholder="All"
              options={[{ value: "", label: "All" }, ...REPORT_LEVELS.map((item) => ({ value: item, label: item }))]}
              onChange={setLevel}
            />
          </label>
          <label>
            Batch
            <input value={batch} placeholder="B-0902" onChange={(event) => setBatch(event.target.value)} />
          </label>
          <label>
            Machine
            <input value={machine} placeholder="Sieve" onChange={(event) => setMachine(event.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  );

  if (tab === "shift") return <ShiftReportSheet extra={filters} />;
  if (tab === "batch") return <BatchReportSheet extra={filters} />;
  if (tab === "downtime") return <DowntimeSheet extra={filters} />;
  if (tab === "log") return <ProcessLogSheet extra={filters} />;

  return (
    <Register
      kicker="Production"
      title="REPORTS"
      subtitle="Floor event log. Shift, batch and downtime reports are the other tabs. A gap is explained there, not booked as waste by itself."
      wide
      extra={filters}
      icon={<FileBarChart size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Search title, batch, shift, level…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onAdd={() =>
        sheet.commit([
          {
            id: nextProdId("RP", sheet.rows),
            date: sheet.date,
            time: "",
            shift: "A",
            level: "Note",
            title: "",
            batchNo: "",
            bags: "",
            note: "",
            category: "Other",
            machine: "",
            ack: "Open",
          },
          ...sheet.rows,
        ])
      }
      empty="No reports yet. Click Add row."
      headers={["Date", "Time", "Shift", "Category", "Level", "Machine", "Title", "Batch No.", "Bags", "Note", "Acknowledgement"]}
      render={(row) => (
        <>
          {textCell(row.date, (date) => update(row.id, { date }), "date")}
          {textCell(row.time, (time) => update(row.id, { time }), "time")}
          {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
          {choiceCell(row.category || "Other", REPORT_CATEGORIES, (category) => update(row.id, { category }))}
          {choiceCell(row.level, REPORT_LEVELS, (level) => update(row.id, { level }))}
          {textCell(row.machine || "", (machine) => update(row.id, { machine }))}
          {textCell(row.title, (title) => update(row.id, { title }))}
          {textCell(row.batchNo, (batchNo) => update(row.id, { batchNo }))}
          {textCell(row.bags, (bags) => update(row.id, { bags }), "number")}
          {textCell(row.note, (note) => update(row.id, { note }))}
          {choiceCell(row.ack || "Open", REPORT_ACK, (ack) => update(row.id, { ack }))}
        </>
      )}
    />
  );
}

function ShiftReportSheet({ extra }: { extra: ReactNode }) {
  const sheet = useRows(listShiftReports, saveShiftReports);
  const rows = sheet.rows.filter((row) => row.date === sheet.date);
  const update = (id: string, patch: Partial<ShiftReportRow>) => sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  return (
    <Register kicker="Production" title="SHIFT REPORT" subtitle="Planned and actual tonnes, packing, consumption, batch times, downtime and work carried to the next shift." wide extra={extra} icon={<FileBarChart size={22} strokeWidth={2.2} />} rows={rows} date={sheet.date} savedDates={sheet.savedDates} onDateChange={sheet.setDate} search={sheet.search} onSearch={sheet.setSearch} placeholder="Search shift…" status={sheet.status} onSave={() => sheet.flash("Sheet saved on this browser.")} onAdd={() => sheet.commit([{ id: nextProdId("SR", sheet.rows), date: sheet.date, shift: "A", plannedMt: "", actualMt: "", packedMt: "", bags: "", consumption: "", batchTimes: "", downtime: "", downtimeReason: "", carryOver: "" }, ...sheet.rows])} empty="No shift report yet." headers={["Date", "Shift", "Planned MT", "Actual MT", "Packed MT", "Bags", "Consumption and variance", "Batch start and end", "Downtime", "Downtime reason", "Carry over"]} render={(row) => (
      <>
        {textCell(row.date, (date) => update(row.id, { date }), "date")}
        {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
        {textCell(row.plannedMt, (plannedMt) => update(row.id, { plannedMt }), "number")}
        {textCell(row.actualMt, (actualMt) => update(row.id, { actualMt }), "number")}
        {textCell(row.packedMt, (packedMt) => update(row.id, { packedMt }), "number")}
        {textCell(row.bags, (bags) => update(row.id, { bags }), "number")}
        {textCell(row.consumption, (consumption) => update(row.id, { consumption }))}
        {textCell(row.batchTimes, (batchTimes) => update(row.id, { batchTimes }))}
        {textCell(row.downtime, (downtime) => update(row.id, { downtime }))}
        {textCell(row.downtimeReason, (downtimeReason) => update(row.id, { downtimeReason }))}
        {textCell(row.carryOver, (carryOver) => update(row.id, { carryOver }))}
      </>
    )} />
  );
}

function BatchReportSheet({ extra }: { extra: ReactNode }) {
  const sheet = useRows(listBatchReports, saveBatchReports);
  const rows = sheet.rows.filter((row) => row.date === sheet.date);
  const update = (id: string, patch: Partial<BatchReportRow>) => sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  return (
    <Register kicker="Production" title="BATCH REPORT" subtitle="Order, approved formula, actual ingredients, parameter deviations, good output, rejects, wastage, QC decision and sign-off." wide extra={extra} icon={<FileBarChart size={22} strokeWidth={2.2} />} rows={rows} date={sheet.date} savedDates={sheet.savedDates} onDateChange={sheet.setDate} search={sheet.search} onSearch={sheet.setSearch} placeholder="Search batch…" status={sheet.status} onSave={() => sheet.flash("Sheet saved on this browser.")} onAdd={() => sheet.commit([{ id: nextProdId("BR", sheet.rows), date: sheet.date, batchNo: "", orderNo: "", formulaVersion: "", ingredients: "", deviations: "", goodMt: "", rejectMt: "", wasteMt: "", qcDecision: "Pending", operator: "", supervisor: "" }, ...sheet.rows])} empty="No batch report yet." headers={["Date", "Batch", "Order", "Formula", "Ingredients used", "Deviations", "Good MT", "Reject MT", "Waste MT", "QC decision", "Operator", "Supervisor"]} render={(row) => (
      <>
        {textCell(row.date, (date) => update(row.id, { date }), "date")}
        {textCell(row.batchNo, (batchNo) => update(row.id, { batchNo }))}
        {textCell(row.orderNo, (orderNo) => update(row.id, { orderNo }))}
        {textCell(row.formulaVersion, (formulaVersion) => update(row.id, { formulaVersion }))}
        {textCell(row.ingredients, (ingredients) => update(row.id, { ingredients }))}
        {textCell(row.deviations, (deviations) => update(row.id, { deviations }))}
        {textCell(row.goodMt, (goodMt) => update(row.id, { goodMt }), "number")}
        {textCell(row.rejectMt, (rejectMt) => update(row.id, { rejectMt }), "number")}
        {textCell(row.wasteMt, (wasteMt) => update(row.id, { wasteMt }), "number")}
        {textCell(row.qcDecision, (qcDecision) => update(row.id, { qcDecision }))}
        {textCell(row.operator, (operator) => update(row.id, { operator }))}
        {textCell(row.supervisor, (supervisor) => update(row.id, { supervisor }))}
      </>
    )} />
  );
}

function DowntimeSheet({ extra }: { extra: ReactNode }) {
  const sheet = useRows(listDowntime, saveDowntime);
  const rows = sheet.rows.filter((row) => row.date === sheet.date);
  const update = (id: string, patch: Partial<DowntimeRow>) => sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  return (
    <Register kicker="Production" title="DOWNTIME" subtitle="Machine or stage, start and end, reason, severity, quantity affected, corrective action, and whether maintenance was requested." wide extra={extra} icon={<FileBarChart size={22} strokeWidth={2.2} />} rows={rows} date={sheet.date} savedDates={sheet.savedDates} onDateChange={sheet.setDate} search={sheet.search} onSearch={sheet.setSearch} placeholder="Search machine…" status={sheet.status} onSave={() => sheet.flash("Sheet saved on this browser.")} onAdd={() => sheet.commit([{ id: nextProdId("DT", sheet.rows), date: sheet.date, shift: "A", machine: "", stage: "Milling", start: "", end: "", reason: "", severity: "Watch", qtyMt: "", action: "", person: "", maintenance: "No" }, ...sheet.rows])} empty="No downtime yet." headers={["Date", "Shift", "Machine", "Stage", "Start", "End", "Reason", "Severity", "Qty affected MT", "Corrective action", "Person", "Maintenance requested"]} render={(row) => (
      <>
        {textCell(row.date, (date) => update(row.id, { date }), "date")}
        {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
        {textCell(row.machine, (machine) => update(row.id, { machine }))}
        {choiceCell(row.stage, PROCESS_STAGES, (stage) => update(row.id, { stage }))}
        {textCell(row.start, (start) => update(row.id, { start }), "time")}
        {textCell(row.end, (end) => update(row.id, { end }), "time")}
        {textCell(row.reason, (reason) => update(row.id, { reason }))}
        {choiceCell(row.severity, REPORT_LEVELS, (severity) => update(row.id, { severity }))}
        {textCell(row.qtyMt, (qtyMt) => update(row.id, { qtyMt }), "number")}
        {textCell(row.action, (action) => update(row.id, { action }))}
        {textCell(row.person, (person) => update(row.id, { person }))}
        {choiceCell(row.maintenance, ["Yes", "No"], (maintenance) => update(row.id, { maintenance }))}
      </>
    )} />
  );
}

function ProcessLogSheet({ extra }: { extra: ReactNode }) {
  const sheet = useRows(listProcessLog, saveProcessLog);
  const rows = sheet.rows.filter((row) => row.date === sheet.date);
  const update = (id: string, patch: Partial<ProcessLogRow>) => {
    sheet.commit(sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...patch };
      return { ...merged, state: paramReading(merged.name, merged.value).state };
    }));
  };
  return (
    <Register kicker="Production" title="PROCESS LOG" subtitle="Time-stamped readings for the batch. One normal reading does not mean the whole run was normal. A Check reading stays open until it is acknowledged." wide extra={extra} icon={<FileBarChart size={22} strokeWidth={2.2} />} rows={rows} date={sheet.date} savedDates={sheet.savedDates} onDateChange={sheet.setDate} search={sheet.search} onSearch={sheet.setSearch} placeholder="Search stage, parameter…" status={sheet.status} onSave={() => sheet.flash("Sheet saved on this browser.")} onAdd={() => sheet.commit([{ id: nextProdId("PLG", sheet.rows), date: sheet.date, time: "", batchNo: "", stage: "Milling", name: "", value: "", state: "Normal", source: "Manual", operator: "", ack: "Open", action: "" }, ...sheet.rows])} empty="No process readings yet." headers={["Date", "Time", "Batch", "Stage", "Parameter", "Reading", "State", "Source", "Operator", "Acknowledgement", "Action"]} render={(row) => (
      <>
        {textCell(row.date, (date) => update(row.id, { date }), "date")}
        {textCell(row.time, (time) => update(row.id, { time }), "time")}
        {textCell(row.batchNo, (batchNo) => update(row.id, { batchNo }))}
        {choiceCell(row.stage, PROCESS_STAGES, (stage) => update(row.id, { stage }))}
        {textCell(row.name, (name) => update(row.id, { name }))}
        {textCell(row.value, (value) => update(row.id, { value }))}
        <td><span className={pillClass(row.state)}>{row.state}</span></td>
        {choiceCell(row.source, READING_SOURCES, (source) => update(row.id, { source }))}
        {textCell(row.operator, (operator) => update(row.id, { operator }))}
        {choiceCell(row.ack || "Open", REPORT_ACK, (ack) => update(row.id, { ack }))}
        {textCell(row.action, (action) => update(row.id, { action }))}
      </>
    )} />
  );
}

