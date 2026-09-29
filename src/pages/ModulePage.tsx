import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "@/data/nav";

type Props = {
  title?: string;
  hint?: string;
};

export function ModulePage({ title, hint }: Props) {
  const location = useLocation();
  const child = NAV_ITEMS.flatMap((item) => [
    ...(item.children || []),
    ...(item.groups || []).flatMap((group) => group.items),
  ]).find((entry) => entry.path === location.pathname);
  const parent = NAV_ITEMS.find(
    (item) => item.path === location.pathname || location.pathname.startsWith(`${item.path}/`)
  );
  const heading = title || child?.name || parent?.name || "Module";
  const sub = hint || parent?.hint || "Module workspace";

  return (
    <div className="cf-page">
      <header className="cf-page-head">
        <h1>{heading}</h1>
        <p>{sub}</p>
      </header>
      <section className="cf-page-card">
        <p className="cf-muted">
          This module is ready in the sidebar. Screens and registers for{" "}
          <strong>{heading}</strong> will be added next.
        </p>
      </section>
    </div>
  );
}
