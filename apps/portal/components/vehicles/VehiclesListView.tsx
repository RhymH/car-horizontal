"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Plus, RotateCcw, Trash2 } from "lucide-react";
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
  engineTypeLabels,
  vehiclesApi,
  type EngineTypeApi,
  type VehicleDetail,
  type VehicleListItem,
} from "@/lib/api/vehicles";
import { engineTypes } from "@/lib/schemas/vehicle";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { VehiclesTable } from "@/components/vehicles/VehiclesTable";
import { VehicleFormDialog } from "@/components/vehicles/VehicleFormDialog";

type EngineFilter = EngineTypeApi | "All";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: number[] = [];
for (let y = CURRENT_YEAR + 1; y >= 1980; y--) YEAR_OPTIONS.push(y);

export function VehiclesListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [engineFilter, setEngineFilter] = useState<EngineFilter>("All");
  const [yearFrom, setYearFrom] = useState<string>("All");
  const [yearTo, setYearTo] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search, 300);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VehicleDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const resetPagination = () => {
    setPage(1);
    setSelection(new Set());
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      engineType: engineFilter,
      yearFrom: yearFrom === "All" ? undefined : Number(yearFrom),
      yearTo: yearTo === "All" ? undefined : Number(yearTo),
      page,
      pageSize,
      sortBy: "licensePlate" as const,
      sortDir: "asc" as const,
    }),
    [debouncedSearch, engineFilter, yearFrom, yearTo, page, pageSize],
  );

  const list = useQuery({
    queryKey: queryKeys.vehicles.list(params),
    queryFn: ({ signal }) => vehiclesApi.list(params, signal),
    placeholderData: keepPreviousData,
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => vehiclesApi.remove(id),
    onSuccess: async () => {
      toast.success("Véhicule supprimé");
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
    },
    onError: () => toast.error("Suppression impossible"),
  });

  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => vehiclesApi.remove(id)));
    },
    onSuccess: async (_data, ids) => {
      toast.success(`${ids.length} véhicule(s) supprimé(s)`);
      setSelection(new Set());
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all() });
    },
    onError: () => toast.error("Suppression groupée impossible"),
  });

  const reset = () => {
    setSearch("");
    setEngineFilter("All");
    setYearFrom("All");
    setYearTo("All");
    setPage(1);
  };

  const onView = (row: VehicleListItem) => {
    router.push(`/vehicles/${row.id}`);
  };

  const onEdit = async (row: VehicleListItem) => {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: queryKeys.vehicles.detail(row.id),
        queryFn: ({ signal }) => vehiclesApi.get(row.id, signal),
      });
      setEditTarget(detail);
    } catch {
      toast.error("Impossible de charger le véhicule");
    }
  };

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const isInitialLoading = list.isLoading;
  const selectionSize = selection.size;
  const hasFilters =
    !!debouncedSearch ||
    engineFilter !== "All" ||
    yearFrom !== "All" ||
    yearTo !== "All";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Véhicules"
        description="Toutes les fiches véhicules de votre garage"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            Nouveau véhicule
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par plaque, marque, modèle, VIN…"
          className="sm:max-w-xs"
        />
        <Select
          value={engineFilter}
          onValueChange={(v) => {
            setEngineFilter(v as EngineFilter);
            resetPagination();
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Énergie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Toutes énergies</SelectItem>
            {engineTypes.map((e) => (
              <SelectItem key={e} value={e}>
                {engineTypeLabels[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={yearFrom}
          onValueChange={(v) => {
            setYearFrom(v ?? "All");
            resetPagination();
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Année min" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Année min</SelectItem>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={`from-${y}`} value={String(y)}>
                ≥ {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={yearTo}
          onValueChange={(v) => {
            setYearTo(v ?? "All");
            resetPagination();
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Année max" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Année max</SelectItem>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={`to-${y}`} value={String(y)}>
                ≤ {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            setPageSize(Number(v));
            resetPagination();
          }}
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

      {!isInitialLoading && total === 0 && !hasFilters ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule pour le moment"
          description="Créez votre premier véhicule pour suivre son entretien et programmer des rappels."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              Ajouter un véhicule
            </Button>
          }
        />
      ) : (
        <VehiclesTable
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

      <VehicleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode={{ kind: "create" }}
      />
      {editTarget && (
        <VehicleFormDialog
          open={editTarget !== null}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode={{ kind: "edit", vehicle: editTarget }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer ce véhicule ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.make} ${deleteTarget.model} (${deleteTarget.licensePlate}) » sera supprimé. Son historique d'entretien sera conservé.`
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
        title={`Supprimer ${selectionSize} véhicule(s) ?`}
        description="L'historique d'entretien associé sera conservé."
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
