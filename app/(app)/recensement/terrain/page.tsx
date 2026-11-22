"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CloudOff, MapPinned, Download, ExternalLink, Globe2, LayoutGrid, Plus, RefreshCw, Search, Send, Smartphone, Trash2, UserPlus, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlocLocalisation, preleverPosition, type Position } from "@/components/ecoles/localisation";
import { ChargementBase, type ProgresBase } from "@/components/recensement/chargement-base";
import { CoffreTerrain, ReglagesAppareil } from "@/components/recensement/coffre";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, EnTete, Liste, Saisie, Segments, Vide, cx } from "@/components/ui";
import { api, ErreurApi } from "@/lib/api";
import { CYCLES } from "@/lib/ecoles";
import { accesDonne } from "@/lib/espaces";
import { cles, ecrire, fixerEffacement, lire, surAvantEffacement } from "@/lib/coffre-terrain";
import { chercher, preparer, type Prepare } from "@/lib/recherche-souple";
import { envoyerPositions, useSuiviPosition } from "@/lib/suivi-position";

/*
 * Recensement sur le terrain (DG, 21/11/2026). Les équipes partent école par école, avec une tablette
 * ou un téléphone. Elles téléchargent l'école (ses agents, ce qui manque), complètent sur une GRILLE
 * (une ligne par agent, comme Excel : Entrée descend, Tab avance) ou UNE PERSONNE À LA FOIS (sur un
 * téléphone), même SANS CONNEXION : tout est gardé sur l'appareil, puis envoyé au retour du réseau.
 * On part de nos bases : on ne ressaisit pas ce qui est déjà juste.
 */

interface Colonne {
  code: string;
  libelle: string;
  type: string;
  options: { code: string; libelle: string }[];
  colonnes: { code: string; libelle: string }[];
  obligatoirePour: string[];
  aide: string;
}
interface Paquet {
  telechargeLe: string;
  /** Empreinte de l'école au téléchargement (elle change dès que l'école ou un agent change). */
  empreinte?: string;
  ecole: Position & {
    id: number;
    nom: string;
    cycle: string | null;
    localite: string | null;
    departementId: number | null;
    inspection: string | null;
    posteResponsable: string;
    responsable: string | null;
    salles: number;
    classes: number;
  };
  batiments: (Position & { id: number; nom: string })[];
  colonnes: Colonne[];
  statuts: { code: string; libelle: string }[];
  /** aControler : ajouté par une équipe, effectif tout de suite, en attente de la décision du DG. */
  agents: { id: number; nomComplet: string; statut: string; matricule: string | null; donnees: Record<string, unknown>; aControler?: boolean }[];
}
interface Ligne {
  cle: string;
  agentId: number | null;
  statut: string;
  statutOrigine: string;
  valeurs: Record<string, string>;
  origine: Record<string, string>;
  /** Travaillait ailleurs dans la base : il est rattaché à cette école à l'envoi. */
  rattacher?: boolean;
  /** Ajouté par une équipe (déjà envoyé) : effectif, en attente de la décision du DG. */
  aControler?: boolean;
  /** Absent de nos bases : il part au contrôle puis à la décision du DG. */
  nouveau?: boolean;
  /** Ce que l'équipe constate (présent, absent ce jour, parti, inconnu ici). */
  presence?: Presence | "";
  /** À l'envoi : des agents de la base lui ressemblent (on ne le recrée pas sans le dire). */
  semblables?: Semblable[];
  /** « Ce n'est pas lui » : le créer malgré la ressemblance. */
  forcer?: boolean;
  erreur?: string;
}
interface Etat {
  paquet: Paquet;
  lignes: Ligne[];
  /** Positions prélevées sans connexion, envoyées avec le reste. */
  positions: { ecole?: Position; batiments: Record<string, Position> };
  /** Bâtiments ou annexes ajoutés sur place, en attente d'envoi (avec leur position si prélevée). */
  nouveauxBatiments?: { cle: string; nom: string; position?: Position }[];
}
type Presence = "PRESENT" | "ABSENT" | "PARTI" | "INCONNU" | "DOUBLON";
interface Semblable {
  id: number;
  nomComplet: string;
  ecole: string | null;
  dateNaissance: string | null;
  matricule: string | null;
}
/**
 * L'annuaire sur l'appareil : [id, nom, école, matricule, naissance, statut, genre, grade, département].
 * La liste NATIONALE très courte (DG, 22/11/2026) : retrouver sans réseau un agent venu d'ailleurs.
 * (Un compte d'école n'a que celui de son département, sans les trois dernières colonnes.)
 */
type LigneAnnuaire = [number, string, string | null, string | null, string | null, string, (string | null)?, (string | null)?, (number | null)?];
interface Annuaire {
  departementId?: number;
  le: string;
  lignes: LigneAnnuaire[];
}
const frais = (le?: string) => !!le && Date.now() - new Date(le).getTime() < 24 * 3600 * 1000;
/** L'annuaire : téléchargé une fois par jour, avec l'école ou le département. */
async function garderAnnuaire(dep: number | null) {
  if (frais(lire<Annuaire>("annuaire:national")?.le)) return;
  try {
    ecrire("annuaire:national", await api.get<Annuaire>("/recensement/terrain/annuaire-national"));
    indexAnnuaire = null;
    return;
  } catch {
    /* compte d'école : l'annuaire de son département */
  }
  if (!dep || frais(lire<Annuaire>(`annuaire:${dep}`)?.le)) return;
  try {
    ecrire(`annuaire:${dep}`, await api.get<Annuaire>(`/recensement/terrain/annuaire/${dep}`));
    indexAnnuaire = null;
  } catch {
    /* l'école reste utilisable sans l'annuaire */
  }
}
/** Index de recherche de l'annuaire, préparé une fois (70 000 noms) puis gardé en mémoire. */
let indexAnnuaire: { cle: string; le: string; lignes: { item: LigneAnnuaire; prepare: Prepare }[]; parLettre: Map<string, number[]> } | null = null;
function rechercherAnnuaire(q: string, dep: number | null, max: number): LigneAnnuaire[] {
  const cle = lire<Annuaire>("annuaire:national") ? "annuaire:national" : `annuaire:${dep}`;
  const a = lire<Annuaire>(cle);
  if (!a) return [];
  if (!indexAnnuaire || indexAnnuaire.cle !== cle || indexAnnuaire.le !== a.le) {
    const lignes = a.lignes.map((l) => ({ item: l, prepare: preparer(l[1]) }));
    const parLettre = new Map<string, number[]>();
    lignes.forEach((l, i) => {
      for (const lettre of new Set(l.prepare.sons.map((m) => m[0]))) {
        const g = parLettre.get(lettre);
        if (g) g.push(i);
        else parLettre.set(lettre, [i]);
      }
    });
    indexAnnuaire = { cle, le: a.le, lignes, parLettre };
  }
  const ix = indexAnnuaire;
  // Seulement les noms qui ont un mot commençant par la même lettre (en son) que le mot tapé le plus rare
  const sons = preparer(q).sons.filter((m) => m.length >= 2 && !/^\d+$/.test(m));
  const listes = sons.map((m) => ix.parLettre.get(m[0]) ?? []).sort((x, y) => x.length - y.length);
  const candidats = listes.length ? listes[0].map((i) => ix.lignes[i]) : ix.lignes.slice(0, 5000);
  return chercher(q, candidats, max).map((x) => x.item);
}
/** La fiche complète d'un agent si son école est sur l'appareil (téléchargée avec le département). */
function ficheLocale(id: number): Paquet["agents"][number] | null {
  for (const k of cles("ecole:")) {
    const a = lire<Etat>(k)?.paquet.agents.find((x) => x.id === id);
    if (a) return a;
  }
  // Le reste du pays (base complète, en lecture)
  for (const k of cles("base:")) {
    if (!/^base:\d+$/.test(k)) continue;
    const a = lire<PaquetBase>(k)?.agents.find((x) => x.id === id);
    if (a) return a;
  }
  return null;
}
const PRESENCES: { code: Presence; libelle: string; ton: string }[] = [
  { code: "PRESENT", libelle: "Présent", ton: "text-marque-700" },
  { code: "ABSENT", libelle: "Absent ce jour", ton: "text-or-700" },
  { code: "PARTI", libelle: "Parti de l’école", ton: "text-rouge-700" },
  { code: "INCONNU", libelle: "Inconnu ici", ton: "text-rouge-700" },
  { code: "DOUBLON", libelle: "Même personne qu’une autre ligne", ton: "text-rouge-700" },
];
interface EcoleListe {
  id: number;
  parentId?: number | null;
  type: string;
  nom: string;
  cycle: string | null;
  localite: string | null;
  departementId: number | null;
  actif: boolean;
}

// Tout ce que la mission garde est dans le coffre chiffré de l'appareil (lib/coffre-terrain)
const ecolesTelechargees = (): { id: number; nom: string; enAttente: number; le: string }[] => {
  const l: { id: number; nom: string; enAttente: number; le: string }[] = [];
  for (const k of cles("ecole:")) {
    const e = lire<Etat>(k);
    if (e) l.push({ id: e.paquet.ecole.id, nom: e.paquet.ecole.nom, enAttente: aEnvoyer(e).length, le: e.paquet.telechargeLe });
  }
  // Celles qui ont des lignes à envoyer d'abord
  return l.sort((a, b) => (b.enAttente ? 1 : 0) - (a.enAttente ? 1 : 0) || a.nom.localeCompare(b.nom, "fr"));
};

/** La mission d'un recenseur, gardée sur l'appareil. */
interface MissionT {
  recenseur: boolean;
  code?: string;
  nom?: string;
  departements?: { id: number; nom: string }[];
  fin?: string | null;
  effacerApres?: string | null;
  /** Le recensement pour lequel il travaille. */
  campagne?: string | null;
}
interface Departement {
  telechargeLe: string;
  departementId: number;
  colonnes: Colonne[];
  statuts: { code: string; libelle: string }[];
  structures: EcoleListe[];
  paquets: Omit<Paquet, "colonnes" | "statuts">[];
}
const jour = (j: string) => j.split("-").reverse().join("/");

/** Une valeur de la base en texte modifiable (dates AAAA-MM-JJ, enfants « nom | date ; … »). */
function enTexte(c: Colonne, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (c.type === "TABLEAU" && Array.isArray(v))
    return v
      .map((ligne) => (c.colonnes.length ? c.colonnes.map((x) => String((ligne as Record<string, unknown>)?.[x.code] ?? "")).join(" | ") : String(ligne)).replace(/(\s\|\s)+$/, ""))
      .join(" ; ");
  if (Array.isArray(v)) return v.join(" ; ");
  if (c.type === "DATE") return String(v).slice(0, 10);
  return String(v);
}

function nouvelleLigne(p: Paquet, a: Paquet["agents"][number], rattacher = false): Ligne {
  const valeurs = Object.fromEntries(p.colonnes.map((c) => [c.code, enTexte(c, c.code === "NOMS_PRENOMS" ? (a.donnees.NOMS_PRENOMS ?? a.nomComplet) : a.donnees[c.code])]));
  return { cle: `a${a.id}`, agentId: a.id, statut: a.statut, statutOrigine: a.statut, valeurs, origine: rattacher ? {} : { ...valeurs }, rattacher, aControler: !!a.aControler };
}
const changees = (l: Ligne) => Object.keys(l.valeurs).filter((k) => (l.valeurs[k] ?? "") !== (l.origine[k] ?? ""));
const aEnvoyer = (e: Etat) => e.lignes.filter((l) => l.nouveau || l.rattacher || !!l.presence || l.statut !== l.statutOrigine || changees(l).length);
/** Ce que le serveur reçoit pour les lignes d'une école (« Envoyer », et l'envoi avant effacement). */
const modificationsDe = (e: Etat) =>
  aEnvoyer(e).map((l) => {
    const donnees: Record<string, unknown> = {};
    for (const k of l.nouveau || l.rattacher ? Object.keys(l.valeurs).filter((k) => l.valeurs[k]) : changees(l)) donnees[k] = l.valeurs[k] ?? "";
    return {
      cle: l.cle,
      agentId: l.agentId,
      statut: l.nouveau || l.statut !== l.statutOrigine ? l.statut : undefined,
      structureId: l.nouveau || l.rattacher ? e.paquet.ecole.id : undefined,
      presence: l.presence || undefined,
      forcer: l.forcer || undefined,
      ecoleId: e.paquet.ecole.id,
      donnees,
    };
  });

