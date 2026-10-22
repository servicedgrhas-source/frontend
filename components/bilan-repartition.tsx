"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Alerte, Chargement } from "@/components/ui";
import { useApi } from "@/lib/api";
import { libelleAnomalie } from "@/lib/libelles";

interface Bilan {
  placees: number;
  sansTexte: number;
  prets: number;
  affectes: number;
  exclus: number;
  bloques: number;
  raisons: { raison: string; n: number }[];
  lots: { numero: number; libelle: string; bloques: number }[];
}

/** Où corriger chaque blocage. */
const OU: { motif: RegExp; texte: string; lien: string }[] = [
  { motif: /date de signature/i, texte: "Saisir la date de signature du lot", lien: "/lots" },
  { motif: /date de naissance/i, texte: "Corriger les dates de naissance (Base des recrutés, « À vérifier »)", lien: "/recrutement" },
  { motif: /diplôme|type de note/i, texte: "Corriger le diplôme de la personne, ou ajouter ce diplôme dans « Règles et grades »", lien: "/recrutement" },
  { motif: /département/i, texte: "Donner un département (Traitement des affectations)", lien: "/affectations" },
];

/**
 * Bilan d'une répartition du quota « Autres » : recevoir un département ne suffit pas pour
 * entrer dans une note ; ce qui bloque encore chaque personne, et où le corriger.
 */
export function BilanRepartition({ id }: { id: string }) {
  const b = useApi<Bilan>(`/pilotage/repartition/${id}/bilan`);
  if (b.erreur) return <Alerte>{b.erreur}</Alerte>;
  if (!b.donnees) return <Chargement />;
  const d = b.donnees;
  return (
    <div className="space-y-3 text-[13px]">
      <div className="grid gap-2 text-center sm:grid-cols-4">
        {[
          ["Ont reçu un département", d.placees, "text-encre"],
          ["Déjà dans une note validée", d.affectes, "text-marque-700"],
          ["Prêtes pour une note", d.prets, "text-marque-700"],
          ["Bloquées (à compléter)", d.bloques + d.sansTexte, d.bloques + d.sansTexte ? "text-rouge-600" : "text-zinc-400"],
        ].map(([l, n, c]) => (
          <div key={l as string} className="rounded-2xl bg-zinc-50 py-2.5">
            <div className={`text-lg font-semibold tabular-nums ${c}`}>{n as number}</div>
            <div className="text-[11px] text-zinc-500">{l as string}</div>
          </div>
        ))}
      </div>
      {d.bloques + d.sansTexte > 0 ? (
        <div className="rounded-2xl bg-or-100/60 px-4 py-3">
          <p className="font-semibold text-encre">
            Ces personnes ont bien un département, mais elles ne peuvent pas encore entrer dans une note de service :
          </p>
          <ul className="mt-2 space-y-1.5">
            {d.sansTexte > 0 && (
              <li>
                <strong>{d.sansTexte}</strong> sans texte de la FP enregistré (elles entreront dans une note à la réception de leur texte).
              </li>
            )}
            {d.raisons.map((r) => {
              const ou = OU.find((x) => x.motif.test(r.raison));
              return (
                <li key={r.raison} className="flex flex-wrap items-center gap-x-2">
                  <strong className="tabular-nums">{r.n}</strong> {libelleAnomalie(r.raison, { quotaAutres: true }).titre}
                  {ou && (
                    <Link href={ou.lien} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-marque-700 hover:underline">
                      {ou.texte} <ArrowRight className="size-3" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          {d.lots.length > 0 && (
            <div className="mt-3 text-[12px] text-zinc-600">
              Par lot :{" "}
              {d.lots.map((l, i) => (
                <span key={l.numero}>
                  {i > 0 && " · "}
                  <Link href={`/affectations?lot=${l.numero}&probleme=bloquant`} className="text-marque-700 hover:underline">
                    {l.libelle} ({l.bloques})
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-marque-700">Toutes les personnes placées peuvent entrer dans une note de service (ou y sont déjà).</p>
      )}
    </div>
  );
}
