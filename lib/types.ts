import type { Role } from "./api";

export interface Departement {
  id: number;
  code: string;
  nom: string;
  article: string;
  ordre: number;
}

export interface RegleDiplome {
  code: string;
  libelle: string;
  cycle: string;
  typeNote: string;
  grade: string | null;
  gradeLibelle: string | null;
  categorie: string | null;
  echelle: number | null;
  echelon: number | null;
}

export interface Referentiels {
  departements: Departement[];
  regles: RegleDiplome[];
  typesNote: { code: string; libelle: string }[];
  motifs: { code: string; libelle: string }[];
  roles: Role[];
}

/** Champs qui nomment un lot de réception : « Arrêtés quota 2024 — lot 3 ». */
export interface LotRepere {
  id: number;
  numero: number;
  /** ARRETE, DECRET_PM (licence) ou DECRET_PR (master). */
  typeTexte?: "ARRETE" | "DECRET_PM" | "DECRET_PR" | null;
  quota?: number | null;
  autres?: boolean;
  /** N° du lot dans son quota et son type. */
  rang?: number | null;
}

export interface Lot extends LotRepere {
  libelle: string;
  paquet: { numero: number; dateReception: string | null; libelle: string } | null;
  dateReception: string | null;
  dateSignatureArretes: string | null;
  dateSignatureDecrets: string | null;
  observation: string | null;
  arretes: number;
  decrets: number;
  aTraiter: number;
  /** Personnes du lot par quota (« 2024 », « 2025 », « Autres »…). */
  quotas: { quota: string; n: number }[];
  /** Où en sont les personnes pas encore affectées. */
  detailATraiter: {
    /** Dans une note soumise au DG. */
    enValidation: number;
    /** Dans une note en brouillon. */
    enBrouillon: number;
    /** Prêtes, mais aucune note préparée pour leur type. */
    sansNote: number;
    /** Bloquées : il manque une information. */
    aCompleter: number;
    raisons: Record<string, number>;
  };
  exclus: number;
  affectes: number;
}

export interface Agent {
  id: string;
  feuille: string;
  quota: number | null;
  numeroOrdre: number | null;
  nomComplet: string;
  dateNaissance: string | null;
  dateNaissanceBrute: string | null;
  lieuNaissance: string | null;
  diplomeBrut: string | null;
  diplomeCode: string | null;
  departementBrut: string | null;
  departement: Departement | null;
  departementId: number | null;
  cycleBrut: string | null;
  lotCommission: string | null;
  /** Lot de volontaires, de communautaires, ou mixte (les deux). */
  lotNature: "VOLONTAIRE" | "COMMUNAUTAIRE" | "MIXTE" | null;
  /** Membre de la commission qui a apporté le dossier (sur une de ses places). */
  membreCommissionId?: string | null;
  /** Dossier validé mis à part (budget dépassé) : quota d'où il vient. */
  reporteDe?: number | null;
  reportMotif?: string | null;
  reportePar?: string | null;
  statut: string | null;
  typeTexte: "ARRETE" | "DECRET" | null;
  numeroTexte: string | null;
  dateSignatureTexte: string | null;
  dateReception: string | null;
  lotPublication: LotRepere | null;
  contractuelForce: boolean | null;
  anomalies: string[];
  observation: string | null;
  numeroListe: number | null;
  source: string | null;
  lieuServiceBrut: string | null;
  origineFiche: "IMPORT" | "SAISIE";
  etatFiche: "A_CONTROLER" | "CONTROLEE" | "VALIDEE" | null;
  saisiePar: string | null;
  controleePar: string | null;
  remarqueControle: string | null;
  transmissionNumero: number | null;
  transmission: string | null;
  /** Dossier mis de côté : n° de la transmission d'où il sort. */
  transmissionOrigine: number | null;
  misDeCoteMotif: string | null;
  misDeCotePar: string | null;
  misDeCoteLe: string | null;
  transmisLe: string | null;
  textePointePar: string | null;
  dateDepot: string | null;
  origineBrute: string | null;
  valideePar: string | null;
  contentieuxAge: "EN_ATTENTE" | "APPROUVE" | "REJETE" | null;
  contentieuxPar: string | null;
  rectifiee: boolean;
  creeLe: string;
  // calculés
  contractuel?: boolean | null;
  age?: number | null;
  reference?: string | null;
}

