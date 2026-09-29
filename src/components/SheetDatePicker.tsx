import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseIso(iso: string) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameDay(a: Date | null, b: Date | null) {
  return Boolean(
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(),
  );
}

function formatPretty(iso: string) {
  const date = parseIso(iso);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function monthGrid(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function SheetDatePicker({
  value,
  onChange,
  compact = false,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  placeholder?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [view, setView] = useState(() => selected || new Date());

  useEffect(() => {
    if (open) setView(parseIso(value) || new Date());
  }, [open, value]);

  const place = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const width = 292;
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
    const menuHeight = menu.offsetHeight || 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > spaceBelow;
    const top = openUp ? Math.max(12, rect.top - menuHeight - 8) : rect.bottom + 8;
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view, place]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => monthGrid(view), [view]);
  const today = new Date();
  const title = view.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const menu = open
    ? createPortal(
        <div ref={menuRef} className="cf-date-menu">
          <div className="cf-date-head">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <p>{title}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="cf-date-week">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="cf-date-grid">
            {days.map((day) => {
              const inMonth = day.getMonth() === view.getMonth();
              const isSelected = sameDay(day, selected);
              const isToday = sameDay(day, today);
              const className = [
                isSelected ? "is-selected" : "",
                isToday && !isSelected ? "is-today" : "",
                !inMonth ? "is-out" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={toIso(day)}
                  type="button"
                  className={className}
                  onClick={() => {
                    onChange(toIso(day));
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="cf-date-foot">
            <button
              type="button"
              onClick={() => {
                onChange(toIso(new Date()));
                setOpen(false);
              }}
            >
              Today
            </button>
            <p>{formatPretty(value) || placeholder}</p>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`cf-date${compact ? " is-compact" : ""}${open ? " is-open" : ""}`}>
      <button ref={buttonRef} type="button" onClick={() => setOpen((current) => !current)}>
        <span className="cf-date-badge">
          <CalendarDays size={compact ? 13 : 15} />
        </span>
        <span className={value ? "" : "is-empty"}>{formatPretty(value) || placeholder}</span>
      </button>
      {menu}
    </div>
  );
}
