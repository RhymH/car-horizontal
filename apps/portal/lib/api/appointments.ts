import { apiClient } from "@/lib/api/client";

export const appointmentStatuses = [
  "Pending",
  "Confirmed",
  "Cancelled",
  "Done",
] as const;
export type AppointmentStatusApi = (typeof appointmentStatuses)[number];

export const appointmentStatusLabels: Record<AppointmentStatusApi, string> = {
  Pending: "À confirmer",
  Confirmed: "Confirmé",
  Cancelled: "Annulé",
  Done: "Effectué",
};

export interface Appointment {
  id: string;
  customerId: string;
  customerFullName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  vehicleId: string | null;
  vehicleLabel: string | null;
  licensePlate: string | null;
  scheduledAt: string;
  durationMinutes: number;
  subject: string;
  notes: string | null;
  status: AppointmentStatusApi;
  createdFromReminderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentListResponse {
  items: Appointment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AppointmentListParams {
  from?: string;
  to?: string;
  customerId?: string;
  vehicleId?: string;
  status?: AppointmentStatusApi;
  page?: number;
  pageSize?: number;
  sortDir?: "asc" | "desc";
}

export interface CreateAppointmentPayload {
  customerId: string;
  vehicleId?: string;
  scheduledAt: string;
  durationMinutes: number;
  subject: string;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  scheduledAt?: string;
  durationMinutes?: number;
  subject?: string;
  notes?: string;
  vehicleId?: string;
  clearVehicle?: boolean;
  status?: AppointmentStatusApi;
}

export const appointmentsApi = {
  async list(
    params: AppointmentListParams = {},
    signal?: AbortSignal,
  ): Promise<AppointmentListResponse> {
    const { data } = await apiClient.get<AppointmentListResponse>(
      "/api/appointments",
      { params, signal },
    );
    return data;
  },
  async get(id: string, signal?: AbortSignal): Promise<Appointment> {
    const { data } = await apiClient.get<Appointment>(
      `/api/appointments/${id}`,
      { signal },
    );
    return data;
  },
  async create(payload: CreateAppointmentPayload): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(
      "/api/appointments",
      payload,
    );
    return data;
  },
  async update(
    id: string,
    payload: UpdateAppointmentPayload,
  ): Promise<Appointment> {
    const { data } = await apiClient.patch<Appointment>(
      `/api/appointments/${id}`,
      payload,
    );
    return data;
  },
  async confirm(id: string): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(
      `/api/appointments/${id}/confirm`,
    );
    return data;
  },
  async cancel(id: string): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(
      `/api/appointments/${id}/cancel`,
    );
    return data;
  },
  async done(id: string): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(
      `/api/appointments/${id}/done`,
    );
    return data;
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/appointments/${id}`);
  },
};
