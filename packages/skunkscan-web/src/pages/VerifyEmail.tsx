import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Check } from "../components/ui/icons";
import { API_BASE_URL } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type VerifyState = "loading" | "success" | "error" | "missing-token";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refresh } = useAuth();
  const [state, setState] = useState<VerifyState>(token ? "loading" : "missing-token");
  // StrictMode double-invokes effects in dev, and consumeIfValid is
  // one-time-use server-side - without this guard, dev's second invocation
  // would hit an already-consumed token and show a false "invalid link"
  // error on a genuinely successful verification.
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    fetch(`${API_BASE_URL}/api/skunkscan/auth/verify-email`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setState("error");
          return;
        }
        setState("success");
        void refresh();
      })
      .catch(() => setState("error"));
  }, [token, refresh]);

  if (state === "missing-token") {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Invalid link</h1>
        <p className="mt-4 text-base text-ink-200">
          This verification link is missing its token.
        </p>
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Verifying your email…</h1>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold text-ink-50 sm:text-3xl">Verification failed</h1>
        <p className="mt-4 text-base text-ink-200">
          This verification link is invalid or has expired.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/account">Go to your account</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12 text-center sm:px-6 sm:py-16">
      <Check className="mx-auto h-10 w-10 text-signal-green" />
      <h1 className="mt-4 text-2xl font-bold text-ink-50 sm:text-3xl">Email verified</h1>
      <p className="mt-4 text-base text-ink-200">Your email address has been confirmed.</p>
      <Button asChild size="lg" className="mt-8">
        <Link to="/account">Go to your account</Link>
      </Button>
    </section>
  );
}
