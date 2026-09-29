import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Check } from "./pages/Check";
import { Pricing } from "./pages/Pricing";
import { HowItWorks } from "./pages/HowItWorks";
import { About } from "./pages/About";
import { Faq } from "./pages/Faq";
import { Contact } from "./pages/Contact";
import { Report } from "./pages/Report";
import { Terms } from "./pages/Terms";
import { Privacy } from "./pages/Privacy";
import { Changelog } from "./pages/Changelog";
import { UnderstandingYourReport } from "./pages/UnderstandingYourReport";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { VerifyEmail } from "./pages/VerifyEmail";
import { Account } from "./pages/Account";
import { AuthProvider } from "./lib/AuthContext";

// No basename needed - this app is now deployed as its own standalone
// Railway service (see railway.json), with its own root URL, so "/" is
// genuinely free here. The old /trust-check-mounted deployment on
// @elizaos/agent's shared codebase is a separate, still-valid build from
// this same source (built with the old base:"/trust-check/" config) - left
// untouched, not something this router needs to account for anymore.
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/check" element={<Check />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/report/:chain/:address" element={<Report />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/understanding-your-report" element={<UnderstandingYourReport />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
