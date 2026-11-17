"use client";

import { ArrowRight, MapPinned } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Alerte, Bouton, Carte, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";

/*
 * Fiches à passer dans leur nouvelle DEPPSA (DG, 17/11/2026) : la fiche porte encore l'ancien
 * département, mais l'école de l'agent n'existe que dans une nouvelle DEPPSA (Congo-Oubangui,
 * Djoué-Léfini, Nkéni-Alima). On vérifie, on coche, on applique : chaque fiche est modifiée comme
 * une modification ordinaire (journal).
 */

interface AReclasser {
  agentId: number;
  nom: string;
  numeroFiche: string | null;
  statut: string;
  de: string;
  vers: string;
  ecole: string;
}

const nf = new Intl.NumberFormat("fr-FR");

export function CorrectionNouvelleDeppsa({ fait }: { fait: () => void }) {
  const d = useApi<AReclasser[]>("/recensement/tableau/effectifs/nouvelle-deppsa");
  const [exclus, setExclus] = useState<Set<number>>(new Set());
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ faits: number; erreurs: { id: number; message: string }[] } | null>(null);
  const lignes = useMemo(() => d.donnees ?? [], [d.donnees]);
  const choisis = lignes.filter((l) => !exclus.has(l.agentId));
  // Le résumé : « Plateaux → Nkéni-Alima : 40 »
  const parPassage = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of choisis) m.set(`${l.de} → ${l.vers}`, (m.get(`${l.de} → ${l.vers}`) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [choisis]);

  const basculer = (id: number) => {
    const s = new Set(exclus);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setExclus(s);
  };
  const appliquer = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      const r = await api.post<{ faits: number; erreurs: { id: number; message: string }[] }>("/recensement/tableau/effectifs/nouvelle-deppsa", { ids: choisis.map((l) => l.agentId) });
      setResultat(r);
      setConfirmer(false);
      setExclus(new Set());
      d.recharger();
      fait();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Carte titre={<span className="inline-flex items-center gap-2"><MapPinned className="size-4 text-or-700" /> Passer ces fiches dans leur nouvelle DEPPSA</span>}>
      <p className="mb-3 text-[13px] text-zinc-600">
        Vérifiez chaque ligne : l’école de l’agent n’existe que dans la nouvelle DEPPSA. Décochez celles qui ne conviennent pas, puis appliquez. Chaque fiche est modifiée comme une correction ordinaire (journal des
        modifications) ; on peut la remettre à la main dans sa fiche.
      </p>
      {erreur && <Alerte>{erreur}</Alerte>}
      {resultat && (
        <Alerte ton={resultat.erreurs.length ? "jaune" : "vert"}>
          {nf.format(resultat.faits)} fiche(s) passée(s) dans leur nouvelle DEPPSA.
          {resultat.erreurs.length > 0 && ` ${nf.format(resultat.erreurs.length)} non modifiée(s) : ${[...new Set(resultat.erreurs.map((e) => e.message))].join(" ; ")}`}
        </Alerte>
      )}
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!d.donnees ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-200" />
          ))}
        </div>
      ) : !lignes.length ? (
        <Vide>Plus aucune fiche à passer dans une nouvelle DEPPSA.</Vide>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {parPassage.map(([k, n]) => (
              <span key={k} className="rounded-full bg-or-100 px-3 py-1 text-[12px] font-medium text-or-700">
                {k} : {nf.format(n)}
              </span>
            ))}
          </div>
          <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-zinc-200">
            <Tableau>
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="size-4 accent-marque-600"
                      aria-label="Tout cocher"
                      checked={!exclus.size}
                      onChange={(e) => setExclus(e.target.checked ? new Set() : new Set(lignes.map((l) => l.agentId)))}
                    />
                  </th>
                  <th>Agent</th>
                  <th>Département de la fiche</th>
                  <th></th>
                  <th>Nouvelle DEPPSA</th>
                  <th>École (qui le justifie)</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.agentId} className={exclus.has(l.agentId) ? "opacity-50" : undefined}>
                    <td>
                      <input type="checkbox" className="size-4 accent-marque-600" checked={!exclus.has(l.agentId)} onChange={() => basculer(l.agentId)} aria-label={`Choisir ${l.nom}`} />
                    </td>
                    <td>
                      <Link href={`/personnel/agents/${l.agentId}`} className="font-medium text-marque-700 hover:underline">
                        {l.nom}
                      </Link>
                      <div className="text-[11px] text-zinc-500">
                        {l.statut === "CONTRACTUEL" ? "Contractuel" : "Fonctionnaire"}
                        {l.numeroFiche && ` · fiche n° ${l.numeroFiche}`}
                      </div>
                    </td>
                    <td className="text-[13px] text-zinc-600">{l.de}</td>
                    <td>
                      <ArrowRight className="size-3.5 text-zinc-400" />
                    </td>
                    <td className="text-[13px] font-semibold text-encre">{l.vers}</td>
                    <td className="text-[12px] text-zinc-600">{l.ecole}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {!confirmer ? (
              <Bouton variante="principal" disabled={!choisis.length} onClick={() => setConfirmer(true)}>
                <MapPinned /> Passer {nf.format(choisis.length)} fiche(s) dans leur nouvelle DEPPSA
              </Bouton>
            ) : (
              <>
                <span className="text-[13px] text-zinc-700">Modifier le département de {nf.format(choisis.length)} fiche(s) ?</span>
                <Bouton onClick={() => setConfirmer(false)}>Non</Bouton>
                <Bouton variante="principal" chargement={enCours} onClick={appliquer}>
                  Oui, appliquer
                </Bouton>
              </>
            )}
          </div>
        </>
      )}
    </Carte>
  );
}
