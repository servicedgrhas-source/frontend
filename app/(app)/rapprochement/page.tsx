"use client";

import { useState } from "react";
import { ComparerFichiers } from "@/components/rapprochement/comparer-fichiers";
import { ListesAnneesPassees } from "@/components/rapprochement/listes-annees-passees";
import { NotesSignees } from "@/components/rapprochement/notes-signees";
import { useSession } from "@/components/session";
import { Alerte, EnTete } from "@/components/ui";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { useParametreUrl } from "@/lib/url";

type Onglet = "comparer" | "annees" | "notes";

/**
 * Rapprochement et contrôles : un seul écran pour retrouver les mêmes personnes.
 * 1. Comparer des fichiers (vérification ponctuelle, rien n'est enregistré).
 * 2. Listes des années passées (gardées : la saisie bloque un candidat déjà recruté).
 * 3. Notes déjà signées (gardées : personne n'est affecté deux fois).
 */
export default function Rapprochement() {
  const { profil } = useSession();
  const depuisUrl = useParametreUrl("onglet") as Onglet | null | undefined;
  const [choisi, setChoisi] = useState<Onglet | null>(null);
  const onglet: Onglet = choisi ?? (depuisUrl === "annees" || depuisUrl === "notes" ? depuisUrl : "comparer");
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Rapprochement et contrôles"
        sousTitre="Retrouver les mêmes personnes d’une liste à l’autre : pour ne pas recruter deux fois, ne pas enrôler un volontaire déjà payé, ne pas affecter deux fois."
      />
      <div className="grid gap-3 text-[13px] leading-relaxed md:grid-cols-3">
        {[
          ["comparer", "Comparer des fichiers", "Jusqu’à 4 fichiers Excel comparés entre eux et avec la base. Une vérification : rien n’est enregistré."],
          ["annees", "Listes des années passées", "Les recrutés des années précédentes, gardés dans le système : la saisie bloque un candidat déjà recruté."],
          ["notes", "Notes déjà signées", "Les notes signées hors du système, gardées sur chaque personne : personne n’est affecté deux fois."],
        ].map(([cle, titre, texte]) => (
          <button
            key={cle}
            type="button"
            aria-pressed={onglet === cle}
            onClick={() => setChoisi(cle as Onglet)}
            className={`rounded-3xl p-4 text-left shadow-doux transition ${onglet === cle ? "bg-nuit text-white" : "bg-white hover:-translate-y-0.5 hover:shadow-lg"}`}
          >
            <div className="font-semibold">{titre}</div>
            <div className={`mt-1 text-[12px] ${onglet === cle ? "text-white/70" : "text-zinc-500"}`}>{texte}</div>
          </button>
        ))}
      </div>
      {onglet === "comparer" && <ComparerFichiers />}
      {onglet === "annees" && <ListesAnneesPassees />}
      {onglet === "notes" && <NotesSignees />}
    </div>
  );
}
