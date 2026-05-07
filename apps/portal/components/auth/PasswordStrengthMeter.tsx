"use client";

import { passwordStrength } from "@/lib/schemas/auth";
import { cn } from "@/lib/utils";

const TONE = [
  "bg-destructive",
  "bg-destructive/70",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
] as const;

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              i < score ? TONE[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className="text-xs text-muted-foreground">Force : {label}</p>
      )}
    </div>
  );
}
