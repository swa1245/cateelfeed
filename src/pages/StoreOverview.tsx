import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SheetSelect } from "@/components/SheetSelect";
import { Boxes, Package, Warehouse } from "lucide-react";
import {
  PARAM_SUMMARY,
  RECENT_MOVES,
  STOCK_TREND,
  STORE_A_LAYOUT,
  STORE_ALERTS,
  STORE_RACKS,
  STORE_TOTALS,
  TREND_CALLOUT,
  type LayoutCell,
  type RackStatus,
  type StoreId,
} from "@/data/store";

const STORES: StoreId[] = ["A", "B", "C"];

function statusClass(status: RackStatus) {
  if (status === "Low Stock") return "cf-store-tag is-low";
  if (status === "Empty") return "cf-store-tag is-empty";
  if (status === "Reserved") return "cf-store-tag is-hold";
  if (status === "Overflow") return "cf-store-tag is-over";
  return "cf-store-tag is-ok";
}

const RACK_HUE: Record<string, string> = {
  DDGS: "#1f9d4e",
  "Maize (Corn)": "#e0a106",
  "Soybean Meal": "#3d74c4",
  "Wheat Bran": "#d97706",
  "Rice Bran": "#0f9f6e",
  Limestone: "#c4a35a",
  "DCP (Dicalcium Phosphate)": "#3d74c4",
  Salt: "#d97706",
  "Vitamin Premix": "#e0a106",
  Methionine: "#1f9d4e",
};

function layoutFor(store: StoreId): { row: string; cells: LayoutCell[] }[] {
  if (store === "A") return STORE_A_LAYOUT;
  const racks = STORE_RACKS[store].filter((row) => row.stockMt != null);
  const rows: { row: string; cells: LayoutCell[] }[] = [];
  for (let index = 0; index < racks.length; index += 5) {
    rows.push({
      row: `Row ${rows.length + 1}`,
      cells: racks.slice(index, index + 5).map((row) => ({
        rack: row.rack,
        label: row.material,
        stock: `${row.stockMt?.toFixed(1)} MT`,
        tone: row.status === "Low Stock" ? "low" : "ok",
      })),
    });
  }
  return rows;
}

function TrendChart() {
  const width = 460;
  const height = 168;
  const pad = { l: 36, r: 12, t: 14, b: 34 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const max = 140;
  const slot = plotW / STOCK_TREND.length;
  const x = (index: number) => pad.l + slot * index + slot / 2;
  const yMt = (mt: number) => pad.t + plotH - (mt / max) * plotH;
  const maxBags = Math.max(...STOCK_TREND.map((point) => point.bags));
  const line = STOCK_TREND.map((point, index) => `${x(index)},${yMt(point.mt)}`).join(" ");
  const ticks = [0, 20, 40, 60, 80, 100, 120, 140];

  return (
    <svg className="cf-store-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="DDGS stock in MT and bags, 02 Sep to 08 Sep">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={yMt(tick)} y2={yMt(tick)} stroke="#94a3b8" />
          <text x={pad.l - 6} y={yMt(tick) + 4} textAnchor="end">{tick}</text>
        </g>
      ))}
      {STOCK_TREND.map((point, index) => {
        const barH = (point.bags / maxBags) * plotH;
        return (
          <rect
            key={point.day}
            x={x(index) - 8}
            y={pad.t + plotH - barH}
            width={16}
            height={barH}
            rx={3}
            fill="#7eb0e8"
          />
        );
      })}
      <polyline points={line} fill="none" stroke="#1f9d4e" strokeWidth="2.5" strokeLinejoin="round" />
      {STOCK_TREND.map((point, index) => (
        <circle key={`${point.day}-dot`} cx={x(index)} cy={yMt(point.mt)} r="5" fill="#fff" stroke="#15803d" strokeWidth="2.5" />
      ))}
      {STOCK_TREND.map((point, index) => (
        <text key={`${point.day}-label`} x={x(index)} y={height - 10} textAnchor="middle">{point.day}</text>
      ))}
    </svg>
  );
}

