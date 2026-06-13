"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { tokenStore } from "@/lib/auth/tokens";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(tokenStore.getAccessToken() ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main className="flex min-h-svh items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted" />
    </main>
  );
}
