"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/ui";
import { tokenStore } from "@/lib/auth/tokens";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(tokenStore.getAccessToken() ? "/dashboard" : "/login");
  }, [router]);

  return <SplashScreen />;
}
