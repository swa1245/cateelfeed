import { useMemo, useState, type ReactNode } from "react";
import { Droplets, Flame, Fuel, Gauge, Plus, Save, Search, Zap } from "lucide-react";
import { SheetDatePicker } from "@/components/SheetDatePicker";
import { SheetSelect } from "@/components/SheetSelect";
import { formatSheetDate, sheetDateFromQuery } from "@/data/movements";
import { SHIFTS } from "@/data/production";
import {
  BOILER_FUELS,
  BOILERS,
  COMPRESSORS,
  COMPRESSOR_RANGE,
  FEED_KINDS,
  FUEL_TXN,
  FUEL_UNITS,
  OIL_LEVELS,
  POWER_FACTOR_TARGET,
  RUN_STATUS,
  WATER_ENTRIES,
  WATER_SOURCES,
  WATER_USES,
  YES_NO,
  compressorBand,
  fuelMeasure,
  fuelReading,
  listBoiler,
  powerReading,
  pressureBand,
  utilitySummary,
  waterReading,
  listCompressor,
  listFuel,
  listPower,
  listWater,
  nextUtilId,
  saveBoiler,
  saveCompressor,
  saveFuel,
  savePower,
  saveWater,
  type BoilerRow,
  type CompressorRow,
  type FuelRow,
  type PowerRow,
  type WaterRow,
} from "@/data/utility";

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

function loggedName() {
  try {
    const raw = localStorage.getItem("catelfeed_user");
    const user = raw ? (JSON.parse(raw) as { name?: string; email?: string }) : null;
    return user?.name || user?.email?.split("@")[0] || "";
  } catch {
    return "";
  }
}

