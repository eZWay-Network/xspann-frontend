"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/common/user-avatar";
import { recipientName } from "@/lib/messaging";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BellOff, Flag, LoaderCircle, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/components/common/auth-provider";
import { ReportTargetForm } from "@/components/common/report-target-form";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { useThreadHistory } from "@/hooks/use-thread-history";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/services/api";
import { markConversationRead, sendMessage, updateConversationPreferences } from "@/services/messaging";

type PendingMessage = { body: string; clientMessageId: string };

export function ConversationPage({ id }: { id: number }) {
  const { token, user } = useAuth();
  if (!Number.isSafeInteger(id) || id < 1) return <Link href="/inbox">Conversation unavailable · Return to inbox</Link>;
  if (!token || !user || user.restricted_access) return null;
  return <Thread key={JSON.stringify([user.id, token, id])} id={id} token={token} owner={user.id} />;
}

function Thread({ id, token, owner }: { id: number; token: string; owner: number }) {
  const client = useQueryClient();
  const history = useThreadHistory(id, token);
  const { rows: messages, detail, actions, setDetail } = history;
  const viewport = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastRead = useRef(0);
  const reading = useRef(false);
  const retryAt = useRef(0);
  const retryDelay = useRef(1000);
  const checkVisible = useRef<(() => void) | null>(null);
  const realtimeStatus = useRealtimeStatus();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [reportingMessageId, setReportingMessageId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const send = useMutation({
    mutationFn: (payload: PendingMessage) => sendMessage(id, payload.body, payload.clientMessageId, token!),
    onSuccess: (response) => {
      actions.current?.acknowledge(response.data);
      setBody(""); setPendingMessage(null); setError("");
      void client.invalidateQueries({ queryKey: queryKeys.conversations(owner) });
    },
    onError: (caught) => {
      if (caught instanceof ApiError && [401, 403, 404].includes(caught.status)) actions.current?.sync();
      setError(caught instanceof ApiError ? caught.message : "Message delivery is uncertain. Retry uses the same message ID and exact text.");
    },
  });

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  useEffect(() => {
    const root = viewport.current;
    if (!root || !detail || !messages.length) return;
    let stopped = false;
    const visible = new Set<HTMLElement>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      if (reading.current || stopped || document.hidden || !document.hasFocus()) return;
      clearTimeout(timer);
      const viewport = root.getBoundingClientRect();
      const top = Math.max(0, viewport.top), bottom = Math.min(window.innerHeight, viewport.bottom);
      let through = 0;
      for (const bubble of visible) {
        const rect = bubble.getBoundingClientRect();
        if (rect.height > 0 && rect.bottom > top && rect.top < bottom) {
          through = Math.max(through, Number(bubble.dataset.incoming));
        }
      }
      if (through <= Math.max(lastRead.current, detail.last_read_message_id)) return;
      if (retryAt.current > Date.now()) {
        timer = setTimeout(read, retryAt.current - Date.now());
        return;
      }
      reading.current = true;
      try {
        const { data } = await markConversationRead(id, through, token);
        lastRead.current = Math.max(lastRead.current, data.last_read_message_id);
        retryAt.current = 0;
        retryDelay.current = 1000;
        void client.invalidateQueries({ queryKey: queryKeys.summary(owner) });
        void client.invalidateQueries({ queryKey: queryKeys.conversations(owner) });
        void client.invalidateQueries({ queryKey: queryKeys.notifications(owner) });
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404, 422].includes(error.status)) return;
        retryAt.current = Date.now() + Math.max(retryDelay.current, error instanceof ApiError ? error.retryAfterMs : 0);
        retryDelay.current = Math.min(30_000, retryDelay.current * 2);
      } finally { reading.current = false; }
      checkVisible.current?.();
    };
    checkVisible.current = () => { void read(); };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const bubble = entry.target as HTMLElement;
        if (entry.isIntersecting && entry.intersectionRect.height > 0) visible.add(bubble);
        else visible.delete(bubble);
      }
      void read();
    }, { root });
    root.querySelectorAll("[data-incoming]").forEach(row => observer.observe(row));
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", read);
    return () => {
      stopped = true; clearTimeout(timer); checkVisible.current = null; observer.disconnect(); window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", read);
    };
  }, [client, detail, messages, id, owner, token]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (send.isPending) return;
    const payload = pendingMessage ?? (body.trim() ? { body: body.trim(), clientMessageId: crypto.randomUUID() } : null);
    if (!payload) return;
    if (!pendingMessage) setPendingMessage(payload);
    send.mutate(payload);
  }

  return <section className="flex h-full flex-col pb-[var(--nav-height)] md:pb-0">
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 sm:px-6"><Link href="/inbox" className="icon-button" aria-label="Back to inbox"><ArrowLeft size={20} /></Link><UserAvatar src={detail?.recipient?.avatar} name={detail?.recipient?.name || detail?.recipient?.username} size={40} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold">{detail ? recipientName(detail.recipient) : "Conversation"}</h1>
        <p className="truncate text-xs text-[var(--muted)]">{detail?.recipient?.name && <span>@{detail.recipient.username} · </span>}
          <span>{detail ? detail.can_send ? realtimeStatus === "ready" ? "Live messaging" : "Connecting…" : "Message history only" : "Loading…"}</span>
        </p>
      </div>{detail && <button onClick={() => void updateConversationPreferences(id, !detail.muted, token!).then((response) => { if (actions.current) setDetail(response.data); void client.invalidateQueries({ queryKey: queryKeys.conversations(owner) }); })} className="icon-button" title={detail.muted ? "Unmute conversation" : "Mute conversation"}><BellOff size={18} /></button>}</header>
    <div ref={viewport} onScroll={e => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; }} className="modern-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-8"><div className="mx-auto max-w-3xl space-y-3">{history.before !== null && <button type="button" onClick={() => actions.current?.older()} className="mx-auto block rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold">Load older messages</button>}{history.loading && <p className="text-center text-sm text-[var(--muted)]">Loading messages…</p>}{history.error && <button type="button" onClick={() => actions.current?.sync()} className="mx-auto flex items-center gap-2 text-sm font-semibold text-pink-400"><RefreshCw size={15} /> Retry message history</button>}{messages.map((message) => { const mine = message.sender_user_id === owner; return <div key={message.id} className={`group flex items-center gap-2 ${mine ? "justify-end" : "justify-start"}`}><div data-incoming={mine || message.unavailable ? undefined : message.id} className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${mine ? "rounded-br-md bg-violet-600 text-white" : "rounded-bl-md bg-[var(--surface)]"}`}>{message.unavailable || message.body === null ? <em className="opacity-70">Message unavailable</em> : message.body}<p className={`mt-1 text-[10px] ${mine ? "text-violet-100/70" : "text-[var(--muted)]"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>{!mine && <button type="button" onClick={() => setReportingMessageId(message.id)} className="icon-button opacity-60 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Report message"><Flag size={14} /></button>}</div>; })}{reportingMessageId && <ReportTargetForm target={{ message_id: reportingMessageId }} token={token!} onClose={() => setReportingMessageId(null)} />}<div ref={bottomRef} /></div></div>
    {error && <div role="alert" className="shrink-0 bg-pink-500/10 px-5 py-2 text-center text-xs text-pink-300">{error}{pendingMessage && <button type="button" onClick={() => { setPendingMessage(null); setError(""); }} className="ml-3 font-bold underline">Discard failed send</button>}</div>}
    <form onSubmit={submit} className="shrink-0 border-t border-[var(--line)] bg-[var(--background)] p-3 sm:p-4"><div className="mx-auto flex max-w-3xl items-end gap-2"><textarea value={pendingMessage?.body ?? body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} disabled={!detail?.can_send || Boolean(pendingMessage)} rows={1} maxLength={2000} placeholder={detail?.can_send ? "Write a message…" : "Messaging is unavailable for this conversation"} className="studio-input h-auto min-h-11 resize-none py-3" /><button disabled={!(pendingMessage?.body ?? body.trim()) || !detail?.can_send || send.isPending} className="grid h-11 min-w-11 shrink-0 place-items-center rounded-xl bg-violet-600 px-3 text-white disabled:opacity-50" aria-label={pendingMessage ? "Retry message" : "Send message"}>{send.isPending ? <LoaderCircle size={18} className="animate-spin" /> : pendingMessage ? <span className="text-xs font-bold">Retry</span> : <Send size={18} />}</button></div></form>
  </section>;
}
