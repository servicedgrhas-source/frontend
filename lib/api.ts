"use client";

import { useCallback, useEffect, useReducer, useState } from "react";

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
  viderMemoire();
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
  viderMemoire();
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
      // Ce qui a été lu avant l'enregistrement sera relu à son prochain affichage
      perimerMemoire();
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

/* ------------------------- Fichiers Excel envoyés une fois ------------------------- */

/** Fichiers Excel déjà reçus par le serveur (empreinte → dernier envoi) : il les garde 10 min. */
const excelEnvoyes = new Map<string, number>();
const EXCEL_GARDE_MS = 9 * 60_000;

async function empreinteDe(f: File) {
  const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return Array.from(new Uint8Array(h), (o) => o.toString(16).padStart(2, "0")).join("");
}

/**
 * Envoi d'un formulaire avec fichier. Un classeur Excel seul (« Lire le fichier », « Essai »,
 * « Importer ») ne part qu'une fois : les envois suivants ne joignent que son empreinte, et le
 * serveur reprend le fichier qu'il a gardé. S'il ne l'a plus (412), le fichier est renvoyé.
 */
async function envoyerFichier<T>(c: string, fd: FormData): Promise<T> {
  const f = fd.get("fichier");
  const seul = [...fd.keys()].length === 1;
  if (!seul || !(f instanceof File) || !/\.xlsx$/i.test(f.name) || typeof crypto === "undefined" || !crypto.subtle) return requete<T>(c, { method: "POST", body: fd });
  const empreinte = await empreinteDe(f);
  const dernier = excelEnvoyes.get(empreinte);
  if (dernier && Date.now() - dernier < EXCEL_GARDE_MS) {
    try {
      const r = await requete<T>(c, { method: "POST", headers: { "X-Fichier": empreinte } });
      excelEnvoyes.set(empreinte, Date.now());
      return r;
    } catch (e) {
      if (!(e instanceof ErreurApi && e.statut === 412)) throw e;
    }
  }
  const r = await requete<T>(c, { method: "POST", body: fd, headers: { "X-Fichier": empreinte } });
  excelEnvoyes.set(empreinte, Date.now());
  return r;
}

