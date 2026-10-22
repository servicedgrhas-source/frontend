"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alerte, Badge, Liste, Modale } from "@/components/ui";
import { useApi } from "@/lib/api";

export interface Campagne {
  id: number;
  annee: number;
  anneeScolaire: string;
  quota: number;
  /** Enveloppe de bourses (FCFA, 0 : pas fixée), places et bourse par cycle. */
  enveloppe?: string | number;
  placesParCycle?: Record<string, number>;
  montantsParCycle?: Record<string, number>;
  ouverte: boolean;
  observation: string | null;
  aControler: number;
  aDecider: number;
  retenus: number;
  nonRetenus: number;
  total: number;
}

export interface Enrole {
  id: string;
  campagneId: number;
  nomComplet: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  diplome: string;
  diplomeLibelle: string;
  diplomePrecision: string | null;
  promotion: string | null;
  cycle: string | null;
  specialite: string | null;
  departementsSouhaites: number[];
  departementsSouhaitesNoms: string[];
  departementRetenuId: number | null;
  departementRetenu: string | null;
  etablissement: string | null;
  telephone: string | null;
  origineBrute: string | null;
  membreId: string | null;
  membre: string | null;
  observation: string | null;
  etat: "A_CONTROLER" | "CONTROLE" | "RETENU" | "NON_RETENU";
  remarqueControle: string | null;
  motifDecision: string | null;
  saisiePar: string | null;
  controlePar: string | null;
  decidePar: string | null;
  decideLe: string | null;
  noteId: string | null;
}

export const ETAT_ENROLE: Record<Enrole["etat"], { libelle: string; ton: "gris" | "jaune" | "vert" | "rouge" | "bleu" }> = {
  A_CONTROLER: { libelle: "À contrôler", ton: "jaune" },
  CONTROLE: { libelle: "À décider par la DGRHAS", ton: "bleu" },
  RETENU: { libelle: "Retenu", ton: "vert" },
  NON_RETENU: { libelle: "Non retenu", ton: "rouge" },
};

const CLE = "dgrhas.campagneEnrolement";

/** Campagne choisie : gardée d'une page à l'autre (par défaut, la plus récente ouverte). */
export function useCampagne() {
  const campagnes = useApi<Campagne[]>("/enrolement/campagnes");
  const [choix, setChoix] = useState<number | null>(null);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(CLE));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v) setChoix(v);
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const liste = campagnes.donnees ?? [];
  const campagne = liste.find((c) => c.id === choix) ?? liste.find((c) => c.ouverte) ?? liste[0] ?? null;
  const choisir = (id: number) => {
    setChoix(id);
    try {
      localStorage.setItem(CLE, String(id));
    } catch {
      /* stockage indisponible */
    }
  };
  return { campagnes, liste, campagne, choisir };
}

/** Choix de la campagne en tête de chaque page de l'enrôlement. */
export function SelecteurCampagne({ liste, campagne, choisir }: { liste: Campagne[]; campagne: Campagne | null; choisir: (id: number) => void }) {
  if (!liste.length)
    return (
      <Alerte ton="jaune">
        Aucune campagne d’enrôlement n’est ouverte. Le DG l’ouvre dans{" "}
        <Link href="/enrolement/campagne" className="font-semibold underline">
          Enrôlement › Campagne, quota et commission
        </Link>
        .
      </Alerte>
    );
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[13px] shadow-doux">
      <span className="font-medium text-zinc-600">Campagne</span>
      <Liste className="w-80" value={String(campagne?.id ?? "")} onChange={(e) => choisir(Number(e.target.value))} options={liste.map((c) => ({ valeur: c.id, libelle: `Enrôlement ${c.annee} (${c.anneeScolaire})${c.ouverte ? "" : " · fermée"}` }))} />
      {campagne && (
        <span className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-600">
          <Badge ton={campagne.quota && campagne.retenus >= campagne.quota ? "jaune" : "vert"}>
            {campagne.retenus} retenu(s){campagne.quota ? ` sur un quota de ${campagne.quota}` : " · quota pas encore fixé"}
          </Badge>
          <span>
            {campagne.aControler} à contrôler · {campagne.aDecider} à décider · {campagne.nonRetenus} non retenu(s)
          </span>
        </span>
      )}
    </div>
  );
}

const date = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

/** Toute la fiche d'un candidat à l'enrôlement. */
export function FicheEnrole({ e, fermer }: { e: Enrole; fermer: () => void }) {
  const lignes: [string, string | null | undefined][] = [
    ["Né(e) le", date(e.dateNaissance) + (e.lieuNaissance ? ` à ${e.lieuNaissance}` : "")],
    ["Diplôme", `${e.diplomeLibelle}${e.diplomePrecision ? ` (${e.diplomePrecision})` : ""}`],
    ["Promotion", e.promotion],
    ["Cycle · spécialité", [e.cycle, e.specialite].filter(Boolean).join(" · ")],
    ["Départements souhaités", e.departementsSouhaitesNoms.join(", ")],
    ["Département retenu", e.departementRetenu],
    ["Établissement", e.etablissement ?? (e.departementRetenu ? "à la disposition de la DDEPPSA" : null)],
    ["Téléphone", e.telephone],
    ["Origine du dossier", e.origineBrute],
    ["Membre de la commission", e.membre],
    ["Observation", e.observation],
    ["Saisi par", e.saisiePar],
    ["Contrôlé par", e.controlePar],
    ["Décision", e.decidePar ? `${ETAT_ENROLE[e.etat].libelle} par ${e.decidePar}${e.decideLe ? ` le ${new Date(e.decideLe).toLocaleDateString("fr-FR")}` : ""}` : null],
    ["Motif", e.motifDecision],
    ["Remarque du contrôle", e.remarqueControle],
    ["Note de service", e.noteId ? "dans une note validée" : null],
  ];
  return (
    <Modale titre={e.nomComplet} ouverte fermer={fermer}>
      <div className="mb-3">
        <Badge ton={ETAT_ENROLE[e.etat].ton}>{ETAT_ENROLE[e.etat].libelle}</Badge>
      </div>
      <dl className="grid grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        {lignes
          .filter(([, v]) => v)
          .map(([l, v]) => (
            <div key={l} className="contents">
              <dt className="text-zinc-500">{l}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
    </Modale>
  );
}
