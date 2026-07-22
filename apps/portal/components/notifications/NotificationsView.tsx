"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  RefreshCw,
  Check,
  X,
  ArrowRight,
  CalendarPlus,
  Send,
  User,
  Car,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import {
  notificationKindLabels,
  notificationSeverityLabels,
  notificationsApi,
  type AppNotification,
  type NotificationSeverityApi,
  type NotificationStatusApi,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

const TABS: Record<string, NotificationStatusApi | undefined> = {
  Open: undefined,
  Done: "Done",
  Dismissed: "Dismissed",
};
const TAB_LABELS: Record<keyof typeof TABS, string> = {
  Open: "À traiter",
  Done: "Traitées",
  Dismissed: "Ignorées",
};

const SEVERITY_STYLES: Record<NotificationSeverityApi, string> = {
  Critical: "border-l-destructive",
  Warning: "border-l-amber-500",
  Opportunity: "border-l-sky-500",
  Info: "border-l-muted-foreground/40",
};

const SEVERITY_BADGE: Record<NotificationSeverityApi, string> = {
  Critical: "bg-destructive/10 text-destructive",
  Warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Opportunity: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Info: "bg-muted text-muted-foreground",
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function actionTarget(n: AppNotification): { href: string; label: string; icon: typeof ArrowRight } {
  switch (n.action) {
    case "CreateAppointment":
      return { href: "/appointments", label: "Planifier un RDV", icon: CalendarPlus };
    case "SendReminder":
      return { href: "/reminders", label: "Envoyer un rappel", icon: Send };
    case "ViewVehicle":
      return {
        href: n.vehicleId ? `/vehicles/${n.vehicleId}` : `/clients/${n.customerId}`,
        label: "Voir le véhicule",
        icon: Car,
      };
    default:
      return { href: `/clients/${n.customerId}`, label: "Voir le client", icon: User };
  }
}

export function NotificationsView() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<keyof typeof TABS>("Open");

  const params = useMemo(() => ({ status: TABS[tab], pageSize: 100 }), [tab]);

  const list = useQuery({
    queryKey: queryKeys.notifications.list({ ...params }),
    queryFn: ({ signal }) => notificationsApi.list(params, signal),
    placeholderData: keepPreviousData,
  });

  const items = list.data?.items ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });

  const generateMut = useMutation({
    mutationFn: () => notificationsApi.generate(),
    onSuccess: async (data) => {
      toast.success(
        data.created > 0
          ? `${data.created} nouvelle(s) notification(s)`
          : "Aucune nouvelle notification",
      );
      await invalidate();
    },
    onError: (err) =>
      toast.error(extractApiErrorMessage(err, "Actualisation impossible.")),
  });

  const doneMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markDone(id),
    onSuccess: async () => {
      toast.success("Notification traitée");
      await invalidate();
    },
    onError: (err) => toast.error(extractApiErrorMessage(err, "Action impossible.")),
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => notificationsApi.dismiss(id),
    onSuccess: async () => {
      toast.success("Notification ignorée");
      await invalidate();
    },
    onError: (err) => toast.error(extractApiErrorMessage(err, "Action impossible.")),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Vos actions prioritaires : entretiens, échéances, opportunités et clients à relancer."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
          >
            <RefreshCw className={cn(generateMut.isPending && "animate-spin")} />
            Actualiser
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => v && setTab(v as keyof typeof TABS)}>
        <TabsList>
          {(Object.keys(TABS) as (keyof typeof TABS)[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {TAB_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tab === "Open" ? "Rien à traiter 🎉" : "Aucune notification"}
          description={
            tab === "Open"
              ? "Toutes vos actions sont à jour. Les nouvelles échéances apparaîtront ici automatiquement."
              : "Aucune notification dans cette catégorie."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((n) => {
            const action = actionTarget(n);
            const ActionIcon = action.icon;
            const isOpen = n.status === "New" || n.status === "Read";
            return (
              <article
                key={n.id}
                className={cn(
                  "rounded-lg border border-l-4 border-border bg-card p-4 shadow-sm transition-colors",
                  SEVERITY_STYLES[n.severity],
                  n.status === "New" && "bg-muted/50",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      SEVERITY_BADGE[n.severity],
                    )}
                  >
                    {notificationSeverityLabels[n.severity]}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {notificationKindLabels[n.kind]}
                  </span>
                  {n.status === "New" && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-destructive" aria-label="Non lue" />
                  )}
                  {n.dueAt && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Échéance : {dateFmt.format(new Date(n.dueAt))}
                    </span>
                  )}
                </div>

                <h3 className="mt-2 font-semibold">{n.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={action.href}
                    onClick={() => readMut.mutate(n.id)}
                    className={buttonVariants({ size: "sm" })}
                  >
                    <ActionIcon />
                    {action.label}
                    <ArrowRight className="opacity-60" />
                  </Link>
                  {isOpen && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => doneMut.mutate(n.id)}
                        disabled={doneMut.isPending}
                      >
                        <Check />
                        Traité
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissMut.mutate(n.id)}
                        disabled={dismissMut.isPending}
                      >
                        <X />
                        Ignorer
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
