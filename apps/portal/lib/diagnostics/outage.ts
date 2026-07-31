import { useSyncExternalStore } from "react";

/**
 * Petit store global qui décide *quand* afficher l'écran de diagnostic.
 *
 * Il est alimenté par l'intercepteur axios : une erreur sans réponse HTTP
 * (`ERR_NETWORK`, timeout, serveur injoignable) est une panne potentielle.
 * On n'ouvre pas l'écran au premier hoquet — deux échecs consécutifs, ou un
 * évènement `offline` du navigateur, sont nécessaires.
 */

const FAILURE_THRESHOLD = 2;
const DISMISS_COOLDOWN_MS = 2 * 60 * 1000;

export interface OutageState {
  open: boolean;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  reason: "network" | "offline" | "manual" | null;
}

const IDLE_STATE: OutageState = {
  open: false,
  consecutiveFailures: 0,
  lastFailureAt: null,
  reason: null,
};

let state: OutageState = IDLE_STATE;
let dismissedAt: number | null = null;
let listenersAttached = false;

const listeners = new Set<() => void>();

function setState(next: OutageState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): OutageState {
  return state;
}

function getServerSnapshot(): OutageState {
  return IDLE_STATE;
}

function recentlyDismissed(): boolean {
  return dismissedAt !== null && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

/** Une requête API a échoué sans réponse du serveur. */
export function reportNetworkFailure(reason: "network" | "offline" = "network") {
  const consecutiveFailures = state.consecutiveFailures + 1;
  const shouldOpen =
    reason === "offline" || consecutiveFailures >= FAILURE_THRESHOLD;

  setState({
    open: state.open || (shouldOpen && !recentlyDismissed()),
    consecutiveFailures,
    lastFailureAt: Date.now(),
    reason: state.open ? state.reason : reason,
  });
}

/** Une requête API a abouti : la connexion est rétablie. */
export function reportNetworkSuccess() {
  if (state.consecutiveFailures === 0 && !state.open) return;
  dismissedAt = null;
  setState(IDLE_STATE);
}

/** Ouverture explicite (lien « Diagnostiquer », écran d'erreur). */
export function openOutageScreen() {
  setState({ ...state, open: true, reason: state.reason ?? "manual" });
}

/** Fermeture par l'utilisateur : on n'insiste plus pendant deux minutes. */
export function dismissOutageScreen() {
  dismissedAt = Date.now();
  setState({ ...IDLE_STATE, lastFailureAt: state.lastFailureAt });
}

/** Branche les évènements navigateur. Idempotent. */
export function attachOutageListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("offline", () => reportNetworkFailure("offline"));
  window.addEventListener("online", () => reportNetworkSuccess());
}

export function useOutageState(): OutageState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Vrai si l'erreur est une panne réseau (aucune réponse HTTP reçue). */
export function isNetworkError(error: unknown): boolean {
  const candidate = error as {
    response?: unknown;
    code?: string;
    message?: string;
    name?: string;
  };
  if (candidate?.response) return false;
  if (candidate?.code === "ERR_CANCELED" || candidate?.name === "CanceledError") {
    return false;
  }
  return (
    candidate?.code === "ERR_NETWORK" ||
    candidate?.code === "ECONNABORTED" ||
    candidate?.code === "ETIMEDOUT" ||
    candidate?.message === "Network Error" ||
    candidate?.message?.includes("Failed to fetch") === true
  );
}
