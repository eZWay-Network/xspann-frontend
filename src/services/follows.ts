import type { SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export type FollowResponse = {
  following: boolean;
  followers_count: number;
  following_count: number;
};

export function followUser(userId: number, token: string) {
  return apiRequest<SingleResponse<FollowResponse>>(`/users/${userId}/follow`, {
    method: "POST",
    token,
  });
}

export function unfollowUser(userId: number, token: string) {
  return apiRequest<SingleResponse<FollowResponse>>(`/users/${userId}/follow`, {
    method: "DELETE",
    token,
  });
}
