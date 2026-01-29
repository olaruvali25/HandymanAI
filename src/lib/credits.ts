export const CREDIT_STORAGE_KEY = "fixly_credits";
export const ANON_ID_STORAGE_KEY = "fixly_anon_id";
export const INITIAL_CREDITS = 20;

const isBrowser = () => typeof window !== "undefined";

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
};

export const getStoredCredits = (): number | null => {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(CREDIT_STORAGE_KEY);
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
};

export const setStoredCredits = (value: number) => {
  if (!isBrowser()) return;
  if (!Number.isFinite(value)) return;
  const normalized = Math.max(0, Math.floor(value));
  localStorage.setItem(CREDIT_STORAGE_KEY, String(normalized));
};

export const ensureAnonymousId = (): string | null => {
  if (!isBrowser()) return null;
  const existing = localStorage.getItem(ANON_ID_STORAGE_KEY);
  if (existing) return existing;
  const next = generateId();
  localStorage.setItem(ANON_ID_STORAGE_KEY, next);
  return next;
};

export const ensureInitialCredits = (): number | null => {
  if (!isBrowser()) return null;
  const existing = getStoredCredits();
  if (existing !== null) return existing;
  setStoredCredits(INITIAL_CREDITS);
  return INITIAL_CREDITS;
};
