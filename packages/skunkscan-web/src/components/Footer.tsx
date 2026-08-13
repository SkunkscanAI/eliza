import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-ink-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} SkunkScan. Not financial or legal advice.</p>
        <nav className="flex gap-4">
          <Link to="/" className="hover:text-ink-100">
            Home
          </Link>
          <Link to="/pricing" className="hover:text-ink-100">
            Pricing
          </Link>
          <Link to="/check" className="hover:text-ink-100">
            Check a wallet
          </Link>
        </nav>
      </div>
    </footer>
  );
}
