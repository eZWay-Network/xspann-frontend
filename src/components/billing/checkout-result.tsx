"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { clearCheckoutAttempt, getCheckout, getStoredCheckoutAttempt } from "@/services/billing";
import type { CheckoutStatus } from "@/types/api";

export function CheckoutResult({ cancelled = false }: { cancelled?: boolean }) {
  const search = useSearchParams(); const { token } = useAuth(); const [status, setStatus] = useState<CheckoutStatus | null>(null); const [error, setError] = useState("");
  const reference = search.get("reference") ?? getStoredCheckoutAttempt()?.reference;
  useEffect(() => { if (!token || !reference) return; let stopped = false; let attempt = 0; const poll = async () => { try { const response = await getCheckout(reference, token); if (stopped) return; setStatus(response.data); if (["completed", "expired", "cancelled", "failed"].includes(response.data.status)) { if (response.data.status === "completed") clearCheckoutAttempt(); return; } if (attempt++ < 7) window.setTimeout(poll, Math.min(8000, 1000 * 2 ** attempt)); } catch (caught) { if (!stopped) setError(caught instanceof Error ? caught.message : "Checkout status is unavailable."); } }; void poll(); return () => { stopped = true; }; }, [reference, token]);
  const complete = status?.status === "completed" && !status.access_pending;
  return <section className="page-content grid h-full place-items-center overflow-y-auto px-5"><div className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center">{complete ? <CheckCircle2 size={48} className="mx-auto text-emerald-400" /> : cancelled ? <XCircle size={48} className="mx-auto text-amber-400" /> : <Clock3 size={48} className="mx-auto text-[var(--royal)]" />}<h1 className="mt-5 text-2xl font-semibold">{complete ? "Your plan is active" : cancelled ? "Checkout was cancelled" : "Confirming your purchase"}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{complete ? "Verified payment access is ready in your artist workspace." : cancelled ? "No access has been changed. You can resume the saved checkout or choose another plan." : status?.status === "completed" ? "Checkout completed. We are waiting for verified invoice reconciliation before unlocking paid tools." : "This page checks the backend record; the redirect alone never grants paid access."}</p>{reference && <p className="mt-4 break-all text-xs text-[var(--muted)]">Reference: {reference}</p>}{error && <p className="mt-4 text-sm text-pink-400">{error}</p>}<div className="mt-7 flex justify-center gap-3"><Link href={complete ? "/studio" : "/pricing"} className="primary-button">{complete ? "Open workspace" : "Back to plans"}</Link><Link href="/settings/billing" className="inline-flex h-10 items-center rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Billing settings</Link></div></div></section>;
}
