"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type AsyncButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  onClick?: () => Promise<void> | void;
};

export function AsyncButton({
  onClick,
  children,
  disabled,
  ...props
}: AsyncButtonProps) {
  const [pending, setPending] = useState(false);
  const handle = async () => {
    if (!onClick) return;
    try {
      setPending(true);
      await onClick();
    } finally {
      setPending(false);
    }
  };
  return (
    <Button
      {...props}
      disabled={disabled || pending}
      onClick={() => void handle()}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
