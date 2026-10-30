import type { Role } from "./api";
import type { EtatMutation, StatutNote } from "./types";

export const ROLES: Record<Role, string> = {
  ADMIN: "Administrateur",
  AGENT: "Chef de bureau (préparation de la base)",
  CHEF_SERVICE: "Chef de service (vérification et traitement)",
  DIRECTEUR: "DRSC (contrôle du traitement)",
  BUREAU_ETUDES: "Chef du bureau d’études (contrôle du traitement)",
  DG: "DGRHAS (validation)",
  DDEPPSA: "Directeur départemental",
  CABINET: "Cabinet du Ministre",
  SECRETARIAT: "Chef du secrétariat du DG (impression des dossiers et des notes)",
  STRUCTURE: "Responsable de structure (école, inspection, service…)",
};

export const STATUT_NOTE: Record<StatutNote, { libelle: string; ton: Ton; aide: string }> = {
  BROUILLON: {
    libelle: "À soumettre au DG",
    ton: "gris",
    aide: "La note est préparée et contient les personnes prêtes, mais elle n’est pas encore partie chez le DG. Relisez-la (aperçu imprimable), puis cliquez sur « Soumettre au DG ». Tant qu’elle n’est pas soumise, elle se met à jour toute seule : une personne complétée y entre automatiquement.",
  },
  SOUMISE: {
    libelle: "Soumise au DG",
    ton: "jaune",
    aide: "La note est chez le DG. Il la valide, ou la renvoie avec un commentaire : elle redevient alors « à soumettre au DG » pour correction.",
  },
  VALIDEE: {
    libelle: "Validée par le DG",
    ton: "bleu",
    aide: "Le contenu est figé et les personnes comptent comme « affectées ». Le chef de bureau, le chef de service et le directeur la lisent et donnent leur avis de conformité ; le DG ordonne ensuite l’impression. Il peut encore la rouvrir tant que le ministre n’a pas signé.",
  },
  SIGNEE: {
    libelle: "Signée",
    ton: "vert",
    aide: "Le ministre a signé : le numéro et la date de la note sont reportés. Plus aucune modification n’est possible. L’opération n’est clôturée que lorsque le scan PDF de la note signée est joint (archives).",
  },
};

export const STATUT_AFFECTATION: Record<string, { libelle: string; ton: Ton }> = {
  A_TRAITER: { libelle: "À traiter", ton: "gris" },
  EXCLU: { libelle: "Exclu", ton: "rouge" },
  AFFECTE: { libelle: "Affecté", ton: "vert" },
};

export const ETAT_MUTATION: Record<EtatMutation, { libelle: string; ton: Ton }> = {
  EN_CIRCUIT: { libelle: "En circuit d’approbation", ton: "bleu" },
  EN_INSTANCE: { libelle: "En instance", ton: "jaune" },
  EN_ATTENTE_DDEPPSA: { libelle: "Chez le DDEPPSA", ton: "gris" },
  EN_ATTENTE_DGRHAS: { libelle: "Chez la DGRHAS", ton: "jaune" },
  EN_ATTENTE_MINISTRE: { libelle: "Chez le Ministre", ton: "bleu" },
  ACCORDEE: { libelle: "Accordée", ton: "vert" },
  REFUSEE: { libelle: "Refusée", ton: "rouge" },
  RETIREE: { libelle: "Retirée", ton: "rouge" },
};

export const CYCLES: Record<string, string> = {
  PRESCOLAIRE: "Préscolaire",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  ADMINISTRATION: "Administration",
};

export const GROUPES_MUTATION: Record<string, string> = {
  PRESCO_PRIMAIRE: "Préscolaire et primaire",
  COLLEGE_LYCEE_ADMIN: "Collège, lycée et administration",
};

export type Ton = "gris" | "vert" | "jaune" | "rouge" | "bleu";

