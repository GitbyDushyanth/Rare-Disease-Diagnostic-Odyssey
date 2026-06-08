import { apiGet, apiPatch, apiPost, type ApiResponse } from './client';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: string | Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  data: NotificationRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

export async function getNotifications(
  page = 1,
  limit = 20,
  unreadOnly = false
): Promise<NotificationsResponse> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (unreadOnly) query.append('unread', 'true');

  const res = await apiGet<ApiResponse<NotificationRecord[]>>(`/notifications?${query.toString()}`);
  return {
    data: res.data,
    meta: res.meta as NotificationsResponse['meta'],
  };
}

export async function markNotificationAsRead(id: string): Promise<NotificationRecord> {
  const res = await apiPatch<ApiResponse<NotificationRecord>>(`/notifications/${id}/read`, {});
  return res.data;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiPost<ApiResponse<void>>('/notifications/read-all', {});
}
