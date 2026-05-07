import { apiClient } from "@/lib/api/client";

export const maintenanceTypes = [
  "Oil",
  "Tires",
  "Brakes",
  "FullService",
  "TechnicalInspection",
  "Custom",
] as const;
export type MaintenanceTypeApi = (typeof maintenanceTypes)[number];

export const maintenanceTypeLabels: Record<MaintenanceTypeApi, string> = {
  Oil: "Vidange",
  Tires: "Pneus",
  Brakes: "Freins",
  FullService: "Révision complète",
  TechnicalInspection: "Contrôle technique",
  Custom: "Autre",
};

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  performedAt: string;
  type: MaintenanceTypeApi;
  description: string;
  mileageAtService: number;
  cost: number | null;
  mechanicName: string | null;
  nextDueAt: string | null;
  nextDueMileage: number | null;
  itemCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceListResponse {
  items: MaintenanceRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateMaintenancePayload {
  performedAt: string;
  type: MaintenanceTypeApi;
  description?: string;
  mileageAtService: number;
  cost?: number;
  mechanicName?: string;
  nextDueAt?: string;
  nextDueMileage?: number;
  itemCodes?: string[];
}

export interface UpdateMaintenancePayload {
  performedAt?: string;
  type?: MaintenanceTypeApi;
  description?: string;
  mileageAtService?: number;
  cost?: number;
  mechanicName?: string;
  nextDueAt?: string;
  nextDueMileage?: number;
  clearNextDueAt?: boolean;
  clearNextDueMileage?: boolean;
  itemCodes?: string[];
}

export interface MaintenanceListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export const maintenanceApi = {
  async listByVehicle(
    vehicleId: string,
    params: MaintenanceListParams = {},
    signal?: AbortSignal,
  ): Promise<MaintenanceListResponse> {
    const { data } = await apiClient.get<MaintenanceListResponse>(
      `/api/vehicles/${vehicleId}/maintenance`,
      { params, signal },
    );
    return data;
  },

  async create(
    vehicleId: string,
    payload: CreateMaintenancePayload,
  ): Promise<MaintenanceRecord> {
    const { data } = await apiClient.post<MaintenanceRecord>(
      `/api/vehicles/${vehicleId}/maintenance`,
      payload,
    );
    return data;
  },

  async update(
    id: string,
    payload: UpdateMaintenancePayload,
  ): Promise<MaintenanceRecord> {
    const { data } = await apiClient.patch<MaintenanceRecord>(
      `/api/maintenance/${id}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/maintenance/${id}`);
  },
};
