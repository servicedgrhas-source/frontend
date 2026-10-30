"use client";

import { Archive, ArchiveRestore, Check } from "lucide-react";
import { useState } from "react";
import { Aide, Badge, Segments } from "@/components/ui";
import { romain } from "@/lib/libelles";
import type { GroupeQuota, Lot } from "@/lib/types";

/**
 * Choix des lots à traiter, comme la DGRHAS travaille (DG, 30/10/2026) : d'abord les arrêtés ou les
 * décrets (jamais ensemble), puis un ou plusieurs lots de publication (« VIII », « III et IV »), le
 * plus récent en avant, puis les quotas (MEPPSA, « Autres » avec ou sans département).
 */

export type Famille = "ARRETE" | "DECRET" | "ANCIENS";

export const GROUPES: { code: GroupeQuota; libelle: string; court: string }[] = [
  { code: "MEPPSA", libelle: "Quota MEPPSA", court: "MEPPSA" },
  { code: "AUTRES_AVEC", libelle: "Quota Autres avec département", court: "Autres avec dép." },
  { code: "AUTRES_SANS", libelle: "Quota Autres sans département", court: "Autres sans dép." },
];

/** Famille d'un lot : celle du fichier, sinon « anciens lots » (rangés par date de réception). */
export const familleDe = (l: Lot): Famille => (l.numeroFichier ? (l.typeTexte === "DECRET" ? "DECRET" : "ARRETE") : "ANCIENS");

const total = (l: Lot) => l.groupes.MEPPSA.total + l.groupes.AUTRES_AVEC.total + l.groupes.AUTRES_SANS.total;

