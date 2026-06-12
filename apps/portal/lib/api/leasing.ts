import { apiClient } from "@/lib/api/client";

export const leasingStatuses = ["Active", "Ended", "Cancelled"] as const;
export type LeasingStatusApi = (typeof leasingStatuses)[number];

export const leasingStatusLabels: Record<LeasingStatusApi, string> = {
  Active: "En cours",
  Ended: "Terminé",
  Cancelled: "Résilié",
};

export interface LeasingContract {
  id: string;
  vehicleId: string;
  vehicleLabel: string | null;
  licensePlate: string | null;
  customerId: string;
  customerFullName: string;
  lessor: string;
  reference: string | null;
  monthlyPayment: number | null;
  startDate: string;
  endDate: string;
  mileageCapKm: number | null;
  buyoutValue: number | null;
  status: LeasingStatusApi;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeasingContractListResponse {
  items: LeasingContract[];
  total: number;
}

export interface LeasingContractListParams {
  vehicleId?: string;
  customerId?: string;
  status?: LeasingStatusApi;
}

export interface CreateLeasingContractPayload {
  vehicleId: string;
  lessor: string;
  reference?: string;
  monthlyPayment?: number;
  startDate: string;
  endDate: string;
  mileageCapKm?: number;
  buyoutValue?: number;
  notes?: string;
}

export interface UpdateLeasingContractPayload {
  lessor?: string;
  reference?: string;
  monthlyPayment?: number;
  startDate?: string;
  endDate?: string;
  mileageCapKm?: number;
  buyoutValue?: number;
  status?: LeasingStatusApi;
  notes?: string;
}

export const leasingApi = {
  async list(
    params: LeasingContractListParams = {},
    signal?: AbortSignal,
  ): Promise<LeasingContractListResponse> {
    const { data } = await apiClient.get<LeasingContractListResponse>(
      "/api/leasing-contracts",
      { params, signal },
    );
    return data;
  },

  async get(id: string, signal?: AbortSignal): Promise<LeasingContract> {
    const { data } = await apiClient.get<LeasingContract>(
      `/api/leasing-contracts/${id}`,
      { signal },
    );
    return data;
  },

  async create(payload: CreateLeasingContractPayload): Promise<LeasingContract> {
    const { data } = await apiClient.post<LeasingContract>(
      "/api/leasing-contracts",
      payload,
    );
    return data;
  },

  async update(
    id: string,
    payload: UpdateLeasingContractPayload,
  ): Promise<LeasingContract> {
    const { data } = await apiClient.patch<LeasingContract>(
      `/api/leasing-contracts/${id}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/leasing-contracts/${id}`);
  },
};
