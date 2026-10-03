import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS, type NavItem } from "@/data/nav";
import { productLabel } from "@/data/movements";
import { listBatches, liveBatch } from "@/data/production";
import { env } from "@/config/env";

function CurrentBatch() {
  const { pathname } = useLocation();
  const onProduction = pathname === "/production" || pathname.startsWith("/production/");
  if (!onProduction) return null;
  const order = liveBatch(listBatches());
  if (!order) return null;
  const packed = ((Number(order.bags) || 0) * 50) / 1000;
  const target = Number(order.qtyMt) || 0;
  const progress = target ? Math.min(100, Math.round((packed / target) * 1000) / 10) : 0;
  const name = productLabel(order.product).split("—")[0].trim();
  return (
    <div className="cf-live-batch">
      <p>Current batch</p>
      <strong>{order.batchNo || "Open batch"}</strong>
      <span>{name}</span>
      <span>Target {target ? `${target.toFixed(2)} MT` : "—"}</span>
      <span>Packed {packed.toFixed(2)} MT</span>
      <div className="cf-live-bar" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
      <em>{progress}%</em>
      <small>
        Start {order.time || "—"} · End {order.endTime || "—"}
      </small>
    </div>
  );
}

function FlatLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end
      title={item.hint}
      className={({ isActive }) => `cf-nav-item${isActive ? " is-active" : ""}`}
    >
      <span className="cf-nav-icon">
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span className="cf-nav-label">{item.name}</span>
    </NavLink>
  );
}

function inItem(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function GroupedLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const location = useLocation();
  const navigate = useNavigate();
  const inSection = inItem(location.pathname, item.path);
  const [open, setOpen] = useState(inSection);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    item.groups?.forEach((group) => {
      next[group.id] = group.items.some((child) => inItem(location.pathname, child.path));
    });
    if (!Object.values(next).some(Boolean) && item.groups?.[0]) next[item.groups[0].id] = true;
    return next;
  });

  useEffect(() => {
    if (inSection) setOpen(true);
  }, [inSection]);

  return (
    <div className={`cf-nav-group${inSection ? " is-open" : ""}`}>
      <button
        type="button"
        className={`cf-nav-item cf-nav-parent${inSection ? " is-current" : ""}`}
        onClick={() => {
          setOpen((value) => !value);
          if (!inSection) navigate(item.path);
        }}
      >
        <span className="cf-nav-icon">
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="cf-nav-label">{item.name}</span>
        <ChevronDown size={16} className={`cf-nav-chevron${open ? " is-open" : ""}`} />
      </button>

      {open && item.children?.length ? (
        <div className="cf-nav-section-links cf-nav-children">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.end}
                className={({ isActive }) => `cf-nav-sub${isActive ? " is-active" : ""}`}
              >
                {ChildIcon ? <ChildIcon size={14} strokeWidth={2.2} /> : null}
                <span>{child.name}</span>
              </NavLink>
            );
          })}
        </div>
      ) : null}

      {open && item.groups?.length ? (
        <div className="cf-nav-subs">
          {item.groups.map((group) => (
            <div key={group.id} className="cf-nav-section">
              <button
                type="button"
                className="cf-nav-section-btn"
                onClick={() =>
                  setGroupOpen((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                }
              >
                <span>{group.label}</span>
                <ChevronDown
                  size={14}
                  className={`cf-nav-chevron${groupOpen[group.id] ? " is-open" : ""}`}
                />
              </button>
              {groupOpen[group.id] ? (
                <div className="cf-nav-section-links">
                  {group.items.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `cf-nav-sub${isActive ? " is-active" : ""}`
                      }
                    >
                      {child.name}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const org =
    user?.organizationName?.trim() ||
    (user?.email ? String(user.email).split("@")[1] : "") ||
    "CattleFeed";
  const brand = env.appName === "CatelFeed" ? "CattleFeed" : env.appName;
  const orgLine = !org || org === brand || org === "CatelFeed" ? "Cattle feed mill" : org;

  return (
    <aside className="cf-sidebar">
      <div className="cf-sidebar-brand">
        <div className="cf-brand-mark" aria-hidden>
          CF
        </div>
        <div className="cf-brand-text">
          <p className="cf-brand-name">{brand}</p>
          <p className="cf-brand-org" title={orgLine}>
            {orgLine}
          </p>
        </div>
      </div>

      <nav className="cf-sidebar-nav" aria-label="Main">
        {NAV_ITEMS.map((item) =>
          item.groups?.length || item.children?.length ? (
            <GroupedLink key={item.path} item={item} />
          ) : (
            <FlatLink key={item.path} item={item} />
          )
        )}
      </nav>

      <div className="cf-sidebar-foot">
        <CurrentBatch />
        <div className="cf-user-chip">
          <p className="cf-user-name">
            {user?.name || user?.username || user?.email || "User"}
          </p>
          <p className="cf-user-role">{user?.role || "Operator"}</p>
        </div>
        <button
          type="button"
          className="cf-logout"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut size={15} strokeWidth={2.2} />
          Log out
        </button>
      </div>
    </aside>
  );
}
