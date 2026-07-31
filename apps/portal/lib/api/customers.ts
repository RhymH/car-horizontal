import { apiClient } from "@/lib/api/client";

export type CustomerStatusApi = "Active" | "Inactive" | "Lost" | "Prospect";
export type InteractionTypeApi = "Call" | "Visit" | "Sms" | "Email" | "Note";

export interface CustomerListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  vehicleCount: number;
  status: CustomerStatusApi;
  acquiredAt: string;
  tags: string[];
  salespersonUserId: string | null;
  salespersonName: string | null;
}

export interface CustomersListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  licensePlate: string | null;
  currentMileage: number;
  engineType: string | null;
  photoFileId: string | null;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  type: InteractionTypeApi;
  occurredAt: string;
  summary: string;
  authorUserId: string;
}

export interface CustomerDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
  acquiredAt: string;
  status: CustomerStatusApi;
  tags: string[];
  salespersonUserId: string | null;
  salespersonName: string | null;
  createdAt: string;
  updatedAt: string;
  vehicles: CustomerVehicle[];
  recentInteractions: CustomerInteraction[];
}

export interface CustomersListParams {
  search?: string;
  status?: CustomerStatusApi | "All";
  excludeProspects?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateCustomerPayload {
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  acquiredAt: string;
  status: CustomerStatusApi;
  tags: string[];
  salespersonUserId?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload> & {
  /** Unassign the salesperson — an omitted `salespersonUserId` leaves it unchanged. */
  clearSalesperson?: boolean;
};

export interface AddInteractionPayload {
  type: InteractionTypeApi;
  occurredAt: string;
  summary: string;
}

export const customersApi = {
  async list(
    params: CustomersListParams = {},
    signal?: AbortSignal,
  ): Promise<CustomersListResponse> {
    const { status, ...rest } = params;
    const query: Record<string, unknown> = { ...rest };
    if (status && status !== "All") query.status = status;
    const { data } = await apiClient.get<CustomersListResponse>(
      "/api/customers",
      { params: query, signal },
    );
    return data;
  },

  async get(id: string, signal?: AbortSignal): Promise<CustomerDetail> {
    const { data } = await apiClient.get<CustomerDetail>(
      `/api/customers/${id}`,
      { signal },
    );
    return data;
  },

  async create(payload: CreateCustomerPayload): Promise<CustomerDetail> {
    const { data } = await apiClient.post<CustomerDetail>(
      "/api/customers",
      payload,
    );
    return data;
  },

  async update(
    id: string,
    payload: UpdateCustomerPayload,
  ): Promise<CustomerDetail> {
    const { data } = await apiClient.patch<CustomerDetail>(
      `/api/customers/${id}`,
      payload,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/customers/${id}`);
  },

  async addInteraction(
    id: string,
    payload: AddInteractionPayload,
  ): Promise<CustomerInteraction> {
    const { data } = await apiClient.post<CustomerInteraction>(
      `/api/customers/${id}/interactions`,
      payload,
    );
    return data;
  },
};
