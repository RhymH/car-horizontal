"use client";

import Link from "next/link";
import { ArrowLeft, Car, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  customerStatusLabels,
  type CustomerStatus,
} from "@/lib/schemas/customer";
import type { CustomerDetail } from "@/lib/api/customers";

const STATUS_TONE: Record<
  CustomerStatus,
  "success" | "neutral" | "danger" | "info"
> = {
  Active: "success",
  Inactive: "neutral",
  Lost: "danger",
  Prospect: "info",
};

export interface CustomerDetailHeaderProps {
  customer: CustomerDetail;
  onEdit: () => void;
  onDelete: () => void;
  onAddInteraction: () => void;
  onAddVehicle: () => void;
}

export function CustomerDetailHeader({
  customer,
  onEdit,
  onDelete,
  onAddInteraction,
  onAddVehicle,
}: CustomerDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5">
      <div>
        <Link
          href="/clients"
          className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Tous les clients
        </Link>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {customer.fullName}
          </h1>
          <StatusBadge tone={STATUS_TONE[customer.status]}>
            {customerStatusLabels[customer.status]}
          </StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onAddInteraction}>
            <MessageSquarePlus />
            Interaction
          </Button>
          <Button variant="outline" size="sm" onClick={onAddVehicle}>
            <Car />
            Véhicule
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            Modifier
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
