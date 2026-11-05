"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ExternalLink, XCircle } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { useCheckoutAttempt } from "@/hooks/use-checkout-attempt";
import { checkoutPollDelays, checkoutReconciliationState } from "@/lib/billing";
import { clearCheckoutAttempt, getCheckout, getEntitlements, getSubscription } from "@/services/billing";
import type { CheckoutStatus } from "@/types/api";

export function CheckoutResult({ cancelled = false }: { cancelled?: boolean }) {
  const search = useSearchParams();
  const { token, user } = useAuth();
  const client = useQueryClient();
  const storedAttempt = useCheckoutAttempt(user?.id);
  const reference = search.get("reference") ?? storedAttempt?.reference ?? null;
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [verifiedAccess, setVerifiedAccess] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !user || !reference) return;
    let stopped = false;
    let timer = 0;

    const poll = async (attempt: number) => {
      try {
        const response = await getCheckout(reference, token);
        if (stopped) return;
        setStatus(response.data);
        const state = checkoutReconciliationState(response.data);
        if (state === "terminal") {
          clearCheckoutAttempt(user.id);
          return;
        }
        if (state === "verified") {
          const [subscription, entitlements] = await Promise.all([getSubscription(token), getEntitlements(token)]);
          if (stopped) return;
          client.setQueryData(["subscription", user.id], subscription);
          client.setQueryData(["entitlements", user.id], entitlements);
          if (entitlements.data.effective_plan !== "free") {
            setVerifiedAccess(true);
            clearCheckoutAttempt(user.id);
            return;
          }
        }
        setError("");
      } catch (caught) {
        if (stopped) return;
        setError(caught instanceof Error ? caught.message : "Checkout status is temporarily unavailable.");
      }

      const nextAttempt = attempt + 1;
      if (nextAttempt >= checkoutPollDelays.length) {
        setExhausted(true);
        return;
      }
      timer = window.setTimeout(() => void poll(nextAttempt), checkoutPollDelays[nextAttempt]);
    };

    void poll(0);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [client, reference, token, user]);

  const reconciliation = status ? checkoutReconciliationState(status) : "pending";
  const terminal = reconciliation === "terminal";
  const cancelledStatus = status?.status === "cancelled" || (!status && cancelled);
  const heading = verifiedAccess
    ? "Your plan is active"
    : terminal
      ? status?.status === "expired" ? "Checkout expired" : status?.status === "failed" ? "Payment was not completed" : "Checkout was cancelled"
      : exhausted
        ? "Purchase still reconciling"
        : cancelledStatus
          ? "Checking the cancelled checkout"
          : "Confirming your purchase";
  const message = verifiedAccess
    ? "Verified paid access is now active in your artist workspace."
    : terminal
      ? "No new paid access was granted. You can review the current catalog and begin a new purchase."
      : exhausted
        ? "The checkout or invoice is taking longer than expected. Your reference is preserved; check Billing later or give it to support. Do not start a second purchase."
        : status?.status === "completed" || reconciliation === "reconciling"
          ? "Checkout completed, but the verified invoice period is still being reconciled. Paid tools remain locked until entitlements confirm access."
          : cancelledStatus
            ? "The browser returned from cancellation. The backend record is being checked before the saved operation is released."
            : "This page checks the backend record and current entitlements. The provider redirect alone never grants paid access.";
  const Icon = verifiedAccess ? CheckCircle2 : terminal || cancelledStatus ? XCircle : Clock3;

  return <section className="page-content grid h-full place-items-center overflow-y-auto px-5"><div className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center"><Icon size={48} className={`mx-auto ${verifiedAccess ? "text-emerald-400" : terminal || cancelledStatus ? "text-amber-400" : "text-[var(--royal)]"}`} /><h1 className="mt-5 text-2xl font-semibold">{heading}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message}</p>{reference ? <p className="mt-4 break-all text-xs text-[var(--muted)]">Reference: {reference}</p> : <p role="alert" className="mt-4 text-sm text-pink-400">No checkout reference was found in this return or the saved account attempt.</p>}{status?.expires_at && <p className="mt-2 text-xs text-[var(--muted)]">Checkout expires {new Date(status.expires_at).toLocaleString()}</p>}{error && <p className="mt-4 text-sm text-pink-400">{error}</p>}<div className="mt-7 flex flex-wrap justify-center gap-3"><Link href={verifiedAccess ? "/studio" : terminal ? "/pricing" : "/settings/billing"} className="primary-button">{verifiedAccess ? "Open workspace" : terminal ? "Back to plans" : "Open billing"}</Link>{!terminal && storedAttempt?.checkoutUrl && !verifiedAccess && <a href={storedAttempt.checkoutUrl} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Resume checkout <ExternalLink size={14} /></a>}<Link href="/pricing" className="inline-flex h-10 items-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">View plans</Link></div></div></section>;
}
