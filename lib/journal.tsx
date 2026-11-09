"use client";

import {
  ArrowLeftRight,
  Ban,
  ClipboardCheck,
  CalendarDays,
  FilePen,
  FileSignature,
  FileText,
  KeyRound,
  Inbox,
  Lock,
  LogIn,
  Paperclip,
  RotateCcw,
  Send,
  Settings,
  Stamp,
  Trash2,
  Upload,
  UserCog,
  UserPen,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/api";
import { dateLongue, GROUPES_MUTATION, ROLES, type Ton } from "@/lib/libelles";
import { ESPACES } from "@/lib/espaces";
import type { Referentiels } from "@/lib/types";

/*
 * Journal des actions : ce que veut dire chaque ligne, en clair (DG, 08/11/2026). Partagé par la
 * page du journal et sa version imprimable.
 */

export interface Entree {
  utilisateurId?: string | null;
  id: number;
  date: string;
  utilisateurNom: string | null;
  action: string;
  entite: string | null;
  entiteId: string | null;
  objet: string | null;
  details: Record<string, unknown> | null;
}

export type Description = { titre: string; icone: LucideIcon; ton: Ton; texte?: string };

const nf = new Intl.NumberFormat("fr-FR");

/** Valeur lisible : dates en toutes lettres, booléens, listes. */
export function lisible(v: unknown): string {
  if (v === null || v === undefined || v === "") return "vide";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "number") return nf.format(v);
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}$/.test(v) ? (dateLongue(v) ?? v) : v;
  if (Array.isArray(v)) return v.map(lisible).join(", ");
  return "";
}

const CHAMPS: Record<string, string> = {
  dateNaissance: "date de naissance",
  departementId: "département",
  diplomeCode: "diplôme",
  diplome: "diplôme",
  numeroTexte: "n° du texte",
  typeTexte: "type de texte",
  dateSignatureTexte: "date de signature du texte",
  contractuelForce: "statut contractuel",
  dateSignatureArretes: "signature des arrêtés",
  dateSignatureDecrets: "signature des décrets",
  dateReception: "date de réception",
  observation: "observation",
  specialite: "spécialité",
  structure: "structure",
  etablissement: "établissement",
  obs: "observation",
  grade: "grade",
  gradeLibelle: "libellé du grade",
  categorie: "catégorie",
  echelle: "échelle",
  echelon: "échelon",
  cycle: "cycle",
  typeNote: "note",
  libelle: "libellé",
};