/**
 * Avant que l'appareil efface tout (mission arrêtée par la DGRHAS) : on envoie ce qui attend,
 * école par école, et les positions GPS. Ce qui ne part pas (pas de réseau, ligne refusée) est perdu.
 */
async function envoyerToutAvantEffacement() {
  for (const k of cles("ecole:")) {
    const e = lire<Etat>(k);
    if (!e) continue;
    const modifications = modificationsDe(e);
    try {
      if (modifications.length) await api.post("/recensement/terrain/envoyer", { modifications });
      if (e.positions.ecole) await api.put(`/etablissements/${e.paquet.ecole.id}/localisation`, { ...e.positions.ecole, precision: e.positions.ecole.precisionGps });
      for (const [b, pos] of Object.entries(e.positions.batiments)) await api.put(`/etablissements/${e.paquet.ecole.id}/batiments/${b}/localisation`, { ...pos, precision: pos.precisionGps });
      await envoyerBatiments(e);
    } catch {
      /* pas de réseau ou refus : on efface quand même */
    }
  }
}
surAvantEffacement(envoyerToutAvantEffacement);

/* ------------------------------ La base du pays sur l'appareil ------------------------------ */
/*
 * Le recenseur travaille D'ABORD sur sa tablette (DG, 22/11/2026) : toute la base du pays y est
 * (écoles et agents avec les colonnes du formulaire), chiffrée. Les écoles de sa mission sont
 * prêtes à compléter (« ecole:<id> », avec leurs lignes) ; les autres sont en lecture (« base:<id> »),
 * pour reconnaître et rattacher sans réseau un agent venu d'ailleurs. Avec le réseau, la
 * synchronisation envoie ce qui attend, puis reprend seulement les écoles qui ont changé (empreinte).
 */
type PaquetBase = Omit<Paquet, "colonnes" | "statuts">;
interface PlanBase {
  le: string;
  mission: number[];
  departements: { id: number; nom: string; ecoles: number; agents: number; ids: number[] }[];
}
interface InfoBase {
  mission: number[];
  /** Écoles déjà téléchargées (le téléchargement reprend là où il s'est arrêté). */
  faites: number[];
  departements: number;
  ecoles: number;
  agents: number;
  complete: boolean;
  synchro: string | null;
}
export interface ResultatSynchro {
  le: string;
  envoyees: number;
  refusees: number;
  majEcoles: number;
}
const enAttenteEcole = (e: Etat) => aEnvoyer(e).length > 0 || !!e.positions.ecole || Object.keys(e.positions.batiments).length > 0 || !!e.nouveauxBatiments?.length;

/** Envoyer les bâtiments ajoutés sur place : ceux qui partent rejoignent la liste de l'école. */
async function envoyerBatiments(e: Etat): Promise<Etat> {
  let etat = e;
  for (const b of e.nouveauxBatiments ?? []) {
    const r = await api.post<{ id: number; nom: string }>(`/recensement/terrain/ecole/${e.paquet.ecole.id}/batiments`, {
      nom: b.nom,
      ...(b.position ? { latitude: b.position.latitude, longitude: b.position.longitude, precision: b.position.precisionGps } : {}),
    });
    etat = {
      ...etat,
      nouveauxBatiments: (etat.nouveauxBatiments ?? []).filter((x) => x.cle !== b.cle),
      paquet: { ...etat.paquet, batiments: [...etat.paquet.batiments, { id: r.id, nom: r.nom, latitude: b.position?.latitude ?? null, longitude: b.position?.longitude ?? null, precisionGps: b.position?.precisionGps ?? null, localiseLe: b.position?.localiseLe ?? null }] },
    };
  }
  return etat;
}
/** L'école ouverte à l'écran : la synchronisation ne la touche pas (on y travaille). */
let ecoleOuverte: number | null = null;
let synchroEnCours: Promise<ResultatSynchro | null> | null = null;
const idsBase = () => cles("base:").filter((k) => /^base:\d+$/.test(k));

/** Ranger une école reçue : prête à compléter (mission) ou en lecture ; les lignes en attente restent. */
function rangerPaquet(brut: PaquetBase, mission: boolean): boolean {
  const id = brut.ecole.id;
  if (id === ecoleOuverte) return false;
  if (!mission) {
    // (une école qui quitte la mission mais attend encore l'envoi reste prête à compléter)
    const deja = lire<Etat>(`ecole:${id}`);
    if (deja && enAttenteEcole(deja)) return false;
    if (deja) ecrire(`ecole:${id}`, null);
    ecrire(`base:${id}`, brut);
    return true;
  }
  const champs = lire<{ colonnes: Colonne[]; statuts: Paquet["statuts"] }>("base:colonnes");
  if (!champs) return false;
  const p: Paquet = { ...brut, colonnes: champs.colonnes, statuts: champs.statuts };
  const deja = lire<Etat>(`ecole:${id}`);
  ecrire(`base:${id}`, null);
  if (!deja) {
    ecrire(`ecole:${id}`, { paquet: p, lignes: p.agents.map((a) => nouvelleLigne(p, a)), positions: { batiments: {} } } satisfies Etat);
    return true;
  }
  // Les lignes en attente gardent ce qu'a saisi l'équipe ; les autres prennent la base à jour
  const attente = aEnvoyer(deja);
  const parAgent = new Map(attente.filter((l) => l.agentId !== null).map((l) => [l.agentId as number, l]));
  const presents = new Set(p.agents.map((a) => a.id));
  const lignes = [...attente.filter((l) => l.agentId === null || !presents.has(l.agentId)), ...p.agents.map((a) => parAgent.get(a.id) ?? nouvelleLigne(p, a))];
  ecrire(`ecole:${id}`, { paquet: p, lignes, positions: deja.positions, nouveauxBatiments: deja.nouveauxBatiments } satisfies Etat);
  return true;
}

/** Les départements de la mission ont changé : les écoles passent d'un rangement à l'autre. */
function appliquerMission(mission: number[]) {
  const info = lire<InfoBase>("base:info");
  if (!info || JSON.stringify([...info.mission].sort()) === JSON.stringify([...mission].sort())) return;
  for (const k of idsBase()) {
    const p = lire<PaquetBase>(k);
    if (p && mission.includes(p.ecole.departementId ?? -1)) rangerPaquet(p, true);
  }
  for (const k of cles("ecole:")) {
    const e = lire<Etat>(k);
    if (e && !mission.includes(e.paquet.ecole.departementId ?? -1)) {
      const { colonnes: _c, statuts: _s, ...brut } = e.paquet;
      void _c;
      void _s;
      rangerPaquet(brut, false);
    }
  }
  ecrire("base:info", { ...info, mission });
}

/** Les paquets de ces écoles, par lots de 100 (la barre avance, la coupure ne fait rien perdre). */
async function prendreEcoles(ids: number[], mission: number[], apresLot?: (paquets: PaquetBase[]) => void) {
  for (let i = 0; i < ids.length; i += 100) {
    const { paquets } = await api.post<{ paquets: PaquetBase[] }>("/recensement/terrain/base/ecoles", { ids: ids.slice(i, i + 100) });
    for (const p of paquets) rangerPaquet(p, mission.includes(p.ecole.departementId ?? -1));
    apresLot?.(paquets);
  }
}

/**
 * Le premier téléchargement de la base du pays (ou sa reprise) : les départements de la mission
 * d'abord (avec leurs écoles et inspections pour la recherche), puis le reste du pays.
 */
async function telechargerBase(suivre: (p: ProgresBase) => void, toutReprendre = false) {
  const plan = await api.get<PlanBase>("/recensement/terrain/base/plan");
  const avant = lire<InfoBase>("base:info");
  const faites = new Set(toutReprendre ? [] : (avant?.faites ?? []));
  const total = plan.departements.reduce((n, d) => n + d.agents, 0);
  let fait = plan.departements.reduce((n, d) => n + (d.ids.length ? Math.round((d.agents * d.ids.filter((x) => faites.has(x)).length) / d.ids.length) : 0), 0);
  const info: InfoBase = { mission: plan.mission, faites: [...faites], departements: plan.departements.length, ecoles: 0, agents: total, complete: false, synchro: avant?.synchro ?? null };
  ecrire("base:info", info);
  for (const [rang, d] of plan.departements.entries()) {
    const mission = plan.mission.includes(d.id);
    const reste = d.ids.filter((x) => !faites.has(x));
    if (!reste.length) continue;
    suivre({ fait, total, departement: d.nom, rang: rang + 1, nombre: plan.departements.length, etape: `${d.nom}${mission ? " (votre mission)" : ""} : ${d.ids.length - reste.length} école(s) sur ${d.ids.length}` });
    if (mission) {
      // Les colonnes du formulaire, les écoles et inspections du département (recherche d'une école)
      const r = await api.get<Departement>(`/recensement/terrain/departement/${d.id}`);
      ecrire("base:colonnes", { colonnes: r.colonnes, statuts: r.statuts });
      ecrire("ecoles", [...(lire<EcoleListe[]>("ecoles") ?? []).filter((e) => e.departementId !== d.id), ...r.structures]);
      for (const p of r.paquets) rangerPaquet(p, true);
      ecrire(`departement:${d.id}`, { le: r.telechargeLe, ecoles: r.paquets.length, agents: r.paquets.reduce((n, p) => n + p.agents.length, 0), gardees: 0 });
      fait += r.paquets.filter((p) => !faites.has(p.ecole.id)).reduce((n, p) => n + p.agents.length, 0);
      d.ids.forEach((x) => faites.add(x));
    } else {
      // Les colonnes sont nécessaires avant tout (une mission sans département ? on les prend ici)
      if (!lire("base:colonnes")) {
        const c = await api.get<{ colonnes: Colonne[]; statuts: Paquet["statuts"] }>("/recensement/terrain/colonnes");
        ecrire("base:colonnes", { colonnes: c.colonnes, statuts: c.statuts });
      }
      await prendreEcoles(reste, plan.mission, (paquets) => {
        paquets.forEach((p) => faites.add(p.ecole.id));
        fait += paquets.reduce((n, p) => n + p.agents.length, 0);
        suivre({ fait, total, departement: d.nom, rang: rang + 1, nombre: plan.departements.length, etape: `${d.nom} : ${d.ids.filter((x) => faites.has(x)).length} école(s) sur ${d.ids.length}` });
        ecrire("base:info", { ...info, faites: [...faites] });
      });
    }
    ecrire("base:info", { ...info, faites: [...faites] });
  }
  suivre({ fait: total, total, departement: "", rang: plan.departements.length, nombre: plan.departements.length, etape: "Liste nationale (recherche rapide d’un agent)…" });
  await garderAnnuaire(null);
  const ecoles = cles("ecole:").length + idsBase().length;
  ecrire("base:info", { ...info, faites: [...faites], ecoles, complete: true, synchro: plan.le });
}

