"use client";

import { useMemo, useState } from "react";
import { Alerte, Badge, Bouton, Chargement, Modale, Tableau } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";

/**
 * Déport des affectés dans la base du personnel (DG, 30/10/2026) : les recrutés restent à part tant
 * que leur note n'est pas signée et qu'on ne les a pas déportés. C'est seulement ici que l'on compare
 * aux fiches du personnel : chaque doublon possible se tranche (même personne ou personne différente).
 */

interface Fiche {
  id: number;
  numeroFiche: string | null;
  nomComplet: string | null;
  dateNaissance: string | null;
  statut: string;
}
interface Ligne {
  id: string;
  nomComplet: string;
  dateNaissance: string | null;
  lot: string | null;
  note: string | null;
  action: "CREATION" | "MISE_A_JOUR" | "LIEE" | "DOUBLON";
  fiche: Fiche | null;
  candidats: Fiche[];
}
interface Apercu {
  total: number;
  creations: number;
  misesAJour: number;
  doublons: number;
  lignes: Ligne[];
}

const dateFr = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "date inconnue");
const STATUT: Record<string, string> = { VOLONTAIRE: "volontaire", COMMUNAUTAIRE: "communautaire", FONCTIONNAIRE: "fonctionnaire", CONTRACTUEL: "contractuel" };
const decrire = (f: Fiche) =>
  `${f.nomComplet ?? "?"} — né(e) le ${dateFr(f.dateNaissance)} — ${STATUT[f.statut] ?? f.statut.toLowerCase()}${f.numeroFiche ? ` — fiche ${f.numeroFiche}` : ""}`;

export function DeportPersonnel({ lots, fermer, apres }: { lots: number[]; fermer: () => void; apres: (message: string) => void }) {
  const apercu = useApi<Apercu>(`/deport/apercu${qs({ lots: lots.join(",") })}`);
  // Personnes retirées du déport (décochées) et choix faits pour les doublons
  const [retires, setRetires] = useState<Set<string>>(new Set());
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const retenus = useMemo(() => (apercu.donnees?.lignes ?? []).filter((l) => !retires.has(l.id)), [apercu.donnees, retires]);
  const aTrancher = retenus.filter((l) => l.action === "DOUBLON" && !choix[l.id]).length;
  // Doublons d'abord : ce sont eux qu'il faut regarder
  const lignes = useMemo(
    () => [...(apercu.donnees?.lignes ?? [])].sort((a, b) => Number(b.action === "DOUBLON") - Number(a.action === "DOUBLON")),
    [apercu.donnees],
  );

  async function deporter() {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ personnes: number; crees: number; integres: number }>("/deport", {
        ids: retenus.map((l) => l.id),
        choix: Object.fromEntries(
          Object.entries(choix)
            .filter(([id]) => retenus.some((l) => l.id === id))
            .map(([id, v]) => [id, v === "NOUVELLE" ? "NOUVELLE" : Number(v)]),
        ),
      });
      apres(
        `${r.personnes} personne(s) déportée(s) dans la base du personnel : ${r.crees} fiche(s) créée(s)${r.integres ? `, ${r.integres} volontaire(s) ou communautaire(s) passé(s) au nouveau statut` : ""}, les autres fiches mises à jour (note d’affectation, lieu de service).`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre="Déporter les affectés dans la base du personnel" ouverte fermer={fermer} large>
      {!apercu.donnees ? (
        apercu.erreur ? <Alerte>{apercu.erreur}</Alerte> : <Chargement />
      ) : !apercu.donnees.total ? (
        <p className="text-[13px] text-zinc-500">Personne à déporter : les affectés de ces lots dont la note est signée sont déjà dans la base du personnel.</p>
      ) : (
        <div className="space-y-4 text-[13px]">
          <p className="leading-relaxed text-zinc-600">
            Ces personnes ont une <strong>note d’affectation signée</strong>. Une fois déportées, elles apparaissent dans la base du personnel avec leur note, leur
            lieu de service et leur nouveau statut. Vérifiez les <strong>doublons possibles</strong> : dites pour chacun s’il s’agit de la même personne ou
            d’une autre.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge ton="vert">{apercu.donnees.creations} nouvelle(s) fiche(s)</Badge>
            <Badge ton="bleu">{apercu.donnees.misesAJour} fiche(s) mise(s) à jour</Badge>
            {apercu.donnees.doublons > 0 && <Badge ton="jaune">{apercu.donnees.doublons} doublon(s) possible(s) à trancher</Badge>}
          </div>
          {erreur && <Alerte>{erreur}</Alerte>}
          <div className="max-h-[55vh] overflow-auto">
            <Tableau>
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Personne affectée</th>
                  <th>Note</th>
                  <th>Dans la base du personnel</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => {
                  const pris = !retires.has(l.id);
                  return (
                    <tr key={l.id} className={pris ? "" : "opacity-50"}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Déporter ${l.nomComplet}`}
                          checked={pris}
                          onChange={() => {
                            const r = new Set(retires);
                            if (pris) r.add(l.id);
                            else r.delete(l.id);
                            setRetires(r);
                          }}
                        />
                      </td>
                      <td>
                        <div className="font-medium">{l.nomComplet}</div>
                        <div className="text-[11px] text-zinc-400">né(e) le {dateFr(l.dateNaissance)}{l.lot ? ` · ${l.lot}` : ""}</div>
                      </td>
                      <td className="text-[12px] text-zinc-500">{l.note}</td>
                      <td className="min-w-72">
                        {l.action === "CREATION" ? (
                          <Badge ton="vert">Nouvelle fiche</Badge>
                        ) : l.action !== "DOUBLON" ? (
                          <span className="text-[12px]">
                            <Badge ton="bleu">Mise à jour</Badge> {l.fiche && decrire(l.fiche)}
                          </span>
                        ) : (
                          <select
                            value={choix[l.id] ?? ""}
                            onChange={(e) => setChoix({ ...choix, [l.id]: e.target.value })}
                            className={`w-full rounded-xl px-2 py-1.5 text-[12px] outline-none ${choix[l.id] ? "bg-zinc-100" : "bg-or-50 ring-2 ring-or-400"}`}
                          >
                            <option value="">Doublon possible : à trancher…</option>
                            {l.candidats.map((c) => (
                              <option key={c.id} value={c.id}>
                                Même personne que : {decrire(c)}
                              </option>
                            ))}
                            <option value="NOUVELLE">Personne différente : créer une nouvelle fiche</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {aTrancher > 0 && <span className="text-[12px] text-or-700">{aTrancher} doublon(s) à trancher (ou décochez ces personnes pour plus tard)</span>}
            <Bouton onClick={fermer}>Annuler</Bouton>
            <Bouton variante="principal" disabled={!retenus.length || aTrancher > 0 || envoi} onClick={deporter}>
              Déporter {retenus.length} personne(s)
            </Bouton>
          </div>
        </div>
      )}
    </Modale>
  );
}
