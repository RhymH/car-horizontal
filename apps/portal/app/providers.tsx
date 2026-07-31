"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "@/lib/query/queryClient";
import { ConnectionOutageOverlay } from "@/components/system/ConnectionOutageOverlay";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <ConnectionOutageOverlay />
      {process.env.NODE_ENV !== "production" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