/** Envoyer ce qui attend dans une école (hors de l'écran) : les lignes envoyées repartent de la base. */
async function envoyerEtat(e: Etat): Promise<{ etat: Etat; faites: number; refusees: number }> {
  let faites = 0;
  let refusees = 0;
  let etat = e;
  const modifications = modificationsDe(e);
  if (modifications.length) {
    const { resultats } = await api.post<{ resultats: { cle: string; ok: boolean; id?: number; erreur?: string; semblables?: Semblable[] }[] }>("/recensement/terrain/envoyer", { modifications });
    const parCle = new Map(resultats.map((r) => [r.cle, r]));
    etat = {
      ...etat,
      lignes: etat.lignes.map((l) => {
        const r = parCle.get(l.cle);
        if (!r) return l;
        if (!r.ok) {
          refusees++;
          return { ...l, erreur: r.erreur, semblables: r.semblables };
        }
        faites++;
        return { ...l, agentId: r.id ?? l.agentId, cle: r.id ? `a${r.id}` : l.cle, origine: { ...l.valeurs }, statutOrigine: l.statut, aControler: l.nouveau || l.aControler, nouveau: false, rattacher: false, presence: "", erreur: undefined, semblables: undefined, forcer: false };
      }),
    };
  }
  const id = e.paquet.ecole.id;
  if (e.positions.ecole) await api.put(`/etablissements/${id}/localisation`, { ...e.positions.ecole, precision: e.positions.ecole.precisionGps });
  for (const [b, pos] of Object.entries(e.positions.batiments)) await api.put(`/etablissements/${id}/batiments/${b}/localisation`, { ...pos, precision: pos.precisionGps });
  if (e.positions.ecole || Object.keys(e.positions.batiments).length) etat = { ...etat, positions: { batiments: {} } };
  etat = await envoyerBatiments(etat);
  return { etat, faites, refusees };
}

/**
 * Synchroniser (réseau présent) : 1. envoyer ce qui attend ; 2. reprendre les écoles qui ont changé
 * (y compris par les envois des autres recenseurs) ; 3. retirer celles qui n'existent plus.
 */