function decrireBase(e: Entree, refs: Referentiels, parametres: Record<string, string> = {}): Description {
  const d = e.details ?? {};
  const dep = (id: unknown) => refs.departements.find((x) => x.id === Number(id))?.nom ?? "—";
  const note = (c: unknown) => refs.typesNote.find((t) => t.code === c)?.libelle ?? String(c ?? "");
  const motif = (c: unknown) => refs.motifs.find((m) => m.code === c)?.libelle ?? String(c ?? "");
  const valeur = (champ: string, v: unknown) => {
    if (champ === "departementId") return dep(v);
    if (champ === "typeNote") return note(v);
    if (champ === "contractuelForce") return v === null ? "calcul automatique" : v ? "contractuel" : "fonctionnaire";
    return lisible(v);
  };
  const changements = (objet: Record<string, unknown>) =>
    Object.entries(objet)
      .filter(([k]) => CHAMPS[k])
      .map(([k, v]) => `${CHAMPS[k]} : ${valeur(k, v)}`)
      .join(" · ");
  const commentaire = d.commentaire ? `Commentaire : « ${String(d.commentaire)} »` : undefined;
  const avis = (v: unknown) => ({ FAVORABLE: "Favorable", DEFAVORABLE: "Défavorable", ACCORDEE: "Accordée", REFUSEE: "Refusée" })[String(v)] ?? String(v);

  switch (e.action) {
    case "CONNEXION":
      return { titre: "Connexion au système", icone: LogIn, ton: "gris" };
    case "CHANGEMENT_MOT_DE_PASSE":
      return { titre: "Mot de passe modifié", icone: KeyRound, ton: "gris" };
    case "IMPORT_BASE_RECRUTEMENT":
      return {
        titre: "Import de la base des recrutés (entrée directe, sans le circuit)",
        icone: Upload,
        ton: "jaune",
        texte: `Fichier « ${String(d.fichier ?? "")} » : ${lisible(d.lignesLues)} lignes lues, ${lisible(d.crees)} nouvelles fiches, ${lisible(d.misAJour)} mises à jour, ${lisible(d.affectationsCreees)} nouveaux agents à affecter.`,
      };
    case "IMPORT_MUTATIONS":
      return {
        titre: "Import du fichier des mutations",
        icone: Upload,
        ton: "vert",
        texte: `${lisible(d.lues)} demandes lues, ${lisible(d.creees)} créées, ${lisible(d.misesAJour)} mises à jour.`,
      };
    case "SAISIE_CANDIDAT":
      return { titre: "Candidat saisi", icone: UserPlus, ton: "vert", texte: changements(d) || undefined };
    case "MODIFICATION_CANDIDAT":
      return { titre: "Fiche du candidat modifiée", icone: UserPen, ton: "jaune", texte: changements(d) || undefined };
    case "CONTROLE_CANDIDAT":
      return { titre: "Fiche contrôlée : conforme au dossier", icone: ClipboardCheck, ton: "vert" };
    case "RETOUR_CANDIDAT":
      return { titre: "Fiche renvoyée pour correction", icone: RotateCcw, ton: "rouge", texte: d.remarque ? `À corriger : ${String(d.remarque)}` : undefined };
    case "SUPPRESSION_CANDIDAT":
      return { titre: "Fiche de candidat supprimée", icone: Trash2, ton: "rouge", texte: d.nom ? String(d.nom) : undefined };
    case "ENVELOPPE_MODIFIEE":
      return {
        titre: `Enveloppe du ${d.perimetre === "AUTRES" ? "quota « Autres »" : `quota ${lisible(d.perimetre)}`} modifiée`,
        icone: Settings,
        ton: "jaune",
        texte: `${new Intl.NumberFormat("fr-FR").format(Number(d.montantAnnuel ?? 0))} FCFA par an`,
      };
    case "REPARTITION_QUOTA_AUTRES":
      return { titre: "Répartition du quota « Autres » validée", icone: Stamp, ton: "vert", texte: `${lisible(d.personnes)} personne(s) placée(s) dans ${lisible(d.departements)} département(s)` };
    case "REPARTITION_ANNULEE":
      return { titre: "Répartition du quota « Autres » annulée", icone: RotateCcw, ton: "rouge", texte: `${lisible(d.annules)} personne(s) de nouveau sans département` };
    case "VALIDATION_CANDIDATS":
      return { titre: "Fiches validées par le DGRHAS", icone: Stamp, ton: "vert", texte: `${lisible(d.fiches)} fiche(s), prêtes pour la Fonction Publique` };
    case "CONTENTIEUX_AGE":
      return {
        titre: d.decision === "APPROUVE" ? "Dérogation d’âge accordée" : "Dérogation d’âge refusée",
        icone: Stamp,
        ton: d.decision === "APPROUVE" ? "vert" : "rouge",
      };
    case "IMPORT_CANDIDATS":
      return {
        titre: "Import d’une liste de candidats",
        icone: Upload,
        ton: "vert",
        texte: `Fichier « ${String(d.fichier ?? "")} » : ${lisible(d.lues)} lignes lues, ${lisible(d.creees)} fiches créées, ${lisible(d.dejaPresentes)} déjà présentes.`,
      };
    case "AJOUT_QUOTA_AUTRES":
      return { titre: "Personne ajoutée au quota « Autres » (texte de la FP)", icone: UserPlus, ton: "vert", texte: d.diplome ? `Diplôme : ${String(d.diplome)}` : undefined };
    case "NOTE_ROUVERTE":
      return { titre: "Note rouverte pour modification", icone: RotateCcw, ton: "jaune" };
    case "CONNEXION_REFUSEE_CODE":
      return { titre: "Connexion refusée : code personnel absent ou faux", icone: Lock, ton: "rouge" };
    case "CODES_PERSONNELS_REGENERES":
      return { titre: d.tous ? "Codes personnels régénérés pour tous les comptes" : "Code personnel régénéré", icone: Lock, ton: "jaune", texte: d.comptes ? `${lisible(d.comptes)} compte(s)` : undefined };
    case "CODES_PERSONNELS_CONSULTES":
      return { titre: "Codes personnels consultés", icone: Lock, ton: "bleu", texte: d.comptes ? `${lisible(d.comptes)} compte(s)` : undefined };
    case "VERIFICATION_CODES_REFUSEE":
      return { titre: "Accès aux codes refusé (mot de passe ou code faux)", icone: Lock, ton: "rouge" };
    case "PERSONNEL_CONTENTIEUX_CONTROLE":
      return {
        titre: `Recensement : avis ${d.avis === "FAVORABLE" ? "favorable" : "défavorable"} du contrôle sur un agent ajouté`,
        icone: UserPlus,
        ton: d.avis === "FAVORABLE" ? "vert" : "rouge",
        texte: [d.nom ? String(d.nom) : null, d.note ? `« ${String(d.note)} »` : null].filter(Boolean).join(" — ") || undefined,
      };
    case "PERSONNEL_CONTENTIEUX":
      return {
        titre: d.decision === "CONFIRMER" ? "Recensement : agent ajouté accepté dans la base par le DG" : "Recensement : agent ajouté rejeté par le DG",
        icone: UserPlus,
        ton: d.decision === "CONFIRMER" ? "vert" : "rouge",
        texte: [d.nom ? String(d.nom) : null, d.note ? `« ${String(d.note)} »` : null, d.sansControle ? "décidé sans contrôle" : null].filter(Boolean).join(" — ") || undefined,
      };
    case "RECENSEMENT_IMPORT":
      return {
        titre: d.recensement ? "Import d’un fichier de recensement" : "Import d’un fichier du personnel",
        icone: UserPlus,
        ton: "bleu",
        texte: `${lisible(d.crees ?? 0)} ajouté(s), ${lisible(d.misAJour ?? 0)} ${d.recensement ? "complété(s)" : "mis à jour"}${d.contentieux ? `, ${lisible(d.contentieux)} envoyé(s) au contrôle` : ""}`,
      };
    case "NOTE_CONFORMITE":
      return {
        titre: d.conforme ? "Avis de conformité : la note est conforme" : "Avis de conformité : la note n’est PAS conforme",
        icone: Lock,
        ton: d.conforme ? "vert" : "rouge",
        texte: [d.niveau === "BUREAU" ? "Chef de bureau" : d.niveau === "SERVICE" ? "Chef de service" : d.niveau === "DIRECTION" ? "Directeur" : null, d.remarque ? `« ${String(d.remarque)} »` : null].filter(Boolean).join(" — ") || undefined,
      };
    case "NOTE_IMPRESSION_ORDONNEE":
      return { titre: "Impression de la note ordonnée par le DG", icone: Lock, ton: "bleu", texte: d.pour === "DIRECTEUR" ? "Au directeur" : "Au secrétariat" };
    case "NOTE_SCAN_AJOUTE":
      return { titre: "Scan de la note signée joint : opération clôturée", icone: Lock, ton: "vert", texte: d.numero ? `Note n° ${String(d.numero)}` : undefined };
    case "DEMANDE_ENVOYEE_SECRETARIAT":
      return { titre: "Dossier accordé envoyé au secrétariat du DG", icone: Lock, ton: "bleu", texte: d.numero ? `Demande n° ${String(d.numero)}` : undefined };
    case "TRANSMISSION_FP":
      return { titre: `Transmission n° ${lisible(d.numero)}${d.quota ? ` du quota ${lisible(d.quota)}` : ""} préparée pour la Fonction Publique`, icone: Send, ton: "vert", texte: `${lisible(d.fiches)} fiche(s)` };
    case "ANNULATION_TRANSMISSION":
      return { titre: `Transmission n° ${lisible(d.numero)}${d.quota ? ` du quota ${lisible(d.quota)}` : ""} annulée`, icone: RotateCcw, ton: "rouge", texte: `${lisible(d.fiches)} fiche(s) redevenues modifiables` };
    case "MISE_DE_COTE":
      return { titre: `Dossier mis de côté (transmission n° ${lisible(d.transmission)} du quota ${lisible(d.quota)})`, icone: RotateCcw, ton: "jaune", texte: d.motif ? `Motif : ${String(d.motif)}` : undefined };
    case "RATTACHEMENT_TRANSMISSION":
      return { titre: `Dossier corrigé remis dans la transmission n° ${lisible(d.transmission)} du quota ${lisible(d.quota)}`, icone: Send, ton: "vert" };
    case "REPORT_QUOTA":
      return {
        titre: `${lisible(d.fiches)} dossier(s) mis à part : du quota ${lisible(d.de)} au quota ${lisible(d.vers)}`,
        icone: RotateCcw,
        ton: "jaune",
        texte: d.motif ? `Motif : ${String(d.motif)}` : undefined,
      };
    case "ANNULATION_REPORT":
      return { titre: `Mise à part annulée : dossier remis dans le quota ${lisible(d.quota)}`, icone: RotateCcw, ton: "vert" };
    case "MEMBRE_COMMISSION_AJOUTE":
      return { titre: `Membre de la commission ajouté (quota ${lisible(d.quota)})`, icone: UserPlus, ton: "vert", texte: `${lisible(d.places)} place(s)` };
    case "MEMBRE_COMMISSION_MODIFIE":
      return { titre: `Membre de la commission modifié (quota ${lisible(d.quota)})`, icone: UserPen, ton: "jaune", texte: `${lisible(d.places)} place(s)` };
    case "MEMBRE_COMMISSION_SUPPRIME":
      return { titre: "Membre de la commission retiré", icone: Trash2, ton: "rouge" };
    case "IMPORT_RETOUR_FP":
      return {
        titre: "Import du fichier Excel de la FP (réception des textes)",
        icone: Inbox,
        ton: Number(d.ajouteesQuotaAutres ?? 0) > 0 ? "jaune" : "vert",
        texte: `Fichier « ${String(d.fichier ?? "")} » : ${lisible(d.textes)} texte(s), ${lisible(d.personnes)} personne(s) pointée(s)${d.paquet ? ` (${String(d.paquet)})` : ""} : ${lotJournal(d.lot)}${Number(d.ajouteesQuotaAutres ?? 0) > 0 ? `, dont ${lisible(d.ajouteesQuotaAutres)} ajoutée(s) au quota « Autres »` : ""}${Number(d.refusees ?? 0) > 0 ? `, ${lisible(d.refusees)} refusée(s)` : ""}.`,
      };
    case "RECEPTION_TEXTE":
      return {
        titre: `${d.typeTexte === "DECRET" ? "Décret" : "Arrêté"} n° ${lisible(d.numeroTexte)} reçu`,
        icone: Inbox,
        ton: "vert",
        texte: `${lisible(d.personnes)} personne(s) pointée(s)${d.lot ? ` · ${lotJournal(d.lot)}` : ""}`,
      };
    case "ANNULATION_RECEPTION":
      return {
        titre: "Personne retirée d’un texte reçu",
        icone: RotateCcw,
        ton: "rouge",
        texte: `${d.typeTexte === "DECRET" ? "Décret" : "Arrêté"} n° ${lisible(d.numeroTexte)}${d.lot ? ` · ${lotJournal(d.lot)}` : ""}`,
      };
    case "IMPORT_ANCIENS_RECRUTES":
      return { titre: "Liste d’une année précédente importée (contrôle des doublons)", icone: Upload, ton: "vert", texte: `Fichier « ${String(d.fichier ?? "")} » : ${lisible(d.lignes)} personne(s)` };
    case "SUPPRESSION_ANCIENS_RECRUTES":
      return { titre: "Liste d’une année précédente retirée", icone: Trash2, ton: "rouge", texte: `${String(d.source ?? "")} : ${lisible(d.lignes)} personne(s)` };
    case "ORIGINE_DOSSIER":
      return { titre: "Origine des dossiers ajoutée ou modifiée", icone: Settings, ton: "jaune", texte: String(d.libelle ?? "") };
    case "ORIGINE_DOSSIER_SUPPRIMEE":
      return { titre: "Origine des dossiers retirée de la liste", icone: Trash2, ton: "rouge", texte: String(d.libelle ?? "") };
    case "AJOUT_PIECE":
      return { titre: `Scan joint au dossier${d.legalise ? " (texte légalisé)" : ""}`, icone: Upload, ton: "vert" };
    case "MODIFICATION_PIECE":
      return { titre: d.legalise ? "Scan marqué « légalisé »" : "Scan marqué « non légalisé »", icone: Settings, ton: "jaune" };
    case "SUPPRESSION_PIECE":
      return { titre: "Scan retiré du dossier", icone: Trash2, ton: "rouge" };
    case "DEMANDE_PORTAIL":
      return { titre: "Demande de mutation faite en ligne par l’agent (portail)", icone: Upload, ton: "vert", texte: `${lisible(d.pieces)} pièce(s) jointe(s)` };
    case "AVIS_CIRCUIT":
      return {
        titre: `${String(d.etape ?? "")} : ${d.avis === "FAVORABLE" ? "avis favorable" : "rejet"}${d.surPapier ? " (recopié du papier)" : ""}`,
        icone: d.avis === "FAVORABLE" ? Stamp : RotateCcw,
        ton: d.avis === "FAVORABLE" ? "vert" : "rouge",
      };
    case "DECISION_DEMANDE":
      return {
        titre: `Décision : ${d.decision === "ACCORDEE" ? "prestation accordée" : d.decision === "REJETEE" ? "prestation rejetée" : "prestation en instance"}`,
        icone: Stamp,
        ton: d.decision === "ACCORDEE" ? "vert" : d.decision === "REJETEE" ? "rouge" : "jaune",
      };
    case "INSTRUCTION_DEMANDE":
      return { titre: `Instruction donnée à ${String(d.pour ?? "")}`, icone: Send, ton: "jaune", texte: d.echeance ? `Pour le ${String(d.echeance)}` : undefined };
    case "ETAPE_FRANCHIE":
      return { titre: `Étape ${String(d.etape ?? "")} franchie sans avis`, icone: RotateCcw, ton: "jaune", texte: String(d.motif ?? "") };
    case "PIECES_AJOUTEES":
      return { titre: "Pièces jointes à une demande", icone: Upload, ton: "vert", texte: `${lisible(d.n)} fichier(s)` };
    case "PIECE_RETIREE":
      return { titre: "Pièce retirée d’une demande", icone: Trash2, ton: "rouge", texte: String(d.libelle ?? "") };
    case "STRUCTURE_AJOUTEE":
      return { titre: "Organigramme : structure ajoutée", icone: Settings, ton: "vert", texte: [d.sigle, d.nom].filter(Boolean).map(String).join(" · ") };
    case "STRUCTURE_MODIFIEE":
      return { titre: "Organigramme : structure modifiée", icone: Settings, ton: "jaune", texte: [d.sigle, d.nom].filter(Boolean).map(String).join(" · ") };
    case "STRUCTURE_DEPLACEE":
      return { titre: `Organigramme : structure ${d.sens === "haut" ? "montée" : "descendue"} d’un rang`, icone: Settings, ton: "jaune", texte: String(d.sigle ?? "") };
    case "STRUCTURE_SUPPRIMEE":
      return { titre: "Organigramme : structure supprimée", icone: Trash2, ton: "rouge", texte: String(d.sigle ?? "") };
    case "TYPE_PRESTATION_MODIFIE":
      return { titre: "Catalogue des prestations modifié", icone: Settings, ton: "jaune" };
    case "DELEGATION_DONNEE":
      return { titre: `Délégation à ${String(d.delegue ?? "")} pendant une absence`, icone: UserPen, ton: "jaune", texte: d.fin ? `Jusqu’au ${String(d.fin)}` : undefined };
    case "DELEGATION_ARRETEE":
      return { titre: "Délégation arrêtée (retour)", icone: UserPen, ton: "vert" };
    case "BENEFICIAIRE_QUOTA":
      return { titre: "Bénéficiaire du quota enregistré", icone: Settings, ton: "jaune", texte: String(d.nom ?? "") };
    case "QUOTA_REAJUSTE":
      return { titre: "Quota réajusté par bénéficiaire et par cycle", icone: Settings, ton: "jaune", texte: `${lisible(d.places)} place(s)` };
    case "REORGANISATION_LOTS":
      return {
        titre: "Lots de textes réorganisés (un lot par quota et par type, dans chaque paquet)",
        icone: CalendarDays,
        ton: "jaune",
        texte: `${lisible(d.anciensLots)} anciens lots → ${lisible(d.nouveauxLots)} lots dans ${lisible(d.paquets)} paquets (${lisible(d.personnes)} personnes)`,
      };
    case "MODIFICATION_LOT":
      return { titre: "Lot modifié", icone: CalendarDays, ton: "jaune", texte: changements(d) };
    case "CORRECTION_AGENT": {
      const apres = (d.apres ?? {}) as Record<string, unknown>;
      return { titre: "Fiche corrigée", icone: UserPen, ton: "jaune", texte: changements(apres) || undefined };
    }
    case "MODIFICATION_AFFECTATION":
      return { titre: "Affectation complétée", icone: FilePen, ton: "jaune", texte: changements(d) };
    case "EXCLUSION_AFFECTATION":
      return { titre: "Agent retiré de la note", icone: Ban, ton: "rouge", texte: d.motif ? `Motif : ${String(d.motif)}` : undefined };
    case "REINTEGRATION_AFFECTATION":
      return { titre: "Agent réintégré", icone: RotateCcw, ton: "vert" };
    case "RECOMMANDATION_PROPOSEE": {
      const parts = [
        d.departementId ? `vers ${dep(d.departementId)}` : null,
        d.typeNote ? `note « ${note(d.typeNote)} »` : null,
        d.structure ? `structure ${String(d.structure)}` : null,
        d.etablissement ? `établissement ${String(d.etablissement)}` : null,
        d.origine ? `origine : ${String(d.origine)}` : null,
      ].filter(Boolean);
      return { titre: "Recommandation proposée", icone: Stamp, ton: "jaune", texte: parts.join(" · ") };
    }
    case "RECOMMANDATION_VALIDEE":
      return { titre: "Recommandation validée par le DG", icone: Stamp, ton: "vert", texte: commentaire };
    case "RECOMMANDATION_REJETEE":
      return { titre: "Recommandation rejetée par le DG", icone: Stamp, ton: "rouge", texte: commentaire };
    case "PREPARATION_NOTES_AFFECTATION": {
      const notes = (d.notes as string[] | undefined) ?? [];
      return {
        titre: "Notes d’affectation préparées",
        icone: FileText,
        ton: "vert",
        texte: notes.length ? notes.map(note).join(", ") : "Aucune nouvelle note",
      };
    }
    case "PREPARATION_NOTES_MUTATION": {
      const notes = (d.notes as string[] | undefined) ?? [];
      return {
        titre: "Notes de mutation préparées",
        icone: FileText,
        ton: "vert",
        texte: notes.length
          ? notes.map((n) => { const [m, g] = n.split("/"); return `${motif(m)} (${GROUPES_MUTATION[g] ?? g})`; }).join(", ")
          : "Aucune nouvelle note",
      };
    }
    case "MODIFICATION_NOTE":
      return { titre: "Introduction de la note modifiée", icone: FilePen, ton: "jaune" };
    case "NOTE_SOUMISE_DG":
      return { titre: "Note soumise au DG", icone: Send, ton: "jaune" };
    case "NOTE_RENVOYEE":
      return { titre: "Note renvoyée pour correction", icone: RotateCcw, ton: "rouge", texte: commentaire };
    case "NOTE_VALIDEE_DG":
      return { titre: "Note validée par le DG", icone: Lock, ton: "bleu", texte: d.agents ? `${lisible(d.agents)} agents concernés` : undefined };
    case "NOTE_SIGNEE":
      return {
        titre: "Signature de la note enregistrée",
        icone: FileSignature,
        ton: "vert",
        texte: `N° ${String(d.numero ?? "")} du ${lisible(d.dateSignature)}`,
      };
    case "NOTE_SUPPRIMEE":
      return { titre: "Note à soumettre au DG supprimée", icone: Trash2, ton: "rouge" };
    case "DEMANDE_MUTATION_CREEE":
      return { titre: "Demande de mutation enregistrée", icone: ArrowLeftRight, ton: "vert", texte: d.motif ? `Motif : ${motif(d.motif)}` : undefined };
    case "DEMANDE_MUTATION_MODIFIEE":
      return { titre: "Demande de mutation modifiée", icone: ArrowLeftRight, ton: "jaune" };
    case "JUSTIFICATIF_AJOUTE":
      return { titre: "Pièce justificative jointe", icone: Paperclip, ton: "gris" };
    case "AVIS_DDEPPSA":
      return { titre: `Avis du DDEPPSA : ${avis(d.valeur)}`, icone: Stamp, ton: d.valeur === "FAVORABLE" ? "vert" : "rouge", texte: commentaire };
    case "AVIS_DGRHAS":
      return { titre: `Avis de la DGRHAS : ${avis(d.valeur)}`, icone: Stamp, ton: d.valeur === "FAVORABLE" ? "vert" : "rouge", texte: commentaire };
    case "AVIS_MINISTRE":
      return { titre: `Instruction du Ministre : ${avis(d.valeur)}`, icone: Stamp, ton: d.valeur === "ACCORDEE" ? "vert" : "rouge", texte: commentaire };
    case "DEMANDE_RETIREE":
      return { titre: "Demande retirée", icone: Ban, ton: "rouge", texte: d.motif ? `Motif : ${String(d.motif)}` : undefined };
    case "DEMANDE_REINTEGREE":
      return { titre: "Demande réintégrée", icone: RotateCcw, ton: "vert" };
    case "CREATION_UTILISATEUR":
      return {
        titre: "Utilisateur créé",
        icone: UserCog,
        ton: "vert",
        texte: `${String(d.email ?? "")} — ${ROLES[d.role as Role] ?? String(d.role ?? "")}`,
      };
    case "MODIFICATION_UTILISATEUR":
      return {
        titre: "Utilisateur modifié",
        icone: UserCog,
        ton: "jaune",
        texte: Array.isArray(d.changements) ? undefined : `Rôle : ${ROLES[d.role as Role] ?? String(d.role ?? "")}${d.actif === false ? " · compte désactivé" : ""}`,
      };
    case "MODIFICATION_REGLE_DIPLOME":
      return { titre: `Règle du diplôme ${String(e.entiteId ?? "")} modifiée`, icone: Settings, ton: "jaune", texte: changements(d) };
    case "IMPORT_REFERENCES_NOTES":
      return {
        titre: "Contrôle des affectations : notes signées reprises du fichier",
        icone: ClipboardCheck,
        ton: "jaune",
        texte: `${String(d.fichier ?? "")} — ${lisible(d.references)} référence(s), ${lisible(d.personnes)} personne(s)${Number(d.retirees) ? `, ${lisible(d.retirees)} retirée(s) des notes à préparer` : ""}${Number(d.introuvables) ? `, ${lisible(d.introuvables)} introuvable(s)` : ""}`,
      };
    case "CONTROLE_CANDIDATS":
      return { titre: `${lisible(d.fiches)} fiche(s) contrôlée(s) d’un coup`, icone: ClipboardCheck, ton: "vert", texte: Number(d.laissees) ? `${lisible(d.laissees)} laissée(s) de côté` : undefined };
    case "CORRECTION_CYCLES":
      return { titre: "Cycles corrigés d’après le diplôme", icone: Settings, ton: "jaune", texte: `${lisible(d.fiches)} fiche(s)` };
    case "CREATION_GRADE":
      return { titre: `Grade créé : ${String(d.abreviation ?? e.entiteId ?? "")}`, icone: Settings, ton: "vert", texte: d.indice ? `Indice ${lisible(d.indice)}` : undefined };
    case "MODIFICATION_GRADE": {
      const avant = (d.avant ?? {}) as Record<string, unknown>;
      const apres = (d.apres ?? {}) as Record<string, unknown>;
      const diff = Object.keys({ ...avant, ...apres })
        .filter((k) => String(avant[k] ?? "") !== String(apres[k] ?? "") && apres[k] !== undefined)
        .map((k) => `${{ abreviation: "abréviation", categorie: "catégorie", echelle: "échelle", echelon: "échelon", indice: "indice", libelle: "nom" }[k] ?? k} : ${lisible(avant[k])} → ${lisible(apres[k])}`);
      return { titre: `Grade ${String(e.entiteId ?? "")} modifié`, icone: Settings, ton: "jaune", texte: diff.join(" · ") || undefined };
    }
    case "SUPPRESSION_GRADE":
      return { titre: `Grade ${String(e.entiteId ?? "")} supprimé`, icone: Trash2, ton: "rouge" };
    case "CREATION_REGLE_DIPLOME":
      return { titre: `Diplôme ajouté : ${String(d.libelle ?? "")}`, icone: Settings, ton: "vert" };
    case "SUPPRESSION_REGLE_DIPLOME":
      return { titre: `Diplôme supprimé : ${String(d.libelle ?? "")}`, icone: Trash2, ton: "rouge" };
    case "REINITIALISATION_REGLES":
      return { titre: "Règles des diplômes remises à l’origine", icone: RotateCcw, ton: "rouge" };
    case "CAMPAGNE_ENROLEMENT_OUVERTE":
      return { titre: `Enrôlement ${String(d.annee ?? "")} ouvert`, icone: CalendarDays, ton: "vert", texte: d.quota ? `Quota : ${String(d.quota)}` : undefined };
    case "CAMPAGNE_ENROLEMENT_MODIFIEE":
      return { titre: `Enrôlement ${String(d.annee ?? "")} modifié`, icone: Settings, ton: "jaune", texte: d.quota !== undefined ? `Quota : ${String(d.quota)}` : undefined };
    case "MEMBRE_COMMISSION_ENROLEMENT":
      return { titre: "Membre de la commission d’enrôlement enregistré", icone: UserCog, ton: "jaune", texte: d.places !== undefined ? `${String(d.places)} place(s)` : undefined };
    case "MEMBRE_COMMISSION_ENROLEMENT_RETIRE":
      return { titre: "Membre de la commission d’enrôlement retiré", icone: Trash2, ton: "rouge" };
    case "ENROLE_SAISI":
      return { titre: "Dossier d’enrôlement saisi", icone: UserPlus, ton: "vert", texte: String(d.nom ?? "") };
    case "ENROLE_MODIFIE":
      return { titre: "Dossier d’enrôlement corrigé", icone: UserPen, ton: "jaune", texte: String(d.nom ?? "") };
    case "ENROLE_PLACE":
      return { titre: "Volontaire placé (département / établissement)", icone: UserPen, ton: "jaune", texte: [d.nom, d.etablissement].filter(Boolean).map(String).join(" · ") };
    case "ENROLE_SUPPRIME":
      return { titre: "Dossier d’enrôlement supprimé", icone: Trash2, ton: "rouge", texte: String(d.nom ?? "") };
    case "ENROLES_IMPORTES":
      return { titre: "Dossiers d’enrôlement importés", icone: Upload, ton: "vert", texte: d.ajoutes !== undefined ? `${String(d.ajoutes)} ajouté(s)` : undefined };
    case "ENROLES_CONTROLES":
      return { titre: "Dossiers d’enrôlement contrôlés (conformes)", icone: ClipboardCheck, ton: "vert", texte: `${String(d.dossiers ?? "")} dossier(s)` };
    case "ENROLE_RENVOYE":
      return { titre: "Dossier d’enrôlement renvoyé pour correction", icone: RotateCcw, ton: "jaune", texte: `${String(d.dossiers ?? "")} dossier(s)` };
    case "ENROLES_RETENUS":
      return { titre: "Volontaires retenus par la DGRHAS", icone: Stamp, ton: "vert", texte: `${String(d.dossiers ?? "")} dossier(s)` };
    case "ENROLES_NON_RETENUS":
      return { titre: "Dossiers d’enrôlement non retenus", icone: Ban, ton: "rouge", texte: `${String(d.dossiers ?? "")} dossier(s)` };
    case "ENROLE_DECISION_ANNULEE":
      return { titre: "Décision d’enrôlement annulée", icone: RotateCcw, ton: "jaune", texte: String(d.nom ?? "") };
    case "PREPARATION_NOTES_ENROLEMENT":
      return { titre: "Notes d’enrôlement préparées", icone: FilePen, ton: "bleu", texte: d.anneeScolaire ? `Année scolaire ${String(d.anneeScolaire)}` : undefined };
    case "ORIGINE_BENEFICIAIRE":
      return {
        titre: d.beneficiaireId ? "Origine rattachée à un bénéficiaire du quota" : "Origine détachée de son bénéficiaire",
        icone: Settings,
        ton: "jaune",
        texte: String(d.origine ?? ""),
      };
    case "BENEFICIAIRE_SUPPRIME":
      return { titre: "Bénéficiaire du quota retiré", icone: Trash2, ton: "rouge", texte: String(d.nom ?? "") };
    case "MODIFICATION_PARAMETRE":
      return {
        titre: "Paramètre modifié",
        icone: Settings,
        ton: "jaune",
        // La description du paramètre (« Point indiciaire… ») plutôt que son nom technique ; l'ancienne valeur si elle est connue
        texte: `${(parametres[String(e.entiteId)] ?? String(e.entiteId ?? "")).split(" : ")[0]} : ${"avant" in d ? `${lisible(d.avant) || "(vide)"} → ` : ""}${lisible(d.valeur) || "(vide)"}`,
      };
    case "REFERENTIEL_MODIFIE":
    case "REFERENTIEL_AJOUTE":
      return {
        titre: `Référentiel${d.referentiel ? ` « ${String(d.referentiel)} »` : ""} : valeur ${e.action === "REFERENTIEL_AJOUTE" ? "ajoutée" : "modifiée"}`,
        icone: Settings,
        ton: e.action === "REFERENTIEL_AJOUTE" ? "vert" : "jaune",
        texte: d.libelle ? String(d.libelle) : undefined,
      };
    default:
      return { titre: e.action.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), icone: FileText, ton: "gris" };
  }
}


