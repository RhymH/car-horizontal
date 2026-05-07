"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarPlus, Car, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { VehicleFormDialog } from "@/components/vehicles/VehicleFormDialog";
import { ReminderFormDialog } from "@/components/reminders/ReminderFormDialog";

export function QuickActions() {
  const router = useRouter();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm">
              <Plus />
              Action rapide
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Créer</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCustomerOpen(true)}>
            <UserPlus />
            Nouveau client
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setVehicleOpen(true)}>
            <Car />
            Nouveau véhicule
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setReminderOpen(true)}>
            <Bell />
            Rappel manuel
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/appointments")}>
            <CalendarPlus />
            Rendez-vous
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomerFormDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        mode={{ kind: "create" }}
      />
      <VehicleFormDialog
        open={vehicleOpen}
        onOpenChange={setVehicleOpen}
        mode={{ kind: "create" }}
      />
      <ReminderFormDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        mode={{ kind: "create" }}
      />
    </>
  );
}
