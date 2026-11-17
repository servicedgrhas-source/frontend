"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { FraicheurCalcul } from "@/components/fraicheur-calcul";
import { Aide, Alerte, Carte } from "@/components/ui";
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
  /** Points à corriger sur les fiches, en plus de leur catégorie. */
  aCorriger?: { code: string; libelle: string; explication: string; n: number }[];
  parDepartement: ({ departementId: number | null; departement: string; total: number; aTraiter: number } & Record<string, number | string | null>)[];
  calculeLe: string;
  aJour: boolean;
}

const nf = new Intl.NumberFormat("fr-FR");
const pc = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
const pct = (n: number, total: number) => `${String(pc(n, total)).replace(".", ",")} %`;

/** Couleurs d'une catégorie : barre, pastille, fond léger, texte. */
const TONS: Record<Ton, { barre: string; fond: string; texte: string; bord: string }> = {
  vert: { barre: "bg-marque-500", fond: "bg-marque-50", texte: "text-marque-700", bord: "border-l-marque-500" },
  bleu: { barre: "bg-sky-500", fond: "bg-sky-50", texte: "text-sky-700", bord: "border-l-sky-500" },
  jaune: { barre: "bg-or-400", fond: "bg-or-100", texte: "text-or-700", bord: "border-l-or-400" },
  rouge: { barre: "bg-rouge-600", fond: "bg-rouge-100", texte: "text-rouge-600", bord: "border-l-rouge-600" },
  gris: { barre: "bg-zinc-400", fond: "bg-zinc-100", texte: "text-zinc-600", bord: "border-l-zinc-400" },
};

const STATUTS: { code: string; libelle: string; couleur: string }[] = [
  { code: "FONCTIONNAIRE", libelle: "Fonctionnaires", couleur: "bg-marque-700" },
  { code: "CONTRACTUEL", libelle: "Contractuels", couleur: "bg-marque-300" },
  { code: "VOLONTAIRE", libelle: "Volontaires", couleur: "bg-sky-600" },
  { code: "COMMUNAUTAIRE", libelle: "Communautaires", couleur: "bg-sky-300" },
];