const ICONES: Record<string, LucideIcon> = { ArrowLeftRight, Ban, ClipboardCheck, CalendarDays, FilePen, FileSignature, FileText, KeyRound, Inbox, Lock, Paperclip, RotateCcw, Send, Settings, Stamp, Trash2, Upload, UserCog, UserPen, UserPlus };

/** Libellés en clair des actions qui n'avaient qu'un nom technique. */
const TITRES: Record<string, [string, string, Ton]> = {
  "AJOUT_MANUEL_RECRUTE": [
    "Recruté ajouté à la main dans la base des recrutés",
    "UserPlus",
    "vert"
  ],
  "BESOIN_CREE": [
    "Besoin d’un établissement saisi",
    "FilePen",
    "vert"
  ],
  "BESOIN_MODIFIE": [
    "Besoin d’un établissement modifié",
    "FilePen",
    "jaune"
  ],
  "BESOIN_SUPPRIME": [
    "Besoin d’un établissement supprimé",
    "Trash2",
    "rouge"
  ],
  "BESOIN_PERSONNEL": [
    "Besoin en personnel exprimé par une structure",
    "FilePen",
    "vert"
  ],
  "BESOIN_DECISION": [
    "Décision sur un besoin en personnel",
    "Stamp",
    "bleu"
  ],
  "BESOIN_RETIRE": [
    "Besoin en personnel retiré",
    "Trash2",
    "rouge"
  ],
  "BOTTIN_IMPORT": [
    "Bottin importé",
    "Upload",
    "vert"
  ],
  "BOTTIN_POINTAGE": [
    "Bottin : pointage enregistré",
    "ClipboardCheck",
    "vert"
  ],
  "BOTTIN_SUPPRESSION": [
    "Bottin : ligne supprimée",
    "Trash2",
    "rouge"
  ],
  "BOURSE_CALCULEE": [
    "État de la bourse calculé",
    "FileText",
    "bleu"
  ],
  "BOURSE_VALIDEE": [
    "État de la bourse validé",
    "Stamp",
    "vert"
  ],
  "BOURSE_ROUVERTE": [
    "État de la bourse rouvert",
    "RotateCcw",
    "jaune"
  ],
  "BOURSE_SUPPRIMEE": [
    "État de la bourse supprimé",
    "Trash2",
    "rouge"
  ],
  "CADRE_ORGANIQUE": [
    "Cadre organique d’une structure enregistré",
    "Settings",
    "jaune"
  ],
  "CIRCUIT_COMPLETE_EN_SERIE": [
    "Circuit complété en série (étapes restantes)",
    "Send",
    "jaune"
  ],
  "COMPTE_DEBLOQUE": [
    "Compte débloqué",
    "KeyRound",
    "vert"
  ],
  "CONNEXION_BLOQUEE": [
    "Connexion bloquée (trop d’essais)",
    "Lock",
    "rouge"
  ],
  "CONNEXION_REFUSEE": [
    "Connexion refusée (mot de passe faux)",
    "Lock",
    "rouge"
  ],
  "DEPORT_PERSONNEL": [
    "Agents affectés reportés dans la base du personnel",
    "ArrowLeftRight",
    "vert"
  ],
  "DOUBLON_DIFFERENTES": [
    "Doublon probable : ce sont deux personnes différentes",
    "UserCog",
    "gris"
  ],
  "DOUBLON_PERSONNES_DIFFERENTES": [
    "Doublon probable : ce sont deux personnes différentes",
    "UserCog",
    "gris"
  ],
  "DOUBLON_FICHE_SUPPRIMEE": [
    "Doublon : fiche supprimée (informations reprises sur l’autre)",
    "Trash2",
    "rouge"
  ],
  "DROITS_RUBRIQUES": [
    "Droits par rubrique modifiés",
    "Lock",
    "jaune"
  ],
  "ECARTS_REGISTRE_PERSONNEL": [
    "Écarts entre le registre des volontaires et le personnel traités",
    "ClipboardCheck",
    "jaune"
  ],
  "ECOLE_BATIMENT": [
    "École : bâtiment enregistré",
    "Settings",
    "jaune"
  ],
  "ECOLE_SALLE": [
    "École : salle enregistrée",
    "Settings",
    "jaune"
  ],
  "ECOLE_CLASSE": [
    "École : classe enregistrée",
    "Settings",
    "jaune"
  ],
  "ECOLE_CLASSES": [
    "École : classes de l’année ouvertes",
    "Settings",
    "vert"
  ],
  "ECOLE_SUPPRESSION": [
    "École : élément supprimé",
    "Trash2",
    "rouge"
  ],
  "ECOLE_EMPLOI_DU_TEMPS": [
    "École : emploi du temps généré",
    "CalendarDays",
    "bleu"
  ],
  "ECOLE_REGLAGES_EDT": [
    "École : réglages de l’emploi du temps",
    "CalendarDays",
    "jaune"
  ],
  "ECOLE_PLAGES_ENSEIGNANT": [
    "École : horaires d’un enseignant",
    "CalendarDays",
    "jaune"
  ],
  "ECOLE_MATIERE_ENSEIGNANT": [
    "École : matière d’un enseignant",
    "UserPen",
    "jaune"
  ],
  "ENROLES_NOTE_CHANGEE": [
    "Enrôlés changés de note",
    "FilePen",
    "jaune"
  ],
  "ENROLES_SPECIALITE": [
    "Spécialité des enrôlés corrigée",
    "UserPen",
    "jaune"
  ],
  "ENROLES_DEJA_CONNUS_DIFFERENTS": [
    "Enrôlés « déjà connus » : personnes différentes",
    "UserCog",
    "gris"
  ],
  "EXPORT_CONFIGURATION": [
    "Configuration exportée",
    "FileText",
    "gris"
  ],
  "EXPORT_CONFIGURATION_FICHIER": [
    "Configuration exportée en fichier",
    "FileText",
    "gris"
  ],
  "EXPORT_MUTATIONS": [
    "Base des mutations exportée",
    "FileText",
    "gris"
  ],
  "INSPECTIONS_PREFIXEES": [
    "Préfixes des inspections corrigés",
    "Settings",
    "jaune"
  ],
  "LOTS_REGROUPES": [
    "Lots de rangement regroupés",
    "CalendarDays",
    "jaune"
  ],
  "MASQUAGE_CYCLES": [
    "Cycles masqués",
    "Settings",
    "jaune"
  ],
  "REAFFICHAGE_CYCLES": [
    "Cycles réaffichés",
    "Settings",
    "jaune"
  ],
  "MENU_CONFIGURATION": [
    "Menu modifié (Administration › Menu)",
    "Settings",
    "jaune"
  ],
  "MISE_EN_ROUTE_CALCULEE": [
    "Mise en route calculée",
    "FileText",
    "bleu"
  ],
  "MISE_EN_ROUTE_REPRISE": [
    "Mise en route reprise",
    "RotateCcw",
    "jaune"
  ],
  "MISE_EN_ROUTE_ROUVERTE": [
    "Mise en route rouverte",
    "RotateCcw",
    "jaune"
  ],
  "MISE_EN_ROUTE_SUPPRIMEE": [
    "Mise en route supprimée",
    "Trash2",
    "rouge"
  ],
  "MISE_EN_ROUTE_VALIDEE": [
    "Mise en route validée",
    "Stamp",
    "vert"
  ],
  "MUTATIONS_COMPLETEES_PERSONNEL": [
    "Mutations importées dans la base du personnel",
    "ArrowLeftRight",
    "vert"
  ],
  "MUTATIONS_REPORTEES_PERSONNEL": [
    "Mutations reportées sur les fiches du personnel",
    "ArrowLeftRight",
    "vert"
  ],
  "MUTATION_POINTS_CORRIGES": [
    "Demande de mutation : points à vérifier corrigés",
    "ClipboardCheck",
    "jaune"
  ],
  "NOMINATIONS_DECISION": [
    "Nominations : décision",
    "Stamp",
    "bleu"
  ],
  "NOMINATIONS_IMPORT": [
    "Nominations importées",
    "Upload",
    "vert"
  ],
  "NOMINATIONS_NOUVELLE_ANNEE": [
    "Nominations : nouvelle année ouverte",
    "CalendarDays",
    "vert"
  ],
  "NOMINATION_AJOUT": [
    "Nomination ajoutée",
    "UserPlus",
    "vert"
  ],
  "NOMINATION_PERMUTATION": [
    "Nominations : permutation",
    "ArrowLeftRight",
    "jaune"
  ],
  "NOMINATION_PROPOSITION": [
    "Nomination proposée",
    "Stamp",
    "jaune"
  ],
  "NOMINATION_RETIREE": [
    "Nomination retirée",
    "Trash2",
    "rouge"
  ],
  "PREPARATION_NOTES_NOMINATION": [
    "Notes de nomination préparées",
    "FileText",
    "vert"
  ],
  "NOTES_REUNIES": [
    "Notes réunies en une seule",
    "FilePen",
    "jaune"
  ],
  "NOTES_SEPAREES": [
    "Notes séparées",
    "FilePen",
    "jaune"
  ],
  "NOTE_DECOUPEE": [
    "Note découpée (additif)",
    "FilePen",
    "jaune"
  ],
  "RECTIFICATIF_PREPARE": [
    "Rectificatif préparé",
    "FilePen",
    "jaune"
  ],
  "RECTIFICATIF_APPLIQUE": [
    "Rectificatif appliqué",
    "Stamp",
    "vert"
  ],
  "RANGEMENT_SANS_LOT": [
    "Rangement : sans lot",
    "CalendarDays",
    "jaune"
  ],
  "OUBLI_SUPPRIME": [
    "Oubli retiré",
    "Trash2",
    "rouge"
  ],
  "OUBLI_DEJA_AFFECTE": [
    "Oubli signalé : déjà affecté",
    "Inbox",
    "jaune"
  ],
  "OUBLI_PAS_AFFECTE": [
    "Oubli signalé : pas encore affecté",
    "Inbox",
    "jaune"
  ],
  "PERSONNEL_CARRIERE": [
    "Carrière : événement enregistré",
    "FileSignature",
    "vert"
  ],
  "PERSONNEL_CARRIERE_ACTE": [
    "Carrière : acte joint",
    "Paperclip",
    "vert"
  ],
  "PERSONNEL_CARRIERE_MODIFIE": [
    "Carrière : événement modifié",
    "FilePen",
    "jaune"
  ],
  "PERSONNEL_CARRIERE_ANNULE": [
    "Carrière : événement annulé",
    "RotateCcw",
    "rouge"
  ],
  "PERSONNEL_DISTINCTS": [
    "Personnel : deux personnes distinctes",
    "UserCog",
    "gris"
  ],
  "PERSONNEL_FUSION": [
    "Personnel : fiches fusionnées",
    "UserCog",
    "jaune"
  ],
  "PERSONNEL_EVALUATION": [
    "Évaluation d’un agent enregistrée",
    "ClipboardCheck",
    "vert"
  ],
  "PERSONNEL_EVALUATION_RETIREE": [
    "Évaluation d’un agent retirée",
    "Trash2",
    "rouge"
  ],
  "PERSONNEL_NOTES": [
    "Personnel : notes de service rattachées",
    "FileText",
    "jaune"
  ],
  "PERSONNEL_RECRUTE_FP": [
    "Personnel : recruté à la Fonction Publique",
    "Stamp",
    "vert"
  ],
  "PERSONNEL_STATUT": [
    "Personnel : statut changé",
    "UserPen",
    "jaune"
  ],
  "PRESENCE_SEMAINE": [
    "Présence de la semaine enregistrée",
    "ClipboardCheck",
    "vert"
  ],
  "PRESTATION_ACTE_SIGNE": [
    "Prestation : acte signé joint",
    "FileSignature",
    "vert"
  ],
  "PRESTATION_LETTRE": [
    "Prestation : lettre préparée",
    "FileText",
    "bleu"
  ],
  "PRESTATION_PIECES": [
    "Prestation : pièces jointes",
    "Paperclip",
    "vert"
  ],
  "PRESTATION_PIECE_RETIREE": [
    "Prestation : pièce retirée",
    "Trash2",
    "rouge"
  ],
  "PRESTATION_RETIREE": [
    "Demande de prestation retirée",
    "Ban",
    "rouge"
  ],
  "PRESTATION_RETOUR": [
    "Prestation : retour du dossier",
    "RotateCcw",
    "jaune"
  ],
  "RATTACHEMENT_FICHE_CREEE": [
    "Rattachement : fiche du personnel créée",
    "UserPlus",
    "vert"
  ],
  "RATTACHEMENT_PERSONNEL": [
    "Rattachement à une fiche du personnel",
    "UserCog",
    "jaune"
  ],
  "RATTACHEMENT_SANS_FICHE": [
    "Rattachement : agent introuvable dans le personnel",
    "UserCog",
    "gris"
  ],
  "RECENSEMENT_CONFIGURATION": [
    "Configuration du personnel (rubriques) modifiée",
    "Settings",
    "jaune"
  ],
  "RECENSEMENT_CREATION": [
    "Personnel : agent ajouté",
    "UserPlus",
    "vert"
  ],
  "RECENSEMENT_MODIFICATION": [
    "Personnel : fiche modifiée",
    "UserPen",
    "jaune"
  ],
  "RECENSEMENT_SUPPRESSION": [
    "Personnel : fiche supprimée",
    "Trash2",
    "rouge"
  ],
  "RECENSEMENT_PIECE": [
    "Personnel : pièce jointe",
    "Paperclip",
    "vert"
  ],
  "RECENSEMENT_PIECES_MASSE": [
    "Personnel : pièces jointes en série",
    "Paperclip",
    "vert"
  ],
  "RECENSEMENT_PIECE_RETIREE": [
    "Personnel : pièce retirée",
    "Trash2",
    "rouge"
  ],
  "RECOMMANDATION_AVIS": [
    "Avis du directeur sur une recommandation",
    "Stamp",
    "jaune"
  ],
  "REFERENTIELS_IMPORT": [
    "Référentiels importés",
    "Upload",
    "vert"
  ],
  "REGULARISATION_CREEE": [
    "Régularisation de bourse créée",
    "FilePen",
    "jaune"
  ],
  "REGULARISATION_ANNULEE": [
    "Régularisation de bourse annulée",
    "RotateCcw",
    "rouge"
  ],
  "REPARTITION_PROPOSEE": [
    "Répartition par département proposée",
    "FilePen",
    "jaune"
  ],
  "REPARTITION_VALIDEE": [
    "Répartition par département validée",
    "Stamp",
    "vert"
  ],
  "RETENUES_CREEES": [
    "Retenues sur la bourse créées",
    "FilePen",
    "jaune"
  ],
  "SAUVEGARDE_CLOUDINARY_RECUPEREE": [
    "Sauvegarde de la base récupérée",
    "Inbox",
    "bleu"
  ],
  "SECURITE_ALERTE": [
    "Sécurité : alerte",
    "Lock",
    "rouge"
  ],
  "SECURITE_SUSPENSION": [
    "Sécurité : compte suspendu",
    "Lock",
    "rouge"
  ],
  "SECURITE_RETABLISSEMENT": [
    "Sécurité : compte rétabli",
    "Lock",
    "vert"
  ],
  "SESSIONS_FERMEES": [
    "Sessions ouvertes fermées",
    "Lock",
    "jaune"
  ],
  "SPECIALITES_PRIMAIRE": [
    "Spécialités du primaire corrigées",
    "Settings",
    "jaune"
  ],
  "STRUCTURES_IMPORT": [
    "Structures importées",
    "Upload",
    "vert"
  ],
  "STRUCTURE_RESPONSABLE": [
    "Responsable d’une structure désigné",
    "UserCog",
    "jaune"
  ],
  "VOLONTAIRES_IMPORTES": [
    "Registre des volontaires importé",
    "Upload",
    "vert"
  ],
  "VOLONTAIRES_CORRIGES": [
    "Registre des volontaires corrigé",
    "UserPen",
    "jaune"
  ],
  "VOLONTAIRES_INTEGRES": [
    "Volontaires intégrés au personnel",
    "UserPlus",
    "vert"
  ]
};

