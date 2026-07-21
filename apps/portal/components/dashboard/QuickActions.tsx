"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarPlus, Car, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
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
          <DropdownMenuGroup>
            <DropdownMenuGroupLabel>Créer</DropdownMenuGroupLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCustomerOpen(true)}>
              <UserPlus />
              Nouveau client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setVehicleOpen(true)}>
              <Car />
              Nouveau véhicule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReminderOpen(true)}>
              <Bell />
              Rappel manuel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/appointments")}>
              <CalendarPlus />
              Rendez-vous
            </DropdownMenuItem>
          </DropdownMenuGroup>
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