function textCell(value: string, onChange: (value: string) => void, kind: "text" | "number" | "time" = "text") {
  return (
    <td>
      <input
        className="cf-cell"
        type={kind === "time" ? "time" : undefined}
        inputMode={kind === "number" ? "decimal" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </td>
  );
}

function readCell(value: string) {
  return (
    <td>
      <input className="cf-cell" readOnly value={value || "—"} />
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
  strip,
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
  strip?: { label: string; value: string; bad?: boolean }[];
  wide?: boolean;
}) {
  return (
    <div className="cf-page cf-sheet-page cf-util">
      {strip?.length ? (
        <div className="cf-log-strip">
          {strip.map((item) => (
            <article key={item.label} className={item.bad ? "is-bad" : undefined}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      ) : null}
      <section className="cf-sheet">
        <header className="cf-sheet-banner">
          <div className="cf-sheet-title">
            <span className="cf-sheet-icon">{icon}</span>
            <div>
              <p>Utility</p>
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

export function BoilerLogPage() {
  const sheet = useRows(listBoiler, saveBoiler);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.shift, row.boiler, row.fuel, row.operator, row.safety || ""]);
  const patch = (id: string, next: Partial<BoilerRow>) => {
    const current = sheet.rows.find((row) => row.id === id);
    const merged = current ? { ...current, ...next } : null;
    if (merged?.pressure) {
      const band = pressureBand(merged.boiler, merged.pressure);
      if (band.band === "Critical") sheet.flash(`${merged.boiler} pressure is critical. Its limit is ${band.label} kg/cm², separate from the other boiler.`);
    }
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  };
  return (
    <LogSheet
      title="BOILER LOG"
      icon={<Flame size={18} />}
      note="Pressure limits are set per boiler. Fuel used is kg, or litres for diesel. Blowdown is a Yes/No check, and hours are running hours."
      wide
      strip={utilitySummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Shift, boiler, fuel, operator…"
      status={sheet.status}
      empty="No boiler entries for this date."
      headers={["Date", "Shift", "Boiler", "Start", "Stop", "Pressure", "Range", "Feed water", "Kind", "Fuel", "Fuel used", "Unit", "Blowdown", "Hours", "Steam", "Feed °C", "Dosing", "Safety", "Operator", "Verified by", "Remarks"]}
      onAdd={() => {
        const row: BoilerRow = {
          id: nextUtilId("UB", sheet.rows),
          date: sheet.date,
          shift: "A",
          boiler: "Boiler 1",
          pressure: "",
          feedWater: "",
          fuel: "Rice husk",
          fuelUsed: "",
          blowdown: "Yes",
          hours: "",
          operator: loggedName(),
          remarks: "",
          feedKind: "Consumed KL",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Boiler log saved.")}
      render={(row) => {
        const band = pressureBand(row.boiler, row.pressure);
        return (
        <>
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {choiceCell(row.shift, SHIFTS, (shift) => patch(row.id, { shift }))}
          {choiceCell(row.boiler, BOILERS, (boiler) => patch(row.id, { boiler }))}
          {textCell(row.start || "", (start) => patch(row.id, { start }), "time")}
          {textCell(row.stop || "", (stop) => patch(row.id, { stop }), "time")}
          {textCell(row.pressure, (pressure) => patch(row.id, { pressure }), "number")}
          {readCell(band.label)}
          {textCell(row.feedWater, (feedWater) => patch(row.id, { feedWater }), "number")}
          {choiceCell(row.feedKind || "Consumed KL", FEED_KINDS, (feedKind) => patch(row.id, { feedKind }))}
          {choiceCell(row.fuel, BOILER_FUELS, (fuel) => patch(row.id, { fuel }))}
          {textCell(row.fuelUsed, (fuelUsed) => patch(row.id, { fuelUsed }), "number")}
          {readCell(fuelMeasure(row.fuel))}
          {choiceCell(row.blowdown, YES_NO, (blowdown) => patch(row.id, { blowdown }))}
          {textCell(row.hours, (hours) => patch(row.id, { hours }), "number")}
          {textCell(row.steam || "", (steam) => patch(row.id, { steam }), "number")}
          {textCell(row.feedTemp || "", (feedTemp) => patch(row.id, { feedTemp }), "number")}
          {textCell(row.dosing || "", (dosing) => patch(row.id, { dosing }))}
          {textCell(row.safety || "", (safety) => patch(row.id, { safety }))}
          {textCell(row.operator, (operator) => patch(row.id, { operator }))}
          {textCell(row.verifiedBy || "", (verifiedBy) => patch(row.id, { verifiedBy }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
        );
      }}
    />
  );
}

export function PowerLogPage() {
  const sheet = useRows(listPower, savePower);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.shift, row.units, row.remarks]);
  const patch = (id: string, next: Partial<PowerRow>) => {
    let warning = "";
    const rows = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      const reading = powerReading(merged);
      warning = reading.warning;
      return { ...merged, units: reading.units, dgUnits: reading.dgUnits };
    });
    sheet.commit(rows);
    if (warning) sheet.flash(warning);
  };
  return (
    <LogSheet
      title="POWER LOG"
      icon={<Zap size={18} />}
      note={`Units are closing minus opening. Power factor is a decimal. The target is ${POWER_FACTOR_TARGET}. A meter reset needs a reason.`}
      wide
      strip={utilitySummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Shift or remarks…"
      status={sheet.status}
      empty="No power entries for this date."
      headers={["Date", "Shift", "EB meter", "EB opening", "EB closing", "Units", "Reset reason", "DG set", "DG opening", "DG closing", "DG units", "DG hours", "Diesel opening", "Diesel closing", "Diesel L", "Power factor", "Verified by", "Remarks"]}
      onAdd={() => {
        const row: PowerRow = {
          id: nextUtilId("UP", sheet.rows),
          date: sheet.date,
          shift: "A",
          ebOpen: "",
          ebClose: "",
          units: "",
          dgHours: "",
          diesel: "",
          powerFactor: "",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Power log saved.")}
      render={(row) => (
        <>
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {choiceCell(row.shift, SHIFTS, (shift) => patch(row.id, { shift }))}
          {textCell(row.meterId || "EB-1", (meterId) => patch(row.id, { meterId }))}
          {textCell(row.ebOpen, (ebOpen) => patch(row.id, { ebOpen }), "number")}
          {textCell(row.ebClose, (ebClose) => patch(row.id, { ebClose }), "number")}
          {readCell(row.units)}
          {textCell(row.resetReason || "", (resetReason) => patch(row.id, { resetReason }))}
          {textCell(row.dgId || "DG-1", (dgId) => patch(row.id, { dgId }))}
          {textCell(row.dgOpen || "", (dgOpen) => patch(row.id, { dgOpen }), "number")}
          {textCell(row.dgClose || "", (dgClose) => patch(row.id, { dgClose }), "number")}
          {readCell(row.dgUnits || "")}
          {textCell(row.dgHours, (dgHours) => patch(row.id, { dgHours }), "number")}
          {textCell(row.dieselOpen || "", (dieselOpen) => patch(row.id, { dieselOpen }), "number")}
          {textCell(row.dieselClose || "", (dieselClose) => patch(row.id, { dieselClose }), "number")}
          {textCell(row.diesel, (diesel) => patch(row.id, { diesel }), "number")}
          {textCell(row.powerFactor, (powerFactor) => patch(row.id, { powerFactor }), "number")}
          {textCell(row.verifiedBy || "", (verifiedBy) => patch(row.id, { verifiedBy }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}

export function WaterLogPage() {
  const sheet = useRows(listWater, saveWater);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.source, row.purpose, row.remarks]);
  const patch = (id: string, next: Partial<WaterRow>) => {
    let warning = "";
    const rows = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      const reading = waterReading(merged);
      warning = reading.warning;
      return { ...merged, entryType: reading.entryType, used: reading.used };
    });
    sheet.commit(rows);
    if (warning) sheet.flash(warning);
  };
  return (
    <LogSheet
      title="WATER LOG"
      icon={<Droplets size={18} />}
      note="Meter use is closing minus opening. A tanker is a receipt, not a meter reading. A second purpose can be recorded on the same line."
      wide
      strip={utilitySummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Source or purpose…"
      status={sheet.status}
      empty="No water entries for this date."
      headers={["Date", "Shift", "Source", "Entry", "Meter", "Opening KL", "Closing KL", "Used KL", "Receipt KL", "Delivery ref", "Purpose", "Purpose 2", "Quality ref", "Recorded by", "Verified by", "Reset reason", "Remarks"]}
      onAdd={() => {
        const row: WaterRow = {
          id: nextUtilId("UW", sheet.rows),
          date: sheet.date,
          source: "Borewell",
          opening: "",
          closing: "",
          used: "",
          purpose: "Boiler",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Water log saved.")}
      render={(row) => (
        <>
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {choiceCell(row.shift || "A", SHIFTS, (shift) => patch(row.id, { shift }))}
          {choiceCell(row.source, WATER_SOURCES, (source) => patch(row.id, { source, entryType: source === "Tanker" ? "Tanker receipt" : row.entryType }))}
          {choiceCell(row.entryType || "Meter", WATER_ENTRIES, (entryType) => patch(row.id, { entryType }))}
          {textCell(row.meterId || "", (meterId) => patch(row.id, { meterId }))}
          {textCell(row.opening, (opening) => patch(row.id, { opening }), "number")}
          {textCell(row.closing, (closing) => patch(row.id, { closing }), "number")}
          {readCell(row.used)}
          {textCell(row.receipt || "", (receipt) => patch(row.id, { receipt }), "number")}
          {textCell(row.deliveryRef || "", (deliveryRef) => patch(row.id, { deliveryRef }))}
          {choiceCell(row.purpose, WATER_USES, (purpose) => patch(row.id, { purpose }))}
          {choiceCell(row.purpose2 || "", ["", ...WATER_USES], (purpose2) => patch(row.id, { purpose2 }))}
          {textCell(row.qualityRef || "", (qualityRef) => patch(row.id, { qualityRef }))}
          {textCell(row.recordedBy || "", (recordedBy) => patch(row.id, { recordedBy }))}
          {textCell(row.verifiedBy || "", (verifiedBy) => patch(row.id, { verifiedBy }))}
          {textCell(row.resetReason || "", (resetReason) => patch(row.id, { resetReason }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}

export function FuelLogPage() {
  const sheet = useRows(listFuel, saveFuel);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.fuel, row.supplier, row.remarks]);
  const patch = (id: string, next: Partial<FuelRow>) => {
    let warning = "";
    const rows = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      const reading = fuelReading(merged);
      warning = reading.warning;
      return { ...merged, closing: reading.closing };
    });
    sheet.commit(rows);
    if (warning) sheet.flash(warning);
  };
  return (
    <LogSheet
      title="FUEL LOG"
      icon={<Fuel size={18} />}
      note="Closing stock is opening plus receipt minus issued. An adjustment needs a reason and approval. Boiler fuel use is checked against this ledger."
      wide
      strip={utilitySummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Fuel or supplier…"
      status={sheet.status}
      empty="No fuel entries for this date."
      headers={["Date", "Shift", "Fuel", "Location", "Txn", "Unit", "Opening", "Receipt", "Issued", "Adjustment", "Closing", "Supplier", "Receipt ref", "PO", "Delivery", "Issued to", "Reason", "Approved by", "Recorded by", "Verified by", "Remarks"]}
      onAdd={() => {
        const row: FuelRow = {
          id: nextUtilId("UF", sheet.rows),
          date: sheet.date,
          fuel: "Rice husk",
          unit: "MT",
          opening: "",
          receipt: "",
          issued: "",
          closing: "",
          supplier: "",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Fuel log saved.")}
      render={(row) => (
        <>
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {choiceCell(row.shift || "A", SHIFTS, (shift) => patch(row.id, { shift }))}
          {choiceCell(row.fuel, BOILER_FUELS, (fuel) => patch(row.id, { fuel }))}
          {textCell(row.location || "", (location) => patch(row.id, { location }))}
          {choiceCell(row.txnType || "Issue", FUEL_TXN, (txnType) => patch(row.id, { txnType }))}
          {choiceCell(row.unit, FUEL_UNITS, (unit) => patch(row.id, { unit }))}
          {textCell(row.opening, (opening) => patch(row.id, { opening }), "number")}
          {textCell(row.receipt, (receipt) => patch(row.id, { receipt }), "number")}
          {textCell(row.issued, (issued) => patch(row.id, { issued }), "number")}
          {textCell(row.adjustment || "", (adjustment) => patch(row.id, { adjustment }), "number")}
          {readCell(row.closing)}
          {textCell(row.supplier, (supplier) => patch(row.id, { supplier }))}
          {textCell(row.receiptRef || "", (receiptRef) => patch(row.id, { receiptRef }))}
          {textCell(row.purchaseOrder || "", (purchaseOrder) => patch(row.id, { purchaseOrder }))}
          {textCell(row.deliveryNo || "", (deliveryNo) => patch(row.id, { deliveryNo }))}
          {textCell(row.issuedTo || "", (issuedTo) => patch(row.id, { issuedTo }))}
          {textCell(row.adjustReason || "", (adjustReason) => patch(row.id, { adjustReason }))}
          {textCell(row.approvedBy || "", (approvedBy) => patch(row.id, { approvedBy }))}
          {textCell(row.recordedBy || "", (recordedBy) => patch(row.id, { recordedBy }))}
          {textCell(row.verifiedBy || "", (verifiedBy) => patch(row.id, { verifiedBy }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}

export function CompressorLogPage() {
  const sheet = useRows(listCompressor, saveCompressor);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.shift, row.status, row.remarks]);
  const patch = (id: string, next: Partial<CompressorRow>) => {
    const current = sheet.rows.find((row) => row.id === id);
    const merged = current ? { ...current, ...next } : null;
    if (merged && compressorBand(merged.pressure) === "Check") sheet.flash(`Pressure is outside ${COMPRESSOR_RANGE.label} kg/cm².`);
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  };
  return (
    <LogSheet
      title="COMPRESSOR LOG"
      icon={<Gauge size={18} />}
      note={`Running hours, oil, and drain. The pressure range is ${COMPRESSOR_RANGE.label} kg/cm². Needs inspection is separate from a low oil level.`}
      wide
      strip={utilitySummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Shift, status, remarks…"
      status={sheet.status}
      empty="No compressor entries for this date."
      headers={["Date", "Shift", "Compressor", "Start", "Stop", "Pressure", "Range", "Hours", "Oil", "Drain", "Condensate", "Status", "Operator", "Verified by", "Abnormal", "Maintenance ref", "Remarks"]}
      onAdd={() => {
        const row: CompressorRow = {
          id: nextUtilId("UA", sheet.rows),
          date: sheet.date,
          shift: "A",
          pressure: "",
          hours: "",
          oil: "Ok",
          drain: "Yes",
          status: "Running",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Compressor log saved.")}
      render={(row) => (
        <>
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {choiceCell(row.shift, SHIFTS, (shift) => patch(row.id, { shift }))}
          {choiceCell(row.compressor || "Compressor 1", COMPRESSORS, (compressor) => patch(row.id, { compressor }))}
          {textCell(row.start || "", (start) => patch(row.id, { start }), "time")}
          {textCell(row.stop || "", (stop) => patch(row.id, { stop }), "time")}
          {textCell(row.pressure, (pressure) => patch(row.id, { pressure }), "number")}
          {readCell(COMPRESSOR_RANGE.label)}
          {textCell(row.hours, (hours) => patch(row.id, { hours }), "number")}
          {choiceCell(row.oil, OIL_LEVELS, (oil) => patch(row.id, { oil }))}
          {choiceCell(row.drain, YES_NO, (drain) => patch(row.id, { drain }))}
          {textCell(row.drainQty || "", (drainQty) => patch(row.id, { drainQty }), "number")}
          {choiceCell(row.status, RUN_STATUS, (status) => patch(row.id, { status }))}
          {textCell(row.operator || "", (operator) => patch(row.id, { operator }))}
          {textCell(row.verifiedBy || "", (verifiedBy) => patch(row.id, { verifiedBy }))}
          {textCell(row.abnormal || "", (abnormal) => patch(row.id, { abnormal }))}
          {textCell(row.maintRef || "", (maintRef) => patch(row.id, { maintRef }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}
