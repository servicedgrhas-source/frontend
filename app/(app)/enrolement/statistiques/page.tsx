"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { SelecteurCampagne, useCampagne } from "@/components/enrolement/commun";
import { useSession } from "@/components/session";
import { Aide, Alerte, Bouton, Carte, Chargement, EnTete, Tableau } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Compte {
  total: number;
  affectes: number;
  nonRetenus: number;
  reste: number;
}
interface Specialites {
  colonnes: string[];
  lignes: { specialite: string; valeurs: number[]; cumul: number }[];
}
interface Stats {
  campagne: { id: number; annee: number; anneeScolaire: string };
  parmi: "tous" | "reste";
  parDiplome: (Compte & { cycle: string; diplome: string })[];
  total: Compte;
  college: Specialites;
  lycee: Specialites;
}

const nf = new Intl.NumberFormat("fr-FR");

/** Tableau des spécialités d'un cycle : une colonne par diplôme, puis le cumul. */
function TableSpecialites({ b }: { b: Specialites }) {
  const totaux = b.colonnes.map((_, i) => b.lignes.reduce((a, l) => a + l.valeurs[i], 0));
  return (
    <Tableau>
      <thead>
        <tr>
          <th>Spécialité</th>
          {b.colonnes.map((c) => (
            <th key={c} className="text-right">
              {c}
            </th>
          ))}
          <th className="text-right">Cumul</th>
        </tr>
      </thead>
      <tbody>
        {b.lignes.map((l) => (
          <tr key={l.specialite}>
            <td className="font-medium">{l.specialite}</td>
            {l.valeurs.map((v, i) => (
              <td key={i} className="text-right tabular-nums text-zinc-600">
                {v ? nf.format(v) : "—"}
              </td>
            ))}
            <td className="text-right font-semibold tabular-nums">{nf.format(l.cumul)}</td>
          </tr>
        ))}
        <tr className="bg-zinc-50 font-semibold">
          <td>Total</td>
          {totaux.map((t, i) => (
            <td key={i} className="text-right tabular-nums">
              {nf.format(t)}
            </td>
          ))}
          <td className="text-right tabular-nums">{nf.format(totaux.reduce((a, b) => a + b, 0))}</td>
        </tr>
      </tbody>
    </Tableau>
  );
}

/**
 * Statistiques de l'enrôlement (cadrage du 05/11/2026) : par cycle et diplôme (base générale, affectés,
 * reste), puis les spécialités du collège (DEMA, licence, cumul) et du lycée (master, licences de langues et de philosophie).
 */
export default function StatistiquesEnrolement() {
  const { profil } = useSession();
  const { liste, campagne, choisir } = useCampagne();
  const [parmi, setParmi] = useState<"tous" | "reste">("tous");
  const s = useApi<Stats>(campagne ? `/enrolement/statistiques${qs({ campagne: campagne.id, parmi })}` : null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  const d = s.donnees;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Statistiques de l’enrôlement"
        sousTitre="Combien de dossiers par cycle et par diplôme, combien sont déjà affectés (dans une note validée ou signée), combien restent à affecter ; et les spécialités du collège et du lycée."
        actions={
          campagne && (
            <Bouton
              onClick={() =>
                api
                  .telecharger(`/enrolement/statistiques/excel${qs({ campagne: campagne.id, parmi })}`, `Statistiques enrôlement ${campagne.annee}.xlsx`)
                  .catch((e: Error) => setErreur(e.message))
              }
            >
              <Download className="size-4" aria-hidden />
              Excel
            </Bouton>
          )
        }
      />
      <SelecteurCampagne liste={liste} campagne={campagne} choisir={choisir} />
      {erreur && <Alerte>{erreur}</Alerte>}
      {s.erreur && <Alerte>{s.erreur}</Alerte>}
      {!d ? (
        campagne && <Chargement />
      ) : (
        <>
          <Carte titre="Par cycle et diplôme">
            <Tableau>
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Diplôme</th>
                  <th className="text-right">
                    Base générale <Aide>Tous les dossiers de la campagne, quel que soit leur état.</Aide>
                  </th>
                  <th className="text-right">
                    Affectés <Aide>Dans une note de service validée ou signée.</Aide>
                  </th>
                  <th className="text-right">Non retenus</th>
                  <th className="text-right">
                    Reste à affecter <Aide>Ni affectés, ni non retenus : à contrôler, à décider ou retenus sans note.</Aide>
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.parDiplome.map((l, i) => (
                  <tr key={`${l.cycle}-${l.diplome}`}>
                    <td className="font-medium">{i === 0 || d.parDiplome[i - 1].cycle !== l.cycle ? l.cycle : ""}</td>
                    <td>{l.diplome}</td>
                    <td className="text-right tabular-nums">{nf.format(l.total)}</td>
                    <td className="text-right tabular-nums text-marque-700">{nf.format(l.affectes)}</td>
                    <td className="text-right tabular-nums text-zinc-500">{nf.format(l.nonRetenus)}</td>
                    <td className="text-right font-semibold tabular-nums">{nf.format(l.reste)}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-semibold">
                  <td colSpan={2}>Total</td>
                  <td className="text-right tabular-nums">{nf.format(d.total.total)}</td>
                  <td className="text-right tabular-nums text-marque-700">{nf.format(d.total.affectes)}</td>
                  <td className="text-right tabular-nums">{nf.format(d.total.nonRetenus)}</td>
                  <td className="text-right tabular-nums">{nf.format(d.total.reste)}</td>
                </tr>
              </tbody>
            </Tableau>
          </Carte>

          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-medium text-zinc-600">Spécialités comptées sur</span>
            <div className="inline-flex rounded-full bg-white p-1 shadow-doux">
              {(
                [
                  ["tous", "tous les dossiers"],
                  ["reste", "le reste à affecter"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setParmi(v)}
                  className={`rounded-full px-4 py-1.5 font-medium transition ${parmi === v ? "bg-encre text-white" : "text-zinc-600 hover:text-encre"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Carte titre="Spécialités du collège (DEMA et licence)">
              {d.college.lignes.length ? <TableSpecialites b={d.college} /> : <p className="text-[13px] text-zinc-500">Aucun dossier.</p>}
            </Carte>
            <Carte titre="Spécialités du lycée (master, licences de langues et de philosophie)">
              {d.lycee.lignes.length ? <TableSpecialites b={d.lycee} /> : <p className="text-[13px] text-zinc-500">Aucun dossier.</p>}
            </Carte>
          </div>
        </>
      )}
    </div>
  );
}
