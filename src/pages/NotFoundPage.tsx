import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">That route does not exist in CattleFeed.</p>
        <Link className="link" to="/dashboard">
          Back to dashboard
        </Link>
      </header>
    </main>
  );
}
