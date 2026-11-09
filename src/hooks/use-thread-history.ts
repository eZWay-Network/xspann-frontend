"use client";

import { useEffect, useRef, useState } from "react";
import { ThreadHistory } from "@/lib/messaging";
import { getRealtimeStatus, subscribeRealtimeStatus, REALTIME_HINT_EVENT, threadForHint, type RealtimeHint } from "@/lib/realtime";
import { ApiError } from "@/services/api";
import { getConversation, getMessages } from "@/services/messaging";
import type { Conversation, ConversationMessage } from "@/types/api";

export function useThreadHistory(id: number, token: string) {
  const [detail, setDetail] = useState<Conversation>();
  const [rows, setRows] = useState<ConversationMessage[]>([]);
  const [before, setBefore] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const actions = useRef<{
    sync: (structural?: boolean) => void;
    older: () => void;
    acknowledge: (message: ConversationMessage) => void;
  } | null>(null);

  useEffect(() => {
    let history = new ThreadHistory();
    const abort = new AbortController();
    const load = (direction: { beforeId?: number; afterId?: number }) => getMessages(id, token, direction, abort.signal);
    let busy = false, dirty = false, structural = false, older = false, denied = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let backoff = 1000;
    function render() { setRows(history.rows); setBefore(history.before); }

    async function drain() {
      if (busy || denied || abort.signal.aborted || retry) return;
      busy = true;
      try {
        while (dirty || older) {
          const refresh = dirty, full = structural, loadOlder = older;
          dirty = false; structural = false; older = false;
          if (refresh) {
            if (full) {
              const response = await getConversation(id, token, abort.signal);
              if (abort.signal.aborted) return;
              setDetail(response.data);
            }
            await history.sync(load, full);
          }
          if (loadOlder) await history.older(load);
          if (abort.signal.aborted) return;
          render(); setError(false); setLoading(false);
          backoff = 1000;
        }
      } catch (cause) {
        if (abort.signal.aborted) return;
        setError(true); setLoading(false);
        if (cause instanceof ApiError && [401,403,404].includes(cause.status)) {
          denied = true; history = new ThreadHistory();
          setDetail(undefined); setRows([]); setBefore(null);
        } else {
          dirty = true; structural = true;
          retry = setTimeout(() => { retry = undefined; void drain(); }, backoff);
          backoff = Math.min(backoff * 2, 30_000);
        }
      } finally { busy = false; }
    }
    function sync(full = true) {
      if (full) denied = false;
      if (document.hidden) { dirty = true; structural ||= full; return; }
      dirty = true; structural ||= full; void drain();
    }
    actions.current = {
      sync,
      acknowledge(row) { if (!denied) { history.acknowledge(row); render(); sync(false); } },
      older() { older = true; void drain(); },
    };
    const onHint = (event: Event) => {
      const hint = (event as CustomEvent<RealtimeHint>).detail;
      if (hint.event === "relay.subscribed") sync();
      if (!["conversation.updated", "message.created"].includes(hint.event)) return;
      const target = threadForHint(hint.event, hint.payload);
      if (target === null || target === id) sync(hint.event === "conversation.updated");
    };
    const visible = () => { if (!document.hidden) sync(); };
    let timer: ReturnType<typeof setTimeout>;
    function safety() {
      const interval = getRealtimeStatus() === "ready" ? 60_000 : 15_000;
      timer = setTimeout(() => { visible(); safety(); }, interval + Math.random() * interval / 2);
    }
    window.addEventListener(REALTIME_HINT_EVENT, onHint);
    document.addEventListener("visibilitychange", visible);
    sync(); safety();
    const unsubscribe = subscribeRealtimeStatus(() => { clearTimeout(timer); safety(); });
    return () => {
      unsubscribe(); abort.abort(); actions.current = null; clearTimeout(retry); clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener(REALTIME_HINT_EVENT, onHint);
    };
  }, [id, token]);
  return { rows, before, error, loading, detail, setDetail, actions };
}
