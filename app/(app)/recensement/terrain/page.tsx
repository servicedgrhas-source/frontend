"use client";

import { ArrowLeft, ArrowRight, BellRing, Camera, CheckCircle2, ChevronDown, CloudOff, MapPinned, Download, Globe2, Plus, RefreshCw, Search, Send, Smartphone, Trash2, UserPlus, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlocLocalisation, preleverPosition, type Position } from "@/components/ecoles/localisation";
import { ChargementBase, type ProgresBase } from "@/components/recensement/chargement-base";
import { CoffreTerrain, ReglagesAppareil } from "@/components/recensement/coffre";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, EnTete, Liste, Modale, Saisie, Segments, Vide, cx } from "@/components/ui";
import { api, APPAREIL_EFFACE, ErreurApi } from "@/lib/api";
import { CYCLES } from "@/lib/ecoles";
import { accesDonne } from "@/lib/espaces";
import { cles, ecrire, effacerTout, fixerEffacement, lire, noterEnAttente, noterServeur, surAvantEffacement } from "@/lib/coffre-terrain";
import { chercher, preparer, type Prepare } from "@/lib/recherche-souple";
import { dernierePosition, envoyerPositions, useSuiviPosition } from "@/lib/suivi-position";

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
    /** Ce qu'une équipe a déjà constaté sur l'école pendant ce recensement (terminée…). */
    constat?: ConstatEcoleServeur | null;
  };
  batiments: (Position & { id: number; nom: string; type?: string | null; etat?: string })[];
  /** Les salles de l'école, et les classes ouvertes cette année. */
  listeSalles?: SalleT[];
  listeClasses?: ClasseT[];
  /** Ce que proposent les formulaires de l'école (niveaux par cycle, types, états, année). */
  referentiels?: RefsEcole;
  /** Les pièces qu'on peut photographier sur place (diplôme, acte de naissance…). */
  pieces?: TypePiece[];
  colonnes: Colonne[];
  statuts: { code: string; libelle: string }[];
  /** aControler : ajouté par une équipe, effectif tout de suite, en attente de la décision du DG. */
  agents: { id: number; nomComplet: string; statut: string; matricule: string | null; donnees: Record<string, unknown>; aControler?: boolean; constat?: ConstatAgent | null }[];
}
interface SalleT {
  id: number;
  nom: string;
  batimentId: number | null;
  type: string | null;
  capacite: number | null;
  etat: string;
}
interface ClasseT {
  id: number;
  niveau: string;
  nom: string;
  salleId: number | null;
  effectif: number | null;
  effectifFilles: number | null;
}
interface RefsEcole {
  annee: string;
  niveaux: Record<string, { code: string; libelle: string }[]>;
  typesSalle: string[];
  typesBatiment: string[];
  etats: { code: string; libelle: string }[];
}
/** Une salle vue sur place, en attente d'envoi ; son bâtiment : « id:12 » (déjà en base) ou « cle:b… » (ajouté ici). */
interface NouvelleSalle {
  cle: string;
  nom: string;
  batiment: string;
  type: string;
  capacite: string;
  etat: string;
  erreur?: string;
}
interface NouvelleClasse {
  cle: string;
  niveau: string;
  nom: string;
  salle: string;
  effectif: string;
  effectifFilles: string;
  erreur?: string;
}
/** Le constat déjà envoyé pour un agent dans cette école, pendant ce recensement. */
interface ConstatAgent {
  presence: Presence;
  observation?: string | null;
  par?: string | null;
  le: string;
}
interface ConstatEcoleServeur {
  etat: string | null;
  nomSurPlace: string | null;
  responsable: string | null;
  telephone: string | null;
  observation: string | null;
  termineeLe: string | null;
  par: string | null;
  le: string;
}
/** Ce que l'équipe note sur l'école, en attente d'envoi. */
interface ConstatEcoleSaisi {
  etat?: string;
  nomSurPlace?: string;
  responsable?: string;
  telephone?: string;
  observation?: string;
  /** « J'ai fini cette école » (true), ou rouverte (false). */
  terminee?: boolean;
  /** La base se trompe sur l'école : ce qui est vu sur place (seulement ce qui diffère). */
  correction?: CorrectionEcole;
}
/** Ce que la base a de faux sur une école, vu sur place, avec la position de l'équipe. */
interface CorrectionEcole {
  localite?: string;
  departementId?: number;
  inspectionId?: number;
  cycle?: string;
  latitude?: number;
  longitude?: number;
  precision?: number;
}
/** Un type de pièce du dossier d'un agent. */
interface TypePiece {
  code: string;
  libelle: string;
}
/** La photo d'une pièce prise sur place, chiffrée sur l'appareil jusqu'à l'envoi. */
interface PhotoPiece {
  cle: string;
  type: string;
  /** L'image réduite (JPEG), en texte. */
  image: string;
  le: string;
  /** Refusée par le serveur : le motif. */
  erreur?: string;
}
interface Ligne {
  cle: string;
  agentId: number | null;
  /** Photos des pièces prises sur place, en attente d'envoi. */
  photos?: PhotoPiece[];
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
  /** Ce que l'équipe constate (présent, absent ce jour, parti, inconnu ici…). */
  presence?: Presence | "";
  /** Le motif ou la précision du constat (congé, maladie, muté…). */
  observation?: string;
  /** Quand le constat a été fait (heure de l'appareil) : il peut partir bien plus tard. */
  presenceLe?: string;
  /** Le constat déjà envoyé (ce recensement) : l'agent a été vu. */
  constat?: ConstatAgent | null;
  /** Vient aussi dans cette école, mais garde la sienne (deux écoles). */
  aussi?: boolean;
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
  nouveauxBatiments?: { cle: string; nom: string; type?: string; etat?: string; position?: Position; erreur?: string }[];
  nouvellesSalles?: NouvelleSalle[];
  nouvellesClasses?: NouvelleClasse[];
  /** Ce que l'équipe note sur l'école (état, nom sur place, responsable, « terminée »), à envoyer. */
  constatEcole?: ConstatEcoleSaisi;
  /**
   * L'équipe est devant cette école, que la base met dans un autre département : elle la recense
   * dans ce département de sa mission (gardée dans la mission jusqu'à la décision du contrôle).
   */
  ici?: number;
}
type Presence = "PRESENT" | "ABSENT" | "PARTI" | "INCONNU" | "DECEDE" | "DOUBLON" | "AUSSI_ICI";
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
  { code: "DECEDE", libelle: "Décédé", ton: "text-rouge-700" },
  { code: "DOUBLON", libelle: "Même personne qu’une autre ligne", ton: "text-rouge-700" },
];
/** « Travaille aussi ici » : seulement pour un agent d'une autre école ajouté comme tel. */
const AUSSI_ICI = { code: "AUSSI_ICI" as const, libelle: "Travaille aussi ici (2 écoles)", ton: "text-sky-700" };
const libellePresence = (c: string) => (c === "AUSSI_ICI" ? AUSSI_ICI.libelle : (PRESENCES.find((x) => x.code === c)?.libelle ?? c));
/** Les motifs les plus fréquents, en un toucher (on peut aussi écrire autre chose). */
const MOTIFS: Partial<Record<Presence, string[]>> = {
  ABSENT: ["Congé", "Maladie", "Congé de maternité", "Formation ou stage", "Mission", "Sans justification"],
  PARTI: ["Muté", "Retraité", "Démission", "Abandon de poste", "Parti sans dire où"],
  INCONNU: ["Personne ne le connaît", "Connu, mais jamais venu"],
  DECEDE: ["Date du décès : "],
  AUSSI_ICI: ["Vacations", "Cours dans les deux écoles"],
};
/** Le constat appelle une précision (tout sauf « présent »). */
const avecPrecision = (p: Presence | "" | undefined) => !!p && p !== "PRESENT";
/** L'agent a été vu (constat saisi ici, ou déjà envoyé pendant ce recensement). */
const vu = (l: Ligne) => !!l.presence || !!l.constat;
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
const ecolesTelechargees = (): { id: number; nom: string; enAttente: number; le: string; terminee: boolean; aCorriger: number; vus: number; agents: number }[] => {
  const l: { id: number; nom: string; enAttente: number; le: string; terminee: boolean; aCorriger: number; vus: number; agents: number }[] = [];
  for (const k of cles("ecole:")) {
    const e = lire<Etat>(k);
    if (e) {
      const agents = e.lignes.filter((x) => !x.aussi);
      l.push({ id: e.paquet.ecole.id, nom: e.paquet.ecole.nom, enAttente: aEnvoyer(e).length + photosEnAttente(e), le: e.paquet.telechargeLe, terminee: ecoleTerminee(e), aCorriger: e.lignes.filter((x) => x.erreur).length, vus: agents.filter(vu).length, agents: agents.length });
    }
  }
  // D'abord celles à corriger ou à envoyer, puis les commencées, puis les autres ; les terminées à la fin
  const rang = (x: (typeof l)[number]) => (x.aCorriger ? 0 : x.enAttente ? 1 : x.terminee ? 4 : x.vus ? 2 : 3);
  return l.sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom, "fr"));
};

/** La mission d'un recenseur, gardée sur l'appareil. */
interface MissionT {
  recenseur: boolean;
  code?: string;
  nom?: string;
  departements?: { id: number; nom: string }[];
  fin?: string | null;
  effacerApres?: string | null;
  /** Le jour au serveur (Brazzaville) : la date de l'appareil peut être fausse. */
  aujourdhui?: string;
  /** Le recensement pour lequel il travaille. */
  campagne?: string | null;
}
interface Departement {
  telechargeLe: string;
  departementId: number;
  colonnes: Colonne[];
  statuts: { code: string; libelle: string }[];
  referentiels?: RefsEcole;
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
  return { cle: `a${a.id}`, agentId: a.id, statut: a.statut, statutOrigine: a.statut, valeurs, origine: rattacher ? {} : { ...valeurs }, rattacher, aControler: !!a.aControler, constat: rattacher ? null : (a.constat ?? null) };
}
/** Une ligne a été changée ici (valeurs, statut, constat) : on peut annuler avant l'envoi. */
const modifiee = (l: Ligne) => !l.nouveau && !l.rattacher && (changees(l).length > 0 || l.statut !== l.statutOrigine || !!l.presence);
/** Annuler ce qui a été saisi sur la ligne (avant l'envoi) : elle revient comme la base. */
const annulerLigne = (setEtat: (f: (e: Etat) => Etat) => void, cle: string) =>
  setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === cle ? { ...l, valeurs: { ...l.origine }, statut: l.statutOrigine, presence: "", observation: "", erreur: undefined } : l)) }));
/** Après un envoi réussi : ce qui était saisi devient l'origine, le constat est gardé comme « vu ». */
function apresEnvoi(l: Ligne, r: { id?: number }, s: { valeurs: Record<string, string>; statut: string; presence: string; observation: string }): Ligne {
  const constat = s.presence ? { presence: s.presence as Presence, observation: s.observation || null, par: "vous", le: new Date().toISOString() } : (l.nouveau ? { presence: "PRESENT" as Presence, par: "vous", le: new Date().toISOString() } : l.constat);
  return {
    ...l,
    agentId: r.id ?? l.agentId,
    cle: r.id ? `a${r.id}` : l.cle,
    origine: s.valeurs,
    statutOrigine: s.statut,
    aControler: l.nouveau || l.aControler,
    nouveau: false,
    rattacher: false,
    // (une saisie faite PENDANT l'envoi reste à envoyer)
    presence: (l.presence ?? "") === s.presence ? "" : l.presence,
    observation: (l.presence ?? "") === s.presence ? "" : l.observation,
    constat,
    erreur: undefined,
    semblables: undefined,
    forcer: false,
  };
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
      // « Vient aussi ici » : il garde son école (pas de rattachement)
      structureId: l.nouveau || (l.rattacher && !l.aussi) ? e.paquet.ecole.id : undefined,
      presence: l.presence || undefined,
      observation: l.presence && l.presence !== "PRESENT" ? l.observation?.trim() || undefined : undefined,
      constateLe: l.presence ? l.presenceLe : undefined,
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
      await envoyerConstatEcole(e);
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
/** Les photos de pièces qui attendent l'envoi (pas celles refusées par le serveur). */
const photosEnAttente = (e: Etat) => e.lignes.reduce((n, l) => n + (l.photos?.filter((x) => !x.erreur).length ?? 0), 0);
/** Les lignes à garder telles quelles à la mise à jour de l'école : à envoyer, ou avec des photos. */
const aGarder = (e: Etat) => e.lignes.filter((l) => aEnvoyer(e).includes(l) || !!l.photos?.length);
const enAttenteEcole = (e: Etat) => aEnvoyer(e).length > 0 || photosEnAttente(e) > 0 || !!e.positions.ecole || Object.keys(e.positions.batiments).length > 0 || infraEnAttente(e) > 0 || !!e.constatEcole;
/** L'école est terminée (par cette équipe, en attente d'envoi, ou par une équipe déjà) . */
const ecoleTerminee = (e: Etat) => (e.constatEcole?.terminee !== undefined ? e.constatEcole.terminee : !!e.paquet.ecole.constat?.termineeLe);

/** Envoyer ce que l'équipe a noté sur l'école : il rejoint le paquet (vu par les autres équipes). */
async function envoyerConstatEcole(e: Etat): Promise<Etat> {
  const c = e.constatEcole;
  if (!c) return e;
  await api.post(`/recensement/terrain/ecole/${e.paquet.ecole.id}/constat`, c);
  const avant = e.paquet.ecole.constat;
  const vide = (v?: string) => v?.trim() || null;
  return {
    ...e,
    constatEcole: undefined,
    paquet: {
      ...e.paquet,
      ecole: {
        ...e.paquet.ecole,
        constat: {
          etat: c.etat ?? avant?.etat ?? null,
          nomSurPlace: vide(c.nomSurPlace) ?? avant?.nomSurPlace ?? null,
          responsable: vide(c.responsable) ?? avant?.responsable ?? null,
          telephone: vide(c.telephone) ?? avant?.telephone ?? null,
          observation: vide(c.observation) ?? avant?.observation ?? null,
          termineeLe: c.terminee === undefined ? (avant?.termineeLe ?? null) : c.terminee ? new Date().toISOString() : null,
          par: "vous",
          le: new Date().toISOString(),
        },
      },
    },
  };
}

/** Une erreur du serveur sur un ajout (valeur refusée) : gardée sur la ligne ; sans réseau : on arrête. */
const refusParServeur = (e: unknown) => e instanceof ErreurApi && e.statut !== 0;
const nombreOuNull = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * Envoyer ce qui a été ajouté sur place dans l'école : les bâtiments, puis les salles (qui peuvent
 * être dans un bâtiment ajouté ici), puis les classes (qui peuvent être dans une salle ajoutée
 * ici). Ce qui part rejoint les listes de l'école ; ce que le serveur refuse reste, avec le motif.
 */