export function ChoixLots({
  lots,
  famille,
  choisirFamille,
  selection,
  choisir,
  groupes,
  choisirGroupes,
  archiver,
  archiverTous,
}: {
  lots: Lot[];
  famille: Famille;
  choisirFamille: (f: Famille) => void;
  selection: number[];
  choisir: (numeros: number[]) => void;
  groupes: GroupeQuota[];
  choisirGroupes: (g: GroupeQuota[]) => void;
  /** Archiver (ou ressortir) un lot ; absent : pas le droit. */
  archiver?: (l: Lot, archive: boolean) => void;
  /** Archiver plusieurs lots d'un coup (anciens lots déjà traités à la main). */
  archiverTous?: (lots: Lot[]) => void;
}) {
  const [confirmer, setConfirmer] = useState(false);
  const [voirArchives, setVoirArchives] = useState(false);
  const deLaFamille = (f: Famille) => lots.filter((l) => familleDe(l) === f);
  const visibles = deLaFamille(famille)
    .filter((l) => voirArchives || !l.archive || selection.includes(l.numero))
    // Le plus récent d'abord : n° du fichier, sinon ordre d'arrivée
    .sort((a, b) => (b.numeroFichier ?? 0) - (a.numeroFichier ?? 0) || b.numero - a.numero);
  const archives = deLaFamille(famille).filter((l) => l.archive).length;
  const plusRecent = visibles.find((l) => !l.archive);
  const choisis = lots.filter((l) => selection.includes(l.numero));
  const compte = (g: GroupeQuota) => choisis.reduce((n, l) => n + l.groupes[g].total, 0);
  const anciens = deLaFamille("ANCIENS").filter((l) => !l.archive).length;

  return (
    <div className="space-y-4 rounded-3xl bg-white p-5 shadow-doux">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-medium text-zinc-600">1. Type de texte</span>
        <Segments
          valeur={famille}
          changer={choisirFamille}
          options={[
            { valeur: "ARRETE" as Famille, libelle: `Arrêtés (${deLaFamille("ARRETE").filter((l) => !l.archive).length})` },
            { valeur: "DECRET" as Famille, libelle: `Décrets (${deLaFamille("DECRET").filter((l) => !l.archive).length})` },
            ...(anciens || famille === "ANCIENS" ? [{ valeur: "ANCIENS" as Famille, libelle: `Anciens lots, par date (${anciens})` }] : []),
          ]}
        />
        <Aide>
          Les arrêtés et les décrets ne se traitent jamais ensemble : chacun a sa numérotation de lots (colonne « Lot de publication » de la base, en chiffres
          romains). Les « anciens lots » sont ceux rangés par date de réception avant le 30/10/2026.
        </Aide>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-zinc-600">2. Lot(s) à traiter</span>
          <span className="text-[12px] text-zinc-400">Cliquez sur un lot ; cliquez sur un autre pour les traiter ensemble (ex. décrets lots III et IV).</span>
          {archives > 0 && (
            <label className="ml-auto flex items-center gap-1.5 text-[12px] text-zinc-500">
              <input type="checkbox" checked={voirArchives} onChange={(e) => setVoirArchives(e.target.checked)} />
              Voir les lots déjà traités ({archives})
            </label>
          )}
        </div>
        {famille === "ANCIENS" && archiverTous && visibles.some((l) => !l.archive) && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-4 py-2.5 text-[13px] text-zinc-600">
            Lots rangés par date avant le 30/10/2026 (les lots déjà traités à la main y sont).
            {confirmer ? (
              <>
                <span className="font-medium text-encre">Ne plus proposer ces {visibles.filter((l) => !l.archive).length} lots ?</span>
                <button
                  type="button"
                  className="rounded-xl bg-nuit px-3 py-1 font-medium text-white"
                  onClick={() => {
                    setConfirmer(false);
                    archiverTous(visibles.filter((l) => !l.archive));
                  }}
                >
                  Oui, ils sont déjà traités
                </button>
                <button type="button" className="text-zinc-500 underline" onClick={() => setConfirmer(false)}>
                  Non
                </button>
              </>
            ) : (
              <button type="button" className="inline-flex items-center gap-1 font-semibold text-marque-700 underline" onClick={() => setConfirmer(true)}>
                <Archive className="size-3.5" /> Tous déjà traités
              </button>
            )}
            <span className="text-[12px] text-zinc-400">(réversible : « Voir les lots déjà traités », puis « Remettre à traiter »)</span>
          </div>
        )}
        {!visibles.length ? (
          <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-500">
            Aucun lot {famille === "DECRET" ? "de décrets" : famille === "ARRETE" ? "d’arrêtés" : ""} à traiter. Importez la base dans « Base des recrutés » :
            chaque personne y est rangée dans le lot de publication écrit dans le fichier.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] gap-3">
            {visibles.map((l) => {
              const actif = selection.includes(l.numero);
              const recent = l === plusRecent && famille !== "ANCIENS";
              return (
                <div
                  key={l.numero}
                  className={`relative min-w-0 rounded-2xl border p-3.5 transition-all ${
                    actif ? "border-marque-500 bg-marque-50 ring-2 ring-marque-500" : "border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-zinc-300"
                  } ${l.archive ? "opacity-60" : ""}`}
                >
                  <button
                    type="button"
                    aria-pressed={actif}
                    onClick={() => choisir(actif ? selection.filter((x) => x !== l.numero) : [...selection, l.numero])}
                    className="block w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${actif ? "border-marque-600 bg-marque-600 text-white" : "border-zinc-300"}`}>
                        {actif && <Check className="size-3.5" />}
                      </span>
                      <span className="truncate text-[15px] font-semibold">
                        {l.numeroFichier ? `Lot ${romain(l.numeroFichier)}` : l.libelle}
                      </span>
                      {recent && <Badge ton="vert">Le plus récent</Badge>}
                      {l.archive && <Badge>Déjà traité</Badge>}
                    </div>
                    <div className="mt-1 text-[12px] text-zinc-500">
                      {total(l)} personne(s) · {l.aTraiter ? `${l.aTraiter} à affecter` : "terminé"}
                      {l.affectes ? ` · ${l.affectes} affectée(s)` : ""}
                    </div>
                    <div className="mt-2 space-y-0.5 text-[12px]">
                      {GROUPES.map((g) => (
                        <div key={g.code} className="flex justify-between gap-2">
                          <span className="text-zinc-500">{g.court}</span>
                          <strong className="tabular-nums">{l.groupes[g.code].total}</strong>
                        </div>
                      ))}
                    </div>
                  </button>
                  {archiver && (
                    <button
                      type="button"
                      onClick={() => archiver(l, !l.archive)}
                      title={l.archive ? "Remettre ce lot parmi les lots à traiter" : "Lot déjà traité (à la main ou ici) : ne plus le proposer"}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-encre"
                    >
                      {l.archive ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                      {l.archive ? "Remettre à traiter" : "Lot déjà traité"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {choisis.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-zinc-600">3. Quotas</span>
          {GROUPES.map((g) => {
            const actif = groupes.includes(g.code);
            return (
              <button
                key={g.code}
                type="button"
                aria-pressed={actif}
                onClick={() => choisirGroupes(actif ? groupes.filter((x) => x !== g.code) : [...groupes, g.code])}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-all ${
                  actif ? "bg-nuit text-white" : "bg-zinc-100 text-zinc-500 hover:text-encre"
                }`}
              >
                {actif && <Check className="size-3.5" />}
                {g.libelle} <span className="tabular-nums opacity-70">({compte(g.code)})</span>
              </button>
            );
          })}
          <Aide>
            Vous décidez quels quotas traiter ensemble (ex. MEPPSA et Autres avec département). Les notes préparées ne couvrent que les quotas cochés ; une
            personne n’entre jamais dans deux notes.
          </Aide>
        </div>
      )}
    </div>
  );
}
