"use client";

import { libelleLot, libelleAnomalie } from "@/lib/libelles";
import { CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "./session";
import { Alerte, Bouton, Champ, Liste, Modale, Saisie } from "./ui";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

const CYCLES: Record<string, string> = { PRESCOLAIRE: "Préscolaire", PRIMAIRE: "Primaire", COLLEGE: "Collège", LYCEE: "Lycée", ADMINISTRATION: "Administration" };

/** Ce que l'on corrige pour chaque anomalie. */
type Genre = "date" | "departement" | "diplome" | "cycle" | "texte" | "verifier";

function genre(anomalie: string): Genre {
  if (anomalie.startsWith("Date de naissance")) return "date";
  if (anomalie.startsWith("Département")) return "departement";
  if (anomalie.startsWith("Diplôme")) return "diplome";
  if (anomalie.startsWith("Cycle de la base")) return "cycle";
  if (anomalie.startsWith("Lot de publication sans numéro")) return "texte";
  return "verifier";
}

/** Explications pour les anomalies qui se vérifient sans champ à remplir. */
const EXPLICATION: Record<string, string> = {
  "Signalé comme doublon dans la base": "Le fichier Excel marquait cette ligne comme doublon. Si c’est bien la même personne qu’une autre fiche, retirez-la de la note dans « Affectations ». Sinon, déclarez-la vérifiée.",
};

export function CorrectionAnomalies({ agent, fermer, apres }: { agent: Agent; fermer: () => void; apres: (texte: string) => void }) {
  const { refs } = useSession();
  const [v, setV] = useState({ dateNaissance: "", departementId: "", diplomeCode: "", numeroTexte: "" });
  const [verifiees, setVerifiees] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const regle = refs.regles.find((r) => r.code === (v.diplomeCode || agent.diplomeCode));
  const diplomes = [...refs.regles].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
  const basculer = (a: string) => setVerifiees((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]));

  async function enregistrer() {
    const corps: Record<string, unknown> = {};
    if (v.dateNaissance) corps.dateNaissance = v.dateNaissance;
    if (v.departementId) corps.departementId = Number(v.departementId);
    if (v.diplomeCode) corps.diplomeCode = v.diplomeCode;
    if (v.numeroTexte.trim()) corps.numeroTexte = v.numeroTexte.trim();
    if (verifiees.length) corps.anomaliesVerifiees = verifiees;
    if (!Object.keys(corps).length) {
      setErreur("Remplissez au moins une correction, ou cochez une anomalie comme vérifiée.");
      return;
    }
    try {
      await api.patch(`/agents/${agent.id}`, corps);
      apres(`Fiche de ${agent.nomComplet} corrigée.`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre={`Corriger les anomalies – ${agent.nomComplet}`} ouverte fermer={fermer} large>
      <p className="mb-4 text-[13px] text-zinc-500">Pour chaque problème, remplissez le champ proposé (vérifiez sur le dossier papier ou sur le texte de la FP).</p>
      <div className="space-y-3">
        {agent.anomalies.map((a) => {
          const g = genre(a);
          return (
            <section key={a} className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-[13px] font-semibold text-rouge-600">{libelleAnomalie(a, agent).titre}</div>
              {libelleAnomalie(a, agent).detail && <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">{libelleAnomalie(a, agent).detail}</p>}
              <div className="mb-3" />

              {g === "date" && (
                <Champ libelle="Date de naissance exacte" aide={agent.dateNaissanceBrute ? `Écrit dans le fichier : « ${agent.dateNaissanceBrute} »` : "Absente du fichier"}>
                  <Saisie type="date" className="max-w-56" value={v.dateNaissance} onChange={(e) => setV({ ...v, dateNaissance: e.target.value })} />
                </Champ>
              )}

              {g === "departement" && (
                <Champ libelle="Département d’affectation (l’un des 15 départements scolaires)" aide={agent.departementBrut ? `Écrit dans le fichier : « ${agent.departementBrut} »` : "Case vide dans le fichier"}>
                  <Liste className="max-w-72" value={v.departementId} onChange={(e) => setV({ ...v, departementId: e.target.value })} vide="— Choisir —" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
                </Champ>
              )}

              {g === "diplome" && (
                <>
                  <Champ libelle="Diplôme" aide={`Écrit dans le fichier : « ${agent.diplomeBrut ?? "—"} »`}>
                    <Liste className="max-w-72" value={v.diplomeCode} onChange={(e) => setV({ ...v, diplomeCode: e.target.value })} vide="— Choisir —" options={diplomes.map((r) => ({ valeur: r.code, libelle: r.libelle }))} />
                  </Champ>
                  {regle && v.diplomeCode && (
                    <p className="mt-2 text-[12px] text-zinc-500">
                      → Cycle {CYCLES[regle.cycle] ?? regle.cycle}, grade {regle.grade ?? "à définir"} (catégorie {regle.categorie}, échelle {regle.echelle}).
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Ce diplôme n’existe pas dans la liste ? Le DG peut l’ajouter dans « Règles et grades » : toutes les fiches qui l’écrivent ainsi seront reconnues.
                  </p>
                </>
              )}

              {g === "cycle" && (
                <>
                  <p className="text-[13px] leading-relaxed text-zinc-600">
                    Le fichier Excel indique <strong>« {agent.cycleBrut ?? "—"} »</strong>, mais le diplôme <strong>{agent.diplomeBrut}</strong> correspond au cycle{" "}
                    <strong>{regle ? CYCLES[regle.cycle] : "?"}</strong>. La correction applique la règle du diplôme : c’est elle qui décide de la note de service.
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-[13px] font-medium">
                    <input type="checkbox" checked={verifiees.includes(a)} onChange={() => basculer(a)} />
                    Appliquer la règle du diplôme ({regle ? CYCLES[regle.cycle] : "?"})
                  </label>
                  {/* Rappel discret : un cycle différent du diplôme relève d'une recommandation */}
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] text-zinc-400">
                    <Info className="mt-px size-3.5 shrink-0" />
                    <span>
                      Si la personne travaille réellement en {agent.cycleBrut?.toLowerCase() ?? "autre cycle"}, une recommandation validée par le DG est nécessaire :{" "}
                      {agent.lotPublication ? (
                        <Link href={`/affectations?lot=${agent.lotPublication.numero}`} className="underline hover:text-marque-700">
                          la proposer dans Affectations ({libelleLot(agent.lotPublication)})
                        </Link>
                      ) : (
                        "possible une fois son texte de la FP reçu"
                      )}
                      .
                    </span>
                  </p>
                </>
              )}

              {g === "texte" && (
                <Champ libelle="N° du texte (arrêté ou décret)" aide="Recopiez le numéro écrit sur le texte de la FP">
                  <Saisie className="max-w-56" value={v.numeroTexte} onChange={(e) => setV({ ...v, numeroTexte: e.target.value })} />
                </Champ>
              )}

              {g === "verifier" && (
                <>
                  <p className="text-[13px] leading-relaxed text-zinc-600">
                    {libelleAnomalie(a, agent).detail ? null : EXPLICATION[a] ??
                      (a.startsWith("Ressemble à")
                        ? "Le nom ressemble à celui d’une personne déjà enregistrée (un prénom de plus ou de moins, autre ordre, faute de frappe). Comparez les deux dossiers : si c’est la même personne, une des deux fiches est en trop ; sinon, déclarez-la vérifiée."
                        : a.startsWith("N° de texte partagé")
                          ? "Le même numéro de texte est écrit pour une autre personne. Sauf texte collectif, l’un des deux numéros est faux : la référence imprimée sur la note le serait aussi. Comparez avec les textes de la FP, corrigez le numéro, ou déclarez-la vérifiée."
                          : "Vérifiez ce point sur le dossier papier.")}
                  </p>
                  {/* Numéro partagé : on peut le corriger ici (sinon, texte collectif : « vérifié ») */}
                  {a.startsWith("N° de texte partagé") && (
                    <div className="mt-3">
                      <Champ libelle={`N° du texte de ${agent.nomComplet} (actuellement ${agent.numeroTexte ?? "—"})`} aide="Si le numéro est faux : recopiez le bon numéro écrit sur le texte de la FP. S’il est juste (texte collectif), laissez vide et cochez « vérifié ».">
                        <Saisie className="max-w-56" value={v.numeroTexte} onChange={(e) => setV({ ...v, numeroTexte: e.target.value })} />
                      </Champ>
                    </div>
                  )}
                  <label className="mt-3 flex items-center gap-2 text-[13px] font-medium">
                    <input type="checkbox" checked={verifiees.includes(a)} onChange={() => basculer(a)} />
                    J’ai vérifié : retirer cette anomalie
                  </label>
                </>
              )}
            </section>
          );
        })}
      </div>
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={enregistrer}>
          <CheckCircle2 /> Enregistrer les corrections
        </Bouton>
      </div>
    </Modale>
  );
}

/** Correction groupée : la règle du diplôme s'applique à toutes les fiches dont le cycle diffère. */
export function CorrectionCyclesGroupee({ nombre, apres }: { nombre: number; apres: (texte: string) => void }) {
  const [ouverte, setOuverte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!nombre) return null;
  return (
    <>
      <Alerte ton="jaune">
        <strong>{nombre} fiche(s)</strong> ont un cycle dans le fichier Excel différent de celui de leur diplôme. Le plus souvent, c’est la colonne Excel qui est fausse.{" "}
        <button type="button" className="font-semibold underline" onClick={() => setOuverte(true)}>
          Appliquer la règle du diplôme à toutes
        </button>
      </Alerte>
      <Modale titre="Appliquer la règle du diplôme à toutes ces fiches ?" ouverte={ouverte} fermer={() => setOuverte(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Pour les <strong>{nombre} fiche(s)</strong>, le cycle retenu sera celui du diplôme (par exemple BAC → primaire) et l’anomalie disparaîtra, même après une nouvelle importation du fichier Excel.
        </p>
        <p className="mt-3 text-[12px] text-zinc-500">
          Les notes de service ne changent pas : elles utilisaient déjà la règle du diplôme. Si une personne travaille réellement dans un autre cycle, faites ensuite une recommandation pour elle.
        </p>
        {erreur && (
          <div className="mt-3">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setOuverte(false)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={async () => {
              try {
                const r = await api.post<{ fiches: number }>("/agents/anomalies/cycle");
                setOuverte(false);
                apres(`Règle du diplôme appliquée à ${r.fiches} fiche(s).`);
              } catch (e) {
                setErreur((e as Error).message);
              }
            }}
          >
            Appliquer à toutes
          </Bouton>
        </div>
      </Modale>
    </>
  );
}
