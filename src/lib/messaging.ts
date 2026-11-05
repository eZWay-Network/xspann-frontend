import type { ConversationMessage } from "@/types/api";

export function mergeMessages(...groups: Array<ConversationMessage[] | undefined>) {
  const byId = new Map<number, ConversationMessage>();
  for (const message of groups.flatMap((group) => group ?? [])) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => left.id - right.id);
}

export function newestMessageId(messages: ConversationMessage[]) {
  return messages.reduce((latest, message) => Math.max(latest, message.id), 0);
}

export function displayedIncomingMessageId(messages: ConversationMessage[], viewerId?: number) {
  return messages.reduce(
    (latest, message) => message.sender_user_id !== viewerId ? Math.max(latest, message.id) : latest,
    0,
  );
}

export function announcementSendStorageKey(userId: number, announcementId: number, version: number) {
  return `xpn-announcement-send:${userId}:${announcementId}:${version}`;
}

export function getAnnouncementSendKey(userId: number, announcementId: number, version: number) {
  const storageKey = announcementSendStorageKey(userId, announcementId, version);
  const existing = typeof window === "undefined" ? null : localStorage.getItem(storageKey);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(storageKey, next);
  return next;
}

export function clearAnnouncementSendKey(userId: number, announcementId: number, version: number) {
  localStorage.removeItem(announcementSendStorageKey(userId, announcementId, version));
}
