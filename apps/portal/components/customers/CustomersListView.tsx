"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Trash2, UserPlus, Users } from "lucide-react";
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
  customersApi,
  type CustomerDetail,
  type CustomerListItem,
  type CustomerStatusApi,
} from "@/lib/api/customers";
import { customerStatusLabels } from "@/lib/schemas/customer";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";

type StatusFilter = CustomerStatusApi | "All";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const PAGE_SIZE_ITEMS = Object.fromEntries(
  PAGE_SIZE_OPTIONS.map((n) => [String(n), `${n} / page`]),
);
const STATUS_FILTER_ITEMS: Record<string, string> = {
  All: "Tous les statuts",
  ...customerStatusLabels,
};

export function CustomersListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search, 300);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const resetPagination = () => {
    setPage(1);
    setSelection(new Set());
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const onStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    resetPagination();
  };

  const onPageSizeChange = (value: number) => {
    setPageSize(value);
    resetPagination();
  };

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter,
      page,
      pageSize,
      sortBy: "fullName" as const,
      sortDir: "asc" as const,
    }),
    [debouncedSearch, statusFilter, page, pageSize],
  );

  const list = useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: ({ signal }) => customersApi.list(params, signal),
    placeholderData: keepPreviousData,
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: async () => {
      toast.success("Client supprimé");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
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
    },
    onError: () => toast.error("Suppression groupée impossible"),
  });

  const reset = () => {
    setSearch("");
    setStatusFilter("All");
    setPage(1);
  };

  const exportCsv = () => {
    const items = list.data?.items ?? [];
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

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const isInitialLoading = list.isLoading;
  const selectionSize = selection.size;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Tous les clients de votre garage"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            Nouveau client
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par nom, email, téléphone…"
          className="sm:max-w-xs"
        />
        <Select
          items={STATUS_FILTER_ITEMS}
          value={statusFilter}
          onValueChange={(v) => onStatusChange(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Tous les statuts</SelectItem>
            <SelectItem value="Active">Actif</SelectItem>
            <SelectItem value="Inactive">Inactif</SelectItem>
            <SelectItem value="Lost">Perdu</SelectItem>
          </SelectContent>
        </Select>
        <Select
          items={PAGE_SIZE_ITEMS}
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="w-full sm:w-32">
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

      {selectionSize > 0 && (
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

      {!isInitialLoading && total === 0 && !debouncedSearch && statusFilter === "All" ? (
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
          loading={isInitialLoading}
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
        mode={{ kind: "create" }}
      />
      {editTarget && (
        <CustomerFormDialog
          open={editTarget !== null}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode={{ kind: "edit", customer: editTarget }}
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
