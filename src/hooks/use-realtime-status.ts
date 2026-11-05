"use client";

import { useSyncExternalStore } from "react";
import { getRealtimeServerStatus, getRealtimeStatus, subscribeRealtimeStatus } from "@/lib/realtime";

export function useRealtimeStatus() {
  return useSyncExternalStore(subscribeRealtimeStatus, getRealtimeStatus, getRealtimeServerStatus);
}
