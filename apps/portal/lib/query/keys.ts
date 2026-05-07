export const queryKeys = {
  session: {
    me: () => ["session", "me"] as const,
  },
  customers: {
    all: () => ["customers"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["customers", "list", filters ?? {}] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
    overview: (id: string) => ["customers", "overview", id] as const,
  },
  vehicles: {
    all: () => ["vehicles"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["vehicles", "list", filters ?? {}] as const,
    detail: (id: string) => ["vehicles", "detail", id] as const,
    byCustomer: (customerId: string) =>
      ["vehicles", "by-customer", customerId] as const,
  },
  history: {
    byVehicle: (vehicleId: string) =>
      ["history", "by-vehicle", vehicleId] as const,
  },
  maintenance: {
    all: () => ["maintenance"] as const,
    byVehicle: (vehicleId: string, filters?: Record<string, unknown>) =>
      ["maintenance", "by-vehicle", vehicleId, filters ?? {}] as const,
  },
  reminders: {
    all: () => ["reminders"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["reminders", "list", filters ?? {}] as const,
    today: () => ["reminders", "today"] as const,
  },
  appointments: {
    all: () => ["appointments"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["appointments", "list", filters ?? {}] as const,
    detail: (id: string) => ["appointments", "detail", id] as const,
  },
  dashboard: {
    overview: () => ["dashboard", "overview"] as const,
  },
  loyalty: {
    leaderboard: () => ["loyalty", "leaderboard"] as const,
  },
  search: {
    global: (q: string) => ["search", "global", q] as const,
  },
} as const;
