import {
  ArrowLeftRight,
  Award,
  Briefcase,
  BookOpen,
  Folder,
  Landmark,
  Repeat,
  Search,
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
  Gauge,
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
  Network,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Profil } from "./api";
import { peut } from "./libelles";
import { type ConfigMenu, construireMenu, idRubrique, type OrigineMenu } from "./menu-config";

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
  /** Sous-section du domaine (ex. « Chaque mois : payer ») : les rubriques qui la suivent en font partie. */
  groupe?: string;
  /** Domaine d'origine (rempli au chargement) : les droits ne changent pas si la rubrique est déplacée. */
  origine?: string;
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
    titre: "Recrutement FP",
    icone: UserPlus,
    description: "Le recrutement à la Fonction Publique : des candidats retenus par la commission jusqu’au retour des textes, avec la gestion du quota.",
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
      {
        href: "/pilotage",
        libelle: "Gestion du quota",
        icone: Gauge,
        visible: parametrer,
        explication: "Le quota de recrutement et sa répartition (par département, par cycle, par membre de la commission), l’avancement de la campagne.",
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
    titre: "Volontaires et communautaires",
    icone: HandHeart,
    description: "La gestion des volontaires et des communautaires : chaque année on enrôle les volontaires (campagne, dossiers, notes de service), chaque mois on paie leur bourse. Les communautaires ont aussi leur liste de paiement mensuelle (sans note ni vague). Le guide ci-dessous dit, étape par étape, quoi faire, qui le fait et où.",
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
    titre: "Base du personnel",
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
        groupe: "Suivi des agents",
        href: "/personnel/retards-echelons",
        libelle: "Échelons en retard",
        icone: Award,
        visible: (p) => peut.traiter(p.role) || p.role === "DDEPPSA",
        explication: "Les agents qui ont des échelons en retard (promotions ou avancements dus), avec des filtres et l’export Excel, Word, PDF : préparer la commission administrative paritaire sans demander de dossier.",
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
    cle: "nominations",
    titre: "Nominations",
    icone: Award,
    description:
      "Les nominations des cadres de gestion des établissements et des inspections : directeurs, directeurs des études, surveillants généraux, économes, proviseurs, intendants, inspecteurs, conseillers pédagogiques… Chaque année, la DDEPPSA propose (reconduire, muter, promouvoir, permuter, relever), la DGRHAS décide, puis les notes de service.",
    circuit: "Reprise de l’année précédente → propositions des DDEPPSA → décision DGRHAS → notes de nomination → signature",
    rubriques: [
      {
        href: "/nominations",
        libelle: "Nominations",
        icone: Award,
        visible: (p) => peut.traiter(p.role) || p.role === "DDEPPSA",
        explication: "La base des nominations de l’année, par département : les propositions des DDEPPSA, les nouveaux, les décisions de la DGRHAS.",
      },
      {
        href: "/notes/nomination",
        libelle: "Notes de nomination",
        icone: FileText,
        visible: traiter,
        explication: "Une note de service par fonction avec les nominations validées, jusqu’à la signature du ministre.",
      },
    ],
  },
  {
    cle: "demandes",
    titre: "Demandes de prestations",
    icone: FilePlus2,
    description: "Les demandes des agents autres que les mutations : congés, autorisations d’absence, attestations, primes… de leur dépôt à l’acte signé.",
    circuit: "Dépôt par la structure ou sur le portail → avis → décision → acte",
    rubriques: [
      {
        href: "/demandes/nouvelle",
        libelle: "Déposer une demande de prestation",
        icone: FilePlus2,
        visible: recenser,
        explication: "Congé, autorisation d’absence, attestation, prime, mutation… pour un de vos agents : la demande part de votre structure, l’agent la suit sur le portail et y imprime son acte.",
      },
      {
        href: "/mutations?motif=PRESTATION",
        libelle: "Suivi des prestations",
        icone: ListChecks,
        visible: traiter,
        explication: "Les demandes de prestations en cours et accordées : où en est chacune, qui doit donner son avis.",
      },
    ],
  },
  {
    cle: "structures",
    titre: "Structures et besoins",
    icone: Network,
    description:
      "Les structures du ministère, du cabinet jusqu’à l’école : les structures administratives (directions, services) et les structures scolaires (écoles, avec leurs classes et leurs salles), le personnel de chacune, et les besoins en personnel qui s’en déduisent.",
    circuit: "Structures → classes ouvertes → heures de cours → besoin en enseignants",
    rubriques: [
      {
        groupe: "Les structures",
        href: "/structures",
        libelle: "Structures administratives",
        icone: Building2,
        visible: traiter,
        explication: "Du cabinet aux services : directions générales, directions centrales et départementales, inspections. Pour chacune, son personnel.",
      },
      {
        groupe: "Les structures",
        href: "/ecoles",
        libelle: "Structures scolaires",
        icone: School,
        visible: recenser,
        explication: "Pour chaque école : bâtiments, salles, classes ouvertes de l’année, agents rattachés, et le besoin en enseignants qui s’en déduit.",
      },
      {
        groupe: "Besoins en personnel",
        href: "/ecoles/besoins",
        libelle: "Besoins en enseignants",
        icone: Scale,
        visible: (p) => peut.traiter(p.role) || p.role === "DDEPPSA",
        explication: "Déficit ou pléthore d’enseignants par école, par cycle, par département et par matière : les heures des classes ouvertes divisées par les heures d’un enseignant.",
      },
      {
        groupe: "Besoins en personnel",
        href: "/structures/besoins-administratifs",
        libelle: "Besoins des administrations",
        icone: Briefcase,
        // Les écoles ont leurs besoins en enseignants : seuls les responsables des structures administratives
        visible: (p) => peut.traiter(p.role) || p.role === "DDEPPSA" || (p.role === "STRUCTURE" && !!p.structureType && p.structureType !== "ETABLISSEMENT"),
        explication: "Chaque structure administrative fixe l’effectif normal de ses postes (directeur, chef de service, collaborateurs…) et exprime ses besoins ; la DGRHAS les compare à l’effectif normal et répond.",
      },
      {
        groupe: "Besoins en personnel",
        href: "/enrolement/besoins",
        libelle: "Besoins par établissement",
        icone: School,
        visible: (p) => peut.traiter(p.role) || p.role === "DDEPPSA",
        explication: "Les besoins en volontaires exprimés par les DDEPPSA, comparés aux volontaires en poste.",
      },
    ],
  },
  {
    cle: "notes",
    titre: "Notes de service",
    icone: FileText,
    description: "Les notes d’affectation, de mutation, d’enrôlement et de nomination, jusqu’à la signature du ministre.",
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
      {
        href: "/notes/nomination",
        libelle: "Notes de nomination",
        icone: FileText,
        visible: traiter,
        explication: "Une note par fonction (directeurs, directeurs des études, surveillants généraux, économes, proviseurs, inspecteurs…) avec les nominations validées.",
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
    description: "Les utilisateurs, les paramètres, les règles des diplômes, le menu et le journal des actions.",
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
        href: "/administration/droits",
        libelle: "Droits par rubrique",
        icone: ShieldCheck,
        visible: parametrer,
        explication: "Qui voit quoi, qui fait quoi : pour chaque rôle, ou pour une personne, choisir les rubriques masquées, en lecture seule ou ouvertes.",
      },
      {
        href: "/administration/menu",
        libelle: "Menu",
        icone: ListChecks,
        visible: parametrer,
        explication: "Renommer et ranger les rubriques du menu, les domaines et leurs volets : les noms choisis valent pour tout le monde.",
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

/**
 * Grande rubrique du menu qui regroupe plusieurs domaines (DG, 24/10/2026) : « Personnel » réunit
 * tout ce qui touche aux agents. Sa page montre une case par domaine, avec ce qu'on y fait.
 */
export interface Pole {
  cle: string;
  titre: string;
  icone: LucideIcon;
  description: string;
  espaces: string[];
}

export const POLES: Pole[] = [
  {
    cle: "rh",
    titre: "Personnel",
    icone: Users,
    description:
      "Tout ce qui touche aux agents du ministère : leur base et leur recensement, leur recrutement à la Fonction Publique, leurs affectations et mutations, les volontaires et communautaires, et leurs demandes.",
    espaces: ["personnel", "recrutement", "affectations", "mutations", "nominations", "enrolement", "demandes"],
  },
];

/** Ordre du menu, après le tableau de bord, les dossiers à traiter et les alertes. */
// « Structures et besoins » : entrée à part, après Personnel (DG, 26/10/2026)
export const MENU: { pole?: string; espace?: string }[] = [{ pole: "rh" }, { espace: "structures" }, { espace: "notes" }, { espace: "controle" }, { espace: "administration" }];

export const poleDe = (cleEspace: string | null | undefined) => (cleEspace ? (POLES.find((p) => p.espaces.includes(cleEspace)) ?? null) : null);

/** Domaines ouverts aux comptes des écoles, inspections… : leur personnel, leurs demandes, leur école. */
const ORIGINES_STRUCTURE = ["personnel", "demandes", "structures"];

/**
 * Rubriques d'un espace que ce profil peut voir. Les droits suivent la rubrique (et son domaine
 * d'origine pour les comptes des écoles), pas l'endroit où le menu l'a rangée.
 */
/** Rubriques que l'on peut fermer, jamais ouvrir au-delà du rôle (comme sur le serveur). */
const NON_OUVRABLES = ["/administration"];

/** Réglage du DG pour cette rubrique (son adresse sans « ?… »), s'il y en a un. */
export const niveauRubrique = (href: string, p: Profil) => p.droits?.[href.split("?")[0]];

/**
 * Rubriques visibles : les droits d'origine du rôle, puis les réglages du DG (Administration ›
 * Droits par rubrique) : masquée, ou ouverte en lecture ou en modification même hors du rôle.
 * Les comptes des écoles et inspections ne voient jamais que leur personnel et leurs demandes.
 */
export const rubriquesVisibles = (e: Espace, p: Profil) =>
  e.rubriques.filter((r) => {
    if (p.role === "STRUCTURE" && !ORIGINES_STRUCTURE.includes(r.origine ?? e.cle)) return false;
    const n = niveauRubrique(r.href, p);
    if (n === "MASQUE") return false;
    if (n && p.role !== "STRUCTURE" && !NON_OUVRABLES.includes(r.href)) return true;
    return !r.visible || r.visible(p);
  });

/** Rubrique d'une page : celle dont l'adresse est la plus précise. */
function rubriquePage(chemin: string) {
  let meilleur: string | null = null;
  for (const e of ESPACES)
    for (const r of e.rubriques) {
      const h = r.href.split("?")[0];
      if ((chemin === h || chemin.startsWith(`${h}/`)) && (!meilleur || h.length > meilleur.length)) meilleur = h;
    }
  return meilleur;
}

/** Réglage du DG qui vaut pour une page. */
export function niveauPage(chemin: string, p: Profil) {
  const h = p.droits ? rubriquePage(chemin) : null;
  return h ? p.droits?.[h] : undefined;
}

/**
 * La page est ouverte à ce compte par le DG (lecture ou modification), même si son rôle ne l'a pas
 * d'origine : les pages en tiennent compte en plus de leur contrôle de rôle.
 */
export function accesDonne(p: Profil) {
  if (typeof window === "undefined" || !p.droits || p.role === "STRUCTURE") return false;
  const h = rubriquePage(window.location.pathname);
  return !!h && !NON_OUVRABLES.includes(h) && (p.droits[h] === "LECTURE" || p.droits[h] === "MODIFICATION");
}

/** Où mène la case ou l'entrée d'un domaine : sa seule page s'il n'en a qu'une, sinon sa page d'accueil. */
export function lienEspace(e: Espace, p: Profil) {
  const r = rubriquesVisibles(e, p);
  return r.length === 1 ? r[0].href : `/espace/${e.cle}`;
}

/** Le domaine où se trouvent aujourd'hui les rubriques d'un domaine d'origine (pages de détail). */
const espaceAvecOrigine = (origine: string) => ESPACES.find((e) => e.rubriques.some((r) => r.origine === origine)) ?? null;

/** Espace auquel appartient une page (le plus long préfixe d'URL l'emporte). */
export function espaceDe(chemin: string): Espace | null {
  if (chemin.startsWith("/espace/")) return ESPACES.find((e) => chemin === `/espace/${e.cle}`) ?? null;
  let meilleur: { e: Espace; long: number } | null = null;
  for (const e of ESPACES)
    for (const r of e.rubriques)
      if ((chemin === r.href || chemin.startsWith(`${r.href}/`)) && (!meilleur || r.href.length > meilleur.long)) meilleur = { e, long: r.href.length };
  // Pages de détail rattachées à un domaine
  if (!meilleur) {
    if (chemin === "/pilotage") return espaceAvecOrigine("recrutement");
    if (chemin.startsWith("/structures")) return espaceAvecOrigine("structures");
    if (chemin.startsWith("/note/")) return espaceAvecOrigine("notes");
    if (chemin.startsWith("/mutation/")) return espaceAvecOrigine("mutations");
  }
  return meilleur?.e ?? null;
}

/** Nombre de choses à faire dans un espace (somme de ses rubriques visibles). */
export function travailEspace(e: Espace, p: Profil, c: Compteurs | null) {
  if (!c) return 0;
  return rubriquesVisibles(e, p).reduce((n, r) => n + (r.compteur?.(c).n ?? 0), 0);
}

/** Pages de détail : ce qui s'affiche au bout du chemin (après la rubrique). */
const DETAILS: [RegExp, string][] = [
  [/^\/personnel\/agents\/nouveau$/, "Nouvelle fiche"],
  [/^\/personnel\/agents\/\d+$/, "Fiche de l’agent"],
  [/^\/ecoles\/\d+$/, "Fiche de l’école"],
  [/^\/structures\/\d+$/, "Fiche de la structure"],
  [/^\/mutations\/nouvelle$/, "Nouvelle demande"],
  [/^\/mutation\//, "Demande"],
  [/^\/note\//, "Note de service"],
];

/**
 * Chemin de la page affiché en haut (fil d'Ariane) : grande rubrique (Personnel), domaine, rubrique,
 * puis la page de détail. Vide pour le tableau de bord et les dossiers à traiter.
 */
export function cheminDe(chemin: string, p: Profil): { libelle: string; href?: string }[] {
  const poleDirect = POLES.find((x) => chemin === `/espace/${x.cle}`);
  if (poleDirect) return [{ libelle: poleDirect.titre, href: `/espace/${poleDirect.cle}` }];
  const e = espaceDe(chemin);
  if (!e) return [];
  const etapes: { libelle: string; href?: string }[] = [];
  const pole = poleDe(e.cle);
  if (pole) etapes.push({ libelle: pole.titre, href: `/espace/${pole.cle}` });
  etapes.push({ libelle: e.titre, href: `/espace/${e.cle}` });
  if (chemin === `/espace/${e.cle}`) return etapes;
  // La rubrique dont l'adresse correspond le mieux à la page
  const r = rubriquesVisibles(e, p)
    .filter((x) => {
      const base = x.href.split("?")[0];
      return chemin === base || chemin.startsWith(`${base}/`);
    })
    .sort((a, b) => b.href.length - a.href.length)[0];
  // Même nom que le domaine (« Base du personnel ») : une seule étape
  if (r && r.libelle !== e.titre) etapes.push({ libelle: r.libelle, href: r.href });
  const detail = DETAILS.find(([re]) => re.test(chemin));
  if (detail && (!r || chemin !== r.href.split("?")[0])) etapes.push({ libelle: detail[1] });
  return etapes;
}

/* ------------------------------ Menu réglé par l'administrateur ou le DG ------------------------------ */

export type { ConfigMenu } from "./menu-config";
export const MENU_MODIFIE = "dgrhas:menu-modifie";

/** Icônes proposées pour les domaines et grandes rubriques créés dans Administration › Menu. */
export const ICONES_MENU: Record<string, LucideIcon> = {
  Folder,
  Users,
  Briefcase,
  ClipboardList,
  FileText,
  BookOpen,
  Building2,
  School,
  Landmark,
  Repeat,
  Search,
  Settings,
};

// Le menu d'origine (celui du programme), gardé tel quel : chaque réglage repart de lui
for (const e of ESPACES) for (const r of e.rubriques) r.origine = e.cle;
const ESPACES_ORIGINE = new Map(ESPACES.map((e) => [e.cle, { ...e, rubriques: [...e.rubriques] }]));
const POLES_ORIGINE = new Map(POLES.map((x) => [x.cle, { ...x, espaces: [...x.espaces] }]));
const RUBRIQUES_ORIGINE = new Map(ESPACES.flatMap((e) => e.rubriques.map((r) => [idRubrique(e.cle, r.href), { ...r }] as const)));
const RUBRIQUES = new Map(ESPACES.flatMap((e) => e.rubriques.map((r) => [idRubrique(e.cle, r.href), r] as const)));

/** Le menu d'origine, sous la forme que lit le réglage (noms, places, sous-sections). */
export const ORIGINE_MENU: OrigineMenu = {
  menu: MENU.map((m) => (m.pole ? `pole:${m.pole}` : `espace:${m.espace}`)),
  poles: POLES.map((x) => ({ cle: x.cle, titre: x.titre, description: x.description, espaces: [...x.espaces] })),
  espaces: ESPACES.map((e) => ({
    cle: e.cle,
    titre: e.titre,
    description: e.description,
    rubriques: e.rubriques.map((r) => ({ id: idRubrique(e.cle, r.href), href: r.href, libelle: r.libelle, ...(r.groupe ? { groupe: r.groupe } : {}) })),
  })),
};

/** Icône d'origine de chaque domaine et grande rubrique (« espace:personnel », « pole:rh »). */
export const ICONES_ORIGINE: Record<string, LucideIcon> = Object.fromEntries([
  ...[...ESPACES_ORIGINE.values()].map((e) => [`espace:${e.cle}`, e.icone] as const),
  ...[...POLES_ORIGINE.values()].map((x) => [`pole:${x.cle}`, x.icone] as const),
]);

/** La rubrique (page) d'un identifiant : son adresse, son icône, son explication. */
export const rubriqueDe = (id: string) => RUBRIQUES_ORIGINE.get(id) ?? null;

/**
 * Applique le menu réglé (Administration › Menu), en repartant toujours du menu d'origine : noms,
 * places des rubriques, sous-sections, domaines et grandes rubriques créés. Rien ne peut se perdre.
 */
export function appliquerMenu(c: ConfigMenu | null | undefined) {
  const m = construireMenu(ORIGINE_MENU, c);
  const espaces: Espace[] = m.espaces.map((x) => {
    const o = ESPACES_ORIGINE.get(x.cle);
    const rubriques = x.rubriques.map((y) => {
      const r = RUBRIQUES.get(y.id)!;
      r.libelle = y.libelle;
      r.groupe = y.groupe;
      return r;
    });
    return o
      ? { ...o, titre: x.titre, description: x.description, rubriques }
      : { cle: x.cle, titre: x.titre, description: x.description, icone: ICONES_MENU[x.icone ?? ""] ?? Folder, rubriques };
  });
  const poles: Pole[] = m.poles.map((x) => {
    const o = POLES_ORIGINE.get(x.cle);
    return o
      ? { ...o, titre: x.titre, description: x.description, espaces: x.espaces }
      : { cle: x.cle, titre: x.titre, description: x.description, icone: ICONES_MENU[x.icone ?? ""] ?? Folder, espaces: x.espaces };
  });
  ESPACES.splice(0, ESPACES.length, ...espaces);
  POLES.splice(0, POLES.length, ...poles);
  MENU.splice(0, MENU.length, ...m.menu.map((k) => (k.startsWith("pole:") ? { pole: k.slice(5) } : { espace: k.slice(7) })));
}
