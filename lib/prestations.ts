import type { EtapeCircuit } from "@/lib/types";

/**
 * Demandes de prestations (module à part des mutations) : définitions reçues du serveur
 * (prestations/definitions.ts) et libellés communs à l'application et au portail.
 */

export interface ChampPrestation {
  cle: string;
  libelle: string;
  type: "texte" | "zone" | "departement" | "liste" | "date";
  obligatoire?: boolean;
  aide?: string;
  exemple?: string;
  options?: { valeur: string; libelle: string }[];
}

export interface DefinitionPrestation {
  code: string;
  numero: number;
  libelle: string;
  famille: "AFFECTATION" | "NOMINATION" | "RECTIFICATIF" | "CERTIFICAT" | "ATTESTATION" | "AUTORISATION" | "CONGE" | "CESSATION" | "POSITION" | "CARRIERE" | "SOLDE" | "PRIME" | "RAPPEL" | "SOCIAL";
  /** Réservée aux femmes ou aux hommes (congé de maternité, de paternité). */
  pour?: "F" | "M";
  pourQui: string;
  acte: string;
  niveauDecision: string;
  signataire: string;
  objet: string;
  champs: ChampPrestation[];
  pieces: { libelle: string; obligatoire?: boolean; aide?: string }[];
  /** Le circuit en clair (catalogue) : voie hiérarchique puis étapes à la DGRHAS. */
  circuit: { phase: "EXTERNE" | "INTERNE"; libelle: string; nom: string | null }[];
}

/** Familles de démarches, dans l'ordre d'affichage. */
export const FAMILLES: Record<DefinitionPrestation["famille"], string> = {
  AFFECTATION: "Affectations",
  NOMINATION: "Nominations",
  CERTIFICAT: "Certificats de prise et de reprise de service",
  ATTESTATION: "Attestations",
  AUTORISATION: "Autorisations d’absence",
  CONGE: "Congés",
  CESSATION: "Cessations de service",
  POSITION: "Détachement et réutilisation",
  CARRIERE: "Carrière : statut, avancement, promotion",
  SOLDE: "Solde et salaire",
  PRIME: "Primes et indemnités",
  RAPPEL: "Rappels (sommes dues)",
  SOCIAL: "Allocations familiales et capital décès",
  RECTIFICATIF: "Rectificatifs",
};

export type EtatPrestation = "EN_COURS" | "EN_INSTANCE" | "ACCORDEE" | "REJETEE" | "RETIREE";

export const ETAT_PRESTATION: Record<EtatPrestation, { libelle: string; ton: "gris" | "vert" | "rouge" | "jaune" | "bleu" }> = {
  EN_COURS: { libelle: "En cours", ton: "bleu" },
  EN_INSTANCE: { libelle: "En instance", ton: "jaune" },
  ACCORDEE: { libelle: "Accordée", ton: "vert" },
  REJETEE: { libelle: "Rejetée", ton: "rouge" },
  RETIREE: { libelle: "Retirée", ton: "gris" },
};

/** Valeur lisible d'un renseignement propre à la prestation (« Département souhaité : Bouenza »). */
export function valeurChamp(c: ChampPrestation, details: Record<string, unknown>) {
  const v = c.type === "departement" ? details[`${c.cle}Nom`] : c.type === "liste" ? details[`${c.cle}Libelle`] : details[c.cle];
  if (v === undefined || v === null || v === "") return null;
  return c.type === "date" ? String(v).split("-").reverse().join("/") : String(v);
}

/** Acte proposé, une fois la demande accordée (prestations.service.ts › contenuActe). */
export interface ActeModule {
  reference: string;
  acte: string;
  titre: string;
  entete: "DGRHAS" | "DDEPPSA" | "PRIMATURE" | "STRUCTURE";
  prestation: string;
  objet: string;
  /** Visas, avant « DÉCIDE : » ou « DÉCRÈTE : ». */
  preambule: string[];
  /** Aucune pour un certificat ou une attestation. */
  formule: "DÉCIDE" | "DÉCRÈTE" | null;
  /** ARTICLES (« Article 1er : … »), TEXTE (certificat, attestation) ou LETTRE (soit-transmis). */
  forme: "ARTICLES" | "TEXTE" | "LETTRE";
  /** Lettre : destinataire, objet, formule d'appel. */
  lettre: { destinataire: string; objet: string; appel: string } | null;
  /** Lettre : les pièces du dossier, par nature, pour le tableau. */
  piecesJointes: { libelle: string; nombre: number }[];
  articles: string[];
  signataire: string;
  /** Structure qui délivre un certificat du lieu de service (en-tête). */
  structure: string | null;
  decideur: { sigle: string; nom: string; par: string | null } | null;
  ampliations: string[];
  lieu: string;
  decisionLe: string | null;
  demande: { date: string };
}

/** Une demande de prestation, telle que la renvoie GET /demandes-prestation/:id. */
export interface FichePrestation {
  id: string;
  numero: string;
  type: string;
  definition: DefinitionPrestation | null;
  agentId: number;
  agent: {
    nomComplet: string;
    genre: "M" | "F";
    matricule: string | null;
    numeroFiche: string | null;
    statut: string;
    grade: string | null;
    categorie: string | null;
    echelle: string | null;
    echelon: string | null;
    fonction: string | null;
    lieuService: string | null;
    ville: string | null;
    departement: string | null;
    telephone: string | null;
  };
  objet: string;
  precisions: string | null;
  details: Record<string, unknown>;
  canal: string;
  creePar: string | null;
  creeLe: string;
  etat: EtatPrestation;
  decision: "ACCORDEE" | "REJETEE" | "EN_INSTANCE" | null;
  decisionMotivation: string | null;
  decisionPar: string | null;
  decisionLe: string | null;
  motifRetrait: string | null;
  circuit: EtapeCircuit[];
  etapeCourante: number | null;
  pieces: { id: string; libelle: string; nomOrigine: string; taille: number; mime: string; ajoutePar: string | null; creeLe: string }[];
  manquantes: string[];
  peutAjouterPiece: boolean;
  peutRetirer: boolean;
}
