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
export type StoredCheckoutAttempt = { key: string; planCode: string; offerVersion: string; reference?: string; createdAt: string };
export function getStoredCheckoutAttempt(): StoredCheckoutAttempt | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(CHECKOUT_ATTEMPT_KEY) ?? "null") as StoredCheckoutAttempt | null; } catch { return null; }
}
export function storeCheckoutAttempt(value: StoredCheckoutAttempt) { localStorage.setItem(CHECKOUT_ATTEMPT_KEY, JSON.stringify(value)); }
export function clearCheckoutAttempt() { localStorage.removeItem(CHECKOUT_ATTEMPT_KEY); }
