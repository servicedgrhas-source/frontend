"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { categoriesDe, nf, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { SansLienRegistre } from "@/components/enrolement/sans-lien-registre";
import { CarteListe, type LigneParcours, ListePersonnelSuivi, ModaleParcours } from "@/components/enrolement/suivi-listes";
import { FraicheurCalcul } from "@/components/fraicheur-calcul";
import { useSession } from "@/components/session";
import { Aide, Alerte, Badge, Bouton, Carte, Chargement, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
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
  attente: number;
  reste: number;
  aVerifier: number;
}

type Ligne = LigneParcours;

/** Ce que sont devenues les fiches du registre : des chiffres qui s'additionnent (DG, 18/11/2026). */
interface Repartition {
  fiches: number;
  doublons: number;
  enPoste: { total: number; nonRecrutes: number; aVerifier: number; recrutes: number };
  sortis: { total: number; aVerifier: number; parMotif: { code: string; libelle: string; n: number; sansDate: number; du: string | null; au: string | null }[] };
  recrutes: { total: number; avecFiche: number; payes: number; attente: number; attenteSortisFP: number; sansFiche: number; sansFicheEnPoste: number };
}

interface Suivi {
  synthese: {
    total: Omit<Groupe, "libelle">;
    repartition: Repartition;
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
  etapes: Record<string, string>;
  page: number;
  taille: number;
  lignes: Ligne[];
  choix: { vagues: number[]; annees: string[] };
  situations: Record<string, string>;
  calculeLe: string;
  aJour: boolean;
  basePersonnel: { total: number; fonctionnaires: number; contractuels: number; payes: number; attente: number; avecStructure: number; sansStructure: number };
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
  registre: "Toutes les personnes payées au moins un mois en bourse : les volontaires (finalistes enrôlés) et les communautaires (recrutés autrefois par les écoles), qu’elles soient encore en poste ou déjà sorties.",
  recrute: "Devenu fonctionnaire ou contractuel. Son statut dans la base du personnel suffit, même si le texte manque. Comptent aussi : un arrêté ou un décret d’intégration reçu, ou une sortie de la bourse avec le motif « recruté à la Fonction publique ».",
  affecte: "Un fonctionnaire ou un contractuel est affecté : on l’a envoyé travailler dans un département et une structure (école, inspection, direction…). La structure vient de sa fiche du personnel (lieu de service). Pour une recrue qui n’est pas encore dans la base du personnel : une note d’affectation retrouvée.",
  paye: "A un matricule solde : la Solde lui paie son salaire.",
  attente: "Fonctionnaire ou contractuel sans matricule solde : recruté, mais son salaire n’est pas encore confirmé par la Solde. Le chiffre baisse quand le fichier de la Solde est chargé.",
  base: "Tous les fonctionnaires et contractuels de la base du personnel, qu’ils soient passés ou non par la bourse.",
  reste: "Encore en poste et payés en bourse : pas encore recrutés.",
  verifier: "Même nom qu’un fonctionnaire ou un contractuel, mais sans date de naissance pour être sûr que c’est la même personne. Pas compté : à confirmer.",
  retrouver: "Une personne de la bourse est retrouvée dans la base du personnel par le lien enregistré entre ses deux fiches, ou par le même nom et la même date de naissance.",
};

/** La couleur de la pastille d'une situation. */
const TON: Record<string, Ton> = {
  PAYE_AFFECTE: "vert",
  PAYE_SANS_NOTE: "vert",
  ATTENTE_MATRICULE: "jaune",
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
  const [vue, setVue] = useState<"synthese" | "liste" | "personnel" | "sansLien">("synthese");
  // La carte cliquée : une étape du parcours (liste nominative) ou un groupe de la base du personnel
  const [etape, setEtape] = useState("");
  const [groupe, setGroupe] = useState("tous");
  const [ouverte, setOuverte] = useState<Ligne | null>(null);
  const [par, setPar] = useState<"population" | "departement" | "cycle" | "annee">("population");
  const [erreur, setErreur] = useState<string | null>(null);
  const filtres = { population: population || undefined, departementId: departementId || undefined, categorie: categorie || undefined, vague: vague || undefined, annee: annee || undefined, situation: situation || undefined, aRegler: aRegler ? 1 : undefined, recherche: recherche.trim() || undefined };
  const d = useApi<Suivi>(`/enrolement/suivi-integration${qs({ ...filtres, etape: etape || undefined, page, taille: 50 })}`);
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
  const b = d.donnees?.basePersonnel ?? { total: 0, fonctionnaires: 0, contractuels: 0, payes: 0, attente: 0, avecStructure: 0, sansStructure: 0 };
  const groupes = s ? (par === "population" ? s.parPopulation : par === "departement" ? s.parDepartement : par === "cycle" ? s.parCycle : s.parAnnee) : [];
  const pages = d.donnees ? Math.max(1, Math.ceil(d.donnees.total / d.donnees.taille)) : 1;
  /** Ouvrir la liste d'une carte, et y descendre. */
  const descendre = () => setTimeout(() => document.getElementById("listes-suivi")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  const voirPersonnel = (g: string) => {
    setGroupe(g);
    setVue("personnel");
    descendre();
  };
  const voirEtape = (e: string) => {
    setEtape(e);
    setSituation("");
    setPage(1);
    setVue("liste");
    descendre();
  };

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
          <div><dt className="inline font-semibold">En attente de matricule : </dt><dd className="inline">{MOTS.attente}</dd></div>
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
        <Chargement texte="Préparation du suivi : tout le registre et toute la base du personnel sont rapprochés. Cela n’arrive qu’une fois : ensuite, la page s’ouvre tout de suite…" />
      ) : (
        <>
          <FraicheurCalcul calculeLe={d.donnees.calculeLe} aJour={d.donnees.aJour} recharger={d.recharger} />
          {/* 1. Toute la base du personnel */}
          <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-encre">
              1. Toute la base du personnel <Aide>{MOTS.base}</Aide>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CarteListe libelle="Fonctionnaires et contractuels" valeur={b.total} active={vue === "personnel" && groupe === "tous"} ouvrir={() => voirPersonnel("tous")} detail={`${nf.format(b.fonctionnaires)} fonctionnaires · ${nf.format(b.contractuels)} contractuels`} />
              <CarteListe libelle="Payés (matricule solde)" valeur={b.payes} ton="vert" active={vue === "personnel" && groupe === "payes"} ouvrir={() => voirPersonnel("payes")} detail={b.total ? `${Math.round((b.payes * 1000) / b.total) / 10} % : ont un salaire` : ""} />
              <CarteListe libelle="En attente de matricule" valeur={b.attente} ton="jaune" active={vue === "personnel" && groupe === "attente"} ouvrir={() => voirPersonnel("attente")} detail="recrutés, salaire pas encore confirmé" />
              <CarteListe libelle="Affectés, structure connue" valeur={b.avecStructure} ton="bleu" active={vue === "personnel" && groupe === "structure"} ouvrir={() => voirPersonnel("structure")} detail={`${nf.format(b.sansStructure)} avec une structure à compléter`} />
            </div>
          </section>

          {/* 2. Le registre de la bourse : chaque fiche comptée une fois, des chiffres qui s'additionnent */}
          <BlocRegistre r={s!.repartition} taux={s!.taux.integration} absents={s!.absentsRegistre} etape={vue === "liste" ? etape : ""} voir={voirEtape} />

          <div id="listes-suivi" className="scroll-mt-4">
            <Segments
              valeur={vue}
              changer={setVue}
              options={[
                { valeur: "synthese", libelle: "Synthèse" },
                { valeur: "liste", libelle: "Liste nominative" },
                { valeur: "personnel", libelle: "Base du personnel" },
                { valeur: "sansLien", libelle: "Fiches du personnel sans lien avec le registre" },
              ]}
            />
          </div>

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
                      <th className="text-right">Payés (matricule) <Aide>{MOTS.paye}</Aide></th>
                      <th className="text-right">En attente de matricule <Aide>{MOTS.attente}</Aide></th>
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
                        <td className="text-right tabular-nums text-or-700">{nf.format(g.attente)}</td>
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
                      <td className="text-right tabular-nums text-or-700">{nf.format(s!.total.attente)}</td>
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

          {/* Lecture seule : le traitement se fait dans la base du personnel */}
          {vue === "sansLien" && <SansLienRegistre />}

          {/* Les cartes « Toute la base du personnel » : liste en lecture seule */}
          {vue === "personnel" && <ListePersonnelSuivi groupe={groupe} changerGroupe={setGroupe} departementId={departementId} />}

          {vue === "liste" && (
            <Carte
              titre={`Liste nominative : ${nf.format(d.donnees.total)} personne(s)`}
              actions={<Saisie className="w-72" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Nom, n° de texte, de note, matricule…" />}
            >
              {etape && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="text-zinc-500">Étape du parcours :</span>
                  <span className="rounded-full bg-marque-50 px-3 py-1 font-medium text-marque-700">{d.donnees.etapes[etape] ?? etape}</span>
                  <button type="button" className="font-medium text-marque-700 hover:underline" onClick={() => { setEtape(""); setPage(1); }}>
                    retirer
                  </button>
                </div>
              )}
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
                      <tr key={l.id} className="cursor-pointer align-top hover:bg-zinc-50" onClick={() => setOuverte(l)}>
                        <td>
                          <button type="button" className="text-left font-medium text-marque-700 hover:underline">
                            {l.nom}
                          </button>
                        </td>
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
                              {l.salaire.matricule ? <> · {l.salaire.matricule}</> : <span className="text-or-700"> · en attente de matricule</span>}
                              {l.salaire.premierMois ? <><br />depuis {l.salaire.premierMois}</> : null}
                            </>
                          ) : l.piste ? (
                            <span className="text-or-700">à vérifier : {l.piste}</span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="min-w-[10rem] text-[12px] text-zinc-600">
                          {l.registre === "EN_POSTE" ? (
                            "en cours"
                          ) : l.registre === "SORTI" ? (
                            <>
                              <span className="font-medium text-zinc-800">Sorti : {l.motifSortie}</span>
                              <br />
                              {l.dateSortie ? `le ${l.dateSortie}` : <span className="text-or-700">date de sortie non écrite</span>}
                              <br />
                              dernier mois payé : {l.dernierMoisBourse}
                            </>
                          ) : (
                            "absent du registre"
                          )}
                        </td>
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
              {ouverte && <ModaleParcours l={ouverte} situation={d.donnees.situations[ouverte.situation]} ton={TON[ouverte.situation] ?? "gris"} fermer={() => setOuverte(null)} />}
            </Carte>
          )}
        </>
      )}
    </div>
  );
}

