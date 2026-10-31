"use client";

import { libelleLot, libelleAnomalie } from "@/lib/libelles";
import { CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { Alerte, Bouton, Champ, Liste, Modale, Saisie } from "./ui";
import { api, useApi } from "@/lib/api";
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
  // Cycle : « j'ai vérifié », avertissement masqué et cycle du fichier gardé
  const [masquerCycle, setMasquerCycle] = useState(false);
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
    if (masquerCycle) corps.masquerCycle = true;
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
                    <input
                      type="checkbox"
                      checked={verifiees.includes(a)}
                      onChange={() => {
                        basculer(a);
                        setMasquerCycle(false);
                      }}
                    />
                    Appliquer la règle du diplôme ({regle ? CYCLES[regle.cycle] : "?"})
                  </label>
                  {/* Un homme titulaire du BEPC peut être envoyé à l'administration (DG, 31/10/2026) */}
                  <label className="mt-2 flex items-center gap-2 text-[13px] font-medium">
                    <input
                      type="checkbox"
                      checked={masquerCycle}
                      onChange={() => {
                        setMasquerCycle(!masquerCycle);
                        setVerifiees((l) => l.filter((x) => x !== a));
                      }}
                    />
                    J’ai vérifié : garder « {agent.cycleBrut ?? "—"} » et masquer l’avertissement
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

interface FicheCycle {
  id: string;
  nomComplet: string;
  diplome: string | null;
  cycleFichier: string | null;
  cycleDiplome: string;
  lot: Parameters<typeof libelleLot>[0];
}

/**
 * Cycle du fichier différent de celui du diplôme, pour plusieurs fiches à la fois : on coche, puis
 * on masque l'avertissement (« j'ai vérifié », le cycle du fichier est gardé) ou on applique la
 * règle du diplôme. Les avertissements masqués se réaffichent à la demande (DG, 31/10/2026).
 */
export function CorrectionCyclesGroupee({ nombre, apres }: { nombre: number; apres: (texte: string) => void }) {
  const liste = useApi<{ aVerifier: FicheCycle[]; masquees: FicheCycle[] }>("/agents/anomalies/cycle");
  const [vue, setVue] = useState<"aVerifier" | "masquees" | null>(null);
  const [cochees, setCochees] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const { recharger } = liste;
  // Une fiche corrigée ailleurs (fenêtre de correction) change le nombre : la liste est relue
  useEffect(() => {
    recharger();
  }, [nombre, recharger]);
  const masquees = liste.donnees?.masquees.length ?? 0;
  if (!nombre && !masquees) return null;
  const fiches = vue ? (liste.donnees?.[vue] ?? []) : [];
  const ouvrir = (v: "aVerifier" | "masquees") => {
    setVue(v);
    setCochees([]);
    setErreur(null);
  };

  async function agir(route: string, texte: (n: number) => string) {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ fiches: number }>(route, { ids: cochees });
      setVue(null);
      recharger();
      apres(texte(r.fiches));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      {nombre > 0 ? (
        <Alerte ton="jaune">
          <strong>{nombre} fiche(s)</strong> ont un cycle dans le fichier Excel différent de celui de leur diplôme.{" "}
          <button type="button" className="font-semibold underline" onClick={() => ouvrir("aVerifier")}>
            Voir la liste : masquer ou appliquer la règle
          </button>
          {masquees > 0 && (
            <>
              {" · "}
              <button type="button" className="underline" onClick={() => ouvrir("masquees")}>
                Afficher les {masquees} avertissement(s) masqué(s)
              </button>
            </>
          )}
        </Alerte>
      ) : (
        <p className="text-[12px] text-zinc-500">
          <button type="button" className="inline-flex items-center gap-1 underline hover:text-marque-700" onClick={() => ouvrir("masquees")}>
            <Eye className="size-3.5" /> Afficher les {masquees} avertissement(s) « cycle différent du diplôme » masqué(s)
          </button>
        </p>
      )}
      <Modale
        titre={vue === "masquees" ? "Avertissements masqués : cycle différent du diplôme" : "Cycle du fichier différent de celui du diplôme"}
        ouverte={vue !== null}
        fermer={() => setVue(null)}
        large
      >
        {vue === "aVerifier" ? (
          <p className="text-[13px] leading-relaxed text-zinc-600">
            Cochez les fiches vérifiées. <strong>Masquer l’avertissement</strong> garde le cycle du fichier (par exemple un homme titulaire du BEPC envoyé à
            l’administration). <strong>Appliquer la règle du diplôme</strong> remplace le cycle du fichier par celui du diplôme (BEPC → préscolaire). Dans les deux
            cas l’avertissement ne revient pas à la prochaine importation.
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed text-zinc-600">
            Fiches dont l’avertissement a été masqué : le cycle du fichier est gardé. Cochez celles à revoir pour faire réapparaître l’avertissement.
          </p>
        )}
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-zinc-400">
          <Info className="mt-px size-3.5 shrink-0" />
          <span>La note de service suit la règle du diplôme. Pour une personne qui part réellement dans un autre cycle, faites une recommandation dans Affectations.</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Bouton variante="secondaire" onClick={() => setCochees(fiches.map((f) => f.id))}>
            Tout cocher
          </Bouton>
          <Bouton variante="discret" onClick={() => setCochees([])}>
            Tout décocher
          </Bouton>
          <span className="ml-auto text-[12px] text-zinc-500">
            {cochees.length} cochée(s) sur {fiches.length}
          </span>
        </div>
        <div className="mt-2 max-h-96 space-y-1 overflow-auto">
          {fiches.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-start gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-[13px]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={cochees.includes(f.id)}
                onChange={() => setCochees((l) => (l.includes(f.id) ? l.filter((x) => x !== f.id) : [...l, f.id]))}
              />
              <span>
                <strong>{f.nomComplet}</strong>
                <span className="text-zinc-500">
                  {" "}
                  · {f.diplome ?? "—"} · fichier : <strong>{f.cycleFichier ?? "—"}</strong> · diplôme : <strong>{f.cycleDiplome}</strong>
                  {f.lot ? ` · ${libelleLot(f.lot)}` : ""}
                </span>
              </span>
            </label>
          ))}
          {!fiches.length && <p className="py-6 text-center text-[13px] text-zinc-400">Aucune fiche.</p>}
        </div>
        {erreur && (
          <div className="mt-3">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Bouton onClick={() => setVue(null)}>Fermer</Bouton>
          {vue === "aVerifier" ? (
            <>
              <Bouton
                variante="secondaire"
                disabled={!cochees.length || envoi}
                onClick={() => agir("/agents/anomalies/cycle", (n) => `Règle du diplôme appliquée à ${n} fiche(s).`)}
              >
                Appliquer la règle du diplôme ({cochees.length})
              </Bouton>
              <Bouton
                variante="principal"
                disabled={!cochees.length || envoi}
                onClick={() => agir("/agents/anomalies/cycle/masquer", (n) => `Avertissement masqué pour ${n} fiche(s) : cycle du fichier gardé.`)}
              >
                <EyeOff /> J’ai vérifié : masquer ({cochees.length})
              </Bouton>
            </>
          ) : (
            <Bouton
              variante="principal"
              disabled={!cochees.length || envoi}
              onClick={() => agir("/agents/anomalies/cycle/reafficher", (n) => `Avertissement réaffiché pour ${n} fiche(s).`)}
            >
              <Eye /> Réafficher l’avertissement ({cochees.length})
            </Bouton>
          )}
        </div>
      </Modale>
    </>
  );
}
