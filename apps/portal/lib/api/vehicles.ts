import { apiClient } from "@/lib/api/client";

export type EngineTypeApi = "Gasoline" | "Diesel" | "Hybrid" | "Electric" | "LPG";

export const engineTypeLabels: Record<EngineTypeApi, string> = {
  Gasoline: "Essence",
  Diesel: "Diesel",
  Hybrid: "Hybride",
  Electric: "Électrique",
  LPG: "GPL",
};

export interface VehicleListItem {
  id: string;
  customerId: string;
  customerFullName: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  currentMileage: number;
  mileageUpdatedAt: string;
  engineType: EngineTypeApi;
  photoFileId: string | null;
}

export interface VehiclesListResponse {
  items: VehicleListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VehicleMaintenance {
  id: string;
  performedAt: string;
  type: string;
  description: string;
  mileageAtService: number;
  cost: number | null;
  mechanicName: string | null;
  nextDueAt: string | null;
  nextDueMileage: number | null;
}

export type TimelineEventStatusApi =
  | "Pending"
  | "Sent"
  | "Done"
  | "Snoozed"
  | "Cancelled";

export interface VehicleTimelineEvent {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  dueMileage: number | null;
  status: TimelineEventStatusApi;
  source: string;
  generatedFromRule: string | null;
}

export interface VehicleDetail {
  id: string;
  customerId: string;
  customerFullName: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  licensePlate: string;
  currentMileage: number;
  mileageUpdatedAt: string;
  engineType: EngineTypeApi;
  transmissionType: string | null;
  purchasedAt: string | null;
  color: string | null;
  photoFileId: string | null;
  createdAt: string;
  updatedAt: string;
  maintenanceRecords: VehicleMaintenance[];
  timelineEvents: VehicleTimelineEvent[];
}

export interface VehiclesListParams {
  search?: string;
  customerId?: string;
  engineType?: EngineTypeApi | "All";
  yearFrom?: number;
  yearTo?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateVehiclePayload {
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate: string;
  currentMileage: number;
  engineType: EngineTypeApi;
  transmissionType?: string;
  purchasedAt?: string;
  color?: string;
  photoFileId?: string;
}

export type UpdateVehiclePayload = Partial<Omit<CreateVehiclePayload, "currentMileage">>;

export interface UpdateMileagePayload {
  mileage: number;
  note?: string;
}

export const vehiclesApi = {
  async list(
    params: VehiclesListParams = {},
    signal?: AbortSignal,
  ): Promise<VehiclesListResponse> {
    const { engineType, ...rest } = params;
    const query: Record<string, unknown> = { ...rest };
    if (engineType && engineType !== "All") query.engineType = engineType;
    const { data } = await apiClient.get<VehiclesListResponse>(
      "/api/vehicles",
      { params: query, signal },
    );
    return data;
  },

  async get(id: string, signal?: AbortSignal): Promise<VehicleDetail> {
    const { data } = await apiClient.get<VehicleDetail>(`/api/vehicles/${id}`, {
      signal,
    });
    return data;
  },

  async create(payload: CreateVehiclePayload): Promise<VehicleDetail> {
    const { data } = await apiClient.post<VehicleDetail>(
      "/api/vehicles",
      payload,
    );
    return data;
  },

  async update(
    id: string,
    payload: UpdateVehiclePayload,
  ): Promise<VehicleDetail> {
    const { data } = await apiClient.patch<VehicleDetail>(
      `/api/vehicles/${id}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/vehicles/${id}`);
  },

  async updateMileage(
    id: string,
    payload: UpdateMileagePayload,
  ): Promise<VehicleDetail> {
    const { data } = await apiClient.post<VehicleDetail>(
      `/api/vehicles/${id}/mileage`,
      payload,
    );
    return data;
  },
};
