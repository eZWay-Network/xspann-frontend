export type RealtimeHint = { event: string; payload: Record<string, unknown> };

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export class RealtimeHintTracker {
  private readonly seen = new Set<string>();
  private readonly versions = new Map<string, number>();

  accept(event: string, payload: Record<string, unknown>) {
    const eventId = typeof payload.event_id === "string" ? payload.event_id : null;
    if (eventId && this.seen.has(eventId)) return false;

    const resourceId = positiveInteger(payload.conversation_id ?? payload.release_id ?? payload.boost_id ?? payload.placement_id ?? payload.id);
    const version = positiveInteger(payload.version);
    const family = event === "message.created" || event === "conversation.updated" ? "conversation"
      : event === "release.updated" ? "release"
        : event === "boost.updated" ? "boost"
          : event === "placement.updated" ? "placement" : event;
    const resourceKey = resourceId && version ? `${family}:${resourceId}` : null;
    if (resourceKey && version! <= (this.versions.get(resourceKey) ?? 0)) return false;

    if (eventId) {
      this.seen.add(eventId);
      if (this.seen.size > 500) this.seen.delete(this.seen.values().next().value!);
    }
    if (resourceKey && version) this.versions.set(resourceKey, version);
    return true;
  }
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
