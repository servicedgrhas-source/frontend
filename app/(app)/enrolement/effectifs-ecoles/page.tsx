"use client";

import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CYCLES_ECOLES as CYCLES, type DecisionEcole as Decision, EFFECTIFS, type Ecole, type EcoleDetaillee, FicheEcole, ListeDecisions, type Nombres, pourcent } from "@/components/ecoles/controle-ecoles";
import { nf } from "@/components/enrolement/volontaires";
import { FraicheurCalcul } from "@/components/fraicheur-calcul";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Effectifs {
  /** toutesEcoles : toutes les écoles (case « seulement… » cochée ou non), pour « 10 sur 31 ». */
  totaux: Nombres & { ecoles: number; sousSeuil: number; toutesEcoles: number };
  parDeppsa: (Nombres & { departement: string; ecoles: number; sousSeuil: number; toutesEcoles: number })[];
  sansEcole: { effectif: string; libelle: string; sans: number; administration: number; ecartees: number }[];
  reclassees: number;
  aHarmoniser: number;
  horsOrganigramme: number;
  ressemblances: number;
  decisions: number;
  total: number;
  ecoles: Ecole[];
  calculeLe?: string;
  aJour?: boolean;
}

/** Le lien vers « Écoles à contrôler » (volet Banque mondiale), où l'on tranche (DG, 17/11/2026 : ici, on regarde seulement). */
function VersStructures({ onglet, children }: { onglet: string; children: React.ReactNode }) {
  return (
    <Link href={`/enrolement/ecoles-a-controler?controle=${onglet}`} className="inline-flex items-center gap-1 font-medium text-marque-700 hover:underline">
      {children} <ArrowRight className="size-3.5" />
    </Link>
  );
}

