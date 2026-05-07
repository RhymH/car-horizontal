"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VehicleDetail } from "@/lib/api/vehicles";

type Mode =
  | { kind: "create"; defaultCustomerId?: string }
  | { kind: "edit"; vehicle: VehicleDetail };

export interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSaved?: (vehicle: VehicleDetail) => void;
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  mode,
}: VehicleFormDialogProps) {
  const isEdit = mode.kind === "edit";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-180">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le véhicule" : "Nouveau véhicule"}
          </DialogTitle>
          <DialogDescription>
            Implémenté dans T052.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
