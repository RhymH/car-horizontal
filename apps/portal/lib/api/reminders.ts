import { apiClient } from "@/lib/api/client";

export const reminderChannels = ["Email", "Sms", "Both"] as const;
export type ReminderChannelApi = (typeof reminderChannels)[number];

export const reminderChannelLabels: Record<ReminderChannelApi, string> = {
  Email: "Email",
  Sms: "SMS",
  Both: "Email + SMS",
};

export const reminderStatuses = [
  "Scheduled",
  "Sent",
  "Failed",
  "Cancelled",
  "Snoozed",
] as const;
export type ReminderStatusApi = (typeof reminderStatuses)[number];

export const reminderStatusLabels: Record<ReminderStatusApi, string> = {
  Scheduled: "Programmé",
  Sent: "Envoyé",
  Failed: "Échoué",
  Cancelled: "Annulé",
  Snoozed: "Reporté",
};

export interface Reminder {
  id: string;
  customerId: string;
  customerFullName: string;
  vehicleId: string | null;
  vehicleLabel: string | null;
  licensePlate: string | null;
  timelineEventId: string | null;
  timelineEventTitle: string | null;
  channel: ReminderChannelApi;
  scheduledAt: string;
  sentAt: string | null;
  status: ReminderStatusApi;
  templateId: string | null;
  resolvedSubject: string | null;
  resolvedBody: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderListResponse {
  items: Reminder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReminderListParams {
  status?: ReminderStatusApi;
  channel?: ReminderChannelApi;
  from?: string;
  to?: string;
  customerId?: string;
  vehicleId?: string;
  page?: number;
  pageSize?: number;
  sortDir?: "asc" | "desc";
}

export interface CreateReminderPayload {
  customerId: string;
  vehicleId?: string;
  timelineEventId?: string;
  channel: ReminderChannelApi;
  scheduledAt: string;
  templateId?: string;
  resolvedSubject?: string;
  resolvedBody?: string;
}

export interface UpdateReminderPayload {
  channel?: ReminderChannelApi;
  scheduledAt?: string;
  templateId?: string;
  clearTemplate?: boolean;
  resolvedSubject?: string;
  resolvedBody?: string;
}

export interface CreateFromTimelinePayload {
  channel?: ReminderChannelApi;
  scheduledAt?: string;
  templateId?: string;
}

export const remindersApi = {
  async list(
    params: ReminderListParams = {},
    signal?: AbortSignal,
  ): Promise<ReminderListResponse> {
    const { data } = await apiClient.get<ReminderListResponse>(
      "/api/reminders",
      { params, signal },
    );
    return data;
  },

  async get(id: string, signal?: AbortSignal): Promise<Reminder> {
    const { data } = await apiClient.get<Reminder>(`/api/reminders/${id}`, {
      signal,
    });
    return data;
  },

  async create(payload: CreateReminderPayload): Promise<Reminder> {
    const { data } = await apiClient.post<Reminder>("/api/reminders", payload);
    return data;
  },

  async update(id: string, payload: UpdateReminderPayload): Promise<Reminder> {
    const { data } = await apiClient.patch<Reminder>(
      `/api/reminders/${id}`,
      payload,
    );
    return data;
  },

  async cancel(id: string): Promise<Reminder> {
    const { data } = await apiClient.post<Reminder>(
      `/api/reminders/${id}/cancel`,
    );
    return data;
  },

  async sendNow(id: string): Promise<Reminder> {
    const { data } = await apiClient.post<Reminder>(
      `/api/reminders/${id}/send-now`,
    );
    return data;
  },

  async snooze(id: string, days: number): Promise<Reminder> {
    const { data } = await apiClient.post<Reminder>(
      `/api/reminders/${id}/snooze`,
      { days },
    );
    return data;
  },

  async createFromTimeline(
    timelineEventId: string,
    payload: CreateFromTimelinePayload = {},
  ): Promise<Reminder> {
    const { data } = await apiClient.post<Reminder>(
      `/api/reminders/from-timeline/${timelineEventId}`,
      payload,
    );
    return data;
  },

  async ensure(): Promise<{ inserted: number }> {
    const { data } = await apiClient.post<{ inserted: number }>(
      "/api/reminders/ensure",
    );
    return data;
  },
};
