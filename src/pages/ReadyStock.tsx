import { useMemo, useState } from "react";
import { PackageCheck, Search, X } from "lucide-react";
import { SheetSelect } from "@/components/SheetSelect";
import { listBatches } from "@/data/production";
import { productLabel } from "@/data/movements";
import {
  loadReadyStock,
  loadWarehouseStorage,
  saveReadyStock,
  saveWarehouseStorage,
  type RackLot,
  type ReadyStockRow,
} from "@/data/warehouse";

function tons(value: number) {
  return `${value.toFixed(1)} t`;
}

function nextId(rows: { id: string }[]) {
  const n = rows.reduce((max, row) => {
    const num = Number(String(row.id).split("-")[1]);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return `RS-${n + 1}`;
}

export function ReadyStockPage() {
  const [rows, setRows] = useState<ReadyStockRow[]>(loadReadyStock);
  const [storage, setStorage] = useState(loadWarehouseStorage);
  const [product, setProduct] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [batchNo, setBatchNo] = useState("");
  const [rackId, setRackId] = useState("");
  const [notice, setNotice] = useState("");

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const finishedHouse = storage.warehouses.find((house) => house.id === "WH-3") || storage.warehouses[storage.warehouses.length - 1];
  const racks = storage.racks.filter((rack) => rack.warehouseId === finishedHouse?.id);
  const products = [...new Set(rows.map((row) => row.product))].sort((a, b) => a.localeCompare(b));

  const completed = useMemo(() => {
    const taken = new Set(rows.map((row) => row.batchNo));
    return listBatches().filter((batch) => batch.status === "Completed" && batch.batchNo && !taken.has(batch.batchNo));
  }, [rows, open]);

  const visible = rows
    .filter((row) => {
      if (product && row.product !== product) return false;
      if (status && row.status !== status) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      const rack = racks.find((item) => item.id === row.rackId);
      return [row.batchNo, row.product, row.date, row.status, rack?.name].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.batchNo.localeCompare(a.batchNo));

  const ready = rows.filter((row) => row.status === "Ready");
  const held = rows.filter((row) => row.status === "Held");
  const readyTon = ready.reduce((sum, row) => sum + row.qtyTon, 0);
  const readyBags = ready.reduce((sum, row) => sum + row.bags, 0);
  const heldTon = held.reduce((sum, row) => sum + row.qtyTon, 0);

  const byProduct = [...ready.reduce((map, row) => {
    map.set(row.product, (map.get(row.product) || 0) + row.qtyTon);
    return map;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const maxProduct = Math.max(1, ...byProduct.map(([, qty]) => qty));

  const chosen = completed.find((batch) => batch.batchNo === batchNo);
  const chosenQty = Number(chosen?.producedMt || chosen?.qtyMt || 0);

  const receive = () => {
    if (!chosen) {
      flash("Choose a completed batch.");
      return;
    }
    const rack = racks.find((item) => item.id === rackId);
    if (!rack) {
      flash("Choose a rack in the finished feed warehouse.");
      return;
    }
    const used = storage.lots.filter((lot) => lot.rackId === rack.id).reduce((sum, lot) => sum + lot.qtyTon, 0);
    const free = rack.capacityTon - used;
    if (chosenQty > free + 0.001) {
      flash(`${rack.name} has only ${tons(Math.max(0, free))} free.`);
      return;
    }
    const row: ReadyStockRow = {
      id: nextId(rows),
      date: chosen.date,
      batchNo: chosen.batchNo,
      product: productLabel(chosen.product).split("—")[0].trim() || chosen.product,
      qtyTon: chosenQty,
      bags: Number(chosen.bags) || 0,
      rackId: rack.id,
      status: "Ready",
    };
    const lot: RackLot = {
      id: `LT-R${row.id}`,
      rackId: rack.id,
      material: row.product,
      lot: chosen.batchNo,
      qtyTon: chosenQty,
    };
    const nextRows = [row, ...rows];
    const nextStorage = { ...storage, lots: [...storage.lots, lot] };
    saveReadyStock(nextRows);
    saveWarehouseStorage(nextStorage);
    setRows(nextRows);
    setStorage(nextStorage);
    setOpen(false);
    setBatchNo("");
    setRackId("");
    flash(`${row.batchNo} is ready in ${rack.name}.`);
  };

  return (
    <div className="cf-page cf-wh-log cf-rackx">
      <header className="cf-rackx-hero">
        <div>
          <p>Warehouse / Store</p>
          <h1>Production ready stock</h1>
          <p>Finished feed after production. Ready batches sit in the finished feed warehouse until dispatch.</p>
        </div>
        <div className="cf-rackx-actions">
          <button type="button" className="is-solid" onClick={() => setOpen(true)}>
            <PackageCheck size={16} />
            Receive from production
          </button>
        </div>
      </header>

      {notice ? <p className="cf-rackx-flash">{notice}</p> : null}

      <section className="cf-rackx-kpis">
        <article><span>Ready</span><strong>{tons(readyTon)}</strong></article>
        <article><span>Bags</span><strong>{readyBags}</strong></article>
        <article><span>Batches</span><strong>{ready.length}</strong></article>
        <article><span>Held</span><strong>{tons(heldTon)}</strong></article>
        <article><span>Warehouse</span><strong>{finishedHouse?.name || "—"}</strong></article>
      </section>

      <section className="cf-rackx-filters">
        <label>
          <span>Product</span>
          <SheetSelect
            value={product}
            placeholder="All products"
            options={[{ value: "", label: "All products" }, ...products.map((name) => ({ value: name, label: name }))]}
            onChange={setProduct}
          />
        </label>
        <label>
          <span>Status</span>
          <SheetSelect
            value={status}
            placeholder="All"
            options={[
              { value: "", label: "All" },
              { value: "Ready", label: "Ready" },
              { value: "Held", label: "Held" },
            ]}
            onChange={setStatus}
          />
        </label>
        <label className="cf-rackx-search">
          <span>Search</span>
          <span>
            <Search size={15} />
            <input value={search} placeholder="Batch, product, rack…" onChange={(event) => setSearch(event.target.value)} />
          </span>
        </label>
      </section>

      <section className="cf-rackx-house">
        <header>
          <div>
            <p>Ready by product</p>
            <h2>After production</h2>
          </div>
        </header>
        <div className="cf-ready-bars">
          {byProduct.length === 0 ? <p className="cf-rackx-empty">No ready stock yet.</p> : null}
          {byProduct.map(([name, qty]) => (
            <div key={name}>
              <span>{name}</span>
              <i><b style={{ width: `${(qty / maxProduct) * 100}%` }} /></i>
              <strong>{tons(qty)}</strong>
            </div>
          ))}
        </div>
        <div className="cf-sheet-scroll">
          <table className="cf-sheet-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Batch</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Bags</th>
                <th>Rack</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td className="cf-sheet-empty" colSpan={7}>No production-ready stock matches these filters.</td>
                </tr>
              ) : (
                visible.map((row) => {
                  const rack = storage.racks.find((item) => item.id === row.rackId);
                  return (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.batchNo}</td>
                      <td>{row.product}</td>
                      <td>{tons(row.qtyTon)}</td>
                      <td>{row.bags}</td>
                      <td>{rack?.name || "—"}</td>
                      <td>{row.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {open ? (
        <div
          className="cf-rackx-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section className="cf-rackx-place" role="dialog" aria-modal="true" aria-labelledby="cf-ready-title">
            <header className="cf-rackx-modal-head">
              <div>
                <p>After production</p>
                <h2 id="cf-ready-title">Receive finished feed</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </header>
            <form
              className="cf-rackx-form"
              onSubmit={(event) => {
                event.preventDefault();
                receive();
              }}
            >
              <label>
                <span>Completed batch</span>
                <SheetSelect
                  value={batchNo}
                  placeholder="Select batch"
                  options={completed.map((batch) => ({
                    value: batch.batchNo,
                    label: `${batch.batchNo} · ${productLabel(batch.product).split("—")[0].trim()} · ${batch.producedMt || batch.qtyMt} t`,
                  }))}
                  onChange={setBatchNo}
                />
              </label>
              <label>
                <span>Rack</span>
                <SheetSelect
                  value={rackId}
                  placeholder="Finished warehouse rack"
                  options={racks.map((rack) => {
                    const used = storage.lots.filter((lot) => lot.rackId === rack.id).reduce((sum, lot) => sum + lot.qtyTon, 0);
                    return { value: rack.id, label: `${rack.name} · ${tons(Math.max(0, rack.capacityTon - used))} free` };
                  })}
                  onChange={setRackId}
                />
              </label>
              <button type="submit">Keep as ready stock</button>
            </form>
            {completed.length === 0 ? <p className="cf-rackx-empty">Every completed batch is already in ready stock.</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
