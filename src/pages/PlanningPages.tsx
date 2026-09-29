import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, FlaskConical, Layers, Plus, Save, Search } from "lucide-react";
import { SheetDatePicker } from "@/components/SheetDatePicker";
import { SheetSelect } from "@/components/SheetSelect";
import { FEED_PRODUCTS, RAW_MATERIALS, formatSheetDate, materialLabel, productLabel, sheetDateFromQuery, todayIso } from "@/data/movements";
import {
  FEED_FORMS,
  NUTRIENT_BASIS,
  NUTRIENT_NAMES,
  NUTRIENT_UNITS,
  PLAN_STATUSES,
  YES_NO,
  analyseFormula,
  approvedFormula,
  checkBatch,
  formulaProblems,
  listApprovals,
  listFormula,
  listNutrients,
  listPlans,
  logApproval,
  mandatoryMissing,
  nextPlanId,
  nutrientIssue,
  saveFormula,
  saveNutrientCard,
  saveNutrients,
  savePlans,
  specFor,
  suggestBatchCount,
  nutrientCard,
  type FormulaRow,
  type NutrientRow,
  type PlanRow,
} from "@/data/planning";
import { SHIFTS } from "@/data/production";

type Row = { id: string; date: string };

const MATERIALS = RAW_MATERIALS.filter((item) => item.value !== "bags");

