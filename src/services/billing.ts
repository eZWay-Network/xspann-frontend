import type { CheckoutStatus, Entitlements, Invoice, PaginatedResponse, PlanCatalog, SingleResponse, Subscription } from "@/types/api";
import { apiRequest } from "./api";

export const getPlans = () => apiRequest<SingleResponse<PlanCatalog>>("/plans");
export const getEntitlements = (token: string) => apiRequest<SingleResponse<Entitlements>>("/me/entitlements", { token });
export const getSubscription = (token: string) => apiRequest<SingleResponse<Subscription>>("/me/subscription", { token });
export const getInvoices = (token: string, page = 1) => apiRequest<PaginatedResponse<Invoice>>(`/me/billing/invoices?page=${page}&limit=20`, { token });
export const getCheckout = (reference: string, token: string) => apiRequest<SingleResponse<CheckoutStatus>>(`/billing/checkouts/${encodeURIComponent(reference)}`, { token });

export function createCheckout(planCode: string, offerVersion: string, idempotencyKey: string, token: string) {
  return apiRequest<SingleResponse<{ reference: string; url: string }>>("/billing/checkout", {
    method: "POST", token, headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ plan_code: planCode, offer_version: offerVersion }),
  });
}

export const createBillingPortal = (token: string) => apiRequest<SingleResponse<{ url: string }>>("/billing/portal", { method: "POST", token });
export const cancelSubscription = (token: string) => apiRequest<SingleResponse<Subscription>>("/billing/subscription/cancel", { method: "POST", token });
export const resumeSubscription = (token: string) => apiRequest<SingleResponse<Subscription>>("/billing/subscription/resume", { method: "POST", token });

const CHECKOUT_ATTEMPT_KEY = "xpn-billing-checkout-attempt";
const CHECKOUT_ATTEMPT_EVENT = "xpn-billing-checkout-attempt-changed";
export type StoredCheckoutAttempt = { userId: number; key: string; planCode: string; offerVersion: string; reference?: string; checkoutUrl?: string; createdAt: string; lastAttemptAt?: string };
function checkoutAttemptKey(userId: number) { return `${CHECKOUT_ATTEMPT_KEY}:${userId}`; }
export function getCheckoutAttemptSnapshot(userId: number) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(checkoutAttemptKey(userId));
}
export function parseCheckoutAttemptSnapshot(snapshot: string | null, userId: number): StoredCheckoutAttempt | null {
  try {
    const value = JSON.parse(snapshot ?? "null") as StoredCheckoutAttempt | null;
    return value?.userId === userId ? value : null;
  } catch { return null; }
}
export function subscribeCheckoutAttempts(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHECKOUT_ATTEMPT_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHECKOUT_ATTEMPT_EVENT, onStoreChange);
  };
}
export function getStoredCheckoutAttempt(userId: number): StoredCheckoutAttempt | null {
  return parseCheckoutAttemptSnapshot(getCheckoutAttemptSnapshot(userId), userId);
}
export function storeCheckoutAttempt(value: StoredCheckoutAttempt) {
  localStorage.setItem(checkoutAttemptKey(value.userId), JSON.stringify(value));
  window.dispatchEvent(new Event(CHECKOUT_ATTEMPT_EVENT));
}
export function clearCheckoutAttempt(userId: number) {
  localStorage.removeItem(checkoutAttemptKey(userId));
  window.dispatchEvent(new Event(CHECKOUT_ATTEMPT_EVENT));
}
