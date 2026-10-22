"use client";

import { useSyncExternalStore } from "react";

const sAbonner = () => () => {};

/**
 * Lit un paramètre de l'URL côté client (évite la frontière Suspense
 * qu'exigerait useSearchParams sur une page pré-rendue).
 * Retourne `undefined` tant que la page n'est pas hydratée.
 */
export function useParametreUrl(nom: string): string | null | undefined {
  return useSyncExternalStore(
    sAbonner,
    () => new URLSearchParams(window.location.search).get(nom),
    () => undefined,
  );
}
