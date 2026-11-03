import type { Boost, BoostBalance, CursorResponse, PromotionOffer, PromotionPlacement, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export const getPromotionOffers = () => apiRequest<SingleResponse<PromotionOffer[]>>("/promotion-offers");
export const getPromotedPlacements = (token?: string | null) => apiRequest<{ data: PromotionPlacement[]; meta: { capacity: number } }>("/promotions/placements?surface=web_promoted_videos", { token });
export const recordPromotionEvent = (tokenValue: string, type: "render" | "click", eventId: string, token?: string | null) => apiRequest<SingleResponse<{ accepted: boolean; duplicate: boolean; billable: false }>>("/promotions/events", { method: "POST", token, body: JSON.stringify({ token: tokenValue, event_id: eventId, type }) });
export const getBoostBalance = (token: string) => apiRequest<SingleResponse<BoostBalance>>("/me/artist/boost-balance", { token });
export const getBoosts = (token: string, cursor?: string | null) => apiRequest<CursorResponse<Boost>>(`/me/artist/boosts?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { token });
export const createBoost = (payload: { video_id: number; offer_id: string; starts_at: string; rights_confirmed: true; rights_version: string }, token: string) => apiRequest<SingleResponse<Boost>>("/me/artist/boosts", { method: "POST", token, body: JSON.stringify(payload) });
export const submitBoost = (id: number, version: number, key: string, token: string) => apiRequest<SingleResponse<{ id: number; status: string; version: number; reserved_cents: number }>>(`/me/artist/boosts/${id}/submit`, { method: "POST", token, headers: { "Idempotency-Key": key }, body: JSON.stringify({ version }) });
export const cancelBoost = (id: number, version: number, token: string) => apiRequest<SingleResponse<Boost>>(`/me/artist/boosts/${id}/cancel`, { method: "POST", token, body: JSON.stringify({ version }) });
