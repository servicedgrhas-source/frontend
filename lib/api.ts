"use client";

import { useCallback, useEffect, useState } from "react";

/** Les appels passent par le serveur Next (voir `rewrites` dans next.config.ts). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const CLE_JETON = "dgrhas.jeton";
const CLE_PROFIL = "dgrhas.profil";

export type Role =
  | "ADMIN"
  | "AGENT"
  | "CHEF_SERVICE"
  | "DIRECTEUR"
  | "DG"
  | "DDEPPSA"
  | "CABINET"
  | "BUREAU_ETUDES"
  | "SECRETARIAT"
  | "STRUCTURE";

export interface Profil {
  id: string;
  email: string;
  nom: string;
  initiales: string | null;
  role: Role;
  departementId: number | null;
  structureId?: number | null;
}

export function lireSession(): { jeton: string | null; profil: Profil | null } {
  if (typeof window === "undefined") return { jeton: null, profil: null };
  try {
    const jeton = localStorage.getItem(CLE_JETON);
    const p = localStorage.getItem(CLE_PROFIL);
    return { jeton, profil: p ? (JSON.parse(p) as Profil) : null };
  } catch {
    return { jeton: null, profil: null };
  }
}

export function ouvrirSession(jeton: string, profil: Profil) {
  localStorage.setItem(CLE_JETON, jeton);
  localStorage.setItem(CLE_PROFIL, JSON.stringify(profil));
}

export function fermerSession() {
  try {
    localStorage.removeItem(CLE_JETON);
    localStorage.removeItem(CLE_PROFIL);
  } catch {
    /* stockage indisponible */
  }
}

export class ErreurApi extends Error {
  constructor(
    message: string,
    public statut: number,
  ) {
    super(message);
  }
}

/**
 * Écritures en cours (enregistrement d'un paramètre, d'une fiche…). Une lecture attend
 * qu'elles soient terminées : la page ouverte juste après une modification la voit toujours.
 */
const ecritures = new Set<Promise<unknown>>();

async function requete<T>(
  chemin: string,
  options: RequestInit = {},
): Promise<T> {
  const lecture = !options.method || options.method === "GET";
  if (lecture && ecritures.size) await Promise.allSettled([...ecritures]);
  if (lecture) return envoyer<T>(chemin, options);
  const p = envoyer<T>(chemin, options);
  ecritures.add(p);
  return p.finally(() => ecritures.delete(p));
}

async function envoyer<T>(
  chemin: string,
  options: RequestInit = {},
): Promise<T> {
  const { jeton } = lireSession();
  const entetes: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (jeton) entetes.Authorization = `Bearer ${jeton}`;
  if (options.body && !(options.body instanceof FormData))
    entetes["Content-Type"] = "application/json";

  const injoignable = new ErreurApi(
    "Serveur injoignable. Vérifiez que l'API (backend) est démarrée.",
    0,
  );
  let rep: Response;
  try {
    rep = await fetch(`${API_URL}${chemin}`, { ...options, headers: entetes });
  } catch {
    throw injoignable;
  }
  if (rep.status === 401 && !chemin.startsWith("/auth/connexion")) {
    fermerSession();
    if (typeof window !== "undefined") window.location.href = "/connexion";
  }
  const texte = await rep.text();
  let corps: { message?: string | string[] } | null = null;
  try {
    corps = texte ? JSON.parse(texte) : null;
  } catch {
    // Réponse non JSON : le relais Next n'a pas pu joindre le backend, ou a abandonné (trop long)
    if (rep.status === 504 || rep.status === 408)
      throw new ErreurApi(
        "Le traitement a pris trop de temps et a été interrompu. Réessayez avec moins de fichiers, ou des fichiers plus petits.",
        rep.status,
      );
    if (rep.status >= 500) throw injoignable;
    throw new ErreurApi(`Erreur ${rep.status}`, rep.status);
  }
  if (!rep.ok) {
    const m = corps?.message;
    throw new ErreurApi(
      Array.isArray(m) ? m.join(" ; ") : (m ?? `Erreur ${rep.status}`),
      rep.status,
    );
  }
  return corps as T;
}

