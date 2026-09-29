import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SHIFTS } from "@/data/production";
import { STORE_ALERTS } from "@/data/store";
import { Sidebar } from "./Sidebar";

function displayName(raw: string) {
  return raw
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length < 2) return name.slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const barRef = useRef<HTMLElement>(null);
  const [shift, setShift] = useState<(typeof SHIFTS)[number]>("A");
  const [shiftOpen, setShiftOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const name = displayName(user?.name || user?.username || user?.email?.split("@")[0] || "User");
  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Operator";

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setShiftOpen(false);
        setBellOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="cf-shell">
      <Sidebar />
      <div className="cf-workspace">
        <header className="cf-topbar" ref={barRef}>
          <div className="cf-shift">
            <button
              type="button"
              aria-expanded={shiftOpen}
              onClick={() => {
                setShiftOpen((open) => !open);
                setBellOpen(false);
                setAccountOpen(false);
              }}
            >
              <span>Shift : <b>{shift}</b></span>
              <ChevronDown size={16} />
            </button>
            {shiftOpen ? (
              <div className="cf-pop" role="listbox">
                {SHIFTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={item === shift ? "is-on" : ""}
                    onClick={() => {
                      setShift(item);
                      setShiftOpen(false);
                    }}
                  >
                    Shift : {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="cf-bell">
            <button
              type="button"
              aria-label={`${STORE_ALERTS.length} alerts`}
              aria-expanded={bellOpen}
              onClick={() => {
                setBellOpen((open) => !open);
                setShiftOpen(false);
                setAccountOpen(false);
              }}
            >
              <Bell size={18} />
              <em>{STORE_ALERTS.length}</em>
            </button>
            {bellOpen ? (
              <div className="cf-pop">
                <p>Low stock</p>
                <ul>
                  {STORE_ALERTS.map((item) => (
                    <li key={item.material}>
                      <strong>{item.material}</strong>
                      <span>{item.place} · {item.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="cf-account">
            <button
              type="button"
              aria-expanded={accountOpen}
              onClick={() => {
                setAccountOpen((open) => !open);
                setShiftOpen(false);
                setBellOpen(false);
              }}
            >
              <span className="cf-avatar" aria-hidden>{initials(name)}</span>
              <span className="cf-account-text">
                <strong>{name}</strong>
                <em>{role}</em>
              </span>
              <ChevronDown size={16} />
            </button>
            {accountOpen ? (
              <div className="cf-pop">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="cf-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
