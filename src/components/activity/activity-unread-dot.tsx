"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/common/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { getNotificationUnreadCount, NOTIFICATION_REFRESH_INTERVAL_MS } from "@/services/notifications";

export function ActivityUnreadDot() {
  const { authenticated, token, user } = useAuth();
  const { data } = useQuery({
    queryKey: [...queryKeys.notifications(user?.id ?? 0), "unread-count"],
    queryFn: () => getNotificationUnreadCount(token!),
    enabled: authenticated && Boolean(token && user),
    refetchInterval: NOTIFICATION_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  if (!data?.data.unread_count) return null;

  return <span className="block h-2 w-2 shrink-0 rounded-full bg-[var(--pink-signal)]" aria-label="Unread activity" title="Unread activity" />;
}
