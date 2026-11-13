"use client";

import { Suspense } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";

interface Retenu {
  nom: string;
  naissance: string;
  age: number | null;
  horsLimite: boolean;
  lieu: string | null;
  diplome: string;
  cycle: string | null;
  departement: string | null;
  etablissement: string | null;
}

const age = (l: { age: number | null; horsLimite: boolean }) =>
  l.age === null ? "—" : <span className={l.horsLimite ? "font-bold text-red-700" : ""}>{l.age}</span>;

const COLONNES: ColonneImprimee<Retenu>[] = [
  { titre: "N°", largeur: 5, valeur: (_l, i) => i + 1, droite: true },
  { titre: "Noms et prénoms", largeur: 22, valeur: (l) => l.nom },
  { titre: "Date de naissance", largeur: 9, valeur: (l) => l.naissance || "—" },
  { titre: "Âge", largeur: 5, valeur: age, droite: true },
  { titre: "Lieu de naissance", largeur: 10, valeur: (l) => l.lieu ?? "—" },
  { titre: "Diplôme", largeur: 12, valeur: (l) => l.diplome },
  { titre: "Cycle · spécialité", largeur: 13, valeur: (l) => l.cycle ?? "—" },
  { titre: "Département retenu", largeur: 10, valeur: (l) => l.departement ?? "à placer" },
  { titre: "Établissement", largeur: 14, valeur: (l) => l.etablissement ?? "—" },
];
const sousTitre = (d: Record<string, unknown>) => String(d.sousTitre ?? "");
const arrete = (n: number) => `Arrêtée la présente liste à ${n.toLocaleString("fr-FR")} retenu(s).`;

/** Liste des retenus de l'enrôlement, avec l'âge au 31 décembre (DG, 12/11/2026). */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionListe chemin="/enrolement/listes/retenus/json" titre="LISTE DES RETENUS DE L’ENRÔLEMENT" sousTitre={sousTitre} colonnes={COLONNES} arrete={arrete} pied="Liste des retenus" />
    </Suspense>
  );
}
