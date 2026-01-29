export const CREDIT_STORAGE_KEY = "fixly_credits";
export const ANON_STORAGE_KEY = "fixly_anon_id";
const GUEST_CHAT_KEY = "fixly_guest_chat_id";
const COOKIE_TTL = 60 * 60 * 24 * 90; // 90 days
export const INITIAL_FREE_CREDITS = 20;

const isBrowser = () => typeof window !== "undefined";

const parseCookieValue = (name: string) => {
  if (!isBrowser()) return null;
  const cookies = document.cookie.split(";").map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  const [, value] = match.split("=");
  return value || null;
};

const setAnonCookie = (value: string) => {
  if (!isBrowser()) return;
  const encoded = encodeURIComponent(value);
  document.cookie = `fixly_anon=${encoded}; Path=/; Max-Age=${COOKIE_TTL}; SameSite=Lax`;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
};

export const getStoredCredits = (): number | null => {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(CREDIT_STORAGE_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};

export const setStoredCredits = (value: number) => {
  if (!isBrowser()) return;
  if (!Number.isFinite(value)) return;
  const normalized = Math.max(0, Math.floor(value));
  localStorage.setItem(CREDIT_STORAGE_KEY, String(normalized));
};

export const ensureAnonymousId = (): string | null => {
  if (!isBrowser()) return null;
  const fromStorage = localStorage.getItem(ANON_STORAGE_KEY);
  const fromCookie = parseCookieValue("fixly_anon");
  const fromGuestChat = localStorage.getItem(GUEST_CHAT_KEY);
  const resolved = fromStorage ?? fromCookie ?? fromGuestChat ?? generateId();

  if (!fromStorage) {
    localStorage.setItem(ANON_STORAGE_KEY, resolved);
  }
  if (!fromGuestChat) {
    localStorage.setItem(GUEST_CHAT_KEY, resolved);
  }
  if (!fromCookie) {
    setAnonCookie(resolved);
  }

  return resolved;
};

export const ensureInitialCredits = (): number | null => {
  if (!isBrowser()) return null;
  const existing = getStoredCredits();
  if (existing !== null) return existing;
  setStoredCredits(INITIAL_FREE_CREDITS);
  return INITIAL_FREE_CREDITS;
};
