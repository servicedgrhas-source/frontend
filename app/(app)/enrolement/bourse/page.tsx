"use client";

import { CheckCircle2, Download, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { categoriesDe, FicheVolontaire, deMois, fcfa, LISTES, moisFr, nf, peutGerer, type Population, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Chiffre, ChoixMois, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, Zone, useConfirmation } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Anomalie {
  code: string;
  gravite: "BLOQUANT" | "SIGNALE";
  volontaireId: string;
  nomComplet: string;
  message: string;
}

interface Etat {
  id: number;
  mois: string;
  statut: "BROUILLON" | "VALIDE";
  effectif: number;
  total: string;
  anomalies: Anomalie[];
  preparePar: string | null;
  calculeLe: string | null;
  validePar: string | null;
  valideLe: string | null;
}

interface Detail {
  etat: Etat;
  lignes: { id: number; volontaireId: string; nomComplet: string; categorie: string | null; departementId: number | null; etablissement: string | null; vague: string | null; montant: number; mois: number; total: number; observation: string | null }[];
  total: number;
  page: number;
  taille: number;
  resume: { departementId: number | null; categorie: string | null; effectif: number; total: string; rappels: number }[];
  controles: Record<string, { libelle: string; gravite: "BLOQUANT" | "SIGNALE" }>;
}

const moisCourant = () => new Date().toISOString().slice(0, 7);

/** Bourse mensuelle : préparée depuis le registre, contrôlée, validée par le DG, puis éditée en Excel. */
export default function BourseMensuelle() {
  const { profil, refs } = useSession();
  const config = useConfigEnrolement();
  const [population, setPopulation] = useState<Population>("VOLONTAIRE");
  const L = LISTES[population];
  const etats = useApi<Etat[]>(`/enrolement/bourse?population=${population}`);
  const registre = useApi<{ resume: { enAttente: number; sansCategorie: number; sansDepartement: number } }>(`/enrolement/volontaires?taille=1&population=${population}`);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [mois, setMois] = useState(moisCourant());
  const [vue, setVue] = useState<"controles" | "resume" | "liste">("controles");
  const [code, setCode] = useState("");
  const [recherche, setRecherche] = useState("");
  const [departement, setDepartement] = useState("");
  const [page, setPage] = useState(1);
  const [fiche, setFiche] = useState<{ id: string; controle?: string; modifiee?: boolean } | null>(null);
  const [rouvrir, setRouvrir] = useState(false);
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const id = choisi ?? etats.donnees?.[0]?.id ?? null;
  const detail = useApi<Detail>(id ? `/enrolement/bourse/${id}${qs({ recherche, departement, page, taille: 50 })}` : null);
  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const c = config.donnees?.configuration;
  const nomCat = (k: string | null) => categoriesDe(c, population).find((x) => x.code === k)?.libelle ?? k ?? "Sans catégorie";
  const nomDep = (d: number | null) => refs.departements.find((x) => x.id === d)?.nom ?? "Non renseigné";
  const gerer = peutGerer(profil.role);
  const dg = peut.valider(profil.role);
  const e = detail.donnees?.etat;
  const anomalies = e?.anomalies ?? [];
  const bloquants = anomalies.filter((a) => a.gravite === "BLOQUANT");
  const parCode = Object.entries(
    anomalies.reduce<Record<string, number>>((t, a) => ({ ...t, [a.code]: (t[a.code] ?? 0) + 1 }), {}),
  ).sort(([a], [b]) => (detail.donnees?.controles[a]?.gravite === "BLOQUANT" ? -1 : 1) - (detail.donnees?.controles[b]?.gravite === "BLOQUANT" ? -1 : 1));
  const visibles = anomalies.filter((a) => !code || a.code === code);

  async function agir(f: () => Promise<unknown>, ok: string) {
    setErreur(null);
    try {
      await f();
      setMessage(ok);
      etats.recharger();
      detail.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  /** `silencieux` : recalcul après la correction d'une fiche (pas d'annonce). */
  async function preparer(m: string, silencieux = false) {
    setErreur(null);
    try {
      const r = await api.post<Etat>("/enrolement/bourse", { mois: m, population });
      setChoisi(r.id);
      if (!silencieux) setMessage(`Paiement des ${L.des} ${deMois(m)} calculé : ${nf.format(r.effectif)} ${L.des}, ${fcfa(r.total)}.`);
      etats.recharger();
      detail.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  const pages = detail.donnees ? Math.max(1, Math.ceil(detail.donnees.total / detail.donnees.taille)) : 1;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Paiement mensuel"
        sousTitre="Chaque mois, deux états de paiement : la bourse des volontaires et la liste des communautaires, calculés à partir du registre et de la configuration (barèmes, début et fin). Les contrôles bloquants (doublons, payé sur les deux listes, salarié au bottin, catégorie, montant ou département manquant) doivent être réglés avant que le DG valide. Les mois non payés sont repris en rappel."
      />
      <Segments
        valeur={population}
        changer={(v) => {
          setPopulation(v);
          setChoisi(null);
          setPage(1);
          setCode("");
        }}
        options={[
          { valeur: "VOLONTAIRE", libelle: "Bourse des volontaires" },
          { valeur: "COMMUNAUTAIRE", libelle: "Paiement des communautaires" },
        ]}
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {population === "VOLONTAIRE" && !!registre.donnees?.resume.enAttente && (
        <Alerte ton="jaune">
          {nf.format(registre.donnees.resume.enAttente)} enrôlé(s) de notes signées ne sont pas encore dans le registre : ils ne seront pas payés. Intégrez-les d’abord dans{" "}
          <Link href="/enrolement/volontaires" className="font-medium underline">
            Volontaires en poste
          </Link>
          .
        </Alerte>
      )}

      <Carte titre={population === "VOLONTAIRE" ? "États de bourse" : "États de paiement des communautaires"}>
        {gerer && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Champ libelle="Mois à préparer">
              <ChoixMois value={mois} onChange={setMois} />
            </Champ>
            <Bouton variante="principal" disabled={!mois} onClick={() => preparer(mois)}>
              {population === "VOLONTAIRE" ? `Préparer la bourse ${deMois(mois)}` : `Préparer le paiement des communautaires ${deMois(mois)}`}
            </Bouton>
          </div>
        )}
        {!etats.donnees ? (
          <Chargement />
        ) : !etats.donnees.length ? (
          <Vide>Aucun état préparé. Vérifiez d’abord que la liste des {L.des} est à jour (Volontaires et communautaires en poste).</Vide>
        ) : (
          <div className="flex flex-wrap gap-2">
            {etats.donnees.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setChoisi(x.id);
                  setPage(1);
                  setCode("");
                }}
                className={`rounded-2xl px-4 py-2.5 text-left text-[13px] ring-1 transition ${x.id === id ? "bg-nuit text-white ring-nuit" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
              >
                <div className="font-medium first-letter:uppercase">{moisFr(x.mois)}</div>
                <div className={`text-[11px] ${x.id === id ? "text-zinc-300" : "text-zinc-400"}`}>
                  {x.statut === "VALIDE" ? "validé" : "projet"} · {fcfa(x.total)}
                </div>
              </button>
            ))}
          </div>
        )}
      </Carte>

      {id && detail.erreur && <Alerte>{detail.erreur}</Alerte>}
      {e && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Chiffre ton={e.statut === "VALIDE" ? "vert" : "jaune"} libelle="État" valeur={e.statut === "VALIDE" ? "Validé" : "Projet"} detail={e.statut === "VALIDE" ? `par ${e.validePar}` : `calculé par ${e.preparePar ?? "—"}`} />
            <Chiffre ton="bleu" libelle={`${L.titre} payés`} valeur={nf.format(e.effectif)} detail={moisFr(e.mois)} />
            <Chiffre ton="vert" libelle="Montant total" valeur={fcfa(e.total)} detail="bourses et rappels" />
            <Chiffre ton={bloquants.length ? "rouge" : "gris"} libelle="Contrôles bloquants" valeur={nf.format(bloquants.length)} detail={`${nf.format(anomalies.length - bloquants.length)} signalés`} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Bouton onClick={() => api.telecharger(`/enrolement/bourse/${e.id}/excel`, `Bourse ${e.mois}${e.statut === "VALIDE" ? "" : " (projet)"}.xlsx`)}>
              <Download /> État de paiement Excel
            </Bouton>
            {gerer && e.statut === "BROUILLON" && (
              <Bouton onClick={() => preparer(e.mois)}>
                <RefreshCw /> Recalculer
              </Bouton>
            )}
            {dg && e.statut === "BROUILLON" && (
              <Bouton variante="principal" disabled={bloquants.length > 0} title={bloquants.length ? "Réglez d’abord les contrôles bloquants" : undefined} onClick={() => agir(() => api.post(`/enrolement/bourse/${e.id}/validation`), `Bourse ${deMois(e.mois)} validée.`)}>
                <CheckCircle2 /> Valider
              </Bouton>
            )}
            {dg && e.statut === "VALIDE" && (
              <Bouton onClick={() => setRouvrir(true)}>
                <RotateCcw /> Rouvrir
              </Bouton>
            )}
            {gerer && e.statut === "BROUILLON" && (
              <Bouton
                variante="danger"
                onClick={async () => {
                  if (await demander(`Supprimer le projet de bourse ${deMois(e.mois)} ?`, "Supprimer"))
                    await agir(async () => {
                      await api.delete(`/enrolement/bourse/${e.id}`);
                      setChoisi(null);
                    }, "Projet supprimé.");
                }}
              >
                <Trash2 /> Supprimer
              </Bouton>
            )}
          </div>

          <Segments
            valeur={vue}
            changer={setVue}
            options={[
              { valeur: "controles", libelle: `Contrôles (${nf.format(anomalies.length)})` },
              { valeur: "resume", libelle: "Par département" },
              { valeur: "liste", libelle: "Liste des payés" },
            ]}
          />

          {vue === "controles" && (
            <Carte>
              {!anomalies.length ? (
                <Vide>Aucun contrôle à régler.</Vide>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setCode("")} className={`rounded-full px-3 py-1 text-[12px] ring-1 ${!code ? "bg-nuit text-white ring-nuit" : "ring-zinc-200"}`}>
                      Tous
                    </button>
                    {parCode.map(([k, n]) => (
                      <button key={k} type="button" onClick={() => setCode(k)} className={`rounded-full px-3 py-1 text-[12px] ring-1 ${code === k ? "bg-nuit text-white ring-nuit" : "ring-zinc-200"}`}>
                        {detail.donnees?.controles[k]?.libelle ?? k} · {nf.format(n)}
                        {detail.donnees?.controles[k]?.gravite === "BLOQUANT" && " · bloquant"}
                      </button>
                    ))}
                  </div>
                  <Tableau>
                    <thead>
                      <tr>
                        <th>Volontaire</th>
                        <th>Contrôle</th>
                        <th>Détail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.slice(0, 300).map((a, i) => (
                        <tr key={`${a.code}-${a.volontaireId}-${i}`}>
                          <td>
                            <button type="button" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => setFiche({ id: a.volontaireId, controle: a.gravite === "BLOQUANT" && ["DOUBLON", "RECRUTE_FP"].includes(a.code) ? a.code : undefined })}>
                              {a.nomComplet}
                            </button>
                          </td>
                          <td>
                            <Badge ton={a.gravite === "BLOQUANT" ? "rouge" : "jaune"}>{detail.donnees?.controles[a.code]?.libelle ?? a.code}</Badge>
                          </td>
                          <td className="text-[12px] text-zinc-600">{a.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                  {visibles.length > 300 && <p className="mt-3 text-[12px] text-zinc-400">300 premiers sur {nf.format(visibles.length)} : choisissez un contrôle pour voir les autres.</p>}
                </>
              )}
            </Carte>
          )}

          {vue === "resume" && detail.donnees && (
            <Carte>
              <Tableau>
                <thead>
                  <tr>
                    <th>Département</th>
                    {(c?.categories ?? []).map((x) => (
                      <th key={x.code} className="text-right">
                        {x.libelle}
                      </th>
                    ))}
                    <th className="text-right">Rappels</th>
                    <th className="text-right">Effectif</th>
                    <th className="text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(detail.donnees.resume.map((r) => r.departementId))].map((d) => {
                    const lignes = detail.donnees!.resume.filter((r) => r.departementId === d);
                    return (
                      <tr key={String(d)}>
                        <td>{nomDep(d)}</td>
                        {(c?.categories ?? []).map((x) => (
                          <td key={x.code} className="text-right tabular-nums">
                            {nf.format(lignes.find((r) => r.categorie === x.code)?.effectif ?? 0)}
                          </td>
                        ))}
                        <td className="text-right tabular-nums">{nf.format(lignes.reduce((t, r) => t + r.rappels, 0))}</td>
                        <td className="text-right font-medium tabular-nums">{nf.format(lignes.reduce((t, r) => t + r.effectif, 0))}</td>
                        <td className="text-right font-medium tabular-nums whitespace-nowrap">{fcfa(lignes.reduce((t, r) => t + Number(r.total), 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
            </Carte>
          )}

          {vue === "liste" && detail.donnees && (
            <Carte>
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <Saisie
                  placeholder="Rechercher un nom…"
                  value={recherche}
                  onChange={(x) => {
                    setRecherche(x.target.value);
                    setPage(1);
                  }}
                />
                <Liste
                  value={departement}
                  onChange={(x) => {
                    setDepartement(x.target.value);
                    setPage(1);
                  }}
                  vide="Tous les départements"
                  options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))}
                />
              </div>
              <Tableau>
                <thead>
                  <tr>
                    <th>Nom et prénoms</th>
                    <th>Catégorie</th>
                    <th>Département</th>
                    <th>Établissement</th>
                    <th className="text-right">Mois</th>
                    <th className="text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.donnees.lignes.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <button type="button" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => setFiche({ id: l.volontaireId })}>
                          {l.nomComplet}
                        </button>
                        {l.observation && <div className="text-[11px] text-or-700">{l.observation}</div>}
                      </td>
                      <td className={l.montant ? "" : "text-rouge-600"}>{nomCat(l.categorie)}</td>
                      <td>{nomDep(l.departementId)}</td>
                      <td className="text-[12px]">{l.etablissement ?? "—"}</td>
                      <td className="text-right tabular-nums">{l.mois}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{fcfa(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
              <div className="mt-4 flex items-center justify-between text-[12px] text-zinc-500">
                <span>
                  {nf.format(detail.donnees.total)} ligne(s) · page {detail.donnees.page} sur {pages}
                </span>
                <div className="flex gap-2">
                  <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Précédente
                  </Bouton>
                  <Bouton disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    Suivante
                  </Bouton>
                </div>
              </div>
            </Carte>
          )}
        </>
      )}
      {id && !e && !detail.erreur && <Chargement />}

      {fiche && (
        <FicheVolontaire
          id={fiche.id}
          controle={fiche.controle}
          fermer={() => {
            // Une fiche corrigée : l'état en projet est recalculé à la fermeture
            if (fiche.modifiee && e?.statut === "BROUILLON" && gerer) void preparer(e.mois, true);
            setFiche(null);
          }}
          apres={() => setFiche((f) => (f ? { ...f, modifiee: true } : f))}
        />
      )}
      <Modale titre="Rouvrir l’état validé" ouverte={rouvrir} fermer={() => setRouvrir(false)}>
        <Champ libelle="Pourquoi rouvrir cet état ?">
          <Zone value={motif} onChange={(x) => setMotif(x.target.value)} placeholder="Ex. : un recruté payé à tort, à retirer avant paiement." />
        </Champ>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setRouvrir(false)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={async () => {
              await agir(() => api.post(`/enrolement/bourse/${e!.id}/reouverture`, { motif }), "État rouvert : il redevient un projet.");
              setRouvrir(false);
              setMotif("");
            }}
          >
            Rouvrir
          </Bouton>
        </div>
      </Modale>
      {confirmation}
    </div>
  );
}
