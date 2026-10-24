import {
  ArrowLeftRight,
  Building2,
  Banknote,
  BarChart3,
  CalendarCheck,
  Scale,
  Star,
  School,
  ClipboardCheck,
  ClipboardList,
  CopyCheck,
  FilePlus2,
  FileSpreadsheet,
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
  /** Sous-titre du menu (ex. « Chaque mois : payer ») : les rubriques qui le suivent en font partie. */
  groupe?: string;
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
/** Personnel : DGRHAS, DDEPPSA (leur département), comptes d’établissement (leurs agents). */
const recenser = (p: Profil) => peut.traiter(p.role) || p.role === "DDEPPSA" || p.role === "STRUCTURE";

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
        explication: "Les changements à la règle (autre département, établissement, note) pour une affectation, une mutation ou un enrôlement : proposés par le chef de service, avis du directeur, décision du DG.",
        compteur: (c) => ({ n: c.recommandations, texte: `${c.recommandations} en attente (avis du directeur ou décision du DG)` }),
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
    description: "Les enseignants volontaires (bourse) : chaque année on les enrôle (campagne, dossiers, notes de service), chaque mois on paie leur bourse. Les communautaires ont aussi leur liste de paiement mensuelle (sans note ni vague). Le guide ci-dessous dit, étape par étape, quoi faire, qui le fait et où.",
    rubriques: [
      {
        groupe: "Chaque année : enrôler",
        href: "/enrolement/campagne",
        libelle: "Campagne, quota et commission",
        icone: Settings,
        visible: traiter,
        explication: "Ouvrir l’enrôlement de l’année, fixer le quota (DG) et les places des membres de la commission.",
      },
      {
        groupe: "Chaque année : enrôler",
        href: "/enrolement/saisie",
        libelle: "Saisie des enrôlements",
        icone: UserPlus,
        visible: traiter,
        explication: "Saisir ou importer les dossiers déposés, les contrôler, puis la DGRHAS retient ou non.",
      },
      {
        groupe: "Chaque année : enrôler",
        href: "/enrolement/base",
        libelle: "Base des enrôlés",
        icone: UserCheck,
        visible: traiter,
        explication: "Les volontaires retenus : département et établissement, export Excel.",
      },
      {
        groupe: "Chaque année : enrôler",
        href: "/notes/enrolement",
        libelle: "Notes d’enrôlement",
        icone: FileText,
        explication: "Préparer les notes de service des volontaires retenus (on choisit l’année), puis validation et signature.",
      },
      {
        groupe: "Chaque mois : payer",
        href: "/enrolement/volontaires",
        libelle: "Volontaires et communautaires",
        icone: Users,
        visible: traiter,
        explication: "Les deux listes payées chaque mois : volontaires (bourse, par vague) et communautaires (par département et cycle). Sorties, réintégrations, reprise des listes existantes.",
      },
      {
        groupe: "Chaque mois : payer",
        href: "/enrolement/bottin",
        libelle: "Pointage du bottin",
        icone: CopyCheck,
        visible: traiter,
        explication: "Le bottin de la solde du mois comparé aux volontaires encore payés : ceux qui ont reçu leur premier salaire sortent du registre (la bourse s’arrête au premier salaire, pas au texte de la FP).",
      },
      {
        groupe: "Chaque mois : payer",
        href: "/enrolement/bourse",
        libelle: "Paiement mensuel",
        icone: Banknote,
        visible: traiter,
        explication: "Chaque mois, l’état des volontaires (bourse) et celui des communautaires : contrôles (doublons, sur les deux listes, salariés au bottin), validation par le DG, Excel par département.",
      },
      {
        groupe: "Chaque mois : payer",
        href: "/enrolement/mise-en-route",
        libelle: "Mise en route",
        icone: Send,
        visible: traiter,
        explication: "Fiche de paiement de l’équipement et du transport, par note de service ; reprise des fiches déjà payées ; contrôle des doubles paiements.",
      },
      {
        groupe: "Chaque mois : payer",
        href: "/enrolement/regularisations",
        libelle: "Régularisations",
        icone: Scale,
        visible: traiter,
        explication: "Trop-perçus détectés, compléments et retenues imputés sur la bourse, sommes à recouvrer des sortants.",
      },
      {
        groupe: "Suivi et réglages",
        href: "/enrolement/tableau",
        libelle: "Tableau de bord",
        icone: BarChart3,
        visible: traiter,
        explication: "Volontaires en poste, coût mensuel, bourses des derniers mois, sorties, régularisations et mises en route.",
      },
      {
        groupe: "Suivi et réglages",
        href: "/enrolement/besoins",
        libelle: "Besoins par établissement",
        icone: School,
        visible: (p) => peut.traiter(p.role) || p.role === "DDEPPSA",
        explication: "Les besoins exprimés par les DDEPPSA, comparés aux volontaires en poste.",
      },
      {
        groupe: "Suivi et réglages",
        href: "/enrolement/configuration",
        libelle: "Configuration",
        icone: Settings,
        visible: traiter,
        explication: "Barèmes (bourse, mise d’équipement, transport), début et fin de la bourse, motifs de sortie, contrôles.",
      },
    ],
  },
  {
    cle: "personnel",
    titre: "Personnel",
    icone: ClipboardList,
    description:
      "La base générale du personnel : une seule fiche par personne (fonctionnaire, contractuel, volontaire, communautaire), avec ses pièces et son historique. Les autres modules l’alimentent : chaque volontaire du registre y a sa fiche, et le recensement la complète et la met à jour.",
    circuit: "Recensement (saisie, import, scans) → Contrôles → Fiches complètes",
    rubriques: [
      {
        groupe: "La base du personnel",
        href: "/recensement",
        libelle: "Recensement",
        icone: ClipboardCheck,
        visible: recenser,
        explication: "Rechercher un agent et compléter ce qui lui manque, ajouter un agent absent de la base (contrôle, puis décision du DG), importer le fichier d’un recensement.",
      },
      {
        groupe: "La base du personnel",
        href: "/personnel",
        libelle: "Tableau de bord",
        icone: BarChart3,
        visible: recenser,
        explication: "Où en est la base : fiches complètes, rubriques et pièces qui manquent, incohérences à corriger (dont les volontaires payés qui sont aussi fonctionnaires).",
      },
      {
        groupe: "La base du personnel",
        href: "/personnel/agents",
        libelle: "Base du personnel",
        icone: Users,
        visible: recenser,
        explication: "Une fiche par personne : la créer, la corriger, déposer ses pièces scannées. Les volontaires du registre y sont déjà.",
      },
      {
        groupe: "Suivi des agents",
        href: "/demandes/nouvelle",
        libelle: "Déposer une demande",
        icone: FilePlus2,
        visible: recenser,
        explication: "Congé, autorisation d’absence, attestation, prime, mutation… pour un de vos agents : la demande part de votre structure, l’agent la suit sur le portail et y imprime son acte.",
      },
      {
        groupe: "Suivi des agents",
        href: "/personnel/presence",
        libelle: "Présence",
        icone: CalendarCheck,
        visible: recenser,
        explication: "Le chef de structure pointe ses agents (chaque jour ou en fin de semaine) et valide sa semaine ; le rapport montre les absences et les chefs qui n’ont pas pointé.",
      },
      {
        groupe: "Suivi des agents",
        href: "/personnel/evaluations",
        libelle: "Évaluations",
        icone: Star,
        visible: recenser,
        explication: "L’évaluation annuelle par le chef immédiat : compétence professionnelle et compétence sociale sur 5, la globale et ce que dit leur écart.",
      },
      {
        groupe: "Écoles",
        href: "/ecoles",
        libelle: "Écoles et classes",
        icone: School,
        visible: recenser,
        explication: "Pour chaque école : bâtiments, salles, classes ouvertes de l’année, agents rattachés, et le besoin en enseignants qui s’en déduit.",
      },
      {
        groupe: "Écoles",
        href: "/ecoles/besoins",
        libelle: "Besoins en enseignants",
        icone: Scale,
        visible: (p) => peut.traiter(p.role) || p.role === "DDEPPSA",
        explication: "Déficit ou pléthore d’enseignants, école par école, par département et par matière : les heures des classes ouvertes divisées par les heures d’un enseignant.",
      },
      {
        groupe: "Recensement",
        href: "/personnel/import",
        libelle: "Modèle Excel, import et scans",
        icone: FileSpreadsheet,
        visible: recenser,
        explication: "Le modèle Excel à envoyer aux établissements, l’import d’une liste (nouveaux agents ou corrections), les scans en masse.",
      },
      {
        groupe: "Réglages",
        href: "/personnel/configuration",
        libelle: "Configuration",
        icone: Settings,
        visible: traiter,
        explication: "Les rubriques de la fiche, ce qui est obligatoire pour chaque type d’agent, les pièces à joindre et les contrôles. Réglée par le DG.",
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
    cle: "administration",
    titre: "Administration",
    icone: Settings,
    description: "Les utilisateurs, les paramètres, les règles des diplômes et le journal des actions.",
    rubriques: [
      {
        href: "/administration",
        libelle: "Utilisateurs",
        icone: Users,
        visible: (p) => peut.administrer(p.role),
        explication: "Créer les comptes, choisir leur rôle et leur structure, gérer les codes personnels, débloquer ou déconnecter un compte.",
      },
      {
        href: "/administration/parametres",
        libelle: "Paramètres",
        icone: Settings,
        visible: parametrer,
        explication: "Régler les notes de service (année scolaire, signataire…), le statut contractuel, les âges et calculs, l’envoi à la FP et la fiche de mutation.",
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
        href: "/administration/referentiels",
        libelle: "Référentiels",
        icone: Layers,
        visible: traiter,
        explication: "Les listes où l’on choisit une valeur avec une recherche (localités, matières, postes…) et la carte scolaire : cycles, niveaux, matières et programmes (heures par semaine, coefficient). Reprise de l’ancien système.",
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
