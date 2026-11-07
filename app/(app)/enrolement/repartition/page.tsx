"use client";

import { CheckCircle2, Download, Loader2, MapPin, Sparkles, Trash2, Users } from "lucide-react";
import { Suspense, useState } from "react";
import { SelecteurCampagne, useCampagne } from "@/components/enrolement/commun";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Chargement, EnTete, Modale, Saisie, Segments } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/**
 * Répartition des retenus par département (commission, réunion DG du 06/11/2026) :
 * 1. on fixe les places par département, croisées avec un critère au choix (cycle, diplôme, spécialité) ;
 * 2. on place les candidats sur un brouillon (ceux qui ont demandé le département d'abord) ;
 * 3. le DG valide : chaque candidat placé reçoit son département retenu. Les autres restent de côté.
 */

interface Case {
  valeur: string;
  quota: number;
  places: number;
  demandeurs: number;
  premierChoix: number;
}
interface Grille {
  campagne: { id: number; annee: number; anneeScolaire: string };
  critere: string;
  criteres: Record<string, string>;
  colonnes: string[];
  grille: { departementId: number; departement: string; cases: Case[] }[];
  parColonne: { valeur: string; candidats: number; places: number; quota: number }[];
  candidats: number;
  places: number;
  nonPlaces: number;
  dejaUnDepartement: number;
  modifiePar: string | null;
  valideePar: string | null;
  valideeLe: string | null;
}
interface Candidat {
  id: string;
  nom: string;
  diplome: string;
  specialite: string | null;
  promotion: string | null;
  cycle: string | null;
  rang: number | null;
  souhaits: string[];
  placeA: number | null;
  placeANom: string | null;
}

const nf = new Intl.NumberFormat("fr-FR");