export const api = {
  get: <T>(c: string) => requete<T>(c),
  post: <T>(c: string, corps?: unknown) =>
    requete<T>(c, {
      method: "POST",
      body: corps instanceof FormData ? corps : JSON.stringify(corps ?? {}),
    }),
  put: <T>(c: string, corps: unknown) =>
    requete<T>(c, { method: "PUT", body: JSON.stringify(corps) }),
  patch: <T>(c: string, corps: unknown) =>
    requete<T>(c, { method: "PATCH", body: JSON.stringify(corps) }),
  delete: <T>(c: string) => requete<T>(c, { method: "DELETE" }),
  /** Téléchargement authentifié d'un fichier (ouvert dans un nouvel onglet). */
  async ouvrirFichier(c: string) {
    const { jeton } = lireSession();
    const rep = await fetch(`${API_URL}${c}`, {
      headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
    });
    if (!rep.ok) throw new ErreurApi("Fichier introuvable", rep.status);
    const url = URL.createObjectURL(await rep.blob());
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  /** Téléchargement authentifié d'un fichier enregistré sous `nom`. */
  async telecharger(c: string, nom: string) {
    const { jeton } = lireSession();
    const rep = await fetch(`${API_URL}${c}`, {
      headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
    });
    if (!rep.ok) throw new ErreurApi("Téléchargement impossible", rep.status);
    const url = URL.createObjectURL(await rep.blob());
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = nom;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

/**
 * Chargement d'une ressource avec rechargement manuel.
 * Les données précédentes restent affichées pendant un rechargement.
 */
export function useApi<T>(chemin: string | null) {
  const [version, setVersion] = useState(0);
  // Retour sur l'onglet ou la fenêtre : les données sont relues en silence, pour voir
  // tout de suite ce qui a été modifié ailleurs (paramètres, autre onglet, autre agent).
  const [fraicheur, setFraicheur] = useState(0);
  useEffect(() => {
    if (!chemin) return;
    let derniere = Date.now();
    const relire = () => {
      if (document.visibilityState !== "visible" || Date.now() - derniere < 2000) return;
      derniere = Date.now();
      setFraicheur((f) => f + 1);
    };
    window.addEventListener("focus", relire);
    document.addEventListener("visibilitychange", relire);
    return () => {
      window.removeEventListener("focus", relire);
      document.removeEventListener("visibilitychange", relire);
    };
  }, [chemin]);
  const cle = chemin ? `${chemin}#${version}` : null;
  const [etat, setEtat] = useState<{ cle: string | null; donnees: T | null; erreur: string | null }>({
    cle: null,
    donnees: null,
    erreur: null,
  });

  useEffect(() => {
    if (!chemin || !cle) return;
    let actif = true;
    api
      .get<T>(chemin)
      .then((d) => actif && setEtat({ cle, donnees: d, erreur: null }))
      .catch((e: Error) => actif && setEtat((s) => ({ cle, donnees: s.donnees, erreur: e.message })));
    return () => {
      actif = false;
    };
  }, [chemin, cle, fraicheur]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);
  const setDonnees = useCallback((d: T) => setEtat((s) => ({ ...s, donnees: d })), []);
  return {
    donnees: etat.donnees,
    erreur: etat.cle === cle ? etat.erreur : null,
    chargement: !!cle && etat.cle !== cle,
    recharger,
    setDonnees,
  };
}

/** Construit une chaîne de requête en ignorant les valeurs vides. */
export function qs(params: Record<string, string | number | undefined | null | boolean>) {
  const p = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "" && v !== false,
  );
  return p.length
    ? "?" + p.map(([k, v]) => `${k}=${encodeURIComponent(String(v === true ? 1 : v))}`).join("&")
    : "";
}