export function CentreControleEffectifs() {
  const d = useApi<CentreControle>("/recensement/tableau/effectifs");
  if (d.erreur) return <Alerte>{d.erreur}</Alerte>;
  if (!d.donnees)
    return (
      <Carte titre="Centre de contrôle des effectifs">
        <div className="space-y-3" aria-busy="true">
          <div className="h-36 animate-pulse rounded-3xl bg-zinc-200" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-3xl bg-zinc-200" />
            <div className="h-72 animate-pulse rounded-3xl bg-zinc-200" />
          </div>
        </div>
      </Carte>
    );
  const t = d.donnees;
  const statut = (s: string) => t.parStatut.find((x) => x.statut === s)?.n ?? 0;
  const enOrdre = t.total - t.aTraiter;

  return (
    <Carte
      titre="Centre de contrôle des effectifs"
      actions={<FraicheurCalcul calculeLe={t.calculeLe} aJour={t.aJour} recharger={d.recharger} />}
    >
      <p className="-mt-2 mb-4 text-[13px] text-zinc-500">
        Chaque fiche du système est comptée une seule fois, dans la catégorie qui la justifie. Cliquez sur une catégorie pour ouvrir la liste des agents et traiter leurs fiches.
      </p>

      {/* 1. Le total et sa répartition par statut */}
      <div className="rounded-3xl bg-nuit p-5 text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-white/60">
              <Users className="size-4" /> Fiches dans tout le système
            </div>
            <div className="mt-1 text-4xl font-semibold tabular-nums">{nf.format(t.total)}</div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-white/60">
                <CheckCircle2 className="size-3.5 text-marque-300" /> En ordre
              </div>
              <div className="text-xl font-semibold tabular-nums">{nf.format(enOrdre)}</div>
              <div className="text-[11px] text-white/50">{pct(enOrdre, t.total)}</div>
            </div>
            <div className="rounded-2xl bg-or-400 px-4 py-2.5 text-nuit">
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                <AlertTriangle className="size-3.5" /> À traiter
              </div>
              <div className="text-xl font-semibold tabular-nums">{nf.format(t.aTraiter)}</div>
              <div className="text-[11px] opacity-70">{pct(t.aTraiter, t.total)}</div>
            </div>
          </div>
        </div>

        {/* La barre : chaque statut à sa part */}
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/10">
          {STATUTS.map((s) => (
            <div key={s.code} className={s.couleur} style={{ width: `${pc(statut(s.code), t.total)}%` }} title={`${s.libelle} : ${nf.format(statut(s.code))}`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUTS.map((s) => (
            <Link key={s.code} href={`/personnel/agents?statut=${s.code}`} className="group rounded-2xl px-3 py-2 transition hover:bg-white/10">
              <div className="flex items-center gap-2 text-[12px] text-white/70">
                <span className={`size-2.5 rounded-full ${s.couleur}`} aria-hidden />
                {s.libelle}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums">{nf.format(statut(s.code))}</span>
                <span className="text-[11px] text-white/50">{pct(statut(s.code), t.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 2. Les catégories, par grand groupe */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {t.groupes.map((g) => (
          <div key={g.code} className="rounded-3xl border border-zinc-200 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-encre">{g.titre}</h3>
              <div className="text-right">
                <span className="text-2xl font-semibold tabular-nums text-encre">{nf.format(g.n)}</span>
                <span className="ml-1.5 text-[12px] text-zinc-500">{pct(g.n, t.total)} du total</span>
              </div>
            </div>
            {/* La barre du groupe : chaque catégorie à sa couleur */}
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-zinc-100">
              {g.lignes.map((l) => (
                <div key={l.code} className={TONS[l.ton].barre} style={{ width: `${pc(l.n, g.n)}%` }} title={`${l.libelle} : ${nf.format(l.n)}`} />
              ))}
            </div>

            <ul className="mt-4 space-y-2">
              {g.lignes.map((l) => {
                const c = TONS[l.ton];
                return (
                  <li key={l.code}>
                    <Link
                      href={`/personnel/agents?effectif=${l.code}`}
                      className={`group flex items-center gap-4 rounded-2xl border-l-4 ${c.bord} bg-zinc-50 py-3 pl-4 pr-3 transition hover:bg-zinc-100 hover:shadow-sm`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[14px] font-medium text-encre">
                            {l.libelle.slice(0, l.libelle.lastIndexOf(" ") + 1)}
                            <span className="whitespace-nowrap">
                              {l.libelle.slice(l.libelle.lastIndexOf(" ") + 1)}&nbsp;<Aide>{l.explication}</Aide>
                            </span>
                          </span>
                          {l.aTraiter && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${c.fond} ${c.texte}`}>À traiter</span>}
                        </div>
                        {l.detail.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {l.detail.slice(0, 4).map((x) => (
                              <span key={x.libelle} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-zinc-600 ring-1 ring-zinc-200">
                                {x.libelle} <strong className="font-semibold tabular-nums text-zinc-800">{nf.format(x.n)}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-xl font-semibold tabular-nums ${l.aTraiter ? c.texte : "text-encre"}`}>{nf.format(l.n)}</div>
                        <div className="text-[11px] text-zinc-500">{pct(l.n, g.n)}</div>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-marque-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Points à corriger sur les fiches, en plus de leur catégorie */}
      {!!t.aCorriger?.some((x) => x.n > 0) && (
        <div className="mt-5 rounded-3xl border border-or-400/60 bg-or-100/40 p-4">
          <h3 className="text-[15px] font-semibold text-encre">À corriger sur les fiches</h3>
          <p className="mb-2 text-[12px] text-zinc-500">En plus de leur catégorie : une donnée de la fiche est à mettre à jour.</p>
          <ul className="space-y-2">
            {t.aCorriger
              .filter((x) => x.n > 0)
              .map((x) => (
                <li key={x.code}>
                  <Link href={`/personnel/agents?effectif=${x.code}`} className="group flex items-center gap-4 rounded-2xl border-l-4 border-l-or-400 bg-white py-3 pl-4 pr-3 transition hover:shadow-sm">
                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] font-medium text-encre">
                        {x.libelle.slice(0, x.libelle.lastIndexOf(" ") + 1)}
                        <span className="whitespace-nowrap">
                          {x.libelle.slice(x.libelle.lastIndexOf(" ") + 1)}&nbsp;<Aide>{x.explication}</Aide>
                        </span>
                      </span>
                    </div>
                    <div className="shrink-0 text-xl font-semibold tabular-nums text-or-700">{nf.format(x.n)}</div>
                    <ArrowRight className="size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-marque-600" />
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* 3. Par département */}
      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold text-encre">Par département</h3>
          <span className="text-[12px] text-zinc-500">Cliquez sur un département pour ouvrir ses agents.</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Département</th>
                {STATUTS.map((s) => (
                  <th key={s.code} className="px-3 py-2.5 text-right font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${s.couleur}`} aria-hidden />
                      {s.libelle}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="w-56 px-4 py-2.5 text-left font-medium">
                  À traiter <Aide>Fiches rangées dans une catégorie « à traiter » : structure à compléter, matricule attendu, doublon probable, statut différent du registre, absents du registre…</Aide>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {t.parDepartement.map((x) => (
                <tr key={x.departement} className="hover:bg-zinc-50">
                  <td className="px-4 py-2">
                    <Link href={`/personnel/agents?departement=${x.departementId ?? ""}`} className="font-medium text-encre hover:text-marque-700 hover:underline">
                      {x.departement}
                    </Link>
                  </td>
                  {STATUTS.map((s) => (
                    <td key={s.code} className="px-3 py-2 text-right tabular-nums text-zinc-600">
                      {Number(x[s.code] ?? 0) ? nf.format(Number(x[s.code])) : <span className="text-zinc-300">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{nf.format(x.total)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-or-400" style={{ width: `${pc(x.aTraiter, x.total)}%` }} />
                      </div>
                      <span className="w-14 text-right font-medium tabular-nums text-or-700">{nf.format(x.aTraiter)}</span>
                      <span className="w-12 text-right text-[11px] text-zinc-400">{pct(x.aTraiter, x.total)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-50 font-semibold">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                {STATUTS.map((s) => (
                  <td key={s.code} className="px-3 py-2.5 text-right tabular-nums">
                    {nf.format(statut(s.code))}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(t.total)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
                      <div className="h-full rounded-full bg-or-400" style={{ width: `${pc(t.aTraiter, t.total)}%` }} />
                    </div>
                    <span className="w-14 text-right tabular-nums text-or-700">{nf.format(t.aTraiter)}</span>
                    <span className="w-12 text-right text-[11px] font-normal text-zinc-400">{pct(t.aTraiter, t.total)}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Carte>
  );
}
