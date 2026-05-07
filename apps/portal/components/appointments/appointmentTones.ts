import type { StatusTone } from "@/components/ui/StatusBadge";
import type { AppointmentStatusApi } from "@/lib/api/appointments";

export const appointmentStatusTones: Record<AppointmentStatusApi, StatusTone> =
  {
    Pending: "warning",
    Confirmed: "info",
    Done: "success",
    Cancelled: "neutral",
  };
