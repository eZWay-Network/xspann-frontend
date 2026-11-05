"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Pusher from "pusher-js";
import { useAuth } from "@/components/common/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { REALTIME_HINT_EVENT, RealtimeHintTracker, scheduleRealtimeExpiry, setRealtimeStatus } from "@/lib/realtime";
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
    const startupTimer = window.setTimeout(() => setRealtimeStatus("offline"), 5_000);

    const invalidate = (event: string, payload: Record<string, unknown>) => {
      if (!tracker.accept(event, payload)) return;
      window.dispatchEvent(new CustomEvent(REALTIME_HINT_EVENT, { detail: { event, payload } }));
      const conversationId = Number(payload.conversation_id ?? 0);
      if (event === "message.created" || event === "conversation.updated") {
        void client.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
        void client.invalidateQueries({ queryKey: ["conversation-unread", userId] });
        if (conversationId > 0) void client.invalidateQueries({ queryKey: queryKeys.messages(userId, conversationId) });
      }
      if (event === "notification.created" || event === "notifications.updated") {
        void client.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
        void client.invalidateQueries({ queryKey: queryKeys.announcements(userId) });
      }
      if (event === "release.updated") {
        void client.invalidateQueries({ queryKey: ["releases", userId] });
        void client.invalidateQueries({ queryKey: ["my-videos", userId] });
      }
      if (event === "entitlements.updated") {
        void client.invalidateQueries({ queryKey: ["entitlements", userId] });
        void client.invalidateQueries({ queryKey: ["subscription", userId] });
      }
      if (event === "boost.updated" || event === "placement.updated") {
        void client.invalidateQueries({ queryKey: ["boosts", userId] });
        void client.invalidateQueries({ queryKey: ["boost-balance", userId] });
        void client.invalidateQueries({ queryKey: ["boost-ledger", userId] });
        void client.invalidateQueries({ queryKey: ["artist-placements", userId] });
        void client.invalidateQueries({ queryKey: ["promoted-placements"] });
        void client.invalidateQueries({ queryKey: ["featured-artists"] });
      }
    };

    const disconnect = () => {
      pusher?.disconnect();
      setRealtimeStatus("offline");
    };

    const connect = async () => {
      if (opening || stopped) return;
      opening = true;
      try {
        const { data: session } = await createRealtimeSession(token);
        if (stopped) return;
        expiresAt = Date.parse(session.expires_at);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          setRealtimeStatus("offline");
          return;
        }

        pusher = new Pusher(session.key, {
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
                (auth) => done(null, auth),
                (error: Error) => done(error, null),
              );
            },
          },
        });
        pusher.connection.bind("unavailable", () => setRealtimeStatus("offline"));
        pusher.connection.bind("disconnected", () => setRealtimeStatus("offline"));
        pusher.connection.bind("error", () => setRealtimeStatus("offline"));

        const channel = pusher.subscribe(session.channel);
        channel.bind("pusher:subscription_succeeded", () => {
          window.clearTimeout(startupTimer);
          setRealtimeStatus("ready");
          window.dispatchEvent(new CustomEvent(REALTIME_HINT_EVENT, { detail: { event: "relay.subscribed", payload: {} } }));
          void Promise.all([
            client.invalidateQueries({ queryKey: queryKeys.conversations(userId) }),
            client.invalidateQueries({ queryKey: ["messages", userId] }),
            client.invalidateQueries({ queryKey: ["conversation-unread", userId] }),
            client.invalidateQueries({ queryKey: queryKeys.notifications(userId) }),
            client.invalidateQueries({ queryKey: queryKeys.announcements(userId) }),
          ]);
        });
        channel.bind("pusher:subscription_error", () => setRealtimeStatus("offline"));
        for (const event of ["message.created", "conversation.updated", "notification.created", "notifications.updated", "release.updated", "entitlements.updated", "boost.updated", "placement.updated"]) {
          channel.bind(event, (payload: unknown) => invalidate(event, payload && typeof payload === "object" ? payload as Record<string, unknown> : {}));
        }

        // Relay sessions share the login token's expiry. A new token starts a new effect.
        cancelExpiry = scheduleRealtimeExpiry(expiresAt, disconnect);
      } catch {
        if (!stopped) setRealtimeStatus("offline");
      } finally {
        opening = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void client.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      void client.invalidateQueries({ queryKey: ["messages", userId] });
      void client.invalidateQueries({ queryKey: ["conversation-unread", userId] });
      void client.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      void client.invalidateQueries({ queryKey: queryKeys.announcements(userId) });
      if (Date.now() >= expiresAt) disconnect();
      else if (!pusher) void connect();
      else if (["disconnected", "failed", "unavailable"].includes(pusher.connection.state)) pusher.connect();
    };
    document.addEventListener("visibilitychange", onVisible);
    void connect();
    return () => {
      stopped = true;
      window.clearTimeout(startupTimer);
      cancelExpiry?.();
      document.removeEventListener("visibilitychange", onVisible);
      disconnect();
    };
  }, [client, token, userId]);
  return null;
}
