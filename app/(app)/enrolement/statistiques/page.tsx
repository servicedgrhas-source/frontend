"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { SelecteurCampagne, useCampagne } from "@/components/enrolement/commun";
import { useSession } from "@/components/session";
import { Aide, Alerte, Bouton, Carte, Chargement, EnTete, Modale, Tableau } from "@/components/ui";
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
  budget: {
    enveloppe: number;
    mois: number;
    parCycle: { cycle: string; dossiers: number; places: number; bourse: number; coutTous: number }[];
    coutTous: number;
    ecart: number | null;
  };
}
interface BaseDefinitive {
  arreteeLe: string | null;
  arreteePar: string | null;
  ajoutesDepuis: number;
  total: number;
  aControler: number;
  aDecider: number;
}

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;

/**
 * La base définitive (DG, 06/11/2026 : « moi j'ai besoin du fichier définitif ») : arrêtée par le DG
 * quand il ne reste rien à contrôler ni à décider ; un dossier ajouté après la rend provisoire.
 */
function BandeauBase({ campagne }: { campagne: number }) {
  const { profil } = useSession();
  const b = useApi<BaseDefinitive>(`/enrolement/base-definitive${qs({ campagne })}`);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  if (!b.donnees) return null;
  const x = b.donnees;
  const reste = x.aControler + x.aDecider;
  async function changer(arreter: boolean) {
    try {
      await api.post("/enrolement/base-definitive", { campagne, arreter });
      setConfirmer(false);
      b.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }
  const arretee = !!x.arreteeLe && !x.ajoutesDepuis;
  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${arretee ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200"}`}>
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <span className={`font-semibold ${arretee ? "text-emerald-900" : "text-amber-900"}`}>
          {arretee
            ? `Base définitive arrêtée le ${new Date(x.arreteeLe!).toLocaleDateString("fr-FR")}${x.arreteePar ? ` par ${x.arreteePar}` : ""} : ${nf.format(x.total)} dossiers.`
            : x.arreteeLe
              ? `Base arrêtée le ${new Date(x.arreteeLe).toLocaleDateString("fr-FR")}, mais ${nf.format(x.ajoutesDepuis)} dossier(s) ajouté(s) depuis : elle n’est plus définitive.`
              : "Base de travail : pas encore arrêtée comme définitive."}
        </span>
        {!arretee && reste > 0 && (
          <span className="text-amber-800">
            Encore {nf.format(x.aControler)} à contrôler et {nf.format(x.aDecider)} à décider.
          </span>
        )}
        {profil.role === "DG" && (
          <span className="ml-auto flex gap-2">
            {arretee ? (
              <Bouton variante="discret" onClick={() => changer(false)}>Rouvrir la base</Bouton>
            ) : (
              <Bouton variante="principal" onClick={() => setConfirmer(true)}>
                {x.arreteeLe ? "Arrêter de nouveau" : "Arrêter la base définitive"}
              </Bouton>
            )}
          </span>
        )}
      </div>
      {erreur && <div className="mt-2"><Alerte>{erreur}</Alerte></div>}
      {confirmer && (
        <Modale titre="Arrêter la base définitive" ouverte fermer={() => setConfirmer(false)}>
          <p className="text-[13px] leading-relaxed text-zinc-700">
            Les statistiques et la répartition par département partiront de ces <strong>{nf.format(x.total)}</strong> dossiers.
            {reste > 0 && (
              <>
                {" "}
                <strong className="text-amber-800">Attention : il reste {nf.format(reste)} dossier(s) à contrôler ou à décider.</strong>
              </>
            )}{" "}
            Si des dossiers sont ajoutés ensuite, le système le signalera et vous pourrez l’arrêter de nouveau.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Bouton onClick={() => setConfirmer(false)}>Annuler</Bouton>
            <Bouton variante="principal" onClick={() => changer(true)}>Arrêter la base</Bouton>
          </div>
        </Modale>
      )}
    </div>
  );
}

/** Si on prend tout le monde, combien ça coûte, face à l'enveloppe (DG, 06/11/2026). */
function FaceEnveloppe({ b }: { b: Stats["budget"] }) {
  const max = Math.max(1, b.enveloppe, b.coutTous);
  return (
    <Carte titre={`Face à l’enveloppe de bourse (${b.mois} mois)`}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
          <div className="text-[12px] text-zinc-500">Enveloppe</div>
          <div className="text-lg font-semibold text-encre">{b.enveloppe ? fcfa(b.enveloppe) : "non fixée"}</div>
        </div>
        <div className="rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
          <div className="text-[12px] text-zinc-500">Si on prend tous les dossiers</div>
          <div className="text-lg font-semibold text-encre">{fcfa(b.coutTous)}</div>
        </div>
        <div className={`rounded-2xl px-4 py-3 ring-1 ${b.ecart === null ? "bg-zinc-50 ring-zinc-200" : b.ecart >= 0 ? "bg-emerald-50 ring-emerald-200" : "bg-rouge-100 ring-rouge-600/30"}`}>
          <div className="text-[12px] text-zinc-500">{b.ecart === null ? "Écart" : b.ecart >= 0 ? "Il reste" : "Dépassement"}</div>
          <div className={`text-lg font-semibold ${b.ecart === null ? "text-zinc-500" : b.ecart >= 0 ? "text-emerald-800" : "text-rouge-600"}`}>
            {b.ecart === null ? "—" : fcfa(Math.abs(b.ecart))}
          </div>
        </div>
      </div>
      {b.enveloppe > 0 && (
        <div className="mb-4">
          <div className="relative h-3 overflow-hidden rounded-full bg-zinc-100">
            <div className={`h-full rounded-full ${b.coutTous > b.enveloppe ? "bg-rouge-600" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, (b.coutTous / max) * 100)}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-encre" style={{ left: `${(b.enveloppe / max) * 100}%` }} title="Enveloppe" />
          </div>
          <div className="mt-1 text-[11.5px] text-zinc-500">Le trait noir marque l’enveloppe.</div>
        </div>
      )}
      <Tableau>
        <thead>
          <tr>
            <th>Cycle</th>
            <th className="text-right">Dossiers</th>
            <th className="text-right">Places prévues</th>
            <th className="text-right">Bourse par mois</th>
            <th className="text-right">Coût si tous ({b.mois} mois)</th>
          </tr>
        </thead>
        <tbody>
          {b.parCycle.map((l) => (
            <tr key={l.cycle}>
              <td className="font-medium">{l.cycle}</td>
              <td className="text-right tabular-nums">{nf.format(l.dossiers)}</td>
              <td className="text-right tabular-nums text-zinc-600">{l.places ? nf.format(l.places) : "—"}</td>
              <td className="text-right tabular-nums text-zinc-600">{l.bourse ? fcfa(l.bourse) : "—"}</td>
              <td className="text-right font-semibold tabular-nums">{fcfa(l.coutTous)}</td>
            </tr>
          ))}
        </tbody>
      </Tableau>
    </Carte>
  );
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
      {campagne && <BandeauBase key={campagne.id} campagne={campagne.id} />}
      {erreur && <Alerte>{erreur}</Alerte>}
      {s.erreur && <Alerte>{s.erreur}</Alerte>}
      {!d ? (
        campagne && <Chargement />
      ) : (
        <>
          {d.budget && <FaceEnveloppe b={d.budget} />}
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
