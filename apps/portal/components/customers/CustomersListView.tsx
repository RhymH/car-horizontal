"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlarmClock,
  BarChart3,
  GitMerge,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsBadge,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  customersApi,
  type CustomerDetail,
  type CustomerListItem,
  type CustomerStatusApi,
} from "@/lib/api/customers";
import { leadsApi, type LeadListItem, type LeadStageApi } from "@/lib/api/leads";
import { customerStatusLabels } from "@/lib/schemas/customer";
import { leadSourceLabels, leadStageLabels } from "@/lib/schemas/lead";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { FollowUpDialog } from "@/components/leads/FollowUpDialog";

type ViewTab = "all" | "clients" | "prospects";
type StatusFilter = CustomerStatusApi | "All";
type StageFilter = LeadStageApi | "Open";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const PAGE_SIZE_ITEMS = Object.fromEntries(
  PAGE_SIZE_OPTIONS.map((n) => [String(n), `${n} / page`]),
);
const STATUS_FILTER_ITEMS: Record<string, string> = {
  All: "Tous les statuts",
  ...customerStatusLabels,
};
const STAGE_FILTER_TABS: { value: StageFilter; label: string }[] = [
  { value: "Open", label: "En cours" },
  { value: "New", label: leadStageLabels.New },
  { value: "Contacted", label: leadStageLabels.Contacted },
  { value: "Qualified", label: leadStageLabels.Qualified },
  { value: "AppointmentScheduled", label: leadStageLabels.AppointmentScheduled },
  { value: "Lost", label: leadStageLabels.Lost },
];
const SOURCE_FILTER_ITEMS: Record<string, string> = {
  All: "Toutes les sources",
  ...leadSourceLabels,
};