/** Bloc gris qui pulse, à la place d'un contenu en cours de chargement. */
function Os({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-300/70 ${className ?? ""}`} />;
}

/** Squelette des tuiles et du tableau, pendant que les chiffres se recalculent. */
function Squelette() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement des effectifs">
      <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <Os className="h-3 w-24" />
            <Os className="h-7 w-20" />
            <Os className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <Os className="h-5 w-40" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Os className="h-4 w-32" />
            <Os className="h-4 flex-1" />
            <Os className="h-4 w-16" />
            <Os className="h-4 w-16" />
            <Os className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Effectifs par école (demande de la Banque mondiale, 16/11/2026) : pour chaque école, rangée par
 * DEPPSA, le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. Les
 * écoles de 3 fonctionnaires ou moins (contractuels compris) sont signalées : elles passent en priorité. Les écoles
 * dont les noms se ressemblent sont montrées ici ; elles se tranchent dans « Écoles à contrôler »
 * (DG, 17/11/2026). Aucun nom de personne, seulement des nombres.
 */
export default function EffectifsEcoles() {
  const { profil, refs } = useSession();
  const [cycle, setCycle] = useState("PRESCOLAIRE");
  const [departementId, setDepartementId] = useState("");
  const [seuil, setSeuil] = useState("3");
  const [sousSeuil, setSousSeuil] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [pageR, setPageR] = useState(1);
  const [vue, setVue] = useState<"deppsa" | "ecoles" | "ressemblances" | "decisions">("deppsa");
  const [erreur, setErreur] = useState<string | null>(null);
  const s = Math.min(50, Math.max(1, Number(seuil) || 3));
  const filtres = { cycle, departementId: departementId || undefined, seuil: s };
  const d = useApi<Effectifs>(`/enrolement/effectifs-ecoles${qs({ ...filtres, sousSeuil: sousSeuil ? 1 : undefined, recherche: recherche.trim() || undefined, page, taille: 50 })}`);
  const r = useApi<{ total: number; paires: { score: number; a: EcoleDetaillee; b: EcoleDetaillee }[] }>(vue === "ressemblances" ? `/enrolement/effectifs-ecoles/ressemblances${qs({ ...filtres, page: pageR })}` : null);
  const dec = useApi<Decision[]>(vue === "decisions" ? "/enrolement/effectifs-ecoles/decisions" : null);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const changer = (f: (v: string) => void) => (v: string) => {
    f(v);
    setPage(1);
    setPageR(1);
  };
  const telecharger = () =>
    api.telecharger(`/enrolement/effectifs-ecoles/excel${qs({ ...filtres, sousSeuil: sousSeuil ? 1 : undefined })}`, "Effectifs par école.xlsx").catch((x: Error) => setErreur(x.message));
  const t = d.donnees?.totaux;
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / 50)) : 1;
  const pagesR = r.donnees ? Math.max(1, Math.ceil(r.donnees.total / 20)) : 1;
  const voirEcoles = (dep: string | null, sous: boolean) => {
    const id = dep ? refs.departements.find((x) => x.nom === dep)?.id : undefined;
    if (dep && id) setDepartementId(String(id));
    setSousSeuil(sous);
    setVue("ecoles");
    setPage(1);
  };
  // Le squelette pendant un recalcul (filtre changé, décision prise)
  const charge = !d.donnees || d.chargement;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Effectifs par école (Banque mondiale)"
        sousTitre={`Pour chaque école, rangée par DEPPSA : le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. En orange, les écoles qui ont ${s} fonctionnaires ou moins, contractuels compris : elles passent en priorité. Les écoles dont les noms se ressemblent sont montrées ici et se tranchent dans Banque mondiale › Écoles à contrôler. Seulement des nombres, aucun nom de personne.`}
        actions={
          <Bouton onClick={telecharger} title="Par école, par DEPPSA, sans école, noms à harmoniser, écoles qui se ressemblent, DEPPSA reclassées (en-tête officiel)">
            <Download /> Excel
          </Bouton>
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}

      <Carte>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Liste
            value={cycle}
            onChange={(e) => changer(setCycle)(e.target.value)}
            options={[{ valeur: "TOUS", libelle: "Tous les cycles" }, ...Object.entries(CYCLES).map(([valeur, libelle]) => ({ valeur, libelle })), { valeur: "SANS", libelle: "Cycle non reconnu" }]}
          />
          <Liste value={departementId} onChange={(e) => changer(setDepartementId)(e.target.value)} vide="Toutes les DEPPSA" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px]">
            Seuil :
            <Saisie type="number" min={1} max={50} className="w-20 shrink-0" value={seuil} onChange={(e) => changer(setSeuil)(e.target.value)} />
            fonctionnaires
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="size-4 accent-marque-600" checked={sousSeuil} onChange={(e) => { setSousSeuil(e.target.checked); setPage(1); }} />
            Seulement les écoles de {s} fonctionnaires ou moins (avec contractuels)
          </label>
        </div>
      </Carte>

      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {charge || !t || !d.donnees ? (
        <Squelette />
      ) : (
        <>
          <FraicheurCalcul calculeLe={d.donnees.calculeLe} aJour={d.donnees.aJour} recharger={d.recharger} />
          <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            <Chiffre libelle="Écoles" valeur={nf.format(t.ecoles)} ton="gris" detail={cycle === "TOUS" ? "tous les cycles" : (CYCLES[cycle] ?? "cycle non reconnu")} />
            <Chiffre
              libelle={`${s} fonctionnaires ou moins`}
              valeur={nf.format(t.sousSeuil)}
              ton="rouge"
              detail={t.toutesEcoles ? `sur ${nf.format(t.toutesEcoles)} écoles en tout (${Math.round((t.sousSeuil * 100) / t.toutesEcoles)} %)` : ""}
            />
            {EFFECTIFS.map(([k, libelle]) => (
              <Chiffre key={k} libelle={libelle} valeur={nf.format(t[k])} ton={k === "fonctionnaires" ? "vert" : k === "contractuels" ? "bleu" : "gris"} detail={t.total ? `${Math.round((t[k] * 100) / t.total)} % du personnel compté` : ""} />
            ))}
          </div>

          <Segments
            valeur={vue}
            changer={setVue}
            options={[
              { valeur: "deppsa", libelle: "Par DEPPSA" },
              { valeur: "ecoles", libelle: `Par école (${nf.format(d.donnees.total)})` },
              { valeur: "ressemblances", libelle: `Écoles qui se ressemblent (${nf.format(d.donnees.ressemblances)})` },
              { valeur: "decisions", libelle: `Décisions (${nf.format(d.donnees.decisions)})` },
            ]}
          />

          {vue === "deppsa" && (
            <div className="space-y-6">
              <Carte titre="Par DEPPSA">
                <Tableau>
                  <thead>
                    <tr>
                      <th>DEPPSA</th>
                      <th className="text-right">Écoles</th>
                      <th className="text-right" title={`Écoles de ${s} fonctionnaires ou moins (contractuels compris), sur toutes les écoles de la DEPPSA`}>
                        {s} fonct. ou moins
                        <span className="block text-[10px] font-normal normal-case">sur toutes les écoles</span>
                      </th>
                      {EFFECTIFS.map(([k, l]) => (
                        <th key={k} className="text-right">
                          {l}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.parDeppsa.map((x) => (
                      <tr key={x.departement}>
                        <td>
                          <button type="button" className="text-left hover:underline" onClick={() => voirEcoles(x.departement, false)} title="Voir les écoles de cette DEPPSA">
                            {x.departement}
                          </button>
                        </td>
                        <td className="text-right tabular-nums">{nf.format(x.ecoles)}</td>
                        <td className="text-right tabular-nums">
                          {x.sousSeuil ? (
                            <button type="button" className="font-semibold text-rouge-600 hover:underline" onClick={() => voirEcoles(x.departement, true)} title="Voir ces écoles">
                              {nf.format(x.sousSeuil)}
                            </button>
                          ) : (
                            0
                          )}
                          <span className="text-zinc-400"> sur {nf.format(x.toutesEcoles)}</span>
                        </td>
                        {EFFECTIFS.map(([k]) => (
                          <td key={k} className="text-right tabular-nums">
                            {nf.format(x[k])}
                          </td>
                        ))}
                        <td className="text-right tabular-nums">{nf.format(x.total)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>Total</td>
                      <td className="text-right tabular-nums">{nf.format(t.ecoles)}</td>
                      <td className="text-right tabular-nums">
                        {nf.format(t.sousSeuil)}
                        <span className="font-normal text-zinc-400"> sur {nf.format(t.toutesEcoles)}</span>
                      </td>
                      {EFFECTIFS.map(([k]) => (
                        <td key={k} className="text-right tabular-nums">
                          {nf.format(t[k])}
                        </td>
                      ))}
                      <td className="text-right tabular-nums">{nf.format(t.total)}</td>
                    </tr>
                  </tbody>
                </Tableau>
              </Carte>
              <div className="grid gap-6 lg:grid-cols-2">
                <Carte titre="Personnes sans école connue">
                  <p className="mb-2 text-[12px] text-zinc-500">Pas comptées dans le tableau : école (ou lieu de service) non renseignée, poste dans une inspection, une direction, un cabinet, ou « école » écartée. Tous cycles confondus.</p>
                  <Tableau>
                    <thead>
                      <tr>
                        <th></th>
                        <th className="text-right">Non renseignée</th>
                        <th className="text-right">Administration</th>
                        <th className="text-right">Écartée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.donnees.sansEcole.map((x) => (
                        <tr key={x.effectif}>
                          <td>{x.libelle}</td>
                          <td className="text-right tabular-nums">{nf.format(x.sans)}</td>
                          <td className="text-right tabular-nums">{nf.format(x.administration)}</td>
                          <td className="text-right tabular-nums">{nf.format(x.ecartees)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                </Carte>
                <Carte titre="Qualité des données (retours à faire)">
                  <ul className="space-y-3 text-[13px] text-zinc-700">
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.ressemblances)}</strong> paire(s) d’écoles dont les noms se ressemblent : même école ou deux écoles ?{" "}
                      <VersStructures onglet="ressemblances">Trancher</VersStructures>
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.aHarmoniser)}</strong> école(s) dont le nom est écrit de plusieurs façons, déjà comptées une seule fois.{" "}
                      <VersStructures onglet="harmoniser">Voir et harmoniser</VersStructures>
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.horsOrganigramme)}</strong> école(s) absentes de l’organigramme : connues seulement par le nom écrit dans les fichiers.{" "}
                      <VersStructures onglet="hors-organigramme">Ajouter à l’organigramme</VersStructures>
                    </li>
                    <li>
                      <strong className="tabular-nums">{nf.format(d.donnees.reclassees)}</strong> fonctionnaire(s) ou contractuel(s) comptés dans une nouvelle DEPPSA (Congo-Oubangui, Djoué-Léfini, Nkéni-Alima).
                      <span className="mt-0.5 block text-[12px] text-zinc-500">
                        Leur fiche du personnel porte encore l’ancien département (par exemple Plateaux), mais leur école n’existe que dans la nouvelle DEPPSA (d’après l’organigramme et le registre) : ce tableau les compte donc là où
                        est leur école. Leur fiche n’est pas modifiée ; la liste est dans la feuille « DEPPSA reclassées » de l’Excel.
                      </span>
                    </li>
                  </ul>
                </Carte>
              </div>
            </div>
          )}

          {vue === "ecoles" && (
            <Carte
              titre={`Par école (${nf.format(d.donnees.total)})`}
              actions={<Saisie className="w-64" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Nom de l’école…" />}
            >
              {!d.donnees.ecoles.length ? (
                <Vide>Aucune école pour ces filtres.</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      <th>DEPPSA</th>
                      <th>École</th>
                      {EFFECTIFS.map(([k, l]) => (
                        <th key={k} className="text-right">
                          {l}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                      <th>Nom le plus proche</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.ecoles.map((e) => {
                      const sous = e.fonctionnaires + e.contractuels <= s;
                      return (
                        <tr key={e.id} className={sous ? "bg-or-100/50" : undefined}>
                          <td className="text-[12px] text-zinc-600">{e.departement}</td>
                          <td>
                            <span className="font-medium">{e.nom}</span>
                            {cycle === "TOUS" && e.cycle && <span className="ml-1 text-[11px] text-zinc-500">· {CYCLES[e.cycle]}</span>}
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {!e.organigramme && <Badge ton="gris">hors organigramme</Badge>}
                              {e.ecritures > 1 && <Badge ton="gris">{e.ecritures} écritures</Badge>}
                              {e.jumelees > 0 && <Badge ton="bleu">{e.jumelees} jumelée(s)</Badge>}
                              {e.nomCorrige && <Badge ton="vert">nom corrigé</Badge>}
                            </div>
                          </td>
                          {EFFECTIFS.map(([k]) => (
                            <td key={k} className={`text-right tabular-nums ${k === "fonctionnaires" && sous ? "font-semibold text-rouge-600" : ""}`}>
                              {nf.format(e[k])}
                            </td>
                          ))}
                          <td className="text-right tabular-nums font-semibold">{nf.format(e.total)}</td>
                          <td className="text-[12px]">
                            {e.proche ? (
                              <span className="text-or-700">
                                ≈ {e.proche.nom} <span className="tabular-nums text-zinc-500">({pourcent(e.proche.score)})</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tableau>
              )}
              {pages > 1 && (
                <div className="mt-3 flex items-center justify-between text-[13px]">
                  <Bouton variante="discret" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    ← Précédent
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {page} sur {nf.format(pages)}
                  </span>
                  <Bouton variante="discret" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    Suivant →
                  </Bouton>
                </div>
              )}
            </Carte>
          )}

          {vue === "ressemblances" && (
            <Carte titre={`Écoles qui se ressemblent (${nf.format(r.donnees?.total ?? d.donnees.ressemblances)})`}>
              <p className="mb-3 text-[12px] text-zinc-500">
                Deux écoles de la même DEPPSA dont les noms se ressemblent. Ici on les regarde seulement : on tranche (même école ou deux écoles) dans{" "}
                <VersStructures onglet="ressemblances">Banque mondiale › Écoles à contrôler</VersStructures>
              </p>
              {r.erreur && <Alerte>{r.erreur}</Alerte>}
              {!r.donnees || r.chargement ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Os key={i} className="h-36 w-full" />
                  ))}
                </div>
              ) : !r.donnees.paires.length ? (
                <Vide>Aucune paire à trancher pour ces filtres.</Vide>
              ) : (
                <div className="space-y-4">
                  {r.donnees.paires.map((p) => (
                    <div key={`${p.a.id}§${p.b.id}`} className="rounded-2xl border border-zinc-200 p-3">
                      <div className="mb-2 flex items-center justify-between text-[12px] text-zinc-500">
                        <span>
                          {p.a.departement} · ressemblance <strong className="text-zinc-800">{pourcent(p.score)}</strong>
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FicheEcole e={p.a} />
                        <FicheEcole e={p.b} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pagesR > 1 && (
                <div className="mt-3 flex items-center justify-between text-[13px]">
                  <Bouton variante="discret" disabled={pageR <= 1} onClick={() => setPageR(pageR - 1)}>
                    ← Précédent
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {pageR} sur {nf.format(pagesR)}
                  </span>
                  <Bouton variante="discret" disabled={pageR >= pagesR} onClick={() => setPageR(pageR + 1)}>
                    Suivant →
                  </Bouton>
                </div>
              )}
            </Carte>
          )}

          {vue === "decisions" && (
            <Carte titre="Décisions prises sur les écoles">
              {dec.erreur && <Alerte>{dec.erreur}</Alerte>}
              {!dec.donnees || dec.chargement ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Os key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : !dec.donnees.length ? (
                <Vide>Aucune décision pour le moment.</Vide>
              ) : (
                <ListeDecisions decisions={dec.donnees} controle={false} />
              )}
            </Carte>
          )}
        </>
      )}

    </div>
  );
}
