export type RealtimeHint = { event: string; payload: Record<string, unknown> };

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function threadForHint(event: string, payload: Record<string, unknown>) {
  if (event === "message.created") return positiveInteger(payload.conversation_id);
  if (event === "conversation.updated") return positiveInteger(payload.resource_id ?? payload.conversation_id);
  return null;
}

export class RealtimeHintTracker {
  private readonly seen = new Set<string>();

  accept(event: string, payload: Record<string, unknown>) {
    if (payload.type && payload.type !== event) return false;
    const id = payload.event_id;
    if (typeof id !== "string" || !id || this.seen.has(id)) return false;
    this.seen.add(id);
    if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value!);
    return true;
  }
}

// Browser timers accept at most a signed 32-bit delay (about 24.8 days).
const MAX_TIMER_DELAY = 2_147_483_647;

export function scheduleRealtimeExpiry(expiresAt: number, onExpire: () => void) {
  let timer: ReturnType<typeof setTimeout>;

  function checkExpiry() {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      onExpire();
      return;
    }
    timer = setTimeout(checkExpiry, Math.min(remaining, MAX_TIMER_DELAY));
  }

  checkExpiry();
  return () => clearTimeout(timer);
}

export const REALTIME_HINT_EVENT = "xpn-realtime-hint";

export type RealtimeStatus = "connecting" | "ready" | "offline";
let realtimeStatus: RealtimeStatus = "connecting";
const statusListeners = new Set<() => void>();
export function getRealtimeStatus() { return realtimeStatus; }
export function getRealtimeServerStatus(): RealtimeStatus { return "connecting"; }
export function subscribeRealtimeStatus(listener: () => void) { statusListeners.add(listener); return () => statusListeners.delete(listener); }
export function setRealtimeStatus(next: RealtimeStatus) {
  if (next === realtimeStatus) return;
  realtimeStatus = next;
  statusListeners.forEach((listener) => listener());
}
