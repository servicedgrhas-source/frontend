"use client";

import { Suspense } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";
import { CYCLES } from "@/lib/ecoles";

interface Ecole {
  nom: string;
  cycle: string | null;
  inspection: string | null;
  localite: string | null;
  departement: string | null;
  classes: number;
  salles: number;
  agents: number;
}

const COLONNES: ColonneImprimee<Ecole>[] = [
  { titre: "N°", largeur: 5, valeur: (_l, i) => i + 1, droite: true },
  { titre: "École", largeur: 28, valeur: (l) => l.nom },
  { titre: "Cycle", largeur: 10, valeur: (l) => (l.cycle ? (CYCLES[l.cycle] ?? l.cycle) : "—") },
  { titre: "Inspection", largeur: 13, valeur: (l) => l.inspection ?? "—" },
  { titre: "Localité", largeur: 15, valeur: (l) => l.localite ?? "—" },
  { titre: "Département", largeur: 12, valeur: (l) => l.departement ?? "—" },
  { titre: "Classes", largeur: 5, valeur: (l) => l.classes, droite: true },
  { titre: "Salles", largeur: 5, valeur: (l) => l.salles, droite: true },
  { titre: "Agents", largeur: 7, valeur: (l) => l.agents, droite: true },
];
const sousTitre = (d: Record<string, unknown>) => String(d.sousTitre ?? "");
const arrete = (n: number) => `Arrêtée la présente liste à ${n.toLocaleString("fr-FR")} école(s).`;

/** Liste des écoles imprimable, avec les filtres choisis sur la page « Écoles et classes » (DG, 08/11/2026). */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionListe chemin="/etablissements/export/json" titre="LISTE DES ÉCOLES" sousTitre={sousTitre} colonnes={COLONNES} arrete={arrete} pied="Liste des écoles" />
    </Suspense>
  );
}
