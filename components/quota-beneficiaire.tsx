"use client";

import { Alerte, Jauge } from "@/components/ui";
import { qs, useApi } from "@/lib/api";

interface Consommation {
  beneficiaires: {
    id: number;
    nom: string;
    commission: boolean;
    cycles: Record<string, { prevues: number; utilisees: number }>;
    prevues: number;
    utilisees: number;
  }[];
  libellesCycles: Record<string, string>;
}

/** Même écriture que le serveur : sans accents, majuscules, espaces simples. */
const cle = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * À la saisie : le bénéficiaire du quota dont ce dossier consomme une place (d'après l'origine,
 * ou la commission si un membre l'apporte), et ses places dans le cycle du diplôme.
 * N'empêche pas d'enregistrer : un dépassement s'affiche au DG dans Pilotage.
 */
export function QuotaBeneficiaire({
  quota,
  cycle,
  origine,
  viaMembre,
  ficheId,
  version,
}: {
  quota: string;
  cycle: string | null;
  origine: string;
  viaMembre: boolean;
  ficheId?: string;
  /** Change après chaque enregistrement pour relire les compteurs. */
  version?: unknown;
}) {
  const conso = useApi<Consommation>(quota ? `/candidats/quota-beneficiaires${qs({ quota, exclure: ficheId, v: String(version ?? "") })}` : null);
  const origines = useApi<{ id: number; libelle: string; beneficiaireId: number | null }[]>("/origines");
  if (!quota || !conso.donnees || !origines.donnees) return null;
  if (!viaMembre && !origine.trim()) return null;

  const parLibelle = new Map(origines.donnees.filter((o) => o.beneficiaireId).map((o) => [cle(o.libelle), o.beneficiaireId!]));
  const k = cle(origine);
  const idBenef = viaMembre
    ? conso.donnees.beneficiaires.find((b) => b.commission)?.id
    : (parLibelle.get(k) ?? (k.startsWith("DDEPPSA") ? parLibelle.get(cle("DDEPPSA du département")) : undefined));
  const b = conso.donnees.beneficiaires.find((x) => x.id === idBenef);

  if (!b)
    return (
      <p className="text-[12px] text-zinc-500 md:col-span-2 xl:col-span-4">
        Cette origine n’est rattachée à <strong>aucun bénéficiaire du quota</strong> : le dossier ne compte dans aucune place. (Le DG la rattache dans Pilotage ›
        Bénéficiaires du quota.)
      </p>
    );

  const c = cycle ? b.cycles[cycle] : null;
  const prevues = c ? c.prevues : b.prevues;
  const utilisees = c ? c.utilisees : b.utilisees;
  const libCycle = cycle ? conso.donnees.libellesCycles[cycle]?.toLowerCase() : null;
  const complet = prevues > 0 && utilisees >= prevues;
  return (
    <div className="space-y-2 md:col-span-2 xl:col-span-4">
      <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span>
            Bénéficiaire du quota : <strong>{b.nom}</strong>
            {libCycle ? ` — ${libCycle}` : " (tous cycles : choisissez le diplôme pour voir le cycle)"}
          </span>
          <span className={`tabular-nums ${complet ? "font-semibold text-or-700" : "text-zinc-600"}`}>
            {utilisees} / {prevues} place(s) utilisée(s){prevues > utilisees ? ` · ce dossier sera le ${utilisees + 1}e` : ""}
          </span>
        </div>
        {prevues > 0 && (
          <div className="mt-2">
            <Jauge valeur={utilisees} max={prevues} />
          </div>
        )}
      </div>
      {prevues === 0 && (
        <Alerte ton="jaune">
          Aucune place n’est prévue pour <strong>{b.nom}</strong>
          {libCycle ? ` au ${libCycle}` : ""} dans le quota {quota} (Pilotage › Bénéficiaires du quota). Vous pouvez enregistrer : le DG verra ce dossier en plus.
        </Alerte>
      )}
      {complet && (
        <Alerte ton="jaune">
          Les <strong>{prevues} place(s)</strong> de {b.nom}
          {libCycle ? ` au ${libCycle}` : ""} sont déjà toutes utilisées. Vous pouvez enregistrer quand même : le dépassement apparaîtra en rouge au DG dans
          Pilotage.
        </Alerte>
      )}
    </div>
  );
}
