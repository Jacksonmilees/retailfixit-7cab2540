import * as React from "react";
import type { User, Role } from "../types";
import { api } from "../api/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (role: Role | Role[]) => boolean;
}

const Ctx = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    api.me().then((u) => {
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const value = React.useMemo<AuthState>(() => ({
    user,
    loading,
    login: async (email, password) => {
      const { user } = await api.login(email, password);
      setUser(user);
      return user;
    },
    logout: async () => {
      await api.logout();
      setUser(null);
    },
    hasRole: (role) => {
      if (!user) return false;
      const need = Array.isArray(role) ? role : [role];
      return user.roles.some((r) => need.includes(r));
    },
  }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
