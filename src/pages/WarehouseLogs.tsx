import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, FileBarChart, Package, Plus, Save, Search, Activity } from "lucide-react";
import { SheetDatePicker } from "@/components/SheetDatePicker";
import { SheetSelect } from "@/components/SheetSelect";
import { formatSheetDate, sheetDateFromQuery } from "@/data/movements";
import { SHIFTS } from "@/data/production";
import {
  FLOW_DIRECTIONS,
  FLOW_STATUSES,
  MOVE_TYPES,
  REPORT_STATUSES,
  STOCK_STATUSES,
  STORES,
  listFlows,
  listMaterialDetails,
  listMovements,
  listStockReports,
  nextWhId,
  saveFlows,
  saveMaterialDetails,
  saveMovements,
  saveStockReports,
  type FlowRow,
  type MaterialDetailRow,
  type MovementRow,
  type StockReportRow,
} from "@/data/warehouse";

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

function LogSheet<T extends Row>({
  title,
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
}: {
  title: string;
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
}) {
  return (
    <div className="cf-page cf-sheet-page cf-wh-log">
      <section className="cf-sheet">
        <header className="cf-sheet-banner">
          <div className="cf-sheet-title">
            <span className="cf-sheet-icon">{icon}</span>
            <div>
              <p>Warehouse / Store</p>
              <h1>{title}</h1>
              <p>Inventory · Warehouse / Store</p>
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
          <table className="cf-sheet-table">
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

function visible<T extends Row>(rows: T[], date: string, search: string, fields: (row: T) => string[]) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (row.date !== date) return false;
    if (!query) return true;
    return fields(row).join(" ").toLowerCase().includes(query);
  });
}

