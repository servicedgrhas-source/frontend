"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FraicheurCalcul } from "@/components/fraicheur-calcul";
import { Aide, Alerte, Carte, Tableau } from "@/components/ui";
import { useApi } from "@/lib/api";

/*
 * Centre de contrôle des effectifs (DG, 16/11/2026) : chaque fiche du système est rangée dans une
 * seule catégorie qui la justifie. On peut dire à tout moment « tant sont ceci, tant sont cela ».
 * Chaque ligne ouvre la liste des agents concernés, où l'on traite les fiches.
 */

type Ton = "vert" | "bleu" | "jaune" | "rouge" | "gris";

interface Ligne {
  code: string;
  libelle: string;
  explication: string;
  ton: Ton;
  aTraiter: boolean;
  n: number;
  detail: { libelle: string; n: number }[];
}

export interface CentreControle {
  total: number;
  aTraiter: number;
  parStatut: { statut: string; n: number }[];
  groupes: { code: string; titre: string; n: number; lignes: Ligne[] }[];
  parDepartement: ({ departementId: number | null; departement: string; total: number; aTraiter: number } & Record<string, number | string | null>)[];
  calculeLe: string;
  aJour: boolean;
}

const nf = new Intl.NumberFormat("fr-FR");
const PASTILLE: Record<Ton, string> = {
  vert: "bg-marque-500",
  bleu: "bg-sky-500",
  jaune: "bg-or-500",
  rouge: "bg-rouge-500",
  gris: "bg-zinc-400",
};
const STATUTS: [string, string][] = [
  ["FONCTIONNAIRE", "Fonctionnaires"],
  ["CONTRACTUEL", "Contractuels"],
  ["VOLONTAIRE", "Volontaires"],
  ["COMMUNAUTAIRE", "Communautaires"],
];

export function CentreControleEffectifs() {
  const d = useApi<CentreControle>("/recensement/tableau/effectifs");
  if (d.erreur) return <Alerte>{d.erreur}</Alerte>;
  if (!d.donnees)
    return (
      <Carte titre="Centre de contrôle des effectifs">
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-zinc-200" />
          ))}
        </div>
      </Carte>
    );
  const t = d.donnees;
  const statut = (s: string) => t.parStatut.find((x) => x.statut === s)?.n ?? 0;

  return (
    <Carte
      titre="Centre de contrôle des effectifs"
      actions={
        <span className="text-[12px] text-zinc-500">
          Chaque fiche du système est rangée dans une seule catégorie. Cliquez sur une ligne pour voir les agents et traiter leurs fiches.
        </span>
      }
    >
      <div className="space-y-5">
        <FraicheurCalcul calculeLe={t.calculeLe} aJour={t.aJour} recharger={d.recharger} />

        {/* L'équation : tout le monde est compté une fois */}
        <div className="rounded-2xl bg-zinc-50 p-4 text-[14px]">
          <span className="text-2xl font-semibold tabular-nums text-encre">{nf.format(t.total)}</span> fiches dans le système ={" "}
          {STATUTS.map(([s, l], i) => (
            <span key={s}>
              {i > 0 && " + "}
              <Link href={`/personnel/agents?statut=${s}`} className="font-semibold tabular-nums text-marque-700 hover:underline">
                {nf.format(statut(s))}
              </Link>{" "}
              {l.toLowerCase()}
            </span>
          ))}
          <div className="mt-1 text-[13px] text-zinc-600">
            Dont <strong className="text-rouge-600">{nf.format(t.aTraiter)}</strong> fiche(s) à traiter (structure à compléter, matricule attendu, doublon, statut faux, absents du registre…).
          </div>
        </div>

        {/* Les catégories, par grand groupe */}
        <div className="grid gap-5 lg:grid-cols-2">
          {t.groupes.map((g) => (
            <div key={g.code}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <h3 className="text-[14px] font-semibold text-encre">{g.titre}</h3>
                <span className="text-[13px] font-semibold tabular-nums">{nf.format(g.n)}</span>
              </div>
              <ul className="divide-y divide-zinc-100">
                {g.lignes.map((l) => (
                  <li key={l.code}>
                    <Link href={`/personnel/agents?effectif=${l.code}`} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 text-[13px] hover:bg-zinc-50">
                      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${PASTILLE[l.ton]}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-zinc-800">{l.libelle}</span> <Aide>{l.explication}</Aide>
                        {l.detail.length > 0 && <span className="block text-[11px] text-zinc-500">{l.detail.slice(0, 4).map((x) => `${x.libelle} ${nf.format(x.n)}`).join(" · ")}</span>}
                      </span>
                      <span className={`shrink-0 text-right font-semibold tabular-nums ${l.aTraiter ? "text-or-700" : "text-zinc-800"}`}>{nf.format(l.n)}</span>
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-zinc-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Par département : chaque statut, et ce qui reste à traiter */}
        <div>
          <h3 className="mb-1.5 text-[14px] font-semibold text-encre">Par département</h3>
          <Tableau>
            <thead>
              <tr>
                <th>Département</th>
                {STATUTS.map(([s, l]) => (
                  <th key={s} className="text-right">
                    {l}
                  </th>
                ))}
                <th className="text-right">Total</th>
                <th className="text-right">
                  À traiter <Aide>Fiches rangées dans une catégorie « à traiter » : structure à compléter, matricule attendu, doublon probable, statut différent du registre, absents du registre…</Aide>
                </th>
              </tr>
            </thead>
            <tbody>
              {t.parDepartement.map((x) => (
                <tr key={x.departement}>
                  <td>
                    <Link href={`/personnel/agents?departement=${x.departementId ?? ""}`} className="hover:underline">
                      {x.departement}
                    </Link>
                  </td>
                  {STATUTS.map(([s]) => (
                    <td key={s} className="text-right tabular-nums">
                      {nf.format(Number(x[s] ?? 0))}
                    </td>
                  ))}
                  <td className="text-right font-semibold tabular-nums">{nf.format(x.total)}</td>
                  <td className="text-right tabular-nums text-or-700">{nf.format(x.aTraiter)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total</td>
                {STATUTS.map(([s]) => (
                  <td key={s} className="text-right tabular-nums">
                    {nf.format(statut(s))}
                  </td>
                ))}
                <td className="text-right tabular-nums">{nf.format(t.total)}</td>
                <td className="text-right tabular-nums text-or-700">{nf.format(t.aTraiter)}</td>
              </tr>
            </tbody>
          </Tableau>
        </div>
      </div>
    </Carte>
  );
}