/** Quelques valeurs courtes des détails (« 12 fiches · fichier X »), quand l'action n'a pas de texte. */
function resume(d: Record<string, unknown>) {
  return Object.entries(d)
    .filter(([k, v]) => k !== "changements" && k !== "avant" && (typeof v === "number" || (typeof v === "string" && v.length <= 60) || typeof v === "boolean"))
    .slice(0, 4)
    .map(([k, v]) => `${CHAMPS[k] ?? k} : ${lisible(v)}`)
    .join(" · ");
}

/** Nom de chaque rubrique du menu (« /statistiques » → « Statistiques »), pour les droits par rubrique. */
const NOM_RUBRIQUE = new Map(ESPACES.flatMap((x) => x.rubriques.map((r) => [r.href.split("?")[0], `${x.titre} › ${r.libelle}`] as const)));

/** Les changements enregistrés (« champ : avant → après »), les rubriques par leur nom. */
export function changementsDe(e: Entree): { champ: string; avant: string; apres: string }[] {
  const c = (e.details ?? {}).changements;
  if (!Array.isArray(c)) return [];
  return (c as { champ: string; avant: string; apres: string }[]).map((x) => ({
    ...x,
    champ: x.champ.replace(/ · (\/[\w/-]*)$/, (t, h: string) => (NOM_RUBRIQUE.has(h) ? ` · ${NOM_RUBRIQUE.get(h)}` : t)),
  }));
}

