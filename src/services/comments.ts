import type { Comment, PaginatedResponse, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export function getComments(videoId: number, limit = 20) {
  return apiRequest<PaginatedResponse<Comment>>(`/videos/${videoId}/comments?limit=${limit}`);
}

export function createComment(videoId: number, body: string, token: string, parentId?: number | null) {
  return apiRequest<SingleResponse<Comment>>(`/videos/${videoId}/comments`, {
    method: "POST",
    token,
    body: JSON.stringify({ body, parent_id: parentId ?? undefined }),
  });
}

export function deleteComment(commentId: number, token: string) {
  return apiRequest<SingleResponse<{ message: string }>>(`/comments/${commentId}`, {
    method: "DELETE",
    token,
  });
}
