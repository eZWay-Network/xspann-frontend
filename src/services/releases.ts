import type { PaginatedResponse, Release, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export const getReleases = (token: string, page = 1) => apiRequest<PaginatedResponse<Release>>(`/me/artist/releases?page=${page}&limit=30`, { token });
export const getRelease = (id: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}`, { token });
export type UpdateReleasePayload = {
  version: number;
  caption?: string | null;
  location_name?: string | null;
  visibility?: "public" | "followers" | "private";
  high_quality_upload?: boolean;
  reuse_content?: boolean;
};
export type ScheduleReleasePayload = {
  version: number;
  publish_at: string;
  timezone: string;
  rights_confirmed?: true;
  rights_version?: string;
};
export const updateRelease = (id: number, payload: UpdateReleasePayload, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}`, { method: "PATCH", token, body: JSON.stringify(payload) });
export const scheduleRelease = (id: number, payload: ScheduleReleasePayload, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}/schedule`, { method: "POST", token, body: JSON.stringify(payload) });
export const cancelReleaseSchedule = (id: number, version: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}/cancel-schedule`, { method: "POST", token, body: JSON.stringify({ version }) });
export const publishRelease = (id: number, version: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}/publish`, { method: "POST", token, body: JSON.stringify({ version }) });
export const retryRelease = (id: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/videos/${id}/retry`, { method: "POST", token });
