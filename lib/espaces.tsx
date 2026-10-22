import {
  ArrowLeftRight,
  Building2,
  BarChart3,
  ClipboardCheck,
  CopyCheck,
  FilePlus2,
  FileText,
  GraduationCap,
  HandHeart,
  History,
  Inbox,
  Layers,
  ListChecks,
  Send,
  Settings,
  ShieldCheck,
  Stamp,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Profil } from "./api";
import { peut } from "./libelles";

/** Travail en attente, renvoyé par « /menu/compteurs ». */
export interface Compteurs {
  aControler: number;
  aValider: number;
  contentieux: number;
  pretesFP: number;
  textesAttendus: number;
  lotsSansDate: number;
  pasAffectes: number;
  recommandations: number;
  mutationsEnCours: number;
  notesAffASoumettre: number;
  notesAffSoumises: number;
  notesMutASoumettre: number;
  notesMutSoumises: number;
}

export interface Rubrique {
  href: string;
  libelle: string;
  icone: LucideIcon;
  visible?: (p: Profil) => boolean;
  /** Ce que l'on fait dans cette rubrique (page d'accueil du domaine). */
  explication: string;
  /** Travail en attente : compté dans le menu. */
  compteur?: (c: Compteurs) => { n: number; texte: string };
  /** Information seulement (ex. textes attendus de la FP) : pas comptée dans le menu. */
  info?: (c: Compteurs) => { n: number; texte: string };
}

export interface Espace {
  cle: string;
  titre: string;
  icone: LucideIcon;
  description: string;
  /** Rappel du circuit, en haut de la page d'accueil. */
  circuit?: string;
  rubriques: Rubrique[];
}

/** « 3 à contrôler · 1 en contentieux » : seulement les nombres non nuls. */
const parties = (...p: [number, string][]) =>
  p
    .filter(([n]) => n > 0)
    .map(([n, t]) => `${n} ${t}`)
    .join(" · ");

const traiter = (p: Profil) => peut.traiter(p.role);
const parametrer = (p: Profil) => peut.parametrer(p.role);

