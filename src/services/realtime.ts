import type { SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export type RealtimeSession = { key: string; host: string; port: number; tls: boolean; auth_url: string; channel: string; expires_at: string };
export const createRealtimeSession = (token: string) => apiRequest<SingleResponse<RealtimeSession>>("/realtime/session", { method: "POST", token });
export const authorizeRealtimeChannel = (socketId: string, channelName: string, token: string) => apiRequest<{ auth: string }>("/broadcasting/auth", { method: "POST", token, body: JSON.stringify({ socket_id: socketId, channel_name: channelName }) });
