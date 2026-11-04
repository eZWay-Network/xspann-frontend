import type { AudioTrack, PaginatedResponse, SingleResponse, Video } from "@/types/api";
import { apiRequest } from "./api";

export function getAudios(query = "", page = 1, token?: string | null) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (query.trim()) params.set("q", query.trim());
  return apiRequest<PaginatedResponse<AudioTrack>>(`/audios?${params}`, { token });
}
export function getSavedAudios(token: string, page = 1) {
  return apiRequest<PaginatedResponse<AudioTrack>>(`/me/saved-audios?page=${page}&limit=20`, { token });
}
export const getAudio = (id: number, token?: string | null) => apiRequest<SingleResponse<AudioTrack>>(`/audios/${id}`, { token });
export const getAudioVideos = (id: number, page = 1, token?: string | null) => apiRequest<PaginatedResponse<Video>>(`/audios/${id}/videos?page=${page}&limit=24`, { token });
export const createAudio = (payload: { storage_path: string; title: string; reuse_allowed: boolean; rights_confirmed: true; rights_version: string }, token: string) => apiRequest<SingleResponse<AudioTrack>>("/audios", { method: "POST", token, body: JSON.stringify(payload) });
export const updateAudio = (id: number, payload: { title?: string; reuse_allowed?: boolean }, token: string) => apiRequest<SingleResponse<AudioTrack>>(`/audios/${id}`, { method: "PATCH", token, body: JSON.stringify(payload) });
export const deleteAudio = (id: number, token: string) => apiRequest<SingleResponse<{ message: string }>>(`/audios/${id}`, { method: "DELETE", token });
export const saveAudio = (id: number, token: string) => apiRequest<SingleResponse<{ saved: true; created: boolean }>>(`/audios/${id}/save`, { method: "POST", token });
export const unsaveAudio = (id: number, token: string) => apiRequest<SingleResponse<{ saved: false }>>(`/audios/${id}/save`, { method: "DELETE", token });

const audioProcessingPollDelays = Array.from(
  { length: 24 },
  (_, attempt) => Math.min(5_000, 1_000 * 1.5 ** attempt),
);

export async function waitForAudioReady(id: number, token: string) {
  for (let attempt = 0; attempt <= audioProcessingPollDelays.length; attempt += 1) {
    const response = await getAudio(id, token);

    if (response.data.status === "ready") return response;
    if (response.data.status === "failed") {
      throw new Error("Custom audio processing failed. Choose another audio file and try again.");
    }
    if (response.data.status === "withdrawn") {
      throw new Error("This custom audio is no longer available. Choose another audio file and try again.");
    }
    if (attempt === audioProcessingPollDelays.length) break;

    await new Promise((resolve) => setTimeout(resolve, audioProcessingPollDelays[attempt]));
  }

  throw new Error("Custom audio is still processing. Please try publishing again in a moment.");
}