/** Une ligne cliquable d'un bloc : libellé, nombre, et la liste qui s'ouvre. */
function Detail({ libelle, n, sous, ton, active, ouvrir }: { libelle: React.ReactNode; n: number; sous?: React.ReactNode; ton?: string; active?: boolean; ouvrir?: () => void }) {
  const corps = (
    <>
      <span className="min-w-0">
        <span className={ton ?? "text-zinc-700"}>{libelle}</span>
        {sous && <span className="block text-[11px] text-zinc-500">{sous}</span>}
      </span>
      <span className="shrink-0 font-semibold tabular-nums">{nf.format(n)}</span>
    </>
  );
  return ouvrir ? (
    <button type="button" onClick={ouvrir} title="Voir la liste" className={`flex w-full items-start justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-[13px] hover:bg-zinc-50 ${active ? "bg-marque-50 ring-1 ring-marque-200" : ""}`}>
      {corps}
    </button>
  ) : (
    <div className="flex w-full items-start justify-between gap-3 px-2 py-1.5 text-[13px]">{corps}</div>
  );
}

/**
 * Le registre de la bourse, sans ambiguïté (DG, 18/11/2026) : chaque fiche est comptée une fois —
 * encore en bourse + sortis = total ; les sortis par motif avec leurs dates ; les recrutés, avec ou
 * sans fiche de fonctionnaire, payés ou en attente de matricule. Chaque ligne ouvre sa liste.
 */
