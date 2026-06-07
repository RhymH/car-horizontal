import { apiClient } from "@/lib/api/client";

export const notificationKinds = [
  "MaintenanceDue",
  "InspectionDue",
  "TireSwapDue",
  "TradeInOpportunity",
  "WarrantyExpiring",
  "InactiveCustomer",
] as const;
export type NotificationKindApi = (typeof notificationKinds)[number];

export const notificationKindLabels: Record<NotificationKindApi, string> = {
  MaintenanceDue: "Entretien",
  InspectionDue: "Contrôle technique",
  TireSwapDue: "Pneus",
  TradeInOpportunity: "Reprise",
  WarrantyExpiring: "Garantie",
  InactiveCustomer: "Client inactif",
};

export type NotificationSeverityApi =
  | "Info"
  | "Opportunity"
  | "Warning"
  | "Critical";

export const notificationSeverityLabels: Record<
  NotificationSeverityApi,
  string
> = {
  Info: "Info",
  Opportunity: "Opportunité",
  Warning: "À traiter",
  Critical: "Urgent",
};

export type NotificationStatusApi = "New" | "Read" | "Done" | "Dismissed";

export type NotificationActionApi =
  | "ViewCustomer"
  | "ViewVehicle"
  | "CreateAppointment"
  | "SendReminder";

export interface AppNotification {
  id: string;
  kind: NotificationKindApi;
  severity: NotificationSeverityApi;
  status: NotificationStatusApi;
  action: NotificationActionApi;
  customerId: string;
  customerFullName: string;
  vehicleId: string | null;
  vehicleLabel: string | null;
  licensePlate: string | null;
  timelineEventId: string | null;
  title: string;
  message: string;
  dueAt: string | null;
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export interface NotificationListParams {
  status?: NotificationStatusApi;
  kind?: NotificationKindApi;
  page?: number;
  pageSize?: number;
}

export const notificationsApi = {
  async list(
    params: NotificationListParams = {},
    signal?: AbortSignal,
  ): Promise<NotificationListResponse> {
    const { data } = await apiClient.get<NotificationListResponse>(
      "/api/notifications",
      { params, signal },
    );
    return data;
  },

  async unreadCount(signal?: AbortSignal): Promise<number> {
    const { data } = await apiClient.get<{ unreadCount: number }>(
      "/api/notifications/unread-count",
      { signal },
    );
    return data.unreadCount;
  },

  async markRead(id: string): Promise<AppNotification> {
    const { data } = await apiClient.post<AppNotification>(
      `/api/notifications/${id}/read`,
    );
    return data;
  },

  async markDone(id: string): Promise<AppNotification> {
    const { data } = await apiClient.post<AppNotification>(
      `/api/notifications/${id}/done`,
    );
    return data;
  },

  async dismiss(id: string): Promise<AppNotification> {
    const { data } = await apiClient.post<AppNotification>(
      `/api/notifications/${id}/dismiss`,
    );
    return data;
  },

  async generate(): Promise<{ created: number }> {
    const { data } = await apiClient.post<{ created: number }>(
      "/api/notifications/generate",
    );
    return data;
  },
};