function Repartition() {
  const { profil } = useSession();
  const { liste, campagne, choisir } = useCampagne();
  const [critere, setCritere] = useState<string | null>(null);
  const g = useApi<Grille>(campagne ? `/enrolement/repartition${qs({ campagne: campagne.id, critere: critere ?? "" })}` : null);
  const [ouverte, setOuverte] = useState<{ departementId: number; departement: string; valeur: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState<"valider" | "vider" | null>(null);
  const [occupe, setOccupe] = useState(false);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  const d = g.donnees;
  const dg = profil.role === "DG";
  const quotaTotal = d?.parColonne.reduce((t, c) => t + c.quota, 0) ?? 0;
  // Changement de critère en cours : l'ancienne grille reste visible, grisée, avec un bandeau
  const calcul = !!d && (g.chargement || (critere !== null && critere !== d.critere));

  async function action(chemin: string, texte: (r: Record<string, number>) => string) {
    if (!campagne) return;
    setOccupe(true);
    setErreur(null);
    try {
      const r = await api.post<Record<string, number>>(chemin, { campagne: campagne.id });
      setMessage(texte(r));
      setConfirmer(null);
      g.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  async function fixer(departementId: number, valeur: string, places: number) {
    if (!campagne) return;
    try {
      await api.put("/enrolement/repartition/quota", { campagne: campagne.id, departement: departementId, valeur, places });
      g.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <EnTete
        titre="Répartition par département"
        sousTitre="La commission fixe les places de chaque département, puis place les retenus sur un brouillon. Rien ne change dans la base tant que le DG n’a pas validé : alors chacun reçoit son département retenu et peut entrer dans les notes."
        actions={
          campagne &&
          d && (
            <>
              <Bouton onClick={() => api.telecharger(`/enrolement/repartition/excel${qs({ campagne: campagne.id })}`, `Répartition ${d.campagne.anneeScolaire}.xlsx`).catch((e: Error) => setErreur(e.message))}>
                <Download className="size-4" aria-hidden /> Excel
                <Aide>Les places et le brouillon (une ligne par candidat, avec ses trois choix), pour travailler aussi sur papier en salle.</Aide>
              </Bouton>
            </>
          )
        }
      />
      <SelecteurCampagne liste={liste} campagne={campagne} choisir={choisir} />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {g.erreur && <Alerte>{g.erreur}</Alerte>}
      {campagne && !d && !g.erreur && <Chargement />}
      {d && (
        <>
          {/* Les trois étapes, et où on en est */}
          <div className="grid gap-3 md:grid-cols-3">
            <Etape
              n={1}
              titre="Fixer les places"
              fait={quotaTotal > 0}
              texte={quotaTotal ? `${nf.format(quotaTotal)} place(s) fixée(s). Vous pouvez en changer à tout moment.` : "Dans le tableau ci-dessous, tapez le nombre de places de chaque case (puis Entrée, ou cliquez ailleurs)."}
            />
            <Etape
              n={2}
              titre="Placer les candidats"
              fait={d.places > 0}
              texte={`${nf.format(d.places)} placé(s) sur ${nf.format(d.candidats)} retenus · ${nf.format(d.nonPlaces)} pas encore placé(s). « Placer → » dans une case pour choisir les noms.`}
            >
              <Bouton disabled={!quotaTotal || occupe} onClick={() => action("/enrolement/repartition/proposer", (r) => `${nf.format(r.ajoutes ?? 0)} candidat(s) proposé(s) dans le brouillon. Vérifiez et changez ce qu’il faut.`)}>
                <Sparkles className="size-4" aria-hidden /> Proposer selon les choix
                <Aide>Une aide, pas une décision : chaque case encore incomplète reçoit ceux qui ont demandé ce département en 1er choix, puis en 2e, puis en 3e (la promotion la plus ancienne d’abord). Tout reste modifiable.</Aide>
              </Bouton>
              {d.places > 0 && (
                <Bouton variante="discret" disabled={occupe} onClick={() => setConfirmer("vider")}>
                  <Trash2 className="size-4" aria-hidden /> Vider le brouillon
                </Bouton>
              )}
              {!quotaTotal && <Raison>« Proposer » s’active dès que des places sont fixées (étape 1).</Raison>}
            </Etape>
            <Etape
              n={3}
              titre="Le DG valide"
              fait={!!d.valideeLe}
              texte={
                d.valideeLe
                  ? `Validée le ${new Date(d.valideeLe).toLocaleDateString("fr-FR")}${d.valideePar ? ` par ${d.valideePar}` : ""}. On peut encore changer le brouillon et valider de nouveau.`
                  : "Chaque candidat placé reçoit alors son département retenu et peut entrer dans les notes."
              }
            >
              {dg ? (
                <>
                  <Bouton variante="principal" disabled={!d.places || occupe} onClick={() => setConfirmer("valider")}>
                    <CheckCircle2 className="size-4" aria-hidden /> Valider la répartition
                  </Bouton>
                  {!d.places && <Raison>Le bouton s’active dès qu’au moins un candidat est placé (étape 2).</Raison>}
                </>
              ) : (
                <Raison>Seul le DG valide : le bouton « Valider la répartition » apparaît ici sur son compte. En attendant, rien ne change dans la base.</Raison>
              )}
            </Etape>
          </div>

          <Carte
            titre={
              <span className="inline-flex items-center gap-2">
                Places par département
                <Aide>Dans chaque case : les places (à taper), les candidats placés dans le brouillon, et ceux qui ont demandé ce département. Cliquez « Placer » pour choisir les noms.</Aide>
              </span>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
                Croiser le département avec :
                <Segments valeur={critere ?? d.critere} changer={(c) => setCritere(c)} options={Object.entries(d.criteres).map(([valeur, libelle]) => ({ valeur, libelle }))} />
              </div>
            }
          >
            {calcul && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-marque-50 px-3 py-2 text-[13px] font-medium text-marque-900 ring-1 ring-marque-200">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Calcul de la grille par {(d.criteres[critere ?? d.critere] ?? "").toLowerCase()}… ({nf.format(d.candidats)} candidats à classer, quelques secondes)
              </div>
            )}
            {!d.candidats ? (
              <Alerte ton="jaune">Aucun retenu à répartir dans cette campagne (les retenus déjà dans une note ne sont plus ici).</Alerte>
            ) : (
              <div className={`overflow-x-auto rounded-xl ring-1 ring-zinc-200 transition-opacity ${calcul ? "pointer-events-none opacity-40" : ""}`}>
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-600">
                      <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-medium">Département</th>
                      {d.colonnes.map((c) => (
                        <th key={c} className="min-w-[150px] border-l border-zinc-200 px-3 py-2 text-left font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.grille.map((l) => (
                      <tr key={l.departementId} className="border-t border-zinc-100 align-top">
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-zinc-900">{l.departement}</td>
                        {l.cases.map((x) => (
                          <CaseGrille
                            key={x.valeur}
                            c={x}
                            fixer={(n) => fixer(l.departementId, x.valeur, n)}
                            ouvrir={() => setOuverte({ departementId: l.departementId, departement: l.departement, valeur: x.valeur })}
                          />
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold text-zinc-800">
                      <td className="sticky left-0 z-10 bg-zinc-50 px-3 py-2">Total</td>
                      {d.parColonne.map((c) => (
                        <td key={c.valeur} className="border-l border-zinc-200 px-3 py-2 text-[12px]">
                          <div>{nf.format(c.quota)} place(s)</div>
                          <div className="font-normal text-zinc-500">
                            {nf.format(c.places)} placé(s) · {nf.format(c.candidats)} retenus
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Carte>
        </>
      )}
      {ouverte && campagne && d && (
        <FenetreCase
          campagne={campagne.id}
          ouverte={ouverte}
          critere={d.criteres[d.critere]}
          fermer={() => setOuverte(null)}
          apres={() => g.recharger()}
        />
      )}
      {confirmer && d && (
        <Modale titre={confirmer === "valider" ? "Valider la répartition" : "Vider le brouillon"} ouverte fermer={() => setConfirmer(null)}>
          <p className="text-[13px] leading-relaxed text-zinc-700">
            {confirmer === "valider" ? (
              <>
                Les <strong>{nf.format(d.places)}</strong> candidats placés reçoivent leur département retenu. Les <strong>{nf.format(d.nonPlaces)}</strong> autres ne changent pas : sans
                département, ils n’entrent pas dans les notes.
              </>
            ) : (
              <>Tous les candidats placés retournent dans « pas encore placés ». Les places fixées restent.</>
            )}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Bouton onClick={() => setConfirmer(null)}>Annuler</Bouton>
            <Bouton
              variante="principal"
              disabled={occupe}
              onClick={() =>
                confirmer === "valider"
                  ? action("/enrolement/repartition/valider", (r) => `Répartition validée : ${nf.format(r.candidats ?? 0)} candidat(s) dans ${nf.format(r.departements ?? 0)} département(s).`)
                  : action("/enrolement/repartition/vider", () => "Le brouillon est vidé.")
              }
            >
              {confirmer === "valider" ? "Valider" : "Vider"}
            </Bouton>
          </div>
        </Modale>
      )}
    </div>
  );
}

function Etape({ n, titre, texte, fait, children }: { n: number; titre: string; texte: string; fait: boolean; children?: React.ReactNode }) {
  return (
    <div className={`flex gap-3 rounded-2xl px-4 py-3 ring-1 ${fait ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-zinc-200"}`}>
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${fait ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
        {fait ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-zinc-900">{titre}</div>
        <div className="text-[12px] text-zinc-600">{texte}</div>
        {children && <div className="mt-2.5 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

/** Pourquoi un bouton est grisé, ou qui doit agir. */
function Raison({ children }: { children: React.ReactNode }) {
  return <p className="w-full text-[11.5px] leading-snug text-zinc-500">{children}</p>;
}

/** Une case : les places (à taper), la jauge des placés, les demandeurs, et le bouton « Placer ». */
function CaseGrille({ c, fixer, ouvrir }: { c: Case; fixer: (n: number) => void; ouvrir: () => void }) {
  const [valeur, setValeur] = useState(c.quota ? String(c.quota) : "");
  const depasse = c.quota > 0 && c.places > c.quota;
  const complet = c.quota > 0 && c.places === c.quota;
  return (
    <td className="border-l border-zinc-100 px-3 py-2">
      <div className="flex items-center gap-2">
        <Saisie
          value={valeur}
          onChange={(e) => setValeur(e.target.value.replace(/\D/g, ""))}
          onBlur={(e) => {
            // La valeur de la case elle-même (pas l’état, qui peut avoir un temps de retard)
            const n = Number(e.target.value.replace(/\D/g, "") || 0);
            if (n !== c.quota) fixer(n);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="0"
          inputMode="numeric"
          className="!h-8 !w-16 !px-2 text-right"
          aria-label="Places"
        />
        <span className="text-[11.5px] text-zinc-400">places</span>
      </div>
      {c.quota > 0 && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-full ${depasse ? "bg-rouge-600" : complet ? "bg-emerald-500" : "bg-marque-500"}`} style={{ width: `${Math.min(100, (c.places / c.quota) * 100)}%` }} />
        </div>
      )}
      <button type="button" onClick={ouvrir} className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-[11.5px] hover:bg-marque-50">
        <span className={depasse ? "font-semibold text-rouge-600" : complet ? "font-semibold text-emerald-700" : "text-zinc-700"}>
          <Users className="mr-1 inline size-3.5" aria-hidden />
          {nf.format(c.places)}
          {c.quota ? ` / ${nf.format(c.quota)}` : ""} placé(s)
        </span>
        <span className="text-marque-700">Placer →</span>
      </button>
      <div className="px-1.5 text-[11px] text-zinc-400" title="Candidats qui ont demandé ce département (dont en 1er choix)">
        {c.demandeurs ? `${nf.format(c.demandeurs)} ${c.demandeurs > 1 ? "l’ont" : "l’a"} demandé (${nf.format(c.premierChoix)} en 1er choix)` : "Personne ne l’a demandé"}
      </div>
    </td>
  );
}

/** Les candidats d'une case : on les place ici, on les retire, ou on les déplace d'un autre département. */
function FenetreCase({
  campagne,
  ouverte,
  critere,
  fermer,
  apres,
}: {
  campagne: number;
  ouverte: { departementId: number; departement: string; valeur: string };
  critere: string;
  fermer: () => void;
  apres: () => void;
}) {
  const [tous, setTous] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [coches, setCoches] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const r = useApi<{ departement: string; valeur: string; quota: number; lignes: Candidat[] }>(
    `/enrolement/repartition/case${qs({ campagne, departement: ouverte.departementId, valeur: ouverte.valeur, tous: tous ? 1 : "" })}`,
  );
  const ici = r.donnees?.lignes.filter((x) => x.placeA === ouverte.departementId).length ?? 0;
  const quota = r.donnees?.quota ?? 0;
  const lignes = (r.donnees?.lignes ?? []).filter((x) => !recherche.trim() || x.nom.toLowerCase().includes(recherche.trim().toLowerCase()));

  async function placer(ids: string[], dep: number | null) {
    setErreur(null);
    try {
      await api.post("/enrolement/repartition/placer", { campagne, ids, departement: dep });
      setCoches([]);
      r.recharger();
      apres();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre={`${ouverte.departement}${critere && ouverte.valeur !== "Tous" ? ` · ${ouverte.valeur}` : ""}`} ouverte fermer={fermer} ecran>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ${quota && ici > quota ? "bg-rouge-100 text-rouge-600 ring-rouge-600/30" : quota && ici === quota ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-marque-50 text-marque-900 ring-marque-200"}`}>
          <MapPin className="mr-1 inline size-4" aria-hidden />
          {nf.format(ici)} placé(s){quota ? ` sur ${nf.format(quota)} place(s)` : " (places pas encore fixées)"}
        </span>
        {quota > 0 && ici > quota && <span className="text-[12px] font-medium text-rouge-600">Plus que les places : retirez-en {ici - quota}.</span>}
        <Saisie value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un nom" className="max-w-xs" />
        <label className="flex items-center gap-2 text-[12.5px] text-zinc-600">
          <input type="checkbox" className="size-4 accent-marque-600" checked={tous} onChange={(e) => setTous(e.target.checked)} />
          Voir aussi ceux qui n’ont pas demandé ce département
        </label>
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
      <div className="h-[56vh] overflow-auto rounded-xl ring-1 ring-zinc-200">
        {!r.donnees ? (
          <Chargement />
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-[12px] text-zinc-500">
              <tr>
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-marque-600"
                    checked={!!lignes.length && lignes.every((x) => coches.includes(x.id))}
                    onChange={(e) => setCoches(e.target.checked ? lignes.map((x) => x.id) : [])}
                    aria-label="Tout cocher"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Candidat</th>
                <th className="px-3 py-2 font-medium">Diplôme · spécialité · promotion</th>
                <th className="px-3 py-2 font-medium">Ses choix</th>
                <th className="px-3 py-2 text-right font-medium">Brouillon</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((x) => {
                const icic = x.placeA === ouverte.departementId;
                return (
                  <tr key={x.id} className={`border-t border-zinc-100 ${icic ? "bg-emerald-50/60" : ""}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" className="size-4 accent-marque-600" checked={coches.includes(x.id)} onChange={() => setCoches((c) => (c.includes(x.id) ? c.filter((y) => y !== x.id) : [...c, x.id]))} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{x.nom}</div>
                      {x.rang ? <Badge ton={x.rang === 1 ? "vert" : "bleu"}>{x.rang === 1 ? "1er choix" : `${x.rang}e choix`}</Badge> : <Badge ton="gris">pas demandé</Badge>}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{[x.diplome, x.specialite, x.promotion && `promotion ${x.promotion}`].filter(Boolean).join(" · ")}</td>
                    <td className="px-3 py-2 text-[12px] text-zinc-600">{x.souhaits.map((s, i) => `${i + 1}. ${s}`).join("  ") || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {icic ? (
                        <Bouton variante="discret" onClick={() => placer([x.id], null)}>Retirer</Bouton>
                      ) : x.placeA ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-[11.5px] text-zinc-500">placé à {x.placeANom}</span>
                          <Bouton onClick={() => placer([x.id], ouverte.departementId)}>Déplacer ici</Bouton>
                        </span>
                      ) : (
                        <Bouton variante="principal" onClick={() => placer([x.id], ouverte.departementId)}>Placer ici</Bouton>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!lignes.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                    {tous ? "Personne." : "Personne n’a demandé ce département. Cochez « Voir aussi ceux qui n’ont pas demandé ce département »."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-zinc-500">Ceux qui ont demandé ce département en 1er choix sont en haut, puis la promotion la plus ancienne.</span>
        <div className="flex gap-2">
          <Bouton disabled={!coches.length} onClick={() => placer(coches, null)}>Retirer les cochés</Bouton>
          <Bouton variante="principal" disabled={!coches.length} onClick={() => placer(coches, ouverte.departementId)}>
            Placer les {coches.length || ""} cochés ici
          </Bouton>
          <Bouton onClick={fermer}>Fermer</Bouton>
        </div>
      </div>
    </Modale>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Repartition />
    </Suspense>
  );
}