export function MaterialDetailsPage() {
  const sheet = useRows(listMaterialDetails, saveMaterialDetails);
  const rows = visible(sheet.rows, sheet.date, sheet.search, (row) => [
    row.store, row.rack, row.material, row.supplier, row.grade, row.status,
  ]);
  const update = (id: string, patch: Partial<MaterialDetailRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <LogSheet
      title="MATERIAL DETAILS"
      icon={<Package size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Search rack, material, supplier…"
      status={sheet.status}
      onSave={() => sheet.flash("Material sheet saved on this browser.")}
      onAdd={() =>
        sheet.commit([
          {
            id: nextWhId("MD", sheet.rows),
            date: sheet.date,
            store: "A",
            rack: "",
            material: "",
            stockMt: "",
            bags: "",
            supplier: "",
            grade: "",
            cp: "",
            fat: "",
            moisture: "",
            inward: "",
            expiry: "",
            status: "In Stock",
          },
          ...sheet.rows,
        ])
      }
      empty="No material rows for this date. Click Add row."
      headers={["Store", "Rack", "Material", "Stock (MT)", "Bags", "Supplier", "Grade", "CP %", "Fat %", "Moisture %", "Last inward", "Expiry", "Status"]}
      render={(row) => (
        <>
          {choiceCell(row.store, STORES, (store) => update(row.id, { store: store as MaterialDetailRow["store"] }))}
          {textCell(row.rack, (rack) => update(row.id, { rack }))}
          {textCell(row.material, (material) => update(row.id, { material }))}
          {textCell(row.stockMt, (stockMt) => update(row.id, { stockMt }), "number")}
          {textCell(row.bags, (bags) => update(row.id, { bags }), "number")}
          {textCell(row.supplier, (supplier) => update(row.id, { supplier }))}
          {textCell(row.grade, (grade) => update(row.id, { grade }))}
          {textCell(row.cp, (cp) => update(row.id, { cp }), "number")}
          {textCell(row.fat, (fat) => update(row.id, { fat }), "number")}
          {textCell(row.moisture, (moisture) => update(row.id, { moisture }), "number")}
          {textCell(row.inward, (inward) => update(row.id, { inward }))}
          {textCell(row.expiry, (expiry) => update(row.id, { expiry }))}
          {choiceCell(row.status, STOCK_STATUSES, (status) => update(row.id, { status }))}
        </>
      )}
    />
  );
}

export function InboundOutboundPage() {
  const sheet = useRows(listFlows, saveFlows);
  const rows = visible(sheet.rows, sheet.date, sheet.search, (row) => [
    row.direction, row.material, row.party, row.reference, row.rack, row.status, row.shift,
  ]);
  const update = (id: string, patch: Partial<FlowRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <LogSheet
      title="INBOUND / OUTBOUND"
      icon={<ArrowLeftRight size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Search material, party, reference…"
      status={sheet.status}
      onSave={() => sheet.flash("Inbound / outbound sheet saved on this browser.")}
      onAdd={() =>
        sheet.commit([
          {
            id: nextWhId("IO", sheet.rows),
            date: sheet.date,
            time: "",
            shift: "A",
            direction: "Inbound",
            material: "",
            qtyMt: "",
            bags: "",
            store: "A",
            rack: "",
            party: "",
            reference: "",
            status: "Pending",
          },
          ...sheet.rows,
        ])
      }
      empty="No inward or outward rows for this date. Click Add row."
      headers={["Time", "Shift", "Direction", "Material", "Qty (MT)", "Bags", "Store", "Rack", "Party", "Reference", "Status"]}
      render={(row) => (
        <>
          {textCell(row.time, (time) => update(row.id, { time }))}
          {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
          {choiceCell(row.direction, FLOW_DIRECTIONS, (direction) => update(row.id, { direction }))}
          {textCell(row.material, (material) => update(row.id, { material }))}
          {textCell(row.qtyMt, (qtyMt) => update(row.id, { qtyMt }), "number")}
          {textCell(row.bags, (bags) => update(row.id, { bags }), "number")}
          {choiceCell(row.store, STORES, (store) => update(row.id, { store }))}
          {textCell(row.rack, (rack) => update(row.id, { rack }))}
          {textCell(row.party, (party) => update(row.id, { party }))}
          {textCell(row.reference, (reference) => update(row.id, { reference }))}
          {choiceCell(row.status, FLOW_STATUSES, (status) => update(row.id, { status }))}
        </>
      )}
    />
  );
}

export function StockMovementsPage() {
  const sheet = useRows(listMovements, saveMovements);
  const rows = visible(sheet.rows, sheet.date, sheet.search, (row) => [
    row.movement, row.material, row.from, row.to, row.reference, row.shift,
  ]);
  const update = (id: string, patch: Partial<MovementRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <LogSheet
      title="STOCK MOVEMENTS"
      icon={<Activity size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Search material, from, to, reference…"
      status={sheet.status}
      onSave={() => sheet.flash("Movement sheet saved on this browser.")}
      onAdd={() =>
        sheet.commit([
          {
            id: nextWhId("SM", sheet.rows),
            date: sheet.date,
            time: "",
            shift: "A",
            movement: "Inward",
            material: "",
            qtyMt: "",
            bags: "",
            from: "",
            to: "",
            reference: "",
          },
          ...sheet.rows,
        ])
      }
      empty="No movements for this date. Click Add row."
      headers={["Time", "Shift", "Movement", "Material", "Qty (MT)", "Bags", "From", "To", "Reference"]}
      render={(row) => (
        <>
          {textCell(row.time, (time) => update(row.id, { time }))}
          {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
          {choiceCell(row.movement, MOVE_TYPES, (movement) => update(row.id, { movement }))}
          {textCell(row.material, (material) => update(row.id, { material }))}
          {textCell(row.qtyMt, (qtyMt) => update(row.id, { qtyMt }), "number")}
          {textCell(row.bags, (bags) => update(row.id, { bags }), "number")}
          {textCell(row.from, (from) => update(row.id, { from }))}
          {textCell(row.to, (to) => update(row.id, { to }))}
          {textCell(row.reference, (reference) => update(row.id, { reference }))}
        </>
      )}
    />
  );
}

export function StoreReportsPage() {
  const sheet = useRows(listStockReports, saveStockReports);
  const rows = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.material, row.shift, row.status]);
  const update = (id: string, patch: Partial<StockReportRow>) => {
    sheet.commit(sheet.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <LogSheet
      title="STOCK REPORTS"
      icon={<FileBarChart size={22} strokeWidth={2.2} />}
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Search material, shift, status…"
      status={sheet.status}
      onSave={() => sheet.flash("Report sheet saved on this browser.")}
      onAdd={() =>
        sheet.commit([
          {
            id: nextWhId("WR", sheet.rows),
            date: sheet.date,
            shift: "A",
            material: "",
            openingMt: "",
            inwardMt: "",
            issuedMt: "",
            closingMt: "",
            bags: "",
            minMt: "",
            reorderMt: "",
            status: "OK",
          },
          ...sheet.rows,
        ])
      }
      empty="No report rows for this date. Click Add row."
      headers={["Shift", "Material", "Opening (MT)", "Inward (MT)", "Issued (MT)", "Closing (MT)", "Bags", "Min level", "Reorder", "Status"]}
      render={(row) => (
        <>
          {choiceCell(row.shift, SHIFTS, (shift) => update(row.id, { shift }))}
          {textCell(row.material, (material) => update(row.id, { material }))}
          {textCell(row.openingMt, (openingMt) => update(row.id, { openingMt }), "number")}
          {textCell(row.inwardMt, (inwardMt) => update(row.id, { inwardMt }), "number")}
          {textCell(row.issuedMt, (issuedMt) => update(row.id, { issuedMt }), "number")}
          {textCell(row.closingMt, (closingMt) => update(row.id, { closingMt }), "number")}
          {textCell(row.bags, (bags) => update(row.id, { bags }), "number")}
          {textCell(row.minMt, (minMt) => update(row.id, { minMt }), "number")}
          {textCell(row.reorderMt, (reorderMt) => update(row.id, { reorderMt }), "number")}
          {choiceCell(row.status, REPORT_STATUSES, (status) => update(row.id, { status }))}
        </>
      )}
    />
  );
}
