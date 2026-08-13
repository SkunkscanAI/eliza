import { Link } from "react-router-dom";

// Legal and Changelog are Milestone 3 - deliberately not linked yet, same
// "only link to routes that exist" discipline as the rest of this site.
const SECONDARY_LINKS = [
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-ink-200">
            <Link to="/" className="hover:text-ink-100">
              Home
            </Link>
            <Link to="/how-it-works" className="hover:text-ink-100">
              How It Works
            </Link>
            <Link to="/pricing" className="hover:text-ink-100">
              Pricing
            </Link>
            <Link to="/about" className="hover:text-ink-100">
              About
            </Link>
            <Link to="/check" className="hover:text-ink-100">
              Check a wallet
            </Link>
          </nav>

          <nav className="flex gap-4 text-ink-400">
            {SECONDARY_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-ink-100">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="text-sm text-ink-400">
          © {new Date().getFullYear()} SkunkScan. Not financial or legal advice.
        </p>
      </div>
    </footer>
  );
}
