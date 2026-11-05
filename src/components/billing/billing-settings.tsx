"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, ReceiptText, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { ApiError } from "@/services/api";
import { cancelSubscription, createBillingPortal, getEntitlements, getInvoices, getSubscription, resumeSubscription } from "@/services/billing";

export function BillingSettings() {
  const { token, user } = useAuth();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const subscription = useQuery({ queryKey: ["subscription", user?.id], enabled: Boolean(token), queryFn: () => getSubscription(token!), refetchOnWindowFocus: true });
  const entitlements = useQuery({ queryKey: ["entitlements", user?.id], enabled: Boolean(token && !user?.restricted_access), queryFn: () => getEntitlements(token!), refetchOnWindowFocus: true });
  const invoices = useInfiniteQuery({
    queryKey: ["invoices", user?.id],
    enabled: Boolean(token),
    queryFn: ({ pageParam }) => getInvoices(token!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.current_page < lastPage.meta.last_page ? lastPage.meta.current_page + 1 : undefined,
  });
  const invoiceRows = invoices.data?.pages.flatMap((page) => page.data) ?? [];
  const refresh = async () => {
    await Promise.all([
      subscription.refetch(),
      invoices.refetch(),
      ...(user?.restricted_access ? [] : [entitlements.refetch()]),
    ]);
  };

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  });

  const update = useMutation({
    mutationFn: () => subscription.data?.data.cancel_at_period_end ? resumeSubscription(token!) : cancelSubscription(token!),
    onSuccess: (response) => {
      client.setQueryData(["subscription", user?.id], response);
      void client.invalidateQueries({ queryKey: ["entitlements", user?.id] });
      setError("");
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Subscription could not be updated."),
  });
  const portal = useMutation({
    mutationFn: () => createBillingPortal(token!),
    onSuccess: (response) => window.location.assign(response.data.url),
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Billing portal is unavailable."),
  });
  const current = subscription.data?.data;
  const restricted = Boolean(user?.restricted_access);
  const resumeBlocked = restricted && Boolean(current?.cancel_at_period_end);

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-4xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--royal)]">Account billing</p><h1 className="mt-1 text-3xl font-semibold">Subscription & invoices</h1></div><div className="flex items-center gap-3"><button type="button" onClick={() => void refresh()} className="icon-button" aria-label="Refresh billing"><RefreshCw size={17} /></button><Link href="/pricing" className="text-sm font-bold text-[var(--royal)]">View plans</Link></div></div>{error && <p role="alert" className="mt-5 rounded-xl bg-pink-500/10 p-4 text-sm text-pink-300">{error}</p>}{restricted && <p className="mt-5 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300">This restricted account can read billing history and cancel renewal. New purchases, portal access, and renewal resume remain unavailable.</p>}<section className="mt-7 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Current plan</p><h2 className="mt-2 text-2xl font-semibold capitalize">{current?.effective_plan?.replaceAll("_", " ") ?? "Loading…"}</h2><p className="mt-2 text-sm text-[var(--muted)]">{current?.paid_through ? `Paid through ${new Date(current.paid_through).toLocaleDateString()}` : "Free access"}{current?.cancel_at_period_end ? " · Renewal cancelled" : ""}{current?.status ? ` · ${current.status.replaceAll("_", " ")}` : ""}</p>{entitlements.data?.data.access_ends_at && <p className="mt-1 text-xs text-[var(--muted)]">Tool access through {new Date(entitlements.data.data.access_ends_at).toLocaleString()}</p>}</div><div className="flex flex-wrap gap-2"><button disabled={portal.isPending || restricted || !current || current.effective_plan === "free" || current.renewal_pending} onClick={() => { setError(""); portal.mutate(); }} className="primary-button">{portal.isPending && <LoaderCircle size={15} className="animate-spin" />} Manage payment</button>{current && current.effective_plan !== "free" && <button disabled={update.isPending || current.renewal_pending || resumeBlocked} onClick={() => { setError(""); update.mutate(); }} className="h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">{update.isPending && <LoaderCircle size={15} className="mr-2 inline animate-spin" />}{current.cancel_at_period_end ? "Resume renewal" : "Cancel renewal"}</button>}</div></div>{current?.renewal_pending && <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">A renewal update is still being reconciled. Conflicting actions are paused until the backend confirms the result.</p>}</section><section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"><h2 className="text-lg font-semibold">Invoices</h2><div className="mt-4 divide-y divide-[var(--line)]">{invoiceRows.map((invoice) => <div key={invoice.id} className="flex items-center gap-4 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface)]"><ReceiptText size={18} /></span><div className="min-w-0 flex-1"><p className="font-medium">{new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency.toUpperCase() }).format(invoice.amount_paid / 100)}</p><p className="mt-1 text-xs text-[var(--muted)]">{new Date(invoice.created_at).toLocaleDateString()} · {invoice.status}</p></div>{invoice.receipt_url && <a href={invoice.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--royal)]">Receipt <ExternalLink size={13} /></a>}</div>)}{!invoices.isPending && !invoiceRows.length && <p className="py-8 text-center text-sm text-[var(--muted)]">No paid invoices yet.</p>}</div>{invoices.hasNextPage && <button type="button" disabled={invoices.isFetchingNextPage} onClick={() => void invoices.fetchNextPage()} className="mt-4 h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">{invoices.isFetchingNextPage ? "Loading…" : "Load more invoices"}</button>}</section></div></section>;
}
