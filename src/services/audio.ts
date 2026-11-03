import type { AudioTrack, PaginatedResponse, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export function getAudios(query = "", page = 1, token?: string | null) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (query.trim()) params.set("q", query.trim());
  return apiRequest<PaginatedResponse<AudioTrack>>(`/audios?${params}`, { token });
}
export const getAudio = (id: number, token?: string | null) => apiRequest<SingleResponse<AudioTrack>>(`/audios/${id}`, { token });
export const createAudio = (payload: { storage_path: string; title: string; reuse_allowed: boolean; rights_confirmed: true; rights_version: string }, token: string) => apiRequest<SingleResponse<AudioTrack>>("/audios", { method: "POST", token, body: JSON.stringify(payload) });
export const saveAudio = (id: number, token: string) => apiRequest<SingleResponse<AudioTrack>>(`/audios/${id}/save`, { method: "POST", token });
export const unsaveAudio = (id: number, token: string) => apiRequest<SingleResponse<AudioTrack>>(`/audios/${id}/save`, { method: "DELETE", token });
