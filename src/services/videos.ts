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

export function getFeedVideos(limit = 10, token?: string | null) {
  return apiRequest<PaginatedResponse<Video>>(`/feed?limit=${limit}`, { token });
}

export function getFollowingFeedVideos(limit = 10, token: string) {
  return apiRequest<PaginatedResponse<Video>>(`/feed/following?limit=${limit}`, { token });
}

export type CreateVideoPayload = {
  storage_path: string;
  video_url?: string;
  thumbnail_url?: string;
  caption?: string;
  sound_name?: string;
  sound_artist?: string;
  sound_provider?: "original" | "jamendo" | "local";
  sound_external_id?: string;
  sound_preview_url?: string;
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

export type UpdateVideoPayload = Partial<Omit<CreateVideoPayload, "storage_path" | "video_url" | "thumbnail_url" | "caption" | "location_name" | "scheduled_at" | "trim_start" | "trim_end" | "cover_time" | "text_overlay" | "sound_name" | "sound_artist" | "sound_external_id" | "sound_preview_url">> & {
  caption?: string | null;
  thumbnail_url?: string | null;
  location_name?: string | null;
  scheduled_at?: string | null;
  pinned?: boolean;
  trim_start?: number | null;
  trim_end?: number | null;
  cover_time?: number | null;
  text_overlay?: string | null;
  sound_name?: string | null;
  sound_artist?: string | null;
  sound_external_id?: string | null;
  sound_preview_url?: string | null;
};

export function createVideo(payload: CreateVideoPayload, token: string) {
  return apiRequest<SingleResponse<Video>>("/videos", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getMyVideos(token: string, limit = 50) {
  return apiRequest<PaginatedResponse<Video>>(`/me/videos?limit=${limit}`, { token });
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