function BlocRegistre({ r, taux, absents, etape, voir }: { r: Repartition; taux: number; absents: number; etape: string; voir: (e: string) => void }) {
  const periode = (m: Repartition["sortis"]["parMotif"][number]) =>
    [m.du ? (m.du === m.au ? `le ${m.du}` : `du ${m.du} au ${m.au}`) : "", m.sansDate ? `${nf.format(m.sansDate)} sans date de sortie` : ""].filter(Boolean).join(" · ");
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-semibold text-encre">
        2. Le registre de la bourse : ce que sont devenues les {nf.format(r.fiches)} fiches <Aide>{MOTS.registre}</Aide>
      </h2>
      <p className="text-[13px] text-zinc-600">
        Chaque fiche est comptée une seule fois : <strong>{nf.format(r.enPoste.total)}</strong> encore en bourse + <strong>{nf.format(r.sortis.total)}</strong> sorties ={" "}
        <strong>{nf.format(r.fiches)}</strong>.{" "}
        {r.doublons > 0 && (
          <>
            Parmi les sorties, {nf.format(r.doublons)} {r.doublons > 1 ? "fiches étaient des doublons" : "fiche était un doublon"} (la même personne inscrite deux fois) : le registre compte donc{" "}
            <strong>{nf.format(r.fiches - r.doublons)}</strong> personnes.
          </>
        )}{" "}
        Cliquez une ligne pour voir la liste.
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        <Carte titre={`Encore en bourse : ${nf.format(r.enPoste.total)}`}>
          <p className="-mt-1 mb-2 text-[12px] text-zinc-500">En poste et payés chaque mois en bourse.</p>
          <Detail libelle="Tous" n={r.enPoste.total} active={etape === "enposte"} ouvrir={() => voir("enposte")} />
          <Detail libelle="Pas encore recrutés" n={r.enPoste.nonRecrutes} sous="ni fonctionnaire, ni contractuel, ni texte reçu" />
          {r.enPoste.aVerifier > 0 && <Detail libelle="À vérifier" n={r.enPoste.aVerifier} ton="text-or-700" sous="même nom qu’un fonctionnaire, sans date de naissance pour être sûr" />}
          {r.enPoste.recrutes > 0 && <Detail libelle="Déjà recrutés, encore payés en bourse" n={r.enPoste.recrutes} ton="text-rouge-600" sous="texte reçu ou fonctionnaire : la bourse doit s’arrêter" />}
        </Carte>
        <Carte titre={`Sortis de la bourse : ${nf.format(r.sortis.total)}`}>
          <p className="-mt-1 mb-2 text-[12px] text-zinc-500">Ne sont plus payés en bourse. Le motif et la date de sortie de chacun sont dans la liste.</p>
          <Detail libelle="Tous les sortis" n={r.sortis.total} active={etape === "sortis"} ouvrir={() => voir("sortis")} />
          {r.sortis.parMotif.map((m) => (
            <Detail key={m.code} libelle={m.libelle} n={m.n} sous={periode(m)} ton={m.code === "RECRUTE_FP" ? "text-marque-700" : undefined} active={etape === `sorti:${m.code}`} ouvrir={() => voir(`sorti:${m.code}`)} />
          ))}
        </Carte>
        <Carte titre={`Recrutés : ${nf.format(r.recrutes.total)} (${taux} % du registre)`}>
          <p className="-mt-1 mb-2 text-[12px] text-zinc-500">{MOTS.recrute}</p>
          <Detail libelle="Tous les recrutés" n={r.recrutes.total} active={etape === "recrutes"} ouvrir={() => voir("recrutes")} />
          <Detail libelle="Devenus fonctionnaires ou contractuels (fiche du personnel)" n={r.recrutes.avecFiche} active={etape === "recrutes-fiche"} ouvrir={() => voir("recrutes-fiche")} />
          <div className="ml-4 border-l border-zinc-200 pl-2">
            <Detail libelle="Payés (matricule solde)" n={r.recrutes.payes} ton="text-marque-700" active={etape === "payes"} ouvrir={() => voir("payes")} />
            <Detail libelle="En attente de matricule" n={r.recrutes.attente} ton="text-or-700" sous="fiche de fonctionnaire sans matricule solde : salaire pas encore confirmé" active={etape === "attente"} ouvrir={() => voir("attente")} />
          </div>
          <Detail
            libelle="Pas encore dans la base du personnel"
            n={r.recrutes.sansFiche}
            sous={`texte d’intégration reçu ou sortie « recruté »${r.recrutes.sansFicheEnPoste ? ` · dont ${nf.format(r.recrutes.sansFicheEnPoste)} encore payés en bourse` : ""}`}
            active={etape === "recrutes-sans-fiche"}
            ouvrir={() => voir("recrutes-sans-fiche")}
          />
        </Carte>
      </div>
      {r.recrutes.attente > 0 && (
        <Alerte ton="jaune">
          <strong>Les {nf.format(r.recrutes.attente)} « en attente de matricule »</strong>
          {r.recrutes.attenteSortisFP === r.recrutes.attente
            ? " sont tous des volontaires ou communautaires sortis de la bourse avec le motif « recruté à la Fonction publique »."
            : r.recrutes.attenteSortisFP
              ? ` : ${nf.format(r.recrutes.attenteSortisFP)} sont sortis de la bourse avec le motif « recruté à la Fonction publique ».`
              : " sont passés de la bourse à une fiche de fonctionnaire ou de contractuel."} Leur fiche de fonctionnaire existe, mais elle n’a pas encore de matricule solde : leur salaire n’est pas encore confirmé par la Solde. Ce sont les mêmes personnes que la carte « En attente de matricule » de la base du personnel, au-dessus.
        </Alerte>
      )}
      {absents > 0 && (
        <p className="text-[12px] text-zinc-600">
          Hors du registre : <strong>{nf.format(absents)}</strong> recrue(s) des textes d’origine volontaire ou communautaire, introuvables dans le registre de la bourse (dans la liste nominative, situation « absent du registre »).
        </p>
      )}
    </section>
  );
}
