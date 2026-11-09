"use client";

import { useCommunicationSummary } from "@/hooks/use-communication-summary";

export function ActivityUnreadDot() {
  const { data } = useCommunicationSummary();
  if (!data?.unread_notifications) return null;

  return <span className="block h-2 w-2 shrink-0 rounded-full bg-[var(--pink-signal)]" aria-label="Unread activity" title="Unread activity" />;
}