export function StoreOverviewPage() {
  const [store, setStore] = useState<StoreId>("A");
  const [material, setMaterial] = useState("All");
  const [query, setQuery] = useState("");
  const racks = STORE_RACKS[store];
  const materials = useMemo(
    () => ["All", ...Array.from(new Set(racks.filter((row) => row.stockMt != null).map((row) => row.material)))],
    [racks],
  );
  const visible = racks.filter((row) => {
    if (row.stockMt == null) return false;
    if (material !== "All" && row.material !== material) return false;
    const hay = `${row.rack} ${row.material} ${row.supplier}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const layout = layoutFor(store);

  return (
    <div className="cf-page cf-sheet-page cf-store">
      <header className="cf-page-head">
        <h1>Warehouse / Store Overview</h1>
        <p>Inventory · Warehouse / Store</p>
      </header>

      <div className="cf-store-top">
        <div className="cf-store-metrics">
          <section className="cf-store-kpis">
            <article>
              <Warehouse size={18} />
              <span>Total Stores</span>
              <strong>3</strong>
              <em>A · B · C</em>
            </article>
            <article>
              <Boxes size={18} />
              <span>Total Stock (MT)</span>
              <strong>1,248.6 MT</strong>
              <em className="is-up">↑ 12.4% vs last week</em>
            </article>
            <article>
              <Package size={18} />
              <span>Total Bags</span>
              <strong>48,792</strong>
              <em className="is-up">↑ 10.8% vs last week</em>
            </article>
          </section>
          <section className="cf-prod-panel cf-store-summary">
            <header>
              <h2>Store wise stock summary</h2>
            </header>
            <div className="cf-store-shares">
              {STORE_TOTALS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={store === item.id ? "is-on" : ""}
                  onClick={() => {
                    setStore(item.id);
                    setMaterial("All");
                  }}
                >
                  <i className={`cf-store-mark is-${item.id.toLowerCase()}`}>{item.id}</i>
                  <span>
                    <b>Store {item.id}</b>
                    <strong>{item.stockMt.toFixed(1)} MT</strong>
                    <em>({item.share.toFixed(1)}%)</em>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <section className="cf-prod-panel cf-store-alerts-panel">
          <header>
            <h2>Low stock / alerts</h2>
          </header>
          <ul className="cf-store-alerts">
            {STORE_ALERTS.map((item) => (
              <li key={item.material}>
                <strong>{item.material}</strong>
                <em>{item.ago}</em>
                <span>{item.place} · {item.note}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="cf-prod-panel">
        <header className="cf-store-rack-head">
          <div>
            <h2>Store {store} — rack details</h2>
          </div>
          <div className="cf-store-filters">
            <SheetSelect
              compact
              value={material}
              placeholder="All Materials"
              options={materials.map((item) => ({
                value: item,
                label: item === "All" ? "All Materials" : item,
              }))}
              onChange={setMaterial}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search material / supplier / rack…"
            />
          </div>
        </header>
        <div className="cf-store-tabs">
          {STORES.map((id) => (
            <button key={id} type="button" className={store === id ? "is-on" : ""} onClick={() => { setStore(id); setMaterial("All"); }}>
              Store {id}
            </button>
          ))}
        </div>
        <div className="cf-sheet-scroll">
          <table className="cf-ledger cf-store-table">
            <thead>
              <tr>
                <th rowSpan={2}>Rack No.</th>
                <th rowSpan={2}>Material</th>
                <th rowSpan={2}>Current Stock (MT)</th>
                <th rowSpan={2}>No. of Bags</th>
                <th rowSpan={2}>Supplier</th>
                <th rowSpan={2}>Purity / Grade</th>
                <th colSpan={3}>Key Parameters</th>
                <th rowSpan={2}>Last Inward Date</th>
                <th rowSpan={2}>Expiry Date</th>
                <th rowSpan={2}>Status</th>
              </tr>
              <tr>
                <th>CP %</th>
                <th>Fat %</th>
                <th>Moisture %</th>
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((row) => (
                  <tr key={row.rack}>
                    <td>
                      <i className="cf-rack-dot" style={{ background: RACK_HUE[row.material] || "#9a3412" }} />
                      {row.rack}
                    </td>
                    <td>{row.material}</td>
                    <td>{row.stockMt?.toFixed(1)}</td>
                    <td>{row.bags?.toLocaleString("en-IN")}</td>
                    <td>{row.supplier}</td>
                    <td>{row.grade === "—" ? "" : row.grade}</td>
                    <td>{row.cp}</td>
                    <td>{row.fat}</td>
                    <td>{row.moisture}</td>
                    <td>{row.inward}</td>
                    <td>{row.expiry === "—" ? "" : row.expiry}</td>
                    <td><span className={statusClass(row.status)}>{row.status}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12}>No racks match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cf-store-board">
        <section className="cf-prod-panel">
          <header>
            <h2>Store {store} — rack layout</h2>
          </header>
          <div className="cf-store-legend">
            <span className="is-ok">In Stock</span>
            <span className="is-low">Low Stock</span>
            <span className="is-out">Out of Stock</span>
          </div>
          <div className="cf-store-rows">
            {layout.map((line) => (
              <div key={line.row} className="cf-store-row">
                <p>{line.row}</p>
                {line.cells.map((item) => (
                  <article key={item.rack} className={`is-${item.tone}`}>
                    <b>{item.rack}</b>
                    <strong>{item.label}</strong>
                    {item.stock ? <span>{item.stock}</span> : null}
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>
        <div className="cf-store-col">
          <section className="cf-prod-panel">
            <header className="cf-store-trend-head">
              <div>
                <h2>Material stock trend (last 7 days)</h2>
              </div>
              <span className="cf-store-chip">{TREND_CALLOUT.material}</span>
            </header>
            <div className="cf-store-trend">
              <div>
                <div className="cf-store-key">
                  <span className="is-line">Stock (MT)</span>
                  <span className="is-bar">Bags</span>
                </div>
                <TrendChart />
              </div>
              <aside>
                <span>Current stock</span>
                <strong>{TREND_CALLOUT.currentMt}</strong>
                <em>{TREND_CALLOUT.bags}</em>
                <span>Min. level <b>{TREND_CALLOUT.minLevel}</b></span>
                <span>Reorder level <b>{TREND_CALLOUT.reorderLevel}</b></span>
              </aside>
            </div>
          </section>
          <section className="cf-prod-panel">
            <header>
              <h2>Material wise parameter summary</h2>
            </header>
            <table className="cf-ledger">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>CP %</th>
                  <th>Fat %</th>
                  <th>Moisture %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PARAM_SUMMARY.map((row) => (
                  <tr key={row.material}>
                    <td>{row.material}</td>
                    <td>{row.cp}</td>
                    <td>{row.fat}</td>
                    <td>{row.moisture}</td>
                    <td><span className="cf-store-tag is-ok">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
        <div className="cf-store-col">
          <section className="cf-prod-panel">
            <header>
              <h2>Quick actions</h2>
            </header>
            <div className="cf-store-actions">
              <Link to="/warehouse-store/reports">View stock report</Link>
              <Link to="/production/raw-material">Material issue</Link>
              <Link to="/inward-outward/gate-entry">Add new inward</Link>
              <Link to="/warehouse-store/reports">Generate purchase requisition</Link>
            </div>
          </section>
          <section className="cf-prod-panel">
            <header className="cf-ledger-head">
              <h2>Recent movements</h2>
              <Link to="/warehouse-store/stock-movements">View all</Link>
            </header>
            <ul className="cf-store-moves">
              {RECENT_MOVES.map((item) => (
                <li key={item.title} className={item.tone}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