/** Ce que veut dire une ligne du journal : titre, icône, couleur, détail court (avec « avant → après »). */
export function decrire(e: Entree, refs: Referentiels, parametres: Record<string, string> = {}): Description {
  let d = decrireBase(e, refs, parametres);
  const t = TITRES[e.action];
  // Libellé en clair pour les actions qui n'avaient pas le leur
  const ch = changementsDe(e);
  // Les changements, quand ils sont connus, disent mieux que des compteurs ce qui s'est passé
  const bref = ch.length ? undefined : resume(e.details ?? {}) || undefined;
  if (t && d.icone === FileText && d.ton === "gris" && !d.texte) d = { titre: t[0], icone: ICONES[t[1]] ?? FileText, ton: t[2], texte: bref };
  else if (!t && d.icone === FileText && d.ton === "gris" && !d.texte) d = { ...d, texte: bref };
  if (ch.length) {
    const avantApres = ch.map((x) => `${x.champ} : ${x.avant || "(vide)"} → ${x.apres || "(vide)"}`).join(" · ");
    d = { ...d, texte: [d.texte, avantApres].filter(Boolean).join(" — ") };
  }
  return d;
}

/** Domaines du filtre (le premier qui convient). */
export const DOMAINES = [
  { valeur: "connexions", libelle: "Connexions et comptes", test: (a: string) => /CONNEXION|MOT_DE_PASSE|UTILISATEUR|SESSIONS|COMPTE_DEBLOQUE|DELEGATION|CODES_PERSONNELS|VERIFICATION_CODES|SECURITE/.test(a) },
  { valeur: "configuration", libelle: "Configuration (paramètres, référentiels, règles, organigramme, droits, menu)", test: (a: string) => /PARAMETRE|REFERENTIEL|REGLE|GRADE|STRUCTURE|TYPE_PRESTATION|DROITS_RUBRIQUES|MENU_CONFIGURATION|ORIGINE_DOSSIER|CYCLES|INSPECTIONS_PREFIXEES|CONFIGURATION|SPECIALITES|SAUVEGARDE/.test(a) },
  { valeur: "affectations", libelle: "Affectations", test: (a: string) => /AFFECTATION|RECOMMANDATION|LOT|AGENT|BASE|REFERENCES_NOTES|OUBLI|DEPORT|RANGEMENT/.test(a) },
  {
    valeur: "recrutement",
    libelle: "Recrutement FP (saisie, envoi, réception)",
    test: (a: string) => /CANDIDAT|TRANSMISSION|RECEPTION|CONTENTIEUX_AGE|QUOTA_AUTRES|MEMBRE_COMMISSION(?!_ENROLEMENT)|MISE_DE_COTE|REPORT_QUOTA|ANNULATION_REPORT|ANCIENS_RECRUTES|RETOUR_FP|^AJOUT_PIECE|^MODIFICATION_PIECE|^SUPPRESSION_PIECE|AJOUT_MANUEL_RECRUTE/.test(a),
  },
  { valeur: "enrolement", libelle: "Enrôlement", test: (a: string) => /ENROLE|REPARTITION_PROPOSEE|REPARTITION_VALIDEE/.test(a) },
  { valeur: "volontaires", libelle: "Volontaires, bourse et mise en route", test: (a: string) => /VOLONTAIRE|BOURSE|MISE_EN_ROUTE|REGULARISATION|RETENUES|ECARTS_REGISTRE/.test(a) },
  { valeur: "notes", libelle: "Notes de service", test: (a: string) => a.startsWith("NOTE") || a.startsWith("PREPARATION") || a === "MODIFICATION_NOTE" || /RECTIFICATIF/.test(a) },
  { valeur: "mutations", libelle: "Mutations", test: (a: string) => /MUTATION|AVIS_DDEPPSA|AVIS_DGRHAS|AVIS_MINISTRE|JUSTIFICATIF|DEMANDE_RETIREE|DEMANDE_REINTEGREE|RATTACHEMENT/.test(a) },
  { valeur: "prestations", libelle: "Demandes de prestation", test: (a: string) => /PRESTATION|DEMANDE|AVIS_CIRCUIT|INSTRUCTION|ETAPE_FRANCHIE|PIECES_AJOUTEES|PIECE_RETIREE|CIRCUIT/.test(a) },
  { valeur: "nominations", libelle: "Nominations", test: (a: string) => /NOMINATION/.test(a) },
  { valeur: "personnel", libelle: "Personnel (fiches, carrière, présence, évaluations)", test: (a: string) => /PERSONNEL|RECENSEMENT|PRESENCE|BOTTIN|DOUBLON/.test(a) },
  { valeur: "structures", libelle: "Écoles, structures et besoins", test: (a: string) => /ECOLE|BESOIN|CADRE_ORGANIQUE/.test(a) },
  { valeur: "pilotage", libelle: "Pilotage (enveloppe, quotas)", test: (a: string) => /ENVELOPPE|REPARTITION|BENEFICIAIRE|QUOTA_REAJUSTE/.test(a) },
];
export const domaineDe = (action: string) => DOMAINES.find((x) => x.test(action))?.valeur ?? "autres";