function shortProduct(value: string) {
  return productLabel(value).split("—")[0].trim();
}

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function useRows<T extends Row>(load: () => T[], persist: (rows: T[]) => void) {
  const [rows, setRows] = useState(load);
  const [date, setDate] = useState(sheetDateFromQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const savedDates = useMemo(
    () => [...new Set(rows.map((row) => row.date).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [rows],
  );
  const edit = (next: T[]) => setRows(next);
  const commit = (next?: T[]) => {
    const payload = next ?? rows;
    persist(payload);
    setRows(payload);
  };
  const flash = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 4200);
  };
  return { rows, date, setDate, search, setSearch, status, flash, edit, commit, savedDates };
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

function productCell(value: string, onChange: (value: string) => void) {
  return (
    <td>
      <SheetSelect
        compact
        value={value}
        placeholder="Product"
        options={FEED_PRODUCTS.map((item) => ({ value: item.value, label: shortProduct(item.value) }))}
        onChange={onChange}
      />
    </td>
  );
}

function materialCell(value: string, onChange: (value: string) => void) {
  return (
    <td>
      <SheetSelect
        compact
        value={value}
        placeholder="Material"
        options={MATERIALS.map((item) => ({ value: item.value, label: item.label }))}
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
  extra,
  rowClass,
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
  extra?: ReactNode;
  rowClass?: (row: T) => string;
}) {
  return (
    <div className="cf-page cf-sheet-page cf-plan">
      <section className="cf-sheet">
        <header className="cf-sheet-banner">
          <div className="cf-sheet-title">
            <span className="cf-sheet-icon">{icon}</span>
            <div>
              <p>Planning</p>
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
        {extra}
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
                rows.map((row) => (
                  <tr key={row.id} className={rowClass?.(row)}>
                    {render(row)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function PlanningOverviewPage() {
  const today = todayIso();
  const plans = listPlans().filter((row) => row.date === today);
  const running = plans.find((row) => row.status === "Running") || plans[0];
  const formula = listFormula().filter((row) => row.date === today && row.product === running?.product);
  const nutrients = listNutrients().filter((row) => row.date === today && row.product === running?.product);
  const planned = plans.reduce((sum, row) => sum + num(row.planMt), 0);
  const inclusion = formula.reduce((sum, row) => sum + num(row.inclusion), 0);
  const planMt = num(running?.planMt || "0");
  const maxPlan = Math.max(1, ...plans.map((row) => num(row.planMt)));
  const maxNeed = Math.max(1, ...formula.map((row) => planMt * num(row.kgPerMt)));
  const grade = running ? shortProduct(running.product) : "the mill";

  return (
    <div className="cf-page cf-sheet-page cf-plan cf-plan-home">
      <header className="cf-plan-hero">
        <p>Planning</p>
        <h1>Today’s mill plan</h1>
        <p>
          {planned.toFixed(1)} MT across {plans.length} grades.
          {running ? ` ${grade} is on shift ${running.shift}.` : ""}
        </p>
      </header>
      <div className="cf-plan-kpis">
        <article>
          <CalendarCheck size={16} />
          <span>Planned today</span>
          <strong>{planned.toFixed(1)} MT</strong>
          <em>{plans.length} grades on the sheet</em>
        </article>
        <article>
          <Layers size={16} />
          <span>Running grade</span>
          <strong>{running ? grade : "—"}</strong>
          <em>{running ? `${running.planMt} MT · ${running.form}` : "No plan"}</em>
        </article>
        <article>
          <FlaskConical size={16} />
          <span>Formula</span>
          <strong>{inclusion.toFixed(1)}%</strong>
          <em>{formula.length} ingredients</em>
        </article>
        <article>
          <CalendarCheck size={16} />
          <span>Nutrient targets</span>
          <strong>{nutrients.length}</strong>
          <em>Set for {grade}</em>
        </article>
      </div>
      <div className="cf-plan-board">
        <section>
          <header>
            <h2>Today’s plan</h2>
            <Link to="/production-planning/plan">Open</Link>
          </header>
          <p className="cf-plan-date">{formatSheetDate(today)}</p>
          <ul className="cf-plan-shifts">
            {plans.map((row) => (
              <li key={row.id}>
                <div className="cf-plan-shift-top">
                  <div>
                    <b>Shift {row.shift}</b>
                    <span>{shortProduct(row.product)} · {row.form}</span>
                  </div>
                  <strong>{num(row.planMt).toFixed(2)} MT</strong>
                  <em className={`cf-plan-status is-${row.status.toLowerCase()}`}>{row.status}</em>
                </div>
                {checkBatch(row).mismatch ? (
                  <p className="cf-plan-shift-gap">
                    Batch total {checkBatch(row).batchQty.toFixed(2)} MT · difference {checkBatch(row).gap > 0 ? "+" : ""}
                    {checkBatch(row).gap.toFixed(2)} MT
                  </p>
                ) : null}
                <div className="cf-plan-meter">
                  <i style={{ width: `${(num(row.planMt) / maxPlan) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <header>
            <h2>Released formula</h2>
            <Link to="/production-planning/formulation">Open</Link>
          </header>
          <p className="cf-plan-date">{grade} · inclusion {inclusion.toFixed(1)}%</p>
          <ul className="cf-plan-formula">
            {formula.map((row, index) => (
              <li key={row.id}>
                <span>{materialLabel(row.material)}</span>
                <div>
                  <i style={{ width: `${Math.min(num(row.inclusion), 100)}%` }} data-i={index % 4} />
                </div>
                <b>{num(row.inclusion).toFixed(1)}%</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="cf-plan-board is-equal">
        <section>
          <header>
            <h2>Material requirement</h2>
            <span>{planMt.toFixed(2)} MT</span>
          </header>
          <ul className="cf-plan-need">
            {formula.map((row) => {
              const kg = planMt * num(row.kgPerMt);
              return (
                <li key={row.id}>
                  <span>{materialLabel(row.material)}</span>
                  <div>
                    <i style={{ width: `${(kg / maxNeed) * 100}%` }} />
                  </div>
                  <b>{kg.toFixed(0)} kg</b>
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <header>
            <h2>Nutrient targets</h2>
            <Link to="/production-planning/nutrients">Open</Link>
          </header>
          <ul className="cf-plan-nuts">
            {nutrients.map((row) => (
              <li key={row.id}>
                <span>{row.nutrient}</span>
                <strong>{row.target}%</strong>
                <em>{row.min}–{row.max}</em>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function mt(value: number) {
  return `${value.toFixed(2)} MT`;
}

function batchNote(row: PlanRow) {
  const check = checkBatch(row);
  const parts = [
    `Shift ${row.shift} ${shortProduct(row.product)}: planned ${mt(check.plan)}, batch quantity ${check.count} × ${check.batch.toFixed(2)} = ${mt(check.batchQty)}.`,
  ];
  if (check.mismatch) parts.push(`Difference ${check.gap > 0 ? "+" : ""}${check.gap.toFixed(2)} MT.`);
  if (check.shortFinal) {
    parts.push(
      `${check.fullBatches} full batches cover ${mt(check.fullBatches * check.batch)}. The last ${mt(check.remainder)} is smaller than the ${check.batch.toFixed(2)} MT batch size.`,
    );
  }
  return parts.join(" ");
}

export function DailyPlanPage() {
  const sheet = useRows(listPlans, savePlans);
  const rows = visible(sheet.rows, sheet.date, sheet.search, (row) => [row.shift, shortProduct(row.product), row.form, row.status, row.remarks]);
  const dated = sheet.rows.filter((row) => row.date === sheet.date);
  const planned = dated.reduce((sum, row) => sum + num(row.planMt), 0);
  const batched = dated.reduce((sum, row) => sum + checkBatch(row).batchQty, 0);
  const remaining = dated.reduce((sum, row) => sum + checkBatch(row).remainder, 0);
  const warnings = dated.filter((row) => checkBatch(row).mismatch || checkBatch(row).shortFinal);

  const patch = (id: string, next: Partial<PlanRow>) => {
    let blocked = "";
    const updated = sheet.rows.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...next };
      if ("planMt" in next || "batchMt" in next) {
        const suggested = suggestBatchCount(merged.planMt, merged.batchMt);
        if (suggested) merged.batches = suggested;
      }
      const releasing = (next.status === "Released" || next.status === "Running") && next.status !== row.status;
      if (releasing) {
        const check = checkBatch(merged);
        if (check.mismatch || check.shortFinal) {
          blocked = batchNote(merged);
          return row;
        }
        const formula = approvedFormula(merged.product, merged.date);
        const inclusion = formula.reduce((sum, item) => sum + num(item.inclusion), 0);
        if (!formula.length || Math.abs(inclusion - 100) > 0.05) {
          blocked = `${shortProduct(merged.product)} has no approved 100% formula effective on ${formatSheetDate(merged.date)}. Approve the formula before release.`;
          return row;
        }
      }
      return merged;
    });
    sheet.edit(updated);
    if (blocked) sheet.flash(blocked);
  };

  return (
    <LogSheet
      title="DAILY PLAN"
      icon={<CalendarCheck size={22} strokeWidth={2.2} />}
      note="Batch count fills from the batch size. A short last batch or a total that does not match the plan must be confirmed before save or release."
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Shift, product, status…"
      status={sheet.status}
      empty="No plan rows for this date."
      headers={["Shift", "Product", "Plan MT", "Batch MT", "Batches", "Form", "Status", "Remarks"]}
      rowClass={(row) => (checkBatch(row).mismatch ? "is-bad" : checkBatch(row).shortFinal ? "is-warn" : "")}
      extra={
        <div className="cf-plan-extra">
          <div className="cf-plan-metrics">
            <article>
              <span>Planned</span>
              <strong>{mt(planned)}</strong>
            </article>
            <article>
              <span>Batch quantity</span>
              <strong>{mt(batched)}</strong>
            </article>
            <article>
              <span>Difference</span>
              <strong>{batched - planned > 0 ? "+" : ""}{(batched - planned).toFixed(2)} MT</strong>
            </article>
            <article>
              <span>Remaining in short batches</span>
              <strong>{mt(remaining)}</strong>
            </article>
          </div>
          {warnings.map((row) => (
            <p key={row.id} className={`cf-plan-alert ${checkBatch(row).mismatch ? "is-bad" : "is-warn"}`}>
              {batchNote(row)}
            </p>
          ))}
        </div>
      }
      onAdd={() => {
        const row: PlanRow = {
          id: nextPlanId("PL", sheet.rows),
          date: sheet.date,
          shift: "A",
          product: "cf-700",
          planMt: "",
          batchMt: "",
          batches: "",
          form: "Pellet",
          status: "Draft",
          remarks: "",
        };
        sheet.edit([row, ...sheet.rows]);
        sheet.flash("Row added. Save the sheet to keep it.");
      }}
      onSave={() => {
        if (warnings.length) {
          const text = warnings.map(batchNote).join("\n\n");
          if (!window.confirm(`${text}\n\nSave the plan with these batch warnings?`)) return;
        }
        sheet.commit();
        sheet.flash("Daily plan saved.");
      }}
      render={(row) => (
        <>
          {choiceCell(row.shift, SHIFTS, (shift) => patch(row.id, { shift }))}
          {productCell(row.product, (product) => patch(row.id, { product }))}
          {textCell(row.planMt, (planMt) => patch(row.id, { planMt }), "number")}
          {textCell(row.batchMt, (batchMt) => patch(row.id, { batchMt }), "number")}
          {textCell(row.batches, (batches) => patch(row.id, { batches }), "number")}
          {choiceCell(row.form, FEED_FORMS, (form) => patch(row.id, { form }))}
          {choiceCell(row.status, PLAN_STATUSES, (status) => patch(row.id, { status }))}
          {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
        </>
      )}
    />
  );
}

function formulaKey(row: Pick<FormulaRow, "product" | "version">) {
  return `${row.product}|${row.version || "1"}`;
}

function blankFormula(id: string, date: string): FormulaRow {
  return {
    id,
    date,
    product: "cf-700",
    material: "",
    inclusion: "",
    kgPerMt: "0.0",
    remarks: "",
    version: "1",
    effectiveFrom: date,
    status: "Draft",
  };
}

export function FormulationPage() {
  const sheet = useRows(listFormula, saveFormula);
  const [compareProduct, setCompareProduct] = useState("cf-700");
  const [leftVersion, setLeftVersion] = useState("1");
  const [rightVersion, setRightVersion] = useState("1");
  const rows = visible(sheet.rows, sheet.date, sheet.search, (row) => [
    shortProduct(row.product),
    materialLabel(row.material),
    row.version,
    row.status,
    row.remarks,
  ]);
  const dated = sheet.rows.filter((row) => row.date === sheet.date);
  const problems = formulaProblems(dated);
  const problemById = new Map(problems.map((item) => [item.id, item]));
  const groups = [...dated.reduce((map, row) => {
    const key = formulaKey(row);
    map.set(key, [...(map.get(key) || []), row]);
    return map;
  }, new Map<string, FormulaRow[]>())];
  const versions = [...new Set(dated.filter((row) => row.product === compareProduct).map((row) => row.version || "1"))];
  const history = listApprovals().filter((event) => event.sheet === "formula");

  const patch = (id: string, next: Partial<FormulaRow>) => {
    sheet.edit(
      sheet.rows.map((row) => {
        if (row.id !== id) return row;
        const merged: FormulaRow = { ...row, ...next, status: "Draft" };
        merged.kgPerMt = (num(merged.inclusion) * 10).toFixed(1);
        return merged;
      }),
    );
  };

  const approve = (product: string, version: string) => {
    const group = dated.filter((row) => row.product === product && row.version === version);
    const issues = formulaProblems(group);
    const total = group.reduce((sum, row) => sum + num(row.inclusion), 0);
    if (Math.abs(total - 100) > 0.05 || issues.some((item) => item.missing || item.invalid || item.duplicate)) {
      sheet.flash(`${shortProduct(product)} v${version} must total 100% with no missing, invalid, or duplicate ingredients.`);
      return;
    }
    const next = sheet.rows.map((row) =>
      row.date === sheet.date && row.product === product && row.version === version ? { ...row, status: "Approved" as const } : row,
    );
    sheet.commit(next);
    logApproval({
      sheet: "formula",
      product,
      version,
      action: "Approved",
      note: `${shortProduct(product)} v${version} · ${total.toFixed(1)}% · effective ${formatSheetDate(group[0]?.effectiveFrom || sheet.date)}`,
    });
    sheet.flash(`${shortProduct(product)} v${version} approved.`);
  };

  const revise = (product: string, version: string) => {
    const group = dated.filter((row) => row.product === product && row.version === version);
    const nextVersion = String(
      Math.max(0, ...sheet.rows.filter((row) => row.product === product).map((row) => Number(row.version) || 1)) + 1,
    );
    let pool = sheet.rows;
    const copies = group.map((row) => {
      const id = nextPlanId("FM", pool);
      pool = [...pool, { ...row, id }];
      return { ...row, id, version: nextVersion, status: "Draft" as const, effectiveFrom: sheet.date, date: sheet.date };
    });
    const next = [
      ...copies,
      ...sheet.rows.map((row) =>
        row.date === sheet.date && row.product === product && row.version === version ? { ...row, status: "Superseded" as const } : row,
      ),
    ];
    sheet.commit(next);
    logApproval({ sheet: "formula", product, version: nextVersion, action: "Revised", note: `Copied from v${version}` });
    setCompareProduct(product);
    setLeftVersion(version);
    setRightVersion(nextVersion);
    sheet.flash(`${shortProduct(product)} v${nextVersion} opened as a draft. v${version} is superseded.`);
  };

  const leftRows = dated.filter((row) => row.product === compareProduct && row.version === leftVersion);
  const rightRows = dated.filter((row) => row.product === compareProduct && row.version === rightVersion);
  const materials = [...new Set([...leftRows.map((row) => row.material), ...rightRows.map((row) => row.material)])];
  const changes = materials
    .map((material) => {
      const before = leftRows.filter((row) => row.material === material).reduce((sum, row) => sum + num(row.inclusion), 0);
      const after = rightRows.filter((row) => row.material === material).reduce((sum, row) => sum + num(row.inclusion), 0);
      const beforeHas = leftRows.some((row) => row.material === material);
      const afterHas = rightRows.some((row) => row.material === material);
      return { material, before, after, beforeHas, afterHas, changed: !beforeHas || !afterHas || Math.abs(before - after) > 0.05 };
    })
    .filter((row) => row.changed);

  return (
    <LogSheet
      title="FORMULATION"
      icon={<Layers size={22} strokeWidth={2.2} />}
      note="kg/MT is inclusion % × 10. A grade can be released only after its formula is approved at 100%."
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Product or material…"
      status={sheet.status}
      empty="No formula rows for this date."
      headers={["Product", "Version", "Effective", "Material", "Inclusion %", "kg / MT", "Status", "Remarks"]}
      rowClass={(row) => {
        const issue = problemById.get(row.id);
        if (issue?.missing || issue?.invalid || issue?.duplicate) return "is-bad";
        const group = dated.filter((item) => formulaKey(item) === formulaKey(row));
        const total = group.reduce((sum, item) => sum + num(item.inclusion), 0);
        return Math.abs(total - 100) > 0.05 ? "is-warn" : "";
      }}
      extra={
        <div className="cf-plan-extra">
          {groups.map(([key, group]) => {
            const total = group.reduce((sum, row) => sum + num(row.inclusion), 0);
            const issues = formulaProblems(group);
            const bad = issues.some((item) => item.missing || item.invalid || item.duplicate);
            const balanced = Math.abs(total - 100) <= 0.05 && !bad;
            const [product, version] = key.split("|");
            const analysis = analyseFormula(group);
            const targets = listNutrients().filter((row) => row.date === sheet.date && row.product === product);
            return (
              <section key={key} className="cf-plan-block">
                <div className="cf-plan-metrics">
                  <article>
                    <span>{shortProduct(product)} v{version}</span>
                    <strong className={balanced ? "is-ok" : "is-bad"}>{total.toFixed(1)}%</strong>
                  </article>
                  <article>
                    <span>Status</span>
                    <strong>{group[0]?.status}</strong>
                  </article>
                  <article>
                    <span>Effective</span>
                    <strong>{formatSheetDate(group[0]?.effectiveFrom || sheet.date)}</strong>
                  </article>
                </div>
                <p className={`cf-plan-alert ${balanced ? "is-ok" : "is-bad"}`}>
                  {balanced
                    ? "Inclusion totals 100%. kg/MT follows inclusion % × 10."
                    : bad
                      ? "Missing ingredients, duplicates, or an inclusion outside 0–100% are highlighted."
                      : `Inclusion is ${total.toFixed(1)}%. It must be 100% before approval.`}
                </p>
                {analysis.length && targets.length ? (
                  <ul className="cf-plan-compare">
                    {targets.map((target) => {
                      const found = analysis.find((item) => item.nutrient === target.nutrient);
                      const value = found?.value ?? 0;
                      const inside = value + 0.05 >= num(target.min) && value - 0.05 <= num(target.max);
                      return (
                        <li key={target.id}>
                          <span>{target.nutrient}</span>
                          <b>{value.toFixed(2)}{target.unit || "%"}</b>
                          <em className={inside ? "is-ok" : "is-bad"}>
                            {inside ? "Inside" : "Outside"} {target.min}–{target.max}
                          </em>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                <div className="cf-plan-actions">
                  <button type="button" onClick={() => approve(product, version)}>Approve</button>
                  <button type="button" onClick={() => revise(product, version)}>New version</button>
                </div>
              </section>
            );
          })}
          <section className="cf-plan-block">
            <div className="cf-plan-actions">
              <label>
                Compare
                <SheetSelect
                  compact
                  value={compareProduct}
                  options={FEED_PRODUCTS.map((item) => ({ value: item.value, label: shortProduct(item.value) }))}
                  onChange={setCompareProduct}
                />
              </label>
              <label>
                From
                <SheetSelect compact value={leftVersion} options={versions.map((item) => ({ value: item, label: `v${item}` }))} onChange={setLeftVersion} />
              </label>
              <label>
                To
                <SheetSelect compact value={rightVersion} options={versions.map((item) => ({ value: item, label: `v${item}` }))} onChange={setRightVersion} />
              </label>
            </div>
            {leftVersion === rightVersion ? (
              <p className="cf-plan-alert">Choose two versions to see ingredient and inclusion changes.</p>
            ) : changes.length === 0 ? (
              <p className="cf-plan-alert is-ok">No ingredient or percentage changes between these versions.</p>
            ) : (
              <ul className="cf-plan-compare">
                {changes.map((row) => (
                  <li key={row.material || "blank"}>
                    <span>{row.material ? materialLabel(row.material) : "Missing material"}</span>
                    <b>{row.beforeHas ? `${row.before.toFixed(1)}%` : "—"}</b>
                    <em>{row.afterHas ? `${row.after.toFixed(1)}%` : "Removed"}</em>
                  </li>
                ))}
              </ul>
            )}
            {history.length ? (
              <ul className="cf-plan-history">
                {history.slice(0, 6).map((event) => (
                  <li key={event.id}>
                    {shortProduct(event.product)} v{event.version} · {event.action} · {event.note}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      }
      onAdd={() => {
        sheet.edit([blankFormula(nextPlanId("FM", sheet.rows), sheet.date), ...sheet.rows]);
        sheet.flash("Draft row added. Save the sheet to keep it.");
      }}
      onSave={() => {
        const bad = formulaProblems(dated).some((item) => item.missing || item.invalid || item.duplicate);
        const off = groups.some(([, group]) => Math.abs(group.reduce((sum, row) => sum + num(row.inclusion), 0) - 100) > 0.05);
        if ((bad || off) && !window.confirm("Some grades are not at 100% or have invalid rows. Save anyway?")) return;
        sheet.commit();
        sheet.flash("Formula saved.");
      }}
      render={(row) => {
        const issue = problemById.get(row.id);
        return (
          <>
            {productCell(row.product, (product) => patch(row.id, { product }))}
            <td><input className="cf-cell" readOnly value={`v${row.version || "1"}`} /></td>
            <td>
              <SheetDatePicker value={row.effectiveFrom || row.date} onChange={(effectiveFrom) => patch(row.id, { effectiveFrom })} />
            </td>
            {materialCell(row.material, (material) => patch(row.id, { material }))}
            {textCell(row.inclusion, (inclusion) => patch(row.id, { inclusion }), "number")}
            <td>
              <input className="cf-cell" readOnly value={(num(row.inclusion) * 10).toFixed(1)} title="Inclusion % × 10" />
            </td>
            <td>
              <input
                className="cf-cell"
                readOnly
                value={issue?.duplicate ? "Duplicate" : issue?.missing ? "Missing" : issue?.invalid ? "Invalid" : row.status}
              />
            </td>
            {textCell(row.remarks, (remarks) => patch(row.id, { remarks }))}
          </>
        );
      }}
    />
  );
}

function blankNutrient(id: string, date: string): NutrientRow {
  const spec = specFor("cf-700", "Crude protein");
  return {
    id,
    date,
    product: "cf-700",
    nutrient: "Crude protein",
    target: spec?.target || "",
    min: spec?.min || "",
    max: spec?.max || "",
    unit: spec?.unit || "%",
    basis: spec?.basis || "As-fed",
    mandatory: spec?.mandatory || "Yes",
    status: "Draft",
    version: "1",
  };
}

export function NutrientSpecPage() {
  const sheet = useRows(listNutrients, saveNutrients);
  const rows = visible(sheet.rows, sheet.date, sheet.search, (row) => [shortProduct(row.product), row.nutrient, row.basis, row.unit]);
  const dated = sheet.rows.filter((row) => row.date === sheet.date);
  const products = [...new Set(dated.map((row) => row.product))];
  const history = listApprovals().filter((event) => event.sheet === "nutrient");

  const patch = (id: string, next: Partial<NutrientRow>) => {
    sheet.edit(
      sheet.rows.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...next };
        if (next.product || next.nutrient) {
          const spec = specFor(merged.product, merged.nutrient);
          if (spec) {
            merged.unit = spec.unit;
            merged.basis = spec.basis;
            merged.mandatory = spec.mandatory;
            merged.target = spec.target;
            merged.min = spec.min;
            merged.max = spec.max;
          }
        }
        merged.status = nutrientIssue(merged) === "ok" ? row.status : "Draft";
        return merged;
      }),
    );
  };

  const approve = (product: string) => {
    const group = dated.filter((row) => row.product === product);
    if (group.some((row) => nutrientIssue(row) === "order")) {
      sheet.flash("Each row needs minimum ≤ target ≤ maximum before approval.");
      return;
    }
    const missing = mandatoryMissing(product, group);
    if (missing.length) {
      sheet.flash(`${shortProduct(product)} is missing mandatory nutrients: ${missing.map((row) => row.nutrient).join(", ")}.`);
      return;
    }
    const card = nutrientCard().filter((row) => row.product !== product);
    saveNutrientCard([
      ...card,
      ...group.map((row) => ({
        product,
        nutrient: row.nutrient,
        target: row.target,
        min: row.min,
        max: row.max,
        unit: row.unit || "%",
        basis: row.basis || "As-fed",
        mandatory: row.mandatory || "No",
      })),
    ]);
    sheet.commit(sheet.rows.map((row) => (row.date === sheet.date && row.product === product ? { ...row, status: "Approved" } : row)));
    logApproval({ sheet: "nutrient", product, version: "1", action: "Approved", note: `${shortProduct(product)} specification` });
    sheet.flash(`${shortProduct(product)} specification approved.`);
  };

  return (
    <LogSheet
      title="NUTRIENT TARGETS"
      icon={<FlaskConical size={22} strokeWidth={2.2} />}
      note="Minimum must sit at or below the target, and the target at or below the maximum. Values are checked against the approved grade card."
      rows={rows}
      date={sheet.date}
      savedDates={sheet.savedDates}
      onDateChange={sheet.setDate}
      search={sheet.search}
      onSearch={sheet.setSearch}
      placeholder="Product or nutrient…"
      status={sheet.status}
      empty="No nutrient rows for this date."
      headers={["Product", "Nutrient", "Unit", "Basis", "Mandatory", "Target", "Min", "Max", "Check"]}
      rowClass={(row) => (nutrientIssue(row) === "order" ? "is-bad" : nutrientIssue(row) === "off-card" ? "is-warn" : "")}
      extra={
        <div className="cf-plan-extra">
          {products.map((product) => {
            const missing = mandatoryMissing(product, dated.filter((row) => row.product === product));
            const formula = approvedFormula(product, sheet.date);
            const analysis = analyseFormula(formula.length ? formula : listFormula().filter((row) => row.date === sheet.date && row.product === product && row.status !== "Superseded"));
            const targets = dated.filter((row) => row.product === product);
            return (
              <section key={product} className="cf-plan-block">
                <div className="cf-plan-metrics">
                  <article>
                    <span>{shortProduct(product)}</span>
                    <strong>{targets.filter((row) => row.mandatory === "Yes").length} mandatory</strong>
                  </article>
                  <article>
                    <span>Card</span>
                    <strong>{nutrientCard().some((row) => row.product === product) ? "Approved spec on file" : "No approved spec"}</strong>
                  </article>
                </div>
                {missing.length ? (
                  <p className="cf-plan-alert is-bad">
                    Mandatory and not on the sheet: {missing.map((row) => row.nutrient).join(", ")}.
                  </p>
                ) : (
                  <p className="cf-plan-alert is-ok">Mandatory nutrients for this grade are on the sheet.</p>
                )}
                {analysis.length ? (
                  <ul className="cf-plan-compare">
                    {targets.map((target) => {
                      const found = analysis.find((item) => item.nutrient === target.nutrient);
                      if (!found) return null;
                      const inside = found.value + 0.05 >= num(target.min) && found.value - 0.05 <= num(target.max);
                      return (
                        <li key={target.id}>
                          <span>{target.nutrient} from formula</span>
                          <b>{found.value.toFixed(2)} {target.unit || "%"}</b>
                          <em className={inside ? "is-ok" : "is-bad"}>
                            {inside ? "Meets" : "Misses"} {target.min}–{target.max} {target.basis || "As-fed"}
                          </em>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="cf-plan-alert">No formula for this grade on this date, so there is nothing to compare.</p>
                )}
                <div className="cf-plan-actions">
                  <button type="button" onClick={() => approve(product)}>Approve specification</button>
                </div>
              </section>
            );
          })}
          {history.length ? (
            <ul className="cf-plan-history">
              {history.slice(0, 6).map((event) => (
                <li key={event.id}>{shortProduct(event.product)} · {event.action} · {event.note}</li>
              ))}
            </ul>
          ) : null}
        </div>
      }
      onAdd={() => {
        sheet.edit([blankNutrient(nextPlanId("NT", sheet.rows), sheet.date), ...sheet.rows]);
        sheet.flash("Row added from the approved card. Save the sheet to keep it.");
      }}
      onSave={() => {
        const broken = dated.some((row) => nutrientIssue(row) === "order");
        if (broken && !window.confirm("Some rows have minimum, target, and maximum out of order. Save anyway?")) return;
        sheet.commit();
        sheet.flash("Nutrient targets saved.");
      }}
      render={(row) => {
        const issue = nutrientIssue(row);
        const label = issue === "order" ? "Min ≤ target ≤ max" : issue === "off-card" ? "Differs from approved card" : row.status;
        return (
          <>
            {productCell(row.product, (product) => patch(row.id, { product }))}
            {choiceCell(row.nutrient, NUTRIENT_NAMES, (nutrient) => patch(row.id, { nutrient }))}
            {choiceCell(row.unit || "%", NUTRIENT_UNITS, (unit) => patch(row.id, { unit }))}
            {choiceCell(row.basis || "As-fed", NUTRIENT_BASIS, (basis) => patch(row.id, { basis }))}
            {choiceCell(row.mandatory || "No", YES_NO, (mandatory) => patch(row.id, { mandatory }))}
            {textCell(row.target, (target) => patch(row.id, { target }), "number")}
            {textCell(row.min, (min) => patch(row.id, { min }), "number")}
            {textCell(row.max, (max) => patch(row.id, { max }), "number")}
            <td><input className="cf-cell" readOnly value={label} /></td>
          </>
        );
      }}
    />
  );
}
