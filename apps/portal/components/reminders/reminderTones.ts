import type { ReminderStatusApi } from "@/lib/api/reminders";
import type { StatusTone } from "@/components/ui/StatusBadge";

export const reminderStatusTone: Record<ReminderStatusApi, StatusTone> = {
  Scheduled: "info",
  Sent: "success",
  Failed: "danger",
  Cancelled: "neutral",
  Snoozed: "warning",
};
