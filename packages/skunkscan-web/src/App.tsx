import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Check } from "./pages/Check";
import { Pricing } from "./pages/Pricing";

// basename matches vite.config.ts's `base` and server.ts's SKUNKSCAN_WEB_PREFIX
// ("/trust-check") - the server mount path isn't available at "/" yet (that's
// the main elizaOS dashboard SPA on this shared codebase, with no toggle to
// disable it per-deployment). Keeping the mount unchanged and rooting the
// router here means "/" inside this app is the SkunkScan homepage, with zero
// server-side changes needed. Once a dedicated domain/deployment exists,
// pointing it at /trust-check (or adding a dashboard toggle) is a small
// follow-up, not a rebuild of this routing.
const BASENAME = "/trust-check";

export function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/check" element={<Check />} />
            <Route path="/pricing" element={<Pricing />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
