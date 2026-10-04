import type { Notification, PaginatedResponse, SingleResponse } from "@/types/api";
import { apiRequest } from "./api";

export const NOTIFICATION_REFRESH_INTERVAL_MS = 30_000;

export function getNotifications(token: string, page = 1) {
  return apiRequest<PaginatedResponse<Notification>>(`/notifications?page=${page}&limit=20`, { token });
}

export function markNotificationRead(id: number, token: string) {
  return apiRequest<SingleResponse<Notification>>(`/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
}

export function markAllNotificationsRead(token: string) {
  return apiRequest<SingleResponse<{ message: string }>>("/notifications/read-all", {
    method: "PATCH",
    token,
  });
}
