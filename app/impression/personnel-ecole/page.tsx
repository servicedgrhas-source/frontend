"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";

/** Une ligne telle que le serveur l'envoie (les colonnes de l'Excel et du Word, dans le même ordre). */
type Ligne = (string | number | null)[];

const col = (titre: string, largeur: number, k: number, droite = false): ColonneImprimee<Ligne> => ({ titre, largeur, valeur: (l) => l[k] || (droite ? 0 : "—"), droite });
const COLONNES: ColonneImprimee<Ligne>[] = [
  col("N°", 4, 0, true),
  col("Matricule", 9, 1),
  col("Nom et prénoms", 20, 2),
  col("Sexe", 3, 3),
  col("Statut", 8, 4),
  col("Grade", 10, 5),
  col("Qualification", 12, 6),
  col("Fonction dans l’école", 11, 7),
  col("Matière / spécialité", 10, 8),
  col("Temps de travail", 7, 9),
  col("En poste", 5, 10),
];
const sousTitre = (d: Record<string, unknown>) => [d.ecole, d.sousTitre].filter(Boolean).join(" · ");
const arrete = (n: number, d: Record<string, unknown>) =>
  `Arrêtée la présente liste à ${n.toLocaleString("fr-FR")} agent(s), dont ${Number(d.enseignants ?? 0).toLocaleString("fr-FR")} enseignant(s) ; ${Number(d.enPoste ?? 0).toLocaleString("fr-FR")} en poste.`;

/** Personnel d'une école imprimable (DG, 27/11/2026), avec le filtre « Temps de travail » de la fiche. */
function Liste() {
  const id = Number(useSearchParams().get("id")) || 0;
  return <ImpressionListe chemin={`/etablissements/${id}/personnel/export/json`} titre="PERSONNEL DE L’ÉCOLE" sousTitre={sousTitre} colonnes={COLONNES} arrete={arrete} pied="Personnel de l’école" />;
}

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Liste />
    </Suspense>
  );
}
