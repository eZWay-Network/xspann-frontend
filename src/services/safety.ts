import type { PaginatedResponse, SingleResponse, UserSummary } from "@/types/api";
import { apiRequest } from "./api";

export type BlockResponse = {
  blocked: boolean;
};

export type ReportResponse = {
  id: number;
  status: "open" | string;
};

export type ReportUserPayload = {
  reason: string;
  details?: string;
};

export type ReportVideoPayload = {
  reason: string;
  details?: string;
};

export type ReportTarget =
  | { reported_user_id: number }
  | { video_id: number }
  | { audio_id: number }
  | { comment_id: number }
  | { playlist_id: number }
  | { message_id: number }
  | { announcement_id: number }
  | { boost_id: number };

export function reportTarget(target: ReportTarget, payload: { reason: string; details?: string }, token: string) {
  return apiRequest<SingleResponse<ReportResponse>>("/reports", {
    method: "POST",
    token,
    body: JSON.stringify({ ...target, reason: payload.reason, details: payload.details || null }),
  });
}

export function getBlockedUsers(token: string, limit = 100) {
  return apiRequest<PaginatedResponse<UserSummary>>(`/me/blocks?limit=${limit}`, { token });
}

export function blockUser(userId: number, token: string) {
  return apiRequest<SingleResponse<BlockResponse>>(`/users/${userId}/block`, {
    method: "POST",
    token,
  });
}

export function unblockUser(userId: number, token: string) {
  return apiRequest<SingleResponse<BlockResponse>>(`/users/${userId}/block`, {
    method: "DELETE",
    token,
  });
}

export function reportUser(userId: number, payload: ReportUserPayload, token: string) {
  return reportTarget({ reported_user_id: userId }, payload, token);
}

export function reportVideo(videoId: number, payload: ReportVideoPayload, token: string) {
  return reportTarget({ video_id: videoId }, payload, token);
}
