import { NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/env";

/**
 * Sonde côté serveur Next. Répondre = prouver que le portail est debout.
 * En prime, on teste l'API depuis *nos* serveurs : comparé au test fait depuis
 * le navigateur, cela distingue « notre API est tombée » de « le réseau de
 * l'utilisateur bloque notre API ».
 */
export const dynamic = "force-dynamic";

const API_PROBE_TIMEOUT_MS = 5_000;

interface ApiProbe {
  reachable: boolean;
  status: number | null;
  detail?: string;
}

interface DatabaseProbe {
  status: "ok" | "unavailable" | "unknown";
  detail?: string;
}

export async function GET() {
  let api: ApiProbe = { reachable: false, status: null };
  let database: DatabaseProbe = { status: "unknown" };

  try {
    const response = await fetch(`${apiBaseUrl}/api/health/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(API_PROBE_TIMEOUT_MS),
    });

    api = { reachable: true, status: response.status };

    // 200 comme 503 renvoient le détail de la base : l'API est vivante dans les
    // deux cas, seule la dépendance diffère.
    const payload = (await response.json().catch(() => null)) as {
      database?: string;
    } | null;

    if (payload?.database === "ok") {
      database = { status: "ok" };
    } else if (payload?.database === "unavailable") {
      database = { status: "unavailable", detail: "La base de données est injoignable." };
    } else if (!response.ok) {
      api = {
        reachable: true,
        status: response.status,
        detail: `L'API répond en erreur (HTTP ${response.status}).`,
      };
    }
  } catch {
    api = {
      reachable: false,
      status: null,
      detail: "L'API ne répond pas depuis nos serveurs.",
    };
  }

  return NextResponse.json(
    { portal: "ok", api, database, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
