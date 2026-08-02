import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, extra?: Partial<User>) => Promise<void>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<void>;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "datahub-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const signIn: AuthContextValue["signIn"] = async (email, _password, extra) => {
    await new Promise((r) => setTimeout(r, 500));
    const name = email.split("@")[0].replace(/[._-]/g, " ");
    persist({
      id: crypto.randomUUID(),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email,
      createdAt: new Date().toISOString(),
      ...extra,
    });
  };

  const signUp: AuthContextValue["signUp"] = async (name, email, phone) => {
    await new Promise((r) => setTimeout(r, 700));
    persist({
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      createdAt: new Date().toISOString(),
    });
  };

  const signOut = () => persist(null);
  const updateUser = (patch: Partial<User>) => user && persist({ ...user, ...patch });

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
