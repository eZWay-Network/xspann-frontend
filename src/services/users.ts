import type { PaginatedResponse, Profile, SingleResponse, UserSummary, Video } from "@/types/api";
import { apiRequest } from "./api";

export function getProfile(username: string, token?: string | null) {
  return apiRequest<SingleResponse<Profile>>(`/users/${username}`, { token });
}

export function getUserVideos(username: string, limit = 20, token?: string | null, page = 1) {
  return apiRequest<PaginatedResponse<Video>>(`/users/${username}/videos?page=${page}&limit=${limit}`, { token });
}

export function getSuggestedUsers(limit = 18, token?: string | null) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/users/suggestions?limit=${limit}`, { token });
}

export function discoverPeople(query = "", page = 1, limit = 18, token?: string | null) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (query.trim()) params.set("q", query.trim().replace(/^@/, ""));
  return apiRequest<PaginatedResponse<UserSummary>>(`/discover/people?${params}`, { token });
}

export function getFollowers(username: string, limit = 20, page = 1, token?: string | null) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/users/${username}/followers?page=${page}&limit=${limit}`, { token });
}

export function getFollowing(username: string, limit = 20, page = 1, token?: string | null) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/users/${username}/following?page=${page}&limit=${limit}`, { token });
}
