"use client";

import { useMemo, useState } from "react";
import { Edit, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormDialog } from "@/components/ui/FormDialog";
import {
  DetailDrawer,
  DetailDrawerSection,
} from "@/components/ui/DetailDrawer";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Activity {
  id: string;
  client: string;
  vehicle: string;
  status: "Terminée" | "En cours" | "À planifier";
  date: string;
}

const ROWS: Activity[] = [
  {
    id: "1",
    client: "Karim Benali",
    vehicle: "Renault Clio — AB-123-CD",
    status: "Terminée",
    date: "06/05/2026",
  },
  {
    id: "2",
    client: "Sophie Marchand",
    vehicle: "Peugeot 308 — EF-456-GH",
    status: "En cours",
    date: "07/05/2026",
  },
  {
    id: "3",
    client: "Antoine Lopez",
    vehicle: "Citroën C3 — IJ-789-KL",
    status: "À planifier",
    date: "10/05/2026",
  },
];

const STATUS_TONE: Record<Activity["status"], StatusTone> = {
  Terminée: "success",
  "En cours": "info",
  "À planifier": "warning",
};

export function DashboardShowcase() {
  const [selected, setSelected] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formPending, setFormPending] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  const columns = useMemo<ColumnDef<Activity, unknown>[]>(
    () => [
      { accessorKey: "client", header: "Client" },
      { accessorKey: "vehicle", header: "Véhicule" },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => (
          <StatusBadge tone={STATUS_TONE[row.original.status]}>
            {row.original.status}
          </StatusBadge>
        ),
      },
      { accessorKey: "date", header: "Date" },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions
              actions={[
                {
                  label: "Voir le détail",
                  icon: <Eye />,
                  onSelect: () => {
                    setSelected(row.original);
                    setDrawerOpen(true);
                  },
                },
                {
                  label: "Ajouter une note",
                  icon: <Edit />,
                  onSelect: () => {
                    setSelected(row.original);
                    setFormOpen(true);
                  },
                },
                {
                  label: "Supprimer",
                  icon: <Trash2 />,
                  variant: "destructive",
                  separatorBefore: true,
                  onSelect: () => {
                    setSelected(row.original);
                    setConfirmOpen(true);
                  },
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <DataTable
        data={ROWS}
        columns={columns}
        searchPlaceholder="Filtrer par client ou véhicule…"
      />
      <div className="flex justify-end">
        <AsyncButton
          variant="outline"
          size="sm"
          onClick={async () => {
            await new Promise((r) => setTimeout(r, 800));
            toast.success("Synchronisation terminée");
          }}
        >
          Synchroniser
        </AsyncButton>
      </div>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selected?.client ?? ""}
        description={selected?.vehicle}
      >
        <DetailDrawerSection title="Statut">
          {selected && (
            <StatusBadge tone={STATUS_TONE[selected.status]}>
              {selected.status}
            </StatusBadge>
          )}
        </DetailDrawerSection>
        <DetailDrawerSection title="Date">{selected?.date}</DetailDrawerSection>
        <DetailDrawerSection title="Notes">
          Aucune note pour le moment.
        </DetailDrawerSection>
      </DetailDrawer>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer cette intervention ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 500));
          toast.success("Intervention supprimée");
        }}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setNoteValue("");
        }}
        title="Ajouter une note"
        description={selected?.client}
        pending={formPending}
        onSubmit={async () => {
          setFormPending(true);
          await new Promise((r) => setTimeout(r, 500));
          setFormPending(false);
          setFormOpen(false);
          setNoteValue("");
          toast.success("Note ajoutée");
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="note">Note</Label>
          <Input
            id="note"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Ex. client à rappeler"
          />
        </div>
      </FormDialog>
    </div>
  );
}
