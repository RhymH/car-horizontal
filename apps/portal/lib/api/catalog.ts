import { apiClient } from "@/lib/api/client";

export type CatalogEngineType = "Gasoline" | "Diesel" | "Hybrid" | "Electric" | "LPG";
export type CatalogSeverity = "Critical" | "Recommended" | "Optional";
export type CatalogTrigger = "Earliest" | "Latest" | "TimeOnly" | "KmOnly";

export interface VehicleModelProgramSummary {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
}

export interface VehicleModelListItem {
  id: string;
  slug: string;
  make: string;
  model: string;
  trim: string | null;
  engineDisplayName: string;
  engineType: CatalogEngineType;
  fuelType: string;
  productionStartYear: number;
  productionEndYear: number | null;
  displayName: string;
  programs: VehicleModelProgramSummary[];
}

export interface VehicleModelListResponse {
  items: VehicleModelListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MaintenanceProgramItemDetail {
  id: string;
  code: string;
  title: string;
  description: string | null;
  intervalMonths: number | null;
  intervalKm: number | null;
  trigger: CatalogTrigger;
  severity: CatalogSeverity;
  estimatedCostMin: number | null;
  estimatedCostMax: number | null;
}

export interface MaintenanceProgramDetail {
  id: string;
  name: string;
  isDefault: boolean;
  source: string;
  items: MaintenanceProgramItemDetail[];
}

export interface VehicleModelDetail extends VehicleModelListItem {
  aliases: string[];
  programs: (VehicleModelProgramSummary & MaintenanceProgramDetail)[];
}

export interface CatalogListParams {
  q?: string;
  make?: string;
  fuel?: string;
  yearAt?: number;
  page?: number;
  pageSize?: number;
}

export const catalogApi = {
  async listVehicleModels(
    params: CatalogListParams = {},
    signal?: AbortSignal,
  ): Promise<VehicleModelListResponse> {
    const { data } = await apiClient.get<VehicleModelListResponse>(
      "/api/catalog/vehicle-models",
      { params, signal },
    );
    return data;
  },

  async getVehicleModel(
    id: string,
    signal?: AbortSignal,
  ): Promise<VehicleModelDetail> {
    const { data } = await apiClient.get<VehicleModelDetail>(
      `/api/catalog/vehicle-models/${id}`,
      { signal },
    );
    return data;
  },
};
