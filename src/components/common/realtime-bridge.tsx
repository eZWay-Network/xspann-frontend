"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Pusher from "pusher-js";
import { useAuth } from "@/components/common/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { REALTIME_HINT_EVENT, RealtimeHintTracker, setRealtimeStatus } from "@/lib/realtime";
import { API_URL } from "@/services/api";
import { createRealtimeSession } from "@/services/realtime";

export function RealtimeBridge() {
  const { token, user } = useAuth();
  const client = useQueryClient();

  useEffect(() => {
    if (!token || !user) { setRealtimeStatus("offline"); return; }
    let pusher: Pusher | null = null;
    let stopped = false;
    let startupTimer = 0;
    let renewalTimer = 0;
    const tracker = new RealtimeHintTracker();
    setRealtimeStatus("connecting");
    startupTimer = window.setTimeout(() => setRealtimeStatus("offline"), 5_000);

    const invalidate = (event: string, payload: Record<string, unknown>) => {
      if (!tracker.accept(event, payload)) return;
      window.dispatchEvent(new CustomEvent(REALTIME_HINT_EVENT, { detail: { event, payload } }));
      const conversationId = Number(payload.conversation_id ?? 0);
      if (event === "message.created" || event === "conversation.updated") {
        void client.invalidateQueries({ queryKey: queryKeys.conversations(user.id) });
        void client.invalidateQueries({ queryKey: ["conversation-unread", user.id] });
        if (conversationId > 0) void client.invalidateQueries({ queryKey: queryKeys.messages(user.id, conversationId) });
      }
      if (event === "notification.created" || event === "notifications.updated") {
        void client.invalidateQueries({ queryKey: queryKeys.notifications(user.id) });
        void client.invalidateQueries({ queryKey: queryKeys.announcements(user.id) });
      }
      if (event === "release.updated") {
        void client.invalidateQueries({ queryKey: ["releases", user.id] });
        void client.invalidateQueries({ queryKey: ["my-videos", user.id] });
      }
      if (event === "entitlements.updated") {
        void client.invalidateQueries({ queryKey: ["entitlements", user.id] });
        void client.invalidateQueries({ queryKey: ["subscription", user.id] });
      }
      if (event === "boost.updated" || event === "placement.updated") {
        void client.invalidateQueries({ queryKey: ["boosts", user.id] });
        void client.invalidateQueries({ queryKey: ["boost-balance", user.id] });
      }
    };

    const connect = async () => {
      try {
        const { data: session } = await createRealtimeSession(token);
        if (stopped) return;
        const apiOrigin = new URL(API_URL).origin;
        const authorizationUrl = new URL(session.auth_url, apiOrigin);
        if (authorizationUrl.origin !== apiOrigin) throw new Error("Relay authorization must use the trusted API origin.");

        pusher?.disconnect();
        pusher = new Pusher(session.key, {
          cluster: "mt1",
          wsHost: session.host,
          wsPort: session.port,
          wssPort: session.port,
          forceTLS: session.tls,
          enabledTransports: ["ws", "wss"],
          disableStats: true,
          channelAuthorization: {
            endpoint: authorizationUrl.toString(),
            transport: "ajax",
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
            client.invalidateQueries({ queryKey: queryKeys.conversations(user.id) }),
            client.invalidateQueries({ queryKey: ["messages", user.id] }),
            client.invalidateQueries({ queryKey: ["conversation-unread", user.id] }),
            client.invalidateQueries({ queryKey: queryKeys.notifications(user.id) }),
            client.invalidateQueries({ queryKey: queryKeys.announcements(user.id) }),
          ]);
        });
        channel.bind("pusher:subscription_error", () => setRealtimeStatus("offline"));
        for (const event of ["message.created", "conversation.updated", "notification.created", "notifications.updated", "release.updated", "entitlements.updated", "boost.updated", "placement.updated"]) {
          channel.bind(event, (payload: unknown) => invalidate(event, payload && typeof payload === "object" ? payload as Record<string, unknown> : {}));
        }

        const renewIn = new Date(session.expires_at).getTime() - Date.now() - 5_000;
        renewalTimer = window.setTimeout(() => {
          if (stopped) return;
          setRealtimeStatus("offline");
          pusher?.disconnect();
          void connect();
        }, Math.max(1_000, renewIn));
      } catch {
        setRealtimeStatus("offline");
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void client.invalidateQueries({ queryKey: queryKeys.conversations(user.id) });
      void client.invalidateQueries({ queryKey: ["messages", user.id] });
      void client.invalidateQueries({ queryKey: ["conversation-unread", user.id] });
      void client.invalidateQueries({ queryKey: queryKeys.notifications(user.id) });
      void client.invalidateQueries({ queryKey: queryKeys.announcements(user.id) });
      if (!pusher) void connect();
      else if (["disconnected", "failed", "unavailable"].includes(pusher.connection.state)) pusher.connect();
    };
    document.addEventListener("visibilitychange", onVisible);
    void connect();
    return () => {
      stopped = true;
      window.clearTimeout(startupTimer);
      window.clearTimeout(renewalTimer);
      document.removeEventListener("visibilitychange", onVisible);
      pusher?.disconnect();
      setRealtimeStatus("offline");
    };
  }, [client, token, user]);
  return null;
}
