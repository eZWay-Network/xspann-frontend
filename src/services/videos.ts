import type { PaginatedResponse, SingleResponse, Video } from "@/types/api";
import { videos } from "@/lib/mock-data";
import { apiRequest } from "./api";

export async function getMockVideos(): Promise<PaginatedResponse<Video>> {
  return { data: videos, meta: { current_page: 1, last_page: 1, per_page: videos.length, total: videos.length } };
}

export function getVideos(limit = 10, token?: string | null) {
  return apiRequest<PaginatedResponse<Video>>(`/videos?limit=${limit}`, { token });
}

export function getVideo(id: number, token?: string | null) {
  return apiRequest<SingleResponse<Video>>(`/videos/${id}`, { token });
}

export function getFeedVideos(limit = 10, token?: string | null, page = 1, signal?: AbortSignal) {
  return apiRequest<PaginatedResponse<Video>>(`/feed?page=${page}&limit=${limit}`, { token, signal });
}

export function getFollowingFeedVideos(limit = 10, token: string, page = 1, signal?: AbortSignal) {
  return apiRequest<PaginatedResponse<Video>>(`/feed/following?page=${page}&limit=${limit}`, { token, signal });
}

export function getDiscoverVideos(query: string, page = 1, limit = 20, token?: string | null, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort: "popular" });
  if (query) params.set("q", query);
  return apiRequest<PaginatedResponse<Video>>(`/discover?${params}`, { token, signal });
}

export type CreateVideoPayload = {
  storage_path: string;
  thumbnail_url?: string;
  caption?: string;
  audio_id?: number;
  audio_mode?: "replace" | "mix";
  audio_settings?: Record<string, unknown>;
  reuse_content: boolean;
  rights_confirmed: true;
  rights_version: string;
  publication_intent?: "immediate" | "draft";
  location_name?: string;
  visibility?: "public" | "followers" | "private";
  high_quality_upload?: boolean;
  scheduled_at?: string;
  trim_start?: number;
  trim_end?: number;
  cut_points?: number[];
  cover_time?: number;
  crop_mode?: "fit" | "fill";
  text_overlay?: string;
  original_audio_muted?: boolean;
  filter_settings?: Record<string, unknown>;
};

export type UpdateVideoPayload = {
  caption?: string | null;
  thumbnail_url?: string | null;
  location_name?: string | null;
  pinned?: boolean;
  visibility?: "public" | "followers" | "private";
  high_quality_upload?: boolean;
  reuse_content?: boolean;
};

export function createVideo(payload: CreateVideoPayload, token: string) {
  return apiRequest<SingleResponse<Video>>("/videos", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getMyVideos(token: string, limit = 50, page = 1, signal?: AbortSignal) {
  return apiRequest<PaginatedResponse<Video>>(`/me/videos?page=${page}&limit=${limit}`, { token, signal });
}

export function updateVideo(id: number, payload: UpdateVideoPayload, token: string) {
  return apiRequest<SingleResponse<Video>>(`/videos/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteVideo(id: number, token: string) {
  return apiRequest<SingleResponse<{ message: string }>>(`/videos/${id}`, {
    method: "DELETE",
    token,
  });
}

export function recordVideoView(id: number, token?: string | null) {
  return apiRequest<SingleResponse<{ viewed: boolean; views_count: number }>>(`/videos/${id}/view`, {
    method: "POST",
    token,
  });
}
