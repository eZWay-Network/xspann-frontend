"use client";

import { useCommunicationSummary } from "@/hooks/use-communication-summary";

export function InboxUnreadDot() {
  const { data } = useCommunicationSummary();
  if (!data?.unread_messages) return null;
  return <span className="block h-2 w-2 shrink-0 rounded-full bg-[var(--pink-signal)]" aria-label={`${data.unread_messages} unread messages`} title={`${data.unread_messages} unread messages`} />;
}
