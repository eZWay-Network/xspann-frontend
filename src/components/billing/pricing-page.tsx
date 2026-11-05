"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { useCheckoutAttempt } from "@/hooks/use-checkout-attempt";
import { checkoutAttemptMatches } from "@/lib/billing";
import { ApiError } from "@/services/api";
import { getMyArtist } from "@/services/artists";
import { createCheckout, clearCheckoutAttempt, getPlans, getStoredCheckoutAttempt, getSubscription, storeCheckoutAttempt, type StoredCheckoutAttempt } from "@/services/billing";
import type { PlanOffer } from "@/types/api";

export function PricingPage() {
  const { token, authenticated, user } = useAuth();
  const client = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: 5 * 60_000 });
  const artist = useQuery({
    queryKey: ["my-artist", user?.id],
    enabled: Boolean(token && user && !user.restricted_access),
    queryFn: async () => {
      try { return (await getMyArtist(token!)).data; }
      catch (caught) { if (caught instanceof ApiError && caught.status === 404) return null; throw caught; }
    },
  });
  const subscription = useQuery({ queryKey: ["subscription", user?.id], enabled: Boolean(token), queryFn: () => getSubscription(token!) });
  const [error, setError] = useState("");
  const activeAttempt = useCheckoutAttempt(user?.id);

  const checkout = useMutation({
    mutationFn: async (offer: PlanOffer) => {
      if (!token || !user || !artist.data) throw new Error("Create an artist profile before choosing a paid plan.");
      const offerVersion = offer.offer_version ?? "";
      const existing = getStoredCheckoutAttempt(user.id);
      if (existing && !checkoutAttemptMatches(existing, offer.code, offerVersion)) {
        throw new Error("Another purchase is already being reconciled. Check that purchase before choosing a different plan.");
      }
      const attempt: StoredCheckoutAttempt = existing ?? {
        userId: user.id,
        key: crypto.randomUUID(),
        planCode: offer.code,
        offerVersion,
        createdAt: new Date().toISOString(),
      };
      const pendingAttempt = { ...attempt, lastAttemptAt: new Date().toISOString() };
      storeCheckoutAttempt(pendingAttempt);
      const response = await createCheckout(offer.code, offerVersion, attempt.key, token);
      const persisted = { ...pendingAttempt, reference: response.data.reference, checkoutUrl: response.data.url };
      storeCheckoutAttempt(persisted);
      window.location.assign(response.data.url);
    },
    onError: (caught) => {
      const staleTerms = caught instanceof ApiError
        && (caught.status === 409 || caught.status === 422)
        && `${caught.message} ${Object.keys(caught.errors).join(" ")}`.toLowerCase().includes("offer");
      if (staleTerms && user) {
        clearCheckoutAttempt(user.id);
        void client.invalidateQueries({ queryKey: ["plans"] });
        setError("Plan terms changed before checkout began. The catalog has been refreshed; review the current offer and choose again.");
        return;
      }
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Checkout could not be started. Your purchase identity is saved safely for retry.");
    },
  });
  const catalog = plans.data?.data;
  const currentSubscription = subscription.data?.data;
  const hasPaidAccess = Boolean(currentSubscription && currentSubscription.effective_plan !== "free");
  const savedOffer = catalog?.offers.find((offer) => activeAttempt && checkoutAttemptMatches(activeAttempt, offer.code, offer.offer_version ?? ""));

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-[var(--royal)]"><Sparkles size={14} /> Built for independent artists</span><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Grow your artist workspace</h1><p className="mt-4 text-base leading-7 text-[var(--muted)]">Start free, then unlock the tools you need. Monthly plans, clear limits and no hidden audience promises.</p>{catalog?.environment === "test" && <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300"><ShieldCheck size={15} /> Test purchase — no live charge</p>}</div>
    {activeAttempt && <div role="status" className="mx-auto mt-7 flex max-w-3xl flex-col gap-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Purchase already in progress</p><p className="mt-1 text-sm text-[var(--muted)]">{savedOffer?.name ?? activeAttempt.planCode.replaceAll("_", " ")} · operation saved {new Date(activeAttempt.createdAt).toLocaleString()}</p>{activeAttempt.reference && <p className="mt-1 break-all text-xs text-[var(--muted)]">Reference: {activeAttempt.reference}</p>}</div><div className="flex flex-wrap gap-2">{activeAttempt.reference ? <Link href={`/billing/return?reference=${encodeURIComponent(activeAttempt.reference)}`} className="primary-button">Check purchase</Link> : savedOffer ? <button type="button" disabled={checkout.isPending} onClick={() => checkout.mutate(savedOffer)} className="primary-button">{checkout.isPending && <LoaderCircle size={15} className="animate-spin" />} Retry saved request</button> : null}{activeAttempt.checkoutUrl && <a href={activeAttempt.checkoutUrl} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">Resume checkout <ExternalLink size={14} /></a>}</div></div>}
    {hasPaidAccess && <p className="mx-auto mt-7 max-w-3xl rounded-xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">Your {currentSubscription!.effective_plan.replaceAll("_", " ")} access must end before another plan can be purchased. <Link href="/settings/billing" className="font-bold text-[var(--royal)]">Manage billing</Link></p>}
    {error && <p role="alert" className="mx-auto mt-7 max-w-3xl rounded-xl border border-pink-500/20 bg-pink-500/10 p-4 text-sm text-pink-300">{error}</p>}
    <div className="mt-10 grid gap-5 lg:grid-cols-3">{catalog?.offers.map((offer) => <PlanCard key={offer.code} offer={offer} environment={catalog.environment} liveSalesEnabled={catalog.live_sales_enabled} authenticated={authenticated} enrolled={Boolean(artist.data)} enrollmentLoading={artist.isPending} restricted={Boolean(user?.restricted_access)} hasPaidAccess={hasPaidAccess} hasOtherAttempt={Boolean(activeAttempt && !checkoutAttemptMatches(activeAttempt, offer.code, offer.offer_version ?? ""))} hasReferencedAttempt={Boolean(activeAttempt?.reference)} busy={checkout.isPending} onCheckout={() => { setError(""); checkout.mutate(offer); }} />)}</div>
    {!plans.isPending && !catalog?.offers.length && <div className="mt-10 rounded-2xl border border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">Pricing is temporarily unavailable.</div>}
    <div className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-[var(--muted)]">{catalog?.disclosures.join(" · ")}</div>
  </div></section>;
}

