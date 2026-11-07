"use client";

import { AlertTriangle, CheckCircle2, ChevronRight, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "./session";
import { Alerte, Bouton, Champ, Liste, Modale, Saisie } from "./ui";
import { api, useApi } from "@/lib/api";
import { CYCLES } from "@/lib/libelles";
import type { DemandeMutation } from "@/lib/types";

/**
 * Points à vérifier des demandes de mutation (06/11/2026) : un bandeau qui les compte et filtre la
 * liste d'un clic, puis une fenêtre qui les corrige une demande après l'autre, depuis la liste
 * (comme les erreurs de la base des recrutés). Un point vu sur le dossier papier peut être déclaré
 * « vérifié » : il ne revient plus.
 */
export function PointsAVerifier({ demandes, choisi, choisir }: { demandes: DemandeMutation[]; choisi: string; choisir: (a: string) => void }) {
  // Paramètre du DG (07/11/2026) : les demandes qui ont des points à vérifier attendent hors des notes
  const { donnees: params } = useApi<{ cle: string; valeur: string }[]>("/parametres");
  const horsNotes = params?.find((p) => p.cle === "MUTATION_NOTE_SANS_POINTS")?.valeur !== "NON";
  const compte = new Map<string, number>();
  for (const d of demandes) for (const a of d.anomalies) compte.set(a, (compte.get(a) ?? 0) + 1);
  const total = demandes.filter((d) => d.anomalies.length).length;
  const sansPoint = demandes.length - total;
  if (!total && !choisi) return null;
  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <AlertTriangle className="size-4 text-amber-700" aria-hidden />
        <strong className="text-amber-900">{total} demande(s) avec des points à vérifier</strong>
        <span className="text-amber-800">— cliquez un point pour ne voir que ces demandes, puis « Corriger » sur chaque ligne.</span>
        {horsNotes && (
          <span className="basis-full text-[12px] text-amber-800">
            Tant qu’elles ont des points à vérifier, ces demandes <strong>n’entrent pas dans les notes de service</strong>, même accordées : elles attendent hors de la note
            et la rejoignent d’elles-mêmes une fois corrigées (ou déclarées vérifiées sur le dossier papier).
          </span>
        )}
        {choisi && (
          <button type="button" onClick={() => choisir("")} className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-700 ring-1 ring-zinc-200">
            <X className="size-3.5" aria-hidden /> Retirer le filtre
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {/* Les demandes sans aucun problème : à cocher toutes pour l'avis favorable, puis les notes */}
        <button
          type="button"
          onClick={() => choisir(choisi === "-" ? "" : "-")}
          title="Les demandes sans aucun point à vérifier : cochez-les toutes pour compléter le circuit favorablement"
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition ${choisi === "-" ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-emerald-800 ring-emerald-200 hover:ring-emerald-400"}`}
        >
          <CheckCircle2 className="size-3.5" aria-hidden /> Sans point à vérifier · {sansPoint}
        </button>
        <button
          type="button"
          onClick={() => choisir(choisi === "*" ? "" : "*")}
          className={`rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition ${choisi === "*" ? "bg-amber-600 text-white ring-amber-600" : "bg-white text-amber-900 ring-amber-200 hover:ring-amber-400"}`}
        >
          Tous les points · {total}
        </button>
        {[...compte.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([a, n]) => (
            <button
              key={a}
              type="button"
              onClick={() => choisir(choisi === a ? "" : a)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition ${choisi === a ? "bg-amber-600 text-white ring-amber-600" : "bg-white text-amber-900 ring-amber-200 hover:ring-amber-400"}`}
            >
              {a} · {n}
            </button>
          ))}
      </div>
    </div>
  );
}

/** Ce qu'il faut remplir pour chaque point. */
type Genre = "matricule" | "grade" | "cycle" | "origine" | "sollicite" | "acte" | "permutant" | "anciennete" | "fiche";
function genre(a: string): Genre {
  if (a.startsWith("Matricule")) return "matricule";
  if (a.startsWith("Grade")) return "grade";
  if (a.startsWith("Cycle")) return "cycle";
  if (a.startsWith("Département d'origine")) return "origine";
  if (a.startsWith("Département sollicité")) return "sollicite";
  if (a.startsWith("Acte de mariage")) return "acte";
  if (a.startsWith("Agent permutant")) return "permutant";
  if (a.startsWith("Ancienneté")) return "anciennete";
  return "fiche";
}

/**
 * Corriger les points d'une demande : un champ par point, ou « vérifié sur le dossier papier ».
 * « Enregistrer et passer à la suivante » enchaîne les demandes de la liste affichée.
 */
export function CorrigerPoints({
  demande,
  toutes,
  suivante,
  fermer,
  apres,
}: {
  demande: DemandeMutation;
  /** Toutes les demandes chargées (pour choisir l'agent permutant). */
  toutes: DemandeMutation[];
  /** La demande suivante à corriger (liste affichée), s'il y en a une. */
  suivante: DemandeMutation | null;
  fermer: () => void;
  apres: (texte: string, ensuite: DemandeMutation | null) => void;
}) {
  const { refs } = useSession();
  const d = demande;
  const [v, setV] = useState<Record<string, string>>({});
  const [verifies, setVerifies] = useState<string[]>([]);
  const [finaliste, setFinaliste] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const maj = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const basculer = (a: string) => setVerifies((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]));
  const permutants = toutes.filter((x) => x.motif === "PERMUTATION" && x.id !== d.id);

  async function enregistrer(passer: boolean) {
    const corps: Record<string, unknown> = {};
    if (v.matricule?.trim()) corps.matricule = v.matricule.trim();
    if (finaliste) corps.typeAgent = "FINALISTE";
    if (v.grade?.trim()) corps.grade = v.grade.trim();
    if (v.cycle) corps.cycle = v.cycle;
    if (v.origine) corps.departementOrigineId = Number(v.origine);
    if (v.sollicite) corps.departementSolliciteId = Number(v.sollicite);
    if (v.acte?.trim()) corps.justificatif = v.acte.trim();
    if (v.permutant) corps.permutationAvecId = v.permutant;
    if (v.anciennete && Number(v.anciennete) > 0) corps.dureeMois = Math.round(Number(v.anciennete) * 12);
    if (verifies.length) corps.verifiees = verifies;
    if (!Object.keys(corps).length) {
      setErreur("Remplissez au moins un champ, ou cochez un point comme vérifié.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.patch<{ anomalies: string[] }>(`/mutations/${d.id}/anomalies`, corps);
      apres(
        r.anomalies.length ? `${d.nomComplet} : ${r.anomalies.length} point(s) restent (${r.anomalies.join(" ; ")}).` : `${d.nomComplet} : plus aucun point à vérifier.`,
        passer ? suivante : null,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const deps = refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }));
  return (
    <Modale titre={`Corriger : ${d.nomComplet}`} ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">
          Demande n° {d.numeroEnregistrement} · {refs.motifs.find((m) => m.code === d.motif)?.libelle ?? d.motif} · {d.departementOrigine?.nom ?? "?"} →{" "}
          {d.departementSollicite?.nom ?? "?"}. Corrigez ce que vous savez ; un point vu sur le dossier papier peut être coché « vérifié ».
        </p>
        <ul className="space-y-3">
          {d.anomalies.map((a) => {
            const g = genre(a);
            const ok = verifies.includes(a);
            return (
              <li key={a} className={`rounded-2xl p-3 ring-1 ${ok ? "bg-marque-50 ring-marque-200" : "bg-white ring-zinc-200"}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-600" aria-hidden />
                  <span className="font-semibold text-encre">{a}</span>
                  <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[12px] text-zinc-600">
                    <input type="checkbox" className="size-4 accent-marque-600" checked={ok} onChange={() => basculer(a)} />
                    Vérifié sur le dossier papier (ne plus signaler)
                  </label>
                </div>
                {!ok && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g === "matricule" && (
                      <>
                        <Champ libelle="Matricule solde">
                          <Saisie value={v.matricule ?? ""} onChange={maj("matricule")} placeholder="Ex. 123456 A" />
                        </Champ>
                        <label className="flex items-center gap-2 self-end pb-2 text-[12px]">
                          <input type="checkbox" className="size-4 accent-marque-600" checked={finaliste} onChange={(e) => setFinaliste(e.target.checked)} />
                          C’est un finaliste (pas encore de matricule)
                        </label>
                      </>
                    )}
                    {g === "grade" && (
                      <Champ libelle="Grade et échelon" aide="Comme dans le registre : « IE 3 », « PCEG 2 »…">
                        <Saisie value={v.grade ?? ""} onChange={maj("grade")} />
                      </Champ>
                    )}
                    {g === "cycle" && (
                      <Champ libelle="Cycle">
                        <Liste value={v.cycle ?? ""} onChange={maj("cycle")} vide="Choisir…" options={Object.entries(CYCLES).map(([k, l]) => ({ valeur: k, libelle: l }))} />
                      </Champ>
                    )}
                    {g === "origine" && (
                      <Champ libelle="Département d’origine">
                        <Liste value={v.origine ?? ""} onChange={maj("origine")} vide="Choisir…" options={deps} />
                      </Champ>
                    )}
                    {g === "sollicite" && (
                      <Champ libelle="Département sollicité" aide={a.includes("identique") ? "Le même que l’origine : changez-le, ou cochez « vérifié » si c’est voulu." : undefined}>
                        <Liste value={v.sollicite ?? ""} onChange={maj("sollicite")} vide="Choisir…" options={deps} />
                      </Champ>
                    )}
                    {g === "acte" && (
                      <>
                        <Champ libelle="Référence de l’acte de mariage">
                          <Saisie value={v.acte ?? ""} onChange={maj("acte")} placeholder="Acte n° …" />
                        </Champ>
                        <Link href={`/mutation/${d.id}`} target="_blank" className="flex items-center gap-1.5 self-end pb-2 text-[12px] font-medium text-marque-700 hover:underline">
                          <Paperclip className="size-3.5" aria-hidden /> ou joindre le scan dans la fiche
                        </Link>
                      </>
                    )}
                    {g === "permutant" && (
                      <Champ libelle="Agent avec qui il permute" aide="Les autres demandes de permutation enregistrées.">
                        <Liste value={v.permutant ?? ""} onChange={maj("permutant")} vide="Choisir…" options={permutants.map((p) => ({ valeur: p.id, libelle: `${p.nomComplet} · n° ${p.numeroEnregistrement}` }))} />
                      </Champ>
                    )}
                    {g === "anciennete" && (
                      <Champ libelle="Années dans le poste" aide="Au moins 5 ans pour une mutation pour ancienneté.">
                        <Saisie type="number" min={0} step={0.5} value={v.anciennete ?? ""} onChange={maj("anciennete")} />
                      </Champ>
                    )}
                    {g === "fiche" && (
                      <Link href={`/mutation/${d.id}`} target="_blank" className="text-[12px] font-medium text-marque-700 hover:underline">
                        Se corrige dans la fiche de la demande (« Modifier ») →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          <span className="text-[12px] text-zinc-500">{suivante ? `Suivante : ${suivante.nomComplet}` : "C’est la dernière de la liste affichée."}</span>
          <span className="flex flex-wrap gap-2">
            <Bouton onClick={fermer}>Fermer</Bouton>
            <Bouton chargement={envoi} onClick={() => enregistrer(false)}>
              <CheckCircle2 className="size-4" aria-hidden /> Enregistrer
            </Bouton>
            {suivante && (
              <Bouton variante="principal" chargement={envoi} onClick={() => enregistrer(true)}>
                Enregistrer et passer à la suivante <ChevronRight className="size-4" aria-hidden />
              </Bouton>
            )}
          </span>
        </div>
      </div>
    </Modale>
  );
}

// « Compléter depuis la base du personnel » : voir completer-personnel.tsx (onglets, 07/11/2026)
export { CompleterPersonnel } from "./completer-personnel";
