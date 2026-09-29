import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { API_BASE_URL } from "../lib/api";

// Always shows the identical success state regardless of whether the email
// is actually registered - mirrors the backend's own no-enumeration design
// on POST /forgot-password (same generic response either way). A UI that
// branched on the response here would defeat the point of that backend
// design by letting a different frontend state leak which emails exist.
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/skunkscan/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // Deliberately ignored - see the no-enumeration note above. A network
      // failure still shows the same generic confirmation; there's nothing
      // safe to tell the user differently.
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Check your email</h1>
        <p className="mt-4 text-base text-ink-200">
          If an account exists for {email.trim()}, a password reset link has been sent.
        </p>
        <Link to="/login" className="mt-8 inline-block text-sm text-signal-green hover:text-signal-green-dark">
          Back to log in
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Reset your password</h1>
      <p className="mt-2 text-base text-ink-200">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="forgot-password-email" className="mb-1.5 block text-sm text-ink-200">
            Email
          </label>
          <Input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <Button type="submit" size="lg" disabled={loading} className="mt-2">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </section>
  );
}
