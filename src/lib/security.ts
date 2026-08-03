/**
 * Client-side security utilities for DataFlex.
 *
 * NOTE: this build is a front-end-only prototype (no server yet), so these
 * controls are defence-in-depth for the browser surface: credentials are never
 * stored in plaintext, comparisons are constant-time, every auth entry point is
 * rate limited, and all user input is schema-validated before it is trusted.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Validation schemas
 * ------------------------------------------------------------------ */

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name is too long")
  .regex(/^[\p{L}][\p{L}\s'’.-]*$/u, "Name contains invalid characters");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email is too long");

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(?:0\d{9}|\+233\d{9}|233\d{9})$/, "Enter a valid Ghana phone number"),
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const passcodeSchema = z
  .string()
  .regex(/^\d{4}$/, "Passcode must be exactly 4 digits");

/** Normalise a Ghana phone number to a comparable form. */
export const normalizePhone = (phone: string) =>
  phone.replace(/[\s-]/g, "").replace(/^\+?233/, "0");

/** Strip control characters / angle brackets from free text before storing. */
export const sanitizeText = (value: string, max = 500) =>
  value
    .replace(/[<>]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);

/* ------------------------------------------------------------------ *
 * Hashing (PBKDF2-SHA256 via WebCrypto, with a safe fallback)
 * ------------------------------------------------------------------ */

const ITERATIONS = 150_000;

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export function randomSalt(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

async function pbkdf2(secret: string, salt: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashSecret(secret: string, salt = randomSalt()) {
  return { salt, hash: await pbkdf2(secret, salt) };
}

/** Constant-time string comparison — avoids timing side channels. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySecret(secret: string, salt: string, hash: string) {
  const computed = await pbkdf2(secret, salt);
  return safeEqual(computed, hash);
}

/* ------------------------------------------------------------------ *
 * Brute-force throttling
 * ------------------------------------------------------------------ */

const THROTTLE_KEY = "dataflex-auth-throttle";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

type ThrottleMap = Record<string, { count: number; until: number }>;

function readThrottle(): ThrottleMap {
  try {
    return JSON.parse(localStorage.getItem(THROTTLE_KEY) ?? "{}") as ThrottleMap;
  } catch {
    return {};
  }
}

function writeThrottle(map: ThrottleMap) {
  try {
    localStorage.setItem(THROTTLE_KEY, JSON.stringify(map));
  } catch {}
}

/** Throws when the identifier is temporarily locked out. */
export function assertNotLocked(identifier: string) {
  const key = identifier.toLowerCase();
  const entry = readThrottle()[key];
  if (entry && entry.until > Date.now()) {
    const mins = Math.ceil((entry.until - Date.now()) / 60000);
    throw new Error(`Too many failed attempts. Try again in ${mins} minute(s).`);
  }
}

export function recordFailure(identifier: string) {
  const key = identifier.toLowerCase();
  const map = readThrottle();
  const entry = map[key] && map[key].until > Date.now() ? map[key] : { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) entry.until = Date.now() + LOCK_MS;
  map[key] = entry;
  writeThrottle(map);
  return MAX_ATTEMPTS - entry.count;
}

export function clearFailures(identifier: string) {
  const map = readThrottle();
  delete map[identifier.toLowerCase()];
  writeThrottle(map);
}

/* ------------------------------------------------------------------ *
 * Credential store (hashed — never plaintext)
 * ------------------------------------------------------------------ */

const CRED_KEY = "dataflex-credentials";

export interface Credential {
  email: string;
  name: string;
  phone: string;
  salt: string;
  hash: string; // password hash (empty for phone-identity accounts)
  phoneSalt: string;
  phoneHash: string; // hash of `${name}|${phone}` for the quick log-in flow
  createdAt: string;
}

function readCreds(): Credential[] {
  try {
    return JSON.parse(localStorage.getItem(CRED_KEY) ?? "[]") as Credential[];
  } catch {
    return [];
  }
}

function writeCreds(list: Credential[]) {
  try {
    localStorage.setItem(CRED_KEY, JSON.stringify(list));
  } catch {}
}

export function findCredentialByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return readCreds().find((c) => c.email === e);
}

export function findCredentialByPhone(phone: string) {
  const p = normalizePhone(phone);
  return readCreds().find((c) => normalizePhone(c.phone) === p);
}

const identityKey = (name: string, phone: string) =>
  `${name.trim().toLowerCase()}|${normalizePhone(phone)}`;

export async function registerCredential(input: {
  name: string;
  email: string;
  phone: string;
  password?: string;
}): Promise<Credential> {
  const name = nameSchema.parse(input.name);
  const email = emailSchema.parse(input.email);
  const phone = phoneSchema.parse(input.phone);

  const list = readCreds();
  if (list.some((c) => c.email === email))
    throw new Error("An account with this email already exists. Please log in.");
  if (list.some((c) => normalizePhone(c.phone) === normalizePhone(phone)))
    throw new Error("An account with this phone number already exists. Please log in.");

  const pwd = input.password ? passwordSchema.parse(input.password) : "";
  const { salt, hash } = pwd ? await hashSecret(pwd) : { salt: "", hash: "" };
  const ident = await hashSecret(identityKey(name, phone));

  const cred: Credential = {
    email,
    name,
    phone: normalizePhone(phone),
    salt,
    hash,
    phoneSalt: ident.salt,
    phoneHash: ident.hash,
    createdAt: new Date().toISOString(),
  };
  list.push(cred);
  writeCreds(list);
  return cred;
}

/** Email + password sign-in. Wrong password (or unknown email) always fails. */
export async function verifyPassword(emailRaw: string, password: string): Promise<Credential> {
  const email = emailSchema.parse(emailRaw);
  assertNotLocked(email);
  const cred = findCredentialByEmail(email);
  // Always run a hash to keep timing uniform for unknown accounts.
  const ok =
    !!cred && !!cred.hash && (await verifySecret(password, cred.salt, cred.hash));
  if (!ok) {
    const left = recordFailure(email);
    throw new Error(
      left > 0
        ? `Incorrect email or password. ${left} attempt(s) left.`
        : "Too many failed attempts. Your account is temporarily locked.",
    );
  }
  clearFailures(email);
  return cred;
}

/** Username + registered phone log-in used by the landing page. */
export async function verifyPhoneIdentity(name: string, phone: string): Promise<Credential> {
  const cleanName = nameSchema.parse(name);
  const cleanPhone = phoneSchema.parse(phone);
  const id = normalizePhone(cleanPhone);
  assertNotLocked(id);
  const cred = findCredentialByPhone(id);
  const ok =
    !!cred &&
    (await verifySecret(identityKey(cleanName, id), cred.phoneSalt, cred.phoneHash));
  if (!ok) {
    const left = recordFailure(id);
    throw new Error(
      left > 0
        ? `No account matches that username and number. ${left} attempt(s) left.`
        : "Too many failed attempts. Try again later.",
    );
  }
  clearFailures(id);
  return cred;
}

/* ------------------------------------------------------------------ *
 * Admin withdrawal passcode (4 digits, hashed + throttled)
 * ------------------------------------------------------------------ */

const PASSCODE_KEY = "dataflex-withdraw-passcode";

export function hasPasscode(adminId: string) {
  try {
    const map = JSON.parse(localStorage.getItem(PASSCODE_KEY) ?? "{}");
    return Boolean(map[adminId]);
  } catch {
    return false;
  }
}

export async function setPasscode(adminId: string, passcode: string) {
  passcodeSchema.parse(passcode);
  const { salt, hash } = await hashSecret(passcode);
  try {
    const map = JSON.parse(localStorage.getItem(PASSCODE_KEY) ?? "{}");
    map[adminId] = { salt, hash };
    localStorage.setItem(PASSCODE_KEY, JSON.stringify(map));
  } catch {}
}

export async function verifyPasscode(adminId: string, passcode: string) {
  passcodeSchema.parse(passcode);
  const throttleId = `passcode:${adminId}`;
  assertNotLocked(throttleId);
  let entry: { salt: string; hash: string } | undefined;
  try {
    entry = JSON.parse(localStorage.getItem(PASSCODE_KEY) ?? "{}")[adminId];
  } catch {}
  const ok = !!entry && (await verifySecret(passcode, entry.salt, entry.hash));
  if (!ok) {
    const left = recordFailure(throttleId);
    throw new Error(
      left > 0 ? `Incorrect passcode. ${left} attempt(s) left.` : "Locked for 15 minutes.",
    );
  }
  clearFailures(throttleId);
  return true;
}

/** Friendly message for any thrown validation/auth error. */
export function messageFor(err: unknown, fallback = "Something went wrong") {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? fallback;
  if (err instanceof Error) return err.message;
  return fallback;
}