function synchroniserBase(): Promise<ResultatSynchro | null> {
  synchroEnCours ??= (async () => {
    const info = lire<InfoBase>("base:info");
    if (!info?.complete) return null;
    // Les positions relevées sans réseau partent d'abord (suivi depuis Brazzaville)
    await envoyerPositions().catch(() => undefined);
    let envoyees = 0;
    let refusees = 0;
    for (const k of cles("ecole:")) {
      const e = lire<Etat>(k);
      if (!e || e.paquet.ecole.id === ecoleOuverte || !enAttenteEcole(e)) continue;
      const r = await envoyerEtat(e);
      if (e.paquet.ecole.id !== ecoleOuverte) ecrire(k, r.etat);
      envoyees += r.faites;
      refusees += r.refusees;
    }
    const srv = await api.get<{ le: string; ecoles: Record<string, string> }>("/recensement/terrain/base/empreintes");
    const locales = new Map<number, string>();
    for (const k of cles("ecole:")) {
      const e = lire<Etat>(k);
      if (e) locales.set(e.paquet.ecole.id, e.paquet.empreinte ?? "");
    }
    for (const k of idsBase()) {
      const p = lire<PaquetBase>(k);
      if (p) locales.set(p.ecole.id, p.empreinte ?? "");
    }
    const changees = Object.entries(srv.ecoles)
      .filter(([id, e]) => locales.get(Number(id)) !== e)
      .map(([id]) => Number(id))
      .filter((id) => id !== ecoleOuverte);
    await prendreEcoles(changees, info.mission);
    // Écoles fermées ou retirées de la base : retirées de l'appareil (sauf si des lignes attendent)
    for (const id of locales.keys()) {
      if (id in srv.ecoles || id === ecoleOuverte) continue;
      ecrire(`base:${id}`, null);
      const e = lire<Etat>(`ecole:${id}`);
      if (e && !enAttenteEcole(e)) ecrire(`ecole:${id}`, null);
    }
    const res = { le: srv.le, envoyees, refusees, majEcoles: changees.length };
    ecrire("base:info", { ...info, synchro: srv.le, ecoles: Object.keys(srv.ecoles).length });
    ecrire("base:derniere", res);
    return res;
  })().finally(() => {
    synchroEnCours = null;
  });
  return synchroEnCours;
}
/** Événement : une synchronisation vient de finir (la liste des écoles se relit). */
const SYNCHRO_FAITE = "dgrhas:terrain-synchro";
/** Événement : synchroniser dès que possible (une école vient d'être quittée). */
const SYNCHRO_DEMANDEE = "dgrhas:terrain-synchro-demandee";
/** Les noms écrits plusieurs fois dans la liste de l'école (souvent un doublon de la base). */
const nomCle = (n: string | undefined) => (n ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
function homonymes(lignes: Ligne[]) {
  const n = new Map<string, number>();
  for (const l of lignes) {
    const k = nomCle(l.valeurs.NOMS_PRENOMS);
    if (k.length >= 6) n.set(k, (n.get(k) ?? 0) + 1);
  }
  return new Set([...n].filter(([, x]) => x > 1).map(([k]) => k));
}
const MARQUE_HOMONYME = "Ce nom est écrit plusieurs fois dans cette école : vérifiez la date de naissance et le matricule. Si c’est la même personne, choisissez « Même personne qu’une autre ligne » pour l’une des deux.";
const obligatoire = (c: Colonne, statut: string) => !c.obligatoirePour.length || c.obligatoirePour.includes(statut);

export default function Page() {
  const { profil } = useSession();
  useServiceHorsLigne();
  const autorise = ["ADMIN", "INFORMATIQUE", "AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "DG", "DDEPPSA", "STRUCTURE", "RECENSEUR"].includes(profil.role) || accesDonne(profil);
  if (!autorise) return <Alerte>Accès réservé aux équipes du recensement.</Alerte>;
  // Les données de l'appareil sont chiffrées : le code (ou l'empreinte) d'abord
  return (
    <CoffreTerrain utilisateur={profil.id} identifiant={profil.role === "RECENSEUR" ? profil.email.toUpperCase() : profil.email}>
      <Contenu recenseur={profil.role === "RECENSEUR"} />
    </CoffreTerrain>
  );
}

function Contenu({ recenseur }: { recenseur: boolean }) {
  const [enLigne, setEnLigne] = useState(true);
  // Recenseur : sa position est relevée tant que le formulaire est ouvert (suivi depuis Brazzaville)
  useSuiviPosition(recenseur);
  // Après le téléchargement du département, la liste des écoles se relit
  const [version, setVersion] = useState(0);
  // L'école ouverte reste ouverte après un rechargement ou un changement d'écran (téléphone tourné)
  const [ouverte, setOuverteBrut] = useState<number | null>(() => lire<number>("ouverte"));
  const setOuverte = (id: number | null) => {
    ecrire("ouverte", id);
    setOuverteBrut(id);
  };
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  // Recenseur : la tablette se synchronise seule (toutes les 5 minutes, au retour du réseau, en
  // quittant une école), même pendant le travail dans une école
  useEffect(() => {
    if (!recenseur || !enLigne) return;
    const lancer = () => {
      if (!lire<InfoBase>("base:info")?.complete) return;
      void synchroniserBase()
        .then((r) => r && window.dispatchEvent(new CustomEvent(SYNCHRO_FAITE, { detail: r })))
        .catch(() => undefined);
    };
    const t = setInterval(lancer, 5 * 60_000);
    // Le réseau revient : on synchronise tout de suite
    const retour = setTimeout(lancer, 2000);
    window.addEventListener(SYNCHRO_DEMANDEE, lancer);
    return () => {
      clearInterval(t);
      clearTimeout(retour);
      window.removeEventListener(SYNCHRO_DEMANDEE, lancer);
    };
  }, [recenseur, enLigne]);
  return ouverte ? (
    <TravailEcole id={ouverte} enLigne={enLigne} retour={() => setOuverte(null)} />
  ) : (
    <ChoixEcole key={version} enLigne={enLigne} ouvrir={setOuverte} recenseur={recenseur} mission={recenseur ? <Mission enLigne={enLigne} apres={() => setVersion((v) => v + 1)} /> : null} />
  );
}

/* ------------------------------ La mission du recenseur ------------------------------ */

/**
 * Le recenseur part pour un ou plusieurs départements (DG, 22/11/2026) : à la première connexion,
 * l'appareil prend tout le département (écoles et agents) d'un coup, puis la liste nationale.
 */
function Mission({ enLigne, apres }: { enLigne: boolean; apres: () => void }) {
  const [m, setM] = useState<MissionT | null>(() => lire<MissionT>("mission"));
  const [progres, setProgres] = useState<ProgresBase | null>(null);
  const [synchro, setSynchro] = useState<ResultatSynchro | null>(() => lire<ResultatSynchro>("base:derniere"));
  const [enSynchro, setEnSynchro] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [, relire] = useState(0);
  const info = lire<InfoBase>("base:info");

  const charger = useCallback(
    async (toutReprendre: boolean) => {
      setErreur(null);
      try {
        await telechargerBase(setProgres, toutReprendre);
      } catch (e) {
        setErreur(`${(e as Error).message} — le téléchargement reprendra là où il s’est arrêté (bouton ci-dessous, ou à la prochaine connexion).`);
      } finally {
        setProgres(null);
        apres();
      }
    },
    [apres],
  );

  const synchroniser = useCallback(async () => {
    setEnSynchro(true);
    setErreur(null);
    try {
      const r = await synchroniserBase();
      if (r) window.dispatchEvent(new CustomEvent(SYNCHRO_FAITE, { detail: r }));
    } catch (e) {
      setErreur(`Synchronisation : ${(e as Error).message}. Tout reste sur l’appareil ; elle se refera seule.`);
    } finally {
      setEnSynchro(false);
    }
  }, []);

  // La mission (départements, fin) ; au premier usage, la base du pays ; sinon une synchronisation
  useEffect(() => {
    if (!enLigne) return;
    let fini = false;
    api
      .get<MissionT>("/recensement/terrain/mission")
      .then(async (x) => {
        if (!x.recenseur || fini) return;
        ecrire("mission", x);
        setM(x);
        await fixerEffacement(x.effacerApres ?? null);
        appliquerMission((x.departements ?? []).map((d) => d.id));
        if (!lire<InfoBase>("base:info")?.complete) await charger(false);
        else await synchroniser();
      })
      .catch(() => undefined);
    return () => {
      fini = true;
    };
  }, [enLigne, charger, synchroniser]);

  // Une synchronisation faite ailleurs (automatique) : la carte se met à jour
  useEffect(() => {
    const f = (e: Event) => {
      setSynchro((e as CustomEvent<ResultatSynchro>).detail);
      relire((n) => n + 1);
    };
    window.addEventListener(SYNCHRO_FAITE, f);
    return () => window.removeEventListener(SYNCHRO_FAITE, f);
  }, []);

  if (!m?.recenseur) return enLigne ? <p className="text-[13px] text-zinc-500">Lecture de votre mission…</p> : <Alerte ton="jaune">Connectez-vous une première fois avec le réseau pour recevoir votre mission.</Alerte>;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const enAttente = ecolesTelechargees().reduce((n, e) => n + e.enAttente, 0);
  const heure = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ");
  return (
    <Carte titre={`Ma mission : ${m.code}`}>
      {progres && <ChargementBase p={progres} />}
      <div className="space-y-2.5 text-[13px]">
        <div>
          <strong>{m.nom}</strong> · {(m.departements ?? []).map((d) => d.nom).join(", ")}
          {m.fin ? ` · jusqu’au ${jour(m.fin)}` : ""}
          {m.campagne && <div className="text-zinc-500">Pour le recensement : {m.campagne}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {info?.complete ? (
            <>
              <Badge ton="vert">
                <Globe2 className="mr-1 inline size-3" />
                Base du pays sur l’appareil
              </Badge>
              <span className="text-zinc-500">
                {new Intl.NumberFormat("fr-FR").format(info.ecoles)} écoles, {new Intl.NumberFormat("fr-FR").format(info.agents)} agents · {cles("ecole:").length} école(s) de votre mission à compléter
              </span>
            </>
          ) : (
            <Badge ton="jaune">Base du pays pas encore complète</Badge>
          )}
        </div>
        {info?.complete && (
          <div className="flex flex-wrap items-center gap-2">
            {enSynchro ? (
              <span className="text-marque-700">
                <RefreshCw className="mr-1 inline size-4 animate-spin" />
                Synchronisation…
              </span>
            ) : (
              <span className="text-zinc-600">
                {info.synchro ? `Synchronisée le ${heure(info.synchro)}` : "Pas encore synchronisée"}
                {synchro && (synchro.envoyees || synchro.majEcoles) ? ` · ${synchro.envoyees} ligne(s) envoyée(s), ${synchro.majEcoles} école(s) mise(s) à jour` : ""}
              </span>
            )}
            {!!synchro?.refusees && <Badge ton="rouge">{synchro.refusees} ligne(s) refusée(s) : à corriger (en rouge dans l’école)</Badge>}
          </div>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
        <p className="text-[12px] text-zinc-500">
          <MapPinned className="mr-1 inline size-3.5" />
          Pendant la mission, votre position est relevée toutes les 5 minutes tant que cette page est ouverte, pour le suivi de la DGRHAS. Laissez la localisation activée.
        </p>
        {m.effacerApres && (
          <p className={cx(aujourdhui >= (m.fin ?? "") ? "font-medium text-rouge-700" : "text-zinc-500")}>
            Les données de cet appareil s’effaceront d’elles-mêmes le {jour(m.effacerApres)} au soir.
            {enAttente ? ` ${enAttente} ligne(s) restent à envoyer : envoyez-les avant.` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {info?.complete ? (
            <Bouton disabled={!enLigne || enSynchro} onClick={() => void synchroniser()} title="Envoyer ce qui attend et reprendre ce qui a changé (cela se fait aussi tout seul toutes les 5 minutes)">
              <RefreshCw /> Synchroniser maintenant
            </Bouton>
          ) : (
            <Bouton variante="principal" disabled={!enLigne || !!progres} onClick={() => void charger(false)}>
              <Globe2 /> {info?.faites.length ? "Reprendre le téléchargement" : "Télécharger la base du pays"}
            </Bouton>
          )}
          {info?.complete && (
            <Bouton
              variante="discret"
              disabled={!enLigne || !!progres || enSynchro}
              onClick={() => confirm("Tout retélécharger ? Les lignes qui attendent l’envoi sont gardées.") && void charger(true)}
              title="Si la base de l’appareil semble fausse : tout reprendre (les lignes en attente ne sont pas touchées)"
            >
              Tout retélécharger
            </Bouton>
          )}
        </div>
      </div>
    </Carte>
  );
}

function Reseau({ enLigne }: { enLigne: boolean }) {
  return enLigne ? (
    <Badge ton="vert">
      <Wifi className="mr-1 inline size-3" />
      Connecté
    </Badge>
  ) : (
    <Badge ton="jaune">
      <CloudOff className="mr-1 inline size-3" />
      Sans connexion : tout est gardé sur l’appareil
    </Badge>
  );
}

/* ------------------------------ 1. Choisir l'école ------------------------------ */

function ChoixEcole({ enLigne, ouvrir, recenseur, mission }: { enLigne: boolean; ouvrir: (id: number) => void; recenseur: boolean; mission: React.ReactNode }) {
  const [ecoles, setEcoles] = useState<EcoleListe[]>(() => lire<EcoleListe[]>("ecoles") ?? []);
  const [q, setQ] = useState("");
  const [cycle, setCycle] = useState("");
  const [locales, setLocales] = useState(ecolesTelechargees);
  // Après une synchronisation (écoles mises à jour, lignes envoyées) : la liste se relit
  useEffect(() => {
    const f = () => setLocales(ecolesTelechargees());
    window.addEventListener(SYNCHRO_FAITE, f);
    return () => window.removeEventListener(SYNCHRO_FAITE, f);
  }, []);
  const [charge, setCharge] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    // (un recenseur reçoit les écoles de sa mission avec son département)
    if (!enLigne || recenseur) return;
    api
      .get<EcoleListe[]>("/structures")
      .then((l) => {
        // Les écoles et les inspections (pour tout télécharger d'une zone), gardées sur l'appareil
        const e = l.filter((s) => s.actif && (s.type === "ETABLISSEMENT" || s.type === "INSPECTION"));
        setEcoles(e);
        ecrire("ecoles", e.map(({ id, parentId, type, nom, cycle, localite, departementId, actif }) => ({ id, parentId, type, nom, cycle, localite, departementId, actif })));
      })
      .catch(() => undefined);
  }, [enLigne, recenseur]);
  const [toutes, setToutes] = useState(false);
  // Recherche intelligente : on tape comme on entend (fautes, accents, ordre, début des mots)
  const index = useMemo(() => ecoles.map((e) => ({ item: e, prepare: preparer(`${e.nom} ${e.localite ?? ""}`, true) as Prepare })), [ecoles]);
  const resultats = q.trim().length >= 2 ? chercher(q, index.filter((x) => !cycle || x.item.type === "INSPECTION" || x.item.cycle === cycle), 40, true) : [];
  const trouvees = resultats.filter((x) => x.item.type === "ETABLISSEMENT").slice(0, 25).map((x) => x.item);
  const inspections = resultats.filter((x) => x.item.type === "INSPECTION").slice(0, 3).map((x) => x.item);
  const ecolesDe = (i: number) => ecoles.filter((e) => e.type === "ETABLISSEMENT" && e.parentId === i);
  const [zone, setZone] = useState<{ fait: number; total: number } | null>(null);
  // Toute une inspection d'un coup (DG : « on travaille par zone »)
  const telechargerZone = async (i: EcoleListe) => {
    const liste = ecolesDe(i.id).filter((e) => !cycle || e.cycle === cycle);
    if (!liste.length) return setErreur("Aucune école sous cette inspection.");
    if (!confirm(`Télécharger les ${liste.length} école(s) de « ${i.nom} » sur cet appareil ?`)) return;
    setErreur(null);
    let fait = 0;
    const ratees: string[] = [];
    for (const e of liste) {
      setZone({ fait, total: liste.length });
      const deja = lire<Etat>(`ecole:${e.id}`);
      if (deja && aEnvoyer(deja).length) {
        fait++;
        continue;
      }
      try {
        const p = await api.get<Paquet>(`/recensement/terrain/ecole/${e.id}`);
        ecrire(`ecole:${e.id}`, { paquet: p, lignes: p.agents.map((a) => nouvelleLigne(p, a)), positions: { batiments: {} } } satisfies Etat);
        await garderAnnuaire(p.ecole.departementId);
      } catch {
        ratees.push(e.nom);
      }
      fait++;
    }
    setZone(null);
    setLocales(ecolesTelechargees());
    if (ratees.length) setErreur(`${ratees.length} école(s) non téléchargée(s) : ${ratees.slice(0, 3).join(", ")}${ratees.length > 3 ? "…" : ""}. Réessayez avec une meilleure connexion.`);
  };

  const telecharger = async (id: number) => {
    const deja = lire<Etat>(`ecole:${id}`);
    if (deja && !enLigne) return ouvrir(id);
    if (deja && aEnvoyer(deja).length) return ouvrir(id);
    if (!enLigne) return setErreur("Sans connexion : seules les écoles déjà téléchargées s’ouvrent.");
    setCharge(id);
    setErreur(null);
    try {
      const p = await api.get<Paquet>(`/recensement/terrain/ecole/${id}`);
      ecrire(`ecole:${id}`, { paquet: p, lignes: p.agents.map((a) => nouvelleLigne(p, a)), positions: { batiments: {} } } satisfies Etat);
      await garderAnnuaire(p.ecole.departementId);
      setLocales(ecolesTelechargees());
      ouvrir(id);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setCharge(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <EnTete
        titre="Recensement sur le terrain"
        sousTitre="École par école, ou toute une inspection : on télécharge (avec la connexion), on complète sur place, même sans réseau, puis on envoie. Conseil : « Ajouter à l’écran d’accueil » (menu du navigateur) pour l’ouvrir comme une application, même hors réseau."
        actions={<Reseau enLigne={enLigne} />}
      />
      {erreur && <Alerte>{erreur}</Alerte>}
      {mission}
      <Carte titre="1. Choisir l’école">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-zinc-400" />
            <Saisie autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapez quelques lettres : « vindou », « moussa eta »…" className="h-12 w-full pl-11 text-[16px]" aria-label="Chercher une école" />
          </div>
          <Segments valeur={cycle} changer={setCycle} options={[{ valeur: "", libelle: "Tous les cycles" }, ...Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle }))]} />
          {!ecoles.length && <p className="text-[13px] text-zinc-500">{enLigne ? "Chargement des écoles…" : "La liste des écoles n’a pas encore été chargée sur cet appareil : connectez-vous une première fois."}</p>}
          {q.trim().length >= 2 && !trouvees.length && !inspections.length && <Vide>Aucune école ne ressemble à « {q.trim()} ». Essayez un autre mot du nom ou le village.</Vide>}
          {!recenseur && inspections.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-marque-200 bg-marque-50/60 px-3 py-2.5">
              <MapPinned className="size-5 text-marque-600" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{i.nom}</div>
                <div className="text-[12px] text-zinc-500">{ecolesDe(i.id).filter((e) => !cycle || e.cycle === cycle).length} école(s) dans cette inspection</div>
              </div>
              <Bouton disabled={!enLigne || !!zone} onClick={() => void telechargerZone(i)}>
                <Download /> Tout télécharger
              </Bouton>
            </div>
          ))}
          {zone && (
            <p className="text-[13px] text-marque-700">
              Téléchargement : {zone.fait} / {zone.total} école(s)…
            </p>
          )}
          <ul className="divide-y divide-zinc-100">
            {trouvees.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => void telecharger(e.id)} className="flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium">{e.nom}</div>
                    <div className="text-[12px] text-zinc-500">
                      {[e.cycle ? CYCLES[e.cycle] : null, e.localite].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {charge === e.id ? <RefreshCw className="size-5 animate-spin text-marque-600" /> : <Download className="size-5 text-zinc-400" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Carte>
      {!recenseur && <Signalements enLigne={enLigne} />}
      <Carte titre="Écoles sur cet appareil">
        {!locales.length ? (
          <p className="text-[13px] text-zinc-500">Aucune pour l’instant. Avant de partir en zone sans réseau, téléchargez les écoles de votre itinéraire.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {(toutes ? locales : locales.slice(0, 15)).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => ouvrir(e.id)}>
                  <div className="text-[15px] font-medium">{e.nom}</div>
                  <div className="text-[12px] text-zinc-500">Téléchargée le {new Date(e.le).toLocaleDateString("fr-FR")}</div>
                </button>
                {e.enAttente ? <Badge ton="jaune">{e.enAttente} à envoyer</Badge> : <Badge ton="vert">à jour</Badge>}
                <button
                  type="button"
                  title="Retirer de l’appareil"
                  className="cursor-pointer p-2 text-zinc-400 hover:text-rouge-600"
                  onClick={() => {
                    if (e.enAttente && !confirm(`${e.enAttente} ligne(s) de « ${e.nom} » ne sont pas envoyées. Les retirer quand même ?`)) return;
                    ecrire(`ecole:${e.id}`, null);
                    setLocales(ecolesTelechargees());
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
            {locales.length > 15 && !toutes && (
              <li className="py-2">
                <button type="button" className="cursor-pointer text-[13px] text-marque-700 hover:underline" onClick={() => setToutes(true)}>
                  Voir les {locales.length} écoles (ou cherchez-en une ci-dessus)
                </button>
              </li>
            )}
          </ul>
        )}
      </Carte>
      <ReglagesAppareil />
    </div>
  );
}

/* ------------------------------ 2. Travailler dans l'école ------------------------------ */

/** Un bâtiment ou une annexe découvert sur place : son nom, et sa position prélevée ici (facultatif). */
function AjoutBatiment({ ajouter }: { ajouter: (b: { cle: string; nom: string; position?: Position }) => void }) {
  const [nom, setNom] = useState("");
  const [encours, setEncours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const valider = async (avecPosition: boolean) => {
    if (!nom.trim()) return setErreur("Donnez un nom au bâtiment (ex. Bâtiment A, Annexe de Kimba).");
    setErreur(null);
    let position: Position | undefined;
    if (avecPosition) {
      setEncours(true);
      try {
        const g = await preleverPosition();
        position = { latitude: g.latitude, longitude: g.longitude, precisionGps: g.precision, localiseLe: new Date().toISOString() };
      } catch (e) {
        setEncours(false);
        return setErreur((e as Error).message);
      }
      setEncours(false);
    }
    ajouter({ cle: `b${Date.now()}`, nom: nom.trim(), position });
    setNom("");
  };
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Saisie value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nouveau bâtiment : Bâtiment B, Annexe de…" className="h-10 min-w-0 flex-1" aria-label="Nom du nouveau bâtiment" />
        <Bouton variante="principal" chargement={encours} disabled={!nom.trim()} onClick={() => void valider(true)} title="Vous êtes devant ce bâtiment : sa position est prise ici">
          <MapPinned /> Ajouter, avec la position d’ici
        </Bouton>
        <Bouton disabled={!nom.trim() || encours} onClick={() => void valider(false)}>
          <Plus /> Ajouter sans position
        </Bouton>
      </div>
      {erreur && <p className="text-[12px] text-rouge-700">{erreur}</p>}
    </div>
  );
}

function TravailEcole({ id, enLigne, retour }: { id: number; enLigne: boolean; retour: () => void }) {
  const { profil } = useSession();
  const [etat, setEtatBrut] = useState<Etat | null>(() => lire<Etat>(`ecole:${id}`));
  // L'école à l'écran n'est pas touchée par la synchronisation ; en la quittant, on synchronise
  useEffect(() => {
    ecoleOuverte = id;
    return () => {
      ecoleOuverte = null;
      window.dispatchEvent(new Event(SYNCHRO_DEMANDEE));
    };
  }, [id]);
  const setEtat = useCallback(
    (f: (e: Etat) => Etat) =>
      setEtatBrut((e) => {
        if (!e) return e;
        const n = f(e);
        ecrire(`ecole:${id}`, n);
        return n;
      }),
    [id],
  );
  const [onglet, setOnglet] = useState<"personnel" | "ecole">("personnel");
  const [vue, setVue] = useState<"grille" | "fiche">(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "fiche" : "grille"));
  const [manques, setManques] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  // « Envoyé » s'efface seul (le bandeau reste court) ; un refus ou une erreur reste jusqu'au prochain envoi
  useEffect(() => {
    if (message?.ton !== "vert") return;
    const t = setTimeout(() => setMessage(null), 10_000);
    return () => clearTimeout(t);
  }, [message]);

  if (!etat) return <Alerte>Cette école n’est plus sur l’appareil.</Alerte>;
  const p = etat.paquet;
  const enAttente = aEnvoyer(etat);
  const positionsEnAttente = (etat.positions.ecole ? 1 : 0) + Object.keys(etat.positions.batiments).length + (etat.nouveauxBatiments?.length ?? 0);

  const envoyer = async () => {
    setEnvoi(true);
    setMessage(null);
    try {
      let faites = 0;
      let erreurs: string[] = [];
      if (enAttente.length) {
        const modifications = modificationsDe(etat);
        // Ce qui part : une saisie faite PENDANT l'envoi ne doit pas passer pour envoyée
        const parties = new Map(enAttente.map((l) => [l.cle, { valeurs: { ...l.valeurs }, statut: l.statut, presence: l.presence ?? "", nom: l.valeurs.NOMS_PRENOMS }]));
        const { resultats } = await api.post<{ resultats: { cle: string; ok: boolean; id?: number; erreur?: string; semblables?: Semblable[] }[] }>("/recensement/terrain/envoyer", { modifications });
        const parCle = new Map(resultats.map((r) => [r.cle, r]));
        // (compté ici, sur la réponse : le message dit ce qui est vraiment parti)
        faites = resultats.filter((r) => r.ok).length;
        erreurs = resultats.filter((r) => !r.ok).map((r) => `${parties.get(r.cle)?.nom || "Ligne"} : ${r.erreur}`);
        setEtat((e) => ({
          ...e,
          lignes: e.lignes.map((l) => {
            const r = parCle.get(l.cle);
            const s = parties.get(l.cle);
            if (!r || !s) return l;
            if (!r.ok) return { ...l, erreur: r.erreur, semblables: r.semblables };
            return { ...l, agentId: r.id ?? l.agentId, cle: r.id ? `a${r.id}` : l.cle, origine: s.valeurs, statutOrigine: s.statut, aControler: l.nouveau || l.aControler, nouveau: false, rattacher: false, presence: (l.presence ?? "") === s.presence ? "" : l.presence, erreur: undefined, semblables: undefined, forcer: false };
          }),
        }));
      }
      // Les positions prélevées sans connexion
      if (etat.positions.ecole) await api.put(`/etablissements/${p.ecole.id}/localisation`, { ...etat.positions.ecole, precision: etat.positions.ecole.precisionGps });
      for (const [b, pos] of Object.entries(etat.positions.batiments)) await api.put(`/etablissements/${p.ecole.id}/batiments/${b}/localisation`, { ...pos, precision: pos.precisionGps });
      if (etat.positions.ecole || Object.keys(etat.positions.batiments).length) setEtat((e) => ({ ...e, positions: { batiments: {} } }));
      if (etat.nouveauxBatiments?.length) {
        const apres = await envoyerBatiments(etat);
        setEtat((e) => ({ ...e, nouveauxBatiments: apres.nouveauxBatiments, paquet: { ...e.paquet, batiments: apres.paquet.batiments } }));
      }
      setMessage(
        erreurs.length
          ? { ton: "jaune", texte: `${faites} ligne(s) envoyée(s). ${erreurs.length} à corriger (en rouge) : ${erreurs.slice(0, 3).join(" ; ")}${erreurs.length > 3 ? "…" : ""}` }
          : { ton: "vert", texte: `Envoyé : ${faites} agent(s)${positionsEnAttente ? ` et ${positionsEnAttente} position(s) ou bâtiment(s)` : ""}. Les modifications partent au contrôle, comme au recensement ; les agents nouveaux, au contrôle puis au DG.` },
      );
    } catch (e) {
      setMessage({ ton: "rouge", texte: `${(e as Error).message} — rien n’est perdu : tout reste sur l’appareil, réessayez plus tard.` });
    } finally {
      setEnvoi(false);
    }
  };

  const recharger = async () => {
    if (enAttente.length && !confirm("Des lignes ne sont pas envoyées : elles seront perdues si vous rechargez l’école. Continuer ?")) return;
    try {
      const n = await api.get<Paquet>(`/recensement/terrain/ecole/${id}`);
      setEtatBrut(() => {
        const e: Etat = { paquet: n, lignes: n.agents.map((a) => nouvelleLigne(n, a)), positions: { batiments: {} } };
        ecrire(`ecole:${id}`, e);
        return e;
      });
      setMessage({ ton: "vert", texte: "École rechargée depuis la base." });
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  };

  // Position : envoyée tout de suite avec le réseau, gardée sur l'appareil sinon
  const enregistrerPosition = (batiment: number | null) => async (pos: { latitude: number | null; longitude: number | null; precision?: number | null }) => {
    const v: Position = { latitude: pos.latitude, longitude: pos.longitude, precisionGps: pos.precision ?? null, localiseLe: new Date().toISOString() };
    const local = () =>
      setEtat((e) => ({
        ...e,
        paquet: batiment ? { ...e.paquet, batiments: e.paquet.batiments.map((b) => (b.id === batiment ? { ...b, ...v } : b)) } : { ...e.paquet, ecole: { ...e.paquet.ecole, ...v } },
        positions: batiment ? { ...e.positions, batiments: { ...e.positions.batiments, [batiment]: v } } : { ...e.positions, ecole: v },
      }));
    if (!navigator.onLine) {
      local();
      setMessage({ ton: "jaune", texte: "Position gardée sur l’appareil : elle partira avec « Envoyer »." });
      return;
    }
    try {
      await api.put(batiment ? `/etablissements/${p.ecole.id}/batiments/${batiment}/localisation` : `/etablissements/${p.ecole.id}/localisation`, pos);
    } catch (e) {
      // Réseau annoncé mais qui ne passe pas (signal faible, Wi-Fi sans Internet) : gardée, pas perdue
      if (!(e instanceof ErreurApi) || e.statut !== 0) throw e;
      local();
      setMessage({ ton: "jaune", texte: "Le réseau ne passe pas : position gardée sur l’appareil, elle partira avec « Envoyer »." });
      return;
    }
    setEtat((e) => ({ ...e, paquet: batiment ? { ...e.paquet, batiments: e.paquet.batiments.map((b) => (b.id === batiment ? { ...b, ...v } : b)) } : { ...e.paquet, ecole: { ...e.paquet.ecole, ...v } } }));
    setMessage({ ton: "vert", texte: "Position enregistrée." });
  };

  return (
    <div className="space-y-3">
      <div className="sticky top-[var(--barre-haut,0px)] z-10 -mx-1 space-y-2 rounded-b-2xl bg-white/95 px-1 pt-1 pb-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante="discret" onClick={retour}>
            <ArrowLeft /> Écoles
          </Bouton>
          <div className="min-w-[60%] flex-1">
            <div className="text-[16px] leading-tight font-semibold sm:truncate sm:text-[17px]">{p.ecole.nom}</div>
            <div className="truncate text-[12px] text-zinc-500">
              {[p.ecole.inspection, p.ecole.localite, `${p.ecole.posteResponsable} : ${p.ecole.responsable ?? "poste vacant"}`].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Reseau enLigne={enLigne} />
          <Bouton variante="principal" chargement={envoi} disabled={!enLigne || (!enAttente.length && !positionsEnAttente)} onClick={envoyer} title={enLigne ? "Envoyer ce qui a été complété" : "Envoi possible au retour de la connexion"}>
            <Send /> Envoyer{enAttente.length + positionsEnAttente ? ` (${enAttente.length + positionsEnAttente})` : ""}
          </Bouton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segments
            valeur={onglet}
            changer={setOnglet}
            options={[
              { valeur: "personnel", libelle: `Personnel (${etat.lignes.length})` },
              { valeur: "ecole", libelle: "L’école : localisation, bâtiments" },
            ]}
          />
          {onglet === "personnel" && (
            <>
              <Segments
                valeur={vue}
                changer={setVue}
                options={[
                  { valeur: "grille", libelle: "Grille" },
                  { valeur: "fiche", libelle: "Une personne à la fois" },
                ]}
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-zinc-600">
                <input type="checkbox" checked={manques} onChange={(e) => setManques(e.target.checked)} /> Montrer ce qui manque
              </label>
            </>
          )}
        </div>
        {/* Dans le bandeau qui reste en haut : vu même quand on est descendu dans la liste ou la fiche */}
        {message && (
          <div role="status" aria-live="polite">
            <Alerte ton={message.ton}>{message.texte}</Alerte>
          </div>
        )}
      </div>

      {onglet === "personnel" ? (
        <>
          <AjoutAgent etat={etat} setEtat={setEtat} enLigne={enLigne} />
          {!etat.lignes.length ? (
            <Vide>Aucun agent rattaché à cette école dans nos bases : ajoutez-les ci-dessus.</Vide>
          ) : vue === "grille" ? (
            <Grille etat={etat} setEtat={setEtat} manques={manques} />
          ) : (
            <UnePersonne etat={etat} setEtat={setEtat} manques={manques} />
          )}
        </>
      ) : (
        <div className="space-y-3">
          <Carte titre="Localisation de l’école">
            <BlocLocalisation position={p.ecole} enregistrer={enregistrerPosition(null)} />
            {etat.positions.ecole && <p className="mt-1 text-[12px] text-or-700">Prélevée sans connexion : elle partira avec « Envoyer ».</p>}
          </Carte>
          <Carte titre={`Bâtiments (${p.batiments.length + (etat.nouveauxBatiments?.length ?? 0)})`}>
            <AjoutBatiment ajouter={(b) => setEtat((e) => ({ ...e, nouveauxBatiments: [...(e.nouveauxBatiments ?? []), b] }))} />
            {!!etat.nouveauxBatiments?.length && (
              <ul className="mb-2 divide-y divide-zinc-100">
                {etat.nouveauxBatiments.map((b) => (
                  <li key={b.cle} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
                    <span className="font-medium">{b.nom}</span>
                    <Badge ton="jaune">à envoyer</Badge>
                    <span className="text-zinc-500">{b.position ? `${b.position.latitude?.toFixed(5)}, ${b.position.longitude?.toFixed(5)}` : "sans position"}</span>
                    <button type="button" title="Retirer" className="cursor-pointer text-zinc-400 hover:text-rouge-600" onClick={() => setEtat((e) => ({ ...e, nouveauxBatiments: (e.nouveauxBatiments ?? []).filter((x) => x.cle !== b.cle) }))}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!p.batiments.length ? (
              !etat.nouveauxBatiments?.length && <p className="text-[13px] text-zinc-500">Aucun bâtiment enregistré pour cette école : ajoutez chacun ci-dessus, avec sa position, surtout une annexe ailleurs.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {p.batiments.map((b) => (
                  <li key={b.id} className="space-y-1 py-2.5">
                    <div className="text-[14px] font-medium">{b.nom}</div>
                    <BlocLocalisation compact position={b} enregistrer={enregistrerPosition(b.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Carte>
          <Carte titre="Salles et classes">
            <p className="text-[13px] text-zinc-600">
              {p.ecole.salles} salle(s), {p.ecole.classes} classe(s) enregistrée(s).{" "}
              {profil.role === "RECENSEUR" ? (
                "La DGRHAS les complète sur la fiche de l’école."
              ) : enLigne ? (
                <Link href={`/ecoles/${p.ecole.id}`} target="_blank" className="inline-flex items-center gap-1 text-marque-700 hover:underline">
                  Compléter sur la fiche de l’école <ExternalLink className="size-3" />
                </Link>
              ) : (
                "Elles se complètent sur la fiche de l’école, avec la connexion."
              )}
            </p>
          </Carte>
          <div className="flex flex-wrap gap-2 text-[12px] text-zinc-500">
            <span>Téléchargée le {new Date(p.telechargeLe).toLocaleString("fr-FR")}.</span>
            {enLigne && (
              <button type="button" className="cursor-pointer text-marque-700 hover:underline" onClick={() => void recharger()}>
                Recharger depuis la base
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Ajouter un agent ------------------------------ */

/** Le nom d'un département (copie des référentiels gardée par la coquille). */
function nomDepartement(id: number): string {
  try {
    const r = JSON.parse(localStorage.getItem("dgrhas.referentiels") ?? "{}") as { departements?: { id: number; nom: string }[] };
    return r.departements?.find((d) => d.id === id)?.nom ?? "autre département";
  } catch {
    return "autre département";
  }
}

function AjoutAgent({ etat, setEtat, enLigne }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void; enLigne: boolean }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<{ id: number; nomComplet: string; statut: string; structureNom: string | null; matricule: string | null }[]>([]);
  const [cherche, setCherche] = useState(false);
  const p = etat.paquet;
  // L'annuaire (sur l'appareil, tout le pays) : un agent enregistré dans une autre école se retrouve sans réseau
  const dansAnnuaire = useMemo(
    () => (q.trim().length >= 2 ? rechercherAnnuaire(q, p.ecole.departementId, 8).filter((l) => !etat.lignes.some((x) => x.agentId === l[0])) : []),
    [q, p.ecole.departementId, etat.lignes],
  );
  // Dans cette école d'abord (même sans réseau), avec la même recherche intelligente
  const ici = useMemo(
    () => (q.trim().length >= 2 ? chercher(q, etat.lignes.map((l) => ({ item: l, prepare: preparer(`${l.valeurs.NOMS_PRENOMS ?? ""} ${l.valeurs.MATRICULE_SOLDE ?? ""}`) })), 5).map((x) => x.item) : []),
    [q, etat.lignes],
  );
  useEffect(() => {
    if (!enLigne || q.trim().length < 3) return;
    const t = setTimeout(() => {
      setCherche(true);
      api
        .get<{ lignes: typeof resultats }>(`/recensement/terrain/agents?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setResultats(r.lignes.filter((x) => !etat.lignes.some((l) => l.agentId === x.id))))
        .catch(() => setResultats([]))
        .finally(() => setCherche(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q, enLigne, etat.lignes]);

  // « Il travaille ici » : sa fiche complète avec le réseau ; sans réseau, ce que dit l'annuaire
  const rattacher = async (id: number, hors?: LigneAnnuaire) => {
    // Son école est sur l'appareil (même département) : sa fiche complète, sans réseau
    const locale = ficheLocale(id);
    if (locale) {
      setEtat((e) => ({ ...e, lignes: [nouvelleLigne(e.paquet, locale, true), ...e.lignes] }));
      setQ("");
      return;
    }
    try {
      if (!navigator.onLine && hors) throw new Error("hors ligne");
      const f = await api.get<{ agent: { id: number; nomComplet: string; statut: string; matricule: string | null; donnees: Record<string, unknown> } }>(`/recensement/terrain/agent/${id}`);
      setEtat((e) => ({ ...e, lignes: [nouvelleLigne(e.paquet, f.agent, true), ...e.lignes] }));
    } catch {
      if (!hors) return;
      // (tout ce que la liste nationale connaît : naissance, genre, grade, matricule)
      const agent = {
        id: hors[0],
        nomComplet: hors[1],
        statut: hors[5],
        matricule: hors[3],
        donnees: { NOMS_PRENOMS: hors[1], ...(hors[4] ? { DATE_NAISSANCE: hors[4] } : {}), ...(hors[6] ? { GENRE: hors[6] } : {}), ...(hors[7] ? { GRADE: hors[7] } : {}), ...(hors[3] ? { MATRICULE_SOLDE: hors[3] } : {}) },
      };
      setEtat((e) => ({ ...e, lignes: [nouvelleLigne(e.paquet, agent, true), ...e.lignes] }));
    }
    setQ("");
  };
  const nouveau = () => {
    const valeurs = Object.fromEntries(p.colonnes.map((c) => [c.code, c.code === "NOMS_PRENOMS" ? q.trim().toUpperCase() : ""]));
    setEtat((e) => ({ ...e, lignes: [{ cle: `n${Date.now()}`, agentId: null, statut: e.paquet.statuts[0]?.code ?? "", statutOrigine: "", valeurs, origine: {}, nouveau: true }, ...e.lignes] }));
    setQ("");
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="relative">
        <UserPlus className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-zinc-400" />
        <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Agent présent : tapez son nom ou son matricule" className="h-11 w-full pl-11 text-[15px]" aria-label="Chercher un agent" />
      </div>
      {q.trim().length >= 2 && (
        <div className="mt-2 space-y-1 text-[13px]">
          {ici.slice(0, 5).map((l) => (
            <div key={l.cle} className="flex items-center gap-2 rounded-lg bg-marque-50 px-3 py-1.5">
              <CheckCircle2 className="size-4 text-marque-600" /> <strong>{l.valeurs.NOMS_PRENOMS}</strong> est déjà dans la liste de cette école : complétez sa ligne.
            </div>
          ))}
          {/* L'annuaire du département (même sans réseau) */}
          {dansAnnuaire.map((l) => (
            <div key={`an${l[0]}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <strong>{l[1]}</strong>{" "}
                <span className="text-zinc-500">
                  · {l[2] ?? "sans école"}
                  {l[8] && l[8] !== p.ecole.departementId ? ` (${nomDepartement(l[8])})` : ""}
                  {l[4] ? ` · né(e) le ${l[4].split("-").reverse().join("/")}` : ""}
                  {l[6] ? ` · ${l[6] === "F" ? "femme" : l[6] === "M" ? "homme" : l[6]}` : ""}
                  {l[7] ? ` · ${l[7]}` : ""}
                  {l[3] ? ` · ${l[3]}` : ""}
                </span>
              </span>
              <Bouton onClick={() => void rattacher(l[0], l)} title="Il travaille dans cette école : sa fiche y sera rattachée à l’envoi (pas de nouvelle fiche)">
                <Plus /> Il travaille ici
              </Bouton>
            </div>
          ))}
          {(enLigne && q.trim().length >= 3 ? resultats.filter((r) => !dansAnnuaire.some((l) => l[0] === r.id)) : []).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5">
              <span className="min-w-0 flex-1">
                <strong>{r.nomComplet}</strong> <span className="text-zinc-500">· {r.structureNom ?? "sans école"}{r.matricule ? ` · ${r.matricule}` : ""}</span>
              </span>
              <Bouton onClick={() => void rattacher(r.id)} title="Il travaille dans cette école : sa fiche y sera rattachée à l’envoi">
                <Plus /> Il travaille ici
              </Bouton>
            </div>
          ))}
          {cherche && <p className="text-zinc-500">Recherche dans la base…</p>}
          {!enLigne && <p className="text-zinc-500">Sans connexion : la recherche se fait dans cette école et dans la liste nationale gardée sur l’appareil.</p>}
          <button type="button" onClick={nouveau} className="cursor-pointer text-[13px] font-medium text-marque-700 hover:underline">
            + Introuvable ci-dessus : l’ajouter comme nouvel agent{q.trim() ? ` (« ${q.trim().toUpperCase()} »)` : ""}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Une case ------------------------------ */

function Case({ c, ligne, maj, manques, grande, idCase, auClavier }: { c: Colonne; ligne: Ligne; maj: (v: string) => void; manques: boolean; grande?: boolean; idCase?: string; auClavier?: (e: React.KeyboardEvent<HTMLElement>) => void }) {
  const v = ligne.valeurs[c.code] ?? "";
  const change = v !== (ligne.origine[c.code] ?? "");
  const manque = manques && !v && obligatoire(c, ligne.statut);
  const cls = cx(
    "w-full rounded-md border bg-transparent outline-none focus:border-marque-500 focus:bg-white focus:ring-2 focus:ring-marque-200",
    grande ? "h-11 px-3 text-[15px]" : "h-8 px-1.5 text-[13px]",
    change ? "border-or-300 bg-or-50" : manque ? "border-rouge-200 bg-rouge-50/60" : grande ? "border-zinc-200" : "border-transparent",
  );
  const commun = { id: idCase, "data-case": idCase, onKeyDown: auClavier, "aria-label": c.libelle, title: c.aide || c.libelle };
  // Les enfants : un nom et une date par enfant, un bouton pour en ajouter ; rien à taper d'autre
  if (c.code === "ENFANTS" && c.type === "TABLEAU") return <CaseEnfants valeur={v} maj={maj} grande={grande} classe={cls} commun={commun} />;
  if (c.type === "LISTE")
    return (
      <select {...commun} className={cls} value={v} onChange={(e) => maj(e.target.value)}>
        <option value="">—</option>
        {c.options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.libelle}
          </option>
        ))}
      </select>
    );
  return (
    <input
      {...commun}
      className={cls}
      value={v}
      type={c.type === "DATE" ? "date" : "text"}
      inputMode={c.type === "NOMBRE" ? "numeric" : c.type === "TELEPHONE" ? "tel" : undefined}
      onChange={(e) => maj(c.code === "NOMS_PRENOMS" ? e.target.value.toUpperCase() : e.target.value)}
    />
  );
}

/* ------------------------------ Déjà dans la base ? ------------------------------ */

/**
 * Le nouvel agent ressemble à quelqu'un de la base (souvent enregistré dans une autre école) : on ne
 * le recrée pas. « C'est lui » le rattache à cette école ; « Ce n'est pas lui » le crée quand même.
 */
function Semblables({ ligne, setEtat }: { ligne: Ligne; setEtat: (f: (e: Etat) => Etat) => void }) {
  const cestLui = (s: Semblable) =>
    setEtat((e) => ({
      ...e,
      lignes: e.lignes.map((l) =>
        l.cle === ligne.cle ? { ...l, cle: `a${s.id}`, agentId: s.id, nouveau: false, rattacher: true, statutOrigine: l.statut, origine: {}, semblables: undefined, erreur: undefined, forcer: false } : l,
      ),
    }));
  const pasLui = () => setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === ligne.cle ? { ...l, forcer: true, semblables: undefined, erreur: undefined } : l)) }));
  return (
    <div className="mt-1 w-full space-y-1 rounded-lg bg-or-50 p-2 text-[12px] text-or-800">
      <div className="font-medium">Déjà dans la base ? Ne le recréez pas :</div>
      {ligne.semblables!.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1">
            <strong>{s.nomComplet}</strong> · {s.ecole ?? "sans école"}
            {s.dateNaissance ? ` · né(e) le ${s.dateNaissance.split("-").reverse().join("/")}` : ""}
            {s.matricule ? ` · ${s.matricule}` : ""}
          </span>
          <Bouton onClick={() => cestLui(s)}>C’est lui : il travaille ici</Bouton>
        </div>
      ))}
      <button type="button" className="cursor-pointer text-[12px] text-zinc-600 underline" onClick={pasLui}>
        Ce n’est pas lui : créer un nouvel agent
      </button>
    </div>
  );
}

/* ------------------------------ Présence constatée ------------------------------ */

const ecrirePresence = (setEtat: (f: (e: Etat) => Etat) => void, cle: string, v: Presence | "") =>
  setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === cle ? { ...l, presence: v, erreur: undefined } : l)) }));

/** Grille : présent, absent ce jour, parti, inconnu ici (parti et inconnu : un signalement à la DGRHAS). */
function ChoixPresence({ ligne, setEtat, idCase, auClavier }: { ligne: Ligne; setEtat: (f: (e: Etat) => Etat) => void; idCase: string; auClavier: (e: React.KeyboardEvent<HTMLElement>) => void }) {
  if (ligne.nouveau) return <span className="px-2 text-[12px] text-zinc-400">—</span>;
  const p = PRESENCES.find((x) => x.code === ligne.presence);
  return (
    <select
      data-case={idCase}
      onKeyDown={auClavier}
      aria-label="Présence aujourd’hui"
      value={ligne.presence ?? ""}
      onChange={(e) => ecrirePresence(setEtat, ligne.cle, e.target.value as Presence | "")}
      className={cx("h-8 w-full rounded-md border bg-transparent px-1 text-[13px] outline-none focus:border-marque-500", ligne.presence ? "border-or-300 bg-or-50" : "border-transparent", p?.ton)}
    >
      <option value="">—</option>
      {PRESENCES.map((x) => (
        <option key={x.code} value={x.code}>
          {x.libelle}
        </option>
      ))}
    </select>
  );
}

/** À la DGRHAS : ce que les équipes ont signalé (absent, parti, inconnu ici), à vérifier puis traiter. */
function Signalements({ enLigne }: { enLigne: boolean }) {
  const [liste, setListe] = useState<{ id: number; agentId: number; nomComplet: string; ecole: string; etat: string; observation: string | null; par: string | null; le: string }[]>([]);
  const [vu, setVu] = useState(0);
  useEffect(() => {
    if (!enLigne) return;
    api
      .get<typeof liste>("/recensement/terrain/signalements")
      .then(setListe)
      .catch(() => undefined);
  }, [enLigne, vu]);
  if (!liste.length) return null;
  const libelle = (e: string) => PRESENCES.find((x) => x.code === e)?.libelle ?? e;
  return (
    <Carte titre={`Signalements des équipes (${liste.length} à traiter)`}>
      <p className="mb-2 text-[12px] text-zinc-500">Rien n’est effacé : vérifiez, corrigez la fiche (mutation, sortie, école) si besoin, puis marquez « Traité ».</p>
      <ul className="divide-y divide-zinc-100">
        {liste.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
            <AlertTriangle className="size-4 text-or-600" />
            <Link href={`/personnel/agents/${g.agentId}`} target="_blank" className="font-medium text-marque-700 hover:underline">
              {g.nomComplet}
            </Link>
            <Badge ton={g.etat === "ABSENT" ? "jaune" : "rouge"}>{libelle(g.etat)}</Badge>
            <span className="text-zinc-500">
              {g.ecole} · {g.par ?? ""}, le {new Date(g.le).toLocaleDateString("fr-FR")}
              {g.observation ? ` · « ${g.observation} »` : ""}
            </span>
            <Bouton
              variante="discret"
              className="ml-auto"
              onClick={() =>
                void api
                  .post(`/recensement/terrain/signalements/${g.id}/traite`, {})
                  .then(() => setVu((v) => v + 1))
                  .catch(() => undefined)
              }
            >
              <CheckCircle2 /> Traité
            </Bouton>
          </li>
        ))}
      </ul>
    </Carte>
  );
}

/**
 * Le service hors ligne : la page et ses fichiers sont gardés sur l'appareil, l'application
 * s'ouvre ensuite même sans réseau (et s'installe sur l'écran d'accueil).
 */
function useServiceHorsLigne() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = [location.href, ...performance.getEntriesByType("resource").map((e) => e.name)].filter((u) => u.startsWith(location.origin) && !u.includes("/api/"));
        reg.active?.postMessage({ type: "GARDER", urls });
      })
      .catch(() => undefined);
  }, []);
}

/* ------------------------------ Les enfants ------------------------------ */

/** Un enfant : son nom, sa date ; le reste de sa ligne en base (père, mère) est gardé tel quel. */
interface Enfant {
  nom: string;
  date: string;
  reste: string[];
}
// Le format d'échange avec le serveur reste interne : la personne ne tape jamais de symbole
const lireEnfants = (v: string): Enfant[] =>
  v
    .split(" ; ")
    .map((x) => x.split(" | "))
    .filter((x) => x.some((y) => y.trim()))
    .map(([nom = "", date = "", ...reste]) => ({ nom: nom.trim(), date: date.trim(), reste }));
const ecrireEnfants = (l: Enfant[]) =>
  l
    .filter((e) => e.nom.trim() || e.date)
    .map((e) => [e.nom.trim(), e.date, ...e.reste].join(" | ").replace(/(\s\|\s)+$/, ""))
    .join(" ; ");

/** Grille : un bouton « 2 enfants » qui ouvre la liste ; une personne à la fois : la liste directement. */
function CaseEnfants({ valeur, maj, grande, classe, commun }: { valeur: string; maj: (v: string) => void; grande?: boolean; classe: string; commun: Record<string, unknown> }) {
  const [ouverte, setOuverte] = useState(false);
  const n = lireEnfants(valeur).length;
  if (grande) return <ListeEnfants valeur={valeur} maj={maj} />;
  return (
    <>
      <button type="button" {...commun} className={cx(classe, "cursor-pointer text-left")} onClick={() => setOuverte(true)}>
        {n ? `${n} enfant${n > 1 ? "s" : ""}` : <span className="text-zinc-400">+ Enfants</span>}
      </button>
      {ouverte && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center" onClick={() => setOuverte(false)}>
          <div className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <strong className="text-[15px]">Enfants</strong>
              <Bouton variante="principal" onClick={() => setOuverte(false)}>
                Terminé
              </Bouton>
            </div>
            <ListeEnfants valeur={valeur} maj={maj} auto />
          </div>
        </div>
      )}
    </>
  );
}

/** Une ligne par enfant (nom, date de naissance) ; Entrée passe à la date, puis à l'enfant suivant. */
function ListeEnfants({ valeur, maj, auto }: { valeur: string; maj: (v: string) => void; auto?: boolean }) {
  // Les lignes vivent ici pendant la saisie (une ligne vide ajoutée reste visible)
  const [lignes, setLignes] = useState<Enfant[]>(() => {
    const l = lireEnfants(valeur);
    return l.length ? l : [{ nom: "", date: "", reste: [] }];
  });
  const boite = useRef<HTMLDivElement>(null);
  const poser = (l: Enfant[]) => {
    setLignes(l);
    maj(ecrireEnfants(l));
  };
  const changer = (i: number, e: Partial<Enfant>) => poser(lignes.map((x, k) => (k === i ? { ...x, ...e } : x)));
  const ajouter = () => {
    setLignes([...lignes, { nom: "", date: "", reste: [] }]);
    setTimeout(() => boite.current?.querySelectorAll<HTMLInputElement>("input[data-nom]")[lignes.length]?.focus(), 30);
  };
  const enlever = (i: number) => {
    const l = lignes.filter((_, k) => k !== i);
    poser(l.length ? l : [{ nom: "", date: "", reste: [] }]);
  };
  return (
    <div ref={boite} className="space-y-2">
      {lignes.map((e, i) => (
        // Téléphone : le nom sur toute la largeur, la date en dessous ; tablette : sur une ligne
        <div key={i} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[1.25rem_1fr_10rem_auto]">
          <span className="text-right text-[12px] text-zinc-400">{i + 1}.</span>
          <input
            data-nom
            autoFocus={auto && i === lignes.length - 1}
            className="h-11 min-w-0 rounded-md border border-zinc-200 px-3 text-[15px] outline-none focus:border-marque-500 focus:ring-2 focus:ring-marque-200"
            value={e.nom}
            placeholder="Nom et prénoms"
            aria-label={`Enfant ${i + 1} : nom et prénoms`}
            onChange={(x) => changer(i, { nom: x.target.value.toUpperCase() })}
            onKeyDown={(x) => x.key === "Enter" && (x.preventDefault(), x.currentTarget.parentElement?.querySelector<HTMLElement>('input[type="date"]')?.focus())}
          />
          <input
            type="date"
            className="order-last col-start-2 h-11 rounded-md border border-zinc-200 px-2 text-[14px] outline-none focus:border-marque-500 sm:order-none sm:col-start-auto"
            value={e.date}
            aria-label={`Enfant ${i + 1} : date de naissance`}
            onChange={(x) => changer(i, { date: x.target.value })}
            onKeyDown={(x) => x.key === "Enter" && (x.preventDefault(), ajouter())}
          />
          <button type="button" className="cursor-pointer p-1 text-zinc-400 hover:text-rouge-600" aria-label={`Retirer l’enfant ${i + 1}`} onClick={() => enlever(i)}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={ajouter} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[14px] font-medium text-marque-700 hover:bg-marque-50">
        <Plus className="size-4" /> Ajouter un enfant
      </button>
    </div>
  );
}

const ecrireCase = (setEtat: (f: (e: Etat) => Etat) => void, cle: string, code: string, v: string) =>
  setEtat((e) => ({
    ...e,
    lignes: e.lignes.map((l) => {
      if (l.cle !== cle) return l;
      const valeurs = { ...l.valeurs, [code]: v };
      // Le nombre d'enfants suit la liste : rien à compter ni à taper
      if (code === "ENFANTS" && "NOMBRE_ENFANTS" in valeurs) {
        const n = lireEnfants(v).filter((x) => x.nom || x.date).length;
        if (n) valeurs.NOMBRE_ENFANTS = String(n);
      }
      return { ...l, erreur: undefined, valeurs };
    }),
  }));
const ecrireStatut = (setEtat: (f: (e: Etat) => Etat) => void, cle: string, v: string) => setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === cle ? { ...l, statut: v } : l)) }));
const retirer = (setEtat: (f: (e: Etat) => Etat) => void, cle: string) => setEtat((e) => ({ ...e, lignes: e.lignes.filter((l) => l.cle !== cle) }));
const manquantes = (p: Paquet, l: Ligne) => p.colonnes.filter((c) => obligatoire(c, l.statut) && !l.valeurs[c.code]).length;

