import type { Ton } from "./libelles";

/** Écoles, présence et évaluation : libellés et types partagés par les pages. */

export const CYCLES: Record<string, string> = {
  PRESCOLAIRE: "Préscolaire",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  ALPHABETISATION: "Alphabétisation",
};

export const ETATS_LOCAL: Record<string, string> = { BON: "Bon état", MOYEN: "État moyen", MAUVAIS: "Mauvais état" };

export const ETATS_BESOIN: Record<string, { libelle: string; ton: Ton }> = {
  DEFICIT: { libelle: "Déficit", ton: "rouge" },
  EQUILIBRE: { libelle: "Équilibre", ton: "vert" },
  PLETHORE: { libelle: "Pléthore", ton: "jaune" },
};

/** « -1,5 » : il manque un enseignant et demi ; « +2 » : deux de trop. */
/**
 * Nom court d'un niveau pour nommer ses classes (même règle que le serveur) : le niveau reste en
 * toutes lettres (« Troisième »), la classe en chiffres (« 3ème 1 ») ; « 2nde C », « Tle D » au lycée.
 */
export function nomCourtNiveau(code: string, libelle: string) {
  const c = /^(\d)\s*E?ME$/i.exec(code.trim());
  if (c) return c[1] === "1" ? "1ère" : `${c[1]}ème`;
  const l = libelle.replace(/\s+/g, " ").trim();
  const lycee = l
    .replace(/^seconde\b/i, "2nde")
    .replace(/^premi[eè]re\b/i, "1ère")
    .replace(/^terminale\b/i, "Tle");
  if (lycee !== l) return lycee;
  if (l.length > 12 && /^[A-Z]{1,4}\d?$/i.test(code.trim())) return code.trim();
  return l;
}

export const ecartTexte = (n: number) => `${n > 0 ? "+" : ""}${String(n).replace(".", ",")}`;
export const decimal = (n: number | null | undefined) => (n === null || n === undefined ? "—" : String(n).replace(".", ","));

export interface LigneBesoin {
  matiere: string;
  libelle: string;
  heures: number;
  besoin: number;
  enPlace: number;
  ecart: number;
  etat: string;
}

export interface Besoins {
  heuresEnseignant: number;
  classes: number;
  enseignants: number;
  mode: "MATIERE" | "CLASSE" | "INCONNU";
  sansMatiere?: number;
  lignes: LigneBesoin[];
  total: { heures: number | null; besoin: number; enPlace: number; ecart: number; etat: string } | null;
  alertes: string[];
}

export const STATUTS_PRESENCE: Record<string, { court: string; libelle: string; classe: string }> = {
  PRESENT: { court: "P", libelle: "Présent", classe: "bg-marque-600 text-white" },
  RETARD: { court: "R", libelle: "En retard", classe: "bg-or-400 text-encre" },
  ABSENT_JUSTIFIE: { court: "AJ", libelle: "Absent (justifié)", classe: "bg-sky-600 text-white" },
  ABSENT: { court: "A", libelle: "Absent (non justifié)", classe: "bg-rouge-600 text-white" },
};
/** Ordre du clic sur une case : vide → présent → retard → absent justifié → absent → vide. */
export const CYCLE_PRESENCE = ["", "PRESENT", "RETARD", "ABSENT_JUSTIFIE", "ABSENT"];

export const APPRECIATIONS = ["Très faible", "Faible", "Bon", "Très bon", "Excellent"];
export const TON_APPRECIATION: Record<string, Ton> = { "Très faible": "rouge", Faible: "rouge", Bon: "vert", "Très bon": "vert", Excellent: "bleu" };
