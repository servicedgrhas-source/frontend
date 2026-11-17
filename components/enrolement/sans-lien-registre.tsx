"use client";

import Link from "next/link";
import { useState } from "react";
import { Aide, Alerte, Badge, Bouton, Carte, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { qs, useApi } from "@/lib/api";

/*
 * Fiches de volontaires et communautaires de la base du personnel sans lien avec le registre de la
 * bourse (DG, 16/11/2026) : à voir ici, en lecture seule. Elles se traitent dans la base du personnel
 * (Personnel › Tableau de bord › Centre de contrôle des effectifs).
 */

interface SansLien {
  cas: { code: string; libelle: string; explication: string; n: number }[];
  total: number;
  lignes: {
    id: number;
    nom: string;
    statut: string;
    departement: string;
    lieu: string | null;
    cas: string;
    registre: { nom: string; population: string; statut: string } | null;
  }[];
}

const nf = new Intl.NumberFormat("fr-FR");
const TON: Record<string, "rouge" | "jaune"> = { VC_SANS_LIEN_DOUBLON: "rouge", VC_SANS_LIEN_PROCHE: "jaune", VC_SANS_LIEN_ABSENT: "jaune" };
const statut = (s: string) => (s === "COMMUNAUTAIRE" ? "Communautaire" : s === "VOLONTAIRE" ? "Volontaire" : s);

export function SansLienRegistre() {
  const [cas, setCas] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const d = useApi<SansLien>(`/enrolement/suivi-integration/sans-lien${qs({ cas, recherche: recherche.trim() || undefined, page })}`);
  const total = d.donnees?.cas.reduce((s, c) => s + c.n, 0) ?? 0;
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / 50)) : 1;

  return (
    <Carte
      titre={`Fiches du personnel sans lien avec le registre (${nf.format(total)})`}
      actions={<Saisie className="w-64" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Nom…" />}
    >
      <p className="mb-3 text-[13px] text-zinc-600">
        Volontaires et communautaires de la base du personnel qui ne sont reliés à personne du registre de la bourse. Ici, on les voit seulement : on les traite dans{" "}
        <Link href="/personnel/agents?effectif=VC_SANS_LIEN_DOUBLON" className="font-medium text-marque-700 hover:underline">
          Personnel › Centre de contrôle des effectifs
        </Link>
        .
      </p>
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {d.donnees && (
        <div className="mb-3">
          <Segments
            valeur={cas}
            changer={(v) => { setCas(v); setPage(1); }}
            options={[{ valeur: "", libelle: `Tous (${nf.format(total)})` }, ...d.donnees.cas.map((c) => ({ valeur: c.code, libelle: `${c.libelle.replace("Sans lien : ", "")} (${nf.format(c.n)})` }))]}
          />
          {cas && <p className="mt-2 text-[12px] text-zinc-500">{d.donnees.cas.find((c) => c.code === cas)?.explication}</p>}
        </div>
      )}
      {!d.donnees || d.chargement ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-zinc-200" />
          ))}
        </div>
      ) : !d.donnees.lignes.length ? (
        <Vide>Aucune fiche pour ce filtre.</Vide>
      ) : (
        <Tableau>
          <thead>
            <tr>
              <th>Nom et prénoms (base du personnel)</th>
              <th>Statut · département</th>
              <th>Lieu de service</th>
              <th>Cas</th>
              <th>
                Dans le registre de la bourse <Aide>La personne du registre au même nom, ou au nom le plus proche, quand il y en a une.</Aide>
              </th>
            </tr>
          </thead>
          <tbody>
            {d.donnees.lignes.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="font-medium">{l.nom}</td>
                <td className="text-[12px] text-zinc-600">
                  {statut(l.statut)}
                  {l.departement && <> · {l.departement}</>}
                </td>
                <td className="text-[12px]">{l.lieu ?? <span className="text-zinc-400">—</span>}</td>
                <td>
                  <Badge ton={TON[l.cas] ?? "gris"}>{d.donnees!.cas.find((c) => c.code === l.cas)?.libelle.replace("Sans lien : ", "") ?? l.cas}</Badge>
                </td>
                <td className="text-[12px]">
                  {l.registre ? (
                    <>
                      {l.registre.nom}
                      <div className="text-zinc-500">
                        {statut(l.registre.population)} · {l.registre.statut === "SORTI" ? "sorti de la bourse" : "en poste"}
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-400">personne</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-[13px]">
          <Bouton variante="discret" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Précédent
          </Bouton>
          <span className="text-zinc-500">
            Page {page} sur {nf.format(pages)}
          </span>
          <Bouton variante="discret" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Suivant →
          </Bouton>
        </div>
      )}
    </Carte>
  );
}
