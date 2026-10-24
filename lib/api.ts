"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * En ligne : NEXT_PUBLIC_API_URL (adresse de l'API sur Render, « …/api »).
 * Sur le poste : « /api », relayé par le serveur Next (voir `rewrites` dans next.config.ts).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const CLE_JETON = "dgrhas.jeton";
export const CLE_PROFIL = "dgrhas.profil";

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
  /** A un code personnel de connexion. */
  aCode?: boolean;
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

/** Profil relu sur le serveur : gardé à jour pour les autres onglets et les pages d'impression. */
export function memoriserProfil(profil: Profil) {
  try {
    localStorage.setItem(CLE_PROFIL, JSON.stringify(profil));
  } catch {
    /* stockage indisponible */
  }
}

/* ------------------------- Session expirée ------------------------- */

/**
 * Quand la session expire (ou est fermée par l'administrateur), la coquille de l'application
 * propose de se reconnecter dans une fenêtre, sans quitter la page : la saisie en cours reste.
 * Hors de la coquille (pages d'impression…), retour à la page de connexion.
 */
type GestionnaireExpiration = (message: string) => void;
let gestionnaireExpiration: GestionnaireExpiration | null = null;

export function surSessionExpiree(g: GestionnaireExpiration) {
  gestionnaireExpiration = g;
  return () => {
    if (gestionnaireExpiration === g) gestionnaireExpiration = null;
  };
}

/** Événement envoyé après une reconnexion : les données affichées sont relues. */
export const SESSION_ROUVERTE = "dgrhas:session-rouverte";

/** Événement envoyé après chaque enregistrement réussi : les compteurs du menu sont relus. */
export const TRAVAIL_MODIFIE = "dgrhas:travail-modifie";

function sessionExpiree(message: string) {
  if (gestionnaireExpiration) return gestionnaireExpiration(message);
  fermerSession();
  if (typeof window !== "undefined") window.location.href = "/connexion";
}

/** Réponse du serveur : nouveau jeton (son propre code ou mot de passe vient de changer). */
function prendreNouveauJeton(rep: Response) {
  const jeton = rep.headers.get("X-Jeton");
  if (jeton)
    try {
      localStorage.setItem(CLE_JETON, jeton);
    } catch {
      /* stockage indisponible */
    }
}

export function fermerSession() {
  try {
    localStorage.removeItem(CLE_JETON);
    localStorage.removeItem(CLE_PROFIL);
  } catch {
    /* stockage indisponible */
  }
}

/** Message affiché quand le serveur ne répond pas (réseau coupé, serveur arrêté ou en panne). */
const SERVEUR_INJOIGNABLE =
  "Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez. Si le problème persiste, contactez le support de la Direction Générale des Ressources Humaines et de l’Administration Scolaire.";

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
  return p
    .then((r) => {
      if (typeof window !== "undefined" && !chemin.startsWith("/auth/")) window.dispatchEvent(new Event(TRAVAIL_MODIFIE));
      return r;
    })
    .finally(() => ecritures.delete(p));
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
    SERVEUR_INJOIGNABLE,
    0,
  );
  let rep: Response;
  try {
    rep = await fetch(`${API_URL}${chemin}`, { ...options, headers: entetes });
  } catch {
    throw injoignable;
  }
  prendreNouveauJeton(rep);
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
    const message = Array.isArray(m) ? m.join(" ; ") : (m ?? `Erreur ${rep.status}`);
    if (rep.status === 401 && !chemin.startsWith("/auth/connexion")) sessionExpiree(message);
    throw new ErreurApi(message, rep.status);
  }
  return corps as T;
}

/** Fichier téléchargé avec la session (mêmes règles que les autres appels : 401, nouveau jeton). */
async function fichier(chemin: string, init: RequestInit = {}): Promise<Blob> {
  const { jeton } = lireSession();
  let rep: Response;
  try {
    rep = await fetch(`${API_URL}${chemin}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    });
  } catch {
    throw new ErreurApi(SERVEUR_INJOIGNABLE, 0);
  }
  prendreNouveauJeton(rep);
  if (!rep.ok) {
    let message = rep.status === 404 ? "Fichier introuvable" : `Téléchargement impossible (erreur ${rep.status})`;
    try {
      const corps = (await rep.json()) as { message?: string | string[] };
      if (corps?.message) message = Array.isArray(corps.message) ? corps.message.join(" ; ") : corps.message;
    } catch {
      /* réponse non JSON */
    }
    if (rep.status === 401) sessionExpiree(message);
    throw new ErreurApi(message, rep.status);
  }
  return rep.blob();
}

/**
 * Nom de fichier sûr pour tous les navigateurs : certains refusent les accents ou le tiret long
 * dans un téléchargement et enregistrent alors un fichier nommé « download ».
 */
export function nomDeFichier(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[’']/g, " ")
    .replace(/°/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function enregistrerSous(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomDeFichier(nom);
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
    const url = URL.createObjectURL(await fichier(c));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  /** Téléchargement authentifié d'un fichier enregistré sous `nom`. */
  async telecharger(c: string, nom: string) {
    enregistrerSous(await fichier(c), nom);
  },
  /** Fichier produit par le serveur à partir de données envoyées (POST), enregistré sous `nom`. */
  async telechargerPost(c: string, corps: FormData, nom: string) {
    enregistrerSous(await fichier(c, { method: "POST", body: corps }), nom);
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
    // Après une reconnexion (session expirée), la donnée restée en erreur est relue
    const apresReconnexion = () => setFraicheur((f) => f + 1);
    window.addEventListener("focus", relire);
    document.addEventListener("visibilitychange", relire);
    window.addEventListener(SESSION_ROUVERTE, apresReconnexion);
    return () => {
      window.removeEventListener("focus", relire);
      document.removeEventListener("visibilitychange", relire);
      window.removeEventListener(SESSION_ROUVERTE, apresReconnexion);
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
