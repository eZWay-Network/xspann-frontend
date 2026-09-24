import type { PaginatedResponse, SingleResponse, Video } from "@/types/api";
import { apiRequest } from "./api";

export type SaveResponse = {
  saved: boolean;
  saves_count: number;
  created?: boolean;
};

export function getSavedVideos(token: string, limit = 20) {
  return apiRequest<PaginatedResponse<Video>>(`/me/saved-videos?limit=${limit}`, { token });
}

export function saveVideo(videoId: number, token: string) {
  return apiRequest<SingleResponse<SaveResponse>>(`/videos/${videoId}/save`, {
    method: "POST",
    token,
  });
}

export function unsaveVideo(videoId: number, token: string) {
  return apiRequest<SingleResponse<SaveResponse>>(`/videos/${videoId}/save`, {
    method: "DELETE",
    token,
  });
}
