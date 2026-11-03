"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/common/auth-provider";
import { authorizeRealtimeChannel, createRealtimeSession } from "@/services/realtime";

type PusherFrame = { event?: string; data?: string | Record<string, unknown>; channel?: string };

export function RealtimeBridge() {
  const { token, user } = useAuth(); const client = useQueryClient();
  useEffect(() => {
    if (!token || !user) return;
    let socket: WebSocket | null = null; let stopped = false; let reconnects = 0; let reconnectTimer = 0; const seen = new Set<string>();
    const invalidate = (event: string, payload: Record<string, unknown>) => {
      const eventId = typeof payload.event_id === "string" ? payload.event_id : null;
      if (eventId && seen.has(eventId)) return; if (eventId) { seen.add(eventId); if (seen.size > 500) seen.delete(seen.values().next().value!); }
      if (event === "message.created" || event === "conversation.updated") { void client.invalidateQueries({ queryKey: ["conversations", user.id] }); void client.invalidateQueries({ queryKey: ["messages", user.id] }); }
      if (event === "notification.created" || event === "notifications.updated") void client.invalidateQueries({ queryKey: ["notifications", user.id] });
      if (event === "release.updated") void client.invalidateQueries({ queryKey: ["releases", user.id] });
      if (event === "entitlements.updated") { void client.invalidateQueries({ queryKey: ["entitlements", user.id] }); void client.invalidateQueries({ queryKey: ["subscription", user.id] }); }
      if (event === "boost.updated" || event === "placement.updated") { void client.invalidateQueries({ queryKey: ["boosts", user.id] }); void client.invalidateQueries({ queryKey: ["boost-balance", user.id] }); }
    };
    const connect = async () => {
      try {
        const { data: session } = await createRealtimeSession(token); if (stopped) return;
        const protocol = session.tls ? "wss" : "ws"; socket = new WebSocket(`${protocol}://${session.host}:${session.port}/app/${encodeURIComponent(session.key)}?protocol=7&client=js&version=8.4&flash=false`);
        socket.onmessage = async (message) => {
          let frame: PusherFrame; try { frame = JSON.parse(String(message.data)) as PusherFrame; } catch { return; }
          let payload: Record<string, unknown> = {}; try { payload = typeof frame.data === "string" ? JSON.parse(frame.data) : frame.data ?? {}; } catch { payload = {}; }
          if (frame.event === "pusher:connection_established") { const socketId = typeof payload.socket_id === "string" ? payload.socket_id : ""; if (!socketId || stopped) return; try { const auth = await authorizeRealtimeChannel(socketId, session.channel, token); socket?.send(JSON.stringify({ event: "pusher:subscribe", data: { channel: session.channel, auth: auth.auth } })); reconnects = 0; } catch { socket?.close(); } return; }
          if (frame.event && !frame.event.startsWith("pusher:")) invalidate(frame.event, payload);
        };
        socket.onclose = () => { if (!stopped && reconnects < 5) reconnectTimer = window.setTimeout(() => { reconnects += 1; void connect(); }, Math.min(30_000, 1000 * 2 ** reconnects)); };
      } catch { if (!stopped && reconnects < 5) reconnectTimer = window.setTimeout(() => { reconnects += 1; void connect(); }, Math.min(30_000, 1000 * 2 ** reconnects)); }
    };
    const onVisible = () => { if (document.visibilityState === "visible") { void client.invalidateQueries({ queryKey: ["conversations", user.id] }); void client.invalidateQueries({ queryKey: ["notifications", user.id] }); if (!socket || socket.readyState > WebSocket.OPEN) void connect(); } };
    document.addEventListener("visibilitychange", onVisible); void connect();
    return () => { stopped = true; window.clearTimeout(reconnectTimer); document.removeEventListener("visibilitychange", onVisible); socket?.close(); };
  }, [client, token, user]);
  return null;
}
