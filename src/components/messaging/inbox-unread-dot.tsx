"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/common/auth-provider";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { getConversations } from "@/services/messaging";

export function InboxUnreadDot() {
  const { authenticated, token, user } = useAuth();
  const realtimeStatus = useRealtimeStatus();
  const { data } = useQuery({
    queryKey: ["conversation-unread", user?.id],
    queryFn: () => getConversations(token!),
    enabled: authenticated && Boolean(token && user) && realtimeStatus !== "connecting",
    refetchInterval: realtimeStatus === "ready" ? false : 30_000,
    refetchOnWindowFocus: true,
  });
  if (!data?.meta.unread_count) return null;
  return <span className="block h-2 w-2 shrink-0 rounded-full bg-[var(--pink-signal)]" aria-label={`${data.meta.unread_count} unread messages`} title={`${data.meta.unread_count} unread messages`} />;
}
