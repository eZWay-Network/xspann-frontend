"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bell, MessageCircle, Search } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/common/auth-provider";
import { XpnLoader } from "@/components/common/xpn-loader";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { queryKeys } from "@/lib/query-keys";
import { getAnnouncements, getConversations } from "@/services/messaging";

export function InboxPage() {
  const { token, user } = useAuth();
  const realtimeStatus = useRealtimeStatus();
  const [query, setQuery] = useState("");
  const enabled = Boolean(token && user);
  const inbox = useInfiniteQuery({
    queryKey: queryKeys.conversations(user?.id ?? 0), enabled,
    queryFn: ({ pageParam }) => getConversations(token!, pageParam), initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    refetchInterval: realtimeStatus === "ready" ? 75_000 : 20_000,
  });
  const announcements = useInfiniteQuery({
    queryKey: queryKeys.announcements(user?.id ?? 0), enabled,
    queryFn: ({ pageParam }) => getAnnouncements(token!, pageParam), initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
    refetchInterval: realtimeStatus === "ready" ? 75_000 : 20_000,
  });
  const search = query.trim().toLowerCase();
  const conversations = (inbox.data?.pages.flatMap((page) => page.data) ?? []).filter((item) => !search || item.last_message?.body?.toLowerCase().includes(search) || String(item.recipient_user_id).includes(search));
  const updates = (announcements.data?.pages.flatMap((page) => page.data) ?? []).filter((item) => !search || item.title.toLowerCase().includes(search) || item.body.toLowerCase().includes(search));

  return <section className="page-content modern-scrollbar h-full overflow-y-auto px-5 sm:px-8"><div className="mx-auto max-w-3xl">
    <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--royal)]">Messages</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Inbox</h1><p className="mt-2 text-sm text-[var(--muted)]">Conversations and artist updates remain separate, with independent read state.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${realtimeStatus === "ready" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-300"}`}>{realtimeStatus === "ready" ? "Live" : realtimeStatus === "connecting" ? "Connecting…" : "REST fallback"}</span></div>
    <label className="mt-7 flex h-11 items-center gap-3 rounded-xl bg-[var(--surface)] px-4"><Search size={17} className="text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search loaded messages and updates" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
    <InboxSection title="Conversations" icon={MessageCircle} pending={inbox.isPending} error={inbox.isError} empty="Open a mutual connection’s profile to start a message." hasItems={conversations.length > 0 || Boolean(inbox.hasNextPage)}>
      {conversations.map((conversation) => <Link key={conversation.id} href={`/inbox/${conversation.id}`} className="flex gap-4 border-b border-[var(--line)] p-4 transition last:border-0 hover:bg-[var(--surface)]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet-500/10 font-bold text-[var(--royal)]">{String(conversation.recipient_user_id).slice(-2)}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate font-semibold">Account {conversation.recipient_user_id}</p><time className="shrink-0 text-[11px] text-[var(--muted)]">{conversation.last_message ? new Date(conversation.last_message.created_at).toLocaleDateString() : ""}</time></div><div className="mt-1 flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-sm text-[var(--muted)]">{conversation.last_message?.unavailable ? "Message unavailable" : conversation.last_message?.body ?? "Start the conversation"}</p>{conversation.muted && <span className="text-[10px] text-[var(--muted)]">Muted</span>}{conversation.unread_count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unread_count}</span>}</div></div></Link>)}
      {inbox.hasNextPage && <LoadMore pending={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()} />}
    </InboxSection>
    <InboxSection title="Artist updates" icon={Bell} pending={announcements.isPending} error={announcements.isError} empty="Updates you explicitly subscribe to will appear here." hasItems={updates.length > 0 || Boolean(announcements.hasNextPage)}>
      {updates.map((announcement) => <Link key={announcement.id} href={`/announcements/${announcement.id}`} className={`block border-b border-[var(--line)] p-4 transition last:border-0 hover:bg-[var(--surface)] ${announcement.read_at ? "" : "bg-violet-500/[0.05]"}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate font-semibold">{announcement.title}</p><p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{announcement.body}</p></div>{!announcement.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--pink-signal)]" />}</div><time className="mt-2 block text-xs text-[var(--muted)]">{new Date(announcement.delivered_at ?? announcement.created_at).toLocaleString()}</time></Link>)}
      {announcements.hasNextPage && <LoadMore pending={announcements.isFetchingNextPage} onClick={() => void announcements.fetchNextPage()} />}
    </InboxSection>
  </div></section>;
}

function InboxSection({ title, icon: Icon, pending, error, empty, hasItems, children }: { title: string; icon: typeof MessageCircle; pending: boolean; error: boolean; empty: string; hasItems: boolean; children: React.ReactNode }) {
  return <section className="mt-7"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Icon size={19} /> {title}</h2><div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">{pending ? <div className="grid min-h-40 place-items-center"><XpnLoader label={`Loading ${title.toLowerCase()}…`} /></div> : error ? <p role="alert" className="p-6 text-center text-sm text-pink-400">Could not load {title.toLowerCase()}.</p> : hasItems ? children : <div className="py-12 text-center"><Icon className="mx-auto text-[var(--muted)]" size={30} /><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">{empty}</p></div>}</div></section>;
}

function LoadMore({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <button type="button" disabled={pending} onClick={onClick} className="w-full p-3 text-sm font-semibold text-[var(--royal)] disabled:opacity-50">{pending ? "Loading…" : "Load more"}</button>;
}