/* ------------------------------ Vue grille (comme Excel) ------------------------------ */

function Grille({ etat, setEtat, manques }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void; manques: boolean }) {
  const p = etat.paquet;
  const table = useRef<HTMLTableElement>(null);
  // Entrée : la même colonne, ligne suivante (Maj+Entrée : au-dessus) ; Tab avance naturellement
  const auClavier = (r: number, k: number) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const cible = table.current?.querySelector<HTMLElement>(`[data-case="${r + (e.shiftKey ? -1 : 1)}-${k}"]`);
    cible?.focus();
  };
  const vides = (code: string) => etat.lignes.filter((l) => !l.valeurs[code] && obligatoire(p.colonnes.find((c) => c.code === code)!, l.statut)).length;
  const memes = homonymes(etat.lignes);
  return (
    <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white" style={{ maxHeight: "70vh" }}>
      <table ref={table} className="min-w-full border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-[2] bg-zinc-50 text-[11px] font-semibold text-zinc-600">
          <tr>
            <th className="sticky left-0 z-[3] min-w-56 border-b border-zinc-200 bg-zinc-50 px-2 py-2">Noms et prénoms</th>
            <th className="min-w-32 border-b border-zinc-200 px-2 py-2">Statut</th>
            <th className="min-w-36 border-b border-zinc-200 px-2 py-2" title="Ce que vous constatez aujourd’hui dans l’école">
              Présence
            </th>
            {p.colonnes
              .filter((c) => c.code !== "NOMS_PRENOMS")
              .map((c) => (
                <th key={c.code} className={cx("border-b border-zinc-200 px-2 py-2", c.type === "TABLEAU" ? "min-w-72" : c.type === "DATE" ? "min-w-36" : "min-w-32")} title={c.aide}>
                  {c.libelle}
                  {manques && vides(c.code) > 0 && <span className="ml-1 rounded-full bg-rouge-100 px-1.5 text-[10px] text-rouge-700">{vides(c.code)}</span>}
                </th>
              ))}
            <th className="border-b border-zinc-200 px-2 py-2">État</th>
          </tr>
        </thead>
        <tbody>
          {etat.lignes.map((l, r) => {
            const m = manquantes(p, l);
            const cols = p.colonnes.filter((c) => c.code !== "NOMS_PRENOMS");
            const nom = p.colonnes.find((c) => c.code === "NOMS_PRENOMS");
            return (
              <tr key={l.cle} data-ligne={l.cle} data-agent={l.agentId ?? ""} className={cx("align-top", l.erreur && "bg-rouge-50/50", (l.presence === "PARTI" || l.presence === "INCONNU" || l.presence === "DOUBLON") && "opacity-60")}>
                <td className="sticky left-0 z-[1] border-b border-zinc-100 bg-white px-1 py-1">
                  {nom && <Case c={nom} ligne={l} maj={(v) => ecrireCase(setEtat, l.cle, nom.code, v)} manques={manques} idCase={`${r}-0`} auClavier={auClavier(r, 0)} />}
                  <div className="flex flex-wrap gap-1 px-1 pt-0.5">
                    {l.nouveau && <Badge ton="bleu">nouveau</Badge>}
                    {l.aControler && <Badge ton="jaune" titre="Ajouté par une équipe : il est dans la base, en attente de la décision du DG (rejeté, il disparaîtra des tablettes)">ajouté, en contrôle</Badge>}
                    {l.rattacher && <Badge ton="bleu">arrive ici</Badge>}
                    {memes.has(nomCle(l.valeurs.NOMS_PRENOMS)) && (
                      <Badge ton="rouge" titre={MARQUE_HOMONYME}>
                        même nom qu’une autre ligne
                      </Badge>
                    )}
                    {l.erreur && !l.semblables?.length && <span className="text-[11px] text-rouge-700">{l.erreur}</span>}
                    {!!l.semblables?.length && <Semblables ligne={l} setEtat={setEtat} />}
                  </div>
                </td>
                <td className="border-b border-zinc-100 px-1 py-1">
                  <select data-case={`${r}-1`} onKeyDown={auClavier(r, 1)} className={cx("h-8 w-full rounded-md border bg-transparent px-1 text-[13px] outline-none focus:border-marque-500", l.statut !== l.statutOrigine ? "border-or-300 bg-or-50" : "border-transparent")} value={l.statut} onChange={(e) => ecrireStatut(setEtat, l.cle, e.target.value)} aria-label="Statut">
                    {p.statuts.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.libelle}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-zinc-100 px-1 py-1">
                  <ChoixPresence ligne={l} setEtat={setEtat} idCase={`${r}-2`} auClavier={auClavier(r, 2)} />
                </td>
                {cols.map((c, k) => (
                  <td key={c.code} className="border-b border-zinc-100 px-1 py-1">
                    <Case c={c} ligne={l} maj={(v) => ecrireCase(setEtat, l.cle, c.code, v)} manques={manques} idCase={`${r}-${k + 3}`} auClavier={auClavier(r, k + 3)} />
                  </td>
                ))}
                <td className="border-b border-zinc-100 px-2 py-1.5 text-[12px] whitespace-nowrap">
                  {m ? <span className="text-rouge-700">manque {m}</span> : <span className="text-marque-700">complet</span>}
                  {(l.nouveau || l.rattacher) && (
                    <button type="button" title="Retirer cette ligne" className="ml-2 cursor-pointer text-zinc-400 hover:text-rouge-600" onClick={() => retirer(setEtat, l.cle)}>
                      <Trash2 className="inline size-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ Vue « une personne à la fois » (téléphone) ------------------------------ */

function UnePersonne({ etat, setEtat, manques }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void; manques: boolean }) {
  const p = etat.paquet;
  const [i, setI] = useState(0);
  const [seulementIncomplets, setSeulementIncomplets] = useState(false);
  const liste = seulementIncomplets ? etat.lignes.filter((l) => manquantes(p, l) > 0) : etat.lignes;
  const n = Math.min(i, Math.max(0, liste.length - 1));
  const l = liste[n];
  if (!l) return <Vide>Tous les agents sont complets.</Vide>;
  const m = manquantes(p, l);
  const memes = homonymes(etat.lignes);
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex items-center gap-2 text-[13px]">
        <Bouton disabled={n === 0} onClick={() => setI(n - 1)} aria-label="Agent précédent">
          <ArrowLeft />
        </Bouton>
        <span className="flex-1 text-center text-zinc-600">
          Agent {n + 1} sur {liste.length}
        </span>
        <Bouton variante="principal" disabled={n >= liste.length - 1} onClick={() => setI(n + 1)}>
          Suivant <ArrowRight />
        </Bouton>
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-zinc-600">
        <input type="checkbox" checked={seulementIncomplets} onChange={(e) => (setSeulementIncomplets(e.target.checked), setI(0))} /> Seulement ceux à qui il manque quelque chose
      </label>
      <div key={l.cle} data-ligne={l.cle} data-agent={l.agentId ?? ""} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {l.nouveau && <Badge ton="bleu">nouveau</Badge>}
          {l.aControler && <Badge ton="jaune" titre="Ajouté par une équipe : il est dans la base, en attente de la décision du DG (rejeté, il disparaîtra des tablettes)">ajouté, en contrôle</Badge>}
          {l.rattacher && <Badge ton="bleu">arrive ici</Badge>}
          {memes.has(nomCle(l.valeurs.NOMS_PRENOMS)) && (
            <Badge ton="rouge" titre={MARQUE_HOMONYME}>
              même nom qu’une autre ligne
            </Badge>
          )}
          {m ? <Badge ton="rouge">manque {m}</Badge> : <Badge ton="vert">complet</Badge>}
          {l.erreur && !l.semblables?.length && <span className="text-[12px] text-rouge-700">{l.erreur}</span>}
        </div>
        {!!l.semblables?.length && <Semblables ligne={l} setEtat={setEtat} />}
        {!l.nouveau && (
          <div className="space-y-1">
            <div className="text-[12px] font-medium text-zinc-600">Aujourd’hui dans l’école</div>
            <div className="grid grid-cols-2 gap-2">
              {PRESENCES.map((x) => (
                <button
                  key={x.code}
                  type="button"
                  onClick={() => ecrirePresence(setEtat, l.cle, l.presence === x.code ? "" : x.code)}
                  className={cx("h-11 cursor-pointer rounded-lg border text-[14px] font-medium", l.presence === x.code ? "border-marque-600 bg-marque-600 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50")}
                >
                  {x.libelle}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="block text-[12px] font-medium text-zinc-600">
          Statut
          <Liste className="h-11 text-[15px]" value={l.statut} onChange={(e) => ecrireStatut(setEtat, l.cle, e.target.value)} options={p.statuts.map((s) => ({ valeur: s.code, libelle: s.libelle }))} />
        </label>
        {p.colonnes.map((c) => (
          <label key={c.code} className="block text-[12px] font-medium text-zinc-600">
            {c.libelle}
            <Case c={c} ligne={l} grande maj={(v) => ecrireCase(setEtat, l.cle, c.code, v)} manques={manques} />
          </label>
        ))}
        {(l.nouveau || l.rattacher) && (
          <button type="button" className="cursor-pointer text-[12px] text-rouge-600 hover:underline" onClick={() => retirer(setEtat, l.cle)}>
            Retirer cette ligne
          </button>
        )}
      </div>
      <div className="flex justify-end">
        <Bouton variante="principal" disabled={n >= liste.length - 1} onClick={() => setI(n + 1)}>
          Suivant <ArrowRight />
        </Bouton>
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-zinc-500">
        <Smartphone className="size-3.5" /> Tout est enregistré sur l’appareil à chaque frappe. <LayoutGrid className="ml-2 size-3.5" /> Sur une tablette, la grille va plus vite.
      </p>
    </div>
  );
}
