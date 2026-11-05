"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clapperboard, Flag, LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { ReportTargetForm } from "@/components/common/report-target-form";
import { XpnLoader } from "@/components/common/xpn-loader";
import { queryKeys } from "@/lib/query-keys";
import { getAnnouncement, markAnnouncementRead } from "@/services/messaging";

export function AnnouncementPage({ id }: { id: number }) {
  const { token, user } = useAuth();
  const client = useQueryClient();
  const [reporting, setReporting] = useState(false);
  const announcement = useQuery({ queryKey: ["announcement", user?.id, id], enabled: id > 0, queryFn: () => getAnnouncement(id, token!) });
  const markRead = useMutation({
    mutationFn: () => markAnnouncementRead(id, token!),
    onSuccess: (response) => {
      client.setQueryData(["announcement", user?.id, id], response);
      void client.invalidateQueries({ queryKey: queryKeys.announcements(user!.id) });
      void client.invalidateQueries({ queryKey: queryKeys.notifications(user!.id) });
    },
  });
  if (announcement.isPending) return <div className="page-content grid h-full place-items-center"><XpnLoader label="Opening artist update…" /></div>;
  if (!announcement.data) return <div className="page-content p-8 text-center"><h1 className="text-xl font-semibold">Update unavailable</h1><p className="mt-2 text-sm text-[var(--muted)]">It may have been withdrawn or is no longer visible to this account.</p><Link href="/inbox" className="mt-5 inline-block text-sm font-bold text-[var(--royal)]">Return to inbox</Link></div>;
  const item = announcement.data.data;
  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><article className="mx-auto max-w-2xl rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-9"><Link href="/inbox" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]"><ArrowLeft size={16} /> Inbox</Link><p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[var(--royal)]">Artist update</p><h1 className="mt-2 text-3xl font-semibold">{item.title}</h1><time className="mt-3 block text-sm text-[var(--muted)]">Delivered {new Date(item.delivered_at ?? item.created_at).toLocaleString()}</time><p className="mt-7 whitespace-pre-line text-base leading-8">{item.body}</p>{item.video_id && <Link href={`/video/${item.video_id}`} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-500/10 px-4 py-3 text-sm font-bold text-[var(--royal)]"><Clapperboard size={17} /> Open attached release</Link>}<div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">{item.read_at ? <p className="inline-flex items-center gap-2 text-sm text-emerald-400"><Check size={16} /> Read {new Date(item.read_at).toLocaleString()}</p> : <button type="button" disabled={markRead.isPending} onClick={() => markRead.mutate()} className="primary-button">{markRead.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Mark update as read</button>}<button type="button" onClick={() => setReporting((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold"><Flag size={15} /> Report</button></div>{reporting && <div className="mt-4"><ReportTargetForm target={{ announcement_id: item.id }} token={token!} onClose={() => setReporting(false)} /></div>}</article></section>;
}
