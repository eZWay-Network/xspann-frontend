"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BellOff, Flag, LoaderCircle, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { ReportTargetForm } from "@/components/common/report-target-form";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { displayedIncomingMessageId, mergeMessages, newestMessageId } from "@/lib/messaging";
import { queryKeys } from "@/lib/query-keys";
import { REALTIME_HINT_EVENT, type RealtimeHint } from "@/lib/realtime";
import { ApiError } from "@/services/api";
import { getConversation, getMessages, markConversationRead, sendMessage, updateConversationPreferences } from "@/services/messaging";
import type { ConversationMessage } from "@/types/api";

type PendingMessage = { body: string; clientMessageId: string };

export function ConversationPage({ id }: { id: number }) {
  const { token, user } = useAuth();
  const client = useQueryClient();
  const realtimeStatus = useRealtimeStatus();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [reportingMessageId, setReportingMessageId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const enabled = Boolean(token && user && Number.isSafeInteger(id) && id > 0 && realtimeStatus !== "connecting");
  const conversation = useQuery({
    queryKey: ["conversation", user?.id, id], enabled,
    queryFn: () => getConversation(id, token!),
    refetchInterval: realtimeStatus === "ready" ? false : 30_000,
  });
  const history = useInfiniteQuery({
    queryKey: queryKeys.messages(user?.id ?? 0, id), enabled,
    queryFn: ({ pageParam }) => getMessages(id, token!, pageParam ? { beforeId: pageParam } : {}),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.meta.has_more ? lastPage.meta.next_before_id ?? undefined : undefined,
    refetchInterval: realtimeStatus === "ready" ? false : 15_000,
  });
  const messages = useMemo(() => mergeMessages(history.data?.pages.flatMap((page) => page.data), localMessages), [history.data, localMessages]);
  const detail = conversation.data?.data;

  const catchUp = useCallback(async () => {
    if (!token || !user) return;
    let afterId = newestMessageId(messages);
    const received: ConversationMessage[] = [];
    for (let page = 0; page < 20; page += 1) {
      const response = await getMessages(id, token, { afterId });
      received.push(...response.data);
      if (!response.meta.has_more || !response.meta.next_after_id) break;
      afterId = response.meta.next_after_id;
    }
    if (received.length) setLocalMessages((current) => mergeMessages(current, received));
    await Promise.all([
      conversation.refetch(),
      client.invalidateQueries({ queryKey: queryKeys.conversations(user.id) }),
    ]);
  }, [client, conversation, id, messages, token, user]);

  const send = useMutation({
    mutationFn: (payload: PendingMessage) => sendMessage(id, payload.body, payload.clientMessageId, token!),
    onSuccess: (response) => {
      setLocalMessages((current) => mergeMessages(current, [response.data]));
      setBody(""); setPendingMessage(null); setError("");
      void client.invalidateQueries({ queryKey: queryKeys.conversations(user!.id) });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Message delivery is uncertain. Retry uses the same message ID and exact text."),
  });

  useEffect(() => {
    const onHint = (event: Event) => {
      const hint = (event as CustomEvent<RealtimeHint>).detail;
      if (!hint || !["message.created", "conversation.updated", "relay.subscribed"].includes(hint.event)) return;
      const conversationId = Number(hint.payload.conversation_id ?? 0);
      if (!conversationId || conversationId === id) void catchUp().catch(() => undefined);
    };
    window.addEventListener(REALTIME_HINT_EVENT, onHint);
    return () => window.removeEventListener(REALTIME_HINT_EVENT, onHint);
  }, [catchUp, id]);

  useEffect(() => {
    if (!messages.length || !token || !detail) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
    const incomingId = displayedIncomingMessageId(messages, user?.id);
    if (incomingId <= detail.last_read_message_id) return;
    void markConversationRead(id, incomingId, token).then((response) => {
      client.setQueryData(["conversation", user?.id, id], response);
      void client.invalidateQueries({ queryKey: queryKeys.conversations(user!.id) });
      void client.invalidateQueries({ queryKey: ["conversation-unread", user!.id] });
      void client.invalidateQueries({ queryKey: queryKeys.notifications(user!.id) });
    }).catch(() => undefined);
  }, [client, detail, id, messages, token, user]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (send.isPending) return;
    const payload = pendingMessage ?? (body.trim() ? { body: body.trim(), clientMessageId: crypto.randomUUID() } : null);
    if (!payload) return;
    if (!pendingMessage) setPendingMessage(payload);
    send.mutate(payload);
  }

  if (!Number.isSafeInteger(id) || id < 1) return <div className="page-content p-8 text-center"><h1 className="text-xl font-semibold">Conversation unavailable</h1><Link href="/inbox" className="mt-4 inline-block text-sm font-bold text-[var(--royal)]">Return to inbox</Link></div>;

  return <section className="flex h-full flex-col pb-[var(--nav-height)] md:pb-0">
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 sm:px-6"><Link href="/inbox" className="icon-button" aria-label="Back to inbox"><ArrowLeft size={20} /></Link><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/10 text-sm font-bold text-[var(--royal)]">{String(detail?.recipient_user_id ?? "?").slice(-2)}</span><div className="min-w-0 flex-1"><h1 className="truncate font-semibold">{detail ? `Account ${detail.recipient_user_id}` : "Conversation"}</h1><p className="text-xs text-[var(--muted)]">{detail?.can_send ? realtimeStatus === "ready" ? "Live messaging" : "REST messaging" : "Message history only"}</p></div>{detail && <button onClick={() => void updateConversationPreferences(id, !detail.muted, token!).then((response) => { client.setQueryData(["conversation", user?.id, id], response); void client.invalidateQueries({ queryKey: queryKeys.conversations(user!.id) }); })} className="icon-button" title={detail.muted ? "Unmute conversation" : "Mute conversation"}><BellOff size={18} /></button>}</header>
    <div className="modern-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-8"><div className="mx-auto max-w-3xl space-y-3">{history.hasNextPage && <button type="button" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()} className="mx-auto block rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold">{history.isFetchingNextPage ? "Loading…" : "Load older messages"}</button>}{history.isPending && <p className="text-center text-sm text-[var(--muted)]">Loading messages…</p>}{history.isError && <button type="button" onClick={() => void history.refetch()} className="mx-auto flex items-center gap-2 text-sm font-semibold text-pink-400"><RefreshCw size={15} /> Retry message history</button>}{messages.map((message) => { const mine = message.sender_user_id === user?.id; return <div key={message.id} className={`group flex items-center gap-2 ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${mine ? "rounded-br-md bg-violet-600 text-white" : "rounded-bl-md bg-[var(--surface)]"}`}>{message.unavailable || message.body === null ? <em className="opacity-70">Message unavailable</em> : message.body}<p className={`mt-1 text-[10px] ${mine ? "text-violet-100/70" : "text-[var(--muted)]"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>{!mine && <button type="button" onClick={() => setReportingMessageId(message.id)} className="icon-button opacity-60 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Report message"><Flag size={14} /></button>}</div>; })}{reportingMessageId && <ReportTargetForm target={{ message_id: reportingMessageId }} token={token!} onClose={() => setReportingMessageId(null)} />}<div ref={bottomRef} /></div></div>
    {error && <div role="alert" className="shrink-0 bg-pink-500/10 px-5 py-2 text-center text-xs text-pink-300">{error}{pendingMessage && <button type="button" onClick={() => { setPendingMessage(null); setError(""); }} className="ml-3 font-bold underline">Discard failed send</button>}</div>}
    <form onSubmit={submit} className="shrink-0 border-t border-[var(--line)] bg-[var(--background)] p-3 sm:p-4"><div className="mx-auto flex max-w-3xl items-end gap-2"><textarea value={pendingMessage?.body ?? body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} disabled={!detail?.can_send || Boolean(pendingMessage)} rows={1} maxLength={2000} placeholder={detail?.can_send ? "Write a message…" : "Messaging is unavailable for this conversation"} className="studio-input h-auto min-h-11 resize-none py-3" /><button disabled={!(pendingMessage?.body ?? body.trim()) || !detail?.can_send || send.isPending} className="grid h-11 min-w-11 shrink-0 place-items-center rounded-xl bg-violet-600 px-3 text-white disabled:opacity-50" aria-label={pendingMessage ? "Retry message" : "Send message"}>{send.isPending ? <LoaderCircle size={18} className="animate-spin" /> : pendingMessage ? <span className="text-xs font-bold">Retry</span> : <Send size={18} />}</button></div></form>
  </section>;
}
