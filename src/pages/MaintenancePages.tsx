import { useMemo, useState, type ReactNode } from "react";
import { CalendarCheck, ClipboardCheck, Package, Plus, Save, Search, Wrench } from "lucide-react";
import { SheetDatePicker } from "@/components/SheetDatePicker";
import { SheetSelect } from "@/components/SheetSelect";
import {
  CHECKS,
  CHECK_RESULTS,
  FAULT_TYPES,
  FREQUENCIES,
  INSPECT_TYPES,
  JOB_STATUS,
  MACHINES,
  PM_RESULTS,
  SPARE_UNITS,
  breakdownHours,
  listBreakdowns,
  maintenanceSummary,
  pmNextDue,
  pmState,
  responseMinutes,
  spareStock,
  spareWarning,
  listChecklist,
  listPreventive,
  listSpares,
  nextMaintId,
  saveBreakdowns,
  saveChecklist,
  savePreventive,
  saveSpares,
  type BreakdownRow,
  type ChecklistRow,
  type PreventiveRow,
  type SpareRow,
} from "@/data/maintenance";
import { formatSheetDate, sheetDateFromQuery } from "@/data/movements";
import { SHIFTS } from "@/data/production";

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
    <div className="cf-page cf-sheet-page cf-maint">
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
              <p>Maintenance</p>
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

