import { apiBaseUrl } from "@/lib/env";

/**
 * Diagnostic de connectivité : trois sondes indépendantes qui permettent de
 * dire à l'utilisateur *de quel côté* est le problème.
 *
 *  1. Internet  — un site externe dont on sait qu'il est up (hors de notre infra).
 *  2. Portail   — le serveur Next lui-même, via son route handler `/api/diagnostics`.
 *  3. API       — l'API CarHorizontal, testée depuis le navigateur ET depuis le
 *                 serveur Next (le route handler la teste côté serveur). L'écart
 *                 entre les deux distingue « notre API est tombée » de « le
 *                 réseau de l'utilisateur bloque notre API ».
 */

export type CheckId = "internet" | "portal" | "api" | "database";

export type CheckStatus = "idle" | "running" | "ok" | "warn" | "fail" | "skipped";

export interface DiagnosticCheck {
  id: CheckId;
  label: string;
  description: string;
  status: CheckStatus;
  detail?: string;
  latencyMs?: number;
}

export type VerdictKind =
  | "ok"
  | "user-network"
  | "user-blocked"
  | "our-portal"
  | "our-api"
  | "our-database"
  | "unknown";

export interface Verdict {
  kind: VerdictKind;
  /** Qui est probablement en cause — pilote la couleur et le pictogramme. */
  side: "user" | "us" | "none" | "unknown";
  title: string;
  message: string;
  advice: string[];
}

export interface DiagnosticsReport {
  checks: DiagnosticCheck[];
  verdict: Verdict;
}

const CHECK_META: Record<CheckId, { label: string; description: string }> = {
  internet: {
    label: "Votre connexion internet",
    description: "Appel à un site externe indépendant de CarHorizontal",
  },
  portal: {
    label: "Le site CarHorizontal",
    description: "Le serveur qui délivre les pages du portail",
  },
  api: {
    label: "Nos services (API)",
    description: "Le service qui fournit vos données",
  },
  database: {
    label: "Notre base de données",
    description: "Le stockage des clients, véhicules et interventions",
  },
};

/** Sites externes réputés disponibles, surchargeables par configuration. */
const DEFAULT_INTERNET_PROBES = [
  "https://www.gstatic.com/generate_204",
  "https://cloudflare.com/cdn-cgi/trace",
  "https://www.bing.com/favicon.ico",
];

const INTERNET_PROBES = (() => {
  const configured = process.env.NEXT_PUBLIC_CONNECTIVITY_PROBES;
  const parsed = configured
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return parsed && parsed.length > 0 ? parsed : DEFAULT_INTERNET_PROBES;
})();

const TIMEOUTS = {
  internet: 5_000,
  portal: 9_000,
  api: 6_000,
} as const;

function initialCheck(id: CheckId, status: CheckStatus = "idle"): DiagnosticCheck {
  return { id, status, ...CHECK_META[id] };
}

export function initialChecks(): DiagnosticCheck[] {
  return (["internet", "portal", "api", "database"] as CheckId[]).map((id) =>
    initialCheck(id, "running"),
  );
}

