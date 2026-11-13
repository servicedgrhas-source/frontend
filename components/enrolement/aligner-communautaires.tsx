"use client";

import { Check, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { ListeCourte, moisDuNom } from "@/components/enrolement/aligner-bourse";
import { categoriesDe, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Champ, ChoixMois, Liste, Modale } from "@/components/ui";
import { api, qs } from "@/lib/api";

interface Court {
  n: number;
  exemples: string[];
}

interface Feuille {
  nom: string;
  personnes: number;
  masquee: boolean;
}

interface Nouveau {
  cle: string;
  nom: string;
  naissance: string | null;
  feuille: string;
  ligne: number;
  cycleBrut: string | null;
  etablissement: string | null;
  departementId: number | null;
  departement: string | null;
  depSource: "COLONNE" | "FEUILLE" | null;
  depPossibles: number[];
  categorie: string | null;
  categorieLibelle: string | null;
  ajouterParDefaut: boolean;
  ajouter: boolean;
  alertes: string[];
}

interface Rapport {
  essai: boolean;
  mois: string;
  feuilles: { nom: string; departements: string[]; personnes: number }[];
  lus: number;
  personnes: number;
  gardes: number;
  reintegres: Court;
  nouveaux: Nouveau[];
  ajoutes: number;
  incomplets: number;
  sortants: Court;
  sortantsParMotif: { motif: string; n: number }[];
  nonTouches: { n: number; parDepartement: Record<string, number> };
  plusTard: Court;
  fichesEnTrop: Court;
  parDepartement: { departement: string; avant: number; apres: number }[];
  parCycle: { libelle: string; avant: number; apres: number; taux: number }[];
  montantAvant: number;
  montantApres: number;
  payesMaisRetires: Court;
  payesMaisRetiresDetail: { nom: string; feuille: string; ligne: number; departement: string | null; etablissement: string | null; cycle: string | null; motifRetrait: string; ligneRetrait: number | null }[];
  doublonsDansListe: Court;
  plusieursFiches: Court;
  rapproches: Court;
  ambigus: Court;
  possibles: { paire: string; liste: string; registre: string; feuille: string; ligne: number }[];
  autreDepartement: Court;
  autreCycle: Court;
  fichesCompletees: number;
  completeesParChamp: Record<string, number>;
  completees: Court;
  premierMoisAvance: number;
}

/** Ce que l'agent a décidé pour un nouveau : l'ajouter ou non, son département, son cycle. */
type Choix = Record<string, { ajouter: boolean; departementId: number | null; categorie: string | null }>;

const nf = new Intl.NumberFormat("fr-FR");
const moisCourant = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" }).slice(0, 7);
const libelleMois = (m: string) => new Date(`${m}-15`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const jour = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
/** Feuilles d'un état de paiement : « ETAT DE PAIEMENT BOUENZA », « ETATS DE PAIEMENT … ». */
const estFeuilleEtat = (f: Feuille) => /^\s*[ÉE]TATS?\s+DE\s+PAIEMENT/i.test(f.nom) && !f.masquee;

/**
 * Aligner le registre des communautaires sur un état de paiement mis à jour (DG, 13/11/2026 :
 * « l'état des communautaires mis à jour, avec des ajouts »). Une feuille par département, lues
 * ensemble. Vérifier d'abord : chaque nouveau est montré avec son département et son cycle (à
 * corriger, ou à ne pas ajouter) ; puis aligner pour de bon.
 */
export function AlignerCommunautaires({ fermer, apres }: { fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const config = useConfigEnrolement();
  const categories = categoriesDe(config.donnees?.configuration, "COMMUNAUTAIRE");
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuilles, setFeuilles] = useState<Feuille[]>([]);
  const [cochees, setCochees] = useState<Set<string>>(new Set());
  const [retraits, setRetraits] = useState("");
  const [mois, setMois] = useState(moisCourant());
  const [memes, setMemes] = useState<Set<string>>(new Set());
  const [choix, setChoix] = useState<Choix>({});
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [verifie, setVerifie] = useState("");
  const [accepte, setAccepte] = useState(false);

  const oublier = () => {
    setRapport(null);
    setFait(false);
    setAccepte(false);
  };
  async function lire(f: File) {
    setErreur(null);
    setEnvoi(true);
    oublier();
    setMemes(new Set());
    setChoix({});
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = await api.post<Feuille[]>("/enrolement/volontaires/analyse", fd);
      setFichier(f);
      setFeuilles(r);
      setCochees(new Set(r.filter(estFeuilleEtat).map((x) => x.nom)));
      setRetraits((r.find((x) => /retrait/i.test(x.nom) && !x.masquee) ?? r.find((x) => /retrait/i.test(x.nom)))?.nom ?? "");
      const d = moisDuNom(f.name);
      if (d) setMois(d);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  // Ce qui est envoyé : les confirmations et les choix sur les nouveaux
  const corps = () => {
    const fd = new FormData();
    fd.append("fichier", fichier!);
    fd.append("feuilles", JSON.stringify([...cochees]));
    fd.append("memes", JSON.stringify([...memes]));
    fd.append("choix", JSON.stringify(choix));
    return fd;
  };
  // Les paires confirmées changent les rapprochements : il faut revérifier. Les choix sur les
  // nouveaux (ajouter, département, cycle) sont envoyés tels quels.
  const signature = () => [...memes].sort().join("|");
  async function envoyer(essai: boolean) {
    if (!fichier || !cochees.size) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Rapport>(`/enrolement/volontaires/aligner-communautaires${qs({ mois, retraits: retraits || undefined, essai: essai ? 1 : 0 })}`, corps());
      setRapport(r);
      if (essai) {
        // Les nouveaux : ce que le système propose, sauf ce que l'agent a déjà changé
        const suivant: Choix = {};
        for (const n of r.nouveaux) suivant[n.cle] = choix[n.cle] ?? { ajouter: n.ajouter, departementId: n.departementId, categorie: n.categorie };
        setChoix(suivant);
        setVerifie([...memes].sort().join("|"));
      } else {
        setFait(true);
        apres();
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  const basculerPaire = (paire: string) =>
    setMemes((s) => {
      const n = new Set(s);
      if (n.has(paire)) n.delete(paire);
      else n.add(paire);
      return n;
    });
  const changerChoix = (cle: string, x: Partial<Choix[string]>) => setChoix((c) => ({ ...c, [cle]: { ...c[cle], ...x } }));

  const aReverifier = !!rapport?.essai && verifie !== signature();
  // Les nouveaux cochés doivent avoir un département et un cycle
  const incomplets = useMemo(
    () => (rapport?.nouveaux ?? []).filter((n) => choix[n.cle]?.ajouter && (!choix[n.cle]?.departementId || !choix[n.cle]?.categorie)),
    [rapport, choix],
  );
  const nbAjouter = (rapport?.nouveaux ?? []).filter((n) => choix[n.cle]?.ajouter).length;
  const enPosteAvant = rapport ? rapport.parDepartement.reduce((t, d) => t + d.avant, 0) : 0;
  const beaucoup =
    !!rapport?.essai &&
    (rapport.sortants.n > Math.max(30, enPosteAvant * 0.05) || rapport.reintegres.n > Math.max(300, rapport.personnes * 0.05) || nbAjouter > Math.max(100, rapport.personnes * 0.05));
  const deps = refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }));
  const cats = categories.map((c) => ({ valeur: c.code, libelle: c.libelle }));
  const telechargerRetires = (r: Rapport) => {
    const champ = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lignes = [
      ["N°", "Noms et prénoms", "Feuille", "Ligne", "Département", "Établissement", "Cycle", "Motif du retrait", "Ligne (RETRAITS)"],
      ...r.payesMaisRetiresDetail.map((p, i) => [i + 1, p.nom, p.feuille, p.ligne, p.departement, p.etablissement, p.cycle, p.motifRetrait, p.ligneRetrait]),
    ];
    // BOM : Excel lit les accents ; « ; » : séparateur d'Excel en français
    const csv = "﻿" + lignes.map((l) => l.map(champ).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `Communautaires payés mais dans RETRAITS - ${libelleMois(r.mois)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Modale titre="Aligner les communautaires sur un état de paiement" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="leading-relaxed text-zinc-600">
          L’état de paiement mis à jour, <strong>une feuille par département</strong> (« ETAT DE PAIEMENT BOUENZA »…), lues ensemble. Ceux qui y sont{" "}
          <strong>restent</strong> (les cases vides de leur fiche sont complétées), sont <strong>réintégrés</strong> s’ils étaient sortis, ou sont{" "}
          <strong>ajoutés</strong> : vous voyez chaque nouveau, avec son département et son cycle, avant de l’ajouter. Ceux qui n’y sont plus{" "}
          <strong>sortent</strong> au 1er du mois (motif de la feuille RETRAITS), <strong>seulement dans les départements du fichier</strong>. Commencez par{" "}
          <strong>Vérifier</strong> : rien n’est enregistré.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 px-4 py-3 hover:border-marque-300 hover:bg-zinc-50">
          <FileSpreadsheet className={`size-5 ${fichier ? "text-marque-600" : "text-zinc-400"}`} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{envoi && !feuilles.length ? "Lecture du fichier…" : fichier ? fichier.name : "Choisir l’état de paiement des communautaires (.xlsx)"}</span>
            <span className="block text-[11px] text-zinc-400">Toutes les feuilles sont lues, même masquées</span>
          </span>
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void lire(f);
              e.target.value = "";
            }}
          />
        </label>

        {feuilles.length > 0 && (
          <>
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  Feuilles de l’état ({cochees.size} cochée{cochees.size > 1 ? "s" : ""}, {nf.format(feuilles.filter((f) => cochees.has(f.nom)).reduce((t, f) => t + f.personnes, 0))} lignes)
                </span>
                <span className="flex gap-2 text-[12px]">
                  <Bouton
                    variante="discret"
                    onClick={() => {
                      setCochees(new Set(feuilles.filter(estFeuilleEtat).map((x) => x.nom)));
                      oublier();
                    }}
                  >
                    Les « État de paiement »
                  </Bouton>
                  <Bouton
                    variante="discret"
                    onClick={() => {
                      setCochees(new Set());
                      oublier();
                    }}
                  >
                    Tout décocher
                  </Bouton>
                </span>
              </div>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {[...feuilles.filter((f) => !f.masquee), ...feuilles.filter((f) => f.masquee)]
                  .filter((f) => f.nom !== retraits)
                  .map((f) => (
                    <label key={f.nom} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-white ${f.masquee ? "text-zinc-400" : ""}`}>
                      <input
                        type="checkbox"
                        className="size-4 accent-marque-600"
                        checked={cochees.has(f.nom)}
                        onChange={() => {
                          setCochees((s) => {
                            const n = new Set(s);
                            if (n.has(f.nom)) n.delete(f.nom);
                            else n.add(f.nom);
                            return n;
                          });
                          oublier();
                        }}
                      />
                      <span className="truncate" title={f.nom}>
                        {f.nom} <span className="text-zinc-400">({nf.format(f.personnes)}){f.masquee ? " — masquée" : ""}</span>
                      </span>
                    </label>
                  ))}
              </div>
              {feuilles.some((f) => cochees.has(f.nom) && !estFeuilleEtat(f)) && (
                <p className="mt-2 text-[12px] text-or-700">
                  Une feuille cochée n’est pas un « État de paiement » (ex. une compilation ou une ancienne liste) : ses personnes seraient comptées aussi.
                </p>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Champ libelle="Feuille des retraits (motifs des sorties)">
                <Liste
                  value={retraits}
                  onChange={(e) => {
                    setRetraits(e.target.value);
                    setCochees((s) => {
                      const n = new Set(s);
                      n.delete(e.target.value);
                      return n;
                    });
                    oublier();
                  }}
                  vide="Aucune"
                  options={feuilles.map((x) => ({ valeur: x.nom, libelle: `${x.nom} (${nf.format(x.personnes)})${x.masquee ? " — masquée" : ""}` }))}
                />
              </Champ>
              <Champ libelle="Mois de l’état">
                <ChoixMois
                  value={mois}
                  onChange={(m) => {
                    setMois(m);
                    oublier();
                  }}
                />
              </Champ>
            </div>
          </>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}

        {rapport && (
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <div className={`rounded-xl px-3 py-2 font-medium ${rapport.essai ? "bg-or-100/60 text-or-700" : "bg-marque-50 text-marque-700"}`}>
              {rapport.essai ? "Vérification — rien n’est encore enregistré." : `C’est fait : les communautaires suivent l’état de ${libelleMois(rapport.mois)}.`}
            </div>
            <p className="text-zinc-600">
              {rapport.feuilles.length} feuille(s), {nf.format(rapport.lus)} ligne(s) : <strong>{nf.format(rapport.personnes)}</strong> personne(s)
              {rapport.doublonsDansListe.n ? ` (${rapport.doublonsDansListe.n} doublon(s) de l’état, comptés une fois)` : ""}.{" "}
              {rapport.feuilles.some((f) => f.departements.length !== 1) && (
                <span className="text-or-700">
                  Feuilles de plusieurs départements :{" "}
                  {rapport.feuilles
                    .filter((f) => f.departements.length !== 1)
                    .map((f) => `${f.nom} (${f.departements.join(" + ") || "département inconnu"})`)
                    .join(" ; ")}
                  .
                </span>
              )}
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                ["Restent", rapport.gardes, "text-marque-700"],
                ["Réintégrés", rapport.reintegres.n, "text-encre"],
                [`Nouveaux (${nbAjouter} à ajouter)`, rapport.nouveaux.length, "text-encre"],
                ["Sortent", rapport.sortants.n, "text-rouge-600"],
              ].map(([t, n, c]) => (
                <div key={String(t)} className="rounded-xl bg-zinc-50 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{t}</div>
                  <div className={`text-lg font-semibold tabular-nums ${c}`}>{nf.format(Number(n))}</div>
                </div>
              ))}
            </div>
            {(rapport.fichesCompletees > 0 || rapport.premierMoisAvance > 0) && (
              <p className="text-[12px] text-zinc-600">
                {rapport.fichesCompletees > 0 &&
                  `${nf.format(rapport.fichesCompletees)} fiche(s) aux cases vides complétées d’après l’état (${Object.entries(rapport.completeesParChamp)
                    .map(([k, n]) => `${k} ${nf.format(n)}`)
                    .join(", ")} ; rien d’autre n’est changé). `}
                {rapport.premierMoisAvance > 0 &&
                  `${nf.format(rapport.premierMoisAvance)} fiche(s) prennent ${libelleMois(rapport.mois)} comme premier mois payé (elles commençaient plus tard).`}
              </p>
            )}
            {rapport.sortantsParMotif.length > 0 && (
              <p className="text-[12px] text-zinc-600">Motifs des sorties : {rapport.sortantsParMotif.map((x) => `${x.motif} ${nf.format(x.n)}`).join(" · ")}</p>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-1 font-medium">Département</th>
                    <th className="py-1 pl-3 text-right font-medium">En poste</th>
                    <th className="py-1 pl-3 text-right font-medium">Avec l’état</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.parDepartement.map((d) => (
                    <tr key={d.departement} className="border-t border-zinc-100">
                      <td className="py-0.5">{d.departement}</td>
                      <td className="py-0.5 pl-3 text-right tabular-nums">{nf.format(d.avant)}</td>
                      <td className={`py-0.5 pl-3 text-right tabular-nums ${d.apres !== d.avant ? "font-semibold text-or-700" : ""}`}>{nf.format(d.apres)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-1 font-medium">Cycle</th>
                    <th className="py-1 pl-3 text-right font-medium">En poste</th>
                    <th className="py-1 pl-3 text-right font-medium">Avec l’état</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.parCycle.map((c) => (
                    <tr key={c.libelle} className="border-t border-zinc-100">
                      <td className="py-0.5">{c.libelle}</td>
                      <td className="py-0.5 pl-3 text-right tabular-nums">{nf.format(c.avant)}</td>
                      <td className={`py-0.5 pl-3 text-right tabular-nums ${c.apres !== c.avant ? "font-semibold text-or-700" : ""}`}>{nf.format(c.apres)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-zinc-200 font-semibold">
                    <td className="py-1">Montant mensuel (barème)</td>
                    <td className="py-1 pl-3 text-right tabular-nums">{nf.format(rapport.montantAvant)}</td>
                    <td className="py-1 pl-3 text-right tabular-nums">{nf.format(rapport.montantApres)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {rapport.possibles.length > 0 && (
              <div className="space-y-2 rounded-xl bg-or-100/40 px-3 py-2">
                <div className="font-semibold text-or-700">
                  Noms proches à confirmer ({nf.format(rapport.possibles.length)}) : cochez ceux qui sont la même personne ; les autres sont des nouveaux, et l’ancienne
                  fiche sort.
                </div>
                <div className="flex flex-wrap gap-2 text-[12px]">
                  <Bouton variante="discret" onClick={() => setMemes(new Set(rapport.possibles.map((x) => x.paire)))}>
                    Tout cocher
                  </Bouton>
                  <Bouton variante="discret" onClick={() => setMemes(new Set())}>
                    Tout décocher
                  </Bouton>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1 text-[12px]">
                  {rapport.possibles.map((x) => (
                    <label key={x.paire} className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-2 py-1.5 hover:bg-zinc-50">
                      <input type="checkbox" className="mt-0.5 size-4 accent-marque-600" checked={memes.has(x.paire)} onChange={() => basculerPaire(x.paire)} />
                      <span>
                        <strong>{x.liste}</strong> <span className="text-zinc-400">(« {x.feuille} », ligne {x.ligne})</span>
                        <span className="mx-1.5 text-zinc-400">≈</span>
                        <strong>{x.registre}</strong> <span className="text-zinc-400">(registre)</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {rapport.nouveaux.length > 0 && (
              <div className="space-y-2 rounded-xl bg-sky-50/70 px-3 py-2 ring-1 ring-sky-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-sky-800">
                    Nouveaux : {nf.format(rapport.nouveaux.length)} sur l’état mais pas dans le registre — {nbAjouter} coché(s) pour être ajouté(s)
                  </span>
                  <span className="flex gap-2 text-[12px]">
                    <Bouton variante="discret" onClick={() => setChoix((c) => Object.fromEntries(Object.entries(c).map(([k, x]) => [k, { ...x, ajouter: true }])))}>
                      Tout cocher
                    </Bouton>
                    <Bouton variante="discret" onClick={() => setChoix((c) => Object.fromEntries(Object.entries(c).map(([k, x]) => [k, { ...x, ajouter: false }])))}>
                      Tout décocher
                    </Bouton>
                  </span>
                </div>
                <p className="text-[12px] text-sky-800/80">
                  Vérifiez le département et le cycle de chacun (ils fixent le paiement). Ceux qui sont déjà fonctionnaires, contractuels ou volontaires ne sont pas
                  cochés : cochez-les seulement si c’est voulu.
                </p>
                <div className="max-h-96 overflow-auto rounded-lg bg-white ring-1 ring-sky-100">
                  <table className="w-full table-fixed text-[12px]">
                    <colgroup>
                      <col className="w-8" />
                      <col />
                      <col className="w-[30%]" />
                      <col className="w-[30%]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="text-left text-zinc-500">
                        <th className="w-8 px-2 py-1.5" />
                        <th className="px-2 py-1.5 font-medium">Nom et prénoms</th>
                        <th className="px-2 py-1.5 font-medium">Département</th>
                        <th className="px-2 py-1.5 font-medium">Cycle (paiement)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapport.nouveaux.map((n) => {
                        const c = choix[n.cle] ?? { ajouter: n.ajouter, departementId: n.departementId, categorie: n.categorie };
                        const manque = c.ajouter && (!c.departementId || !c.categorie);
                        return (
                          <tr key={n.cle} className={`border-t border-zinc-100 align-top ${!c.ajouter ? "opacity-60" : manque ? "bg-rouge-100/40" : ""}`}>
                            <td className="px-2 py-1.5">
                              <input type="checkbox" className="size-4 accent-marque-600" checked={c.ajouter} onChange={(e) => changerChoix(n.cle, { ajouter: e.target.checked })} aria-label={`Ajouter ${n.nom}`} />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="font-medium">{n.nom}</div>
                              <div className="text-zinc-400">
                                né(e) le {jour(n.naissance)} · « {n.feuille} », ligne {n.ligne}
                              </div>
                              {n.etablissement && <div className="text-zinc-500">{n.etablissement}</div>}
                              {n.alertes.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {n.alertes.map((a) => (
                                    <Badge key={a} ton={/^Déjà/.test(a) ? "rouge" : "jaune"}>
                                      {a}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <Liste
                                className="w-full py-1.5! text-[12px]!"
                                value={String(c.departementId ?? "")}
                                onChange={(e) => changerChoix(n.cle, { departementId: e.target.value ? Number(e.target.value) : null })}
                                vide="Choisir…"
                                options={n.depPossibles.length > 1 ? [...deps.filter((d) => n.depPossibles.includes(d.valeur)), ...deps.filter((d) => !n.depPossibles.includes(d.valeur))] : deps}
                              />
                              <div className="mt-0.5 text-[11px] text-zinc-400">
                                {n.depSource === "COLONNE" ? "d’après la colonne « Département »" : n.depSource === "FEUILLE" ? "d’après le nom de la feuille" : "à choisir"}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <Liste
                                className="w-full py-1.5! text-[12px]!"
                                value={c.categorie ?? ""}
                                onChange={(e) => changerChoix(n.cle, { categorie: e.target.value || null })}
                                vide="Choisir…"
                                options={cats}
                              />
                              <div className="mt-0.5 text-[11px] text-zinc-400">sur l’état : « {n.cycleBrut ?? "vide"} »</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rapport.payesMaisRetires.n > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rouge-100/50 px-3 py-2 text-[12px]">
                <span className="text-rouge-600">
                  <strong>{nf.format(rapport.payesMaisRetires.n)}</strong> sur l’état qui sont aussi dans la feuille des retraits : ils restent (ou reviennent), à
                  vérifier.
                </span>
                <Bouton variante="discret" onClick={() => telechargerRetires(rapport)}>
                  <Download /> Télécharger la liste (Excel)
                </Bouton>
              </div>
            )}
            <ListeCourte titre="Plus de fiches en poste que de lignes sur l’état (risque de double paiement)" c={rapport.fichesEnTrop} ton="rouge" aide="Un même nom a plusieurs fiches en poste, mais moins de lignes sur l’état : c’est peut-être un doublon du registre (Contrôle › Doublons probables), ou des homonymes. Rien n’est décidé ici." />
            <ListeCourte titre="Réintégrés (étaient sortis)" c={rapport.reintegres} />
            <ListeCourte titre="Fiches complétées (cases vides seulement)" c={rapport.completees} />
            <ListeCourte titre="Sortent (plus sur l’état)" c={rapport.sortants} ton="rouge" />
            <ListeCourte titre="Pas sur l’état, mais payés seulement à partir d’un mois suivant : pas touchés" c={rapport.plusTard} />
            {rapport.nonTouches.n > 0 && (
              <p className="rounded-xl bg-zinc-50 px-3 py-2 text-[12px] text-zinc-600">
                {nf.format(rapport.nonTouches.n)} en poste dans des départements absents du fichier ne sont pas touchés :{" "}
                {Object.entries(rapport.nonTouches.parDepartement)
                  .map(([d, n]) => `${d} ${n}`)
                  .join(" · ")}
                .
              </p>
            )}
            <ListeCourte titre="Département différent entre le registre et l’état (signalé, pas changé)" c={rapport.autreDepartement} ton="or" />
            <ListeCourte titre="Cycle différent entre le registre et l’état (signalé, pas changé)" c={rapport.autreCycle} ton="or" />
            <ListeCourte titre="Doublons de l’état (même nom et même date, comptés une fois)" c={rapport.doublonsDansListe} ton="or" />
            <ListeCourte titre="Rapprochés automatiquement (nom écrit autrement)" c={rapport.rapproches} />
            <ListeCourte titre="Plusieurs fiches proches (ajoutés comme nouveaux, à vérifier)" c={rapport.ambigus} ton="or" />
            <ListeCourte titre="Noms portés par plusieurs fiches du registre" c={rapport.plusieursFiches} />

            {beaucoup && (
              <div className="space-y-2 rounded-xl bg-rouge-100/60 px-3 py-2 text-rouge-600">
                <div className="font-semibold">
                  Attention : beaucoup de changements ({nf.format(rapport.sortants.n)} sorties, {nf.format(rapport.reintegres.n)} réintégrations, {nbAjouter} ajouts).
                  Vérifiez que c’est le bon fichier, les bonnes feuilles et le bon mois.
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="size-4 accent-rouge-600" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
                  Oui, c’est le bon état de paiement
                </label>
              </div>
            )}
            {incomplets.length > 0 && <Alerte>{incomplets.length} nouveau(x) coché(s) sans département ou sans cycle : choisissez-les, ou décochez-les.</Alerte>}
            {aReverifier && <Alerte ton="jaune">Vous avez coché des noms proches : vérifiez de nouveau pour voir les chiffres à jour avant d’aligner.</Alerte>}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>{fait ? "Fermer" : "Annuler"}</Bouton>
          {!fait && (
            <>
              <Bouton chargement={envoi && !!feuilles.length && !rapport?.essai} disabled={!fichier || !cochees.size || envoi} onClick={() => envoyer(true)}>
                <RefreshCw /> Vérifier
              </Bouton>
              <Bouton
                variante="principal"
                chargement={envoi && !!rapport?.essai}
                disabled={!rapport?.essai || envoi || aReverifier || incomplets.length > 0 || (beaucoup && !accepte)}
                onClick={() => envoyer(false)}
              >
                <Check /> Aligner pour de bon
              </Bouton>
            </>
          )}
        </div>
      </div>
    </Modale>
  );
}
