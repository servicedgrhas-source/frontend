"use client";

import { Suspense } from "react";
import { type ColonneImprimee, ImpressionListe } from "@/components/impression-liste";
import { Chargement } from "@/components/ui";

/** Dossiers de l'enrôlement encore en cours : à contrôler, ou à décider par la DGRHAS (DG, 21/11/2026). */
interface DossierEnCours {
  nom: string;
  naissance: string;
  age: number | null;
  horsLimite: boolean;
  lieu: string | null;
  diplome: string;
  cycle: string | null;
  specialite: string | null;
  souhaite1: string | null;
  souhaite2: string | null;
  souhaite3: string | null;
  telephone: string | null;
  observation: string | null;
  saisiePar: string | null;
  controlePar?: string | null;
  remarque: string | null;
  /** Origine regroupée : donnée à la DGRHAS seulement. */
  origine?: string | null;
}

const colonnes = (aDecider: boolean): ColonneImprimee<DossierEnCours>[] => [
  { titre: "N°", largeur: 4, valeur: (_l, i) => i + 1, droite: true },
  { titre: "Noms et prénoms", largeur: 17, valeur: (l) => l.nom },
  { titre: "Date de naissance", largeur: 7, valeur: (l) => l.naissance || "—" },
  { titre: "Âge", largeur: 4, valeur: (l) => (l.age === null ? "—" : <span className={l.horsLimite ? "font-bold text-red-700" : ""}>{l.age}</span>), droite: true },
  { titre: "Lieu de naissance", largeur: 7, valeur: (l) => l.lieu ?? "—" },
  { titre: "Diplôme", largeur: 8, valeur: (l) => l.diplome },
  { titre: "Cycle", largeur: 6, valeur: (l) => l.cycle ?? "—" },
  { titre: "Spécialité", largeur: 7, valeur: (l) => l.specialite ?? "—" },
  { titre: "Département souhaité 1", largeur: 6, valeur: (l) => l.souhaite1 ?? "—" },
  { titre: "Département souhaité 2", largeur: 6, valeur: (l) => l.souhaite2 ?? "—" },
  { titre: "Département souhaité 3", largeur: 6, valeur: (l) => l.souhaite3 ?? "—" },
  { titre: "Saisi par", largeur: 7, valeur: (l) => l.saisiePar ?? "—" },
  ...(aDecider ? [{ titre: "Contrôlé par", largeur: 7, valeur: (l: DossierEnCours) => l.controlePar ?? "—" }] : []),
  { titre: "Remarque du contrôle", largeur: 9, valeur: (l) => l.remarque ?? "" },
  { titre: "Origine", largeur: 6, valeur: (l) => l.origine ?? "" },
];
const sousTitre = (d: Record<string, unknown>) => String(d.sousTitre ?? "");
const arrete = (n: number) => `Arrêtée la présente liste à ${n.toLocaleString("fr-FR")} dossier(s).`;

export function ImpressionEnCours({ aDecider }: { aDecider: boolean }) {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionListe
        chemin={`/enrolement/listes/${aDecider ? "a-decider" : "a-controler"}/json`}
        titre={aDecider ? "LISTE DES DOSSIERS À DÉCIDER PAR LA DGRHAS — ENRÔLEMENT" : "LISTE DES DOSSIERS À CONTRÔLER — ENRÔLEMENT"}
        sousTitre={sousTitre}
        colonnes={colonnes(aDecider)}
        arrete={arrete}
        pied={aDecider ? "Dossiers à décider" : "Dossiers à contrôler"}
      />
    </Suspense>
  );
}