function PlanCard({ offer, environment, liveSalesEnabled, authenticated, enrolled, enrollmentLoading, restricted, hasPaidAccess, hasOtherAttempt, hasReferencedAttempt, busy, onCheckout }: { offer: PlanOffer; environment: "test" | "live"; liveSalesEnabled: boolean; authenticated: boolean; enrolled: boolean; enrollmentLoading: boolean; restricted: boolean; hasPaidAccess: boolean; hasOtherAttempt: boolean; hasReferencedAttempt: boolean; busy: boolean; onCheckout: () => void }) {
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
  const salesOpen = Boolean(offer.checkout_enabled && (environment === "test" || liveSalesEnabled));
  const paidDisabled = busy || restricted || enrollmentLoading || hasPaidAccess || hasOtherAttempt || hasReferencedAttempt || !salesOpen;
  let label = "Choose plan";
  if (restricted) label = "Account restricted";
  else if (enrollmentLoading) label = "Checking artist profile";
  else if (hasPaidAccess) label = "Current plan active";
  else if (hasOtherAttempt || hasReferencedAttempt) label = "Purchase already pending";
  else if (!salesOpen) label = "Sales not open";

  return <article className={`relative rounded-3xl border p-6 ${featured ? "border-violet-500/50 bg-[linear-gradient(180deg,#7c3aed16,var(--panel)_38%)]" : "border-[var(--line)] bg-[var(--panel)]"}`}>{featured && <span className="absolute right-5 top-5 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">Most capable</span>}<p className="text-sm font-bold text-[var(--royal)]">{offer.name ?? offer.code.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</p><p className="mt-5"><span className="text-4xl font-semibold">{amount}</span><span className="text-sm text-[var(--muted)]">{offer.amount > 0 ? `/${offer.interval ?? "month"}` : " forever"}</span></p><ul className="mt-6 space-y-3">{features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-emerald-400" /> {feature}</li>)}</ul>{offer.amount === 0 ? <Link href={authenticated ? "/studio" : "/register"} className="primary-button mt-7 w-full">{authenticated ? "Open workspace" : "Start free"}</Link> : !authenticated ? <Link href="/login?next=/pricing" className="primary-button mt-7 w-full">Sign in to choose</Link> : !enrolled && !enrollmentLoading && !restricted ? <Link href="/studio" className="primary-button mt-7 w-full">Create artist profile</Link> : <button disabled={paidDisabled} onClick={onCheckout} className="primary-button mt-7 w-full">{busy && <LoaderCircle size={16} className="animate-spin" />}{label}</button>}</article>;
}
