import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
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
  balance?: number;
  createdAt: string;
}

interface StoredSession {
  user: User;
  expiresAt: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isSupabaseActive: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<void>;
  /** Username + registered phone log-in (landing page quick log-in). */
  signInWithPhone: (name: string, phone: string) => Promise<void>;
  /** Create an account without a password (landing page quick sign-up). */
  registerQuick: (name: string, email: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "datahub-user";
const SESSION_MS = 12 * 60 * 60 * 1000; // 12h absolute session lifetime

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isSupabaseActive = isSupabaseConfigured();

  // Load user profile from Supabase profiles table
  const fetchSupabaseProfile = async (authUserId: string, authUserEmail: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUserId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching Supabase profile:", error);
      }

      if (data) {
        return {
          id: data.id,
          name: data.name || authUserEmail.split("@")[0],
          email: data.email || authUserEmail,
          phone: data.phone || "",
          avatarUrl: data.avatar_url || "",
          balance: Number(data.balance ?? 5000),
          createdAt: data.created_at || new Date().toISOString(),
        } satisfies User;
      }
    } catch (e) {
      console.error("Failed to query profiles table:", e);
    }

    return {
      id: authUserId,
      name: authUserEmail.split("@")[0],
      email: authUserEmail,
      createdAt: new Date().toISOString(),
      balance: 5000,
    } satisfies User;
  };

  useEffect(() => {
    if (isSupabaseActive) {
      // Supabase authentication listener
      const initializeSupabaseAuth = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchSupabaseProfile(session.user.id, session.user.email || "");
          setUser(profile);
        }
        setLoading(false);
      };

      initializeSupabaseAuth();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await fetchSupabaseProfile(session.user.id, session.user.email || "");
          setUser(profile);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Fallback local storage session initialization
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredSession | User;
          const session =
            "expiresAt" in (parsed as StoredSession) ? (parsed as StoredSession) : null;
          if (session && session.expiresAt > Date.now()) setUser(session.user);
          else localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
      setLoading(false);
    }
  }, [isSupabaseActive]);

  const persistLocal = (u: User | null) => {
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
    balance: 5000,
  });

  const getDeterministicPassword = (phone: string) => {
    return `DF_User_${phone.replace(/\D/g, "")}_SecurePass123!`;
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (isSupabaseActive) {
      const cleanEmail = email.trim().toLowerCase();
      // Special validation for admin account
      if (cleanEmail === "admin@datahub.gghh" && password !== "12345678jW") {
        throw new Error("Invalid password for Director account.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw new Error(error.message);
      if (data.user) {
        const profile = await fetchSupabaseProfile(data.user.id, data.user.email || email);
        setUser(profile);
      }
    } else {
      const cred = await verifyPassword(email, password);
      persistLocal(toUser(cred));
    }
  };

  const signUp: AuthContextValue["signUp"] = async (name, email, phone, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);

    // Enforce admin creation requirements
    if (cleanEmail === "admin@datahub.gghh") {
      if (name !== "Director") {
        throw new Error("Admin registration requires name to be exactly 'Director'.");
      }
      if (cleanPhone !== normalizePhone("0551875611")) {
        throw new Error("Admin registration requires phone to be exactly '0551875611'.");
      }
      if (password !== "12345678jW") {
        throw new Error("Admin registration requires password to be exactly '12345678jW'.");
      }
    }

    if (isSupabaseActive) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name, phone: cleanPhone },
        },
      });
      if (error) throw new Error(error.message);

      if (data.user) {
        // Upsert into profiles table explicitly
        await supabase.from("profiles").upsert([
          {
            id: data.user.id,
            name,
            email: cleanEmail,
            phone: cleanPhone,
            balance: 5000.0,
            role: cleanEmail === "admin@datahub.gghh" ? "admin" : "customer",
          },
        ]);
        const profile = await fetchSupabaseProfile(data.user.id, cleanEmail);
        setUser(profile);
      }
    } else {
      const cred = await registerCredential({
        name,
        email: cleanEmail,
        phone: cleanPhone,
        password,
      });
      persistLocal(toUser(cred));
    }
  };

  const signInWithPhone: AuthContextValue["signInWithPhone"] = async (name, phone) => {
    const cleanPhone = normalizePhone(phone);

    // Prevent quick phone log-in for the admin email
    if (cleanPhone === normalizePhone("0551875611") || name.toLowerCase() === "director") {
      throw new Error("Admin access must be authenticated with email and password.");
    }

    if (isSupabaseActive) {
      // Find the user's email from the Supabase profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        throw new Error("No account found with this phone number. Please register first.");
      }

      const tempPass = getDeterministicPassword(cleanPhone);
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: tempPass,
      });

      if (signInError) {
        console.error("Supabase phone login error:", signInError);
        throw new Error(`Login failed: ${signInError.message}`);
      }

      if (authData.user) {
        const profile = await fetchSupabaseProfile(authData.user.id, data.email);
        setUser(profile);
      }
    } else {
      const cred = await verifyPhoneIdentity(name, phone);
      persistLocal(toUser(cred));
    }
  };

  const registerQuick: AuthContextValue["registerQuick"] = async (name, email, phone) => {
    const cleanName = nameSchema.parse(name);
    const cleanEmail = emailSchema.parse(email);
    const cleanPhone = normalizePhone(phoneSchema.parse(phone));

    // Block registering admin email via quick registration
    if (cleanEmail === "admin@datahub.gghh" || cleanPhone === normalizePhone("0551875611")) {
      throw new Error("Admin account cannot be created using quick registration.");
    }

    if (isSupabaseActive) {
      // Quick registration with deterministic temp password in Supabase
      const tempPass = getDeterministicPassword(cleanPhone);
      await signUp(cleanName, cleanEmail, cleanPhone, tempPass);
    } else {
      const cred = await registerCredential({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
      });
      persistLocal(toUser(cred));
    }
  };

  const signOut = async () => {
    if (isSupabaseActive) {
      await supabase.auth.signOut();
    }
    persistLocal(null);
  };

  const updateUser = async (patch: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...patch };
    setUser(updated);

    if (isSupabaseActive) {
      await supabase
        .from("profiles")
        .update({
          name: updated.name,
          phone: updated.phone,
          avatar_url: updated.avatarUrl,
          balance: updated.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else {
      persistLocal(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseActive,
        signIn,
        signUp,
        signInWithPhone,
        registerQuick,
        signOut,
        updateUser,
      }}
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
