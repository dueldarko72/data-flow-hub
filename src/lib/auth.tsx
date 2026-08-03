import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  registerCredential,
  verifyPassword,
  verifyPhoneIdentity,
  emailSchema,
  nameSchema,
  phoneSchema,
  normalizePhone,
} from "./security";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

interface StoredSession {
  user: User;
  expiresAt: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<void>;
  /** Username + registered phone log-in (landing page quick log-in). */
  signInWithPhone: (name: string, phone: string) => Promise<void>;
  /** Create an account without a password (landing page quick sign-up). */
  registerQuick: (name: string, email: string, phone: string) => Promise<void>;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "datahub-user";
const SESSION_MS = 12 * 60 * 60 * 1000; // 12h absolute session lifetime

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredSession | User;
        const session = "expiresAt" in (parsed as StoredSession)
          ? (parsed as StoredSession)
          : null;
        if (session && session.expiresAt > Date.now()) setUser(session.user);
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    setLoading(false);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    try {
      if (u)
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: u, expiresAt: Date.now() + SESSION_MS } satisfies StoredSession),
        );
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const toUser = (c: { name: string; email: string; phone: string; createdAt: string }): User => ({
    id: crypto.randomUUID(),
    name: c.name,
    email: c.email,
    phone: c.phone,
    createdAt: c.createdAt,
  });

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const cred = await verifyPassword(email, password);
    persist(toUser(cred));
  };

  const signUp: AuthContextValue["signUp"] = async (name, email, phone, password) => {
    const cred = await registerCredential({ name, email, phone, password });
    persist(toUser(cred));
  };

  const signInWithPhone: AuthContextValue["signInWithPhone"] = async (name, phone) => {
    const cred = await verifyPhoneIdentity(name, phone);
    persist(toUser(cred));
  };

  const registerQuick: AuthContextValue["registerQuick"] = async (name, email, phone) => {
    const cleanName = nameSchema.parse(name);
    const cleanEmail = emailSchema.parse(email);
    const cleanPhone = normalizePhone(phoneSchema.parse(phone));
    const cred = await registerCredential({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
    });
    persist(toUser(cred));
  };

  const signOut = () => persist(null);
  const updateUser = (patch: Partial<User>) => user && persist({ ...user, ...patch });

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signInWithPhone, registerQuick, signOut, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
