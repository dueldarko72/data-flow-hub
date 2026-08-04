/**
 * Admin audit log — records every bundle edit, withdrawal action and
 * security-sensitive change with a timestamp and the acting admin's identity.
 */

export type AuditCategory = "bundle" | "withdrawal" | "security" | "user" | "settings";

export interface AuditEntry {
  id: string;
  createdAt: string;
  actor: string;
  category: AuditCategory;
  action: string;
  detail?: string;
}

const AUDIT_KEY = "dataflex-audit-log";
const MAX_ENTRIES = 500;

/** Best-effort identity of the signed-in admin (session is stored client-side). */
export function currentActor(): string {
  try {
    const raw = localStorage.getItem("datahub-user");
    if (raw) {
      const parsed = JSON.parse(raw);
      const u = parsed?.user ?? parsed;
      if (u?.email) return String(u.email);
      if (u?.name) return String(u.name);
    }
  } catch {}
  return "unknown";
}

export function loadAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (raw) return JSON.parse(raw) as AuditEntry[];
  } catch {}
  return [];
}

export function saveAuditLog(entries: AuditEntry[]) {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {}
}

export function recordAudit(
  category: AuditCategory,
  action: string,
  detail?: string,
  actor = currentActor(),
): AuditEntry {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    actor,
    category,
    action,
    detail,
  };
  const list = loadAuditLog();
  list.unshift(entry);
  saveAuditLog(list);
  return entry;
}

export function clearAuditLog() {
  recordAudit("security", "Audit log cleared");
  const keep = loadAuditLog().slice(0, 1);
  saveAuditLog(keep);
}