/**
 * Envoyer une liste, 6 à la fois (et non une par une : 25 salles = 25 attentes du réseau). Rend,
 * dans l'ordre, la réponse ou l'erreur de chacune.
 */
async function parSix<T, R>(liste: T[], f: (x: T) => Promise<R>): Promise<({ ok: true; r: R } | { ok: false; erreur: unknown })[]> {
  const res: ({ ok: true; r: R } | { ok: false; erreur: unknown })[] = new Array(liste.length);
  let suivant = 0;
  const ouvrier = async () => {
    while (suivant < liste.length) {
      const k = suivant++;
      try {
        res[k] = { ok: true, r: await f(liste[k]) };
      } catch (erreur) {
        res[k] = { ok: false, erreur };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, liste.length) }, ouvrier));
  return res;
}

async function envoyerBatiments(e: Etat): Promise<Etat> {
  let etat = e;
  const ecole = e.paquet.ecole.id;
  // Une coupure du réseau : ce qui est parti est gardé ; le reste repartira (le serveur
  // reconnaît un renvoi : pas de doublon)
  let coupure: unknown = null;
  const batiments = e.nouveauxBatiments ?? [];
  const rb = await parSix(batiments, (b) =>
    api.post<{ id: number; nom: string }>(`/recensement/terrain/ecole/${ecole}/batiments`, {
      cle: b.cle,
      nom: b.nom,
      type: b.type || null,
      etat: b.etat || "BON",
      ...(b.position ? { latitude: b.position.latitude, longitude: b.position.longitude, precision: b.position.precisionGps } : {}),
    }),
  );
  batiments.forEach((b, k) => {
    const x = rb[k];
    if (x.ok) {
      const r = x.r;
      etat = {
        ...etat,
        nouveauxBatiments: (etat.nouveauxBatiments ?? []).filter((y) => y.cle !== b.cle),
        // (les salles mises dans ce bâtiment le désignent maintenant par son numéro)
        nouvellesSalles: (etat.nouvellesSalles ?? []).map((y) => (y.batiment === `cle:${b.cle}` ? { ...y, batiment: `id:${r.id}` } : y)),
        paquet: { ...etat.paquet, batiments: [...etat.paquet.batiments, { id: r.id, nom: b.nom, type: b.type || null, etat: b.etat || "BON", latitude: b.position?.latitude ?? null, longitude: b.position?.longitude ?? null, precisionGps: b.position?.precisionGps ?? null, localiseLe: b.position?.localiseLe ?? null }] },
      };
    } else if (refusParServeur(x.erreur)) etat = { ...etat, nouveauxBatiments: (etat.nouveauxBatiments ?? []).map((y) => (y.cle === b.cle ? { ...y, erreur: (x.erreur as Error).message } : y)) };
    else coupure ??= x.erreur;
  });
  // (dans un bâtiment ajouté ici et pas encore parti : la salle attend avec lui)
  const salles = (etat.nouvellesSalles ?? []).filter((x) => !x.batiment.startsWith("cle:"));
  const rs = await parSix(salles, (x) => api.post<{ id: number }>(`/recensement/terrain/ecole/${ecole}/salles`, { cle: x.cle, nom: x.nom, batimentId: x.batiment ? Number(x.batiment.slice(3)) : null, type: x.type || null, capacite: nombreOuNull(x.capacite), etat: x.etat || "BON" }));
  salles.forEach((x, k) => {
    const y = rs[k];
    if (y.ok) {
      const r = y.r;
      etat = {
        ...etat,
        nouvellesSalles: (etat.nouvellesSalles ?? []).filter((z) => z.cle !== x.cle),
        nouvellesClasses: (etat.nouvellesClasses ?? []).map((c) => (c.salle === `cle:${x.cle}` ? { ...c, salle: `id:${r.id}` } : c)),
        paquet: { ...etat.paquet, listeSalles: [...(etat.paquet.listeSalles ?? []), { id: r.id, nom: x.nom, batimentId: x.batiment ? Number(x.batiment.slice(3)) : null, type: x.type || null, capacite: nombreOuNull(x.capacite), etat: x.etat || "BON" }] },
      };
    } else if (refusParServeur(y.erreur)) etat = { ...etat, nouvellesSalles: (etat.nouvellesSalles ?? []).map((z) => (z.cle === x.cle ? { ...z, erreur: (y.erreur as Error).message } : z)) };
    else coupure ??= y.erreur;
  });
  const classes = (etat.nouvellesClasses ?? []).filter((c) => !c.salle.startsWith("cle:"));
  const rc = await parSix(classes, (c) => api.post<{ id: number }>(`/recensement/terrain/ecole/${ecole}/classes`, { cle: c.cle, niveau: c.niveau, nom: c.nom, salleId: c.salle ? Number(c.salle.slice(3)) : null, effectif: nombreOuNull(c.effectif), effectifFilles: nombreOuNull(c.effectifFilles) }));
  classes.forEach((c, k) => {
    const y = rc[k];
    if (y.ok) {
      const r = y.r;
      etat = {
        ...etat,
        nouvellesClasses: (etat.nouvellesClasses ?? []).filter((z) => z.cle !== c.cle),
        paquet: { ...etat.paquet, listeClasses: [...(etat.paquet.listeClasses ?? []), { id: r.id, niveau: c.niveau, nom: c.nom, salleId: c.salle ? Number(c.salle.slice(3)) : null, effectif: nombreOuNull(c.effectif), effectifFilles: nombreOuNull(c.effectifFilles) }] },
      };
    } else if (refusParServeur(y.erreur)) etat = { ...etat, nouvellesClasses: (etat.nouvellesClasses ?? []).map((z) => (z.cle === c.cle ? { ...z, erreur: (y.erreur as Error).message } : z)) };
    else coupure ??= y.erreur;
  });
  if (coupure) throw coupure;
  return etat;
}
/** L'image gardée en texte (data:…;base64,…) redevient un fichier (sans fetch : la page l'interdit). */
function enOctets(image: string): Uint8Array<ArrayBuffer> {
  const b = atob(image.slice(image.indexOf(",") + 1));
  const o = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
  return o;
}

/** Réduire une photo (1 600 px au plus, JPEG) : légère pour la mémoire et le forfait. */
async function reduireImage(f: File): Promise<string> {
  const img = await createImageBitmap(f);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  img.close();
  return c.toDataURL("image/jpeg", 0.72);
}

/**
 * Envoyer les photos des pièces (6 à la fois), une fois l'agent connu du serveur (un nouvel agent :
 * après sa création). Rend ce qui est parti, ce qui est refusé (avec le motif), et une coupure.
 */
async function envoyerPhotos(e: Etat, ids?: Map<string, number>) {
  const travail = e.lignes.flatMap((l) => {
    const id = l.agentId ?? ids?.get(l.cle) ?? null;
    return id ? (l.photos ?? []).filter((x) => !x.erreur).map((ph) => ({ ph, id })) : [];
  });
  const faites = new Set<string>();
  const refus = new Map<string, string>();
  let coupure: unknown = null;
  if (!travail.length) return { faites, refus, coupure };
  const r = await parSix(travail, async ({ ph, id }) => {
    const fd = new FormData();
    fd.append("type", ph.type);
    fd.append("cle", ph.cle);
    fd.append("ecoleId", String(e.paquet.ecole.id));
    fd.append("fichier", new File([enOctets(ph.image)], `piece-${ph.cle}.jpg`, { type: "image/jpeg" }));
    return api.post(`/recensement/terrain/agent/${id}/piece`, fd);
  });
  travail.forEach((t, k) => {
    const x = r[k];
    if (x.ok) faites.add(t.ph.cle);
    else if (refusParServeur(x.erreur)) refus.set(t.ph.cle, (x.erreur as Error).message);
    else coupure ??= x.erreur;
  });
  return { faites, refus, coupure };
}
/** Les photos parties quittent l'appareil ; les refusées restent, avec le motif. */
const apresPhotos = (e: Etat, r: { faites: Set<string>; refus: Map<string, string> }): Etat => ({
  ...e,
  lignes: e.lignes.map((l) => (l.photos?.length ? { ...l, photos: l.photos.filter((x) => !r.faites.has(x.cle)).map((x) => (r.refus.has(x.cle) ? { ...x, erreur: r.refus.get(x.cle) } : x)) } : l)),
});

/** Ajouts sur l'école (bâtiments, salles, classes) en attente d'envoi. */
const infraEnAttente = (e: Etat) => (e.nouveauxBatiments?.length ?? 0) + (e.nouvellesSalles?.length ?? 0) + (e.nouvellesClasses?.length ?? 0);
/** Une école trouvée sur place mais absente de la liste : gardée sur l'appareil jusqu'à l'envoi. */
interface PropositionEcole {
  cle: string;
  nom: string;
  cycle: string;
  localite: string;
  departementId: number | null;
  agentsSurPlace: string;
  responsable: string;
  telephone: string;
  observation: string;
  latitude?: number | null;
  longitude?: number | null;
  precision?: number | null;
}
async function envoyerPropositions() {
  for (const x of lire<PropositionEcole[]>("propositions") ?? []) {
    await api.post("/recensement/terrain/ecoles-signalees", { ...x, agentsSurPlace: x.agentsSurPlace ? Number(x.agentsSurPlace) : null });
    ecrire(
      "propositions",
      (lire<PropositionEcole[]>("propositions") ?? []).filter((y) => y.cle !== x.cle),
    );
  }
}

let compteEnCours: ReturnType<typeof setTimeout> | undefined;
/** Compter ce qui attend l'envoi (peu après chaque saisie) et le garder hors du coffre. */
function compterEnAttente() {
  clearTimeout(compteEnCours);
  compteEnCours = setTimeout(() => {
    const n = ecolesTelechargees().reduce((t, e) => t + e.enAttente, 0) + (lire<PropositionEcole[]>("propositions")?.length ?? 0);
    void noterEnAttente(n);
  }, 1500);
}

/** L'école ouverte à l'écran : la synchronisation ne la touche pas (on y travaille). */
let ecoleOuverte: number | null = null;
let synchroEnCours: Promise<ResultatSynchro | null> | null = null;
const idsBase = () => cles("base:").filter((k) => /^base:\d+$/.test(k));

/** Ranger une école reçue : prête à compléter (mission) ou en lecture ; les lignes en attente restent. */
function rangerPaquet(brut: PaquetBase, dansMission: boolean): boolean {
  const id = brut.ecole.id;
  if (id === ecoleOuverte) return false;
  // (l'équipe est devant elle, la base la met ailleurs : elle reste dans la mission)
  const mission = dansMission || !!lire<Etat>(`ecole:${id}`)?.ici;
  if (!mission) {
    // (une école qui quitte la mission mais attend encore l'envoi reste prête à compléter)
    const deja = lire<Etat>(`ecole:${id}`);
    if (deja && enAttenteEcole(deja)) return false;
    if (deja) ecrire(`ecole:${id}`, null);
    ecrire(`base:${id}`, brut);
    return true;
  }
  const champs = lire<{ colonnes: Colonne[]; statuts: Paquet["statuts"]; referentiels?: RefsEcole; pieces?: TypePiece[] }>("base:colonnes");
  if (!champs) return false;
  const p: Paquet = { ...brut, colonnes: champs.colonnes, statuts: champs.statuts, referentiels: champs.referentiels, pieces: champs.pieces };
  const deja = lire<Etat>(`ecole:${id}`);
  ecrire(`base:${id}`, null);
  if (!deja) {
    ecrire(`ecole:${id}`, { paquet: p, lignes: p.agents.map((a) => nouvelleLigne(p, a)), positions: { batiments: {} } } satisfies Etat);
    return true;
  }
  // Les lignes en attente gardent ce qu'a saisi l'équipe ; les autres prennent la base à jour
  const attente = aGarder(deja);
  const parAgent = new Map(attente.filter((l) => l.agentId !== null).map((l) => [l.agentId as number, l]));
  const presents = new Set(p.agents.map((a) => a.id));
  const lignes = [...attente.filter((l) => l.agentId === null || !presents.has(l.agentId)), ...p.agents.map((a) => parAgent.get(a.id) ?? nouvelleLigne(p, a))];
  ecrire(`ecole:${id}`, { paquet: p, lignes, positions: deja.positions, nouveauxBatiments: deja.nouveauxBatiments, nouvellesSalles: deja.nouvellesSalles, nouvellesClasses: deja.nouvellesClasses, constatEcole: deja.constatEcole, ici: deja.ici } satisfies Etat);
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
    if (e && !e.ici && !mission.includes(e.paquet.ecole.departementId ?? -1)) {
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
      ecrire("base:colonnes", { colonnes: r.colonnes, statuts: r.statuts, referentiels: r.referentiels, pieces: (r as { pieces?: TypePiece[] }).pieces });
      ecrire("ecoles", [...(lire<EcoleListe[]>("ecoles") ?? []).filter((e) => e.departementId !== d.id), ...r.structures]);
      for (const p of r.paquets) rangerPaquet(p, true);
      ecrire(`departement:${d.id}`, { le: r.telechargeLe, ecoles: r.paquets.length, agents: r.paquets.reduce((n, p) => n + p.agents.length, 0), gardees: 0 });
      fait += r.paquets.filter((p) => !faites.has(p.ecole.id)).reduce((n, p) => n + p.agents.length, 0);
      d.ids.forEach((x) => faites.add(x));
    } else {
      // Les colonnes sont nécessaires avant tout (une mission sans département ? on les prend ici)
      if (!lire("base:colonnes")) {
        const c = await api.get<{ colonnes: Colonne[]; statuts: Paquet["statuts"]; referentiels?: RefsEcole; pieces?: TypePiece[] }>("/recensement/terrain/colonnes");
        ecrire("base:colonnes", { colonnes: c.colonnes, statuts: c.statuts, referentiels: c.referentiels, pieces: c.pieces });
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
  if (etat.constatEcole) etat = await envoyerConstatEcole(etat);
  const modifications = modificationsDe(etat);
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
        return apresEnvoi(l, r, { valeurs: { ...l.valeurs }, statut: l.statut, presence: l.presence ?? "", observation: l.observation ?? "" });
      }),
    };
  }
  const id = e.paquet.ecole.id;
  if (e.positions.ecole) await api.put(`/etablissements/${id}/localisation`, { ...e.positions.ecole, precision: e.positions.ecole.precisionGps });
  for (const [b, pos] of Object.entries(e.positions.batiments)) await api.put(`/etablissements/${id}/batiments/${b}/localisation`, { ...pos, precision: pos.precisionGps });
  if (e.positions.ecole || Object.keys(e.positions.batiments).length) etat = { ...etat, positions: { batiments: {} } };
  etat = await envoyerBatiments(etat);
  if (photosEnAttente(etat)) {
    const r = await envoyerPhotos(etat);
    etat = apresPhotos(etat, r);
    if (r.coupure) throw r.coupure;
  }
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
    await envoyerPropositions().catch(() => undefined);
    try {
      const c = await api.get<{ colonnes: Colonne[]; statuts: Paquet["statuts"]; referentiels?: RefsEcole; pieces?: TypePiece[] }>("/recensement/terrain/colonnes");
      ecrire("base:colonnes", { colonnes: c.colonnes, statuts: c.statuts, referentiels: c.referentiels, pieces: c.pieces });
    } catch {
      /* gardées telles quelles */
    }
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
    compterEnAttente();
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
        if (x.aujourdhui) await noterServeur(x.aujourdhui);
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
  return <CarteMission m={m} info={info} progres={progres} synchro={synchro} enSynchro={enSynchro} erreur={erreur} enLigne={enLigne} synchroniser={synchroniser} charger={charger} />;
}

