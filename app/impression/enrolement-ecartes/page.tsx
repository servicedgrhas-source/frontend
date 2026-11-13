"use client";

import { Suspense } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";

interface Ecarte {
  nom: string;
  naissance: string;
  age: number | null;
  horsLimite: boolean;
  diplome: string;
  source: string;
  statut: string | null;
  etablissement: string | null;
  departement: string | null;
  autres: number;
  correspondance: string;
  motif: string | null;
}

const COLONNES: ColonneImprimee<Ecarte>[] = [
  { titre: "N°", largeur: 4, valeur: (_l, i) => i + 1, droite: true },
  { titre: "Noms et prénoms", largeur: 18, valeur: (l) => l.nom },
  { titre: "Date de naissance", largeur: 8, valeur: (l) => l.naissance || "—" },
  { titre: "Âge", largeur: 4, valeur: (l) => (l.age === null ? "—" : <span className={l.horsLimite ? "font-bold text-red-700" : ""}>{l.age}</span>), droite: true },
  { titre: "Diplôme", largeur: 8, valeur: (l) => l.diplome },
  { titre: "Trouvé dans", largeur: 12, valeur: (l) => (l.autres ? `${l.source} (+${l.autres})` : l.source) },
  { titre: "Statut", largeur: 11, valeur: (l) => l.statut ?? "—" },
  { titre: "Établissement", largeur: 11, valeur: (l) => l.etablissement ?? "—" },
  { titre: "Département", largeur: 8, valeur: (l) => l.departement ?? "—" },
  { titre: "Correspondance", largeur: 7, valeur: (l) => <span className={l.correspondance === "Sûre" ? "font-semibold" : "italic"}>{l.correspondance}</span> },
  { titre: "Motif", largeur: 9, valeur: (l) => (l.motif ?? "").replace(/^Déjà connu( : )?/, "") || "—" },
];
const sousTitre = (d: Record<string, unknown>) => String(d.sousTitre ?? "");
const arrete = (n: number) => `Arrêtée la présente liste à ${n.toLocaleString("fr-FR")} écarté(s).`;

/** Liste des écartés de l'enrôlement (déjà connus ailleurs), avec où chacun a été trouvé (DG, 12/11/2026). */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionListe chemin="/enrolement/listes/ecartes/json" titre="LISTE DES ÉCARTÉS DE L’ENRÔLEMENT (DÉJÀ CONNUS)" sousTitre={sousTitre} colonnes={COLONNES} arrete={arrete} pied="Liste des écartés" />
    </Suspense>
  );
}