export interface Derive {
  cycleLibelle: string | null;
  grade: string | null;
  categorie: string | null;
  echelle: number | null;
  echelon: number | null;
  indice: number | null;
  salaireBrut: number | null;
  contractuel: boolean | null;
  contractuelImpose: boolean;
  age: number | null;
  reference: string | null;
  bloquants: string[];
  avertissements: string[];
}

export interface Affectation {
  id: string;
  agent: Agent;
  agentId: string;
  lotPublicationId: number;
  typeNote: string;
  departement: Departement | null;
  departementId: number | null;
  structure: string | null;
  etablissement: string | null;
  specialite: string | null;
  obs: string | null;
  origine: string | null;
  statut: "A_TRAITER" | "EXCLU" | "AFFECTE";
  motifExclusion: string | null;
  noteId: string | null;
  traitePar: string | null;
  derive: Derive;
  recommandationEnAttente: boolean;
}

export interface Recommandation {
  id: string;
  /** AFFECTATION, MUTATION ou ENROLEMENT */
  operation: string;
  affectation: Affectation | null;
  demandeId: string | null;
  enroleId: string | null;
  personne: string | null;
  /** AVIS_DIRECTEUR puis DECISION_DG */
  etape: string;
  avisDirecteur: { avis: "FAVORABLE" | "DEFAVORABLE"; motif: string; par: string; le: string } | null;
  typeNote: string | null;
  departementId: number | null;
  structure: string | null;
  etablissement: string | null;
  origine: string;
  motif: string | null;
  statut: "EN_ATTENTE" | "VALIDEE" | "REJETEE";
  avant: { typeNote?: string; departementId?: number; structure?: string; etablissement?: string } | null;
  soumisPar: string | null;
  decidePar: string | null;
  dateDecision: string | null;
  commentaireDecision: string | null;
  creeLe: string;
  departementPropose: string | null;
  departementAvant: string | null;
}

export interface LigneNote {
  id: string;
  n: number;
  [cle: string]: string | number | null;
}

export interface ContenuNote {
  titre: string;
  introduction: string;
  colonnes: { cle: string; libelle: string }[];
  classification: boolean;
  /** sousTitre : établissement, quand les personnes du département en ont un. */
  sections: { titre: string | null; sousTitre?: string | null; lignes: LigneNote[] }[];
  total: number;
  departements: number;
  ampliations: { libelle: string; nombre: string }[];
  mentions: string[];
  piedDePage: string;
  repere: string;
  bloques?: { id: string; nom: string; raisons: string[] }[];
}

export type StatutNote = "BROUILLON" | "SOUMISE" | "VALIDEE" | "SIGNEE";

export interface NoteResume {
  id: string;
  module: "AFFECTATION" | "MUTATION" | "ENROLEMENT" | "NOMINATION";
  typeNote: string;
  motif: string | null;
  lotNumero: number | null;
  /** « Arrêtés quota 2024 — lot 3 ». */
  lotLibelle?: string | null;
  anneeScolaire: string;
  rang: number;
  numero: string | null;
  dateSignature: string | null;
  statut: StatutNote;
  libelle: string;
  total: number;
  commentaire: string | null;
  creePar: string | null;
  soumisePar: string | null;
  valideePar: string | null;
  valideeLe: string | null;
  /** Avis de conformité (chef de bureau, chef de service, directeur) donnés après la validation. */
  conformite?: AvisConformite[];
  /** À qui le DG a ordonné d'imprimer pour la signature : directeur ou secrétariat. */
  impressionPour?: "DIRECTEUR" | "SECRETARIAT" | null;
  impressionOrdonneePar?: string | null;
  impressionOrdonneeLe?: string | null;
  /** Scan PDF de la note signée : il clôture l'opération. */
  scanFichier?: string | null;
  scanNom?: string | null;
  scanLe?: string | null;
  scanPar?: string | null;
  creeLe: string;
}

