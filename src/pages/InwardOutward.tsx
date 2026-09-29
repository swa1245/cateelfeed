import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileText, Package, Plus, Save, Scale, Search, ShieldCheck, Trash2, Truck, Warehouse } from "lucide-react";
import { SheetDatePicker } from "@/components/SheetDatePicker";
import { SheetSelect } from "@/components/SheetSelect";
import { useAuth } from "@/context/AuthContext";
import {
  COLOUR_OPTIONS,
  DOC_STATUS,
  ENTRY_TYPES,
  FEED_PRODUCTS,
  FOREIGN_OPTIONS,
  INFESTATION_OPTIONS,
  MOISTURE_OPTIONS,
  OUTLETS,
  QC_RELEASE,
  RAW_MATERIALS,
  READING_SOURCES,
  REJECT_REASONS,
  STORAGE_POINTS,
  SUPPLIERS,
  deriveInward,
  deriveOutward,
  duplicateVehicle,
  formatSheetDate,
  inwardOpen,
  inwardStage,
  listInward,
  listOutward,
  materialLabel,
  netKg,
  nextId,
  outwardOpen,
  outwardStage,
  packedKg,
  productLabel,
  saveInward,
  saveOutward,
  sheetDateFromQuery,
  storageForMaterial,
  waitingLong,
  type InwardTicket,
  type OutwardTicket,
} from "@/data/movements";

type Option = { value: string; label: string };

type Column<T> = {
  key: string;
  label: string;
  min: number;
  read?: boolean | ((row: T) => boolean);
  kind?: "text" | "number" | "date" | "time" | "select" | "button";
  options?: Option[];
  get: (row: T) => string;
  onPress?: (row: T) => void;
};

function isRead<T>(column: Column<T>, row: T) {
  return typeof column.read === "function" ? column.read(row) : Boolean(column.read);
}

function asOptions(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: value }));
}

function useRegister<T extends { id: string; date: string }>(
  load: () => T[],
  persist: (rows: T[]) => void,
) {
  const [rows, setRows] = useState(load);
  const [date, setDate] = useState(sheetDateFromQuery);
  const [search, setSearch] = useState("");
  const [material, setMaterial] = useState("");
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

  return { rows, date, setDate, search, setSearch, material, setMaterial, status, flash, commit, savedDates };
}