/** La carte « Ma mission » ; la mission finie et tout envoyé : l'appareil s'efface (date du serveur). */
function CarteMission({
  m,
  info,
  progres,
  synchro,
  enSynchro,
  erreur,
  enLigne,
  synchroniser,
  charger,
}: {
  m: MissionT;
  info: InfoBase | null;
  progres: ProgresBase | null;
  synchro: ResultatSynchro | null;
  enSynchro: boolean;
  erreur: string | null;
  enLigne: boolean;
  synchroniser: () => Promise<void>;
  charger: (toutReprendre: boolean) => Promise<void>;
}) {
  const finie = !!m.effacerApres && !!m.aujourdhui && m.aujourdhui > m.effacerApres;
  const resteAEnvoyer = ecolesTelechargees().reduce((n, e) => n + e.enAttente, 0) + (lire<PropositionEcole[]>("propositions")?.length ?? 0);
  useEffect(() => {
    if (!finie || resteAEnvoyer || !enLigne || enSynchro) return;
    // Mission finie (selon le serveur) et plus rien à envoyer : l'appareil s'efface, et le dit
    void (async () => {
      await api.post("/recensement/terrain/mission/efface", {}).catch(() => undefined);
      await effacerTout();
      window.dispatchEvent(new CustomEvent(APPAREIL_EFFACE, { detail: "Votre mission est terminée et tout a été envoyé : les données de cet appareil ont été effacées. Merci pour votre travail." }));
    })();
  }, [finie, resteAEnvoyer, enLigne, enSynchro]);
  // (le jour du serveur d'abord : la date de l'appareil peut être fausse)
  const aujourdhui = m.aujourdhui ?? new Date().toISOString().slice(0, 10);
  const mesEcoles = ecolesTelechargees();
  const enAttente = mesEcoles.reduce((n, e) => n + e.enAttente, 0);
  const terminees = mesEcoles.filter((e) => e.terminee).length;
  const aCorriger = mesEcoles.reduce((n, e) => n + e.aCorriger, 0);
  const heure = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ");
  const [details, setDetails] = useState(false);
  const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
  const national = lire<Annuaire>("annuaire:national");
  const sansEcole = national?.lignes.filter((l) => !l[2]).length ?? 0;
  const pct = mesEcoles.length ? Math.round((terminees / mesEcoles.length) * 100) : 0;
  return (
    <Carte>
      {progres && <ChargementBase p={progres} />}
      <div className="space-y-2.5 text-[13px]">
        {/* L'essentiel, toujours visible : l'avancement et l'état de l'envoi */}
        <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details} className="flex w-full cursor-pointer items-center gap-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-encre">Ma mission · {(m.departements ?? []).map((d) => d.nom).join(", ") || m.code}</span>
            {info?.complete && mesEcoles.length > 0 && (
              <span className="block text-zinc-600">
                <strong>{terminees}</strong> école(s) terminée(s) sur {mesEcoles.length} · {pct} %
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-marque-700">
            {details ? "Moins" : "Détails"}
            <ChevronDown className={cx("size-4 transition-transform", details && "rotate-180")} />
          </span>
        </button>
        {info?.complete && mesEcoles.length > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-marque-500" style={{ width: `${pct}%` }} />
          </div>
        )}
        {info?.complete && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
            {enSynchro ? (
              <span className="text-marque-700">
                <RefreshCw className="mr-1 inline size-3.5 animate-spin" />
                Synchronisation…
              </span>
            ) : (
              <span className="text-zinc-500">{info.synchro ? `À jour le ${heure(info.synchro)}` : "Pas encore synchronisée"}</span>
            )}
            {enAttente > 0 && <Badge ton="jaune">{enAttente} ligne(s) à envoyer</Badge>}
            {!!synchro?.refusees && <Badge ton="rouge">{synchro.refusees} refusée(s) : à corriger</Badge>}
          </div>
        )}
        {!info?.complete && (
          <div className="space-y-2">
            <Badge ton="jaune">Base du pays pas encore sur l’appareil</Badge>
            <div>
              <Bouton variante="principal" disabled={!enLigne || !!progres} onClick={() => void charger(false)}>
                <Globe2 /> {info?.faites.length ? "Reprendre le téléchargement" : "Télécharger la base du pays"}
              </Bouton>
            </div>
          </div>
        )}
        <RetoursControle enLigne={enLigne} />
        {aCorriger > 0 && <Alerte>{aCorriger} ligne(s) refusée(s) à l’envoi : ouvrez les écoles marquées « à corriger ».</Alerte>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {m.effacerApres && aujourdhui > m.effacerApres && (
          <Alerte>
            Votre mission est terminée.{" "}
            {enAttente ? `${enAttente} ligne(s) ne sont pas encore envoyées : restez connecté au réseau, elles partent seules ; ensuite l’appareil s’effacera.` : "Tout est envoyé : l’appareil va s’effacer."}
          </Alerte>
        )}

        {/* Le reste, à la demande */}
        {details && (
          <div className="space-y-2.5 border-t border-zinc-100 pt-2.5">
            <div>
              <strong>{m.nom}</strong> · {m.code}
              {m.fin ? ` · jusqu’au ${jour(m.fin)}` : ""}
              {m.campagne && <div className="text-zinc-500">Recensement : {m.campagne}</div>}
            </div>
            {info?.complete && (
              <div className="text-zinc-600">
                <Globe2 className="mr-1 inline size-3.5 text-marque-600" />
                Sur l’appareil : {nf(info.ecoles)} écoles, {nf(national?.lignes.length ?? info.agents)} agents (tout le pays)
                {sansEcole ? `, dont ${nf(sansEcole)} sans école dans la base : on les trouve en tapant leur nom` : ""}
                {synchro && (synchro.envoyees || synchro.majEcoles) ? ` · dernière synchro : ${synchro.envoyees} ligne(s) envoyée(s), ${synchro.majEcoles} école(s) mise(s) à jour` : ""}
              </div>
            )}
            <p className="text-[12px] text-zinc-500">
              <MapPinned className="mr-1 inline size-3.5" />
              Votre position est relevée toutes les 5 minutes pendant la mission : laissez la localisation activée.
            </p>
            {m.effacerApres && aujourdhui <= m.effacerApres && (
              <p className={cx("text-[12px]", aujourdhui >= (m.fin ?? "") ? "font-medium text-rouge-700" : "text-zinc-500")}>
                Après le {jour(m.effacerApres)}, cet appareil s’effacera de lui-même, une fois tout envoyé.
              </p>
            )}
            {info?.complete && (
              <div className="flex flex-wrap gap-2">
                <Bouton disabled={!enLigne || enSynchro} onClick={() => void synchroniser()} title="Envoyer ce qui attend et reprendre ce qui a changé (cela se fait aussi tout seul toutes les 5 minutes)">
                  <RefreshCw /> Synchroniser maintenant
                </Bouton>
                <Bouton
                  variante="discret"
                  disabled={!enLigne || !!progres || enSynchro}
                  onClick={() => confirm("Tout retélécharger ? Les lignes qui attendent l’envoi sont gardées.") && void charger(true)}
                  title="Si la base de l’appareil semble fausse : tout reprendre (les lignes en attente ne sont pas touchées)"
                >
                  Tout retélécharger
                </Bouton>
              </div>
            )}
          </div>
        )}
      </div>
    </Carte>
  );
}

interface RetourControle {
  cle: string;
  quoi: string;
  sujet: string;
  ecole: string | null;
  detail: string | null;
  motif: string | null;
  par: string | null;
  le: string | null;
}

/**
 * Ce que le contrôle a refusé ou rejeté du travail de l'équipe, avec le motif (DG, 23/11/2026) :
 * gardé sur l'appareil (lisible sans réseau), les nouveaux d'abord ; « J'ai lu » les range.
 */
