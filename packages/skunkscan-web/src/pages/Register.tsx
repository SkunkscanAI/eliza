import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { API_BASE_URL } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const MIN_PASSWORD_LENGTH = 8;

export function Register() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/skunkscan/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Could not create an account. Please try again.");
        return;
      }

      await refresh();
      navigate("/account?justRegistered=1");
    } catch {
      setError("Something went wrong reaching SkunkScan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Create an account</h1>
      <p className="mt-2 text-base text-ink-200">
        Free to register. No wallet connection, ever.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="register-email" className="mb-1.5 block text-sm text-ink-200">
            Email
          </label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-sm text-ink-200">
            Password
          </label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm text-ink-200">
            Confirm password
          </label>
          <Input
            id="register-confirm-password"
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
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-400">
        Already have an account?{" "}
        <Link to="/login" className="text-signal-green hover:text-signal-green-dark">
          Log in
        </Link>
      </p>
    </section>
  );
}