export const ESPACES: Espace[] = [
  {
    cle: "recrutement",
    titre: "Recrutement",
    icone: UserPlus,
    description: "Des candidats retenus par la commission jusqu’au retour des textes de la Fonction Publique.",
    circuit: "Saisie → contrôle → validation du DG → envoi à la FP → réception des textes",
    rubriques: [
      {
        href: "/candidats",
        libelle: "Saisie des candidats",
        icone: UserPlus,
        visible: traiter,
        explication: "Saisir ou importer les candidats retenus par la commission, puis les contrôler et les faire valider par le DG.",
        compteur: (c) => ({
          n: c.aControler + c.aValider + c.contentieux,
          texte: parties([c.aControler, "à contrôler"], [c.aValider, "à valider par le DG"], [c.contentieux, "en contentieux d’âge"]),
        }),
      },
      {
        href: "/transmission",
        libelle: "Envoi à la FP",
        icone: Send,
        visible: traiter,
        explication: "Regrouper les fiches validées en transmission, quota par quota, et produire le fichier Excel et les listes par lot.",
        compteur: (c) => ({ n: c.pretesFP, texte: `${c.pretesFP} fiche(s) validée(s), prête(s) à partir` }),
      },
      {
        href: "/reception",
        libelle: "Réception des textes",
        icone: Inbox,
        visible: traiter,
        explication: "Enregistrer les arrêtés et décrets renvoyés par la FP (un par un ou par fichier Excel), et les personnes du quota « Autres ».",
        info: (c) => ({ n: c.textesAttendus, texte: `${c.textesAttendus} dossier(s) envoyé(s) attendent leur texte` }),
      },
      {
        href: "/recrutement",
        libelle: "Base des recrutés",
        icone: Users,
        explication: "Toutes les personnes recrutées et leur texte de la FP ; reprise de la fiche de suivi Excel (travail fait hors du système).",
      },
      {
        href: "/commission",
        libelle: "Membres de la commission",
        icone: UserCheck,
        visible: traiter,
        explication: "Les membres de la commission de chaque quota et leurs places : dossiers apportés, validés et envoyés à la FP.",
      },
    ],
  },
  {
    cle: "affectations",
    titre: "Affectations",
    icone: ClipboardCheck,
    description: "Des textes reçus de la FP jusqu’aux notes d’affectation.",
    circuit: "Dates de signature du lot → compléter chaque personne → préparer les notes",
    rubriques: [
      {
        href: "/lots",
        libelle: "Lots de textes",
        icone: Layers,
        explication: "Les paquets de textes reçus de la FP : dates de signature et avancement des affectations, lot par lot.",
        compteur: (c) => ({ n: c.lotsSansDate, texte: `${c.lotsSansDate} lot(s) sans date de signature` }),
      },
      {
        href: "/affectations",
        libelle: "Traitement des affectations",
        icone: ClipboardCheck,
        explication: "Vérifier et compléter chaque personne, régler les problèmes en rouge, puis préparer les notes du lot.",
        info: (c) => ({ n: c.pasAffectes, texte: `${c.pasAffectes} personne(s) pas encore affectée(s)` }),
      },
      {
        href: "/recommandations",
        libelle: "Recommandations",
        icone: Stamp,
        explication: "Les changements de département ou de note proposés pour une personne, à décider par le DG.",
        compteur: (c) => ({ n: c.recommandations, texte: `${c.recommandations} en attente de la décision du DG` }),
      },
      {
        href: "/statistiques",
        libelle: "Statistiques de suivi",
        icone: BarChart3,
        explication: "Par quota : dossiers envoyés, textes reçus, affectés et restes ; textes reçus par cycle et par département.",
      },
    ],
  },
  {
    cle: "enrolement",
    titre: "Enrôlement",
    icone: HandHeart,
    description: "Les volontaires (bourse) : ils ne vont pas à la Fonction publique ; la DGRHAS retient les dossiers, qui entrent directement dans les notes de service.",
    circuit: "Campagne et quota → saisie → contrôle → décision de la DGRHAS → note de service",
    rubriques: [
      {
        href: "/enrolement/campagne",
        libelle: "Campagne, quota et commission",
        icone: Settings,
        visible: traiter,
        explication: "Ouvrir l’enrôlement de l’année, fixer le quota (DG) et les places des membres de la commission.",
      },
      {
        href: "/enrolement/saisie",
        libelle: "Saisie des enrôlements",
        icone: UserPlus,
        visible: traiter,
        explication: "Saisir ou importer les dossiers déposés, les contrôler, puis la DGRHAS retient ou non.",
      },
      {
        href: "/enrolement/base",
        libelle: "Base des enrôlés",
        icone: UserCheck,
        visible: traiter,
        explication: "Les volontaires retenus : département et établissement, export Excel.",
      },
      {
        href: "/notes/enrolement",
        libelle: "Notes d’enrôlement",
        icone: FileText,
        explication: "Préparer les notes de service des volontaires retenus (on choisit l’année), puis validation et signature.",
      },
    ],
  },
  {
    cle: "controle",
    titre: "Contrôle et vérification",
    icone: ShieldCheck,
    description: "Retrouver les mêmes personnes d’une liste à l’autre : ne pas recruter deux fois, ne pas enrôler un volontaire déjà payé, ne pas affecter deux fois.",
    circuit: "Comparer des fichiers → listes des années passées → notes déjà signées",
    rubriques: [
      {
        href: "/rapprochement",
        libelle: "Rapprochement de fichiers",
        icone: CopyCheck,
        visible: traiter,
        explication: "Jusqu’à 4 fichiers Excel comparés entre eux et avec la base : doublons, mêmes personnes, homonymes. Une vérification : rien n’est enregistré.",
      },
      {
        href: "/rapprochement?onglet=annees",
        libelle: "Listes des années passées",
        icone: History,
        visible: traiter,
        explication: "Les recrutés des années précédentes, gardés dans le système : la saisie bloque un candidat déjà recruté.",
      },
      {
        href: "/rapprochement?onglet=notes",
        libelle: "Notes déjà signées",
        icone: ClipboardCheck,
        visible: traiter,
        explication: "Les notes signées hors du système, reportées sur chaque personne : personne n’est affecté deux fois ; liste des doubles affectations.",
      },
    ],
  },
  {
    cle: "mutations",
    titre: "Mutations",
    icone: ArrowLeftRight,
    description: "Les demandes de mutation, de leur enregistrement à la décision du ministre.",
    circuit: "Nouvelle demande → avis → décision du ministre → note de mutation",
    rubriques: [
      {
        href: "/mutations/nouvelle",
        libelle: "Nouvelle demande",
        icone: FilePlus2,
        visible: traiter,
        explication: "Enregistrer une demande de mutation reçue.",
      },
      {
        href: "/mutations",
        libelle: "Demandes",
        icone: ArrowLeftRight,
        explication: "Suivre chaque demande : avis, décision du ministre.",
        compteur: (c) => ({ n: c.mutationsEnCours, texte: `${c.mutationsEnCours} demande(s) en cours` }),
      },
      {
        href: "/mutations/statistiques",
        libelle: "Statistiques",
        icone: BarChart3,
        explication: "Les chiffres des mutations par motif et par département.",
      },
    ],
  },
  {
    cle: "notes",
    titre: "Notes de service",
    icone: FileText,
    description: "Les notes d’affectation, de mutation et d’enrôlement, jusqu’à la signature du ministre.",
    circuit: "À soumettre au DG → soumise au DG → validée par le DG → signée",
    rubriques: [
      {
        href: "/notes/affectation",
        libelle: "Notes d’affectation",
        icone: FileText,
        explication: "Relire les notes préparées, les soumettre au DG, puis reporter le numéro et la date de signature.",
        compteur: (c) => ({
          n: c.notesAffASoumettre + c.notesAffSoumises,
          texte: parties([c.notesAffASoumettre, "à soumettre au DG"], [c.notesAffSoumises, "en attente de validation"]),
        }),
      },
      {
        href: "/notes/mutation",
        libelle: "Notes de mutation",
        icone: FileText,
        explication: "Les notes des mutations accordées, préparées automatiquement.",
        compteur: (c) => ({
          n: c.notesMutASoumettre + c.notesMutSoumises,
          texte: parties([c.notesMutASoumettre, "à soumettre au DG"], [c.notesMutSoumises, "en attente de validation"]),
        }),
      },
      {
        href: "/notes/enrolement",
        libelle: "Notes d’enrôlement",
        icone: FileText,
        explication: "Les notes de service des volontaires retenus à l’enrôlement.",
      },
    ],
  },
  {
    cle: "administration",
    titre: "Administration",
    icone: Settings,
    description: "Les utilisateurs, les paramètres, les règles des diplômes et le journal des actions.",
    rubriques: [
      {
        href: "/administration",
        libelle: "Utilisateurs et paramètres",
        icone: Settings,
        visible: parametrer,
        explication: "Créer les comptes, choisir leur rôle, régler les paramètres des notes et des calculs.",
      },
      {
        href: "/administration/regles",
        libelle: "Règles et grades",
        icone: GraduationCap,
        visible: parametrer,
        explication: "Pour chaque diplôme : cycle, grade, catégorie, échelle et indice. Réservé au DG.",
      },
      {
        href: "/administration/organigramme",
        libelle: "Organigramme",
        icone: Building2,
        visible: traiter,
        explication: "Écoles, inspections, DDEPPSA, services et directions : le chemin que suivent les demandes, et qui les vise.",
      },
      {
        href: "/administration/prestations",
        libelle: "Catalogue des prestations",
        icone: ListChecks,
        visible: traiter,
        explication: "Pour chaque type de demande : pièces exigées, circuit d’approbation et décideur final.",
      },
      {
        href: "/administration/origines",
        libelle: "Origines des dossiers",
        icone: ListChecks,
        visible: parametrer,
        explication: "La liste des origines proposées à la saisie d’un candidat (Cabinet du Ministre, Primature, DDEPPSA…).",
      },
      {
        href: "/journal",
        libelle: "Journal",
        icone: History,
        visible: (p) => peut.journal(p.role),
        explication: "Qui a fait quoi, et quand : toutes les actions enregistrées dans le système.",
      },
    ],
  },
];

