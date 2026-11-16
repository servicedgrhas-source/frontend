"use client";

import { Suspense } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";

interface NonRetenu {
  nom: string;
  naissance: string;
  age: number | null;
  horsLimite: boolean;
  diplome: string;
  cycle: string | null;
  motif: string;
  decision: string | null;
  /** Origine regroupée : donnée à la DGRHAS seulement. */
  origine?: string | null;
}

const COLONNES: ColonneImprimee<NonRetenu>[] = [
  { titre: "N°", largeur: 5, valeur: (_l, i) => i + 1, droite: true },
  { titre: "Noms et prénoms", largeur: 22, valeur: (l) => l.nom },
  { titre: "Date de naissance", largeur: 9, valeur: (l) => l.naissance || "—" },
  { titre: "Âge", largeur: 5, valeur: (l) => (l.age === null ? "—" : <span className={l.horsLimite ? "font-bold text-red-700" : ""}>{l.age}</span>), droite: true },
  { titre: "Diplôme", largeur: 11, valeur: (l) => l.diplome },
  { titre: "Cycle · spécialité", largeur: 12, valeur: (l) => l.cycle ?? "—" },
  { titre: "Motif", largeur: 20, valeur: (l) => l.motif },
  { titre: "Décidé par", largeur: 10, valeur: (l) => l.decision ?? "—" },
  { titre: "Origine", largeur: 8, valeur: (l) => l.origine ?? "" },
];
const sousTitre = (d: Record<string, unknown>) => String(d.sousTitre ?? "");
const arrete = (n: number) => `Arrêtée la présente liste à ${n.toLocaleString("fr-FR")} non retenu(s).`;

/** Liste des non retenus de l'enrôlement : déjà connus ailleurs et autres motifs (DG, 16/11/2026). */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionListe chemin="/enrolement/listes/non-retenus/json" titre="LISTE DES NON RETENUS DE L’ENRÔLEMENT" sousTitre={sousTitre} colonnes={COLONNES} arrete={arrete} pied="Liste des non retenus" />
    </Suspense>
  );
}
