"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ToastDemoButton() {
  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={() =>
        toast.success("CarHorizontal est prêt", {
          description: "Le système de notifications fonctionne.",
        })
      }
    >
      Tester une notification
    </Button>
  );
}
