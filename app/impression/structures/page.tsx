"use client";

import { Suspense } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";

interface Structure {
  niveau: number;
  sigle: string;
  nom: string;
  type: string;
  superieure: string;
  departement: string | null;
  agents: number;
  agentsTotal: number;
  dessous: number;
  ecoles: number;
}

const COLONNES: ColonneImprimee<Structure>[] = [
  { titre: "N°", largeur: 4, valeur: (_l, i) => i + 1, droite: true },
  {
    titre: "Sigle",
    largeur: 13,
    // En retrait sous la structure dont elle dépend (ordre de l'organigramme)
    valeur: (l) => <span style={{ paddingLeft: `${l.niveau * 0.8}em`, fontWeight: l.niveau ? undefined : 700 }}>{l.sigle}</span>,
  },
  { titre: "Nom", largeur: 30, valeur: (l) => l.nom },
  { titre: "Type", largeur: 12, valeur: (l) => l.type },
  { titre: "Dépend de", largeur: 9, valeur: (l) => l.superieure || "—" },
  { titre: "Département", largeur: 10, valeur: (l) => l.departement ?? "—" },
  { titre: "Agents", largeur: 6, valeur: (l) => l.agents, droite: true },
  { titre: "Agents en tout", largeur: 6, valeur: (l) => l.agentsTotal, droite: true },
  { titre: "En dessous", largeur: 5, valeur: (l) => l.dessous, droite: true },
  { titre: "Écoles", largeur: 5, valeur: (l) => l.ecoles, droite: true },
];
const sousTitre = (d: Record<string, unknown>) => String(d.sousTitre ?? "");
const arrete = (n: number) => `Arrêtée la présente liste à ${n.toLocaleString("fr-FR")} structure(s).`;

/** Liste des structures administratives imprimable, avec les filtres choisis (DG, 08/11/2026). */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionListe chemin="/structures/export/json" titre="LISTE DES STRUCTURES ADMINISTRATIVES" sousTitre={sousTitre} colonnes={COLONNES} arrete={arrete} pied="Structures administratives" />
    </Suspense>
  );
}
