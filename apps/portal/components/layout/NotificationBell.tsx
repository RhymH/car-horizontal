"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/lib/api/notifications";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const pathname = usePathname();

  const { data: count = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const active = pathname === "/notifications";

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${count > 0 ? ` (${count} non lues)` : ""}`}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
      )}
    >
      <Bell className="h-[1.1rem] w-[1.1rem]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
