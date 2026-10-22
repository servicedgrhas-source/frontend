"use client";

import { useState } from "react";
import { Champ, Liste, Saisie } from "@/components/ui";
import { useApi } from "@/lib/api";

/**
 * Origine du dossier : choisie dans la liste tenue par le DG (« Administration › Origines des
 * dossiers »), ou écrite à la main avec « Autre ». Sert à la saisie des candidats et des enrôlements.
 */
export function ChampOrigine({ valeur, changer, membre, departement }: { valeur: string; changer: (v: string) => void; membre: string | null; departement: string | null }) {
  const origines = useApi<{ id: number; libelle: string }[]>("/origines");
  const liste = origines.donnees ?? [];
  const ddeppsa = (o: string) => o === "DDEPPSA du département";
  const reelle = (o: string) => (ddeppsa(o) && departement ? `DDEPPSA du ${departement}` : o);
  const choisie = liste.find((o) => reelle(o.libelle) === valeur || o.libelle === valeur);
  const [autre, setAutre] = useState(false);
  const enAutre = autre || (!!valeur && !choisie);
  return (
    <Champ
      libelle="Origine du dossier"
      aide={membre && !valeur ? `Laissée vide : « Membre de la commission : ${membre} »` : "Qui a transmis ou recommandé le dossier (information interne)"}
      bulle={
        <>
          Choisissez dans la liste : les mêmes mots pour tous permettent de compter les dossiers par origine. La liste se règle dans « Administration › Origines des
          dossiers ». Si l’origine n’y est pas, choisissez <strong>« Autre »</strong> et écrivez-la.
        </>
      }
      className="md:col-span-2"
    >
      <div className="flex flex-wrap gap-2">
        <Liste
          className="min-w-56 flex-1"
          value={enAutre ? "__autre" : (choisie?.libelle ?? "")}
          onChange={(e) => {
            if (e.target.value === "__autre") {
              setAutre(true);
              changer("");
            } else {
              setAutre(false);
              changer(e.target.value ? reelle(e.target.value) : "");
            }
          }}
          vide="— Non précisée —"
          options={[
            ...liste.map((o) => ({ valeur: o.libelle, libelle: ddeppsa(o.libelle) && departement ? `DDEPPSA du ${departement}` : o.libelle })),
            { valeur: "__autre", libelle: "Autre (écrire l’origine)…" },
          ]}
        />
        {enAutre && <Saisie autoFocus className="min-w-56 flex-1" value={valeur} onChange={(e) => changer(e.target.value)} placeholder="Écrivez l’origine" />}
      </div>
    </Champ>
  );
}
