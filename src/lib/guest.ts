import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const GUEST_ID_COOKIE = "fixly_guest_id";
const GUEST_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const getGuestId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_ID_COOKIE)?.value ?? null;
};

export const getOrCreateGuestId = async () => {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_ID_COOKIE)?.value;
  if (existing) return existing;
  const guestId = randomUUID();
  cookieStore.set(GUEST_ID_COOKIE, guestId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_ID_MAX_AGE_SECONDS,
  });
  return guestId;
};
