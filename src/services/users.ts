import type { PaginatedResponse, Profile, SingleResponse, UserSummary, Video } from "@/types/api";
import { apiRequest } from "./api";

export function getProfile(username: string, token?: string | null) {
  return apiRequest<SingleResponse<Profile>>(`/users/${username}`, { token });
}

export function getUserVideos(username: string, limit = 20, token?: string | null) {
  return apiRequest<PaginatedResponse<Video>>(`/users/${username}/videos?limit=${limit}`, { token });
}

export function getSuggestedUsers(limit = 18, token?: string | null) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/users/suggestions?limit=${limit}`, { token });
}

export function getFollowers(username: string, limit = 20) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/users/${username}/followers?limit=${limit}`);
}

export function getFollowing(username: string, limit = 20) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/users/${username}/following?limit=${limit}`);
}
