import type { Conversation, ConversationMessage, MessagePage } from "@/types/api";

export function recipientName(person: Conversation["recipient"]): string {
  return person?.name?.trim() || (person?.username ? `@${person.username}` : "Unavailable account");
}

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

type Load = (direction: { beforeId?: number; afterId?: number }) => Promise<MessagePage>;

// Acknowledged sends can appear immediately. Only REST pages advance the forward cursor.
export class ThreadHistory {
  rows: ConversationMessage[] = [];
  before: number | null = null;
  private cursor: number | null = null;

  acknowledge(row: ConversationMessage) {
    if (row.id > (this.cursor ?? 0)) this.rows = mergeMessages(this.rows, [row]);
  }

  async sync(load: Load, structural: boolean) {
    if (structural || this.cursor === null) {
      const oldest = this.rows[0]?.id;
      const fresh: ConversationMessage[] = [];
      let before: number | null = null;
      do {
        const page: MessagePage = await load(before === null ? {} : { beforeId: before });
        fresh.push(...page.data);
        if (!page.meta.has_more) { before = null; break; }
        const next = page.meta.next_before_id;
        if (!next || (before !== null && next >= before)) throw Error("Invalid history cursor");
        before = next;
      } while (oldest !== undefined && before > oldest);
      this.rows = mergeMessages(fresh);
      this.before = before;
      this.cursor = newestMessageId(this.rows);
      return;
    }
    for (;;) {
      const afterId: number = this.cursor;
      const page = await load({ afterId });
      const next = page.meta.next_after_id;
      if (next === null || next < afterId || (page.meta.has_more && next === afterId)) throw Error("Invalid message cursor");
      this.rows = mergeMessages(this.rows, page.data);
      this.cursor = next;
      if (!page.meta.has_more) return;
    }
  }

  async older(load: Load) {
    if (this.before === null) return;
    const page = await load({ beforeId: this.before });
    const next = page.meta.next_before_id;
    if (page.meta.has_more && (!next || next >= this.before)) throw Error("Invalid history cursor");
    this.rows = mergeMessages(page.data, this.rows);
    this.before = page.meta.has_more ? next : null;
  }
}