/** Rubriques d'un espace que ce profil peut voir. */
export const rubriquesVisibles = (e: Espace, p: Profil) => e.rubriques.filter((r) => !r.visible || r.visible(p));

/** Espace auquel appartient une page (le plus long préfixe d'URL l'emporte). */
export function espaceDe(chemin: string): Espace | null {
  if (chemin.startsWith("/espace/")) return ESPACES.find((e) => chemin === `/espace/${e.cle}`) ?? null;
  let meilleur: { e: Espace; long: number } | null = null;
  for (const e of ESPACES)
    for (const r of e.rubriques)
      if ((chemin === r.href || chemin.startsWith(`${r.href}/`)) && (!meilleur || r.href.length > meilleur.long)) meilleur = { e, long: r.href.length };
  // Pages de détail rattachées à un domaine
  if (!meilleur) {
    if (chemin.startsWith("/note/")) return ESPACES.find((e) => e.cle === "notes")!;
    if (chemin.startsWith("/mutation/")) return ESPACES.find((e) => e.cle === "mutations")!;
  }
  return meilleur?.e ?? null;
}

/** Nombre de choses à faire dans un espace (somme de ses rubriques visibles). */
export function travailEspace(e: Espace, p: Profil, c: Compteurs | null) {
  if (!c) return 0;
  return rubriquesVisibles(e, p).reduce((n, r) => n + (r.compteur?.(c).n ?? 0), 0);
}
