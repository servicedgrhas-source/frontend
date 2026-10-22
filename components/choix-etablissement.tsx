"use client";

import Link from "next/link";
import { Liste } from "@/components/ui";
import { useApi } from "@/lib/api";

interface StructureCourte {
  id: number;
  type: string;
  nom: string;
  sigle: string;
  departementId: number | null;
  actif: boolean;
}

/**
 * Établissement d'affectation, choisi dans la liste des écoles du département (Organigramme).
 * Vide : la personne est à la disposition de la DDEPPSA, qui l'affecte selon les besoins.
 */
export function ChoixEtablissement({
  departementId,
  valeur,
  changer,
}: {
  departementId: number | null;
  valeur: string;
  changer: (v: string) => void;
}) {
  const structures = useApi<StructureCourte[]>("/structures");
  const ecoles = (structures.donnees ?? [])
    .filter((s) => s.type === "ETABLISSEMENT" && s.actif && s.departementId === departementId)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  // Une valeur déjà saisie à la main (avant la liste) reste proposée
  const options = [
    ...ecoles.map((e) => ({ valeur: e.nom, libelle: e.nom })),
    ...(valeur && !ecoles.some((e) => e.nom === valeur) ? [{ valeur, libelle: `${valeur} (saisi à la main)` }] : []),
  ];
  return (
    <div className="space-y-1">
      <Liste
        value={valeur}
        onChange={(e) => changer(e.target.value)}
        vide="— Aucun : à la disposition de la DDEPPSA —"
        options={options}
        disabled={!departementId}
      />
      <p className="text-[11px] text-zinc-500">
        {!departementId
          ? "Choisissez d’abord le département."
          : ecoles.length
            ? `${ecoles.length} établissement(s) de ce département. `
            : "Aucun établissement enregistré pour ce département. "}
        {departementId && (
          <Link href="/administration/organigramme" target="_blank" className="font-medium text-marque-700 hover:underline">
            Ajouter un établissement (Organigramme)
          </Link>
        )}
      </p>
    </div>
  );
}