export const api = {
  get: <T>(c: string) => requete<T>(c),
  post: <T>(c: string, corps?: unknown) =>
    corps instanceof FormData
      ? envoyerFichier<T>(c, corps)
      : requete<T>(c, {
          method: "POST",
          body: JSON.stringify(corps ?? {}),
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

/* ------------------------- Mémoire des lectures ------------------------- */

/**
 * Données déjà lues, partagées par toutes les pages : revenir sur une page l'affiche tout de
 * suite, puis la relit en silence si elle date (« afficher, puis vérifier »). Deux composants qui
 * demandent la même chose au même moment ne font qu'un appel. Après chaque enregistrement, tout
 * est marqué à relire ; à la connexion et à la déconnexion, tout est oublié.
 */
interface Entree {
  donnees: unknown;
  /** Une réponse est déjà arrivée (les données peuvent valoir null). */
  lue: boolean;
  erreur: string | null;
  lueLe: number;
  /** Marquée à relire (enregistrement, reconnexion). */
  perimee: boolean;
  /** Numéro du dernier appel lancé : une réponse plus ancienne n'écrase pas une plus récente. */
  appel: number;
  enCours: Promise<void> | null;
}

/** En deçà, une donnée revue n'est pas relue (navigation d'une page à l'autre). */
const FRAICHEUR_MS = 15_000;
/** Nombre de lectures gardées (les plus anciennes sont oubliées d'abord). */
const MEMOIRE_MAX = 150;

const memoire = new Map<string, Entree>();
const abonnes = new Map<string, Set<() => void>>();
let appels = 0;

function prevenir(chemin: string) {
  abonnes.get(chemin)?.forEach((f) => f());
}

function garder(chemin: string, e: Entree) {
  memoire.delete(chemin);
  memoire.set(chemin, e);
  if (memoire.size > MEMOIRE_MAX) {
    // Oublie la plus ancienne qu'aucune page affichée n'utilise
    for (const k of memoire.keys())
      if (!abonnes.get(k)?.size) {
        memoire.delete(k);
        break;
      }
  }
}

/** Tout oublier (changement de compte) : aucune donnée d'un compte n'est montrée à un autre. */
export function viderMemoire() {
  memoire.clear();
}

/** Après un enregistrement : chaque donnée sera relue à son prochain affichage. */
function perimerMemoire() {
  for (const e of memoire.values()) e.perimee = true;
}

/** Lecture partagée : réutilise l'appel en cours, sauf si `forcer` (rechargement demandé). */
function lire(chemin: string, forcer = false): Promise<void> {
  const e = memoire.get(chemin);
  if (e?.enCours && !forcer) return e.enCours;
  if (!forcer && e?.lue && !e.perimee && !e.erreur && Date.now() - e.lueLe < FRAICHEUR_MS) return Promise.resolve();
  const n = ++appels;
  const base: Entree = e ?? { donnees: null, lue: false, erreur: null, lueLe: 0, perimee: false, appel: n, enCours: null };
  const p = requete<unknown>(chemin)
    .then(
      (d) => {
        const x = memoire.get(chemin) ?? base;
        if (x.appel !== n) return;
        garder(chemin, { ...x, donnees: d, lue: true, erreur: null, lueLe: Date.now(), perimee: false, enCours: null });
      },
      (err: Error) => {
        const x = memoire.get(chemin) ?? base;
        if (x.appel !== n) return;
        garder(chemin, { ...x, erreur: err.message, enCours: null });
      },
    )
    .finally(() => prevenir(chemin));
  garder(chemin, { ...base, appel: n, enCours: p });
  prevenir(chemin);
  return p;
}

/**
 * Chargement d'une ressource avec rechargement manuel. Une donnée déjà lue s'affiche tout de
 * suite ; en changeant de ressource (filtre…), les données précédentes restent affichées
 * jusqu'à l'arrivée des nouvelles.
 */
export function useApi<T>(chemin: string | null) {
  const [, rafraichir] = useReducer((x: number) => x + 1, 0);
  // Dernières données affichées : gardées à l'écran pendant qu'une autre ressource se charge
  const [precedentes, setPrecedentes] = useState<unknown>(null);

  useEffect(() => {
    if (!chemin) return;
    const liste = abonnes.get(chemin) ?? new Set<() => void>();
    liste.add(rafraichir);
    abonnes.set(chemin, liste);
    void lire(chemin);
    // Retour sur l'onglet : relu en silence s'il date, pour voir ce qui a été modifié ailleurs
    const auRetour = () => {
      if (document.visibilityState === "visible") void lire(chemin);
    };
    // Après une reconnexion (session expirée), la donnée restée en erreur est relue
    const apresReconnexion = () => void lire(chemin, true);
    window.addEventListener("focus", auRetour);
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener(SESSION_ROUVERTE, apresReconnexion);
    return () => {
      liste.delete(rafraichir);
      window.removeEventListener("focus", auRetour);
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener(SESSION_ROUVERTE, apresReconnexion);
    };
  }, [chemin]);

  const recharger = useCallback(() => {
    if (chemin) void lire(chemin, true);
  }, [chemin]);
  const setDonnees = useCallback(
    (d: T) => {
      if (!chemin) return;
      const e = memoire.get(chemin);
      garder(chemin, { ...(e ?? { lue: true, erreur: null, lueLe: Date.now(), perimee: false, appel: ++appels, enCours: null }), donnees: d, lue: true });
      prevenir(chemin);
    },
    [chemin],
  );

  const e = chemin ? memoire.get(chemin) : undefined;
  const lue = !!e?.lue;
  if (lue && precedentes !== e.donnees) setPrecedentes(e.donnees);
  return {
    donnees: (lue ? e.donnees : chemin ? precedentes : null) as T | null,
    erreur: e?.erreur ?? null,
    chargement: !!chemin && !lue && !e?.erreur,
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