export function BreakdownPage() {
  const sheet = useRows(listBreakdowns, saveBreakdowns);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.machine, row.fault, row.attended, row.status]);
  const patch = (id: string, next: Partial<BreakdownRow>) => {
    let warning = "";
    const rows = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      if (merged.status === "Closed" && !merged.verifiedBy?.trim()) {
        warning = "Closed means the machine is verified back in service. Enter who verified it.";
        return row;
      }
      const span = breakdownHours(merged);
      warning = span.warning;
      return { ...merged, hours: span.hours || merged.hours };
    });
    sheet.commit(rows);
    if (warning) sheet.flash(warning);
  };
  return (
    <LogSheet
      title="BREAKDOWN LOG"
      icon={<Wrench size={18} />}
      note="The breakdown ID links the repair, checklist, and spare issue. Hours use the start date and end date, so a job past midnight stays correct. Closed needs a return-to-service check."
      wide
      strip={maintenanceSummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Machine, fault, person…"
      status={sheet.status}
      empty="No breakdowns for this date."
      headers={["ID", "Date", "Shift", "Machine", "Fault type", "Fault", "Reported", "From", "End date", "To", "Response", "Hours", "Attended by", "Root cause", "Action", "Status", "Verified by", "Production impact", "Remarks"]}
      onAdd={() => {
        const row: BreakdownRow = {
          id: nextMaintId("MB", sheet.rows),
          date: sheet.date,
          shift: "A",
          machine: "Pellet mill",
          fault: "",
          from: "",
          to: "",
          hours: "",
          attended: "",
          status: "Open",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Breakdown log saved.")}
      render={(row) => (
        <>
          {readCell(row.id)}
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {choiceCell(row.shift, SHIFTS, (shift) => patch(row.id, { shift }))}
          {choiceCell(row.machine, MACHINES, (machine) => patch(row.id, { machine }))}
          {choiceCell(row.faultType || "Mechanical", FAULT_TYPES, (faultType) => patch(row.id, { faultType }))}
          {textCell(row.fault, (fault) => patch(row.id, { fault }))}
          {textCell(row.reportedAt || "", (reportedAt) => patch(row.id, { reportedAt }), "time")}
          {textCell(row.from, (from) => patch(row.id, { from }), "time")}
          {textCell(row.endDate || "", (endDate) => patch(row.id, { endDate }))}
          {textCell(row.to, (to) => patch(row.id, { to }), "time")}
          {readCell(responseMinutes(row))}
          {readCell(row.hours)}
          {textCell(row.attended, (attended) => patch(row.id, { attended }))}
          {textCell(row.rootCause || "", (rootCause) => patch(row.id, { rootCause }))}
          {textCell(row.action || "", (action) => patch(row.id, { action }))}
          {choiceCell(row.status, JOB_STATUS, (status) => patch(row.id, { status }))}
          {textCell(row.verifiedBy || "", (verifiedBy) => patch(row.id, { verifiedBy }))}
          {textCell(row.impact || "", (impact) => patch(row.id, { impact }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}

export function PreventivePage() {
  const sheet = useRows(listPreventive, savePreventive);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.machine, row.job, row.frequency, row.by]);
  const patch = (id: string, next: Partial<PreventiveRow>) => {
    let warning = "";
    const rows = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      if ((merged.result === "Deferred" || merged.result === "Skipped") && !merged.deferReason?.trim()) {
        warning = "A skipped or deferred job needs a reason.";
      }
      if (merged.result === "Deferred" && !merged.approvedBy?.trim()) warning = "A deferred job needs supervisor approval.";
      const nextDue = merged.result === "Completed" ? pmNextDue(merged) : merged.nextDue || "";
      return { ...merged, done: merged.result === "Completed" ? "Yes" : "No", nextDue };
    });
    sheet.commit(rows);
    if (warning) sheet.flash(warning);
  };
  return (
    <LogSheet
      title="PREVENTIVE MAINTENANCE"
      icon={<CalendarCheck size={18} />}
      note="Due and overdue come from the due date. Completing a job sets the next due date from its frequency."
      wide
      strip={maintenanceSummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Machine or job…"
      status={sheet.status}
      empty="No preventive jobs for this date."
      headers={["ID", "Machine", "Job", "Frequency", "Due", "Status", "Result", "Assigned", "Completed", "Next due", "Defer reason", "Approved by", "Job ref", "Remarks"]}
      onAdd={() => {
        const row: PreventiveRow = {
          id: nextMaintId("MP", sheet.rows),
          date: sheet.date,
          machine: "Pellet mill",
          frequency: "Weekly",
          job: "",
          done: "No",
          by: "",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Preventive sheet saved.")}
      render={(row) => (
        <>
          {readCell(row.id)}
          {choiceCell(row.machine, MACHINES, (machine) => patch(row.id, { machine }))}
          {textCell(row.job, (job) => patch(row.id, { job }))}
          {choiceCell(row.frequency, FREQUENCIES, (frequency) => patch(row.id, { frequency }))}
          {textCell(row.dueDate || row.date, (dueDate) => patch(row.id, { dueDate }))}
          {readCell(pmState(row))}
          {choiceCell(row.result || "Not completed", PM_RESULTS, (result) => patch(row.id, { result, completedAt: result === "Completed" ? row.completedAt || row.date : row.completedAt }))}
          {textCell(row.assigned || row.by, (assigned) => patch(row.id, { assigned, by: assigned }))}
          {textCell(row.completedAt || "", (completedAt) => patch(row.id, { completedAt }))}
          {readCell(row.nextDue || "")}
          {textCell(row.deferReason || "", (deferReason) => patch(row.id, { deferReason }))}
          {textCell(row.approvedBy || "", (approvedBy) => patch(row.id, { approvedBy }))}
          {textCell(row.jobRef || "", (jobRef) => patch(row.id, { jobRef }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}

export function ChecklistPage() {
  const sheet = useRows(listChecklist, saveChecklist);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.machine, row.check, row.result, row.shift]);
  const patch = (id: string, next: Partial<ChecklistRow>) => {
    let warning = "";
    const rows = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      if (merged.result === "Attention" && !merged.action?.trim()) warning = "Attention needs an action. It is not opened as a breakdown by itself.";
      return merged;
    });
    sheet.commit(rows);
    if (warning) sheet.flash(warning);
  };
  return (
    <LogSheet
      title="EQUIPMENT CHECKLIST"
      icon={<ClipboardCheck size={18} />}
      note="Ok, Attention, or Not applicable. Attention needs an action or a linked job. It does not open a breakdown on its own."
      wide
      strip={maintenanceSummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Machine or check…"
      status={sheet.status}
      empty="No checklist rows for this date."
      headers={["ID", "Date", "Shift", "Machine", "Type", "Check", "Result", "Inspector", "Reviewer", "Action", "Job", "Remarks"]}
      onAdd={() => {
        const row: ChecklistRow = {
          id: nextMaintId("MC", sheet.rows),
          date: sheet.date,
          shift: "A",
          machine: "Pellet mill",
          check: "Lubrication",
          result: "Ok",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Checklist saved.")}
      render={(row) => (
        <>
          {readCell(row.id)}
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {choiceCell(row.shift, SHIFTS, (shift) => patch(row.id, { shift }))}
          {choiceCell(row.machine, MACHINES, (machine) => patch(row.id, { machine }))}
          {choiceCell(row.inspectType || "Routine", INSPECT_TYPES, (inspectType) => patch(row.id, { inspectType }))}
          {choiceCell(row.check, CHECKS, (check) => patch(row.id, { check }))}
          {choiceCell(row.result, CHECK_RESULTS, (result) => patch(row.id, { result }))}
          {textCell(row.inspector || "", (inspector) => patch(row.id, { inspector }))}
          {textCell(row.reviewer || "", (reviewer) => patch(row.id, { reviewer }))}
          {textCell(row.action || "", (action) => patch(row.id, { action }))}
          {textCell(row.jobRef || "", (jobRef) => patch(row.id, { jobRef }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}

export function SparesPage() {
  const sheet = useRows(listSpares, saveSpares);
  const shown = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.part, row.machine, row.issuedTo, row.jobRef]);
  const patch = (id: string, next: Partial<SpareRow>) => {
    let warning = "";
    const rows = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      const stock = spareStock(merged.part);
      const withStock = { ...merged, stock: stock == null ? merged.stock || "" : String(stock) };
      warning = spareWarning(withStock);
      return withStock;
    });
    sheet.commit(rows);
    if (warning) sheet.flash(warning);
  };
  return (
    <LogSheet
      title="SPARE PARTS"
      icon={<Package size={18} />}
      note="Issued quantity is checked against the maintenance-store balance. Used quantity can differ from what was issued. The job ID links the issue to the breakdown."
      wide
      strip={maintenanceSummary(sheet.date)}
      rows={shown}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Part, machine, job…"
      status={sheet.status}
      empty="No spare issues for this date."
      headers={["Date", "Time", "Part", "Location", "Stock", "Machine", "Issued", "Used", "Unit", "Issued by", "Received by", "Job", "Returned", "Condition", "Approval", "Supplier", "Purchase ref", "Remarks"]}
      onAdd={() => {
        const row: SpareRow = {
          id: nextMaintId("MS", sheet.rows),
          date: sheet.date,
          part: "",
          machine: "Pellet mill",
          qty: "",
          unit: "Nos",
          issuedTo: "",
          jobRef: "",
          remarks: "",
        };
        sheet.commit([row, ...sheet.rows]);
        sheet.flash("Row added. Fill it, then save.");
      }}
      onSave={() => sheet.flash("Spare parts sheet saved.")}
      render={(row) => (
        <>
          {textCell(row.date, (date) => patch(row.id, { date }))}
          {textCell(row.time || "", (time) => patch(row.id, { time }), "time")}
          {textCell(row.part, (part) => patch(row.id, { part }))}
          {textCell(row.location || "", (location) => patch(row.id, { location }))}
          {readCell(row.stock || "")}
          {choiceCell(row.machine, MACHINES, (machine) => patch(row.id, { machine }))}
          {textCell(row.qty, (qty) => patch(row.id, { qty }), "number")}
          {textCell(row.usedQty || "", (usedQty) => patch(row.id, { usedQty }), "number")}
          {choiceCell(row.unit, SPARE_UNITS, (unit) => patch(row.id, { unit }))}
          {textCell(row.issuedBy || loggedName(), (issuedBy) => patch(row.id, { issuedBy }))}
          {textCell(row.receivedBy || row.issuedTo, (receivedBy) => patch(row.id, { receivedBy, issuedTo: receivedBy }))}
          {textCell(row.jobRef, (jobRef) => patch(row.id, { jobRef }))}
          {textCell(row.returned || "", (returned) => patch(row.id, { returned }), "number")}
          {textCell(row.condition || "", (condition) => patch(row.id, { condition }))}
          {textCell(row.approval || "", (approval) => patch(row.id, { approval }))}
          {textCell(row.supplier || "", (supplier) => patch(row.id, { supplier }))}
          {textCell(row.purchaseRef || "", (purchaseRef) => patch(row.id, { purchaseRef }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}
