"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/common/auth-provider";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { queryKeys } from "@/lib/query-keys";
import { getCommunicationSummary } from "@/services/messaging";

export function useCommunicationSummary() {
  const { token, user } = useAuth();
  const status = useRealtimeStatus();
  return useQuery({
    queryKey: queryKeys.summary(user?.id ?? 0),
    queryFn: () => getCommunicationSummary(token!),
    enabled: Boolean(token && user && !user.restricted_access),
    staleTime: 1_000,
    refetchInterval: status === "ready" ? 75_000 : 20_000,
  });
}
