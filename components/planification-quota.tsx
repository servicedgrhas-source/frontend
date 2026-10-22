"use client";

import { Plus, Save, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Chargement, Progression, Saisie, Segments } from "@/components/ui";
import { api, useApi } from "@/lib/api";

interface Planification {
  perimetre: string;
  quotaRecu: { enveloppe: number | null; placesCatI: number | null; placesCatII: number | null; placesCatIII: number | null } | null;
  cycles: { cycle: string; libelle: string; categorie: string | null; diplome: string | null; indice: number | null; coutAnnuel: number }[];
  lignes: {
    id: number;
    nom: string;
    actif: boolean;
    commission: boolean;
    origines: { id: number; libelle: string }[];
    membres: number | null;
    placesMembres: number | null;
    places: Record<string, number>;
    utilisees: Record<string, number>;
    totalUtilisees: number;
    total: number;
    incidence: number;
  }[];
  originesSansBeneficiaire: { id: number; libelle: string }[];
  fichesSansBeneficiaire: { total: number; parOrigine: { origine: string; n: number }[] };
  fichesSansCycle: number;
  totaux: { places: number; parCycle: Record<string, number>; incidence: number; reste: number | null };
}

const nf = new Intl.NumberFormat("fr-FR");
const francs = (n: number) => `${nf.format(Math.round(n))} F`;

/**
 * Bénéficiaires du quota : le quota reçu de la FP (il ne change pas), puis le quota réajusté par
 * le DG, réparti par bénéficiaire et par cycle. Le contrôle porte sur la consommation.
 */