function DataSheet<T extends { id: string }>({
  kicker,
  title,
  subtitle,
  icon,
  rows,
  columns,
  empty,
  date,
  savedDates,
  onDateChange,
  search,
  onSearch,
  searchPlaceholder,
  materialLabelText,
  material,
  materialOptions,
  onMaterialChange,
  onAdd,
  onRemove,
  onChange,
  onSave,
  status,
  extraStat,
  extra,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  rows: T[];
  columns: Column<T>[];
  empty: string;
  date: string;
  savedDates: string[];
  onDateChange: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  materialLabelText?: string;
  material?: string;
  materialOptions?: Option[];
  onMaterialChange?: (value: string) => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onChange: (id: string, key: string, value: string) => void;
  onSave: () => void;
  status: string;
  extraStat?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="cf-page cf-sheet-page">
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
            {extraStat ? (
              <div className="cf-sheet-stat">
                <span>{extraStat.split("|")[0]}</span>
                <strong>{extraStat.split("|")[1]}</strong>
              </div>
            ) : null}
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
          {materialLabelText && materialOptions && onMaterialChange ? (
            <label>
              <span>{materialLabelText}</span>
              <SheetSelect
                value={material || ""}
                placeholder="All"
                options={[{ value: "", label: "All" }, ...materialOptions]}
                onChange={onMaterialChange}
              />
            </label>
          ) : null}
          <label className="cf-sheet-search">
            <span>Search</span>
            <span className="cf-sheet-search-box">
              <Search size={15} />
              <input
                value={search}
                placeholder={searchPlaceholder}
                onChange={(event) => onSearch(event.target.value)}
              />
            </span>
          </label>
          {onAdd ? (
            <button type="button" className="cf-sheet-add" onClick={onAdd}>
              <Plus size={16} strokeWidth={2.4} />
              Add row
            </button>
          ) : null}
        </div>

        <div className="cf-sheet-scroll">
          <table className="cf-sheet-table is-wide">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                {onRemove ? <th className="cf-sheet-del" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="cf-sheet-empty" colSpan={columns.length + (onRemove ? 1 : 0)}>
                    {empty}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => {
                      const value = column.get(row);
                      const locked = isRead(column, row);
                      return (
                        <td key={column.key}>
                          {column.kind === "button" ? (
                            <button
                              type="button"
                              className="cf-cell-btn"
                              disabled={locked || value === "Issued"}
                              onClick={() => column.onPress?.(row)}
                            >
                              {value || "Issue"}
                            </button>
                          ) : locked ? (
                            <input className="cf-cell cf-cell-read" value={value || "—"} readOnly tabIndex={-1} />
                          ) : column.kind === "date" ? (
                            <SheetDatePicker
                              compact
                              value={value}
                              onChange={(next) => onChange(row.id, column.key, next)}
                            />
                          ) : column.kind === "select" ? (
                            <SheetSelect
                              compact
                              value={value}
                              placeholder="Select"
                              options={column.options || []}
                              onChange={(next) => onChange(row.id, column.key, next)}
                            />
                          ) : (
                            <input
                              className="cf-cell"
                              type={column.kind === "time" ? "time" : "text"}
                              inputMode={column.kind === "number" ? "decimal" : undefined}
                              value={value}
                              onChange={(event) => onChange(row.id, column.key, event.target.value)}
                            />
                          )}
                        </td>
                      );
                    })}
                    {onRemove ? (
                      <td className="cf-sheet-del">
                        <button type="button" aria-label="Delete row" onClick={() => onRemove(row.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {extra}
      </section>
    </div>
  );
}

function blankInward(id: string, date: string): InwardTicket {
  return deriveInward({
    id,
    createdAt: new Date().toISOString(),
    date,
    time: "",
    vehicleNo: "",
    supplier: "",
    material: "",
    poChallan: "",
    driver: "",
    bagCount: "",
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
  });
}

function blankOutward(id: string, date: string): OutwardTicket {
  return deriveOutward({
    id,
    createdAt: new Date().toISOString(),
    date,
    time: "",
    product: "",
    batchNo: "",
    bagWeightKg: "50",
    bagCount: "",
    godown: "Finished godown",
    customer: "",
    salesOrder: "",
    emptyKg: "",
    loadedKg: "",
    invoiceNo: "",
    challanNo: "",
    gatePassNo: "",
    status: "bagged",
    qcRelease: "Pending",
  });
}

function matches(row: { date: string }, date: string, search: string, fields: string[]) {
  if (row.date !== date) return false;
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return fields.join(" ").toLowerCase().includes(query);
}

export function InwardOverviewPage() {
  const inward = listInward();
  const outward = listOutward();
  const [date, setDate] = useState(() => {
    const query = new URLSearchParams(window.location.search).get("date") || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(query) ? query : "";
  });
  const [direction, setDirection] = useState("");
  const [stage, setStage] = useState("");
  const [party, setParty] = useState("");
  const [vehicle, setVehicle] = useState("");
  const inwardStageOf = (row: InwardTicket) => inwardStage(row);
  const cards = [
    { label: "Trucks at gate", hint: "Entered, not yet weighed", value: inward.filter((row) => inwardStageOf(row) === "Awaiting weighment").length },
    { label: "Awaiting QC", hint: "Weighed, waiting for a gate decision", value: inward.filter((row) => inwardStageOf(row) === "Awaiting QC").length },
    { label: "Accepted", hint: "Accepted, waiting to unload and GRN", value: inward.filter((row) => ["Accepted", "Awaiting unloading"].includes(inwardStageOf(row))).length },
    { label: "In stock", hint: "Received into the warehouse", value: inward.filter((row) => ["Received", "Closed"].includes(inwardStageOf(row))).length },
    { label: "Rejected", hint: "Gate QC rejected, not received", value: inward.filter((row) => inwardStageOf(row) === "Rejected").length },
    { label: "Ready to dispatch", hint: "Picked, waiting to weigh or issue", value: outward.filter((row) => ["Awaiting weighment", "Documents pending"].includes(outwardStage(row))).length },
  ];
  const movements = [
    ...inward.map((row) => ({
      id: row.id,
      vehicle: row.vehicleNo || "—",
      direction: "Inward",
      party: row.supplier || "—",
      item: materialLabel(row.material),
      stage: inwardStageOf(row),
      at: `${formatSheetDate(row.date)} ${row.time || row.grossAt || row.inspectedAt || ""}`.trim(),
      operator: row.gateOperator || row.weighOperator || row.inspector || row.receiver || "—",
      date: row.date,
      stalled: ["Awaiting weighment", "Awaiting QC"].includes(inwardStageOf(row)) && waitingLong(row.date, row.time),
      href: `${inwardOpen(inwardStageOf(row))}?date=${row.date}`,
    })),
    ...outward.map((row) => ({
      id: row.id,
      vehicle: row.vehicleNo || "—",
      direction: "Outward",
      party: row.customer || "—",
      item: productLabel(row.product),
      stage: outwardStage(row),
      at: `${formatSheetDate(row.date)} ${row.time || row.weighedAt || row.exitAt || ""}`.trim(),
      operator: row.pickedBy || row.weighOperator || row.issuedBy || "—",
      date: row.date,
      stalled: outwardStage(row) === "Awaiting weighment" && waitingLong(row.date, row.pickedAt || row.time),
      href: `${outwardOpen(outwardStage(row))}?date=${row.date}`,
    })),
  ].filter((row) => {
    if (date && row.date !== date) return false;
    if (direction && row.direction !== direction) return false;
    if (stage && row.stage !== stage) return false;
    if (party && !row.party.toLowerCase().includes(party.trim().toLowerCase())) return false;
    if (vehicle && row.vehicle !== "—" && !row.vehicle.toLowerCase().includes(vehicle.trim().toLowerCase())) return false;
    if (vehicle && row.vehicle === "—") return false;
    return true;
  });

  return (
    <div className="cf-page cf-io-page">
      <header className="cf-page-head">
        <p className="cf-io-kicker">Inward & Outward</p>
        <h1>Plant movement</h1>
        <p>Each counter is one stage of a ticket. A truck is not counted again after it moves on.</p>
      </header>
      <div className="cf-io-stats">
        {cards.map((card) => (
          <article key={card.label} className="cf-io-stat">
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <em>{card.hint}</em>
          </article>
        ))}
      </div>
      <section className="cf-page-card">
        <h2>Live movement</h2>
        <div className="cf-report-filters">
          <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>
            Direction
            <select value={direction} onChange={(event) => setDirection(event.target.value)}>
              <option value="">All</option>
              <option>Inward</option>
              <option>Outward</option>
            </select>
          </label>
          <label>Status<input value={stage} placeholder="Awaiting QC" onChange={(event) => setStage(event.target.value)} /></label>
          <label>Party<input value={party} placeholder="Supplier or outlet" onChange={(event) => setParty(event.target.value)} /></label>
          <label>Vehicle<input value={vehicle} placeholder="MH-10" onChange={(event) => setVehicle(event.target.value)} /></label>
        </div>
        <div className="cf-sheet-scroll">
          <table className="cf-sheet-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Vehicle</th>
                <th>Direction</th>
                <th>Party</th>
                <th>Material / product</th>
                <th>Stage</th>
                <th>At stage</th>
                <th>Operator</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td className="cf-sheet-empty" colSpan={9}>No tickets for this filter.</td></tr>
              ) : movements.map((row) => (
                <tr key={`${row.direction}-${row.id}`} className={row.stalled ? "is-bad" : undefined}>
                  <td>{row.id}</td>
                  <td>{row.vehicle}</td>
                  <td>{row.direction}</td>
                  <td>{row.party}</td>
                  <td>{row.item}</td>
                  <td>{row.stage}{row.stalled ? " · waiting" : ""}</td>
                  <td>{row.at}</td>
                  <td>{row.operator}</td>
                  <td><Link to={row.href}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function GateEntryPage() {
  const { user } = useAuth();
  const sheet = useRegister(listInward, saveInward);
  const rows = sheet.rows.filter(
    (row) =>
      matches(row, sheet.date, sheet.search, [row.vehicleNo, row.supplier, materialLabel(row.material), row.poChallan]) &&
      (!sheet.material || row.material === sheet.material),
  );

  const update = (id: string, key: string, value: string) => {
    if (key === "vehicleNo" && duplicateVehicle(sheet.rows, value, id)) {
      sheet.flash("This vehicle already has an open ticket. A later trip can start only after that ticket is received or rejected.");
      return;
    }
    sheet.commit(sheet.rows.map((row) => (row.id === id ? deriveInward({ ...row, [key]: value, gateOperator: row.gateOperator || user?.name || "" }) : row)));
  };

  return (
    <DataSheet
      kicker="Inward"
      title="GATE ENTRY"
      subtitle="One inward ticket follows the truck. A repeat trip gets a new ticket after the earlier one is received or rejected."
      icon={<Truck size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search vehicle, supplier, material…"
      materialLabelText="Material"
      material={sheet.material}
      materialOptions={RAW_MATERIALS.map((item) => ({ ...item }))}
      onMaterialChange={sheet.setMaterial}
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onAdd={() => {
        const row = blankInward(nextId("IN", sheet.rows), sheet.date);
        if (sheet.material) row.material = sheet.material;
        sheet.commit([row, ...sheet.rows]);
      }}
      onRemove={(id) => sheet.commit(sheet.rows.filter((row) => row.id !== id))}
      onChange={update}
      empty="No entries yet. Click Add row."
      columns={[
        { key: "id", label: "Ticket", min: 110, read: true, get: (row) => row.id },
        { key: "stage", label: "Status", min: 150, read: true, get: (row) => inwardStage(row) },
        { key: "entryType", label: "Entry type", min: 130, kind: "select", options: asOptions(ENTRY_TYPES), get: (row) => row.entryType || "Purchase" },
        { key: "date", label: "Date", min: 148, kind: "date", get: (row) => row.date },
        { key: "time", label: "Time", min: 120, kind: "time", get: (row) => row.time },
        { key: "vehicleNo", label: "Vehicle No.", min: 150, get: (row) => row.vehicleNo },
        { key: "supplier", label: "Supplier", min: 180, kind: "select", options: asOptions(SUPPLIERS), get: (row) => row.supplier },
        { key: "material", label: "Material", min: 150, kind: "select", options: RAW_MATERIALS.map((item) => ({ ...item })), get: (row) => row.material },
        { key: "poChallan", label: "PO / Challan", min: 140, get: (row) => row.poChallan },
        { key: "driver", label: "Driver", min: 140, get: (row) => row.driver },
        { key: "bagCount", label: "Bags", min: 90, kind: "number", get: (row) => row.bagCount },
        { key: "gateOperator", label: "Gate operator", min: 140, get: (row) => row.gateOperator || "" },
      ]}
    />
  );
}

export function WeighbridgePage() {
  const { user } = useAuth();
  const sheet = useRegister(listInward, saveInward);
  const rows = sheet.rows.filter((row) =>
    matches(row, sheet.date, sheet.search, [row.vehicleNo, row.supplier, materialLabel(row.material)]),
  );

  return (
    <DataSheet
      kicker="Inward"
      title="WEIGHBRIDGE"
      subtitle="Gross weight stays on this ticket. A correction keeps the first reading and needs a reason and an authorizer."
      icon={<Scale size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search vehicle, supplier…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onChange={(id, key, value) => {
        let blocked = "";
        const next = sheet.rows.map((row) => {
          if (row.id !== id) return row;
          if (key === "grossKg" && row.grossKg && value !== row.grossKg && (!row.weighReason?.trim() || !row.weighAuth?.trim())) {
            blocked = "The first gross reading is kept. Enter the correction reason and who authorized it, then change the weight.";
            return row;
          }
          const revised = key === "grossKg" && row.grossKg && value !== row.grossKg
            ? { originalGross: row.originalGross || row.grossKg, grossAt: row.time }
            : {};
          return deriveInward({ ...row, ...revised, [key]: value, weighOperator: row.weighOperator || user?.name || "", weighbridgeId: row.weighbridgeId || "WB-1" });
        });
        sheet.commit(next);
        if (blocked) sheet.flash(blocked);
      }}
      empty="No gate entries yet. Add them in GATE ENTRY."
      extraStat={`Gross kg|${rows.reduce((sum, row) => sum + (Number(row.grossKg) || 0), 0) || 0}`}
      columns={[
        { key: "id", label: "Ticket", min: 110, read: true, get: (row) => row.id },
        { key: "vehicleNo", label: "Vehicle No.", min: 140, read: true, get: (row) => row.vehicleNo },
        { key: "material", label: "Material", min: 130, read: true, get: (row) => materialLabel(row.material) },
        { key: "weighbridgeId", label: "Scale", min: 90, get: (row) => row.weighbridgeId || "WB-1" },
        { key: "grossKg", label: "Gross kg", min: 110, kind: "number", get: (row) => row.grossKg },
        { key: "originalGross", label: "First reading", min: 120, read: true, get: (row) => row.originalGross || "—" },
        { key: "grossSource", label: "Source", min: 110, kind: "select", options: asOptions(READING_SOURCES), get: (row) => row.grossSource || "Scale" },
        { key: "weighOperator", label: "Operator", min: 130, get: (row) => row.weighOperator || "" },
        { key: "weighReason", label: "Correction reason", min: 160, get: (row) => row.weighReason || "" },
        { key: "weighAuth", label: "Authorized by", min: 140, get: (row) => row.weighAuth || "" },
      ]}
    />
  );
}

export function QualityCheckPage() {
  const { user } = useAuth();
  const sheet = useRegister(listInward, saveInward);
  const rows = sheet.rows.filter(
    (row) =>
      Boolean(row.grossKg) &&
      matches(row, sheet.date, sheet.search, [row.vehicleNo, materialLabel(row.material), row.poChallan, row.qcNote]),
  );

  return (
    <DataSheet
      kicker="Inward"
      title="QUALITY CHECK"
      subtitle="Gate accept lets the truck unload. It does not release the material for production. That stays with the lab QC module. A rejected load gets no GRN."
      icon={<ShieldCheck size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search vehicle, material, remark…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onChange={(id, key, value) => {
        const current = sheet.rows.find((row) => row.id === id);
        const nextDecision = key === "decision" ? value : current?.decision;
        const nextReason = key === "rejectReason" ? value : current?.rejectReason;
        if (nextDecision === "rejected" && !nextReason?.trim() && key === "decision") {
          sheet.flash("Choose a rejection reason. The truck can then leave, and no GRN is created.");
        }
        sheet.commit(sheet.rows.map((row) => (row.id === id ? deriveInward({ ...row, [key]: value, inspector: row.inspector || user?.name || "", inspectedAt: row.inspectedAt || row.time }) : row)));
      }}
      empty="No gross weight yet. Enter it on WEIGHBRIDGE."
      extraStat={`Accepted|${rows.filter((row) => row.decision === "accepted").length}`}
      columns={[
        { key: "id", label: "Ticket", min: 110, read: true, get: (row) => row.id },
        { key: "vehicleNo", label: "Vehicle No.", min: 130, read: true, get: (row) => row.vehicleNo },
        { key: "material", label: "Material", min: 120, read: true, get: (row) => materialLabel(row.material) },
        { key: "colour", label: "Colour", min: 130, kind: "select", options: asOptions(COLOUR_OPTIONS), get: (row) => row.colour },
        { key: "moisture", label: "Moisture", min: 130, kind: "select", options: asOptions(MOISTURE_OPTIONS), get: (row) => row.moisture },
        { key: "foreignMatter", label: "Foreign matter", min: 140, kind: "select", options: asOptions(FOREIGN_OPTIONS), get: (row) => row.foreignMatter },
        { key: "infestation", label: "Infestation", min: 130, kind: "select", options: asOptions(INFESTATION_OPTIONS), get: (row) => row.infestation },
        {
          key: "decision",
          label: "Decision",
          min: 130,
          kind: "select",
          options: [
            { value: "accepted", label: "Accept" },
            { value: "rejected", label: "Reject" },
          ],
          get: (row) => row.decision,
        },
        { key: "rejectReason", label: "Reject reason", min: 140, kind: "select", options: asOptions(REJECT_REASONS), get: (row) => row.rejectReason || "" },
        { key: "inspector", label: "Inspector", min: 120, get: (row) => row.inspector || "" },
        { key: "leftAt", label: "Left gate", min: 110, kind: "time", get: (row) => row.leftAt || "" },
        { key: "overrideBy", label: "Override by", min: 130, get: (row) => row.overrideBy || "" },
        { key: "qcNote", label: "Remarks", min: 160, get: (row) => row.qcNote },
      ]}
    />
  );
}

export function GoodsReceiptPage() {
  const { user } = useAuth();
  const sheet = useRegister(listInward, saveInward);
  const rows = sheet.rows.filter(
    (row) =>
      (row.decision === "accepted" || row.decision === "rejected") &&
      matches(row, sheet.date, sheet.search, [row.vehicleNo, materialLabel(row.material), row.grnNo]),
  );

  return (
    <DataSheet
      kicker="Inward"
      title="GOODS RECEIPT"
      subtitle="Net kg is gross minus tare. Tare must be lower than gross. A rejected load cannot be received. One PO can have more than one GRN."
      icon={<Warehouse size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search vehicle, GRN, material…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onChange={(id, key, value) => {
        let blocked = "";
        const next = sheet.rows.map((row) => {
          if (row.id !== id || row.decision === "rejected") return row;
          if (key === "tareKg" && row.grossKg && Number(value) >= Number(row.grossKg)) {
            blocked = "Tare must be lower than gross, so net weight stays above zero.";
            return row;
          }
          return deriveInward({
            ...row,
            [key]: value,
            storage: key === "storage" ? value : row.storage || storageForMaterial(row.material),
            receiver: row.receiver || user?.name || "",
          });
        });
        sheet.commit(next);
        if (blocked) sheet.flash(blocked);
      }}
      empty="No quality decision yet. Accept or reject the load on QUALITY CHECK."
      extraStat={`In stock|${rows.filter((row) => row.status === "received").length}`}
      columns={[
        { key: "vehicleNo", label: "Vehicle No.", min: 130, read: true, get: (row) => row.vehicleNo },
        { key: "material", label: "Material", min: 120, read: true, get: (row) => materialLabel(row.material) },
        { key: "grossKg", label: "Gross kg", min: 100, read: true, get: (row) => row.grossKg },
        { key: "decision", label: "QC", min: 110, read: true, get: (row) => (row.decision === "accepted" ? "Accept" : "Reject") },
        {
          key: "tareKg",
          label: "Tare Wt. (kg)",
          min: 120,
          kind: "number",
          read: (row) => row.decision === "rejected",
          get: (row) => row.tareKg,
        },
        {
          key: "storage",
          label: "Unload to",
          min: 170,
          kind: "select",
          options: STORAGE_POINTS.map((item) => ({ ...item })),
          read: (row) => row.decision === "rejected",
          get: (row) => row.storage || (row.decision === "accepted" ? storageForMaterial(row.material) : ""),
        },
        { key: "net", label: "Net kg", min: 100, read: true, get: (row) => (row.decision === "rejected" ? "—" : netKg(row.grossKg, row.tareKg)) },
        { key: "poQty", label: "PO kg", min: 90, kind: "number", read: (row) => row.decision === "rejected", get: (row) => row.poQty || "" },
        { key: "shortage", label: "Short / excess", min: 120, read: true, get: (row) => {
          const net = Number(netKg(row.grossKg, row.tareKg));
          const po = Number(row.poQty);
          if (!row.poQty || !Number.isFinite(net) || !Number.isFinite(po)) return "—";
          const gap = Math.round((net - po) * 10) / 10;
          return gap === 0 ? "0" : `${gap > 0 ? "+" : ""}${gap}`;
        } },
        { key: "lotId", label: "Lot", min: 110, read: (row) => row.decision === "rejected", get: (row) => row.lotId || "" },
        { key: "qcRelease", label: "Lab release", min: 120, kind: "select", options: asOptions(QC_RELEASE), read: (row) => row.decision === "rejected", get: (row) => row.qcRelease || "Pending" },
        { key: "receiver", label: "Receiver", min: 120, read: (row) => row.decision === "rejected", get: (row) => row.receiver || "" },
        { key: "grnNo", label: "GRN No.", min: 110, read: true, get: (row) => (row.decision === "rejected" ? "Not stored" : row.grnNo) },
      ]}
    />
  );
}

export function BaggingPage() {
  const { user } = useAuth();
  const sheet = useRegister(listOutward, saveOutward);
  const rows = sheet.rows.filter((row) =>
    matches(row, sheet.date, sheet.search, [row.batchNo, productLabel(row.product), row.bagCount]),
  );

  return (
    <DataSheet
      kicker="Outward"
      title="BAGGING"
      subtitle="Packed kg is bag weight times bag count. Only a released batch can be picked for dispatch."
      icon={<Package size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search batch, product…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onAdd={() => sheet.commit([blankOutward(nextId("BG", sheet.rows), sheet.date), ...sheet.rows])}
      onRemove={(id) => sheet.commit(sheet.rows.filter((row) => row.id !== id))}
      onChange={(id, key, value) =>
        sheet.commit(sheet.rows.map((row) => (row.id === id ? deriveOutward({ ...row, [key]: value }) : row)))
      }
      empty="No entries yet. Click Add row."
      columns={[
        { key: "id", label: "Ticket", min: 110, read: true, get: (row) => row.id },
        { key: "date", label: "Date", min: 148, kind: "date", get: (row) => row.date },
        { key: "time", label: "Time", min: 120, kind: "time", get: (row) => row.time },
        { key: "shift", label: "Shift", min: 80, get: (row) => row.shift || "" },
        { key: "product", label: "Product", min: 200, kind: "select", options: FEED_PRODUCTS.map((item) => ({ ...item })), get: (row) => row.product },
        { key: "batchNo", label: "Batch No.", min: 120, get: (row) => row.batchNo },
        { key: "orderNo", label: "Order", min: 110, get: (row) => row.orderNo || "" },
        { key: "line", label: "Line", min: 110, get: (row) => row.line || "" },
        { key: "bagType", label: "Bag type", min: 110, get: (row) => row.bagType || "50 kg" },
        { key: "bagWeightKg", label: "Bag kg", min: 90, kind: "number", get: (row) => row.bagWeightKg },
        { key: "bagCount", label: "Bags", min: 90, kind: "number", get: (row) => row.bagCount },
        { key: "rejectedBags", label: "Damaged", min: 90, kind: "number", get: (row) => row.rejectedBags || "" },
        { key: "packed", label: "Packed kg", min: 110, read: true, get: (row) => packedKg(row.bagWeightKg, row.bagCount) },
        { key: "godown", label: "Godown", min: 140, get: (row) => row.godown },
        { key: "qcRelease", label: "QC release", min: 120, kind: "select", options: asOptions(QC_RELEASE), get: (row) => row.qcRelease || "Pending" },
      ]}
    />
  );
}

export function DispatchPage() {
  const { user } = useAuth();
  const sheet = useRegister(listOutward, saveOutward);
  const rows = sheet.rows.filter(
    (row) =>
      Boolean(row.product && row.batchNo && row.bagCount) &&
      matches(row, sheet.date, sheet.search, [row.batchNo, productLabel(row.product), row.customer, row.salesOrder]),
  );

  return (
    <DataSheet
      kicker="Outward"
      title="DISPATCH PICK"
      subtitle="Only a released batch can be allocated. If fewer bags are available than packed, the rest stays unfulfilled."
      icon={<Package size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search batch, outlet, sales order…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onChange={(id, key, value) => {
        let blocked = "";
        const next = sheet.rows.map((row) => {
          if (row.id !== id) return row;
          if ((key === "customer" || key === "salesOrder") && (row.qcRelease || "Released") !== "Released") {
            blocked = "This batch is not released. Hold and rejected stock cannot be picked.";
            return row;
          }
          return deriveOutward({ ...row, [key]: value, pickedBy: row.pickedBy || user?.name || "" });
        });
        sheet.commit(next);
        if (blocked) sheet.flash(blocked);
      }}
      empty="No bagged batches yet. Add them in BAGGING."
      columns={[
        { key: "id", label: "Ticket", min: 110, read: true, get: (row) => row.id },
        { key: "batchNo", label: "Batch No.", min: 120, read: true, get: (row) => row.batchNo },
        { key: "product", label: "Product", min: 180, read: true, get: (row) => productLabel(row.product) },
        { key: "qcRelease", label: "QC release", min: 110, read: true, get: (row) => row.qcRelease || "Released" },
        { key: "bagCount", label: "Packed bags", min: 110, read: true, get: (row) => row.bagCount },
        { key: "availableBags", label: "Available", min: 100, kind: "number", get: (row) => row.availableBags || row.bagCount },
        { key: "gap", label: "Unfulfilled", min: 110, read: true, get: (row) => {
          const packed = Number(row.bagCount) || 0;
          const available = Number(row.availableBags || row.bagCount) || 0;
          return String(Math.max(0, packed - available));
        } },
        { key: "customer", label: "Outlet", min: 180, kind: "select", options: asOptions(OUTLETS), get: (row) => row.customer },
        { key: "salesOrder", label: "Sales order", min: 130, get: (row) => row.salesOrder },
        { key: "pickedBy", label: "Picked by", min: 120, get: (row) => row.pickedBy || "" },
      ]}
    />
  );
}

export function DispatchWeighPage() {
  const { user } = useAuth();
  const sheet = useRegister(listOutward, saveOutward);
  const rows = sheet.rows.filter(
    (row) =>
      Boolean(row.customer && row.salesOrder) &&
      matches(row, sheet.date, sheet.search, [row.salesOrder, row.customer, productLabel(row.product)]),
  );

  return (
    <DataSheet
      kicker="Outward"
      title="DISPATCH WEIGHMENT"
      subtitle={`${user?.organizationName || "CatelFeed"} · Net dispatch is loaded weight minus empty weight`}
      icon={<Scale size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search sales order, outlet…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onChange={(id, key, value) =>
        sheet.commit(sheet.rows.map((row) => (row.id === id ? deriveOutward({ ...row, [key]: value }) : row)))
      }
      empty="No picked orders yet. Confirm the outlet and sales order on DISPATCH PICK."
      columns={[
        { key: "id", label: "Ticket", min: 110, read: true, get: (row) => row.id },
        { key: "vehicleNo", label: "Vehicle", min: 130, get: (row) => row.vehicleNo || "" },
        { key: "salesOrder", label: "Sales order", min: 120, read: true, get: (row) => row.salesOrder },
        { key: "customer", label: "Outlet", min: 160, read: true, get: (row) => row.customer },
        { key: "product", label: "Product", min: 160, read: true, get: (row) => productLabel(row.product) },
        { key: "bagCount", label: "Bags", min: 80, read: true, get: (row) => row.bagCount },
        { key: "emptyKg", label: "Empty kg", min: 110, kind: "number", get: (row) => row.emptyKg },
        { key: "loadedKg", label: "Loaded kg", min: 110, kind: "number", get: (row) => row.loadedKg },
        { key: "net", label: "Net kg", min: 90, read: true, get: (row) => netKg(row.loadedKg, row.emptyKg) },
        { key: "variance", label: "Vs packed kg", min: 110, read: true, get: (row) => {
          const net = Number(netKg(row.loadedKg, row.emptyKg));
          const packed = Number(packedKg(row.bagWeightKg, row.bagCount));
          if (!Number.isFinite(net) || !packed) return "—";
          const gap = Math.round(net - packed);
          return gap === 0 ? "0" : `${gap > 0 ? "+" : ""}${gap}`;
        } },
        { key: "weighbridgeId", label: "Scale", min: 90, get: (row) => row.weighbridgeId || "WB-1" },
        { key: "weighSource", label: "Source", min: 100, kind: "select", options: asOptions(READING_SOURCES), get: (row) => row.weighSource || "Scale" },
        { key: "reweighReason", label: "Reweigh reason", min: 140, get: (row) => row.reweighReason || "" },
      ]}
    />
  );
}

export function DocumentsPage() {
  const { user } = useAuth();
  const sheet = useRegister(listOutward, saveOutward);
  const rows = sheet.rows.filter(
    (row) =>
      Boolean(netKg(row.loadedKg, row.emptyKg)) &&
      matches(row, sheet.date, sheet.search, [row.salesOrder, row.invoiceNo, row.gatePassNo, productLabel(row.product)]),
  );

  const issue = (row: OutwardTicket) => {
    if (row.invoiceNo || row.status === "dispatched") {
      sheet.flash("This dispatch is already issued. Stock is not reduced again.");
      return;
    }
    if ((row.qcRelease || "Released") !== "Released") {
      sheet.flash("Issue is blocked until the batch is QC released.");
      return;
    }
    if (!netKg(row.loadedKg, row.emptyKg)) {
      sheet.flash("Finish the weighment before issuing documents.");
      return;
    }
    const seq = row.id.split("-")[1] || "0000";
    sheet.commit(
      sheet.rows.map((item) =>
        item.id === row.id
          ? deriveOutward({
              ...item,
              invoiceNo: `INV-${seq}`,
              challanNo: `DC-${seq}`,
              gatePassNo: `GP-${seq}`,
              issuedBy: user?.name || "",
              docStatus: "Issued",
            })
          : item,
      ),
    );
    sheet.flash("Invoice, challan, and gate pass issued once. Finished stock is reduced once.");
  };

  return (
    <DataSheet
      kicker="Outward"
      title="INVOICE & GATE PASS"
      subtitle="Issue creates the invoice, challan, and gate pass once. A second click does not reduce stock again. Record the exit time after the truck leaves."
      icon={<FileText size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      searchPlaceholder="Search invoice, gate pass, order…"
      status={sheet.status}
      onSave={() => sheet.flash("Sheet saved on this browser.")}
      onChange={(id, key, value) => {
        if (key !== "exitAt" && key !== "cancelReason") return;
        sheet.commit(sheet.rows.map((row) => (row.id === id ? deriveOutward({ ...row, [key]: value, docStatus: key === "cancelReason" && value ? "Cancelled" : row.docStatus }) : row)));
      }}
      empty="No weighed dispatch yet. Enter empty and loaded weight on DISPATCH WEIGHMENT."
      extra={
        <p className="cf-sheet-foot">
          Open a weighed row and use Issue on that line. Stock drops when the gate pass is created.
        </p>
      }
      columns={[
        { key: "salesOrder", label: "Sales order", min: 120, read: true, get: (row) => row.salesOrder },
        { key: "customer", label: "Outlet", min: 150, read: true, get: (row) => row.customer },
        { key: "product", label: "Product", min: 160, read: true, get: (row) => productLabel(row.product) },
        { key: "net", label: "Net kg", min: 90, read: true, get: (row) => netKg(row.loadedKg, row.emptyKg) },
        { key: "invoiceNo", label: "Invoice", min: 110, read: true, get: (row) => row.invoiceNo },
        { key: "challanNo", label: "Challan", min: 110, read: true, get: (row) => row.challanNo },
        { key: "gatePassNo", label: "Gate pass", min: 110, read: true, get: (row) => row.gatePassNo },
        { key: "docStatus", label: "Documents", min: 110, read: true, get: (row) => row.docStatus || "Draft" },
        { key: "issuedBy", label: "Issued by", min: 120, read: true, get: (row) => row.issuedBy || "" },
        { key: "exitAt", label: "Exit time", min: 110, kind: "time", get: (row) => row.exitAt || "" },
        { key: "cancelReason", label: "Cancel reason", min: 140, get: (row) => row.cancelReason || "" },
        {
          key: "issue",
          label: "Action",
          min: 120,
          kind: "button",
          onPress: issue,
          get: (row) => (row.status === "dispatched" ? "Issued" : "Issue"),
        },
      ]}
    />
  );
}
