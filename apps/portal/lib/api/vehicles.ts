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
  year: number | null;
  licensePlate: string | null;
  currentMileage: number;
  mileageUpdatedAt: string;
  engineType: EngineTypeApi | null;
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
  itemCodes: string[];
}

export type TimelineEventStatusApi =
  | "Pending"
  | "Triggered"
  | "Done"
  | "Skipped";

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

export interface VehicleNote {
  id: string;
  vehicleId: string;
  occurredAt: string;
  body: string;
  authorUserId: string;
}

export interface AddVehicleNotePayload {
  occurredAt: string;
  body: string;
}

export interface VehicleDetail {
  id: string;
  customerId: string;
  customerFullName: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
  licensePlate: string | null;
  currentMileage: number;
  mileageUpdatedAt: string;
  engineType: EngineTypeApi | null;
  transmissionType: string | null;
  purchasedAt: string | null;
  color: string | null;
  photoFileId: string | null;
  vehicleModelId: string | null;
  selectedProgramId: string | null;
  vehicleModelDisplayName: string | null;
  selectedProgramName: string | null;
  createdAt: string;
  updatedAt: string;
  maintenanceRecords: VehicleMaintenance[];
  timelineEvents: VehicleTimelineEvent[];
  notes: VehicleNote[];
}

export type VehicleProgramItemStatus =
  | "Done"
  | "UpcomingSoon"
  | "Upcoming"
  | "Overdue"
  | "Future"
  | "Disabled";

export interface VehicleProgramItemProjection {
  code: string;
  title: string;
  severity: "Critical" | "Recommended" | "Optional";
  lastDoneAt: string | null;
  lastDoneKm: number | null;
  nextDueAt: string | null;
  nextDueKm: number | null;
  status: VehicleProgramItemStatus;
  kmRemaining: number | null;
  daysRemaining: number | null;
  estimatedCostMin: number | null;
  estimatedCostMax: number | null;
  hasOverride: boolean;
  disabled: boolean;
}

export interface VehicleProgramProjection {
  vehicleId: string;
  vehicleModelId: string | null;
  vehicleModelDisplayName: string | null;
  programId: string | null;
  programName: string | null;
  items: VehicleProgramItemProjection[];
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
  year?: number | null;
  vin?: string;
  licensePlate?: string | null;
  currentMileage: number;
  engineType?: EngineTypeApi | null;
  transmissionType?: string;
  purchasedAt?: string;
  color?: string;
  photoFileId?: string;
  vehicleModelId?: string;
  selectedProgramId?: string;
}

export type UpdateVehiclePayload = Partial<Omit<CreateVehiclePayload, "currentMileage">> & {
  clearVehicleModel?: boolean;
};

export interface UpdateMileagePayload {
  mileage: number;
  note?: string;
}

export type MileageConfidenceApi = "High" | "Medium" | "Low";

export interface MileageEstimate {
  estimatedKm: number;
  confidence: MileageConfidenceApi;
  basedOnReadings: number;
  dailyRate: number;
  asOf: string;
  lastObservedKm: number | null;
  lastObservedAt: string | null;
}

export interface MileageCheckRequestResult {
  reminderId: string;
  token: string;
  expiresAt: string;
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

  async addNote(
    id: string,
    payload: AddVehicleNotePayload,
  ): Promise<VehicleDetail> {
    const { data } = await apiClient.post<VehicleDetail>(
      `/api/vehicles/${id}/notes`,
      payload,
    );
    return data;
  },

  async getProgramProjection(
    id: string,
    signal?: AbortSignal,
  ): Promise<VehicleProgramProjection> {
    const { data } = await apiClient.get<VehicleProgramProjection>(
      `/api/vehicles/${id}/program-projection`,
      { signal },
    );
    return data;
  },

  async getMileageEstimate(
    id: string,
    signal?: AbortSignal,
  ): Promise<MileageEstimate> {
    const { data } = await apiClient.get<MileageEstimate>(
      `/api/vehicles/${id}/mileage-estimate`,
      { signal },
    );
    return data;
  },

  async requestMileageCheck(id: string): Promise<MileageCheckRequestResult> {
    const { data } = await apiClient.post<MileageCheckRequestResult>(
      `/api/vehicles/${id}/mileage-check`,
    );
    return data;
  },

  async decodeVin(vin: string): Promise<VinDecodeResult> {
    const { data } = await apiClient.post<VinDecodeResult>(
      "/api/vehicles/decode-vin",
      { vin },
    );
    return data;
  },
};

export interface VinDecodeResult {
  vin: string;
  isValid: boolean;
  make: string | null;
  country: string | null;
  modelYear: number | null;
  wmi: string | null;
  model: string | null;
  fuelType: string | null;
  bodyClass: string | null;
  vehicleType: string | null;
  engineDisplacementL: string | null;
  engineCylinders: string | null;
  transmissionStyle: string | null;
  manufacturer: string | null;
  plantCountry: string | null;
  series: string | null;
  trim: string | null;
  /** Which decoder produced this result: "offline" or "nhtsa". */
  source: string;
  error: string | null;
}
