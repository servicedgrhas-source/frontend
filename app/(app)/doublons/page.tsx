"use client";

import { useState } from "react";
import { BASES, Explication, PaireDoublon, type BaseDoublons, type FicheDoublon } from "@/components/doublons";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, Carte, Chargement, EnTete, Segments, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { useParametreUrl } from "@/lib/url";

interface Page {
  total: number;
  page: number;
  taille: number;
  paires: { a: FicheDoublon; b: FicheDoublon }[];
}

/**
 * Contrôle et vérification › Doublons probables (DG, 31/10/2026) : dans chaque base, les fiches qui
 * sont probablement la même personne, deux à deux, à trancher.
 */
export default function Doublons() {
  const { profil } = useSession();
  const baseUrl = useParametreUrl("base");
  const [baseChoisie, setBase] = useState<BaseDoublons | null>(null);
  const base = baseChoisie ?? (BASES.some((b) => b.code === baseUrl) ? (baseUrl as BaseDoublons) : "RECRUTES");
  const [page, setPage] = useState(1);
  const comptes = useApi<Record<BaseDoublons, number>>("/doublons");
  const liste = useApi<Page>(`/doublons/${base}?page=${page}`);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);

  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Rubrique réservée au traitement et au contrôle.</Alerte>;
  const aide = BASES.find((b) => b.code === base)?.aide;
  const pages = liste.donnees ? Math.ceil(liste.donnees.total / liste.donnees.taille) : 1;

  return (
    <div className="space-y-5">
      <EnTete
        titre="Doublons probables"
        sousTitre="Partout la même règle : même nom (au mot près) et même date de naissance, ou même nom sans date. Pour chaque paire, gardez une fiche et supprimez l’autre, ou dites que ce sont deux personnes différentes."
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>
      <Segments
        valeur={base}
        changer={(b) => {
          setBase(b);
          setPage(1);
        }}
        options={BASES.map((b) => ({
          valeur: b.code,
          libelle: `${b.libelle}${comptes.donnees ? ` (${comptes.donnees[b.code]})` : ""}`,
        }))}
      />
      <Carte
        titre={liste.donnees ? `${liste.donnees.total} paire(s) à trancher` : "Paires à trancher"}
        actions={<span className="text-[12px] text-zinc-500">{aide}</span>}
      >
        <div className="space-y-4">
          <Explication />
          {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
          {!liste.donnees ? (
            <Chargement />
          ) : !liste.donnees.paires.length ? (
            <Vide>Aucun doublon probable dans cette base.</Vide>
          ) : (
            liste.donnees.paires.map((p) => (
              <PaireDoublon
                key={`${p.a.id}|${p.b.id}`}
                base={base}
                a={p.a}
                b={p.b}
                apres={(texte, ton = "vert") => {
                  setMessage({ ton, texte });
                  if (ton === "vert") {
                    liste.recharger();
                    comptes.recharger();
                  }
                }}
              />
            ))
          )}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-[13px]">
              <Bouton variante="discret" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Précédentes
              </Bouton>
              <span className="text-zinc-500">
                Page {page} sur {pages}
              </span>
              <Bouton variante="discret" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Suivantes
              </Bouton>
            </div>
          )}
        </div>
      </Carte>
    </div>
  );
}