export function PlanificationQuota() {
  const perimetres = useApi<string[]>("/pilotage/perimetres");
  const [choix, setChoix] = useState<string | null>(null);
  const annees = (perimetres.donnees ?? []).filter((p) => p !== "AUTRES");
  const perimetre = choix ?? annees[0] ?? String(new Date().getFullYear());
  const plan = useApi<Planification>(`/pilotage/planification/${perimetre}`);
  // Saisie en cours : bénéficiaire → cycle → places
  const [saisie, setSaisie] = useState<{ cle: string; v: Record<number, Record<string, string>> } | null>(null);
  const [nouveau, setNouveau] = useState("");
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const d = plan.donnees;
  const cle = `${perimetre}|${d?.lignes.map((l) => l.id).join(",")}`;
  const valeurs = saisie && saisie.cle === cle ? saisie.v : Object.fromEntries((d?.lignes ?? []).map((l) => [l.id, Object.fromEntries(Object.entries(l.places).map(([c, n]) => [c, n ? String(n) : ""]))]));
  const nombre = (id: number, c: string) => Number(valeurs[id]?.[c] || 0);
  const incidenceDe = (id: number) => (d?.cycles ?? []).reduce((t, c) => t + nombre(id, c.cycle) * c.coutAnnuel, 0);
  const incidence = (d?.lignes ?? []).reduce((t, l) => t + incidenceDe(l.id), 0);
  const enveloppe = d?.quotaRecu?.enveloppe ?? null;
  const depasse = enveloppe ? incidence > enveloppe : false;
  const modifie = !!saisie && saisie.cle === cle;

  const changer = (id: number, c: string, v: string) =>
    setSaisie({ cle, v: { ...valeurs, [id]: { ...valeurs[id], [c]: v.replace(/\D/g, "").slice(0, 5) } } });

  async function ajouter() {
    try {
      await api.post("/pilotage/beneficiaires", { nom: nouveau });
      setNouveau("");
      plan.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function rattacher(origineId: number, beneficiaireId: number | null) {
    try {
      await api.put(`/pilotage/origines/${origineId}/beneficiaire`, { beneficiaireId });
      plan.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function enregistrer() {
    const lignes = (d?.lignes ?? []).flatMap((l) => (d?.cycles ?? []).map((c) => ({ beneficiaireId: l.id, cycle: c.cycle, places: nombre(l.id, c.cycle) })));
    try {
      await api.put(`/pilotage/planification/${perimetre}`, { lignes });
      setSaisie(null);
      setMessage({ ton: "vert", texte: "Quota réajusté enregistré." });
      plan.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  return (
    <div className="space-y-5">
      <Segments
        valeur={perimetre}
        changer={(p) => {
          setChoix(p);
          setSaisie(null);
        }}
        options={(annees.length ? annees : [perimetre]).map((p) => ({ valeur: p, libelle: `Quota ${p}` }))}
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>
      {plan.erreur && <Alerte>{plan.erreur}</Alerte>}
      {!d ? (
        <Chargement />
      ) : (
        <>
          <Carte
            titre={
              <span className="flex items-center gap-1.5">
                1. Quota reçu de la Fonction Publique
                <Aide>Tel que la FP l’a envoyé : il ne change pas. Il se saisit dans l’onglet « Incidences et enveloppe ».</Aide>
              </span>
            }
          >
            {!d.quotaRecu ? (
              <Alerte ton="jaune">Aucune enveloppe saisie pour le quota {perimetre} : saisissez-la dans « Incidences et enveloppe ».</Alerte>
            ) : (
              <div className="grid gap-3 text-center md:grid-cols-4">
                {[
                  ["Enveloppe annuelle", d.quotaRecu.enveloppe ? francs(d.quotaRecu.enveloppe) : "—"],
                  ["Places catégorie I", d.quotaRecu.placesCatI ?? "—"],
                  ["Places catégorie II", d.quotaRecu.placesCatII ?? "—"],
                  ["Places catégorie III", d.quotaRecu.placesCatIII ?? "—"],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-2xl bg-zinc-50 py-3">
                    <div className="text-lg font-semibold tabular-nums">{typeof v === "number" ? nf.format(v) : v}</div>
                    <div className="text-[11px] text-zinc-500">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </Carte>

          <Carte
            titre={
              <span className="flex items-center gap-1.5">
                2. Quota réajusté : places par bénéficiaire et par cycle
                <Aide>
                  Le DG répartit les places entre les bénéficiaires (ministre, syndicats, commission, directions…), cycle par cycle. Ce qui compte est la{" "}
                  <strong>consommation</strong> : on peut prendre 2 licences au lieu de 3 BAC, tant que l’enveloppe tient. Le coût d’une place est celui du diplôme
                  le plus recruté dans le cycle.
                </Aide>
              </span>
            }
            actions={
              <Bouton variante="principal" disabled={!modifie || depasse} onClick={enregistrer}>
                <Save /> Enregistrer
              </Bouton>
            }
          >
            <p className="mb-3 text-[12px] leading-relaxed text-zinc-600">
              <strong>Comment c’est relié :</strong> chaque <strong>origine</strong> des dossiers est rattachée à un bénéficiaire (ex. « CSECC » → Syndicats). À la
              saisie d’un candidat, l’origine choisie compte une place pour son bénéficiaire, dans le cycle du diplôme ; un dossier apporté par un{" "}
              <strong>membre de la commission</strong> compte pour la commission, qui partage ses places entre ses membres. Sous chaque case :{" "}
              <strong>places utilisées</strong> par les fiches déjà saisies (en rouge si elles dépassent).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] text-zinc-500">
                    <th className="py-2 pr-2">Bénéficiaire</th>
                    {d.cycles.map((c) => (
                      <th key={c.cycle} className="px-1 py-2 text-center">
                        <div className="font-semibold text-zinc-700">{c.libelle}</div>
                        <div>
                          {c.categorie ?? "?"} · {c.coutAnnuel ? `${francs(c.coutAnnuel)}/an` : "indice ?"}
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right">Places prévues / utilisées</th>
                    <th className="px-2 py-2 text-right">Consommation</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.lignes.map((l) => (
                    <tr key={l.id} className="border-t border-zinc-100">
                      <td className="max-w-72 py-2 pr-2 align-top">
                        <div className="flex items-center gap-1.5 font-medium">
                          {l.nom}
                          {l.commission && <Badge ton="bleu">Commission</Badge>}
                        </div>
                        {l.commission ? (
                          <Link href="/commission" className="mt-1 flex items-center gap-1 text-[11px] text-marque-700 hover:underline">
                            <Users className="size-3" /> {l.membres ?? 0} membre(s) · {nf.format(l.placesMembres ?? 0)} place(s) données aux membres
                            {l.total ? ` sur ${nf.format(l.total)}` : ""}
                          </Link>
                        ) : (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {l.origines.map((o) => (
                              <span key={o.id} className="inline-flex items-center gap-0.5 rounded-lg bg-zinc-100 py-0.5 pr-0.5 pl-2 text-[11px]">
                                {o.libelle}
                                <button type="button" title="Détacher cette origine" className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-rouge-600" onClick={() => rattacher(o.id, null)}>
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))}
                            {d.originesSansBeneficiaire.length > 0 && (
                              <select
                                className="rounded-lg bg-white px-1.5 py-0.5 text-[11px] text-marque-700 ring-1 ring-zinc-200"
                                value=""
                                onChange={(e) => e.target.value && rattacher(Number(e.target.value), l.id)}
                                aria-label={`Rattacher une origine à ${l.nom}`}
                              >
                                <option value="">+ origine…</option>
                                {d.originesSansBeneficiaire.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.libelle}
                                  </option>
                                ))}
                              </select>
                            )}
                            {!l.origines.length && !d.originesSansBeneficiaire.length && <span className="text-[11px] text-zinc-400">aucune origine</span>}
                          </div>
                        )}
                      </td>
                      {d.cycles.map((c) => (
                        <td key={c.cycle} className="px-1 py-1.5 align-top">
                          <Saisie inputMode="numeric" className="w-full text-center" value={valeurs[l.id]?.[c.cycle] ?? ""} onChange={(e) => changer(l.id, c.cycle, e.target.value)} placeholder="0" />
                          {(() => {
                            const u = l.utilisees[c.cycle] ?? 0;
                            const prevu = nombre(l.id, c.cycle);
                            if (!u && !prevu) return null;
                            const ton = u > prevu ? "font-semibold text-rouge-600" : u === prevu ? "text-or-700" : "text-zinc-500";
                            return (
                              <div className={`mt-0.5 text-center text-[11px] ${ton}`} title="Fiches déjà saisies pour ce bénéficiaire dans ce cycle">
                                {u} utilisée(s){u > prevu ? ` · +${u - prevu}` : ""}
                              </div>
                            );
                          })()}
                        </td>
                      ))}
                      <td className={`px-2 text-right tabular-nums ${l.totalUtilisees > d.cycles.reduce((t, c) => t + nombre(l.id, c.cycle), 0) ? "font-semibold text-rouge-600" : ""}`}>
                        {nf.format(d.cycles.reduce((t, c) => t + nombre(l.id, c.cycle), 0))} / {nf.format(l.totalUtilisees)}
                      </td>
                      <td className="px-2 text-right tabular-nums">{francs(incidenceDe(l.id))}</td>
                      <td>
                        {!l.commission && (
                        <BoutonIcone
                          libelle="Retirer ce bénéficiaire"
                          ton="rouge"
                          onClick={async () => {
                            try {
                              await api.delete(`/pilotage/beneficiaires/${l.id}`);
                              plan.recharger();
                            } catch (e) {
                              setMessage({ ton: "rouge", texte: (e as Error).message });
                            }
                          }}
                        >
                          <Trash2 />
                        </BoutonIcone>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-zinc-300 font-semibold">
                    <td className="py-2">Total</td>
                    {d.cycles.map((c) => (
                      <td key={c.cycle} className="px-1 text-center tabular-nums">
                        {nf.format(d.lignes.reduce((t, l) => t + nombre(l.id, c.cycle), 0))}
                      </td>
                    ))}
                    <td className="px-2 text-right tabular-nums">{nf.format(d.lignes.reduce((t, l) => t + d.cycles.reduce((x, c) => x + nombre(l.id, c.cycle), 0), 0))}</td>
                    <td className={`px-2 text-right tabular-nums ${depasse ? "text-rouge-600" : ""}`}>{francs(incidence)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            {d.fichesSansBeneficiaire.total > 0 && (
              <Alerte ton="jaune">
                <strong>{nf.format(d.fichesSansBeneficiaire.total)} fiche(s) du quota {perimetre} ne comptent pour aucun bénéficiaire</strong> : leur origine n’est
                rattachée à personne, ou n’est pas dans la liste des origines. Rattachez les origines ci-dessus (« + origine… ») ; une origine écrite à la main
                (« Autre ») s’ajoute d’abord dans « Administration › Origines des dossiers ».
                <div className="mt-1 text-[12px]">
                  {d.fichesSansBeneficiaire.parOrigine.map((x) => `${x.origine} (${x.n})`).join(" · ")}
                </div>
              </Alerte>
            )}
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (nouveau.trim()) void ajouter();
              }}
            >
              <Saisie className="min-w-64 flex-1" value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="Nouveau bénéficiaire (ex. Ministre, Syndicats, Commission…)" />
              <Bouton disabled={!nouveau.trim()}>
                <Plus /> Ajouter un bénéficiaire
              </Bouton>
            </form>
            {enveloppe ? (
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className={depasse ? "font-semibold text-rouge-600" : "text-zinc-600"}>
                    {depasse ? `Dépassement de ${francs(incidence - enveloppe)} : retirez ou échangez des places` : `Reste dans l’enveloppe : ${francs(enveloppe - incidence)}`}
                  </span>
                  <span className="tabular-nums">{Math.round((100 * incidence) / enveloppe)} %</span>
                </div>
                <Progression valeur={Math.min(100, (100 * incidence) / enveloppe)} ton={depasse ? "rouge" : "vert"} />
              </div>
            ) : null}
          </Carte>
        </>
      )}
    </div>
  );
}
