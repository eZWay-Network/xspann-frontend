import type { PaginatedResponse, Release, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export const getReleases = (token: string, page = 1) => apiRequest<PaginatedResponse<Release>>(`/me/artist/releases?page=${page}&limit=30`, { token });
export const getRelease = (id: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}`, { token });
export const updateRelease = (id: number, payload: Record<string, unknown> & { version: number }, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}`, { method: "PATCH", token, body: JSON.stringify(payload) });
export const scheduleRelease = (id: number, payload: { version: number; publish_at: string; timezone: string }, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}/schedule`, { method: "POST", token, body: JSON.stringify(payload) });
export const cancelReleaseSchedule = (id: number, version: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}/cancel-schedule`, { method: "POST", token, body: JSON.stringify({ version }) });
export const publishRelease = (id: number, version: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/artist/releases/${id}/publish`, { method: "POST", token, body: JSON.stringify({ version }) });
export const retryRelease = (id: number, token: string) => apiRequest<SingleResponse<Release>>(`/me/videos/${id}/retry`, { method: "POST", token });
