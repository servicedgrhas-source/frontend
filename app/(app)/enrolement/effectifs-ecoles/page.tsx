"use client";

import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CYCLES_ECOLES as CYCLES, EFFECTIFS, type Ecole, type Nombres, pourcent } from "@/components/ecoles/controle-ecoles";
import { nf } from "@/components/enrolement/volontaires";
import { FraicheurCalcul } from "@/components/fraicheur-calcul";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/**
 * Une DEPPSA (ou le total) : écoles qui atteignent le seuil (au moins 3 fonctionnaires ou
 * contractuels) et les autres, avec leur part ; personnel qui travaille dans les premières.
 */
type ParSeuil = Nombres & {
  departement: string;
  ecoles: number;
  auMoins: number;
  moins: number;
  partAuMoins: number;
  partMoins: number;
  personnelAuMoins: number;
  partPersonnelAuMoins: number;
  fcAuMoins: number;
  partFcAuMoins: number;
};
interface Effectifs {
  totaux: ParSeuil;
  parDeppsa: ParSeuil[];
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

/** Le lien vers « Écoles à contrôler » (Structures scolaires), où la DGRHAS tranche (18/11/2026). */
function VersStructures({ onglet, children }: { onglet: string; children: React.ReactNode }) {
  return (
    <Link href={`/ecoles/a-controler?controle=${onglet}`} className="inline-flex items-center gap-1 font-medium text-marque-700 hover:underline">
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

const pc = (v: number) => `${v.toLocaleString("fr-FR")} %`;

/**
 * Effectifs par école (demande de la Banque mondiale, 16/11/2026) : pour chaque école, rangée par
 * DEPPSA, le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. Le seuil
 * de la Banque mondiale (DG, 18/11/2026) : les écoles qui ont AU MOINS 3 fonctionnaires ou
 * contractuels (3 et plus), leur nombre et leur part, et la part du personnel qui y travaille. Les écoles
 * dont les noms se ressemblent sont montrées ici ; elles se tranchent dans « Écoles à contrôler »
 * (DG, 17/11/2026). Aucun nom de personne, seulement des nombres.
 */
export default function EffectifsEcoles() {
  const { profil, refs } = useSession();
  const [cycle, setCycle] = useState("PRESCOLAIRE");
  const [departementId, setDepartementId] = useState("");
  const [seuil, setSeuil] = useState("3");
  // « » : toutes les écoles ; AU_MOINS : au moins 3 F/C ; MOINS : moins de 3
  const [seuilFiltre, setSeuilFiltre] = useState<"" | "AU_MOINS" | "MOINS">("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  // Les écoles qui se ressemblent et les décisions : dans Structures scolaires › Écoles à contrôler (18/11/2026)
  const [vue, setVue] = useState<"deppsa" | "ecoles">("deppsa");
  const [erreur, setErreur] = useState<string | null>(null);
  const s = Math.min(50, Math.max(1, Number(seuil) || 3));
  const filtres = { cycle, departementId: departementId || undefined, seuil: s };
  const d = useApi<Effectifs>(`/enrolement/effectifs-ecoles${qs({ ...filtres, seuilFiltre: seuilFiltre || undefined, recherche: recherche.trim() || undefined, page, taille: 50 })}`);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const changer = (f: (v: string) => void) => (v: string) => {
    f(v);
    setPage(1);
  };
  const telecharger = () =>
    api.telecharger(`/enrolement/effectifs-ecoles/excel${qs({ ...filtres, seuilFiltre: seuilFiltre || undefined })}`, "Effectifs par école.xlsx").catch((x: Error) => setErreur(x.message));
  const t = d.donnees?.totaux;
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / 50)) : 1;
  const voirEcoles = (dep: string | null, quelles: "" | "AU_MOINS" | "MOINS") => {
    const id = dep ? refs.departements.find((x) => x.nom === dep)?.id : undefined;
    if (dep && id) setDepartementId(String(id));
    setSeuilFiltre(quelles);
    setVue("ecoles");
    setPage(1);
  };
  // Le squelette pendant un recalcul (filtre changé, décision prise)
  const charge = !d.donnees || d.chargement;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Effectifs par école (Banque mondiale)"
        sousTitre={`Pour chaque école, rangée par DEPPSA : le nombre de volontaires, de communautaires, de contractuels et de fonctionnaires. Seuil de la Banque mondiale : les écoles qui ont au moins ${s} fonctionnaires ou contractuels (${s} et plus), combien elles sont, leur part, et la part du personnel qui y travaille. Une même école écrite de plusieurs façons est comptée une seule fois. Seulement des nombres, aucun nom de personne.`}
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
            Seuil : au moins
            <Saisie type="number" min={1} max={50} className="w-16 shrink-0" value={seuil} onChange={(e) => changer(setSeuil)(e.target.value)} />
            <span title="fonctionnaires ou contractuels">F/C</span>
          </label>
          <Liste
            value={seuilFiltre}
            onChange={(e) => changer((v) => setSeuilFiltre(v as typeof seuilFiltre))(e.target.value)}
            options={[
              { valeur: "", libelle: "Liste : toutes les écoles" },
              { valeur: "AU_MOINS", libelle: `Liste : écoles d’au moins ${s} fonct. ou contr.` },
              { valeur: "MOINS", libelle: `Liste : écoles de moins de ${s} fonct. ou contr.` },
            ]}
          />
        </div>
      </Carte>

      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {charge || !t || !d.donnees ? (
        <Squelette />
      ) : (
        <>
          <FraicheurCalcul calculeLe={d.donnees.calculeLe} aJour={d.donnees.aJour} recharger={d.recharger} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Chiffre libelle="Écoles comptées" valeur={nf.format(t.ecoles)} ton="gris" detail={`${cycle === "TOUS" ? "tous les cycles" : (CYCLES[cycle] ?? "cycle non reconnu")}${departementId ? "" : " · tout le territoire"}`} />
            <Chiffre libelle={`Au moins ${s} fonct. ou contr.`} valeur={nf.format(t.auMoins)} ton="vert" detail={`${pc(t.partAuMoins)} des écoles atteignent le seuil`} />
            <Chiffre libelle={`Moins de ${s} fonct. ou contr.`} valeur={nf.format(t.moins)} ton="rouge" detail={`${pc(t.partMoins)} des écoles`} />
            <Chiffre
              libelle={`Personnel des écoles d’au moins ${s}`}
              valeur={pc(t.partPersonnelAuMoins)}
              ton="vert"
              detail={`${nf.format(t.personnelAuMoins)} sur ${nf.format(t.total)} personnes comptées (${pc(t.partFcAuMoins)} des fonct. et contr.)`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                      <th className="text-right" title={`Écoles qui ont au moins ${s} fonctionnaires ou contractuels (${s} et plus)`}>
                        Au moins {s} F/C
                        <span className="block text-[10px] font-normal normal-case">part des écoles</span>
                      </th>
                      <th className="text-right" title={`Écoles qui ont moins de ${s} fonctionnaires ou contractuels`}>
                        Moins de {s} F/C
                        <span className="block text-[10px] font-normal normal-case">part des écoles</span>
                      </th>
                      {EFFECTIFS.map(([k, l]) => (
                        <th key={k} className="text-right">
                          {l}
                        </th>
                      ))}
                      <th className="text-right">Total</th>
                      <th className="text-right" title={`Personnel compté (volontaires, communautaires, contractuels, fonctionnaires) qui travaille dans les écoles d’au moins ${s} fonctionnaires ou contractuels`}>
                        Personnel des écoles ≥ {s}
                        <span className="block text-[10px] font-normal normal-case">part du personnel</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.parDeppsa.map((x) => (
                      <tr key={x.departement}>
                        <td>
                          <button type="button" className="text-left hover:underline" onClick={() => voirEcoles(x.departement, "")} title="Voir les écoles de cette DEPPSA">
                            {x.departement}
                          </button>
                        </td>
                        <td className="text-right tabular-nums">{nf.format(x.ecoles)}</td>
                        <td className="text-right tabular-nums">
                          {x.auMoins ? (
                            <button type="button" className="font-semibold text-marque-700 hover:underline" onClick={() => voirEcoles(x.departement, "AU_MOINS")} title="Voir ces écoles">
                              {nf.format(x.auMoins)}
                            </button>
                          ) : (
                            0
                          )}
                          <span className="block text-[11px] text-zinc-500">{pc(x.partAuMoins)}</span>
                        </td>
                        <td className="text-right tabular-nums">
                          {x.moins ? (
                            <button type="button" className="font-semibold text-rouge-600 hover:underline" onClick={() => voirEcoles(x.departement, "MOINS")} title="Voir ces écoles">
                              {nf.format(x.moins)}
                            </button>
                          ) : (
                            0
                          )}
                          <span className="block text-[11px] text-zinc-500">{pc(x.partMoins)}</span>
                        </td>
                        {EFFECTIFS.map(([k]) => (
                          <td key={k} className="text-right tabular-nums">
                            {nf.format(x[k])}
                          </td>
                        ))}
                        <td className="text-right tabular-nums">{nf.format(x.total)}</td>
                        <td className="text-right tabular-nums">
                          {nf.format(x.personnelAuMoins)}
                          <span className="block text-[11px] text-zinc-500">{pc(x.partPersonnelAuMoins)}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>{departementId ? "Total" : "Total (tout le territoire)"}</td>
                      <td className="text-right tabular-nums">{nf.format(t.ecoles)}</td>
                      <td className="text-right tabular-nums">
                        {nf.format(t.auMoins)}
                        <span className="block text-[11px] font-normal text-zinc-500">{pc(t.partAuMoins)}</span>
                      </td>
                      <td className="text-right tabular-nums">
                        {nf.format(t.moins)}
                        <span className="block text-[11px] font-normal text-zinc-500">{pc(t.partMoins)}</span>
                      </td>
                      {EFFECTIFS.map(([k]) => (
                        <td key={k} className="text-right tabular-nums">
                          {nf.format(t[k])}
                        </td>
                      ))}
                      <td className="text-right tabular-nums">{nf.format(t.total)}</td>
                      <td className="text-right tabular-nums">
                        {nf.format(t.personnelAuMoins)}
                        <span className="block text-[11px] font-normal text-zinc-500">{pc(t.partPersonnelAuMoins)}</span>
                      </td>
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
                <Carte titre="Comment ces chiffres sont comptés">
                  <ul className="space-y-3 text-[13px] text-zinc-700">
                    <li>
                      <strong>Seuil de la Banque mondiale</strong> : une école l’atteint quand elle a <strong>au moins {s} fonctionnaires ou contractuels</strong> ({s} et plus ; un contractuel compte comme un
                      fonctionnaire). Les volontaires et les communautaires ne comptent pas pour le seuil, mais ils sont dans le personnel compté.
                    </li>
                    <li>
                      Une même école écrite de plusieurs façons dans les fichiers est comptée une seule fois ; les noms d’écoles sont vérifiés par la DGRHAS.{" "}
                      {peut.traiter(profil.role) && <VersStructures onglet="ressemblances">Structures scolaires › Écoles à contrôler</VersStructures>}
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
              titre={`${seuilFiltre === "AU_MOINS" ? `Écoles d’au moins ${s} fonct. ou contr.` : seuilFiltre === "MOINS" ? `Écoles de moins de ${s} fonct. ou contr.` : "Par école"} (${nf.format(d.donnees.total)})`}
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
                      <th>Seuil</th>
                      <th>Nom le plus proche</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.ecoles.map((e) => {
                      const atteint = e.fonctionnaires + e.contractuels >= s;
                      return (
                        <tr key={e.id}>
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
                            <td key={k} className="text-right tabular-nums">
                              {nf.format(e[k])}
                            </td>
                          ))}
                          <td className="text-right tabular-nums font-semibold">{nf.format(e.total)}</td>
                          <td>{atteint ? <Badge ton="vert">au moins {s}</Badge> : <Badge ton="rouge">moins de {s}</Badge>}</td>
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

        </>
      )}

    </div>
  );
}
