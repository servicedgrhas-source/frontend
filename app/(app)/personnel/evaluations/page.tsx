"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Competences, ModaleEvaluation } from "@/components/recensement/evaluation";
import { ChoixStructure, type StructureCourte } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Tableau, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { APPRECIATIONS, TON_APPRECIATION } from "@/lib/ecoles";

interface Campagne {
  annee: string;
  page: number;
  stats: { total: number; evalues: number; moyennePro: number | null; moyenneSociale: number | null; tf: number; f: number; b: number; tb: number; ex: number; relations: number; metier: number };
  lignes: {
    id: number;
    nomComplet: string;
    statut: string;
    fonction: string | null;
    structure: string | null;
    evaluationId: string | null;
    competenceProfessionnelle: number | null;
    competenceSociale: number | null;
    globale: number | null;
    appreciation: string | null;
    decision: string | null;
    evaluateur: string | null;
    date: string | null;
    commentaireProfessionnel: string | null;
    commentaireSocial: string | null;
  }[];
  decisions: Record<string, string[]>;
}
const virgule = (n: number | null) => (n === null ? "—" : String(n).replace(".", ","));

/** Campagne d'évaluation de l'année : qui est évalué, la répartition, les profils à suivre. */
export default function Evaluations() {
  const { profil } = useSession();
  const chef = profil.role === "STRUCTURE";
  const structures = useApi<StructureCourte[]>(chef ? null : "/recensement/structures");
  const [structure, setStructure] = useState("");
  const [etat, setEtat] = useState("");
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [evaluer, setEvaluer] = useState<Campagne["lignes"][number] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setRecherche(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const c = useApi<Campagne>(`/evaluations?structure=${structure}&etat=${etat}&q=${encodeURIComponent(recherche)}&page=${page}`);
  const s = c.donnees?.stats;
  const repartition = s ? [s.tf, s.f, s.b, s.tb, s.ex] : [];
  return (
    <div className="space-y-5">
      <EnTete
        titre="Évaluations du personnel"
        sousTitre="Chaque année, le chef immédiat note la compétence professionnelle et la compétence sociale de ses agents, de 1 (très faible) à 5 (excellent). La globale est leur moyenne ; le détail montre qui est compétent mais en conflit, ou apprécié mais à former."
      />
      {!chef && (
        <Carte titre="Structure">
          {!structures.donnees ? (
            <Chargement />
          ) : (
            <ChoixStructure
              structures={structures.donnees}
              valeur={structure}
              changer={(x) => {
                setStructure(x);
                setPage(1);
              }}
              vide="Toutes (mon périmètre)"
            />
          )}
        </Carte>
      )}
      {c.erreur && <Alerte>{c.erreur}</Alerte>}
      {!c.donnees || !s ? (
        <Chargement />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Chiffre libelle={`Évalués en ${c.donnees.annee}`} valeur={`${s.evalues} / ${s.total}`} detail={s.total ? `${Math.round((100 * s.evalues) / s.total)} % des agents` : ""} />
            <Chiffre libelle="Moyennes" valeur={`${virgule(s.moyennePro)} · ${virgule(s.moyenneSociale)}`} detail="professionnelle · sociale" />
            <Chiffre libelle="Compétents, relations difficiles" valeur={s.relations} ton={s.relations ? "jaune" : undefined} detail="professionnelle ≥ 3, sociale < 3" />
            <Chiffre libelle="Appréciés, à former" valeur={s.metier} ton={s.metier ? "jaune" : undefined} detail="sociale ≥ 3, professionnelle < 3" />
          </div>
          {s.evalues > 0 && (
            <Carte titre="Répartition des appréciations">
              <div className="space-y-1.5">
                {APPRECIATIONS.map((a, i) => (
                  <div key={a} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-[12px]">
                    <span>{a}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${i < 2 ? "bg-rouge-500" : i === 4 ? "bg-sky-600" : "bg-marque-600"}`}
                        style={{ width: `${(100 * repartition[i]) / Math.max(1, s.evalues)}%` }}
                      />
                    </div>
                    <span className="text-right tabular-nums">{repartition[i]}</span>
                  </div>
                ))}
              </div>
            </Carte>
          )}
          <Carte titre="Agents">
            <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_14rem]">
              <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un agent…" />
              <Liste
                value={etat}
                onChange={(e) => {
                  setEtat(e.target.value);
                  setPage(1);
                }}
                vide="Tous les agents"
                options={[
                  { valeur: "NON_EVALUE", libelle: "Pas encore évalués" },
                  { valeur: "EVALUE", libelle: "Évalués" },
                  { valeur: "A_SUIVRE", libelle: "À suivre (globale < 3)" },
                ]}
              />
            </div>
            {!c.donnees.lignes.length ? (
              <Vide>Aucun agent.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Compétences</th>
                    <th>Globale</th>
                    <th>Décision</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {c.donnees.lignes.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/personnel/agents/${l.id}`} className="font-medium text-marque-700 hover:underline">
                          {l.nomComplet}
                        </Link>
                        <div className="text-[11px] text-zinc-400">{[l.fonction, l.structure].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td>
                        {l.competenceProfessionnelle && l.competenceSociale ? (
                          <Competences pro={l.competenceProfessionnelle} social={l.competenceSociale} compact />
                        ) : (
                          <span className="text-[12px] text-zinc-400">pas évalué</span>
                        )}
                      </td>
                      <td>
                        {l.appreciation && (
                          <span className="flex items-center gap-2">
                            <strong>{virgule(l.globale)}</strong>
                            <Badge ton={TON_APPRECIATION[l.appreciation]}>{l.appreciation}</Badge>
                          </span>
                        )}
                      </td>
                      <td className="text-[12px] text-zinc-600">{l.decision ?? ""}</td>
                      <td className="text-right">
                        <Bouton variante={l.evaluationId ? "discret" : "secondaire"} onClick={() => setEvaluer(l)}>
                          {l.evaluationId ? "Revoir" : "Évaluer"}
                        </Bouton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Précédents
              </Bouton>
              <Bouton disabled={c.donnees.lignes.length < 50} onClick={() => setPage(page + 1)}>
                Suivants
              </Bouton>
            </div>
          </Carte>
        </>
      )}
      {evaluer && c.donnees && (
        <ModaleEvaluation
          agentId={evaluer.id}
          nom={evaluer.nomComplet}
          annee={c.donnees.annee}
          existante={
            evaluer.evaluationId
              ? {
                  competenceProfessionnelle: evaluer.competenceProfessionnelle ?? undefined,
                  competenceSociale: evaluer.competenceSociale ?? undefined,
                  decision: evaluer.decision,
                  date: evaluer.date ?? undefined,
                  commentaireProfessionnel: evaluer.commentaireProfessionnel,
                  commentaireSocial: evaluer.commentaireSocial,
                }
              : null
          }
          decisions={c.donnees.decisions}
          fermer={() => setEvaluer(null)}
          apres={() => {
            setEvaluer(null);
            c.recharger();
          }}
        />
      )}
    </div>
  );
}
