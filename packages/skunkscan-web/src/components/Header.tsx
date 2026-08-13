import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { ShieldCheck } from "./ui/icons";
import { cn } from "../lib/utils";

// FAQ and Contact are secondary pages, linked from the footer instead of
// here - see Footer.tsx.
const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="border-b border-ink-800">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-ink-50">
          <ShieldCheck className="h-6 w-6 text-signal-green" />
          <span>SkunkScan</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm text-ink-200 hover:text-ink-50",
                location.pathname === link.to && "text-ink-50",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm">
          <Link to="/check">Check a wallet</Link>
        </Button>
      </div>
    </header>
  );
}