function cacheBusted(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_ch=${Date.now().toString(36)}`;
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(ms)
    : undefined;
}

/** Sonde 1 — l'utilisateur a-t-il un accès internet ? */
async function checkInternet(): Promise<Omit<DiagnosticCheck, "id" | "label" | "description">> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      status: "fail",
      detail: "Votre appareil se déclare hors ligne (Wi-Fi ou câble réseau coupé).",
    };
  }

  const started = performance.now();
  try {
    // `no-cors` : on ne lit pas la réponse, on veut juste savoir si un paquet
    // sort de la machine. Une réponse opaque suffit à prouver l'accès internet.
    await Promise.any(
      INTERNET_PROBES.map((url) =>
        fetch(cacheBusted(url), {
          mode: "no-cors",
          cache: "no-store",
          signal: timeoutSignal(TIMEOUTS.internet),
        }),
      ),
    );
    return { status: "ok", latencyMs: Math.round(performance.now() - started) };
  } catch {
    return {
      status: "fail",
      detail: "Aucun site externe n'est joignable depuis votre appareil.",
    };
  }
}

interface ServerDiagnostics {
  portal: "ok";
  api: { reachable: boolean; status: number | null; detail?: string };
  database: { status: "ok" | "unavailable" | "unknown"; detail?: string };
}

/** Sonde 2 — le serveur du portail répond-il, et que voit-il de l'API ? */
async function checkPortal(): Promise<{
  check: Omit<DiagnosticCheck, "id" | "label" | "description">;
  server: ServerDiagnostics | null;
}> {
  const started = performance.now();
  try {
    const response = await fetch(cacheBusted("/api/diagnostics"), {
      cache: "no-store",
      signal: timeoutSignal(TIMEOUTS.portal),
    });
    const latencyMs = Math.round(performance.now() - started);

    if (!response.ok) {
      return {
        check: {
          status: "fail",
          latencyMs,
          detail: `Le serveur du portail répond en erreur (HTTP ${response.status}).`,
        },
        server: null,
      };
    }

    const server = (await response.json()) as ServerDiagnostics;
    return { check: { status: "ok", latencyMs }, server };
  } catch {
    return {
      check: {
        status: "fail",
        detail: "Le serveur du portail ne répond pas.",
      },
      server: null,
    };
  }
}

/** Sonde 3 — l'API répond-elle depuis le navigateur de l'utilisateur ? */
async function checkApi(): Promise<Omit<DiagnosticCheck, "id" | "label" | "description">> {
  const started = performance.now();
  try {
    const response = await fetch(cacheBusted(`${apiBaseUrl}/api/health`), {
      cache: "no-store",
      signal: timeoutSignal(TIMEOUTS.api),
    });
    const latencyMs = Math.round(performance.now() - started);

    if (response.ok) return { status: "ok", latencyMs };

    return {
      status: "fail",
      latencyMs,
      detail: `Nos services répondent en erreur (HTTP ${response.status}).`,
    };
  } catch {
    // Échec CORS ou réseau : on retente en `no-cors`. Si ça passe, le serveur
    // est bien là et c'est la configuration d'origines qui bloque la réponse.
    try {
      await fetch(cacheBusted(`${apiBaseUrl}/api/health`), {
        mode: "no-cors",
        cache: "no-store",
        signal: timeoutSignal(TIMEOUTS.api),
      });
      return {
        status: "warn",
        detail:
          "Nos services sont joignables mais refusent la réponse au navigateur (configuration CORS).",
      };
    } catch {
      return {
        status: "fail",
        detail: "Nos services ne répondent pas depuis votre appareil.",
      };
    }
  }
}

function databaseCheckFrom(server: ServerDiagnostics | null): Omit<
  DiagnosticCheck,
  "id" | "label" | "description"
> {
  if (!server) {
    return { status: "skipped", detail: "Non vérifiable tant que le portail ne répond pas." };
  }
  if (server.database.status === "ok") return { status: "ok" };
  if (server.database.status === "unavailable") {
    return {
      status: "fail",
      detail: server.database.detail ?? "La base de données est injoignable.",
    };
  }
  return { status: "skipped", detail: "Non vérifiable tant que l'API ne répond pas." };
}

export function buildVerdict(
  checks: DiagnosticCheck[],
  server: ServerDiagnostics | null,
): Verdict {
  const status = (id: CheckId) => checks.find((c) => c.id === id)?.status ?? "skipped";

  const internet = status("internet");
  const portal = status("portal");
  const api = status("api");
  const database = status("database");
  const apiSeenByServer = server?.api.reachable ?? null;

  if (internet === "fail") {
    return {
      kind: "user-network",
      side: "user",
      title: "Votre connexion internet semble interrompue",
      message:
        "Aucun site n'est joignable depuis votre appareil, y compris en dehors de CarHorizontal. Le problème vient très probablement de votre accès internet.",
      advice: [
        "Vérifiez que le Wi-Fi est activé ou que le câble réseau est branché.",
        "Testez un autre site dans un nouvel onglet (par exemple google.fr).",
        "Redémarrez votre box ou votre routeur si le problème persiste.",
        "En 4G/5G, vérifiez que le partage de connexion est actif.",
      ],
    };
  }

  if (portal === "fail" && api === "fail") {
    return {
      kind: "our-portal",
      side: "us",
      title: "Nos serveurs ne répondent pas",
      message:
        "Votre connexion internet fonctionne, mais ni le site ni nos services ne répondent. L'incident est de notre côté et notre équipe en est probablement déjà informée.",
      advice: [
        "Réessayez dans quelques minutes.",
        "Vos données ne sont pas perdues : rien n'est supprimé pendant une interruption.",
        "Si la situation dure, contactez le support en précisant l'heure de l'incident.",
      ],
    };
  }

  if (portal === "fail") {
    return {
      kind: "our-portal",
      side: "us",
      title: "Le site CarHorizontal ne répond pas",
      message:
        "Votre connexion internet fonctionne et nos services de données répondent, mais le serveur qui délivre les pages est indisponible. L'incident est de notre côté.",
      advice: [
        "Réessayez dans quelques minutes.",
        "Rechargez la page complètement (Ctrl + F5).",
      ],
    };
  }

  if (api === "fail" && apiSeenByServer === true) {
    return {
      kind: "user-blocked",
      side: "user",
      title: "Votre réseau bloque l'accès à nos services",
      message:
        "Nos services fonctionnent (le site les joint sans problème), mais votre appareil n'arrive pas à les atteindre. Un pare-feu, un proxy d'entreprise, un antivirus ou un VPN bloque probablement la connexion.",
      advice: [
        "Désactivez temporairement le VPN ou le proxy, puis réessayez.",
        "Essayez depuis un autre réseau (partage de connexion mobile).",
        "Demandez à votre service informatique d'autoriser le domaine de nos services.",
        "Testez en navigation privée, sans extension de navigateur.",
      ],
    };
  }

  if (api === "fail") {
    return {
      kind: "our-api",
      side: "us",
      title: "Nos services sont indisponibles",
      message:
        "Votre connexion internet fonctionne, mais le service qui fournit vos données ne répond pas. L'incident est de notre côté.",
      advice: [
        "Réessayez dans quelques minutes.",
        "Les données déjà enregistrées ne sont pas affectées.",
        "Si la situation dure, contactez le support en précisant l'heure de l'incident.",
      ],
    };
  }

  if (database === "fail") {
    return {
      kind: "our-database",
      side: "us",
      title: "Service partiellement disponible",
      message:
        "Nos services répondent mais n'accèdent pas à la base de données. L'affichage et l'enregistrement peuvent échouer : l'incident est de notre côté.",
      advice: [
        "Évitez de saisir de nouvelles données tant que l'incident dure.",
        "Réessayez dans quelques minutes.",
      ],
    };
  }

  if (api === "warn") {
    return {
      kind: "our-api",
      side: "us",
      title: "Nos services répondent mal",
      message:
        "Nos services sont joignables mais refusent de répondre à votre navigateur. Il s'agit d'un problème de configuration de notre côté.",
      advice: [
        "Réessayez dans quelques minutes.",
        "Signalez l'incident au support en précisant l'adresse de la page.",
      ],
    };
  }

  return {
    kind: "ok",
    side: "none",
    title: "Tout semble fonctionner",
    message:
      "Votre connexion, le site et nos services répondent normalement. L'erreur rencontrée était probablement temporaire.",
    advice: [
      "Réessayez l'action qui a échoué.",
      "Si l'erreur revient systématiquement, signalez-la au support en précisant la page concernée.",
    ],
  };
}

/**
 * Lance les sondes en parallèle. `onProgress` est appelé à chaque sonde
 * terminée, pour que l'écran se remplisse ligne par ligne.
 */
export async function runConnectivityDiagnostics(
  onProgress?: (checks: DiagnosticCheck[]) => void,
): Promise<DiagnosticsReport> {
  const checks = initialChecks();
  const emit = () => onProgress?.(checks.map((check) => ({ ...check })));

  const update = (id: CheckId, patch: Omit<DiagnosticCheck, "id" | "label" | "description">) => {
    const index = checks.findIndex((check) => check.id === id);
    checks[index] = { ...checks[index], ...patch };
    emit();
  };

  // Pas d'émission initiale : l'appelant part déjà de `initialChecks()`.
  const [, , portalResult] = await Promise.all([
    checkInternet().then((result) => update("internet", result)),
    checkApi().then((result) => update("api", result)),
    checkPortal().then((result) => {
      update("portal", result.check);
      update("database", databaseCheckFrom(result.server));
      return result;
    }),
  ]);

  return { checks, verdict: buildVerdict(checks, portalResult.server) };
}