export function CustomersListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [stageFilter, setStageFilter] = useState<StageFilter>("Open");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search, 300);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<LeadListItem | null>(null);

  const isProspects = view === "prospects";

  const resetPagination = () => {
    setPage(1);
    setSelection(new Set());
  };

  const onViewChange = (value: ViewTab) => {
    setView(value);
    resetPagination();
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const customersParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: view === "clients" && statusFilter === "Prospect" ? "All" : statusFilter,
      excludeProspects: view === "clients" || undefined,
      page,
      pageSize,
      sortBy: "fullName" as const,
      sortDir: "asc" as const,
    }),
    [debouncedSearch, statusFilter, view, page, pageSize],
  );

  const customersList = useQuery({
    queryKey: queryKeys.customers.list(customersParams),
    queryFn: ({ signal }) => customersApi.list(customersParams, signal),
    placeholderData: keepPreviousData,
    enabled: !isProspects,
  });

  const leadsParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      stage: stageFilter,
      source: sourceFilter === "All" ? undefined : (sourceFilter as never),
      overdue: overdueOnly || undefined,
      page,
      pageSize,
    }),
    [debouncedSearch, stageFilter, sourceFilter, overdueOnly, page, pageSize],
  );

  const leadsList = useQuery({
    queryKey: queryKeys.leads.list(leadsParams),
    queryFn: ({ signal }) => leadsApi.list(leadsParams as never, signal),
    placeholderData: keepPreviousData,
    enabled: isProspects,
  });

  // Lightweight query that feeds the tab badges (prospect + overdue counts).
  const leadsSummary = useQuery({
    queryKey: queryKeys.leads.list({ summary: true }),
    queryFn: ({ signal }) =>
      leadsApi.list({ stage: "Open", page: 1, pageSize: 1 }, signal),
    staleTime: 60 * 1000,
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: async () => {
      toast.success("Client supprimé");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
    },
    onError: () => toast.error("Suppression impossible"),
  });

  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => customersApi.remove(id)));
    },
    onSuccess: async (_data, ids) => {
      toast.success(`${ids.length} client(s) supprimé(s)`);
      setSelection(new Set());
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
    },
    onError: () => toast.error("Suppression groupée impossible"),
  });

  const reset = () => {
    setSearch("");
    setStatusFilter("All");
    setStageFilter("Open");
    setSourceFilter("All");
    setOverdueOnly(false);
    setPage(1);
  };

  const exportCsv = () => {
    const items = customersList.data?.items ?? [];
    const targets = items.filter((c) => selection.has(c.id));
    if (targets.length === 0) {
      toast.info("Sélectionnez au moins un client.");
      return;
    }
    const header = [
      "Nom",
      "Email",
      "Téléphone",
      "Ville",
      "Véhicules",
      "Statut",
      "Acquis le",
      "Tags",
    ];
    const rows = targets.map((c) => [
      c.fullName,
      c.email ?? "",
      c.phone ?? "",
      c.city ?? "",
      String(c.vehicleCount),
      customerStatusLabels[c.status],
      c.acquiredAt.slice(0, 10),
      c.tags.join("|"),
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const v = String(cell ?? "");
            return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(";"),
      )
      .join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV généré");
  };

  const onView = (row: CustomerListItem) => {
    router.push(`/clients/${row.id}`);
  };

  const onEdit = async (row: CustomerListItem) => {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: queryKeys.customers.detail(row.id),
        queryFn: ({ signal }) => customersApi.get(row.id, signal),
      });
      setEditTarget(detail);
    } catch {
      toast.error("Impossible de charger le client");
    }
  };

  const items = customersList.data?.items ?? [];
  const total = customersList.data?.total ?? 0;
  const selectionSize = selection.size;
  const prospectCount = leadsSummary.data?.total;
  const overdueCount = leadsSummary.data?.overdueCount ?? 0;

  const showCustomersEmptyState =
    !isProspects &&
    !customersList.isLoading &&
    total === 0 &&
    !debouncedSearch &&
    statusFilter === "All";

  const showLeadsEmptyState =
    isProspects &&
    !leadsList.isLoading &&
    (leadsList.data?.total ?? 0) === 0 &&
    !debouncedSearch &&
    stageFilter === "Open" &&
    sourceFilter === "All" &&
    !overdueOnly;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Clients et prospects de votre garage"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/clients/stats" />}
            >
              <BarChart3 />
              Statistiques
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/clients/doublons" />}
            >
              <GitMerge />
              Doublons
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/clients/import" />}
            >
              <Upload />
              Importer
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              {isProspects ? "Nouveau prospect" : "Nouveau client"}
            </Button>
          </div>
        }
      />

      <Tabs value={view} onValueChange={(v) => v && onViewChange(v as ViewTab)}>
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="prospects">
            Prospects
            {prospectCount !== undefined && (
              <TabsBadge>{prospectCount}</TabsBadge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par nom, email, téléphone…"
          className="sm:max-w-xs"
        />
        {isProspects ? (
          <>
            <Tabs
              value={stageFilter}
              onValueChange={(v) => {
                if (!v) return;
                setStageFilter(v as StageFilter);
                resetPagination();
              }}
            >
              <TabsList size="sm">
                {STAGE_FILTER_TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Select
              items={SOURCE_FILTER_ITEMS}
              value={sourceFilter}
              onValueChange={(v) => {
                setSourceFilter(v ?? "All");
                resetPagination();
              }}
            >
              <SelectTrigger size="sm" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_FILTER_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={overdueOnly ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                setOverdueOnly((v) => !v);
                resetPagination();
              }}
              className={cn(!overdueOnly && overdueCount > 0 && "text-destructive")}
            >
              <AlarmClock />
              En retard{overdueCount > 0 ? ` (${overdueCount})` : ""}
            </Button>
          </>
        ) : (
          <Select
            items={STATUS_FILTER_ITEMS}
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter((v ?? "All") as StatusFilter);
              resetPagination();
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Tous les statuts</SelectItem>
              {(Object.keys(customerStatusLabels) as CustomerStatusApi[])
                .filter((s) => view !== "clients" || s !== "Prospect")
                .map((s) => (
                  <SelectItem key={s} value={s}>
                    {customerStatusLabels[s]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        <Select
          items={PAGE_SIZE_ITEMS}
          value={String(pageSize)}
          onValueChange={(v) => {
            setPageSize(Number(v));
            resetPagination();
          }}
        >
          <SelectTrigger
            size={isProspects ? "sm" : undefined}
            className="w-full sm:w-32"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={reset} className="sm:ml-auto">
          <RotateCcw />
          Réinitialiser
        </Button>
      </div>

      {!isProspects && selectionSize > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm">
          <span className="font-medium">{selectionSize} sélectionné(s)</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              Exporter CSV
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 />
              Supprimer la sélection
            </Button>
          </div>
        </div>
      )}

      {isProspects ? (
        showLeadsEmptyState ? (
          <EmptyState
            icon={UserPlus}
            title="Aucun prospect dans le pipeline"
            description="Ajoutez vos prospects un par un ou importez une liste existante : vous pourrez ensuite suivre chaque relance sans rien laisser filer."
            action={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <UserPlus />
                  Ajouter un prospect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/clients/import" />}
                >
                  <Upload />
                  Importer une liste
                </Button>
              </div>
            }
          />
        ) : (
          <LeadsTable
            rows={leadsList.data?.items ?? []}
            loading={leadsList.isLoading}
            page={page}
            pageSize={pageSize}
            total={leadsList.data?.total ?? 0}
            onPageChange={setPage}
            onView={(row) => router.push(`/clients/${row.customerId}`)}
            onScheduleFollowUp={(row) => setFollowUpTarget(row)}
          />
        )
      ) : showCustomersEmptyState ? (
        <EmptyState
          icon={Users}
          title="Aucun client pour le moment"
          description="Commencez par ajouter votre premier client pour suivre ses véhicules et son historique."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus />
              Ajouter votre premier client
            </Button>
          }
        />
      ) : (
        <CustomersTable
          rows={items}
          loading={customersList.isLoading}
          page={page}
          pageSize={pageSize}
          total={total}
          selection={selection}
          onSelectionChange={setSelection}
          onPageChange={setPage}
          onView={onView}
          onEdit={onEdit}
          onDelete={(row) => setDeleteTarget(row)}
        />
      )}

      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode={{
          kind: "create",
          defaultStatus: isProspects ? "Prospect" : undefined,
        }}
        onSaved={(saved) => {
          if (isProspects) router.push(`/clients/${saved.id}`);
        }}
      />
      {editTarget && (
        <CustomerFormDialog
          open={editTarget !== null}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode={{ kind: "edit", customer: editTarget }}
        />
      )}

      {followUpTarget && (
        <FollowUpDialog
          open={followUpTarget !== null}
          onOpenChange={(o) => !o && setFollowUpTarget(null)}
          customerId={followUpTarget.customerId}
          customerName={followUpTarget.fullName}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer ce client ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.fullName} » sera supprimé. Ses véhicules ne seront pas supprimés.`
            : undefined
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteOne.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Supprimer ${selectionSize} client(s) ?`}
        description="Les véhicules associés ne seront pas supprimés."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          await deleteMany.mutateAsync(Array.from(selection));
          setBulkDeleteOpen(false);
        }}
      />
    </div>
  );
}
