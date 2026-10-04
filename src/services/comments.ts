import type { Comment, CommentReactionType, PaginatedResponse, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export function getComments(videoId: number, limit = 20, token?: string | null) {
  return apiRequest<PaginatedResponse<Comment>>(`/videos/${videoId}/comments?limit=${limit}`, { token });
}

export function getCommentReplies(parentId: number, limit = 20, token?: string | null) {
  return apiRequest<PaginatedResponse<Comment>>(`/comments/${parentId}/replies?limit=${limit}`, { token });
}

export function setCommentReaction(commentId: number, reactionType: CommentReactionType, token: string) {
  return apiRequest<SingleResponse<Comment>>(`/comments/${commentId}/reaction`, {
    method: "POST",
    token,
    body: JSON.stringify({ reaction_type: reactionType }),
  });
}

export function removeCommentReaction(commentId: number, token: string) {
  return apiRequest<SingleResponse<Comment>>(`/comments/${commentId}/reaction`, {
    method: "DELETE",
    token,
  });
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
