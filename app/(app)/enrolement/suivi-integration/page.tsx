"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { categoriesDe, nf, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Aide, Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import type { Ton } from "@/lib/libelles";
import { peut } from "@/lib/libelles";

interface Groupe {
  libelle: string;
  base: number;
  recrutes: number;
  affectes: number;
  payes: number;
  reste: number;
  aVerifier: number;
}

interface Ligne {
  id: string;
  nom: string;
  population: "VOLONTAIRE" | "COMMUNAUTAIRE";
  registre: "EN_POSTE" | "SORTI" | "ABSENT";
  motifSortie: string | null;
  dernierMoisBourse: string | null;
  vague: number | null;
  departement: string;
  cycle: string;
  texte: { nature: string; numero: string; date: string | null; source: string } | null;
  note: { numero: string | null; date: string | null; lieu: string | null; departement?: string | null; source: string } | null;
  salaire: { statut: string | null; matricule: string | null; indice: string | null; premierMois: string | null } | null;
  piste: string | null;
  situation: string;
  aRegler: string[];
}

interface Suivi {
  synthese: {
    total: Omit<Groupe, "libelle">;
    taux: { integration: number; affectation: number; priseEnCharge: number };
    absentsRegistre: number;
    parSituation: { code: string; libelle: string; n: number }[];
    parPopulation: Groupe[];
    parDepartement: Groupe[];
    parCycle: Groupe[];
    parAnnee: Groupe[];
    aRegler: { libelle: string; n: number }[];
  };
  sources: Record<string, number>;
  total: number;
  page: number;
  taille: number;
  lignes: Ligne[];
  choix: { vagues: number[]; annees: string[] };
  situations: Record<string, string>;
  calculeLe: string;
}

/** Les couleurs des situations (comme les pastilles), avec un libellé qui peut passer à la ligne. */
const COULEUR: Record<Ton, string> = {
  vert: "bg-marque-50 text-marque-700",
  bleu: "bg-sky-50 text-sky-700",
  jaune: "bg-or-100 text-or-700",
  rouge: "bg-rouge-100 text-rouge-600",
  gris: "bg-zinc-100 text-zinc-600",
};

/** Les mots de la page, expliqués pour quelqu'un qui la découvre. */
const MOTS = {
  registre: "Toutes les personnes payées un jour en bourse : les volontaires (finalistes enrôlés) et les communautaires (recrutés autrefois par les écoles), qu’elles soient encore en poste ou déjà sorties.",
  recrute: "Devenu fonctionnaire ou contractuel. Son statut dans la base du personnel suffit, même si le texte manque. Comptent aussi : un arrêté ou un décret d’intégration reçu, ou une sortie de la bourse avec le motif « recruté à la Fonction publique ».",
  affecte: "Un fonctionnaire ou un contractuel est affecté : on l’a envoyé travailler dans un département et une structure (école, inspection, direction…). La structure vient de sa fiche du personnel (lieu de service). Pour une recrue qui n’est pas encore dans la base du personnel : une note d’affectation retrouvée.",
  paye: "Fonctionnaire ou contractuel, avec ou sans matricule solde : il perçoit son salaire.",
  reste: "Encore en poste et payés en bourse : pas encore recrutés.",
  verifier: "Même nom qu’un fonctionnaire ou un contractuel, mais sans date de naissance pour être sûr que c’est la même personne. Pas compté : à confirmer.",
  retrouver: "Une personne de la bourse est retrouvée dans la base du personnel par le lien enregistré entre ses deux fiches, ou par le même nom et la même date de naissance.",
};

/** La couleur de la pastille d'une situation. */
const TON: Record<string, Ton> = {
  PAYE_AFFECTE: "vert",
  PAYE_SANS_NOTE: "vert",
  ATTENTE_SALAIRE: "bleu",
  ATTENTE_NOTE: "bleu",
  RECRUTE_SANS_PIECE: "jaune",
  A_VERIFIER: "jaune",
  NON_RECRUTE: "gris",
  SORTI_AUTRE: "gris",
  ABSENT_REGISTRE: "rouge",
};

/**
 * Suivi de l'intégration des enseignants volontaires et communautaires (document demandé par la
 * Banque mondiale, 16/11/2026) : le parcours de chacun, du registre de la bourse au salaire —
 * texte d'intégration, note d'affectation, prise en charge de la solde, fin de la bourse. Lecture
 * seule : la page ne modifie rien.
 */
