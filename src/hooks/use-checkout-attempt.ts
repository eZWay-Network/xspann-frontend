"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getCheckoutAttemptSnapshot, parseCheckoutAttemptSnapshot, subscribeCheckoutAttempts } from "@/services/billing";

export function useCheckoutAttempt(userId?: number) {
  const snapshot = useSyncExternalStore(
    subscribeCheckoutAttempts,
    () => userId ? getCheckoutAttemptSnapshot(userId) : null,
    () => null,
  );

  return useMemo(
    () => userId ? parseCheckoutAttemptSnapshot(snapshot, userId) : null,
    [snapshot, userId],
  );
}
