export function boostSubmitStorageKey(userId: number, boostId: number, version: number) {
  return `xpn-boost-submit:${userId}:${boostId}:${version}`;
}

export function getBoostSubmitKey(userId: number, boostId: number, version: number) {
  const storageKey = boostSubmitStorageKey(userId, boostId, version);
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const key = crypto.randomUUID();
  localStorage.setItem(storageKey, key);
  return key;
}

export function clearBoostSubmitKey(userId: number, boostId: number, version: number) {
  localStorage.removeItem(boostSubmitStorageKey(userId, boostId, version));
}

function tokenFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

export function promotionEventStorageKey(eventToken: string, type: "render" | "click") {
  return `xpn-promotion-event:${type}:${tokenFingerprint(eventToken)}`;
}

export function getPromotionEventId(eventToken: string, type: "render" | "click") {
  const key = promotionEventStorageKey(eventToken, type);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

export function boostActionMessage(error: { status?: number; message?: string }) {
  if (error.status === 409) return "The campaign changed, credit is insufficient, or the requested interval has no remaining inventory. Reload its latest state before trying again.";
  if (error.status === 503) return "Promotion bookings are currently closed. The draft remains available and organic discovery is unaffected.";
  return error.message || "The campaign could not be updated.";
}

export function promotionStartFromLocal(value: string, now = new Date()) {
  const instant = new Date(value);
  if (!value || Number.isNaN(instant.getTime())) throw new Error("Choose a valid campaign start time.");
  if (instant.getTime() <= now.getTime()) throw new Error("Choose a campaign start time in the future.");
  if (instant.getTime() > now.getTime() + 90 * 24 * 60 * 60 * 1000) throw new Error("Campaigns can be scheduled up to 90 days ahead.");
  return instant.toISOString().replace(/\.\d{3}Z$/, "Z");
}
