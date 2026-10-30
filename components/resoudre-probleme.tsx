"use client";

import { libelleAnomalie, libelleLot } from "@/lib/libelles";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "./session";
import { Alerte, Bouton, Champ, cx, Liste, Modale, Saisie, SaisieDate } from "./ui";
import { api } from "@/lib/api";
import type { Affectation, Derive } from "@/lib/types";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

/** Ce que l'on corrige pour chaque problème d'une ligne d'affectation. */
type Genre =
  | "departement"
  | "naissance"
  | "diplome"
  | "grade"
  | "structure"
  | "etablissement"
  | "specialite"
  | "numero"
  | "signature"
  | "recommandation"
  | "anomalie";

function genre(p: string): Genre {
  if (p.startsWith("Département retenu")) return "departement";
  if (p.startsWith("Date de naissance illisible") || p.startsWith("Date de naissance improbable")) return "naissance";
  if (p.startsWith("Diplôme non reconnu") || p.startsWith("Type de note à définir")) return "diplome";
  if (p.startsWith("Grade non défini")) return "grade";
  if (p.startsWith("Structure manquante")) return "structure";
  if (p.startsWith("Établissement manquant")) return "etablissement";
  if (p.startsWith("Spécialité non renseignée")) return "specialite";
  if (p.startsWith("Numéro du texte manquant")) return "numero";
  if (p.startsWith("Date de signature du texte manquante")) return "signature";
  if (p.startsWith("Recommandation en attente")) return "recommandation";
  return "anomalie";
}

/**
 * Fenêtre ouverte en cliquant sur un problème (rouge ou orange) : chaque problème
 * de la ligne avec le champ qui le règle. Le problème cliqué est mis en avant.
 */
