"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { categoriesDe, nf, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
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
  note: { numero: string; date: string | null; lieu: string | null; source: string } | null;
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
        sousTitre="Pour chaque volontaire et communautaire, du registre de la bourse au salaire : le texte d’intégration (arrêté ou décret), la note d’affectation, la prise en charge de la solde et la fin de la bourse. « Payé » : un matricule solde, ou le statut de fonctionnaire ou de contractuel. Un rapprochement par le seul nom (sans date de naissance) n’est jamais compté : il est « à vérifier »."
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
            <Chiffre libelle="Recrutés" valeur={nf.format(s!.total.recrutes)} ton="bleu" detail={`${s!.taux.integration} % du registre (texte, salaire ou sortie « recruté »)`} />
            <Chiffre libelle="Affectés" valeur={nf.format(s!.total.affectes)} ton="bleu" detail={`${s!.taux.affectation} % des recrutés (note retrouvée)`} />
            <Chiffre libelle="Payés (salaire)" valeur={nf.format(s!.total.payes)} ton="vert" detail={`${s!.taux.priseEnCharge} % des recrutés (matricule ou statut)`} />
            <Chiffre libelle="Reste à intégrer" valeur={nf.format(s!.total.reste)} ton="rouge" detail="en poste, pas encore recrutés" />
          </div>
          {(s!.total.aVerifier > 0 || s!.absentsRegistre > 0) && (
            <p className="text-[12px] text-zinc-600">
              {s!.total.aVerifier > 0 && <>De plus, <strong>{nf.format(s!.total.aVerifier)}</strong> peut-être déjà recruté(s) : même nom dans la base du personnel ou dans les textes, sans date de naissance pour le confirmer (à vérifier, non comptés). </>}
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
            <div className="grid gap-6 lg:grid-cols-3">
              <Carte titre="Le parcours, en détail" className="lg:col-span-2">
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
                      <th className="text-right">Registre</th>
                      <th className="text-right">Recrutés</th>
                      <th className="text-right">Affectés</th>
                      <th className="text-right">Payés</th>
                      <th className="text-right">Reste à intégrer</th>
                      <th className="text-right">À vérifier</th>
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
              <div className="space-y-6">
                <Carte titre="Par situation">
                  <div className="space-y-1.5 text-[13px]">
                    {s!.parSituation.filter((x) => x.n).map((x) => (
                      <button
                        type="button"
                        key={x.code}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-zinc-50"
                        onClick={() => {
                          setSituation(x.code);
                          setVue("liste");
                          setPage(1);
                        }}
                        title="Voir ces personnes"
                      >
                        <Badge ton={TON[x.code] ?? "gris"}>{x.libelle}</Badge>
                        <span className="tabular-nums font-semibold">{nf.format(x.n)}</span>
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
                          <span className="tabular-nums font-semibold">{nf.format(x.n)}</span>
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
                    <li>Notes d’affectation signées dans le système : {nf.format(d.donnees.sources.notesSignees)} · références importées : {nf.format(d.donnees.sources.referencesNotes)}</li>
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
                      <th>Texte d’intégration</th>
                      <th>Note d’affectation</th>
                      <th>Salaire</th>
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
                        <td className="text-[12px]">{l.note ? <>n° {l.note.numero}{l.note.date ? ` du ${l.note.date}` : ""}{l.note.lieu ? <><br />{l.note.lieu}</> : null}</> : <span className="text-zinc-400">—</span>}</td>
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
