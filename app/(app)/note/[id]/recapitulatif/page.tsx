"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Aide, Alerte, Badge, Bouton, Carte, Chargement, EnTete } from "@/components/ui";
import { api, useApi } from "@/lib/api";

/**
 * Récapitulatif d'une note (réunion DG du 06/11/2026) : « une note à laquelle on a ajouté des noms,
 * on a rectifié… il faut connaître la liste définitive ». La note de base, ses additifs et ses
 * rectificatifs, en une seule liste par département : d'où vient chaque personne, ce qui a changé,
 * qui ne figure plus sur la liste.
 */

interface Ligne {
  id: string;
  n: number;
  source: string;
  changements: string[];
  provisoire: boolean;
  [cle: string]: unknown;
}
interface Recap {
  racine: { id: string; libelle: string; module: string; numero: string | null; dateSignature: string | null; statut: string };
  notes: { id: string; type: "NOTE" | "ADDITIF" | "RECTIFICATIF"; nom: string; signee: boolean; effectif: number }[];
  colonnes: { cle: string; libelle: string }[];
  sections: { titre: string | null; lignes: Ligne[] }[];
  retires: { nom: string; raison: string; provisoire: boolean }[];
  total: number;
  provisoire: boolean;
}

const TYPE = { NOTE: "Note de base", ADDITIF: "Additif", RECTIFICATIF: "Rectificatif" } as const;

function Recapitulatif() {
  const { id } = useParams<{ id: string }>();
  const { donnees: r, erreur, chargement } = useApi<Recap>(`/notes/${id}/recapitulatif`);
  const [message, setMessage] = useState<string | null>(null);
  if (chargement) return <Chargement />;
  if (erreur || !r) return <Alerte>{erreur ?? "Récapitulatif introuvable."}</Alerte>;
  const cols = r.colonnes;
  const seule = r.notes.length === 1;
  return (
    <div className="space-y-5">
      <div className="no-print">
        <Link href={`/note/${r.racine.id}`} className="text-[13px] text-marque-700 hover:underline">
          ← Retour à la note
        </Link>
      </div>
      <EnTete
        titre="Récapitulatif de la note"
        sousTitre={
          <>
            {r.racine.libelle}. La liste définitive : la note de base, plus les personnes de ses additifs, avec les corrections de ses rectificatifs. Les numéros
            reprennent à 1 dans chaque département.
          </>
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Bouton onClick={() => window.print()}>Imprimer / PDF</Bouton>
            <Bouton
              onClick={() =>
                api.telecharger(`/notes/${r.racine.id}/recapitulatif/excel`, `Récapitulatif - ${r.racine.libelle}.xlsx`).catch((e: Error) => setMessage(e.message))
              }
            >
              Excel
              <Aide>La liste définitive dans Excel, avec pour chaque personne la note d’où elle vient et ce qui a changé.</Aide>
            </Bouton>
          </div>
        }
      />
      {message && <Alerte>{message}</Alerte>}

      <Carte titre="Les notes de la famille">
        <div className="flex flex-wrap gap-2">
          {r.notes.map((x) => (
            <Link
              key={x.id}
              href={`/note/${x.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-zinc-200 hover:ring-marque-300"
            >
              <span className="font-medium text-zinc-900">{x.nom.replace(" (pas encore signé)", "")}</span>
              <span className="text-zinc-500">
                {TYPE[x.type]} · {x.effectif} {x.type === "RECTIFICATIF" ? "correction(s)" : "personne(s)"}
              </span>
              <Badge ton={x.signee ? "vert" : "jaune"}>{x.signee ? "signé" : "pas encore signé"}</Badge>
            </Link>
          ))}
        </div>
        {seule && <p className="mt-3 text-[13px] text-zinc-500">Cette note n’a ni additif ni rectificatif : sa liste est déjà la liste définitive.</p>}
        {r.provisoire && (
          <div className="mt-3">
            <Alerte ton="jaune">Liste provisoire : une note de la famille n’est pas encore signée. Ses personnes sont marquées « provisoire ».</Alerte>
          </div>
        )}
      </Carte>

      <Carte titre={`Liste définitive · ${r.total} personne(s)`}>
        {r.sections.map((s, i) => (
          <div key={i} className="mb-5 last:mb-0">
            {s.titre && <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-zinc-800">{s.titre}</h3>}
            <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200">
              <table className="w-full text-[12.5px]">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="px-2 py-2">N°</th>
                    {cols.map((c) => (
                      <th key={c.cle} className="px-2 py-2">
                        {c.libelle.replace("-", "")}
                      </th>
                    ))}
                    <th className="px-2 py-2">Vient de</th>
                  </tr>
                </thead>
                <tbody>
                  {s.lignes.map((l) => (
                    <tr key={`${l.id}-${l.n}`} className={`border-t border-zinc-100 align-top ${l.changements.length ? "bg-amber-50/60" : ""}`}>
                      <td className="px-2 py-1.5 text-zinc-500">{l.n}</td>
                      {cols.map((c) => (
                        <td key={c.cle} className={`px-2 py-1.5 ${c.cle === "nom" ? "font-medium text-zinc-900" : "text-zinc-700"}`}>
                          {String(l[c.cle] ?? "")}
                          {c.cle === "nom" &&
                            l.changements.map((t) => (
                              <div key={t} className="mt-0.5 text-[11.5px] font-normal text-amber-800">
                                {t}
                              </div>
                            ))}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-[12px] text-zinc-600">
                        {l.source.replace(" (pas encore signé)", "")}
                        {l.provisoire && (
                          <span className="ml-1">
                            <Badge ton="jaune">provisoire</Badge>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Carte>

      {r.retires.length > 0 && (
        <Carte titre="Ne figurent plus sur la liste">
          <ul className="space-y-1 text-[13px]">
            {r.retires.map((x, i) => (
              <li key={i}>
                <span className="font-medium text-zinc-900">{x.nom}</span> — <span className="text-zinc-600">{x.raison.replace(" (pas encore signé)", "")}</span>
                {x.provisoire && (
                  <span className="ml-1">
                    <Badge ton="jaune">provisoire</Badge>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Recapitulatif />
    </Suspense>
  );
}
