"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  Activity,
  Bell,
  Inbox,
  CalendarDays,
  ClipboardList,
  Heart,
  Settings,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/notifications", label: "Notifications", icon: Inbox },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/vehicles", label: "Véhicules", icon: Car },
  { href: "/timeline", label: "Timeline", icon: Activity },
  { href: "/reminders", label: "Rappels", icon: Bell },
  { href: "/appointments", label: "Rendez-vous", icon: CalendarDays },
  { href: "/history", label: "Historique", icon: ClipboardList },
  { href: "/loyalty", label: "Fidélisation", icon: Heart },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "flex h-full min-h-svh w-64 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5 font-semibold">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="size-3.5" />
        </span>
        CarHorizontal
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
