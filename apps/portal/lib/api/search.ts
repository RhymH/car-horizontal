import { apiClient } from "@/lib/api/client";

export interface SearchCustomer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface SearchVehicle {
  id: string;
  customerId: string;
  licensePlate: string | null;
  make: string;
  model: string;
  year: number | null;
}

export interface SearchResults {
  customers: SearchCustomer[];
  vehicles: SearchVehicle[];
}

export const searchApi = {
  async search(q: string, signal?: AbortSignal): Promise<SearchResults> {
    const { data } = await apiClient.get<SearchResults>("/api/search", {
      params: { q },
      signal,
    });
    return data;
  },
};
