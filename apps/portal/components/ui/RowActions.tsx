"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  variant?: "default" | "destructive";
  separatorBefore?: boolean;
}

export function RowActions({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Actions"
            className="data-[state=open]:bg-muted"
          >
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {actions.map((action, idx) => (
          <div key={`${action.label}-${idx}`}>
            {action.separatorBefore && idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={action.variant ?? "default"}
              onClick={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
