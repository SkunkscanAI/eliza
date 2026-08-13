import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Check } from "./pages/Check";
import { Pricing } from "./pages/Pricing";

// No basename needed - this app is now deployed as its own standalone
// Railway service (see railway.json), with its own root URL, so "/" is
// genuinely free here. The old /trust-check-mounted deployment on
// @elizaos/agent's shared codebase is a separate, still-valid build from
// this same source (built with the old base:"/trust-check/" config) - left
// untouched, not something this router needs to account for anymore.
export function App() {
  return (
    <BrowserRouter>
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
