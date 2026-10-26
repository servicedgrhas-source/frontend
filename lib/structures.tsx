import { Briefcase, Building, Building2, FileText, Landmark, Layers, type LucideIcon, MapPin, ScanSearch, School, ShieldCheck, Users } from "lucide-react";

/**
 * Présentation de chaque niveau de structure (icône, couleurs). L'ordre d'affichage vient du serveur,
 * le même que dans l'organigramme : le rang donné par le DG, puis la préséance du niveau, puis le sigle.
 */
export interface TypeStructure {
  libelle: string;
  rang: number;
  icone: LucideIcon;
  /** Pastille de l'icône et étiquette du niveau. */
  pastille: string;
  etiquette: string;
}

const T = (libelle: string, rang: number, icone: LucideIcon, pastille: string, etiquette: string): TypeStructure => ({ libelle, rang, icone, pastille, etiquette });

export const TYPES_STRUCTURE: Record<string, TypeStructure> = {
  MINISTERE: T("Ministère", 0, Landmark, "bg-marque-700 text-white", "bg-marque-700 text-white"),
  CABINET: T("Cabinet", 1, Briefcase, "bg-or-100 text-or-700", "bg-or-100 text-or-700"),
  INSPECTION_GENERALE: T("Inspection générale", 2, ShieldCheck, "bg-rouge-100 text-rouge-600", "bg-rouge-100 text-rouge-600"),
  DIRECTION_GENERALE: T("Direction générale", 3, Building2, "bg-marque-100 text-marque-700", "bg-marque-50 text-marque-700"),
  ORGANISME_TUTELLE: T("Organisme sous tutelle", 3, Landmark, "bg-indigo-100 text-indigo-700", "bg-indigo-50 text-indigo-700"),
  DGRHAS: T("Direction générale", 3, Building2, "bg-marque-100 text-marque-700", "bg-marque-50 text-marque-700"),
  DIRECTION_CENTRALE: T("Direction centrale", 4, Building, "bg-sky-100 text-sky-700", "bg-sky-50 text-sky-700"),
  DIRECTION_DGRHAS: T("Direction", 4, Building, "bg-sky-100 text-sky-700", "bg-sky-50 text-sky-700"),
  SERVICE: T("Service", 5, Layers, "bg-violet-100 text-violet-700", "bg-violet-50 text-violet-700"),
  SERVICE_DGRHAS: T("Service", 5, Layers, "bg-violet-100 text-violet-700", "bg-violet-50 text-violet-700"),
  BUREAU: T("Bureau", 6, FileText, "bg-zinc-100 text-zinc-600", "bg-zinc-100 text-zinc-600"),
  BUREAU_DGRHAS: T("Bureau", 6, FileText, "bg-zinc-100 text-zinc-600", "bg-zinc-100 text-zinc-600"),
  DDEPPSA: T("Direction départementale", 7, MapPin, "bg-amber-100 text-amber-700", "bg-amber-50 text-amber-700"),
  INSPECTION: T("Inspection", 8, ScanSearch, "bg-teal-100 text-teal-700", "bg-teal-50 text-teal-700"),
  ETABLISSEMENT: T("Établissement scolaire", 9, School, "bg-lime-100 text-lime-700", "bg-lime-50 text-lime-700"),
  /** Regroupement affiché sous le ministère (pas une structure). */
  GROUPE: T("Regroupement", 7, Users, "bg-amber-100 text-amber-700", "bg-amber-50 text-amber-700"),
};
const INCONNU = T("Structure", 9, Building, "bg-zinc-100 text-zinc-600", "bg-zinc-100 text-zinc-600");
export const typeStructure = (t: string) => TYPES_STRUCTURE[t] ?? INCONNU;

