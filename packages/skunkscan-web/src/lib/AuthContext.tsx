import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "./api";

export type SkunkScanUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
};

type AuthContextValue = {
  // undefined = still resolving the initial GET /me on mount, null = resolved,
  // no session. Kept distinct from `null` so route guards (Account.tsx) don't
  // redirect-to-login for a split second before the real session state is known.
  user: SkunkScanUser | null | undefined;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SkunkScanUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/skunkscan/auth/me`, {
        credentials: "include",
      });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const body = (await response.json()) as { user: SkunkScanUser };
      setUser(body.user);
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/skunkscan/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ user, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
