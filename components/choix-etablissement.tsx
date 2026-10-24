"use client";

import Link from "next/link";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

/**
 * Établissement d'affectation, choisi avec une recherche parmi les écoles du département
 * (organigramme). Une école absente de la liste peut être tapée. Vide : la personne est à la
 * disposition de la DDEPPSA, qui l'affecte selon les besoins.
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
  return (
    <div className="space-y-1">
      <SaisieReferentiel
        liste="ETABLISSEMENT"
        valeur={valeur}
        changer={changer}
        departementId={departementId}
        desactive={!departementId}
        placeholder="Chercher une école du département (vide : à la disposition de la DDEPPSA)"
      />
      <p className="text-[11px] text-zinc-500">
        {!departementId ? "Choisissez d’abord le département." : "Laissez vide : la personne est à la disposition de la DDEPPSA. "}
        {departementId && (
          <Link href="/administration/organigramme" target="_blank" className="font-medium text-marque-700 hover:underline">
            Ajouter un établissement (Organigramme)
          </Link>
        )}
      </p>
    </div>
  );
}
