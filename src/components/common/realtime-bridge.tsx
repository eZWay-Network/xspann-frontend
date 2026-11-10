"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Pusher from "pusher-js";
import { useAuth } from "@/components/common/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { REALTIME_HINT_EVENT, RealtimeHintTracker, scheduleRealtimeExpiry, setRealtimeStatus } from "@/lib/realtime";
import { ApiError } from "@/services/api";
import { authorizeRealtimeChannel, createRealtimeSession } from "@/services/realtime";

export function RealtimeBridge() {
  const { token, user } = useAuth();
  const userId = user?.restricted_access ? undefined : user?.id;
  const client = useQueryClient();

  useEffect(() => {
    if (!token || userId === undefined) { setRealtimeStatus("offline"); return; }
    let pusher: Pusher | null = null;
    let stopped = false;
    let opening = false;
    let expiresAt = Infinity;
    let cancelExpiry: (() => void) | undefined;
    const tracker = new RealtimeHintTracker();
    setRealtimeStatus("connecting");
    const startupTimer = window.setTimeout(() => { if (!stopped) setRealtimeStatus("offline"); }, 5_000);

    let retry: number | undefined;
    let backoff = 1_000;
    let terminal = false;
    const domains = new Set<"inbox" | "summary" | "activity" | "announcements">();
    let flushing = false;
    async function flush() {
      if (flushing) return;
      flushing = true;
      try {
        while (domains.size && !stopped) {
          const batch = [...domains];
          domains.clear();
          const keys = { inbox: queryKeys.conversations(userId!), summary: queryKeys.summary(userId!),
            activity: queryKeys.notifications(userId!), announcements: queryKeys.announcements(userId!) };
          await Promise.all(batch.map(async name => {
            const queryKey = keys[name];
            const alreadyFetching = client.isFetching({ queryKey }) > 0;
            await client.invalidateQueries({ queryKey }, { cancelRefetch: false });
            // The existing request can describe a snapshot taken before this hint.
            if (alreadyFetching && !stopped) domains.add(name);
          }));
        }
      } finally { flushing = false; }
    }
    const refreshPromotions = () => {
      for (const key of ["boosts", "boost", "boost-balance", "boost-ledger", "artist-placements"]) {
        void client.invalidateQueries({ queryKey: [key, userId] });
      }
      void client.invalidateQueries({ queryKey: ["promoted-placements"] });
      void client.invalidateQueries({ queryKey: ["featured-artists"] });
    };
    const reconcile = () => {
      for (const domain of ["inbox", "summary", "activity", "announcements"] as const) domains.add(domain);
      void flush();
      refreshPromotions();
    };
    const invalidate = (event: string, payload: Record<string, unknown>) => {
      if (stopped || !tracker.accept(event, payload)) return;
      window.dispatchEvent(new CustomEvent(REALTIME_HINT_EVENT, { detail: { event, payload } }));
      if (event === "message.created" || event === "conversation.updated") {
        domains.add("inbox"); domains.add("summary");
      }
      if (event === "notification.created" || event === "notifications.updated") {
        domains.add("activity"); domains.add("summary"); domains.add("announcements");
      }
      void flush();
      if (event === "release.updated") {
        void client.invalidateQueries({ queryKey: ["releases", userId] });
        void client.invalidateQueries({ queryKey: ["my-videos", userId] });
      }
      if (event === "entitlements.updated") {
        void client.invalidateQueries({ queryKey: ["entitlements", userId] });
        void client.invalidateQueries({ queryKey: ["subscription", userId] });
      }
      if (event === "boost.updated" || event === "placement.updated") {
        refreshPromotions();
      }
    };

    const disconnect = () => {
      cancelExpiry?.();
      const current = pusher;
      pusher = null;
      current?.unbind_all();
      current?.disconnect();
      setRealtimeStatus("offline");
    };

    const failed = (cause?: unknown) => {
      if (stopped) return;
      disconnect();
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) terminal = true;
      if (terminal || retry !== undefined || document.hidden) return;
      const wait = Math.max(cause instanceof ApiError ? cause.retryAfterMs : 0,
        Math.min(60_000, backoff * (1 + Math.random() / 2)));
      backoff = Math.min(60_000, backoff * 2);
      retry = window.setTimeout(() => { retry = undefined; void connect(); }, wait);
    };

    const connect = async () => {
      if (opening || stopped || terminal || pusher || document.hidden) return;
      opening = true;
      try {
        const { data: session } = await createRealtimeSession(token);
        if (stopped) return;
        expiresAt = Date.parse(session.expires_at);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          terminal = true; disconnect(); return;
        }

        if (!session.channel.startsWith("private-session.")) throw Error("Invalid private channel");
        const socket = pusher = new Pusher(session.key, {
          cluster: "mt1",
          wsHost: session.host,
          wsPort: session.port,
          wssPort: session.port,
          forceTLS: session.tls,
          enabledTransports: ["ws", "wss"],
          disableStats: true,
          channelAuthorization: {
            customHandler: ({ socketId, channelName }, done) => {
              void authorizeRealtimeChannel(socketId, channelName, token).then(
                (auth) => { if (!stopped && pusher === socket) done(null, auth); },
                (error: Error) => { if (!stopped && pusher === socket) { done(error, null); failed(error); } },
              );
            },
          },
        });
        const offline = () => {
          if (!stopped && pusher === socket) setRealtimeStatus("offline");
        };
        socket.connection.bind("unavailable", offline);
        socket.connection.bind("error", offline);
        // pusher-js retries ordinary transport loss. A refused handshake ends in disconnected.
        const reopen = () => queueMicrotask(() => {
          if (!stopped && pusher === socket && !terminal) failed();
        });
        socket.connection.bind("disconnected", reopen);
        socket.connection.bind("failed", reopen);

        const channel = pusher.subscribe(session.channel);
        channel.bind("pusher:subscription_succeeded", () => {
          if (stopped || pusher !== socket) return;
          backoff = 1_000;
          window.clearTimeout(startupTimer);
          setRealtimeStatus("ready");
          window.dispatchEvent(new CustomEvent(REALTIME_HINT_EVENT, { detail: { event: "relay.subscribed", payload: {} } }));
          reconcile();
        });
        channel.bind("pusher:subscription_error", () => {
          queueMicrotask(() => { if (pusher === socket) failed(); });
        });
        for (const event of ["message.created", "conversation.updated", "notification.created", "notifications.updated", "release.updated", "entitlements.updated", "boost.updated", "placement.updated"]) {
          channel.bind(event, (payload: unknown) => invalidate(event, payload && typeof payload === "object" ? payload as Record<string, unknown> : {}));
        }

        // Relay sessions share the login token's expiry. A new token starts a new effect.
        cancelExpiry = scheduleRealtimeExpiry(expiresAt, () => { terminal = true; disconnect(); });
      } catch (cause) {
        failed(cause);
      } finally {
        opening = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      reconcile();
      if (Date.now() >= expiresAt) disconnect();
      else if (!pusher && retry === undefined) void connect();
      else if (pusher && ["disconnected", "failed", "unavailable"].includes(pusher.connection.state)) pusher.connect();
    };
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    void connect();
    return () => {
      stopped = true; window.clearTimeout(retry);
      window.removeEventListener("online", onVisible);
      window.clearTimeout(startupTimer);
      cancelExpiry?.();
      document.removeEventListener("visibilitychange", onVisible);
      disconnect();
    };
  }, [client, token, userId]);
  return null;
}
