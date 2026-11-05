import type { CheckoutStatus } from "@/types/api";

export type CheckoutReconciliationState = "pending" | "reconciling" | "verified" | "terminal";

export function checkoutReconciliationState(status: CheckoutStatus): CheckoutReconciliationState {
  if (["expired", "cancelled", "failed"].includes(status.status)) return "terminal";
  if (status.status === "completed") return status.access_pending ? "reconciling" : "verified";
  return "pending";
}

export function checkoutAttemptMatches(
  attempt: { planCode: string; offerVersion: string } | null,
  planCode: string,
  offerVersion: string,
) {
  return Boolean(attempt && attempt.planCode === planCode && attempt.offerVersion === offerVersion);
}

export const checkoutPollDelays = [0, 1_000, 2_000, 4_000, 8_000, 8_000, 8_000, 8_000, 8_000];