function RetoursControle({ enLigne }: { enLigne: boolean }) {
  const [retours, setRetours] = useState<RetourControle[]>(() => lire<{ lignes: RetourControle[] }>("retours")?.lignes ?? []);
  const [vus, setVus] = useState<string[]>(() => lire<string[]>("retours:vus") ?? []);
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    if (!enLigne) return;
    const lireRetours = () =>
      api
        .get<{ le: string; lignes: RetourControle[] }>("/recensement/terrain/retours")
        .then((r) => {
          ecrire("retours", r);
          setRetours(r.lignes);
        })
        .catch(() => undefined);
    void lireRetours();
    window.addEventListener(SYNCHRO_FAITE, lireRetours);
    return () => window.removeEventListener(SYNCHRO_FAITE, lireRetours);
  }, [enLigne]);
  if (!retours.length) return null;
  const nouveaux = retours.filter((r) => !vus.includes(r.cle));
  const liste = [...nouveaux, ...retours.filter((r) => vus.includes(r.cle))];
  const lu = () => {
    const tous = retours.map((r) => r.cle);
    ecrire("retours:vus", tous);
    setVus(tous);
    setOuvert(false);
  };
  return (
    <div className={cx("rounded-xl p-3 ring-1", nouveaux.length ? "bg-or-50 ring-or-200" : "bg-zinc-50 ring-zinc-200")}>
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className="flex w-full cursor-pointer items-center gap-2 text-left">
        <BellRing className={cx("size-4 shrink-0", nouveaux.length ? "text-or-700" : "text-zinc-400")} />
        <span className={cx("min-w-0 flex-1 text-[14px] font-medium", nouveaux.length ? "text-or-900" : "text-zinc-600")}>
          {nouveaux.length ? `${nouveaux.length} retour(s) du contrôle à lire` : `Retours du contrôle (${retours.length})`}
        </span>
        <ChevronDown className={cx("size-4 text-zinc-500 transition-transform", ouvert && "rotate-180")} />
      </button>
      {ouvert && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-2">
            {liste.map((r) => (
              <li key={r.cle} className={cx("rounded-lg bg-white px-3 py-2 text-[13px] ring-1", vus.includes(r.cle) ? "ring-zinc-100" : "ring-or-200")}>
                <div className="font-medium text-rouge-700">{r.quoi}</div>
                <div className="font-medium text-zinc-800">
                  {r.sujet}
                  {r.ecole ? <span className="font-normal text-zinc-500"> · {r.ecole}</span> : null}
                </div>
                {r.detail && <div className="text-zinc-600">Ce qui était corrigé : {r.detail}</div>}
                <div className="text-zinc-700">{r.motif ? `Motif : « ${r.motif} »` : "Sans motif écrit."}</div>
                <div className="text-[12px] text-zinc-400">
                  {[r.par, r.le ? `le ${new Date(r.le).toLocaleDateString("fr-FR")}` : null].filter(Boolean).join(", ")}
                </div>
              </li>
            ))}
          </ul>
          {nouveaux.length > 0 && (
            <Bouton variante="principal" onClick={lu}>
              <CheckCircle2 /> J’ai lu
            </Bouton>
          )}
        </div>
      )}
    </div>
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
  // Recenseur : une école du pays hors de sa mission (base sur l'appareil) ; on dit où elle est
  const indexPays = useMemo(() => {
    if (!recenseur) return [];
    return idsBase()
      .map((k) => lire<PaquetBase>(k)?.ecole)
      .filter((e): e is NonNullable<typeof e> => !!e)
      .map((e) => ({ item: e, prepare: preparer(`${e.nom} ${e.localite ?? ""}`, true) as Prepare }));
  }, [recenseur]);
  const ailleurs = recenseur && q.trim().length >= 3 && trouvees.length < 3 ? chercher(q, indexPays, 5, true).map((x) => x.item) : [];
  // L'équipe est devant une école que la base met dans un autre département
  const [ici, setIci] = useState<{ id: number; nom: string; localite: string | null; departementId: number | null } | null>(null);
  const prendreIci = (id: number, dep: number) => {
    setIci(null);
    const brut = lire<PaquetBase>(`base:${id}`);
    if (!brut || !rangerPaquet(brut, true)) return setErreur("Cette école n’est pas encore sur l’appareil : synchronisez une fois avec le réseau, puis réessayez.");
    const e = lire<Etat>(`ecole:${id}`);
    if (!e) return setErreur("Cette école n’a pas pu être préparée sur l’appareil : synchronisez avec le réseau, puis réessayez.");
    const g = dernierePosition();
    ecrire(`ecole:${id}`, {
      ...e,
      ici: dep,
      constatEcole: {
        ...e.constatEcole,
        correction: { ...e.constatEcole?.correction, departementId: dep, ...(g?.latitude !== undefined && g.longitude !== undefined ? { latitude: g.latitude, longitude: g.longitude, precision: g.precision } : {}) },
      },
    } satisfies Etat);
    setLocales(ecolesTelechargees());
    ouvrir(id);
  };
  // Avant de signaler une école « absente » : est-ce une école déjà dans la base (autre nom, autre lieu) ?
  const semblables = (nom: string) =>
    nom.trim().length < 3
      ? []
      : [...chercher(nom, index.filter((x) => x.item.type === "ETABLISSEMENT"), 4, true).map((x) => x.item), ...(recenseur ? chercher(nom, indexPays, 4, true).map((x) => x.item) : [])].slice(0, 6).map((x) => ({ id: x.id, nom: x.nom, localite: x.localite, departementId: x.departementId }));
  const cestElle = (x: { id: number; nom: string; localite: string | null; departementId: number | null }) => {
    if (lire(`ecole:${x.id}`) || ecoles.some((e) => e.id === x.id)) return void telecharger(x.id);
    setIci(x);
  };
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
      if (deja && enAttenteEcole(deja)) {
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
    if (deja && enAttenteEcole(deja)) return ouvrir(id);
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
          {q.trim().length >= 2 && !trouvees.length && !inspections.length && !ailleurs.length && <Vide>Aucune école ne ressemble à « {q.trim()} ». Essayez un autre mot du nom ou le village. Si elle n’existe vraiment pas dans la liste, signalez-la ci-dessous.</Vide>}
          {!!ailleurs.length && (
            <div className="space-y-1.5 rounded-xl bg-or-50 p-3 text-[13px] ring-1 ring-or-200">
              <div className="font-medium text-or-800">Notée dans un autre département :</div>
              {ailleurs.map((e) => (
                <div key={e.id} className="flex flex-col gap-1.5 text-zinc-700 sm:flex-row sm:items-center">
                  <span className="min-w-0 flex-1">
                    <strong>{e.nom}</strong> · {[e.localite, e.departementId ? nomDepartement(e.departementId) : null].filter(Boolean).join(" · ")}
                  </span>
                  <Bouton onClick={() => setIci(e)}>
                    <MapPinned /> Je suis devant cette école
                  </Bouton>
                </div>
              ))}
            </div>
          )}
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
      <EcoleAbsente enLigne={enLigne} nom={q.trim().length >= 2 && !trouvees.length ? q.trim() : ""} semblables={semblables} cestElle={cestElle} />
      {!recenseur && (
        <Alerte ton="bleu">
          Ce que les équipes envoient (fiches modifiées, agents signalés, écoles) se contrôle dans la page{" "}
          <Link href="/recensement" className="font-medium underline">
            Recensement
          </Link>
          .
        </Alerte>
      )}
      {ici && <ModaleIci ecole={ici} fermer={() => setIci(null)} oui={(dep) => prendreIci(ici.id, dep)} />}
      <Carte titre="Écoles sur cet appareil">
        {!locales.length ? (
          <p className="text-[13px] text-zinc-500">Aucune pour l’instant. Avant de partir en zone sans réseau, téléchargez les écoles de votre itinéraire.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {(toutes ? locales : locales.slice(0, 15)).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => ouvrir(e.id)}>
                  <div className="text-[15px] font-medium">{e.nom}</div>
                  <div className="text-[12px] text-zinc-500">
                    {e.agents ? `${e.vus} agent(s) vu(s) sur ${e.agents}` : "Aucun agent dans la base"} · téléchargée le {new Date(e.le).toLocaleDateString("fr-FR")}
                  </div>
                </button>
                {e.aCorriger > 0 && <Badge ton="rouge">{e.aCorriger} à corriger</Badge>}
                {e.terminee ? <Badge ton="vert">terminée</Badge> : e.vus > 0 ? <Badge ton="bleu">commencée</Badge> : null}
                {e.enAttente ? <Badge ton="jaune">{e.enAttente} à envoyer</Badge> : null}
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

/**
 * Une école que l'équipe trouve sur place mais qui n'est pas dans la liste : elle la signale (nom,
 * cycle, localité, position, nombre d'agents) ; la DGRHAS la crée, elle arrive ensuite sur l'appareil.
 */
type EcoleCourte = { id: number; nom: string; localite: string | null; departementId: number | null };
function EcoleAbsente({ enLigne, nom, semblables, cestElle }: { enLigne: boolean; nom: string; semblables: (nom: string) => EcoleCourte[]; cestElle: (e: EcoleCourte) => void }) {
  // Avant d'envoyer : est-ce une école déjà dans la base (elle serait créée deux fois) ?
  const [verifiees, setVerifiees] = useState<EcoleCourte[] | null>(null);
  const mission = lire<MissionT>("mission");
  const vide = (): PropositionEcole => ({ cle: `p${Date.now()}`, nom, cycle: "", localite: "", departementId: mission?.departements?.[0]?.id ?? null, agentsSurPlace: "", responsable: "", telephone: "", observation: "" });
  const [ouvert, setOuvert] = useState(false);
  const [x, setX] = useState<PropositionEcole>(vide);
  const [attente, setAttente] = useState(() => lire<PropositionEcole[]>("propositions") ?? []);
  const [gps, setGps] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const champ = (k: keyof PropositionEcole) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setX((v) => ({ ...v, [k]: e.target.value }));
  const prendrePosition = async () => {
    setGps(true);
    setErreur(null);
    try {
      const g = await preleverPosition();
      setX((v) => ({ ...v, latitude: g.latitude, longitude: g.longitude, precision: g.precision }));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setGps(false);
    }
  };
  const garder = async (sansVerifier = false) => {
    if (x.nom.trim().length < 3) return setErreur("Écrivez le nom de l’école tel qu’il est sur place.");
    setErreur(null);
    if (!sansVerifier) {
      const s = semblables(x.nom);
      if (s.length) return setVerifiees(s);
    }
    setVerifiees(null);
    const liste = [...(lire<PropositionEcole[]>("propositions") ?? []), { ...x, nom: x.nom.trim().toUpperCase() }];
    ecrire("propositions", liste);
    setAttente(liste);
    setOuvert(false);
    setX(vide());
    if (enLigne) {
      try {
        await envoyerPropositions();
        setAttente(lire<PropositionEcole[]>("propositions") ?? []);
        return setMessage("École signalée à la DGRHAS. Elle la crée, puis l’école arrive sur votre appareil à une prochaine synchronisation : vous recenserez alors ses agents.");
      } catch {
        /* gardée : elle partira à la synchronisation */
      }
    }
    setMessage("École gardée sur l’appareil : elle partira à la DGRHAS au retour du réseau.");
  };
  return (
    <div className="space-y-2">
      {message && <Alerte ton="vert">{message}</Alerte>}
      {!!attente.length && (
        <p className="text-[13px] text-or-800">
          {attente.length} école(s) signalée(s) en attente d’envoi : {attente.map((a) => a.nom).join(", ")}.
        </p>
      )}
      {!ouvert ? (
        <button type="button" className="cursor-pointer text-[13px] font-medium text-marque-700 hover:underline" onClick={() => (setX(vide()), setOuvert(true))}>
          + Une école existe sur place mais n’est pas dans la liste ? La signaler
        </button>
      ) : (
        <Carte titre="Signaler une école absente de la liste">
          <div className="space-y-3">
            {erreur && <Alerte>{erreur}</Alerte>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-zinc-600 sm:col-span-2">
                Nom écrit sur place *
                <Saisie className="mt-1 h-11 w-full text-[15px]" value={x.nom} onChange={champ("nom")} placeholder="Ex. : EPP de Kingoué" />
              </label>
              <label className="block text-[12px] font-medium text-zinc-600">
                Cycle
                <Liste className="mt-1 h-11 w-full text-[15px]" value={x.cycle} onChange={champ("cycle")} options={[{ valeur: "", libelle: "— Je ne sais pas —" }, ...Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle }))]} />
              </label>
              <label className="block text-[12px] font-medium text-zinc-600">
                Village ou quartier
                <Saisie className="mt-1 h-11 w-full text-[15px]" value={x.localite} onChange={champ("localite")} />
              </label>
              {(mission?.departements?.length ?? 0) > 1 && (
                <label className="block text-[12px] font-medium text-zinc-600">
                  Département
                  <Liste className="mt-1 h-11 w-full text-[15px]" value={String(x.departementId ?? "")} onChange={(e) => setX((v) => ({ ...v, departementId: Number(e.target.value) || null }))} options={(mission?.departements ?? []).map((d) => ({ valeur: String(d.id), libelle: d.nom }))} />
                </label>
              )}
              <label className="block text-[12px] font-medium text-zinc-600">
                Nombre d’agents sur place
                <Saisie className="mt-1 h-11 w-full text-[15px]" inputMode="numeric" value={x.agentsSurPlace} onChange={champ("agentsSurPlace")} />
              </label>
              <label className="block text-[12px] font-medium text-zinc-600">
                Responsable (nom)
                <Saisie className="mt-1 h-11 w-full text-[15px]" value={x.responsable} onChange={(e) => setX((v) => ({ ...v, responsable: e.target.value.toUpperCase() }))} />
              </label>
              <label className="block text-[12px] font-medium text-zinc-600">
                Son téléphone
                <Saisie className="mt-1 h-11 w-full text-[15px]" inputMode="tel" value={x.telephone} onChange={champ("telephone")} />
              </label>
              <label className="block text-[12px] font-medium text-zinc-600 sm:col-span-2">
                Observation
                <Saisie className="mt-1 h-11 w-full text-[15px]" value={x.observation} onChange={champ("observation")} placeholder="Ex. : école communautaire ouverte en 2024, 3 classes" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Bouton chargement={gps} onClick={() => void prendrePosition()}>
                <MapPinned /> {x.latitude !== undefined && x.latitude !== null ? "Reprendre la position" : "Prendre la position ici"}
              </Bouton>
              {x.latitude !== undefined && x.latitude !== null && (
                <span className="text-[12px] text-zinc-500">
                  {x.latitude.toFixed(5)}, {x.longitude?.toFixed(5)}
                  {x.precision ? ` (à ${Math.round(x.precision)} m près)` : ""}
                </span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Bouton onClick={() => setOuvert(false)}>Annuler</Bouton>
              <Bouton variante="principal" disabled={x.nom.trim().length < 3} onClick={() => void garder()}>
                <Send /> Signaler cette école
              </Bouton>
            </div>
            {verifiees && (
              <div className="space-y-2 rounded-xl bg-or-50 p-3 text-[14px] ring-1 ring-or-200">
                <p className="font-medium text-or-900">Cette école est peut-être déjà dans notre liste. Est-ce l’une de celles-ci ?</p>
                <ul className="space-y-1.5">
                  {verifiees.map((e) => (
                    <li key={e.id} className="flex flex-col gap-1.5 rounded-lg bg-white px-3 py-2 sm:flex-row sm:items-center">
                      <span className="min-w-0 flex-1">
                        <strong>{e.nom}</strong>
                        <span className="block text-[12px] text-zinc-500">{[e.localite, e.departementId ? nomDepartement(e.departementId) : null].filter(Boolean).join(" · ") || "lieu non noté"}</span>
                      </span>
                      <Bouton onClick={() => (setVerifiees(null), setOuvert(false), cestElle(e))}>Oui, c’est elle</Bouton>
                    </li>
                  ))}
                </ul>
                <Bouton variante="principal" onClick={() => void garder(true)}>
                  Non, aucune : la signaler
                </Bouton>
              </div>
            )}
          </div>
        </Carte>
      )}
    </div>
  );
}

/* ------------------------------ 2. Travailler dans l'école ------------------------------ */

/** Un bâtiment ou une annexe découvert sur place : son nom, son type, son état, et sa position prélevée ici. */
/**
 * Un type pris dans la liste de la DGRHAS, ou « Autre (préciser) » : le recenseur écrit ce qu'il
 * voit, rien n'est refusé faute d'être dans la liste.
 */
function TypeAvecAutre({ valeur, changer, types, vide, nom, className }: { valeur: string; changer: (v: string) => void; types: string[]; vide: string; nom: string; className?: string }) {
  const [autre, setAutre] = useState(() => !!valeur && !types.includes(valeur));
  return (
    <div className="space-y-2">
      <Liste
        className={className}
        aria-label={nom}
        value={autre ? "__autre" : valeur}
        onChange={(e) => {
          const v = e.target.value;
          setAutre(v === "__autre");
          changer(v === "__autre" ? "" : v);
        }}
        options={[{ valeur: "", libelle: vide }, ...types.map((t) => ({ valeur: t, libelle: t })), { valeur: "__autre", libelle: "Autre (préciser)…" }]}
      />
      {autre && <Saisie autoFocus className={className} value={valeur} onChange={(e) => changer(e.target.value)} placeholder="Écrivez le type vu sur place" aria-label={`${nom} : préciser`} />}
    </div>
  );
}

function AjoutBatiment({ refs, ajouter }: { refs?: RefsEcole; ajouter: (b: { cle: string; nom: string; type?: string; etat?: string; position?: Position }) => void }) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [etatB, setEtatB] = useState("BON");
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
    ajouter({ cle: `b${Date.now()}`, nom: nom.trim(), type: type || undefined, etat: etatB, position });
    setNom("");
  };
  return (
    <div className="mb-3 space-y-2">
      <Saisie value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom : Bâtiment B, Annexe…" className="h-11 w-full text-[15px]" aria-label="Nom du nouveau bâtiment" />
      <div className="grid gap-2 sm:grid-cols-2">
        <TypeAvecAutre className="h-11 w-full text-[14px]" valeur={type} changer={setType} types={refs?.typesBatiment ?? []} vide="Type (facultatif)" nom="Type de bâtiment" />
        <Liste className="h-11 w-full text-[14px]" value={etatB} onChange={(e) => setEtatB(e.target.value)} aria-label="État du bâtiment" options={(refs?.etats ?? [{ code: "BON", libelle: "Bon état" }]).map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Bouton variante="principal" chargement={encours} disabled={!nom.trim()} onClick={() => void valider(true)} title="Vous êtes devant ce bâtiment : sa position est prise ici">
          <MapPinned /> Ajouter, avec la position d’ici
        </Bouton>
        <Bouton disabled={!nom.trim() || encours} onClick={() => void valider(false)}>
          <Plus /> Ajouter sans position
        </Bouton>
      </div>
      {encours && <p className="text-[12px] text-marque-700">Recherche de la position…</p>}
      {erreur && <p className="text-[12px] text-rouge-700">{erreur} Ou « Ajouter sans position ».</p>}
    </div>
  );
}

/**
 * L'école comme elle est : ses bâtiments (une annexe est un bâtiment de l'école, même ailleurs),
 * ses salles (dans quel bâtiment, type, capacité, état), et ses classes de l'année (niveau,
 * effectifs, salle). Tout se saisit sur place, même sans réseau, et part avec « Envoyer ».
 */
function Infrastructure({ etat, setEtat, enregistrerPosition }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void; enregistrerPosition: (batiment: number | null) => (pos: { latitude: number | null; longitude: number | null; precision?: number | null }) => Promise<void> }) {
  const p = etat.paquet;
  const refs = lire<{ referentiels?: RefsEcole }>("base:colonnes")?.referentiels ?? p.referentiels;
  const etats = refs?.etats ?? [{ code: "BON", libelle: "Bon état" }];
  const libelleEtat = (c: string) => etats.find((x) => x.code === c)?.libelle ?? c;
  const salles = p.listeSalles ?? [];
  const classes = p.listeClasses ?? [];
  const nb = etat.nouveauxBatiments ?? [];
  const ns = etat.nouvellesSalles ?? [];
  const nc = etat.nouvellesClasses ?? [];
  const niveaux = refs?.niveaux[p.ecole.cycle ?? ""] ?? [];
  const libelleNiveau = (c: string) => niveaux.find((x) => x.code === c)?.libelle ?? c;
  // Les bâtiments et les salles qu'on peut choisir (ceux de la base, et ceux ajoutés ici)
  const choixBatiments = [...p.batiments.map((b) => ({ valeur: `id:${b.id}`, libelle: b.nom })), ...nb.map((b) => ({ valeur: `cle:${b.cle}`, libelle: `${b.nom} (ajouté ici)` }))];
  const choixSalles = [...salles.map((x) => ({ valeur: `id:${x.id}`, libelle: x.nom })), ...ns.map((x) => ({ valeur: `cle:${x.cle}`, libelle: `${x.nom} (ajoutée ici)` }))];
  const nomBatiment = (id: number | null) => p.batiments.find((b) => b.id === id)?.nom;
  const nomSalle = (id: number | null) => salles.find((x) => x.id === id)?.nom;
  const eleves = classes.reduce((n, c) => n + (c.effectif ?? 0), 0) + nc.reduce((n, c) => n + (Number(c.effectif) || 0), 0);
  const filles = classes.reduce((n, c) => n + (c.effectifFilles ?? 0), 0) + nc.reduce((n, c) => n + (Number(c.effectifFilles) || 0), 0);

  // Une salle
  const [salle, setSalle] = useState<Omit<NouvelleSalle, "cle">>({ nom: "", batiment: "", type: "", capacite: "", etat: "BON" });
  const [combien, setCombien] = useState("");
  const ajouterSalles = () => {
    const n = Math.min(50, Math.max(1, Number(combien) || 1));
    const base = salles.length + ns.length;
    const liste: NouvelleSalle[] = Array.from({ length: n }, (_, k) => ({ ...salle, cle: `s${Date.now()}${k}`, nom: n === 1 && salle.nom.trim() ? salle.nom.trim() : `Salle ${base + k + 1}` }));
    setEtat((e) => ({ ...e, nouvellesSalles: [...(e.nouvellesSalles ?? []), ...liste] }));
    setSalle((x) => ({ ...x, nom: "" }));
    setCombien("");
  };
  // Une classe
  const [classe, setClasse] = useState<Omit<NouvelleClasse, "cle">>({ niveau: "", nom: "", salle: "", effectif: "", effectifFilles: "" });
  const nomPropose = (niveau: string) => {
    if (!niveau) return "";
    const deja = classes.filter((c) => c.niveau === niveau).length + nc.filter((c) => c.niveau === niveau).length;
    return deja ? `${libelleNiveau(niveau)} ${deja + 1}` : libelleNiveau(niveau);
  };
  const [erreurClasse, setErreurClasse] = useState<string | null>(null);
  const ajouterClasse = () => {
    if (!classe.niveau) return setErreurClasse("Choisissez le niveau de la classe.");
    const nom = classe.nom.trim() || nomPropose(classe.niveau);
    if ([...classes.map((c) => c.nom), ...nc.map((c) => c.nom)].some((x) => x.toUpperCase() === nom.toUpperCase())) return setErreurClasse(`La classe « ${nom} » existe déjà : donnez-lui un autre nom (ex. ${nom} B).`);
    if (classe.effectif && classe.effectifFilles && Number(classe.effectifFilles) > Number(classe.effectif)) return setErreurClasse("Plus de filles que d’élèves : vérifiez les effectifs.");
    setErreurClasse(null);
    setEtat((e) => ({ ...e, nouvellesClasses: [...(e.nouvellesClasses ?? []), { ...classe, nom, cle: `c${Date.now()}` }] }));
    setClasse((x) => ({ ...x, nom: "", effectif: "", effectifFilles: "" }));
  };
  const retirer = (cle: string) => setEtat((e) => ({ ...e, nouveauxBatiments: (e.nouveauxBatiments ?? []).filter((x) => x.cle !== cle), nouvellesSalles: (e.nouvellesSalles ?? []).filter((x) => x.cle !== cle), nouvellesClasses: (e.nouvellesClasses ?? []).filter((x) => x.cle !== cle) }));
  const Retirer = ({ cle }: { cle: string }) => (
    <button type="button" title="Retirer (pas encore envoyé)" className="cursor-pointer p-1 text-zinc-400 hover:text-rouge-600" onClick={() => retirer(cle)}>
      <Trash2 className="size-4" />
    </button>
  );
  const champ = "mt-1 h-11 w-full text-[15px]";

  return (
    <>
      <Carte titre={`Bâtiments (${p.batiments.length + nb.length})`}>
        <AjoutBatiment refs={refs} ajouter={(b) => setEtat((e) => ({ ...e, nouveauxBatiments: [...(e.nouveauxBatiments ?? []), b] }))} />
        {!!nb.length && (
          <ul className="mb-2 divide-y divide-zinc-100">
            {nb.map((b) => (
              <li key={b.cle} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
                <span className="font-medium">{b.nom}</span>
                <Badge ton="jaune">à envoyer</Badge>
                <span className="text-zinc-500">{[b.type, libelleEtat(b.etat ?? "BON"), b.position ? `${b.position.latitude?.toFixed(5)}, ${b.position.longitude?.toFixed(5)}` : "sans position"].filter(Boolean).join(" · ")}</span>
                {b.erreur && <span className="w-full text-[12px] text-rouge-700">{b.erreur}</span>}
                <Retirer cle={b.cle} />
              </li>
            ))}
          </ul>
        )}
        {!p.batiments.length ? (
          !nb.length && <p className="text-[13px] text-zinc-500">Aucun bâtiment enregistré pour cette école. Une annexe, même ailleurs, est un bâtiment de cette école : ajoutez-la ici, avec sa position.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {p.batiments.map((b) => (
              <li key={b.id} className="space-y-1 py-2.5">
                <div className="text-[14px] font-medium">
                  {b.nom}
                  <span className="ml-2 text-[12px] font-normal text-zinc-500">{[b.type, b.etat ? libelleEtat(b.etat) : null].filter(Boolean).join(" · ")}</span>
                </div>
                <BlocLocalisation compact position={b} enregistrer={enregistrerPosition(b.id)} />
              </li>
            ))}
          </ul>
        )}
      </Carte>

      <Carte titre={`Salles (${salles.length + ns.length})`}>
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[12px] font-medium text-zinc-600">
              Nom
              <Saisie className={champ} value={salle.nom} onChange={(e) => setSalle((x) => ({ ...x, nom: e.target.value }))} placeholder={`Salle ${salles.length + ns.length + 1}`} />
            </label>
            <label className="block text-[12px] font-medium text-zinc-600">
              Dans le bâtiment
              <Liste className={champ} value={salle.batiment} onChange={(e) => setSalle((x) => ({ ...x, batiment: e.target.value }))} options={[{ valeur: "", libelle: choixBatiments.length ? "— Choisir —" : "Aucun bâtiment noté" }, ...choixBatiments]} />
            </label>
            <label className="block text-[12px] font-medium text-zinc-600">
              Type
              <TypeAvecAutre className={champ} valeur={salle.type} changer={(v) => setSalle((x) => ({ ...x, type: v }))} types={(refs?.typesSalle ?? []).filter((t) => t !== "Salle de classe")} vide="Salle de classe" nom="Type de salle" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[12px] font-medium text-zinc-600">
                Places assises
                <Saisie className={champ} inputMode="numeric" value={salle.capacite} onChange={(e) => setSalle((x) => ({ ...x, capacite: e.target.value.replace(/\D/g, "") }))} placeholder="ex. 50" />
              </label>
              <label className="block text-[12px] font-medium text-zinc-600">
                État
                <Liste className={champ} value={salle.etat} onChange={(e) => setSalle((x) => ({ ...x, etat: e.target.value }))} options={etats.map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Bouton variante="principal" onClick={ajouterSalles}>
              <Plus /> {Number(combien) > 1 ? `Ajouter ${Math.min(50, Number(combien))} salles pareilles` : "Ajouter la salle"}
            </Bouton>
            <label className="flex items-center gap-2 text-[13px] text-zinc-600">
              ou plusieurs d’un coup :
              <Saisie className="h-10 w-20 text-center text-[15px]" inputMode="numeric" value={combien} onChange={(e) => setCombien(e.target.value.replace(/\D/g, ""))} placeholder="nb" aria-label="Nombre de salles pareilles" />
            </label>
          </div>
        </div>
        {(!!ns.length || !!salles.length) && (
          <ul className="mt-3 divide-y divide-zinc-100 text-[13px]">
            {ns.map((x) => (
              <li key={x.cle} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{x.nom}</span>
                <Badge ton="jaune">à envoyer</Badge>
                <span className="text-zinc-500">{[choixBatiments.find((b) => b.valeur === x.batiment)?.libelle, x.type || "Salle de classe", x.capacite ? `${x.capacite} places` : null, libelleEtat(x.etat)].filter(Boolean).join(" · ")}</span>
                {x.erreur && <span className="w-full text-[12px] text-rouge-700">{x.erreur}</span>}
                <Retirer cle={x.cle} />
              </li>
            ))}
            {salles.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{x.nom}</span>
                <span className="text-zinc-500">{[nomBatiment(x.batimentId), x.type || "Salle de classe", x.capacite ? `${x.capacite} places` : null, libelleEtat(x.etat)].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Carte>

      <Carte titre={`Classes ${refs?.annee ?? ""} (${classes.length + nc.length})${eleves ? ` · ${eleves} élèves dont ${filles} filles` : ""}`}>
        {!niveaux.length ? (
          <Alerte ton="jaune">{!refs?.niveaux || !Object.keys(refs.niveaux).length ? "La liste des niveaux n’est pas encore sur cet appareil : avec le réseau, revenez aux écoles et touchez « Synchroniser maintenant » (dans « Détails »), puis rouvrez l’école." : "Le cycle de cette école n’est pas connu dans la base : les classes ne peuvent pas être ajoutées ici. Dites-le dans « Ce que vous constatez sur l’école » (ex. « c’est un collège ») ; la DGRHAS corrigera."}</Alerte>
        ) : (
          <div className="space-y-2">
            {erreurClasse && <Alerte>{erreurClasse}</Alerte>}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-zinc-600">
                Niveau
                <Liste className={champ} value={classe.niveau} onChange={(e) => setClasse((x) => ({ ...x, niveau: e.target.value, nom: "" }))} options={[{ valeur: "", libelle: "— Choisir —" }, ...niveaux.map((n) => ({ valeur: n.code, libelle: n.libelle }))]} />
              </label>
              <label className="block text-[12px] font-medium text-zinc-600">
                Nom de la classe
                <Saisie className={champ} value={classe.nom} onChange={(e) => setClasse((x) => ({ ...x, nom: e.target.value }))} placeholder={nomPropose(classe.niveau) || "ex. CM1 A"} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[12px] font-medium text-zinc-600">
                  Élèves
                  <Saisie className={champ} inputMode="numeric" value={classe.effectif} onChange={(e) => setClasse((x) => ({ ...x, effectif: e.target.value.replace(/\D/g, "") }))} placeholder="ex. 62" />
                </label>
                <label className="block text-[12px] font-medium text-zinc-600">
                  dont filles
                  <Saisie className={champ} inputMode="numeric" value={classe.effectifFilles} onChange={(e) => setClasse((x) => ({ ...x, effectifFilles: e.target.value.replace(/\D/g, "") }))} placeholder="ex. 30" />
                </label>
              </div>
              <label className="block text-[12px] font-medium text-zinc-600">
                Dans la salle
                <Liste className={champ} value={classe.salle} onChange={(e) => setClasse((x) => ({ ...x, salle: e.target.value }))} options={[{ valeur: "", libelle: choixSalles.length ? "— Choisir —" : "Aucune salle notée" }, ...choixSalles]} />
              </label>
            </div>
            <Bouton variante="principal" onClick={ajouterClasse}>
              <Plus /> Ajouter la classe
            </Bouton>
          </div>
        )}
        {(!!nc.length || !!classes.length) && (
          <ul className="mt-3 divide-y divide-zinc-100 text-[13px]">
            {nc.map((c) => (
              <li key={c.cle} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{c.nom}</span>
                <Badge ton="jaune">à envoyer</Badge>
                <span className="text-zinc-500">{[libelleNiveau(c.niveau), c.effectif ? `${c.effectif} élèves${c.effectifFilles ? ` dont ${c.effectifFilles} filles` : ""}` : null, choixSalles.find((x) => x.valeur === c.salle)?.libelle].filter(Boolean).join(" · ")}</span>
                {c.erreur && <span className="w-full text-[12px] text-rouge-700">{c.erreur}</span>}
                <Retirer cle={c.cle} />
              </li>
            ))}
            {classes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{c.nom}</span>
                <span className="text-zinc-500">{[libelleNiveau(c.niveau), c.effectif !== null ? `${c.effectif} élèves${c.effectifFilles !== null ? ` dont ${c.effectifFilles} filles` : ""}` : null, nomSalle(c.salleId)].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </>
  );
}

function TravailEcole({ id, enLigne, retour }: { id: number; enLigne: boolean; retour: () => void }) {
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
        compterEnAttente();
        return n;
      }),
    [id],
  );
  const [onglet, setOnglet] = useState<"personnel" | "ecole">("personnel");
  const [vue, setVue] = useState<"grille" | "fiche">(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "fiche" : "grille"));
  const [manques, setManques] = useState(true);
  const [nonVusSeulement, setNonVusSeulement] = useState(false);
  const [fin, setFin] = useState(false);
  // Terminer l'école l'envoie aussitôt (avec le réseau), une fois l'état mis à jour
  const [envoyerApres, setEnvoyerApres] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  // « Envoyé » s'efface seul (le bandeau reste court) ; un refus ou une erreur reste jusqu'au prochain envoi
  useEffect(() => {
    if (message?.ton !== "vert") return;
    const t = setTimeout(() => setMessage(null), 10_000);
    return () => clearTimeout(t);
  }, [message]);

  // « Terminer et envoyer » : l'envoi part une fois l'école marquée terminée (état à jour)
  const envoyerDernier = useRef<() => Promise<void>>(async () => undefined);
  // Oublié de toucher « Envoyer » : l'école ouverte part toute seule toutes les 2 minutes
  const envoiAuto = useRef<() => void>(() => undefined);
  useEffect(() => {
    const t = setInterval(() => envoiAuto.current(), 2 * 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!envoyerApres) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnvoyerApres(false);
    void envoyerDernier.current();
  }, [envoyerApres]);
  if (!etat) return <Alerte>Cette école n’est plus sur l’appareil.</Alerte>;
  const p = etat.paquet;
  const enAttente = aEnvoyer(etat);
  const positionsEnAttente = (etat.positions.ecole ? 1 : 0) + Object.keys(etat.positions.batiments).length + infraEnAttente(etat) + (etat.constatEcole ? 1 : 0) + photosEnAttente(etat);
  // Les agents de l'école (pas ceux qui viennent seulement « aussi ») : combien ont été vus
  const agentsEcole = etat.lignes.filter((l) => !l.aussi);
  const nVus = agentsEcole.filter(vu).length;
  const terminee = ecoleTerminee(etat);
  const listeVue = nonVusSeulement ? etat.lignes.filter((l) => !vu(l) && !l.nouveau) : etat.lignes;

  const envoyer = async () => {
    setEnvoi(true);
    setMessage(null);
    try {
      let faites = 0;
      let erreurs: string[] = [];
      // (le numéro d'un agent créé à cet envoi : ses photos partent ensuite dans sa fiche)
      const nouveauxIds = new Map<string, number>();
      // Ce que l'équipe a noté sur l'école (état, « terminée », ce que la base a de faux) : d'abord
      if (etat.constatEcole) {
        const envoye = etat.constatEcole;
        const apres = await envoyerConstatEcole(etat);
        setEtat((e) => ({ ...e, constatEcole: e.constatEcole === envoye ? undefined : e.constatEcole, paquet: { ...e.paquet, ecole: { ...e.paquet.ecole, constat: apres.paquet.ecole.constat } } }));
      }
      if (enAttente.length) {
        const modifications = modificationsDe(etat);
        // Ce qui part : une saisie faite PENDANT l'envoi ne doit pas passer pour envoyée
        const parties = new Map(enAttente.map((l) => [l.cle, { valeurs: { ...l.valeurs }, statut: l.statut, presence: l.presence ?? "", observation: l.observation ?? "", nom: l.valeurs.NOMS_PRENOMS }]));
        const { resultats } = await api.post<{ resultats: { cle: string; ok: boolean; id?: number; erreur?: string; semblables?: Semblable[] }[] }>("/recensement/terrain/envoyer", { modifications });
        const parCle = new Map(resultats.map((r) => [r.cle, r]));
        for (const r of resultats) if (r.ok && r.id) nouveauxIds.set(r.cle, r.id);
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
            return apresEnvoi(l, r, s);
          }),
        }));
      }
      // Les positions prélevées sans connexion
      if (etat.positions.ecole) await api.put(`/etablissements/${p.ecole.id}/localisation`, { ...etat.positions.ecole, precision: etat.positions.ecole.precisionGps });
      for (const [b, pos] of Object.entries(etat.positions.batiments)) await api.put(`/etablissements/${p.ecole.id}/batiments/${b}/localisation`, { ...pos, precision: pos.precisionGps });
      if (etat.positions.ecole || Object.keys(etat.positions.batiments).length) setEtat((e) => ({ ...e, positions: { batiments: {} } }));
      if (infraEnAttente(etat)) {
        const apres = await envoyerBatiments(etat);
        setEtat((e) => ({
          ...e,
          nouveauxBatiments: apres.nouveauxBatiments,
          nouvellesSalles: apres.nouvellesSalles,
          nouvellesClasses: apres.nouvellesClasses,
          paquet: { ...e.paquet, batiments: apres.paquet.batiments, listeSalles: apres.paquet.listeSalles, listeClasses: apres.paquet.listeClasses },
        }));
        const refus = [...(apres.nouveauxBatiments ?? []), ...(apres.nouvellesSalles ?? []), ...(apres.nouvellesClasses ?? [])].filter((x) => x.erreur);
        if (refus.length) erreurs = [...erreurs, ...refus.map((x) => `${x.nom} : ${x.erreur}`)];
      }
      // Les photos des pièces, dans la fiche de chaque agent
      if (photosEnAttente(etat)) {
        const r = await envoyerPhotos(etat, nouveauxIds);
        setEtat((e) => apresPhotos(e, r));
        if (r.refus.size) erreurs = [...erreurs, ...[...r.refus.values()].map((m) => `Photo : ${m}`)];
        if (r.coupure) throw r.coupure;
      }
      setMessage(
        erreurs.length
          ? { ton: "jaune", texte: `${faites} ligne(s) envoyée(s). ${erreurs.length} à corriger (en rouge) : ${erreurs.slice(0, 3).join(" ; ")}${erreurs.length > 3 ? "…" : ""}` }
          : { ton: "vert", texte: `Envoyé : ${faites} agent(s)${positionsEnAttente ? ` et ${positionsEnAttente} information(s) sur l’école (position, bâtiments, salles, classes, état)` : ""}. Les modifications partent au contrôle, comme au recensement ; les agents nouveaux, au contrôle puis au DG.` },
      );
    } catch (e) {
      setMessage({ ton: "rouge", texte: `${(e as Error).message} — rien n’est perdu : tout reste sur l’appareil, réessayez plus tard.` });
    } finally {
      setEnvoi(false);
    }
  };

  // (la dernière version d'« envoyer », pour l'envoi demandé par « Terminer et envoyer », et
  // pour l'envoi automatique : seulement s'il y a quelque chose à envoyer et pas d'envoi en cours)
  // eslint-disable-next-line react-hooks/refs
  envoyerDernier.current = envoyer;
  // eslint-disable-next-line react-hooks/refs
  envoiAuto.current = () => {
    if (navigator.onLine && !envoi && (enAttente.length || positionsEnAttente)) void envoyer();
  };

  const recharger = async () => {
    if ((enAttente.length || photosEnAttente(etat)) && !confirm("Des lignes ou des photos ne sont pas envoyées : elles seront perdues si vous rechargez l’école. Continuer ?")) return;
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
          <Bouton variante="discret" onClick={retour} aria-label="Écoles" title="Revenir à la liste des écoles">
            <ArrowLeft /> <span className="hidden sm:inline">Écoles</span>
          </Bouton>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[15px] leading-tight font-semibold sm:truncate sm:text-[17px]">{p.ecole.nom}</div>
            <div className="truncate text-[12px] text-zinc-500">
              {[p.ecole.inspection, p.ecole.localite, `${p.ecole.posteResponsable} : ${p.ecole.responsable ?? "poste vacant"}`].filter(Boolean).join(" · ")}
            </div>
          </div>
          {/* (sur téléphone : seulement quand il n'y a pas de réseau) */}
          <span className={cx(enLigne && "hidden sm:inline-flex")}>
            <Reseau enLigne={enLigne} />
          </span>
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
              { valeur: "ecole", libelle: <><span className="sm:hidden">L’école</span><span className="hidden sm:inline">L’école : bâtiments, salles, classes</span></> },
            ]}
          />
          {onglet === "personnel" && (
            <>
              <button
                type="button"
                onClick={() => setNonVusSeulement((v) => !v)}
                title="Un agent est « vu » quand vous avez choisi ce que vous constatez (présent, absent…). Touchez pour ne montrer que ceux qui restent."
                className={cx(
                  "cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium ring-1",
                  nonVusSeulement ? "bg-or-400 text-zinc-900 ring-or-400" : nVus === agentsEcole.length ? "bg-marque-50 text-marque-700 ring-marque-200" : "bg-or-50 text-or-800 ring-or-200",
                )}
              >
                {nonVusSeulement ? `Seulement les ${agentsEcole.length - nVus} pas encore vus · tout montrer` : `Vus : ${nVus} / ${agentsEcole.length}`}
              </button>
              {/* (sur téléphone : une personne à la fois, la grille ne tient pas) */}
              <span className="hidden sm:inline-flex">
                <Segments
                  valeur={vue}
                  changer={setVue}
                  options={[
                    { valeur: "grille", libelle: "Grille" },
                    { valeur: "fiche", libelle: "Une personne à la fois" },
                  ]}
                />
              </span>
              <label className="hidden cursor-pointer items-center gap-1.5 text-[12px] text-zinc-600 sm:flex">
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

      <LoinDeLEcole ecole={p.ecole} />
      {terminee && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-marque-50 px-4 py-2.5 text-[13px] text-marque-800 ring-1 ring-marque-100">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <strong>École terminée</strong>
            {etat.constatEcole?.terminee ? " : elle partira avec « Envoyer »." : p.ecole.constat?.termineeLe ? ` le ${new Date(p.ecole.constat.termineeLe).toLocaleDateString("fr-FR")}${p.ecole.constat.par ? ` par ${p.ecole.constat.par}` : ""}.` : "."} On peut encore la compléter.
          </span>
          <Bouton variante="discret" onClick={() => setEtat((e) => ({ ...e, constatEcole: { ...e.constatEcole, terminee: false } }))}>
            Rouvrir
          </Bouton>
        </div>
      )}
      {onglet === "personnel" ? (
        <>
          <AjoutAgent etat={etat} setEtat={setEtat} enLigne={enLigne} />
          {!etat.lignes.length ? (
            <Vide>Aucun agent rattaché à cette école dans nos bases : ajoutez-les ci-dessus.</Vide>
          ) : !listeVue.length ? (
            <Vide>Tous les agents de cette école ont été vus.</Vide>
          ) : vue === "grille" ? (
            <Grille etat={etat} lignes={listeVue} setEtat={setEtat} manques={manques} />
          ) : (
            <UnePersonne etat={etat} lignes={listeVue} setEtat={setEtat} manques={manques} />
          )}
          {!terminee && (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Bouton onClick={() => setFin(true)}>
                <CheckCircle2 /> J’ai fini cette école
              </Bouton>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <BienNotee etat={etat} setEtat={setEtat} />
          <ConstatSurEcole etat={etat} setEtat={setEtat} />
          <Carte titre="Localisation de l’école">
            <BlocLocalisation position={p.ecole} enregistrer={enregistrerPosition(null)} />
            {etat.positions.ecole && <p className="mt-1 text-[12px] text-or-700">Prélevée sans connexion : elle partira avec « Envoyer ».</p>}
          </Carte>
          <Infrastructure etat={etat} setEtat={setEtat} enregistrerPosition={enregistrerPosition} />
          {!terminee && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Bouton onClick={() => setFin(true)}>
                <CheckCircle2 /> J’ai fini cette école
              </Bouton>
            </div>
          )}
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
      {fin && (
        <FinEcole
          etat={etat}
          fermer={() => setFin(false)}
          voirNonVus={() => {
            setFin(false);
            setOnglet("personnel");
            setNonVusSeulement(true);
          }}
          terminer={(etatEcole) => {
            setFin(false);
            setEtat((e) => ({ ...e, constatEcole: { ...e.constatEcole, etat: e.constatEcole?.etat ?? e.paquet.ecole.constat?.etat ?? etatEcole, terminee: true } }));
            if (enLigne) setEnvoyerApres(true);
            else setMessage({ ton: "jaune", texte: "École terminée et gardée sur l’appareil : elle partira toute seule au retour du réseau (ou avec « Envoyer »)." });
          }}
        />
      )}
    </div>
  );
}

/** Distance à vol d'oiseau, en kilomètres. */
function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.latitude - a.latitude) / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * L'appareil est loin de l'école ouverte (d'après sa dernière position, de moins de 30 minutes) :
 * le recenseur n'est peut-être pas dans la bonne école (deux écoles au même nom), ou l'école a
 * déménagé. On le dit, sans bloquer.
 */
function LoinDeLEcole({ ecole }: { ecole: Paquet["ecole"] }) {
  // (lue une fois à l'ouverture de l'école : une position de plus de 30 minutes ne compte pas)
  const [ici] = useState(() => {
    const r = dernierePosition();
    return r && Date.now() - new Date(r.le).getTime() <= 30 * 60_000 && (r.precision ?? 0) <= 1000 ? r : null;
  });
  if (!ici?.latitude || !ici.longitude || ecole.latitude === null || ecole.latitude === undefined || ecole.longitude === null || ecole.longitude === undefined) return null;
  const d = distanceKm({ latitude: ici.latitude, longitude: ici.longitude }, { latitude: ecole.latitude, longitude: ecole.longitude });
  if (d < 3) return null;
  return (
    <Alerte ton="jaune">
      Vous semblez être à <strong>{d < 20 ? d.toFixed(1) : Math.round(d)} km</strong> de « {ecole.nom} » (position enregistrée de l’école). Vérifiez que vous êtes dans la bonne école. Si l’école a déménagé, dites-le dans l’onglet « L’école » et reprenez sa position.
    </Alerte>
  );
}

const ETATS_ECOLE: { code: string; libelle: string }[] = [
  { code: "FONCTIONNE", libelle: "L’école fonctionne" },
  { code: "FERMEE", libelle: "Fermée (plus de classes)" },
  { code: "INTROUVABLE", libelle: "Introuvable à cet endroit" },
  { code: "DEMENAGEE", libelle: "A déménagé" },
  { code: "AUTRE", libelle: "Autre (dites-le ci-dessous)" },
];

/** Ce que l'équipe constate sur l'école elle-même : la DGRHAS vérifie et corrige la fiche de l'école. */
/** Les départements du pays (copie des référentiels gardée par la coquille). */
function tousDepartements(): { id: number; nom: string }[] {
  try {
    const r = JSON.parse(localStorage.getItem("dgrhas.referentiels") ?? "{}") as { departements?: { id: number; nom: string }[] };
    return r.departements ?? [];
  } catch {
    return [];
  }
}

/** « Vous êtes devant cette école ? » : une école que la base met dans un autre département. */
function ModaleIci({ ecole, fermer, oui }: { ecole: { nom: string; localite: string | null; departementId: number | null }; fermer: () => void; oui: (dep: number) => void }) {
  const deps = lire<MissionT>("mission")?.departements ?? [];
  const [dep, setDep] = useState<number | null>(deps[0]?.id ?? null);
  return (
    <Modale titre={"Vous êtes devant cette école ?"} ouverte fermer={fermer}>
      <div className="space-y-3 text-[15px]">
        <p>
          Notre base place <strong>{ecole.nom}</strong> à {[ecole.localite, ecole.departementId ? nomDepartement(ecole.departementId) : null].filter(Boolean).join(", ") || "un autre endroit"}.
        </p>
        <p>Si elle est ici, devant vous, recensez-la. La DGRHAS corrigera sa place dans la base.</p>
        {deps.length > 1 && (
          <label className="block text-[13px] font-medium text-zinc-600">
            Dans quel département êtes-vous ?
            <Liste className="mt-1 h-11 w-full text-[15px]" value={String(dep ?? "")} onChange={(e) => setDep(Number(e.target.value) || null)} options={deps.map((d) => ({ valeur: String(d.id), libelle: d.nom }))} />
          </label>
        )}
        {!deps.length && <Alerte ton="jaune">Votre mission n’est pas encore sur l’appareil : connectez-vous une fois avec le réseau.</Alerte>}
        <div className="grid grid-cols-2 gap-2">
          <Bouton onClick={fermer}>Non</Bouton>
          <Bouton variante="principal" disabled={!dep} onClick={() => dep && oui(dep)}>
            Oui, je suis devant
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/**
 * « Les informations sur l'école sont-elles exactes ? » (DG, 23/11/2026 : la base peut se tromper de localité, de
 * département…) : ce que dit la base, une question simple ; s'il y a une erreur, l'équipe choisit ce
 * qu'elle voit. Rien n'est changé avant le contrôle de la DGRHAS.
 */
function BienNotee({ etat, setEtat }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void }) {
  const e = etat.paquet.ecole;
  const corr = etat.constatEcole?.correction;
  const [mode, setMode] = useState<"question" | "juste" | "corriger">(corr ? "corriger" : "question");
  const deps = tousDepartements();
  const depVu = corr?.departementId ?? e.departementId;
  const ecoles = lire<EcoleListe[]>("ecoles") ?? [];
  const inspections = ecoles.filter((x) => x.type === "INSPECTION" && x.departementId === depVu);
  // Les localités connues de ce département (écoles sur l'appareil)
  const localites = useMemo(() => {
    const l = new Set<string>();
    for (const x of ecoles) if (x.departementId === depVu && x.localite) l.add(x.localite);
    for (const k of idsBase()) {
      const b = lire<PaquetBase>(k)?.ecole;
      if (b?.departementId === depVu && b.localite) l.add(b.localite);
    }
    return [...l].sort((a, b) => a.localeCompare(b, "fr"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depVu]);
  const base = { localite: e.localite ?? "", departementId: e.departementId, cycle: e.cycle ?? "" };
  const maj = (k: keyof CorrectionEcole, v: string | number | undefined) =>
    setEtat((s) => {
      const c: CorrectionEcole = { ...s.constatEcole?.correction };
      const pareil = v === undefined || v === "" || (k === "localite" && String(v).trim().toUpperCase() === base.localite.trim().toUpperCase()) || (k === "departementId" && v === base.departementId) || (k === "cycle" && v === base.cycle);
      if (pareil) delete c[k];
      else (c as Record<string, unknown>)[k] = v;
      // Le département change : l'inspection choisie n'en est plus forcément
      if (k === "departementId") delete c.inspectionId;
      // (une école « ici » garde le département de la mission)
      if (s.ici) c.departementId = c.departementId ?? s.ici;
      const g = dernierePosition();
      if (g?.latitude !== undefined && g.longitude !== undefined) Object.assign(c, { latitude: g.latitude, longitude: g.longitude, precision: g.precision });
      const reste = c.localite !== undefined || c.departementId !== undefined || c.inspectionId !== undefined || c.cycle !== undefined;
      return { ...s, constatEcole: { ...s.constatEcole, correction: reste ? c : undefined } };
    });
  const lignes: [string, string][] = [
    ["Localité", e.localite || "non notée"],
    ["Département", e.departementId ? nomDepartement(e.departementId) : "non noté"],
    ["Inspection", e.inspection || "non notée"],
    ["Cycle", e.cycle ? (CYCLES[e.cycle as keyof typeof CYCLES] ?? e.cycle) : "non noté"],
  ];
  return (
    <Carte titre={"Les informations sur l’école sont-elles exactes ?"}>
      <div className="space-y-3 text-[14px]">
        <div>
          <p className="mb-1 text-[13px] text-zinc-500">Notre base dit :</p>
          <ul className="space-y-0.5">
            {lignes.map(([k, v]) => (
              <li key={k}>
                <span className="text-zinc-500">{k} :</span> <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </div>
        {mode === "question" && (
          <div className="grid grid-cols-2 gap-2">
            <Bouton onClick={() => setMode("juste")}>
              <CheckCircle2 /> Oui, c’est exact
            </Bouton>
            <Bouton onClick={() => setMode("corriger")}>Non, il y a une erreur</Bouton>
          </div>
        )}
        {mode === "juste" && (
          <p className="flex items-center gap-2 text-marque-700">
            <CheckCircle2 className="size-4" /> Merci, tout est exact.{" "}
            <button type="button" className="cursor-pointer text-[13px] text-zinc-500 underline" onClick={() => setMode("corriger")}>
              En fait, il y a une erreur
            </button>
          </p>
        )}
        {mode === "corriger" && (
          <div className="space-y-3">
            <p className="text-[13px] text-zinc-600">Changez seulement ce qui est faux. La DGRHAS vérifiera, puis corrigera la base.</p>
            <label className="block text-[13px] font-medium text-zinc-700">
              Dans quelle localité est l’école ?
              <TypeAvecAutre className="mt-1 h-11 w-full text-[15px]" valeur={corr?.localite ?? e.localite ?? ""} changer={(v) => maj("localite", v.trim())} types={localites} vide="— Choisir —" nom="Localité de l’école" />
            </label>
            <label className="block text-[13px] font-medium text-zinc-700">
              Dans quel département ?
              <Liste className="mt-1 h-11 w-full text-[15px]" disabled={!!etat.ici} value={String(depVu ?? "")} onChange={(x) => maj("departementId", Number(x.target.value) || undefined)} options={[{ valeur: "", libelle: "— Choisir —" }, ...deps.map((d) => ({ valeur: String(d.id), libelle: d.nom }))]} />
            </label>
            <label className="block text-[13px] font-medium text-zinc-700">
              De quelle inspection dépend-elle ?
              <Liste className="mt-1 h-11 w-full text-[15px]" value={String(corr?.inspectionId ?? "")} onChange={(x) => maj("inspectionId", Number(x.target.value) || undefined)} options={[{ valeur: "", libelle: inspections.length ? "— Je ne sais pas / pas de changement —" : "— Je ne sais pas —" }, ...inspections.map((i) => ({ valeur: String(i.id), libelle: i.nom }))]} />
            </label>
            <label className="block text-[13px] font-medium text-zinc-700">
              Quel cycle ?
              <Liste className="mt-1 h-11 w-full text-[15px]" value={corr?.cycle ?? e.cycle ?? ""} onChange={(x) => maj("cycle", x.target.value)} options={[{ valeur: "", libelle: "— Je ne sais pas —" }, ...Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle }))]} />
            </label>
            {corr ? (
              <p className="text-[13px] text-or-800">Correction gardée : elle partira avec « Envoyer ».</p>
            ) : (
              <p className="text-[13px] text-zinc-500">Rien de changé pour l’instant.</p>
            )}
            {!etat.ici && (
              <button
                type="button"
                className="cursor-pointer text-[13px] text-zinc-500 underline"
                onClick={() => {
                  setEtat((s) => ({ ...s, constatEcole: { ...s.constatEcole, correction: undefined } }));
                  setMode("juste");
                }}
              >
                Finalement, tout est exact
              </button>
            )}
          </div>
        )}
      </div>
    </Carte>
  );
}

function ConstatSurEcole({ etat, setEtat }: { etat: Etat; setEtat: (f: (e: Etat) => Etat) => void }) {
  const serveur = etat.paquet.ecole.constat;
  const saisi = etat.constatEcole;
  const v = (k: "etat" | "nomSurPlace" | "responsable" | "telephone" | "observation") => saisi?.[k] ?? serveur?.[k] ?? "";
  const changer = (k: "etat" | "nomSurPlace" | "responsable" | "telephone" | "observation", x: string) => setEtat((e) => ({ ...e, constatEcole: { ...e.constatEcole, [k]: x } }));
  return (
    <Carte titre="Ce que vous constatez sur l’école" actions={saisi ? <Badge ton="jaune">à envoyer</Badge> : serveur ? <Badge ton="vert">envoyé</Badge> : undefined}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[12px] font-medium text-zinc-600 sm:col-span-2">
          L’école aujourd’hui
          <Liste className="mt-1 h-11 w-full text-[15px]" value={v("etat")} onChange={(e) => changer("etat", e.target.value)} options={[{ valeur: "", libelle: "— Choisir —" }, ...ETATS_ECOLE.map((x) => ({ valeur: x.code, libelle: x.libelle }))]} />
        </label>
        <label className="block text-[12px] font-medium text-zinc-600 sm:col-span-2">
          Nom écrit sur place (seulement s’il est différent de « {etat.paquet.ecole.nom} »)
          <Saisie className="mt-1 h-11 w-full text-[15px]" value={v("nomSurPlace")} onChange={(e) => changer("nomSurPlace", e.target.value)} placeholder="Ex. : EPP Moukondo II" />
        </label>
        <label className="block text-[12px] font-medium text-zinc-600">
          {etat.paquet.ecole.posteResponsable} trouvé sur place
          <Saisie className="mt-1 h-11 w-full text-[15px]" value={v("responsable")} onChange={(e) => changer("responsable", e.target.value.toUpperCase())} placeholder={etat.paquet.ecole.responsable ? `Dans la base : ${etat.paquet.ecole.responsable}` : "Nom et prénoms"} />
        </label>
        <label className="block text-[12px] font-medium text-zinc-600">
          Son téléphone
          <Saisie className="mt-1 h-11 w-full text-[15px]" inputMode="tel" value={v("telephone")} onChange={(e) => changer("telephone", e.target.value)} placeholder="06 000 00 00" />
        </label>
        <label className="block text-[12px] font-medium text-zinc-600 sm:col-span-2">
          Observation
          <Saisie className="mt-1 h-11 w-full text-[15px]" value={v("observation")} onChange={(e) => changer("observation", e.target.value)} placeholder="Ex. : les cours ont lieu dans l’église ; deux salles effondrées…" />
        </label>
      </div>
      <p className="mt-2 text-[12px] text-zinc-500">Tout part avec « Envoyer ». La DGRHAS vérifie, puis corrige la fiche de l’école.</p>
    </Carte>
  );
}

/** « J'ai fini cette école » : ce qui reste avant de la déclarer terminée, dit clairement. */
function FinEcole({ etat, fermer, voirNonVus, terminer }: { etat: Etat; fermer: () => void; voirNonVus: () => void; terminer: (etatEcole: string) => void }) {
  const p = etat.paquet;
  const nonVus = etat.lignes.filter((l) => !l.aussi && !l.nouveau && !vu(l));
  const localisee = (p.ecole.latitude !== null && p.ecole.latitude !== undefined) || !!etat.positions.ecole;
  const dejaEtat = etat.constatEcole?.etat ?? p.ecole.constat?.etat ?? "";
  const [etatEcole, setEtatEcole] = useState(dejaEtat || "FONCTIONNE");
  const aCorriger = etat.lignes.filter((l) => l.erreur).length;
  return (
    <Modale titre={`Terminer « ${p.ecole.nom} » ?`} ouverte fermer={fermer}>
      <div className="space-y-3 text-[14px]">
        {nonVus.length ? (
          <div className="rounded-xl bg-or-50 p-3 ring-1 ring-or-200">
            <p className="font-medium text-or-800">{nonVus.length} agent(s) de la liste n’ont pas de constat.</p>
            <p className="mt-1 text-[13px] text-or-800">
              Dans le bilan, ils compteront comme « non vus » (à vérifier par la DGRHAS). S’ils ne sont pas là, dites-le : absent ce jour, parti, inconnu ici…
            </p>
            <p className="mt-1 text-[12px] text-zinc-600">
              {nonVus
                .slice(0, 8)
                .map((l) => l.valeurs.NOMS_PRENOMS)
                .join(" · ")}
              {nonVus.length > 8 ? ` · et ${nonVus.length - 8} autre(s)` : ""}
            </p>
            <Bouton className="mt-2" onClick={voirNonVus}>
              Les voir et les compléter
            </Bouton>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-marque-700">
            <CheckCircle2 className="size-4" /> Tous les agents de la liste ont été vus.
          </p>
        )}
        {!localisee && <p className="text-[13px] text-or-800">L’école n’est pas encore localisée : onglet « L’école », « Prélever la localisation », devant l’entrée.</p>}
        {!!aCorriger && <p className="text-[13px] text-rouge-700">{aCorriger} ligne(s) en rouge sont à corriger.</p>}
        <label className="block text-[12px] font-medium text-zinc-600">
          L’école aujourd’hui
          <Liste className="mt-1 h-11 w-full text-[15px]" value={etatEcole} onChange={(e) => setEtatEcole(e.target.value)} options={ETATS_ECOLE.map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
        </label>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Bouton onClick={fermer}>Revenir compléter</Bouton>
          <Bouton variante="principal" onClick={() => terminer(etatEcole)}>
            <CheckCircle2 /> {nonVus.length ? "Terminer quand même et envoyer" : "Terminer et envoyer"}
          </Bouton>
        </div>
      </div>
    </Modale>
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
  const rattacher = async (id: number, hors?: LigneAnnuaire, aussi = false) => {
    // « Vient aussi ici » : il garde son école ; on note qu'il travaille aussi dans celle-ci
    const marquer = (l: Ligne): Ligne => (aussi ? { ...l, aussi: true, presence: "AUSSI_ICI", presenceLe: new Date().toISOString() } : l);
    // Son école est sur l'appareil (même département) : sa fiche complète, sans réseau
    const locale = ficheLocale(id);
    if (locale) {
      setEtat((e) => ({ ...e, lignes: [marquer(nouvelleLigne(e.paquet, locale, true)), ...e.lignes] }));
      setQ("");
      return;
    }
    try {
      if (!navigator.onLine && hors) throw new Error("hors ligne");
      const f = await api.get<{ agent: { id: number; nomComplet: string; statut: string; matricule: string | null; donnees: Record<string, unknown> } }>(`/recensement/terrain/agent/${id}`);
      setEtat((e) => ({ ...e, lignes: [marquer(nouvelleLigne(e.paquet, f.agent, true)), ...e.lignes] }));
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
      setEtat((e) => ({ ...e, lignes: [marquer(nouvelleLigne(e.paquet, agent, true)), ...e.lignes] }));
    }
    setQ("");
  };
  const nouveau = () => {
    const valeurs = Object.fromEntries(p.colonnes.map((c) => [c.code, c.code === "NOMS_PRENOMS" ? q.trim().toUpperCase() : ""]));
    // (le statut se choisit : jamais « fonctionnaire » par défaut sans que personne l'ait dit)
    setEtat((e) => ({ ...e, lignes: [{ cle: `n${Date.now()}`, agentId: null, statut: "", statutOrigine: "", valeurs, origine: {}, nouveau: true }, ...e.lignes] }));
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
            <div key={`an${l[0]}`} data-resultat={l[0]} className="flex flex-col gap-2 rounded-xl bg-zinc-50 px-3 py-2 sm:flex-row sm:items-center">
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
              <ChoixRattachement ici={() => void rattacher(l[0], l)} aussi={() => void rattacher(l[0], l, true)} />
            </div>
          ))}
          {(enLigne && q.trim().length >= 3 ? resultats.filter((r) => !dansAnnuaire.some((l) => l[0] === r.id)) : []).map((r) => (
            <div key={r.id} data-resultat={r.id} className="flex flex-col gap-2 rounded-xl bg-zinc-50 px-3 py-2 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1">
                <strong>{r.nomComplet}</strong> <span className="text-zinc-500">· {r.structureNom ?? "sans école"}{r.matricule ? ` · ${r.matricule}` : ""}</span>
              </span>
              <ChoixRattachement ici={() => void rattacher(r.id)} aussi={() => void rattacher(r.id, undefined, true)} />
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

/**
 * Un agent d'ailleurs trouvé dans cette école : il y est passé (sa fiche vient ici), ou il partage
 * son temps entre son école et celle-ci (sa fiche ne bouge pas).
 */
function ChoixRattachement({ ici, aussi }: { ici: () => void; aussi: () => void }) {
  return (
    <span className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
      <Bouton onClick={ici} title="Il a quitté son ancienne école : sa fiche sera rattachée à celle-ci à l’envoi (pas de nouvelle fiche)">
        <Plus /> Travaille ici
      </Bouton>
      <Bouton variante="discret" onClick={aussi} title="Il travaille dans deux écoles (la sienne et celle-ci, par exemple des heures de cours ici) : son école ne change pas">
        Aussi ici (2 écoles)
      </Bouton>
    </span>
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
  setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === cle ? { ...l, presence: v, presenceLe: new Date().toISOString(), erreur: undefined } : l)) }));

/** Grille : présent, absent ce jour, parti, inconnu ici (parti et inconnu : un signalement à la DGRHAS). */
function ChoixPresence({ ligne, setEtat, idCase, auClavier }: { ligne: Ligne; setEtat: (f: (e: Etat) => Etat) => void; idCase: string; auClavier: (e: React.KeyboardEvent<HTMLElement>) => void }) {
  if (ligne.nouveau) return <span className="px-2 text-[12px] text-zinc-400" title="Ajouté sur place : il est présent">présent</span>;
  const choix = ligne.aussi ? [AUSSI_ICI, ...PRESENCES.filter((x) => x.code === "ABSENT")] : PRESENCES;
  const p = choix.find((x) => x.code === ligne.presence);
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
      {choix.map((x) => (
        <option key={x.code} value={x.code}>
          {x.libelle}
        </option>
      ))}
    </select>
  );
}

/** Pourquoi (absent, parti, décédé…) : les motifs fréquents en un toucher, ou écrits librement. */
function Precision({ ligne, setEtat, grande }: { ligne: Ligne; setEtat: (f: (e: Etat) => Etat) => void; grande?: boolean }) {
  if (!avecPrecision(ligne.presence)) return null;
  const motifs = MOTIFS[ligne.presence as Presence] ?? [];
  const ecrire = (v: string) => setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === ligne.cle ? { ...l, observation: v } : l)) }));
  const id = `motifs-${ligne.presence}`;
  return (
    <div className={cx(grande ? "mt-2 space-y-1.5" : "mt-1")}>
      {grande && !!motifs.length && (
        <div className="flex flex-wrap gap-1.5">
          {motifs.map((m) => (
            <button key={m} type="button" onClick={() => ecrire(m)} className={cx("cursor-pointer rounded-full px-3 py-1.5 text-[13px] ring-1", ligne.observation === m ? "bg-marque-600 text-white ring-marque-600" : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50")}>
              {m}
            </button>
          ))}
        </div>
      )}
      <input
        list={id}
        value={ligne.observation ?? ""}
        onChange={(e) => ecrire(e.target.value)}
        placeholder={grande ? "Précision (facultatif) : pourquoi, depuis quand…" : "Pourquoi ? (facultatif)"}
        aria-label="Précision du constat"
        className={cx("w-full rounded-md border border-zinc-200 bg-white outline-none focus:border-marque-500", grande ? "h-11 px-3 text-[15px]" : "h-7 px-1.5 text-[12px]")}
      />
      <datalist id={id}>
        {motifs.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>
  );
}

/** Le constat déjà envoyé (par vous ou une autre équipe) : l'agent a été vu. */
function BadgeVu({ ligne }: { ligne: Ligne }) {
  if (ligne.presence || !ligne.constat) return null;
  const c = ligne.constat;
  return (
    <Badge ton={c.presence === "PRESENT" || c.presence === "AUSSI_ICI" ? "vert" : "jaune"} titre={`Constat envoyé${c.par ? ` par ${c.par}` : ""} le ${new Date(c.le).toLocaleDateString("fr-FR")}${c.observation ? ` : ${c.observation}` : ""}. Vous pouvez le changer.`}>
      vu : {libellePresence(c.presence).toLowerCase()}
    </Badge>
  );
}

/** À la DGRHAS : ce que les équipes ont signalé (absent, parti, inconnu ici), à vérifier puis traiter. */
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
/** Ce qui manque, en mots (« téléphone, diplôme »). */
const ceQuiManque = (p: Paquet, l: Ligne) =>
  p.colonnes
    .filter((c) => obligatoire(c, l.statut) && !l.valeurs[c.code])
    .map((c) => c.libelle.toLowerCase())
    .join(", ");

/* ------------------------------ Vue grille (comme Excel) ------------------------------ */

function Grille({ etat, lignes, setEtat, manques }: { etat: Etat; lignes: Ligne[]; setEtat: (f: (e: Etat) => Etat) => void; manques: boolean }) {
  const p = etat.paquet;
  const table = useRef<HTMLTableElement>(null);
  // Photos des pièces d'une ligne (dans une fenêtre, la grille reste en place)
  const [photosDe, setPhotosDe] = useState<string | null>(null);
  const pieces = p.pieces ?? lire<{ pieces?: TypePiece[] }>("base:colonnes")?.pieces ?? [];
  const lignePhotos = photosDe ? etat.lignes.find((x) => x.cle === photosDe) : undefined;
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
          {lignes.map((l, r) => {
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
                    {l.rattacher && !l.aussi && <Badge ton="bleu">arrive ici</Badge>}
                    {l.aussi && <Badge ton="bleu">travaille aussi ici (2 écoles)</Badge>}
                    <BadgeVu ligne={l} />
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
                  <select data-case={`${r}-1`} onKeyDown={auClavier(r, 1)} className={cx("h-8 w-full rounded-md border bg-transparent px-1 text-[13px] outline-none focus:border-marque-500", !l.statut ? "border-rouge-300 bg-rouge-50" : l.statut !== l.statutOrigine ? "border-or-300 bg-or-50" : "border-transparent")} value={l.statut} onChange={(e) => ecrireStatut(setEtat, l.cle, e.target.value)} aria-label="Statut">
                    {!l.statut && <option value="">— Choisir —</option>}
                    {p.statuts.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.libelle}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-zinc-100 px-1 py-1">
                  <ChoixPresence ligne={l} setEtat={setEtat} idCase={`${r}-2`} auClavier={auClavier(r, 2)} />
                  <Precision ligne={l} setEtat={setEtat} />
                </td>
                {cols.map((c, k) => (
                  <td key={c.code} className="border-b border-zinc-100 px-1 py-1">
                    <Case c={c} ligne={l} maj={(v) => ecrireCase(setEtat, l.cle, c.code, v)} manques={manques} idCase={`${r}-${k + 3}`} auClavier={auClavier(r, k + 3)} />
                  </td>
                ))}
                <td className="border-b border-zinc-100 px-2 py-1.5 text-[12px] whitespace-nowrap">
                  {m ? <span className="text-rouge-700">manque {m}</span> : <span className="text-marque-700">complet</span>}
                  {modifiee(l) && (
                    <button type="button" title="Annuler ce que vous avez saisi sur cette ligne (elle revient comme dans la base)" className="ml-2 cursor-pointer text-[12px] text-zinc-500 underline hover:text-rouge-600" onClick={() => annulerLigne(setEtat, l.cle)}>
                      annuler
                    </button>
                  )}
                  {(l.nouveau || l.rattacher) && (
                    <button type="button" title="Retirer cette ligne" className="ml-2 cursor-pointer text-zinc-400 hover:text-rouge-600" onClick={() => retirer(setEtat, l.cle)}>
                      <Trash2 className="inline size-3.5" />
                    </button>
                  )}
                  {pieces.length > 0 && (
                    <button type="button" title="Photographier une pièce (diplôme, acte…)" aria-label="Photographier une pièce" className="ml-2 cursor-pointer text-zinc-500 hover:text-marque-700" onClick={() => setPhotosDe(l.cle)}>
                      <Camera className="inline size-4" />
                      {l.photos?.length ? <span className="ml-0.5 text-[11px] font-medium text-or-700">{l.photos.length}</span> : null}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {lignePhotos && (
        <Modale titre={`Pièces : ${lignePhotos.valeurs.NOMS_PRENOMS || "agent"}`} ouverte fermer={() => setPhotosDe(null)}>
          <PhotosPieces ligne={lignePhotos} setEtat={setEtat} pieces={pieces} />
        </Modale>
      )}
    </div>
  );
}

/* ------------------------------ Vue « une personne à la fois » (téléphone) ------------------------------ */

/** Photographier une pièce (diplôme, acte…) : gardée chiffrée sur l'appareil, envoyée avec la fiche. */
function PhotosPieces({ ligne, setEtat, pieces }: { ligne: Ligne; setEtat: (f: (e: Etat) => Etat) => void; pieces: TypePiece[] }) {
  const [type, setType] = useState(pieces[0]?.code ?? "");
  const [encours, setEncours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const entree = useRef<HTMLInputElement>(null);
  if (!pieces.length) return null;
  const photos = ligne.photos ?? [];
  const libelle = (c: string) => pieces.find((x) => x.code === c)?.libelle ?? c;
  const majPhotos = (f: (l: PhotoPiece[]) => PhotoPiece[]) => setEtat((e) => ({ ...e, lignes: e.lignes.map((l) => (l.cle === ligne.cle ? { ...l, photos: f(l.photos ?? []) } : l)) }));
  const prendre = async (f: File) => {
    setEncours(true);
    setErreur(null);
    try {
      const image = await reduireImage(f);
      majPhotos((l) => [...l, { cle: `ph${Date.now()}`, type: type || pieces[0].code, image, le: new Date().toISOString() }]);
    } catch {
      setErreur("Cette photo n’a pas pu être lue : reprenez-la.");
    } finally {
      setEncours(false);
    }
  };
  return (
    <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
      <div className="text-[12px] font-medium text-zinc-600">Photo d’une pièce</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Liste className="h-11 w-full text-[14px] sm:flex-1" value={type} onChange={(e) => setType(e.target.value)} aria-label="Quelle pièce ?" options={pieces.map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
        <Bouton chargement={encours} disabled={photos.length >= 6} onClick={() => entree.current?.click()}>
          <Camera /> Photographier
        </Bouton>
      </div>
      <input
        ref={entree}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Photo de la pièce"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void prendre(f);
        }}
      />
      {erreur && <p className="text-[13px] text-rouge-700">{erreur}</p>}
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {photos.map((x) => (
            <li key={x.cle} className="w-24 space-y-1 text-[11px]">
              {/* (photo gardée sur l'appareil, pas une image du site : la balise simple suffit) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.image} alt={libelle(x.type)} className="h-20 w-24 rounded-lg object-cover ring-1 ring-zinc-200" />
              <div className="leading-tight text-zinc-600">{libelle(x.type)}</div>
              {x.erreur ? <div className="text-rouge-700">{x.erreur}</div> : <div className="text-or-700">à envoyer</div>}
              <button type="button" className="cursor-pointer text-rouge-600 underline" onClick={() => majPhotos((l) => l.filter((y) => y.cle !== x.cle))}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length >= 6 && <p className="text-[12px] text-zinc-500">6 photos au plus par agent : envoyez avant d’en prendre d’autres.</p>}
    </div>
  );
}

function UnePersonne({ etat, lignes, setEtat, manques }: { etat: Etat; lignes: Ligne[]; setEtat: (f: (e: Etat) => Etat) => void; manques: boolean }) {
  const p = etat.paquet;
  const [i, setI] = useState(0);
  const [seulementIncomplets, setSeulementIncomplets] = useState(false);
  const liste = seulementIncomplets ? lignes.filter((l) => manquantes(p, l) > 0) : lignes;
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
        <input type="checkbox" checked={seulementIncomplets} onChange={(e) => (setSeulementIncomplets(e.target.checked), setI(0))} /> Ne montrer que les fiches incomplètes
      </label>
      <div key={l.cle} data-ligne={l.cle} data-agent={l.agentId ?? ""} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {l.nouveau && <Badge ton="bleu">nouveau</Badge>}
          {l.aControler && <Badge ton="jaune">ajouté, en attente de la DGRHAS</Badge>}
          {l.rattacher && !l.aussi && <Badge ton="bleu">vient d’une autre école</Badge>}
          {l.aussi && <Badge ton="bleu">travaille aussi ici (2 écoles)</Badge>}
          <BadgeVu ligne={l} />
        </div>
        {/* Ce qu'il faut savoir sur cette fiche, en une phrase */}
        <p className={cx("text-[13px]", m ? "text-or-800" : "text-marque-700")}>{m ? `Il manque : ${ceQuiManque(p, l)}.` : "Fiche complète."}</p>
        {memes.has(nomCle(l.valeurs.NOMS_PRENOMS)) && (
          <p className="rounded-lg bg-rouge-50 px-3 py-2 text-[13px] text-rouge-800">Une autre personne de cette école a le même nom. Si c’est la même, choisissez « Même personne qu’une autre ligne ».</p>
        )}
        {l.erreur && !l.semblables?.length && <p className="text-[13px] text-rouge-700">{l.erreur}</p>}
        {!!l.semblables?.length && <Semblables ligne={l} setEtat={setEtat} />}
        {!l.nouveau && (
          <div className="space-y-1">
            <div className="text-[12px] font-medium text-zinc-600">Aujourd’hui dans l’école</div>
            <div className="grid grid-cols-2 gap-2">
              {(l.aussi ? [AUSSI_ICI, ...PRESENCES.filter((x) => x.code === "ABSENT")] : PRESENCES).map((x) => (
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
            <Precision ligne={l} setEtat={setEtat} grande />
          </div>
        )}
        <label className="block text-[12px] font-medium text-zinc-600">
          Statut
          <Liste className={cx("mt-1 h-11 w-full text-[15px]", !l.statut && "ring-2 ring-rouge-300")} value={l.statut} onChange={(e) => ecrireStatut(setEtat, l.cle, e.target.value)} options={[...(l.statut ? [] : [{ valeur: "", libelle: "— Choisir le statut —" }]), ...p.statuts.map((s) => ({ valeur: s.code, libelle: s.libelle }))]} />
        </label>
        {p.colonnes.map((c) => (
          <label key={c.code} className="block text-[12px] font-medium text-zinc-600">
            {c.libelle}
            <Case c={c} ligne={l} grande maj={(v) => ecrireCase(setEtat, l.cle, c.code, v)} manques={manques} />
          </label>
        ))}
        <PhotosPieces ligne={l} setEtat={setEtat} pieces={p.pieces ?? lire<{ pieces?: TypePiece[] }>("base:colonnes")?.pieces ?? []} />
        <div className="flex flex-wrap gap-4">
          {modifiee(l) && (
            <button type="button" className="cursor-pointer text-[13px] text-zinc-600 underline hover:text-rouge-600" onClick={() => annulerLigne(setEtat, l.cle)}>
              Annuler ce que j’ai saisi pour cet agent
            </button>
          )}
          {(l.nouveau || l.rattacher) && (
            <button type="button" className="cursor-pointer text-[13px] text-rouge-600 hover:underline" onClick={() => retirer(setEtat, l.cle)}>
              Retirer cette ligne
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        {n >= liste.length - 1 ? (
          <span className="text-[13px] text-zinc-500">C’était le dernier agent de la liste.</span>
        ) : (
          <Bouton variante="principal" onClick={() => setI(n + 1)}>
            Suivant <ArrowRight />
          </Bouton>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-zinc-500">
        <Smartphone className="size-3.5" /> Tout est gardé sur l’appareil à chaque frappe, même sans réseau.
      </p>
    </div>
  );
}