export function ResoudreProbleme({
  aff,
  derive,
  focus,
  fermer,
  apres,
  anomalies,
}: {
  aff: Affectation;
  derive: Derive;
  /** Problème sur lequel on a cliqué. */
  focus?: string;
  fermer: () => void;
  apres: (texte: string) => void;
  /** Ouvre la correction des anomalies de la fiche (import Excel). */
  anomalies: () => void;
}) {
  const { refs } = useSession();
  const agent = aff.agent;
  const decret = agent.typeTexte === "DECRET";
  const lot = agent.lotPublication;
  const [v, setV] = useState({
    departementId: "",
    dateNaissance: "",
    statut: "",
    diplomeCode: "",
    structure: aff.structure ?? "",
    etablissement: aff.etablissement ?? "",
    specialite: aff.specialite ?? "",
    numeroTexte: "",
    signature: "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const diplomes = [...refs.regles].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));

  // Un seul bloc par genre (ex. « diplôme non reconnu » et « type de note à définir » se règlent ensemble)
  const problemes = [...derive.bloquants.map((p) => ({ p, grave: true })), ...derive.avertissements.map((p) => ({ p, grave: false }))];
  const vus = new Set<Genre>();
  // Point de la fiche qui redit un problème déjà affiché (corrigé par le même champ)
  const doublon = (p: string) =>
    (p.startsWith("Date de naissance") && problemes.some((x) => genre(x.p) === "naissance")) ||
    (p.startsWith("Département") && problemes.some((x) => genre(x.p) === "departement")) ||
    (p.startsWith("Diplôme") && problemes.some((x) => genre(x.p) === "diplome"));
  const blocs = problemes.filter(({ p }) => {
    const g = genre(p);
    if (g === "anomalie" && doublon(p)) return false;
    if (vus.has(g)) return false;
    vus.add(g);
    return true;
  });
  const focusGenre = focus ? genre(focus) : null;

  async function enregistrer() {
    const agentPatch: Record<string, unknown> = {};
    const affPatch: Record<string, unknown> = {};
    if (v.departementId) agentPatch.departementId = Number(v.departementId);
    if (v.dateNaissance) agentPatch.dateNaissance = v.dateNaissance;
    if (v.statut) agentPatch.contractuelForce = v.statut === "CONTRACTUEL";
    if (v.diplomeCode) agentPatch.diplomeCode = v.diplomeCode;
    if (v.numeroTexte.trim()) agentPatch.numeroTexte = v.numeroTexte.trim();
    for (const k of ["structure", "etablissement", "specialite"] as const)
      if (vus.has(k) && v[k].trim() !== (aff[k] ?? "")) affPatch[k] = v[k].trim() || null;
    const signature = v.signature && lot;
    if (!Object.keys(agentPatch).length && !Object.keys(affPatch).length && !signature) {
      setErreur("Remplissez au moins un des champs proposés.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      if (signature) await api.patch(`/lots/${lot!.id}`, { [decret ? "dateSignatureDecrets" : "dateSignatureArretes"]: v.signature });
      if (Object.keys(agentPatch).length) await api.patch(`/agents/${agent.id}`, agentPatch);
      if (Object.keys(affPatch).length) await api.patch(`/affectations/${aff.id}`, affPatch);
      apres(
        signature
          ? `Corrigé pour ${agent.nomComplet}. La date de signature vaut pour tout le lot « ${libelleLot(lot)} ».`
          : `Corrigé pour ${agent.nomComplet}.`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const maj = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  return (
    <Modale titre={`Régler le problème – ${agent.nomComplet}`} ouverte fermer={fermer} large>
      <p className="mb-4 text-[13px] text-zinc-500">Pour chaque problème, remplissez le champ proposé (vérifiez sur le dossier ou sur le texte de la FP).</p>
      <div className="space-y-3">
        {blocs.map(({ p, grave }) => {
          const g = genre(p);
          const enAvant = g === focusGenre;
          return (
            <section key={p} className={cx("rounded-2xl p-4", enAvant ? "bg-white ring-2 ring-marque-500" : "bg-zinc-50")}>
              <div className={cx("text-[13px] font-semibold", grave ? "text-rouge-600" : "text-or-700")}>{libelleAnomalie(p, { ...agent, quotaAutres: !!lot?.autres }).titre}</div>
              {libelleAnomalie(p, { ...agent, quotaAutres: !!lot?.autres }).detail && (
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">{libelleAnomalie(p, { ...agent, quotaAutres: !!lot?.autres }).detail}</p>
              )}
              <div className="mb-3" />

              {g === "departement" && (
                <Champ libelle="Département retenu" aide={agent.departementBrut ? `Écrit dans le fichier : « ${agent.departementBrut} »` : "Absent du dossier"}>
                  <Liste autoFocus={enAvant} className="max-w-72" value={v.departementId} onChange={maj("departementId")} vide="— Choisir —" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
                </Champ>
              )}

              {g === "naissance" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Champ libelle="Date de naissance exacte" aide={agent.dateNaissanceBrute ? `Écrit dans le fichier : « ${agent.dateNaissanceBrute} »` : agent.dateNaissance ? `Enregistrée : ${agent.dateNaissance.split("-").reverse().join("/")} (âge impossible)` : "Absente du fichier"}>
                    <Saisie autoFocus={enAvant} type="date" value={v.dateNaissance} onChange={maj("dateNaissance")} />
                  </Champ>
                  <Champ libelle="Ou : statut écrit sur le texte" aide="Si le texte de la FP dit « contractuel » ou « fonctionnaire »">
                    <Liste
                      value={v.statut}
                      onChange={maj("statut")}
                      vide="— Non précisé —"
                      options={[
                        { valeur: "FONCTIONNAIRE", libelle: "Fonctionnaire" },
                        { valeur: "CONTRACTUEL", libelle: "Contractuel" },
                      ]}
                    />
                  </Champ>
                </div>
              )}

              {g === "diplome" && (
                <>
                  <Champ libelle="Diplôme" aide={`Écrit dans le fichier : « ${agent.diplomeBrut ?? "—"} »`}>
                    <Liste autoFocus={enAvant} className="max-w-80" value={v.diplomeCode} onChange={maj("diplomeCode")} vide="— Choisir —" options={diplomes.map((r) => ({ valeur: r.code, libelle: r.libelle }))} />
                  </Champ>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Le diplôme décide du type de note. Il n’existe pas dans la liste ? Le DG peut l’ajouter dans{" "}
                    <Link href="/administration/regles" className="underline">
                      « Règles et grades »
                    </Link>
                    .
                  </p>
                </>
              )}

              {g === "grade" && (
                <p className="text-[13px] text-zinc-600">
                  Ce diplôme n’a pas encore de grade. Le DG le définit dans{" "}
                  <Link href="/administration/regles" className="font-semibold text-marque-700 underline">
                    « Règles et grades »
                  </Link>{" "}
                  : toutes les personnes de ce diplôme seront réglées en une fois.
                </p>
              )}

              {(g === "structure" || g === "etablissement" || g === "specialite") && (
                <Champ
                  libelle={{ structure: "Structure (personnel administratif)", etablissement: "Établissement", specialite: "Spécialité" }[g]}
                  aide={{ structure: "Ex. DDEPPSA du département", etablissement: "Nom de l’établissement d’affectation", specialite: "Ex. Musique, Arts plastiques, Français…" }[g]}
                >
                  <SaisieReferentiel
                    className="max-w-96"
                    liste={g === "structure" ? "STRUCTURE" : g === "etablissement" ? "ETABLISSEMENT" : "MATIERE"}
                    valeur={v[g]}
                    changer={(x) => setV({ ...v, [g]: x })}
                  />
                </Champ>
              )}

              {g === "numero" && (
                <Champ libelle="N° du texte (arrêté ou décret)" aide="Recopiez le numéro écrit sur le texte de la FP">
                  <Saisie autoFocus={enAvant} className="max-w-56" value={v.numeroTexte} onChange={maj("numeroTexte")} />
                </Champ>
              )}

              {g === "signature" &&
                (lot ? (
                  <Champ
                    libelle={`Date de signature du lot « ${libelleLot(lot)} »`}
                    aide={`Écrite sur le texte. Elle vaut pour tous les ${decret ? "décrets" : "arrêtés"} du lot : toutes les personnes concernées seront réglées en une fois.`}
                  >
                    <SaisieDate autoFocus={enAvant} className="max-w-56" value={v.signature} onChange={(x) => setV({ ...v, signature: x })} aria-label="Date de signature du lot" />
                  </Champ>
                ) : (
                  <p className="text-[13px] text-zinc-600">Le texte de cette personne n’est rattaché à aucun lot : enregistrez-le dans « Réception des textes ».</p>
                ))}

              {g === "recommandation" && (
                <p className="text-[13px] text-zinc-600">
                  Une recommandation (changement de département ou de note) attend la décision du DG.{" "}
                  <Link href="/recommandations" className="inline-flex items-center gap-1 font-semibold text-marque-700 underline">
                    Voir les recommandations <ArrowRight className="size-3" />
                  </Link>
                </p>
              )}

              {g === "anomalie" && (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="flex-1 text-[13px] text-zinc-600">
                    Point relevé sur la fiche (import Excel). Il n’empêche pas la note, mais mérite d’être vérifié.
                    {problemes.filter((x) => genre(x.p) === "anomalie").length > 1 &&
                      ` ${problemes.filter((x) => genre(x.p) === "anomalie").length} points à voir sur cette fiche.`}
                  </p>
                  <Bouton onClick={anomalies}>Vérifier la fiche</Bouton>
                </div>
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
      <p className="mt-4 text-[12px] text-zinc-500">
        Une fois réglée, la personne entre automatiquement dans sa note « à soumettre au DG ». Un changement de département déjà choisi ou de note passe par une
        recommandation validée par le DG.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" chargement={envoi} onClick={enregistrer}>
          <CheckCircle2 /> Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}
