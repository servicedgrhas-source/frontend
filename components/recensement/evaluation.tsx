"use client";

import { Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alerte, Badge, BoutonIcone, Bouton, Carte, Champ, Chargement, Liste, Modale, Saisie, Zone, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { APPRECIATIONS, TON_APPRECIATION } from "@/lib/ecoles";

export interface Evaluation {
  id: string;
  annee: string;
  date: string;
  competenceProfessionnelle: number;
  competenceSociale: number;
  globale: number;
  appreciation: string;
  decision: string | null;
  commentaireProfessionnel: string | null;
  commentaireSocial: string | null;
  evaluateur: string | null;
  lecture: string;
  /** Validée : close, plus modifiable (sinon brouillon). */
  valideeLe: string | null;
  valideePar: string | null;
}

const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR");

const NOTES = [1, 2, 3, 4, 5];
/** La moyenne de l'échelle de 1 à 5 (DG, 24/10/2026) : à 2,5, l'agent a la moyenne. */
export const MOYENNE = 2.5;
/** Même appréciation que le serveur : 2,5 et 3,5 « bon », 4 et 4,5 « très bon », 5 « excellent », 2 « faible ». */
export const appreciation = (g: number) => APPRECIATIONS[(g >= 5 ? 5 : g >= 4 ? 4 : g >= MOYENNE ? 3 : g >= 2 ? 2 : 1) - 1];
const virgule = (n: number) => String(n).replace(".", ",");
/** Même lecture que le serveur : l'écart entre les deux compétences dit le type de personne. */
export function lecture(pro: number, social: number) {
  if (pro >= MOYENNE && social >= MOYENNE) return "Compétent dans son métier et à l’aise avec les autres.";
  if (pro >= MOYENNE) return "Compétent dans son métier, mais relations difficiles avec son entourage.";
  if (social >= MOYENNE) return "Bonnes relations avec son entourage, mais compétences professionnelles à renforcer.";
  return "Compétences professionnelles et relations à renforcer.";
}

/** Deux barres sur 5 : le détail qui compte autant que la moyenne. */
export function Competences({ pro, social, compact }: { pro: number; social: number; compact?: boolean }) {
  const barre = (n: number) => (
    <span className="flex gap-0.5">
      {NOTES.map((i) => (
        <span key={i} className={`h-2 ${compact ? "w-2.5" : "w-4"} rounded-sm ${i <= n ? (n >= 3 ? "bg-marque-600" : "bg-rouge-500") : "bg-zinc-200"}`} />
      ))}
    </span>
  );
  return (
    <span className="inline-flex flex-col gap-1 text-[11px] text-zinc-500">
      <span className="flex items-center gap-2">
        <span className="w-20">Professionnelle</span>
        {barre(pro)}
        <strong className="text-encre">{pro}</strong>
      </span>
      <span className="flex items-center gap-2">
        <span className="w-20">Sociale</span>
        {barre(social)}
        <strong className="text-encre">{social}</strong>
      </span>
    </span>
  );
}

/** Cinq boutons de 1 (très faible) à 5 (excellent). */
function Notes({ valeur, changer, fige }: { valeur: number; changer: (n: number) => void; fige?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {NOTES.map((n) => (
        <button
          key={n}
          type="button"
          disabled={fige}
          onClick={() => changer(n)}
          className={`rounded-lg px-1 py-2 text-center text-[11px] leading-tight ring-1 transition disabled:cursor-not-allowed ${valeur === n ? (n >= 3 ? "bg-marque-600 text-white ring-marque-600" : "bg-rouge-600 text-white ring-rouge-600") : "bg-white ring-zinc-200 enabled:hover:bg-zinc-50"}`}
        >
          <span className="block text-[15px] font-bold">{n}</span>
          {APPRECIATIONS[n - 1]}
        </button>
      ))}
    </div>
  );
}

/** Évaluation d'un agent pour une année : deux notes de 1 à 5, la globale et la décision proposée. */
export function ModaleEvaluation({
  agentId,
  nom,
  annee,
  existante,
  decisions,
  fermer,
  apres,
}: {
  agentId: number;
  nom: string;
  annee: string;
  existante?: Partial<Evaluation> | null;
  decisions: Record<string, string[]>;
  fermer: () => void;
  apres: () => void;
}) {
  const [pro, setPro] = useState(existante?.competenceProfessionnelle ?? 0);
  const [social, setSocial] = useState(existante?.competenceSociale ?? 0);
  const [decision, setDecision] = useState(existante?.decision ?? "");
  const [cPro, setCPro] = useState(existante?.commentaireProfessionnel ?? "");
  const [cSocial, setCSocial] = useState(existante?.commentaireSocial ?? "");
  const [date, setDate] = useState(existante?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, demander] = useConfirmation();
  // Validée : affichée en lecture seule
  const fige = !!existante?.valideeLe;
  const globale = pro && social ? (pro + social) / 2 : null;
  const app = globale ? appreciation(globale) : null;
  const proposees = app ? (decisions[app] ?? []) : [];
  async function enregistrer(valider: boolean) {
    if (valider && !(await demander("Valider définitivement l’évaluation ? Une fois validée, personne ne pourra plus la modifier ni la retirer.", "Valider définitivement"))) return;
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/evaluations/agents/${agentId}`, {
        annee,
        date,
        competenceProfessionnelle: pro,
        competenceSociale: social,
        decision: decision || null,
        commentaireProfessionnel: cPro || null,
        commentaireSocial: cSocial || null,
        valider,
      });
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Modale titre={`Évaluation ${annee} — ${nom}`} ouverte fermer={fermer} large>
      <div className="space-y-4">
        {fige ? (
          <Alerte ton="vert">
            Validée par {existante?.valideePar ?? "—"} le {dateFr(existante!.valideeLe!)} : elle n’est plus modifiable.
          </Alerte>
        ) : (
          <Alerte ton={existante ? "jaune" : "bleu"}>
            {existante ? "Brouillon : vous pouvez encore corriger les notes. " : ""}Tant que l’évaluation n’est pas validée, vous pouvez la corriger. Une fois validée, elle est{" "}
            <strong>définitive</strong> : ni vous ni la DGRHAS ne pouvez plus la modifier.
          </Alerte>
        )}
        <div>
          <div className="mb-1 text-[13px] font-semibold">Compétence professionnelle</div>
          <p className="mb-2 text-[12px] text-zinc-500">Maîtrise du métier : préparation et conduite des cours, résultats, ponctualité, respect des consignes.</p>
          <Notes valeur={pro} changer={setPro} fige={fige} />
          <Zone className="mt-2 w-full" value={cPro} disabled={fige} onChange={(e) => setCPro(e.target.value)} placeholder="Ce qui justifie la note (facultatif)" />
        </div>
        <div>
          <div className="mb-1 text-[13px] font-semibold">Compétence sociale</div>
          <p className="mb-2 text-[12px] text-zinc-500">Relations avec les collègues, les chefs, les élèves et les parents ; comportement dans le service et dans la cité.</p>
          <Notes valeur={social} changer={setSocial} fige={fige} />
          <Zone className="mt-2 w-full" value={cSocial} disabled={fige} onChange={(e) => setCSocial(e.target.value)} placeholder="Ce qui justifie la note (facultatif)" />
        </div>
        {globale !== null && app && (
          <div className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              Compétence globale : <strong>{virgule(globale)} / 5</strong>
              <Badge ton={TON_APPRECIATION[app]}>{app}</Badge>
            </div>
            <div className="mt-1 text-[12px] text-zinc-600">{lecture(pro, social)}</div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <Champ libelle="Décision proposée" aide="Proposée selon l’appréciation ; vous pouvez en écrire une autre. Elle figure dans la fiche de l’agent et sur la fiche d’évaluation.">
            <>
              <Liste
                value={proposees.includes(decision) ? decision : ""}
                vide="— Choisir ou écrire ci-dessous —"
                disabled={fige}
                onChange={(e) => setDecision(e.target.value)}
                options={proposees.map((x) => ({ valeur: x, libelle: x }))}
              />
              <Saisie className="mt-2" value={decision} disabled={fige} onChange={(e) => setDecision(e.target.value)} placeholder="Autre décision" />
            </>
          </Champ>
          <Champ libelle="Date de l’évaluation">
            <Saisie type="date" value={date} disabled={fige} onChange={(e) => setDate(e.target.value)} />
          </Champ>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>{fige ? "Fermer" : "Annuler"}</Bouton>
        {!fige && (
          <>
            <Bouton disabled={!pro || !social || envoi} onClick={() => enregistrer(false)}>
              Enregistrer le brouillon
            </Bouton>
            <Bouton variante="principal" disabled={!pro || !social || envoi} onClick={() => enregistrer(true)}>
              Valider définitivement
            </Bouton>
          </>
        )}
      </div>
      {confirmation}
    </Modale>
  );
}

/** Évaluations d'un agent, dans sa fiche. */
export function CarteEvaluations({ agentId, nom }: { agentId: number; nom: string }) {
  const d = useApi<{ evaluations: Evaluation[]; anneeCourante: string; decisions: Record<string, string[]> }>(`/evaluations/agents/${agentId}`);
  const [ouvert, setOuvert] = useState(false);
  const [confirmation, demander] = useConfirmation();
  const [erreur, setErreur] = useState<string | null>(null);
  const courante = d.donnees?.evaluations.find((e) => e.annee === d.donnees!.anneeCourante);
  return (
    <Carte
      titre="Évaluations"
      actions={
        d.donnees && (
          <Bouton variante="discret" onClick={() => setOuvert(true)}>
            {!courante ? `Évaluer (${d.donnees.anneeCourante})` : courante.valideeLe ? `Voir l’évaluation ${d.donnees.anneeCourante}` : `Reprendre le brouillon ${d.donnees.anneeCourante}`}
          </Bouton>
        )
      }
    >
      <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
        Par le chef immédiat, une fois par an : compétence professionnelle et compétence sociale, de 1 (très faible) à 5 (excellent). La globale est leur moyenne, mais c’est le détail qui apprécie le
        mieux l’agent. Une évaluation validée est définitive.
      </p>
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {erreur && <Alerte>{erreur}</Alerte>}
      {!d.donnees ? (
        <Chargement />
      ) : !d.donnees.evaluations.length ? (
        <p className="text-[13px] text-zinc-500">Pas encore évalué.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {d.donnees.evaluations.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start gap-4 py-2.5">
              <div className="w-24">
                <div className="text-[13px] font-semibold">{e.annee}</div>
                <div className="text-[11px] text-zinc-400">{e.date.slice(0, 10).split("-").reverse().join("/")}</div>
              </div>
              <Competences pro={e.competenceProfessionnelle} social={e.competenceSociale} />
              <div className="min-w-0 flex-1 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{virgule(e.globale)} / 5</strong>
                  <Badge ton={TON_APPRECIATION[e.appreciation]}>{e.appreciation}</Badge>
                  {e.valideeLe ? <Badge ton="vert">Validée</Badge> : <Badge ton="jaune">Brouillon</Badge>}
                  {e.decision && <span className="text-zinc-600">· {e.decision}</span>}
                </div>
                <div className="text-[12px] text-zinc-500">{e.lecture}</div>
                {(e.commentaireProfessionnel || e.commentaireSocial) && (
                  <div className="mt-1 text-[12px] italic text-zinc-500">{[e.commentaireProfessionnel, e.commentaireSocial].filter(Boolean).join(" · ")}</div>
                )}
                {e.evaluateur && (
                  <div className="text-[11px] text-zinc-400">
                    par {e.evaluateur}
                    {e.valideeLe && ` · validée le ${dateFr(e.valideeLe)}${e.valideePar && e.valideePar !== e.evaluateur ? ` par ${e.valideePar}` : ""}`}
                  </div>
                )}
              </div>
              {e.valideeLe && (
                <BoutonIcone libelle="Imprimer la fiche d’évaluation" onClick={() => window.open(`/impression/evaluation/${agentId}?ev=${e.id}`, "_blank")}>
                  <Printer />
                </BoutonIcone>
              )}
              {/* Une évaluation validée ne se retire plus */}
              {!e.valideeLe && (
                <BoutonIcone
                  libelle="Retirer l’évaluation"
                  ton="rouge"
                  onClick={async () => {
                    if (!(await demander(`Retirer l’évaluation ${e.annee} ?`, "Retirer"))) return;
                    try {
                      await api.delete(`/evaluations/agents/${agentId}/${e.id}`);
                      d.recharger();
                    } catch (x) {
                      setErreur((x as Error).message);
                    }
                  }}
                >
                  <Trash2 />
                </BoutonIcone>
              )}
            </li>
          ))}
        </ul>
      )}
      {ouvert && d.donnees && (
        <ModaleEvaluation
          agentId={agentId}
          nom={nom}
          annee={d.donnees.anneeCourante}
          existante={courante}
          decisions={d.donnees.decisions}
          fermer={() => setOuvert(false)}
          apres={() => {
            setOuvert(false);
            d.recharger();
          }}
        />
      )}
      {confirmation}
    </Carte>
  );
}
