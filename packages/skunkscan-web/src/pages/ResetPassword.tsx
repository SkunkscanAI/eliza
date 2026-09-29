import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { API_BASE_URL } from "../lib/api";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/skunkscan/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "This password reset link is invalid or has expired.");
        return;
      }

      setDone(true);
    } catch {
      setError("Something went wrong reaching SkunkScan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Invalid link</h1>
        <p className="mt-4 text-base text-ink-200">
          This password reset link is missing its token. Request a new one below.
        </p>
        <Link
          to="/forgot-password"
          className="mt-8 inline-block text-sm text-signal-green hover:text-signal-green-dark"
        >
          Request a new reset link
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Password updated</h1>
        <p className="mt-4 text-base text-ink-200">
          Your password has been changed. All other sessions have been logged out.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/login">Log in</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Set a new password</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="reset-new-password" className="mb-1.5 block text-sm text-ink-200">
            New password
          </label>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="reset-confirm-password" className="mb-1.5 block text-sm text-ink-200">
            Confirm new password
          </label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-signal-red" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-2">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </section>
  );
}
