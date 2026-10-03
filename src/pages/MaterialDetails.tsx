import { useEffect, useMemo, useState } from "react";
import { Box, LayoutGrid, List, Package, Pencil, Plus, Rows3, Search, Trash2, Warehouse, X } from "lucide-react";
import { SheetSelect } from "@/components/SheetSelect";
import {
  loadWarehouseStorage,
  saveWarehouseStorage,
  type RackLot,
  type StorageRack,
  type Warehouse as WarehouseRow,
  type WarehouseStorage,
} from "@/data/warehouse";

const COLORS = ["#9a3412", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#a16207", "#db2777", "#4f46e5", "#ea580c"];

type SpaceFilter = "all" | "free" | "tight" | "empty" | "over";

function materialColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function tons(value: number) {
  return `${value.toFixed(1)} t`;
}

function nextId(prefix: string, ids: string[]) {
  const n = ids.reduce((max, id) => {
    const num = Number(String(id).split("-")[1]);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return `${prefix}-${n + 1}`;
}

function occupiedOf(lots: RackLot[], rackId: string) {
  return lots.filter((lot) => lot.rackId === rackId).reduce((sum, lot) => sum + lot.qtyTon, 0);
}

function SpacePie({
  capacity,
  lots,
  highlight,
  small,
}: {
  capacity: number;
  lots: RackLot[];
  highlight?: string;
  small?: boolean;
}) {
  const used = lots.reduce((sum, lot) => sum + lot.qtyTon, 0);
  const total = Math.max(capacity, used, 0.001);
  const free = Math.max(0, capacity - used);
  const pct = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
  const slices = [
    ...lots.map((lot) => ({
      key: lot.id,
      value: lot.qtyTon,
      color: materialColor(lot.material),
      dim: Boolean(highlight && lot.material !== highlight),
      name: lot.material,
      lot: lot.lot,
    })),
    ...(free > 0.001 ? [{ key: "free", value: free, color: "#86efac", dim: false, name: "Free", lot: "" }] : []),
  ];
  let cursor = 0;
  const paths = slices.map((slice) => {
    const start = cursor;
    const sweep = (slice.value / total) * 360;
    cursor += sweep;
    const share = Math.round((slice.value / total) * 100);
    return { ...slice, start, sweep, share };
  });
  const chart = (
    <svg className={small ? "cf-pie is-sm" : "cf-pie"} viewBox="0 0 200 200" role="img" aria-label={`${pct}% full`}>
      {paths.map((slice) => {
        const [lx, ly] = slice.sweep >= 359.9
          ? [100, 100]
          : sliceLabelPoint(100, 100, 96, slice.start, slice.sweep);
        const showName = !small && slice.sweep >= 28;
        return (
          <g key={slice.key} opacity={slice.dim ? 0.35 : 1}>
            {slice.sweep >= 359.9 ? (
              <circle cx="100" cy="100" r="96" fill={slice.color} />
            ) : (
              <path d={pieSlice(100, 100, 96, slice.start, slice.start + slice.sweep)} fill={slice.color} stroke="#fff" strokeWidth="3" />
            )}
            <title>{`${slice.name}${slice.lot ? ` ${slice.lot}` : ""} ${tons(slice.value)}`}</title>
            {showName ? (
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={slice.key === "free" ? "#374151" : "#fff"} fontSize="8" fontWeight="700">
                <tspan x={lx} dy="-0.55em">{slice.name}</tspan>
                <tspan x={lx} dy="1.15em">{slice.lot ? `${slice.lot} · ` : ""}{tons(slice.value)}</tspan>
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
  return chart;
}

function sliceLabelPoint(cx: number, cy: number, radius: number, start: number, sweep: number) {
  const mid = start + sweep / 2;
  const alpha = Math.max((sweep * Math.PI) / 360, 0.05);
  const dist = Math.min(radius - 24, Math.max(34, (2 * radius * Math.sin(alpha)) / (3 * alpha)));
  return piePoint(cx, cy, dist, mid);
}

function piePoint(cx: number, cy: number, radius: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function pieSlice(cx: number, cy: number, radius: number, start: number, end: number) {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
}

function RackBar({
  capacity,
  lots,
  highlight,
  scale,
}: {
  capacity: number;
  lots: RackLot[];
  highlight?: string;
  scale: number;
}) {
  const used = lots.reduce((sum, lot) => sum + lot.qtyTon, 0);
  const axis = Math.max(scale, 0.001);
  const free = Math.max(0, capacity - used);
  return (
    <div className="cf-rackx-bar" role="img" aria-label={`${tons(used)} occupied, ${tons(free)} free of ${tons(capacity)}`}>
      {lots.map((lot) => (
        <span
          key={lot.id}
          className={highlight && lot.material !== highlight ? "is-dim" : ""}
          style={{ width: `${(lot.qtyTon / axis) * 100}%`, background: materialColor(lot.material) }}
          title={`${lot.material} · ${lot.lot} · ${tons(lot.qtyTon)}`}
        />
      ))}
      {free > 0 ? <span className="is-free" style={{ width: `${(free / axis) * 100}%` }} title={`${tons(free)} free`} /> : null}
      <i className="cf-rackx-cap" style={{ left: `${Math.min(100, (capacity / axis) * 100)}%` }} title={`Capacity ${tons(capacity)}`} />
    </div>
  );
}

export function MaterialDetailsPage() {
  const [storage, setStorage] = useState<WarehouseStorage>(loadWarehouseStorage);
  const [warehouseId, setWarehouseId] = useState("");
  const [material, setMaterial] = useState("");
  const [space, setSpace] = useState<SpaceFilter>("all");
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<"warehouse" | "rack" | "place" | null>(null);
  const [notice, setNotice] = useState("");
  const [houseName, setHouseName] = useState("");
  const [houseLocation, setHouseLocation] = useState("");
  const [rackHouse, setRackHouse] = useState("");
  const [rackName, setRackName] = useState("");
  const [rackCapacity, setRackCapacity] = useState("50");
  const [placeMaterial, setPlaceMaterial] = useState("");
  const [placeLot, setPlaceLot] = useState("");
  const [placeQty, setPlaceQty] = useState("");
  const [placeRack, setPlaceRack] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOn, setAddOn] = useState<string | null>(null);
  const [view, setView] = useState<"racks" | "summary">("racks");

  useEffect(() => {
    if (panel !== "place") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const commit = (next: WarehouseStorage, message: string) => {
    saveWarehouseStorage(next);
    setStorage(next);
    flash(message);
  };

  const materials = useMemo(
    () => [...new Set(storage.lots.map((lot) => lot.material))].sort((a, b) => a.localeCompare(b)),
    [storage.lots],
  );

  const totals = useMemo(() => {
    const capacity = storage.racks.reduce((sum, rack) => sum + rack.capacityTon, 0);
    const occupied = storage.lots.reduce((sum, lot) => sum + lot.qtyTon, 0);
    return {
      warehouses: storage.warehouses.length,
      racks: storage.racks.length,
      capacity,
      occupied,
      free: Math.max(0, capacity - occupied),
    };
  }, [storage]);

  const cards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return storage.racks
      .map((rack) => {
        const house = storage.warehouses.find((item) => item.id === rack.warehouseId);
        const lots = storage.lots.filter((lot) => lot.rackId === rack.id);
        const occupied = lots.reduce((sum, lot) => sum + lot.qtyTon, 0);
        const free = rack.capacityTon - occupied;
        return { rack, house, lots, occupied, free };
      })
      .filter((card) => {
        if (warehouseId && card.rack.warehouseId !== warehouseId) return false;
        if (material && !card.lots.some((lot) => lot.material === material) && card.free <= 0) return false;
        if (space === "free" && card.free <= 0.05) return false;
        if (space === "tight" && (card.occupied / card.rack.capacityTon < 0.8 || card.free < 0)) return false;
        if (space === "empty" && card.occupied > 0) return false;
        if (space === "over" && card.free >= 0) return false;
        if (!query) return true;
        const hay = [
          card.house?.name,
          card.house?.location,
          card.rack.name,
          ...card.lots.flatMap((lot) => [lot.material, lot.lot]),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => {
        const house = String(a.house?.name || "").localeCompare(String(b.house?.name || ""));
        if (house) return house;
        return a.rack.name.localeCompare(b.rack.name, undefined, { numeric: true });
      });
  }, [storage, warehouseId, material, space, search]);

  const placeAmount = Number(placeQty);
  const suggestions = useMemo(() => {
    if (panel !== "place") return [];
    return storage.racks
      .map((rack) => {
        const house = storage.warehouses.find((item) => item.id === rack.warehouseId);
        const lots = storage.lots.filter((lot) => lot.rackId === rack.id);
        const occupied = lots.reduce((sum, lot) => sum + lot.qtyTon, 0);
        const free = rack.capacityTon - occupied;
        const holds = placeMaterial.trim()
          ? lots.some((lot) => lot.material.toLowerCase() === placeMaterial.trim().toLowerCase())
          : false;
        return { rack, house, lots, occupied, free, holds };
      })
      .filter((card) => !warehouseId || card.rack.warehouseId === warehouseId)
      .sort((a, b) => b.free - a.free);
  }, [panel, storage, warehouseId, placeMaterial]);

  const addWarehouse = () => {
    const name = houseName.trim();
    if (!name) {
      flash("Enter a warehouse name.");
      return;
    }
    const row: WarehouseRow = {
      id: nextId("WH", storage.warehouses.map((item) => item.id)),
      name,
      location: houseLocation.trim(),
    };
    commit({ ...storage, warehouses: [...storage.warehouses, row] }, `${name} added.`);
    setHouseName("");
    setHouseLocation("");
    setWarehouseId(row.id);
    setPanel(null);
  };

  const addRack = () => {
    const house = rackHouse || warehouseId;
    const name = rackName.trim();
    const capacity = Number(rackCapacity);
    if (!house) {
      flash("Choose a warehouse for this rack.");
      return;
    }
    if (!name) {
      flash("Enter a rack name.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      flash("Capacity must be more than 0 ton.");
      return;
    }
    const row: StorageRack = {
      id: nextId("RK", storage.racks.map((item) => item.id)),
      warehouseId: house,
      name,
      capacityTon: capacity,
    };
    commit({ ...storage, racks: [...storage.racks, row] }, `${name} added with ${tons(capacity)} storage.`);
    setRackName("");
    setRackCapacity("50");
    setPanel(null);
  };

  const placeStock = (rackId: string) => {
    const name = placeMaterial.trim();
    const qty = Number(placeQty);
    const rack = storage.racks.find((item) => item.id === rackId);
    if (!name) {
      flash("Enter the material name.");
      return;
    }
    if (!rack) {
      flash("Choose a rack.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      flash("Quantity must be more than 0 ton.");
      return;
    }
    const free = rack.capacityTon - occupiedOf(storage.lots, rack.id);
    if (qty > free + 0.001) {
      flash(`${rack.name} has only ${tons(Math.max(0, free))} free.`);
      return;
    }
    const row: RackLot = {
      id: nextId("LT", storage.lots.map((item) => item.id)),
      rackId: rack.id,
      material: name,
      lot: placeLot.trim() || "Lot",
      qtyTon: qty,
    };
    commit({ ...storage, lots: [...storage.lots, row] }, `${name} kept in ${rack.name}.`);
    setPlaceQty("");
    setPlaceLot("");
    setPlaceMaterial("");
    setPlaceRack("");
    setAddOn(null);
    setPanel(null);
  };

  const removeLot = (id: string) => {
    const lot = storage.lots.find((item) => item.id === id);
    commit(
      { ...storage, lots: storage.lots.filter((item) => item.id !== id) },
      lot ? `${lot.material} removed.` : "Lot removed.",
    );
  };

  const removeRack = (rack: StorageRack) => {
    const used = occupiedOf(storage.lots, rack.id);
    if (used > 0) {
      flash(`${rack.name} still holds ${tons(used)}. Remove the material first.`);
      return;
    }
    commit(
      { ...storage, racks: storage.racks.filter((item) => item.id !== rack.id) },
      `${rack.name} removed.`,
    );
  };

  const removeWarehouse = (house: WarehouseRow) => {
    const racks = storage.racks.filter((rack) => rack.warehouseId === house.id);
    const rackIds = new Set(racks.map((rack) => rack.id));
    const used = storage.lots.filter((lot) => rackIds.has(lot.rackId)).reduce((sum, lot) => sum + lot.qtyTon, 0);
    if (used > 0) {
      flash(`${house.name} still holds ${tons(used)}. Empty the racks first.`);
      return;
    }
    commit(
      {
        ...storage,
        warehouses: storage.warehouses.filter((item) => item.id !== house.id),
        racks: storage.racks.filter((rack) => rack.warehouseId !== house.id),
      },
      `${house.name} removed.`,
    );
    if (warehouseId === house.id) setWarehouseId("");
  };

  const changeCapacity = (rack: StorageRack, value: string) => {
    const capacity = Number(value);
    if (!Number.isFinite(capacity) || capacity <= 0) return;
    const used = occupiedOf(storage.lots, rack.id);
    if (capacity + 0.001 < used) {
      flash(`${rack.name} already holds ${tons(used)}.`);
      return;
    }
    commit(
      {
        ...storage,
        racks: storage.racks.map((item) => (item.id === rack.id ? { ...item, capacityTon: capacity } : item)),
      },
      `${rack.name} capacity is ${tons(capacity)}.`,
    );
  };

  return (
    <div className="cf-page cf-wh-log cf-rackx">
      <header className="cf-page-head cf-rhead">
        <div>
          <h1>Material details</h1>
          <p>Warehouse / Store</p>
        </div>
        <div className="cf-rhead-totals">
          <article><span>Warehouses</span><strong>{totals.warehouses}</strong></article>
          <article><span>Racks</span><strong>{totals.racks}</strong></article>
          <article><span>Capacity</span><strong>{tons(totals.capacity)}</strong></article>
          <article><span>Used</span><strong>{tons(totals.occupied)}</strong></article>
          <article><span>Free</span><strong>{tons(totals.free)}</strong></article>
          <article>
            <span>Fill</span>
            <strong>{totals.capacity > 0 ? `${Math.round((totals.occupied / totals.capacity) * 100)}%` : "0%"}</strong>
          </article>
        </div>
      </header>
      <div className="cf-rbar">
      <header className="cf-rtoolbar">
        <div className="cf-rswitch" role="tablist">
          <button type="button" className={view === "racks" ? "is-on" : ""} onClick={() => setView("racks")}>
            <LayoutGrid size={15} />
            Rack view
          </button>
          <button type="button" className={view === "summary" ? "is-on" : ""} onClick={() => setView("summary")}>
            <List size={15} />
            Summary
          </button>
        </div>
        <label className="cf-rsearch">
          <Search size={15} />
          <input value={search} placeholder="Search rack or material…" onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="cf-ractions">
          <button type="button" onClick={() => setPanel(panel === "warehouse" ? null : "warehouse")}>
            <Warehouse size={15} />
            Warehouse
          </button>
          <button type="button" className="is-solid" onClick={() => { setRackHouse(warehouseId); setPanel(panel === "rack" ? null : "rack"); }}>
            <Plus size={15} />
            Add rack
          </button>
        </div>
      </header>
      <div className="cf-rfilters">
        <SheetSelect
          value={warehouseId}
          placeholder="All warehouses"
          options={[{ value: "", label: "All warehouses" }, ...storage.warehouses.map((house) => ({ value: house.id, label: house.name }))]}
          onChange={setWarehouseId}
        />
        <SheetSelect
          value={material}
          placeholder="All materials"
          options={[{ value: "", label: "All materials" }, ...materials.map((name) => ({ value: name, label: name }))]}
          onChange={setMaterial}
        />
        <SheetSelect
          value={space}
          options={[
            { value: "all", label: "All racks" },
            { value: "free", label: "Has free space" },
            { value: "tight", label: "Nearly full" },
            { value: "empty", label: "Empty" },
            { value: "over", label: "Over capacity" },
          ]}
          onChange={(value) => setSpace(value as SpaceFilter)}
        />
      </div>
      </div>

      {notice ? <p className="cf-rackx-flash">{notice}</p> : null}

      {panel === "warehouse" ? (
        <form
          className="cf-rackx-form"
          onSubmit={(event) => {
            event.preventDefault();
            addWarehouse();
          }}
        >
          <label>
            <span>Warehouse name</span>
            <input value={houseName} onChange={(event) => setHouseName(event.target.value)} placeholder="Raw material shed" />
          </label>
          <label>
            <span>Location</span>
            <input value={houseLocation} onChange={(event) => setHouseLocation(event.target.value)} placeholder="Shed A" />
          </label>
          <button type="submit">Create warehouse</button>
        </form>
      ) : null}

      {panel === "rack" ? (
        <form
          className="cf-rackx-form"
          onSubmit={(event) => {
            event.preventDefault();
            addRack();
          }}
        >
          <label>
            <span>Warehouse</span>
            <SheetSelect
              value={rackHouse}
              placeholder="Select warehouse"
              options={storage.warehouses.map((house) => ({ value: house.id, label: house.name }))}
              onChange={setRackHouse}
            />
          </label>
          <label>
            <span>Rack name</span>
            <input value={rackName} onChange={(event) => setRackName(event.target.value)} placeholder="Rack 1" />
          </label>
          <label>
            <span>Storage (ton)</span>
            <input inputMode="decimal" value={rackCapacity} onChange={(event) => setRackCapacity(event.target.value)} />
          </label>
          <button type="submit">Create rack</button>
        </form>
      ) : null}

      {panel === "place" ? (
        <div
          className="cf-rackx-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPanel(null);
          }}
        >
          <section className="cf-rackx-place" role="dialog" aria-modal="true" aria-labelledby="cf-place-title">
            <header className="cf-rackx-modal-head">
              <div>
                <p>Warehouse / Store</p>
                <h2 id="cf-place-title">Place material</h2>
              </div>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close">
                <X size={16} />
              </button>
            </header>
            <form
              className="cf-rackx-form"
              onSubmit={(event) => {
                event.preventDefault();
                placeStock(placeRack);
              }}
            >
              <label>
                <span>Material</span>
                <input
                  value={placeMaterial}
                  list="cf-rack-materials"
                  onChange={(event) => setPlaceMaterial(event.target.value)}
                  placeholder="Maize"
                  autoFocus
                />
                <datalist id="cf-rack-materials">
                  {materials.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label>
                <span>Lot</span>
                <input value={placeLot} onChange={(event) => setPlaceLot(event.target.value)} placeholder="M-23" />
              </label>
              <label>
                <span>Quantity (ton)</span>
                <input inputMode="decimal" value={placeQty} onChange={(event) => setPlaceQty(event.target.value)} placeholder="10" />
              </label>
            </form>
            <div className="cf-rackx-suggest">
              <p>Pick the rack with enough free space. The same material can sit in more than one rack.</p>
              {suggestions.map((card) => {
                const fits = Number.isFinite(placeAmount) && placeAmount > 0 && placeAmount <= card.free + 0.001;
                return (
                  <button
                    key={card.rack.id}
                    type="button"
                    className={placeRack === card.rack.id ? "is-picked" : ""}
                    disabled={Number.isFinite(placeAmount) && placeAmount > 0 && !fits}
                    onClick={() => {
                      setPlaceRack(card.rack.id);
                      if (placeMaterial.trim() && Number(placeQty) > 0) placeStock(card.rack.id);
                    }}
                  >
                    <span>
                      <strong>{card.house?.name} · {card.rack.name}</strong>
                      <em>{card.holds ? "Already holds this material" : "Open rack"} · {tons(Math.max(0, card.free))} free of {tons(card.rack.capacityTon)}</em>
                    </span>
                    <RackBar capacity={card.rack.capacityTon} lots={card.lots} highlight={placeMaterial.trim()} scale={Math.max(card.rack.capacityTon, card.occupied, 0.001)} />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {storage.warehouses.filter((house) => !warehouseId || house.id === warehouseId).length === 0 ? (
        <p className="cf-rackx-empty">Create a warehouse, then add racks inside it.</p>
      ) : (
        storage.warehouses
          .filter((house) => !warehouseId || house.id === warehouseId)
          .map((house) => {
            const houseCards = cards.filter((card) => card.rack.warehouseId === house.id);
            if (!houseCards.length && (material || search || space !== "all")) return null;
            const capacity = houseCards.reduce((sum, card) => sum + card.rack.capacityTon, 0);
            const occupied = houseCards.reduce((sum, card) => sum + card.occupied, 0);
            const housePct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
            return (
              <section key={house.id} className="cf-rgroup">
                <header>
                  <Warehouse size={16} />
                  <strong>{house.name}</strong>
                  <em>{house.location || "Warehouse"} · {houseCards.length} racks · {tons(occupied)} / {tons(capacity)} · {housePct}%</em>
                  <button type="button" onClick={() => removeWarehouse(house)}>Remove warehouse</button>
                </header>
                {houseCards.length === 0 ? (
                  <p className="cf-rackx-empty">No racks yet. Add a rack under this warehouse.</p>
                ) : view === "summary" ? (
                  <article className={`cf-rcard ${housePct >= 100 ? "is-over" : housePct >= 80 ? "is-tight" : occupied === 0 ? "is-empty" : "is-open"}`}>
                    <aside className="cf-rcard-id">
                      <div className="cf-rcard-mark"><Warehouse size={18} /></div>
                      <strong>{house.name}</strong>
                      <em>{houseCards.length} racks</em>
                      <span>{housePct >= 100 ? "Over" : housePct >= 80 ? "Tight" : occupied === 0 ? "Empty" : "Open"}</span>
                    </aside>
                    <div className="cf-rcard-main">
                      <header>
                        <span>Space utilisation</span>
                        <strong>{tons(occupied)} / {tons(capacity)}</strong>
                        <b>{housePct}%</b>
                      </header>
                      <SpacePie capacity={capacity} lots={houseCards.flatMap((card) => card.lots)} />
                      <div className="cf-rstats">
                        <article className="is-used"><Box size={14} /><span>Used</span><strong>{tons(occupied)}</strong></article>
                        <article className="is-free"><Package size={14} /><span>Free</span><strong>{tons(Math.max(0, capacity - occupied))}</strong></article>
                        <article className="is-fill"><span>Fill level</span><strong>{housePct}%</strong></article>
                      </div>
                      <div className="cf-rminis">
                        {houseCards.map((card) => {
                          const pct = card.rack.capacityTon > 0 ? Math.round((card.occupied / card.rack.capacityTon) * 100) : 0;
                          return (
                            <div key={card.rack.id}>
                              <span>{card.rack.name}</span>
                              <SpacePie small capacity={card.rack.capacityTon} lots={card.lots} />
                              <b>{pct}%</b>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                ) : (
                  <div className="cf-rcards">
                    {houseCards.map((card) => {
                      const ratio = card.rack.capacityTon > 0 ? card.occupied / card.rack.capacityTon : 0;
                      const kind = card.free < -0.05 ? "over" : card.occupied === 0 ? "empty" : ratio >= 0.8 ? "tight" : "open";
                      const pct = card.rack.capacityTon > 0 ? Math.round(ratio * 100) : 0;
                      const editing = editingId === card.rack.id;
                      const adding = addOn === card.rack.id;
                      return (
                        <article key={card.rack.id} className={`cf-rcard is-${kind}`}>
                          <aside className="cf-rcard-id">
                            <div className="cf-rcard-mark"><Rows3 size={18} /></div>
                            <strong>{card.rack.name}</strong>
                            <em>{tons(card.rack.capacityTon)} capacity</em>
                            <span>{kind === "over" ? "Over" : kind === "empty" ? "Empty" : kind === "tight" ? "Tight" : "Open"}</span>
                          </aside>
                          <div className="cf-rcard-main">
                            <header>
                              <span>Space utilisation</span>
                              <strong>{tons(card.occupied)} / {tons(card.rack.capacityTon)}</strong>
                              <b>{pct}%</b>
                            </header>
                            <SpacePie capacity={card.rack.capacityTon} lots={card.lots} highlight={material} />
                            <div className="cf-rstats">
                              <article className="is-used"><Box size={14} /><span>Used</span><strong>{tons(card.occupied)}</strong></article>
                              <article className="is-free"><Package size={14} /><span>Free</span><strong>{tons(Math.max(0, card.free))}</strong></article>
                              <article className="is-fill"><span>Fill level</span><strong>{pct}%</strong></article>
                            </div>
                            <button
                              type="button"
                              className="cf-radd"
                              onClick={() => {
                                setAddOn(adding ? null : card.rack.id);
                                setPlaceMaterial("");
                                setPlaceLot("");
                                setPlaceQty("");
                              }}
                            >
                              <Plus size={14} />
                              Add material
                            </button>
                            {adding ? (
                              <form
                                className="cf-radd-form"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  placeStock(card.rack.id);
                                }}
                              >
                                <input value={placeMaterial} onChange={(event) => setPlaceMaterial(event.target.value)} placeholder="Material" autoFocus />
                                <input value={placeLot} onChange={(event) => setPlaceLot(event.target.value)} placeholder="Lot" />
                                <input inputMode="decimal" value={placeQty} onChange={(event) => setPlaceQty(event.target.value)} placeholder="Tons" />
                                <button type="submit">Save</button>
                              </form>
                            ) : null}
                            {editing ? (
                              <div className="cf-redit">
                                <label>
                                  Capacity
                                  <input
                                    inputMode="decimal"
                                    defaultValue={String(card.rack.capacityTon)}
                                    key={`${card.rack.id}-${card.rack.capacityTon}`}
                                    onBlur={(event) => {
                                      if (event.target.value !== String(card.rack.capacityTon)) changeCapacity(card.rack, event.target.value);
                                    }}
                                  />
                                  t
                                </label>
                                {card.lots.map((lot) => (
                                  <button key={lot.id} type="button" className="is-text" onClick={() => removeLot(lot.id)}>
                                    Remove {lot.material}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            <div className="cf-rbtns">
                              <button type="button" onClick={() => setEditingId(editing ? null : card.rack.id)}>
                                <Pencil size={14} />
                                {editing ? "Done" : "Edit rack"}
                              </button>
                              <button type="button" className="is-danger" onClick={() => removeRack(card.rack)}>
                                <Trash2 size={14} />
                                Remove rack
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
      )}
    </div>
  );
}
