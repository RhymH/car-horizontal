import { apiClient } from "@/lib/api/client";

export interface DashboardKpis {
  activeCustomers: number;
  customersAtRisk: number;
  trackedVehicles: number;
  remindersSentLast30Days: number;
  pendingReminders: number;
  workshopReturnRate: number;
  activeCustomersTrendPct: number | null;
  remindersSentTrendPct: number | null;
}

export interface DashboardUpcomingReminder {
  id: string;
  customerId: string;
  customerFullName: string;
  vehicleId: string | null;
  vehicleLabel: string | null;
  licensePlate: string | null;
  channel: string;
  scheduledAt: string;
  status: string;
  itemCode: string | null;
  severity: string | null;
  timelineEventId: string | null;
  timelineEventTitle: string | null;
}

export interface DashboardOverdueTimelineEvent {
  id: string;
  customerId: string;
  customerFullName: string;
  vehicleId: string;
  vehicleLabel: string | null;
  licensePlate: string | null;
  title: string;
  kind: string;
  dueAt: string | null;
  daysOverdue: number | null;
  itemCode: string | null;
  severity: string | null;
}

export interface DashboardCriticalThisWeek {
  id: string;
  customerId: string;
  customerFullName: string;
  vehicleId: string;
  vehicleLabel: string | null;
  licensePlate: string | null;
  title: string;
  dueAt: string | null;
  itemCode: string | null;
  severity: string;
  hasActiveReminder: boolean;
}

export interface DashboardRecentInteraction {
  id: string;
  customerId: string;
  customerFullName: string;
  type: string;
  occurredAt: string;
  summary: string;
}

export interface DashboardChartPoint {
  label: string;
  date: string;
  value: number;
}

export interface DashboardMentalLoad {
  anticipatedThisMonth: number;
  anticipatedLast12Months: number;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  upcomingReminders: DashboardUpcomingReminder[];
  overdueTimeline: DashboardOverdueTimelineEvent[];
  criticalThisWeek: DashboardCriticalThisWeek[];
  recentInteractions: DashboardRecentInteraction[];
  remindersChartSeries: DashboardChartPoint[];
  loyaltyTrend: DashboardChartPoint[];
  mentalLoadAvoided: DashboardMentalLoad;
}

export const dashboardApi = {
  async overview(signal?: AbortSignal): Promise<DashboardOverview> {
    const res = await apiClient.get<DashboardOverview>(
      "/api/dashboard/overview",
      { signal },
    );
    return res.data;
  },
};
