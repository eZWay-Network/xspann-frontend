"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { ApiError } from "@/services/api";
import { createCheckout, getPlans, getStoredCheckoutAttempt, storeCheckoutAttempt } from "@/services/billing";
import type { PlanOffer } from "@/types/api";
import { useState } from "react";

export function PricingPage() {
  const { token, authenticated } = useAuth();
  const plans = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: 5 * 60_000 });
  const [error, setError] = useState("");
  const checkout = useMutation({
    mutationFn: async (offer: PlanOffer) => {
      const existing = getStoredCheckoutAttempt();
      const key = existing?.planCode === offer.code && existing.offerVersion === offer.offer_version ? existing.key : crypto.randomUUID();
      const attempt = { key, planCode: offer.code, offerVersion: offer.offer_version ?? "", createdAt: new Date().toISOString() };
      storeCheckoutAttempt(attempt);
      const response = await createCheckout(offer.code, offer.offer_version ?? "", key, token!);
      storeCheckoutAttempt({ ...attempt, reference: response.data.reference });
      window.location.assign(response.data.url);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Checkout could not be started. Your purchase attempt is saved safely."),
  });
  const catalog = plans.data?.data;

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-[var(--royal)]"><Sparkles size={14} /> Built for independent artists</span><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Grow your artist workspace</h1><p className="mt-4 text-base leading-7 text-[var(--muted)]">Start free, then unlock the tools you need. Monthly plans, clear limits and no hidden audience promises.</p>{catalog?.environment === "test" && <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300"><ShieldCheck size={15} /> Test purchases only — no live charge</p>}</div>
    {error && <p role="alert" className="mx-auto mt-7 max-w-2xl rounded-xl border border-pink-500/20 bg-pink-500/10 p-4 text-sm text-pink-300">{error}</p>}
    <div className="mt-10 grid gap-5 lg:grid-cols-3">{catalog?.offers.map((offer) => <PlanCard key={offer.code} offer={offer} environment={catalog.environment} authenticated={authenticated} busy={checkout.isPending} onCheckout={() => checkout.mutate(offer)} />)}</div>
    {!plans.isPending && !catalog?.offers.length && <div className="mt-10 rounded-2xl border border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">Pricing is temporarily unavailable.</div>}
    <div className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-[var(--muted)]">{catalog?.disclosures.join(" · ")}</div>
  </div></section>;
}

function PlanCard({ offer, environment, authenticated, busy, onCheckout }: { offer: PlanOffer; environment: string; authenticated: boolean; busy: boolean; onCheckout: () => void }) {
  const featured = offer.code.toLowerCase().includes("pro");
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency.toUpperCase() }).format(offer.amount / 100);
  const features = [
    `${offer.limits.links} artist ${offer.limits.links === 1 ? "link" : "links"}`,
    `${offer.limits.playlists} ${offer.limits.playlists === 1 ? "playlist" : "playlists"}`,
    offer.limits.featured_release && "Featured release",
    offer.limits.analytics_30_days && "30-day analytics",
    offer.limits.release_scheduling && "Release scheduling",
    offer.limits.fan_announcements > 0 && `${offer.limits.fan_announcements} fan updates per period`,
    offer.limits.monthly_boost_credit_cents > 0 && `${new Intl.NumberFormat("en-US", { style: "currency", currency: offer.currency.toUpperCase() }).format(offer.limits.monthly_boost_credit_cents / 100)} promotion credit`,
  ].filter(Boolean) as string[];
  return <article className={`relative rounded-3xl border p-6 ${featured ? "border-violet-500/50 bg-[linear-gradient(180deg,#7c3aed16,var(--panel)_38%)]" : "border-[var(--line)] bg-[var(--panel)]"}`}>{featured && <span className="absolute right-5 top-5 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">Most capable</span>}<p className="text-sm font-bold text-[var(--royal)]">{offer.name ?? offer.code.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</p><p className="mt-5"><span className="text-4xl font-semibold">{amount}</span><span className="text-sm text-[var(--muted)]">{offer.amount > 0 ? `/${offer.interval ?? "month"}` : " forever"}</span></p><ul className="mt-6 space-y-3">{features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-emerald-400" /> {feature}</li>)}</ul>{offer.amount === 0 ? <Link href={authenticated ? "/studio" : "/register"} className="primary-button mt-7 w-full">{authenticated ? "Open workspace" : "Start free"}</Link> : authenticated ? <button disabled={busy || !offer.checkout_enabled || (environment === "live" && !offer.checkout_enabled)} onClick={onCheckout} className="primary-button mt-7 w-full">{busy && <LoaderCircle size={16} className="animate-spin" />}{offer.checkout_enabled ? "Choose plan" : "Sales not open"}</button> : <Link href="/login?next=/pricing" className="primary-button mt-7 w-full">Sign in to choose</Link>}</article>;
}