export default function SuiviIntegration() {
  const { profil, refs } = useSession();
  const config = useConfigEnrolement();
  const [population, setPopulation] = useState("");
  const [departementId, setDepartementId] = useState("");
  const [categorie, setCategorie] = useState("");
  const [vague, setVague] = useState("");
  const [annee, setAnnee] = useState("");
  const [situation, setSituation] = useState("");
  const [aRegler, setARegler] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [vue, setVue] = useState<"synthese" | "liste">("synthese");
  const [par, setPar] = useState<"population" | "departement" | "cycle" | "annee">("population");
  const [erreur, setErreur] = useState<string | null>(null);
  const filtres = { population: population || undefined, departementId: departementId || undefined, categorie: categorie || undefined, vague: vague || undefined, annee: annee || undefined, situation: situation || undefined, aRegler: aRegler ? 1 : undefined, recherche: recherche.trim() || undefined };
  const d = useApi<Suivi>(`/enrolement/suivi-integration${qs({ ...filtres, page, taille: 50 })}`);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const changer = (f: (v: string) => void) => (v: string) => {
    f(v);
    setPage(1);
  };
  // Les cycles des deux listes, distingués (les communautaires ont leurs propres codes)
  const cats = [
    ...categoriesDe(config.donnees?.configuration, "VOLONTAIRE").map((x) => ({ code: x.code, libelle: `Volontaires · ${x.libelle}` })),
    ...categoriesDe(config.donnees?.configuration, "COMMUNAUTAIRE").map((x) => ({ code: x.code, libelle: `Communautaires · ${x.libelle}` })),
  ].filter((x) => !population || (population === "COMMUNAUTAIRE") === x.code.startsWith("COM_"));
  const telecharger = (quoi: "excel" | "word") =>
    api
      .telecharger(`/enrolement/suivi-integration/${quoi}${qs(filtres)}`, `Suivi de l'intégration des volontaires et communautaires.${quoi === "excel" ? "xlsx" : "docx"}`)
      .catch((x: Error) => setErreur(x.message));
  const s = d.donnees?.synthese;
  const groupes = s ? (par === "population" ? s.parPopulation : par === "departement" ? s.parDepartement : par === "cycle" ? s.parCycle : s.parAnnee) : [];
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / d.donnees.taille)) : 1;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Suivi de l’intégration (Banque mondiale)"
        sousTitre="Ce que sont devenus les volontaires et les communautaires payés en bourse : qui est devenu fonctionnaire ou contractuel, où il travaille, s’il touche son salaire, et qui reste à intégrer."
        actions={
          <div className="flex flex-wrap gap-2">
            <Bouton onClick={() => telecharger("excel")} title="Synthèse, liste nominative et points à régler (en-tête officiel)">
              <Download /> Excel
            </Bouton>
            <Bouton onClick={() => telecharger("word")} title="La synthèse en Word (en-tête officiel), à remettre ou à imprimer en PDF">
              <FileText /> Synthèse en Word
            </Bouton>
          </div>
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}

      {/* Comment lire cette page : les mots expliqués, pour quelqu'un qui la découvre */}
      <details className="group rounded-2xl bg-white p-5 shadow-sm" open>
        <summary className="cursor-pointer select-none text-[14px] font-semibold text-encre">Comment lire cette page ? <span className="font-normal text-zinc-500 group-open:hidden">(cliquer pour ouvrir)</span></summary>
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-[13px] leading-relaxed text-zinc-700 md:grid-cols-2">
          <div><dt className="inline font-semibold">Registre de la bourse : </dt><dd className="inline">{MOTS.registre}</dd></div>
          <div><dt className="inline font-semibold">Recruté : </dt><dd className="inline">{MOTS.recrute}</dd></div>
          <div><dt className="inline font-semibold">Affecté : </dt><dd className="inline">{MOTS.affecte}</dd></div>
          <div><dt className="inline font-semibold">Payé (salaire) : </dt><dd className="inline">{MOTS.paye}</dd></div>
          <div><dt className="inline font-semibold">Reste à intégrer : </dt><dd className="inline">{MOTS.reste}</dd></div>
          <div><dt className="inline font-semibold">À vérifier : </dt><dd className="inline">{MOTS.verifier}</dd></div>
          <div className="md:col-span-2 text-zinc-500">{MOTS.retrouver} Rien n’est modifié par cette page : elle lit seulement.</div>
        </dl>
      </details>

      {/* Les filtres : la période est au choix (vague, année du texte) */}
      <Carte>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Liste value={population} onChange={(e) => changer(setPopulation)(e.target.value)} vide="Volontaires et communautaires" options={[{ valeur: "VOLONTAIRE", libelle: "Volontaires" }, { valeur: "COMMUNAUTAIRE", libelle: "Communautaires" }]} />
          <Liste value={departementId} onChange={(e) => changer(setDepartementId)(e.target.value)} vide="Tous les départements" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
          <Liste value={categorie} onChange={(e) => changer(setCategorie)(e.target.value)} vide="Tous les cycles" options={cats.map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
          <Liste value={vague} onChange={(e) => changer(setVague)(e.target.value)} vide="Toutes les vagues" options={(d.donnees?.choix.vagues ?? []).map((x) => ({ valeur: x, libelle: x === 1 ? "1re vague" : x ? `${x}e vague` : "Avant la 1re vague" }))} />
          <Liste value={annee} onChange={(e) => changer(setAnnee)(e.target.value)} vide="Toutes les années de texte" options={(d.donnees?.choix.annees ?? []).map((x) => ({ valeur: x, libelle: `Textes de ${x}` }))} />
          <Liste value={situation} onChange={(e) => changer(setSituation)(e.target.value)} vide="Toutes les situations" options={Object.entries(d.donnees?.situations ?? {}).map(([valeur, libelle]) => ({ valeur, libelle }))} />
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="size-4 accent-marque-600" checked={aRegler} onChange={(e) => { setARegler(e.target.checked); setPage(1); }} />
            Seulement ce qui est à régler
          </label>
        </div>
      </Carte>

      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!d.donnees ? (
        <Chargement texte="Calcul du suivi : tout le registre et toute la base du personnel sont rapprochés (une vingtaine de secondes la première fois)…" />
      ) : (
        <>
          {/* Le parcours en chiffres */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Chiffre libelle="Registre de la bourse" valeur={nf.format(s!.total.base)} ton="gris" detail="volontaires et communautaires" />
            <Chiffre libelle="Recrutés" valeur={nf.format(s!.total.recrutes)} ton="bleu" detail={`${s!.taux.integration} % du registre : devenus fonctionnaires ou contractuels, ou texte reçu`} />
            <Chiffre libelle="Affectés" valeur={nf.format(s!.total.affectes)} ton="bleu" detail={`${s!.taux.affectation} % des recrutés : travaillent dans un département et une structure`} />
            <Chiffre libelle="Payés (salaire)" valeur={nf.format(s!.total.payes)} ton="vert" detail={`${s!.taux.priseEnCharge} % des recrutés : fonctionnaires ou contractuels`} />
            <Chiffre libelle="Reste à intégrer" valeur={nf.format(s!.total.reste)} ton="rouge" detail="encore payés en bourse, pas encore recrutés" />
          </div>
          {(s!.total.aVerifier > 0 || s!.absentsRegistre > 0) && (
            <p className="text-[12px] text-zinc-600">
              {s!.total.aVerifier > 0 && <>De plus, <strong>{nf.format(s!.total.aVerifier)}</strong> personne(s) sont peut-être déjà recrutées : même nom qu’un fonctionnaire ou qu’une recrue des textes, mais sans date de naissance pour être sûr. Elles ne sont pas comptées dans « Recrutés » : à vérifier. </>}
              {s!.absentsRegistre > 0 && <><strong>{nf.format(s!.absentsRegistre)}</strong> recrue(s) des textes d’origine volontaire ou communautaire sont absentes du registre.</>}
            </p>
          )}

          <Segments
            valeur={vue}
            changer={setVue}
            options={[
              { valeur: "synthese", libelle: "Synthèse" },
              { valeur: "liste", libelle: `Liste nominative (${nf.format(d.donnees.total)})` },
            ]}
          />

          {vue === "synthese" && (
            <div className="space-y-6">
              <Carte titre="Le parcours, en détail">
                <div className="mb-3">
                  <Segments
                    valeur={par}
                    changer={setPar}
                    options={[
                      { valeur: "population", libelle: "Par liste" },
                      { valeur: "departement", libelle: "Par département" },
                      { valeur: "cycle", libelle: "Par cycle" },
                      { valeur: "annee", libelle: "Par année du texte" },
                    ]}
                  />
                </div>
                <Tableau>
                  <thead>
                    <tr>
                      <th></th>
                      <th className="text-right">Registre <Aide>{MOTS.registre}</Aide></th>
                      <th className="text-right">Recrutés <Aide>{MOTS.recrute}</Aide></th>
                      <th className="text-right">Affectés <Aide>{MOTS.affecte}</Aide></th>
                      <th className="text-right">Payés <Aide>{MOTS.paye}</Aide></th>
                      <th className="text-right">Reste à intégrer <Aide>{MOTS.reste}</Aide></th>
                      <th className="text-right">À vérifier <Aide>{MOTS.verifier}</Aide></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupes.map((g) => (
                      <tr key={g.libelle}>
                        <td>{g.libelle}</td>
                        <td className="text-right tabular-nums">{nf.format(g.base)}</td>
                        <td className="text-right tabular-nums">{nf.format(g.recrutes)}</td>
                        <td className="text-right tabular-nums">{nf.format(g.affectes)}</td>
                        <td className="text-right tabular-nums">{nf.format(g.payes)}</td>
                        <td className="text-right tabular-nums">{nf.format(g.reste)}</td>
                        <td className="text-right tabular-nums text-zinc-500">{nf.format(g.aVerifier)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>Total</td>
                      <td className="text-right tabular-nums">{nf.format(s!.total.base)}</td>
                      <td className="text-right tabular-nums">{nf.format(s!.total.recrutes)}</td>
                      <td className="text-right tabular-nums">{nf.format(s!.total.affectes)}</td>
                      <td className="text-right tabular-nums">{nf.format(s!.total.payes)}</td>
                      <td className="text-right tabular-nums">{nf.format(s!.total.reste)}</td>
                      <td className="text-right tabular-nums text-zinc-500">{nf.format(s!.total.aVerifier)}</td>
                    </tr>
                  </tbody>
                </Tableau>
              </Carte>
              <div className="grid gap-6 lg:grid-cols-3">
                <Carte titre="Par situation">
                  <div className="space-y-1.5 text-[13px]">
                    {s!.parSituation.filter((x) => x.n).map((x) => (
                      <button
                        type="button"
                        key={x.code}
                        className="flex w-full items-start justify-between gap-3 rounded-lg px-2 py-1 text-left hover:bg-zinc-50"
                        onClick={() => {
                          setSituation(x.code);
                          setVue("liste");
                          setPage(1);
                        }}
                        title="Voir ces personnes"
                      >
                        <span className={`min-w-0 rounded-2xl px-2.5 py-0.5 text-[12px] font-medium ${COULEUR[TON[x.code] ?? "gris"]}`}>{x.libelle}</span>
                        <span className="shrink-0 tabular-nums font-semibold">{nf.format(x.n)}</span>
                      </button>
                    ))}
                  </div>
                </Carte>
                <Carte titre="Ce qui est à régler">
                  {!s!.aRegler.length ? (
                    <Vide>Rien à régler.</Vide>
                  ) : (
                    <div className="space-y-2 text-[13px]">
                      {s!.aRegler.map((x) => (
                        <div key={x.libelle} className="flex items-start justify-between gap-3">
                          <span className="text-zinc-700">{x.libelle}</span>
                          <span className="shrink-0 tabular-nums font-semibold">{nf.format(x.n)}</span>
                        </div>
                      ))}
                      <Bouton
                        variante="discret"
                        onClick={() => {
                          setARegler(true);
                          setVue("liste");
                          setPage(1);
                        }}
                      >
                        Voir la liste à régler
                      </Bouton>
                    </div>
                  )}
                </Carte>
                <Carte titre="Sources utilisées">
                  <ul className="space-y-1 text-[12px] text-zinc-600">
                    <li>Registre de la bourse : {nf.format(d.donnees.sources.registre)} fiches</li>
                    <li>Textes reçus de la Fonction Publique : {nf.format(d.donnees.sources.textes)} recrues</li>
                    <li>Affectation : la structure (lieu de service) de chaque fonctionnaire ou contractuel dans la base du personnel ; à défaut, les notes signées dans le système ({nf.format(d.donnees.sources.notesSignees)}) ou importées ({nf.format(d.donnees.sources.referencesNotes)})</li>
                    <li>Base du personnel : {nf.format(d.donnees.sources.personnelPaye)} fonctionnaires et contractuels, dont {nf.format(d.donnees.sources.personnelSansMatricule)} sans matricule</li>
                    <li>Fichiers de la Solde chargés (pointage du bottin) : {nf.format(d.donnees.sources.moisSolde)} mois</li>
                    <li className="text-zinc-400">Calculé le {new Date(d.donnees.calculeLe).toLocaleString("fr-FR")}</li>
                  </ul>
                </Carte>
              </div>
            </div>
          )}

          {vue === "liste" && (
            <Carte
              titre={`Liste nominative (${nf.format(d.donnees.total)})`}
              actions={<Saisie className="w-72" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Nom, n° de texte, de note, matricule…" />}
            >
              {situation && (
                <p className="mb-2 text-[12px] text-zinc-600">
                  Situation : <strong>{d.donnees.situations[situation]}</strong>{" "}
                  <button type="button" className="underline" onClick={() => changer(setSituation)("")}>
                    (toutes)
                  </button>
                </p>
              )}
              {!d.donnees.lignes.length ? (
                <Vide>Personne pour ces filtres.</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      <th>Nom et prénoms</th>
                      <th>Liste · département · cycle</th>
                      <th>Texte d’intégration <Aide>Arrêté ou décret qui fait entrer la personne dans la Fonction publique. Il peut manquer : le statut de fonctionnaire ou de contractuel suffit pour dire qu’elle est recrutée.</Aide></th>
                      <th>Affectation (où il travaille) <Aide>{MOTS.affecte}</Aide></th>
                      <th>Salaire <Aide>{MOTS.paye}</Aide></th>
                      <th>Bourse</th>
                      <th>Situation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.donnees.lignes.map((l) => (
                      <tr key={l.id} className="align-top">
                        <td className="font-medium">{l.nom}</td>
                        <td className="text-[12px] text-zinc-600">
                          {l.population === "COMMUNAUTAIRE" ? "Communautaire" : `Volontaire${l.vague ? ` · ${l.vague}e vague` : ""}`}
                          <br />
                          {l.departement} · {l.cycle}
                        </td>
                        <td className="text-[12px]">{l.texte ? <>{l.texte.nature} n° {l.texte.numero}{l.texte.date ? ` du ${l.texte.date}` : ""}</> : <span className="text-zinc-400">—</span>}</td>
                        <td className="text-[12px]">
                          {l.note ? (
                            <>
                              {l.note.lieu ?? <span className="text-or-700">structure à compléter</span>}
                              {l.note.departement && <div className="text-zinc-500">{l.note.departement}</div>}
                              {l.note.numero && <div className="text-zinc-400">note n° {l.note.numero}{l.note.date ? ` du ${l.note.date}` : ""}</div>}
                            </>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="text-[12px]">
                          {l.salaire ? (
                            <>
                              {l.salaire.statut === "CONTRACTUEL" ? "Contractuel" : "Fonctionnaire"}
                              {l.salaire.matricule ? ` · ${l.salaire.matricule}` : " · matricule manquant"}
                              {l.salaire.premierMois ? <><br />depuis {l.salaire.premierMois}</> : null}
                            </>
                          ) : l.piste ? (
                            <span className="text-or-700">à vérifier : {l.piste}</span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="text-[12px] text-zinc-600">{l.registre === "EN_POSTE" ? "en cours" : l.registre === "SORTI" ? <>{l.motifSortie}<br />dernier mois : {l.dernierMoisBourse}</> : "absent du registre"}</td>
                        <td>
                          <Badge ton={TON[l.situation] ?? "gris"}>{d.donnees!.situations[l.situation]}</Badge>
                          {l.aRegler.length > 0 && <div className="mt-1 text-[11px] text-rouge-600">{l.aRegler.join(" · ")}</div>}
                        </td>
                      </tr>
                    ))}
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
