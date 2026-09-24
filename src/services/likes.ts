import type { PaginatedResponse, SingleResponse, Video } from "@/types/api";
import { apiRequest } from "./api";

export type LikeResponse = {
  liked: boolean;
  likes_count: number;
  created?: boolean;
};

export function getLikedVideos(token: string, limit = 20) {
  return apiRequest<PaginatedResponse<Video>>(`/me/liked-videos?limit=${limit}`, { token });
}

export function likeVideo(videoId: number, token: string) {
  return apiRequest<SingleResponse<LikeResponse>>(`/videos/${videoId}/like`, {
    method: "POST",
    token,
  });
}

export function unlikeVideo(videoId: number, token: string) {
  return apiRequest<SingleResponse<LikeResponse>>(`/videos/${videoId}/like`, {
    method: "DELETE",
    token,
  });
}
