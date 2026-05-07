import { apiClient } from "@/lib/api/client";

export interface LoyaltyKpis {
  retention12mPct: number;
  returnedLast12Months: number;
  lostCustomers: number;
  averageReturnIntervalDays: number;
  atRiskCount: number;
}

export interface LoyaltyTrendPoint {
  label: string;
  date: string;
  value: number;
}

export interface LoyaltyOverview {
  kpis: LoyaltyKpis;
  retentionTrend: LoyaltyTrendPoint[];
}

export interface LoyaltyCohortCell {
  offsetMonths: number;
  returned: number;
  retentionPct: number;
}

export interface LoyaltyCohortRow {
  cohortLabel: string;
  cohortMonth: string;
  cohortSize: number;
  cells: LoyaltyCohortCell[];
}

export interface LoyaltyCohorts {
  cohorts: LoyaltyCohortRow[];
  maxOffsetMonths: number;
}

export interface LoyaltyCustomer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  lastContactAt: string | null;
  daysSinceLastContact: number | null;
  vehicleCount: number;
}

export interface LoyaltyCustomerList {
  items: LoyaltyCustomer[];
  total: number;
}

export const loyaltyApi = {
  async overview(signal?: AbortSignal): Promise<LoyaltyOverview> {
    const res = await apiClient.get<LoyaltyOverview>("/api/loyalty/overview", {
      signal,
    });
    return res.data;
  },
  async cohorts(signal?: AbortSignal): Promise<LoyaltyCohorts> {
    const res = await apiClient.get<LoyaltyCohorts>("/api/loyalty/cohorts", {
      signal,
    });
    return res.data;
  },
  async atRisk(limit?: number, signal?: AbortSignal): Promise<LoyaltyCustomerList> {
    const res = await apiClient.get<LoyaltyCustomerList>(
      "/api/loyalty/at-risk-customers",
      { signal, params: limit ? { limit } : undefined },
    );
    return res.data;
  },
  async lost(limit?: number, signal?: AbortSignal): Promise<LoyaltyCustomerList> {
    const res = await apiClient.get<LoyaltyCustomerList>(
      "/api/loyalty/lost-customers",
      { signal, params: limit ? { limit } : undefined },
    );
    return res.data;
  },
};