/** Où ouvrir l'objet d'une ligne (dossier, note, agent, structure…). */
export function lienDe(e: Entree): string | null {
  const id = e.entiteId;
  const d = e.details ?? {};
  switch (e.entite) {
    case "note_service":
      return id ? `/note/${id}` : null;
    case "demande_mutation":
    case "mutation":
      return id ? `/mutation/${id}` : null;
    case "demande_prestation":
      return id ? `/prestations/${id}` : null;
    case "agent_recense":
      return id ? `/personnel/agents/${id}` : null;
    case "structure":
      return id ? (d.type === "ETABLISSEMENT" ? `/ecoles/${id}` : `/structures/${id}`) : null;
    case "utilisateur":
      return "/administration";
    case "parametre":
      return "/administration/parametres";
    case "referentiel":
      return "/administration/referentiels";
    case "grade":
    case "regle_diplome":
      return "/administration/regles";
    case "lot_publication":
      return "/lots";
    case "campagne_enrolement":
    case "membre_enrolement":
      return "/enrolement/campagne";
    case "nomination":
      return "/nominations";
    default:
      return null;
  }
}

/** Lot noté dans le journal : ancien n° (« lot 3 ») ou libellé (« Arrêtés quota 2024 — lot 3 »). */
function lotJournal(v: unknown) {
  return typeof v === "number" ? `lot ${v}` : String(v ?? "");
}
