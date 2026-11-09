import type { Announcement, ArtistUpdateSubscription, CommunicationPreferences, Conversation, ConversationMessage, CursorResponse, MessagePage, SingleResponse } from "@/types/api";
import { getNotificationUnreadCount } from "./notifications";
import { ApiError, apiRequest } from "./api";

export const getConversations = (token: string, cursor?: string | null) => apiRequest<CursorResponse<Conversation>>(`/conversations?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { token });
export const getConversation = (id: number, token: string, signal?: AbortSignal) => apiRequest<SingleResponse<Conversation>>(`/conversations/${id}`, { token, signal });
export const openConversation = (recipientUserId: number, token: string) => apiRequest<SingleResponse<Conversation>>("/conversations", { method: "POST", token, body: JSON.stringify({ recipient_user_id: recipientUserId }) });
export const getMessages = (id: number, token: string, direction: { beforeId?: number; afterId?: number } = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams({ limit: "50" });
  if (direction.beforeId) params.set("before_id", String(direction.beforeId));
  if (direction.afterId !== undefined) params.set("after_id", String(direction.afterId));
  return apiRequest<MessagePage>(`/conversations/${id}/messages?${params}`, { token, signal });
};
export const sendMessage = (id: number, body: string, clientMessageId: string, token: string) => apiRequest<SingleResponse<ConversationMessage>>(`/conversations/${id}/messages`, { method: "POST", token, body: JSON.stringify({ body, client_message_id: clientMessageId }) });
export const markConversationRead = (id: number, lastReadMessageId: number, token: string) => apiRequest<SingleResponse<Conversation>>(`/conversations/${id}/read`, { method: "PATCH", token, body: JSON.stringify({ last_read_message_id: lastReadMessageId }) });
export const updateConversationPreferences = (id: number, muted: boolean, token: string) => apiRequest<SingleResponse<Conversation>>(`/conversations/${id}/preferences`, { method: "PATCH", token, body: JSON.stringify({ muted }) });
export const getCommunicationPreferences = (token: string) => apiRequest<SingleResponse<CommunicationPreferences>>("/me/communication-preferences", { token });
export const updateCommunicationPreferences = (payload: Partial<CommunicationPreferences>, token: string) => apiRequest<SingleResponse<CommunicationPreferences>>("/me/communication-preferences", { method: "PATCH", token, body: JSON.stringify(payload) });
export const getUpdateSubscription = (artistId: number, token: string) => apiRequest<SingleResponse<ArtistUpdateSubscription>>(`/artists/${artistId}/update-subscription`, { token });
export const setUpdateSubscription = (artistId: number, payload: { subscribed: boolean; consent_version?: string }, token: string) => apiRequest<SingleResponse<ArtistUpdateSubscription>>(`/artists/${artistId}/update-subscription`, { method: "PUT", token, body: JSON.stringify(payload) });
export const getAnnouncements = (token: string, cursor?: string | null) => apiRequest<CursorResponse<Announcement>>(`/me/announcements?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { token });
export const getAnnouncement = (id: number, token: string) => apiRequest<SingleResponse<Announcement>>(`/me/announcements/${id}`, { token });
export const markAnnouncementRead = (id: number, token: string) => apiRequest<SingleResponse<Announcement>>(`/me/announcements/${id}/read`, { method: "PATCH", token });
export const getOwnerAnnouncements = (token: string, cursor?: string | null) => apiRequest<CursorResponse<Announcement>>(`/me/artist/announcements?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { token });
export const createAnnouncement = (payload: { title: string; body: string; video_id?: number | null }, token: string) => apiRequest<SingleResponse<Announcement>>("/me/artist/announcements", { method: "POST", token, body: JSON.stringify(payload) });
export const getOwnerAnnouncement = (id: number, token: string) => apiRequest<SingleResponse<Announcement>>(`/me/artist/announcements/${id}`, { token });
export const updateAnnouncement = (id: number, payload: { version: number; title?: string; body?: string; video_id?: number | null }, token: string) => apiRequest<SingleResponse<Announcement>>(`/me/artist/announcements/${id}`, { method: "PATCH", token, body: JSON.stringify(payload) });
export const deleteAnnouncement = (id: number, token: string) => apiRequest<void>(`/me/artist/announcements/${id}`, { method: "DELETE", token });
export const sendAnnouncement = (id: number, version: number, key: string, token: string) => apiRequest<SingleResponse<Announcement>>(`/me/artist/announcements/${id}/send`, { method: "POST", token, headers: { "Idempotency-Key": key }, body: JSON.stringify({ version }) });

export async function getCommunicationSummary(token: string) {
  try {
    return (await apiRequest<SingleResponse<{ unread_messages: number; unread_notifications: number }>>(
      "/me/communication-summary", { token },
    )).data;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    const [messages, activity] = await Promise.all([getConversations(token), getNotificationUnreadCount(token)]);
    return { unread_messages: messages.meta.unread_count, unread_notifications: activity.data.unread_count };
  }
}