export interface AvisConformite {
  niveau: "BUREAU" | "SERVICE" | "DIRECTION";
  par: string;
  le: string;
  conforme: boolean;
  remarque: string | null;
}

export interface NoteDetail extends NoteResume {
  introduction: string;
  /** Notes d'affectation : autres lots réunis dans cette note. */
  lotsReunis?: { id: number; numero: number; libelle: string }[];
  contenu: ContenuNote;
  entete: {
    reference: string;
    signataireTitre: string;
    signataireNom: string;
    lieu: string;
    piedDroite: string;
    adresse: string;
  };
}

/** Une étape du circuit d'approbation d'une demande. */
export interface EtapeCircuit {
  phase: "EXTERNE" | "INTERNE";
  structureId: number | null;
  type: string;
  sigle: string;
  nom: string;
  arriveeLe: string | null;
  visaPar: string | null;
  visaLe: string | null;
  avis: "FAVORABLE" | "REJET" | null;
  motivation: string | null;
  surPapier?: boolean;
  sautee?: string | null;
}

export type EtatMutation =
  | "EN_CIRCUIT"
  | "EN_INSTANCE"
  | "EN_ATTENTE_DDEPPSA"
  | "EN_ATTENTE_DGRHAS"
  | "EN_ATTENTE_MINISTRE"
  | "ACCORDEE"
  | "REFUSEE"
  | "RETIREE";

export interface DemandeMutation {
  id: string;
  /** Confié au secrétariat du DG pour imprimer la fiche et les pièces jointes. */
  envoyeSecretariatLe?: string | null;
  envoyeSecretariatPar?: string | null;
  numeroEnregistrement: number;
  dateEnregistrement: string | null;
  nomComplet: string;
  genre: "M" | "F";
  grade: string | null;
  echelon: number | null;
  gradeBrut: string | null;
  matricule: string | null;
  typeAgent: "FONCTIONNAIRE" | "FINALISTE";
  statutAgent: "ENSEIGNANT" | "PERSONNEL_ADMINISTRATIF";
  departementOrigine: Departement | null;
  departementOrigineId: number | null;
  lieuService: string | null;
  cycle: string | null;
  specialite: string | null;
  datePriseService: string | null;
  dureeMois: number | null;
  dureeMoisCalculee: number | null;
  departementSollicite: Departement | null;
  departementSolliciteId: number | null;
  lieuSollicite: string | null;
  motif: string;
  justificatif: string | null;
  justificatifFichier: string | null;
  permutationAvecId: string | null;
  permutant?: { id: string; nomComplet: string } | null;
  origine: string | null;
  observation: string | null;
  avisDdeppsa: "FAVORABLE" | "DEFAVORABLE" | null;
  avisDdeppsaCommentaire: string | null;
  avisDdeppsaPar: string | null;
  avisDgrhas: "FAVORABLE" | "DEFAVORABLE" | null;
  avisDgrhasCommentaire: string | null;
  avisDgrhasPar: string | null;
  instructionMinistre: "ACCORDEE" | "REFUSEE" | null;
  instructionCommentaire: string | null;
  instructionPar: string | null;
  retiree: boolean;
  motifRetrait: string | null;
  noteId: string | null;
  anomalies: string[];
  etat: EtatMutation;
  saisiePar: string | null;
  typePrestation: string | null;
  objet: string | null;
  canal: "PORTAIL" | "SAISIE" | "IMPORT";
  structureOrigineId: number | null;
  structureOrigineTexte: string | null;
  telephone: string | null;
  circuit: EtapeCircuit[] | null;
  etapeCourante: number | null;
  decideur: string | null;
  decision: "ACCORDEE" | "REJETEE" | "EN_INSTANCE" | null;
  decisionMotivation: string | null;
  decisionPar: string | null;
  decisionLe: string | null;
  /** Où se trouve le dossier et depuis combien de jours. */
  etapeEnCours: { sigle: string; nom: string; rang: number; etapes: number; depuis: number | null } | null;
}
