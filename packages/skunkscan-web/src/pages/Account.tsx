import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { API_BASE_URL } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// "Change password" reuses the existing forgot-password flow rather than a
// dedicated authenticated change-password endpoint - none exists yet (see
// this milestone's own scoping decision). Sends the reset email to the
// logged-in user's own address; they complete it the same way a real
// password reset already works.
export function Account() {
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [changePasswordState, setChangePasswordState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [loggingOut, setLoggingOut] = useState(false);

  if (user === undefined) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <p className="text-base text-ink-400">Loading…</p>
      </section>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  async function handleChangePassword() {
    if (!user || changePasswordState !== "idle") return;
    setChangePasswordState("sending");
    try {
      await fetch(`${API_BASE_URL}/api/skunkscan/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
    } finally {
      setChangePasswordState("sent");
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Your account</h1>

      {searchParams.get("justRegistered") === "1" && !user.emailVerified && (
        <p className="mt-4 rounded-lg border border-ink-700 bg-ink-900/60 p-4 text-sm text-ink-200">
          Check your inbox to verify your email address.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-ink-400">Email</dt>
            <dd className="mt-1 text-base text-ink-50">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-400">Email status</dt>
            <dd className="mt-1 text-base">
              {user.emailVerified ? (
                <span className="text-signal-green">Verified</span>
              ) : (
                <span className="text-signal-yellow">Not verified</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-ink-800 pt-6">
          {changePasswordState === "sent" ? (
            <p className="text-sm text-ink-200">
              If your account is reachable, a password reset link has been sent to {user.email}.
            </p>
          ) : (
            <Button
              variant="secondary"
              onClick={handleChangePassword}
              disabled={changePasswordState === "sending"}
            >
              {changePasswordState === "sending" ? "Sending…" : "Change password"}
            </Button>
          )}
        </div>
      </div>

      <Button variant="ghost" onClick={handleLogout} disabled={loggingOut} className="mt-6">
        {loggingOut ? "Logging out…" : "Log out"}
      </Button>
    </section>
  );
}