export function dateCourte(iso: string | null | undefined) {
  if (!iso) return "—";
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export function dateLongue(iso: string | null | undefined) {
  if (!iso) return null;
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
}

export function duree(mois: number | null | undefined) {
  if (mois === null || mois === undefined) return "—";
  const a = Math.floor(mois / 12);
  const m = mois % 12;
  if (!a) return `${m} mois`;
  return m ? `${a} an${a > 1 ? "s" : ""} ${m} mois` : `${a} an${a > 1 ? "s" : ""}`;
}

/** Droits d'interface (le serveur vérifie toujours). */
export const peut = {
  traiter: (r?: Role) => !!r && ["ADMIN", "AGENT", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "DG"].includes(r),
  decider: (r?: Role) => r === "ADMIN" || r === "DG",
  avisDdeppsa: (r?: Role) => r === "ADMIN" || r === "DDEPPSA",
  avisDgrhas: (r?: Role) => !!r && ["ADMIN", "DG", "DIRECTEUR"].includes(r),
  instruction: (r?: Role) => !!r && ["ADMIN", "DG", "CABINET"].includes(r),
  administrer: (r?: Role) => r === "ADMIN" || r === "DG",
  /** Contrôle des fiches saisies et envoi à la Fonction Publique. */
  controler: (r?: Role) => !!r && ["ADMIN", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "DG"].includes(r),
  /** Validation finale des fiches et décisions réservées au DG. */
  valider: (r?: Role) => r === "ADMIN" || r === "DG",
  /** Paramètres, règles des diplômes et grades. */
  parametrer: (r?: Role) => r === "ADMIN" || r === "DG",
  /** Budget (salaires, incidence financière) et informations internes DGRHAS. */
  voirBudget: (r?: Role) => r === "ADMIN" || r === "DG",
  /** Import de la base des recrutés : seule entrée sans le circuit. */
  importerBase: (r?: Role) => !!r && ["ADMIN", "CHEF_SERVICE", "DG"].includes(r),
  journal: (r?: Role) => !!r && ["ADMIN", "DG", "DIRECTEUR", "BUREAU_ETUDES"].includes(r),
};

/** Lots de réception (règle du DG) : un lot = un quota + un type de texte, dans un paquet. */
export const TYPE_LOT: Record<string, { pluriel: string; aide: string }> = {
  ARRETE: { pluriel: "Arrêtés", aide: "Signés par le ministre de la Fonction Publique (catégories II et III)" },
  DECRET_PM: { pluriel: "Décrets PM", aide: "Signés par le Premier ministre : diplômes de niveau licence" },
  DECRET_PR: { pluriel: "Décrets PR", aide: "Signés par le Président de la République : diplômes de niveau master" },
};

/** « Arrêtés quota 2024 — lot 3 » (un ancien lot pas encore rangé : « Lot 3 »). */
/** Chiffres romains des lots de la base (« VIII ») ; au-delà, le nombre. */
export function romain(n: number) {
  if (n <= 0 || n >= 40) return String(n);
  let r = "";
  for (const [v, x] of [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as const)
    while (n >= v) {
      r += x;
      n -= v;
    }
  return r;
}

export function libelleLot(
  l: { numero: number; typeTexte?: string | null; quota?: number | null; autres?: boolean | null; rang?: number | null; numeroFichier?: number | null } | null | undefined,
) {
  if (!l) return "—";
  // Lot de publication du fichier (DG, 30/10/2026) : « Arrêtés — lot VIII »
  if (l.numeroFichier) return `${l.typeTexte === "DECRET" ? "Décrets" : "Arrêtés"} — lot ${romain(l.numeroFichier)}`;
  if (!l.typeTexte || !l.rang) return `Lot ${l.numero}`;
  const q = l.autres ? "quota « Autres »" : l.quota ? `quota ${l.quota}` : "sans quota";
  return `${TYPE_LOT[l.typeTexte]?.pluriel ?? l.typeTexte} ${q} — lot ${l.rang}`;
}

const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** Nombre en toutes lettres, orthographe traditionnelle : 872 → « huit cent soixante-douze ». */
export function nombreEnLettres(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n <= 16) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  if (n < 70) {
    const d = Math.floor(n / 10), u = n % 10;
    return u === 0 ? DIZAINES[d] : u === 1 ? `${DIZAINES[d]} et un` : `${DIZAINES[d]}-${UNITES[u]}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${nombreEnLettres(n - 60)}`;
  if (n < 100) return n === 80 ? "quatre-vingts" : `quatre-vingt-${nombreEnLettres(n - 80)}`;
  if (n < 1000) {
    const c = Math.floor(n / 100), r = n % 100;
    const cent = c === 1 ? "cent" : `${UNITES[c]} cent${r === 0 ? "s" : ""}`;
    return r ? `${cent} ${nombreEnLettres(r)}` : cent;
  }
  if (n < 1000000) {
    const m = Math.floor(n / 1000), r = n % 1000;
    const mille = m === 1 ? "mille" : `${nombreEnLettres(m).replace(/cents$/, "cent").replace(/quatre-vingts$/, "quatre-vingt")} mille`;
    return r ? `${mille} ${nombreEnLettres(r)}` : mille;
  }
  return String(n);
}

/**
 * Libellé précis d'une anomalie ou d'un blocage, et ce qu'il signifie. Plusieurs départements
 * existent dans le système (affectation, origine d'une mutation, DDEPPSA) : on dit toujours
 * duquel il s'agit et ce qui était écrit dans le fichier.
 */
export function libelleAnomalie(
  a: string,
  ctx: { departementBrut?: string | null; feuille?: string | null; numeroOrdre?: number | null; quotaAutres?: boolean } = {},
): { titre: string; detail: string } {
  const ligne = ctx.feuille || ctx.numeroOrdre ? ` (liste ${ctx.feuille ?? "?"}${ctx.numeroOrdre ? `, n° d’ordre ${ctx.numeroOrdre}` : ""})` : "";
  switch (a) {
    case "Département absent":
      return {
        titre: "Département d’affectation : case vide dans le fichier Excel",
        detail: `Dans le fichier importé${ligne}, la colonne « Département » de cette personne était vide. On ne sait donc pas dans lequel des 15 départements scolaires elle doit être affectée. Choisissez-le d’après son dossier ou son texte de la Fonction Publique.`,
      };
    case "Département non reconnu":
      return {
        titre: `Département d’affectation non reconnu${ctx.departementBrut ? ` : « ${ctx.departementBrut} »` : ""}`,
        detail: `Dans le fichier importé${ligne}, la colonne « Département » contient ${ctx.departementBrut ? `« ${ctx.departementBrut} »` : "un texte"}, qui ne correspond à aucun des 15 départements scolaires (faute de frappe, nom d’une ville, d’un district ou d’une école…). Choisissez le bon département dans la liste.`,
      };
    case "Département retenu manquant":
      return {
        titre: "Département d’affectation pas encore choisi",
        detail: ctx.quotaAutres
          ? "Personne du quota « Autres » : aucun département ne lui est encore attribué. Donnez-lui un département ici, ou faites la répartition automatique dans Pilotage → Répartition du quota « Autres ». Sans département, elle n’entre dans aucune note de service."
          : "Aucun département d’affectation n’est choisi pour cette personne (le fichier n’en donnait pas, ou il n’a pas été reconnu). Sans département, elle n’entre dans aucune note de service.",
      };
    case "Colonnes Département/Source inversées (corrigé)":
      return {
        titre: "Département et source inversés dans le fichier (déjà corrigé)",
        detail: "Dans le fichier, le département et la source étaient l’un à la place de l’autre. Le système les a remis dans l’ordre : vérifiez simplement le département d’affectation.",
      };
    default:
      if (a.startsWith("Date de naissance improbable"))
        return {
          titre: a,
          detail:
            "Avec cette date, la personne aurait moins de 18 ans ou plus de 65 ans : c’est sans doute une faute de frappe (« 2018 » pour « 1988 »). Le statut contractuel calculé serait faux. Corrigez la date d’après le dossier, ou indiquez le statut écrit sur le texte de la FP.",
        };
      return { titre: a, detail: "" };
  }
}
