"use client";

import { Check, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Alerte, Bouton, Champ, ChoixMois, Liste, Modale } from "@/components/ui";
import { api, qs } from "@/lib/api";

interface Court {
  n: number;
  exemples: string[];
}

interface Feuille {
  nom: string;
  personnes: number;
  /** Feuille masquée dans Excel : souvent une ancienne version de la liste. */
  masquee: boolean;
}

interface PayeRetire {
  nom: string;
  ligne: number;
  departement: string | null;
  etablissement: string | null;
  cycle: string | null;
  montant: number;
  motifRetrait: string;
  ligneRetrait: number | null;
}

interface Rapport {
  essai: boolean;
  mois: string;
  feuille: string;
  lus: number;
  personnes: number;
  gardes: number;
  premierMoisAvance: number;
  reintegres: Court;
  nouveaux: Court;
  sortants: Court;
  sortantsParMotif: { motif: string; n: number }[];
  payesMaisRetires: Court;
  payesMaisRetiresDetail: PayeRetire[];
  doublonsDansListe: Court;
  plusieursFiches: Court;
  rapproches: Court;
  ambigus: Court;
  possibles: { paire: string; liste: string; registre: string; feuille: string; ligne: number }[];
  sansCategorie: Court;
  sansDepartement: Court;
  montantsDifferents: Court;
  montantListe: number;
}

const nf = new Intl.NumberFormat("fr-FR");
const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const moisCourant = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" }).slice(0, 7);
const libelleMois = (m: string) => new Date(`${m}-15`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

/** « Bourse Septembre 2026 Final.xlsx » → 2026-09 */
function moisDuNom(nom: string): string | null {
  const t = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const an = t.match(/(?<!\d)(20\d{2})(?!\d)/)?.[1];
  const i = MOIS.findIndex((m) => new RegExp(`(?<![a-z])${m}(?![a-z])`).test(t));
  return an && i >= 0 ? `${an}-${String(i + 1).padStart(2, "0")}` : null;
}

function ListeCourte({ titre, c, ton = "zinc", aide }: { titre: string; c: Court; ton?: "zinc" | "rouge" | "or"; aide?: string }) {
  if (!c.n) return null;
  return (
    <details className="rounded-xl bg-zinc-50 px-3 py-2 text-[12px]">
      <summary className={`cursor-pointer font-medium ${ton === "rouge" ? "text-rouge-600" : ton === "or" ? "text-or-700" : "text-zinc-700"}`}>
        {titre} ({nf.format(c.n)})
      </summary>
      {aide && <p className="mt-1 text-zinc-500">{aide}</p>}
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-zinc-600">
        {c.exemples.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
        {c.n > c.exemples.length && <li className="list-none text-zinc-400">… et {nf.format(c.n - c.exemples.length)} autre(s)</li>}
      </ul>
    </details>
  );
}

/**
 * Aligner le registre des volontaires sur la bourse payée d'un mois (DG, 12/11/2026 : septembre
 * d'abord, puis octobre). Les payés restent ou entrent ; ceux du registre qui ne sont plus payés
 * sortent, avec le motif lu dans la feuille des retraits. Vérifier d'abord, puis aligner.
 */
export function AlignerBourse({ fermer, apres }: { fermer: () => void; apres: () => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuilles, setFeuilles] = useState<Feuille[]>([]);
  const [feuille, setFeuille] = useState("");
  const [retraits, setRetraits] = useState("");
  const [mois, setMois] = useState(moisCourant());
  const [memes, setMemes] = useState<Set<string>>(new Set());
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [verifie, setVerifie] = useState("");
  const [accepteSorties, setAccepteSorties] = useState(false);

  const oublier = () => {
    setRapport(null);
    setFait(false);
    setAccepteSorties(false);
  };
  async function lire(f: File) {
    setErreur(null);
    setEnvoi(true);
    oublier();
    setMemes(new Set());
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = (await api.post<Feuille[]>("/enrolement/volontaires/analyse", fd)).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      setFichier(f);
      setFeuilles(r);
      // La liste payée : « Liste générale … » la plus longue, sinon la feuille la plus longue
      // Les feuilles masquées sont souvent d'anciennes versions (septembre 2026 : « Liste générale (2) »)
      const visibles = r.filter((x) => !x.masquee);
      const listes = (visibles.length ? visibles : r).filter((x) => !/retrait/i.test(x.nom));
      const generales = listes.filter((x) => /liste\s*g[ée]n[ée]rale/i.test(x.nom));
      const plusLongue = (t: Feuille[]) => t.reduce<Feuille | null>((a, x) => (!a || x.personnes > a.personnes ? x : a), null);
      setFeuille(plusLongue(generales.length ? generales : listes)?.nom ?? "");
      setRetraits((r.find((x) => /retrait/i.test(x.nom) && !x.masquee) ?? r.find((x) => /retrait/i.test(x.nom)))?.nom ?? "");
      const d = moisDuNom(f.name);
      if (d) setMois(d);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  async function envoyer(essai: boolean) {
    if (!fichier || !feuille) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      fd.append("memes", JSON.stringify([...memes]));
      const r = await api.post<Rapport>(`/enrolement/volontaires/aligner-bourse${qs({ mois, feuille, retraits: retraits || undefined, essai: essai ? 1 : 0 })}`, fd);
      setRapport(r);
      if (essai) setVerifie([...memes].sort().join("|"));
      else {
        setFait(true);
        apres();
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  const basculer = (paire: string) =>
    setMemes((s) => {
      const n = new Set(s);
      if (n.has(paire)) n.delete(paire);
      else n.add(paire);
      return n;
    });
  const aReverifier = !!rapport?.essai && verifie !== [...memes].sort().join("|");
  const avant = rapport ? rapport.gardes + rapport.sortants.n : 0;
  const beaucoupDeSorties = !!rapport?.essai && avant > 0 && rapport.sortants.n > Math.max(50, avant * 0.2);
  // Beaucoup de réintégrés : souvent une ancienne liste (feuille masquée) qui ramène des sortis
  const beaucoupDeReintegres = !!rapport?.essai && rapport.reintegres.n > Math.max(50, rapport.personnes * 0.1);
  const alerte = beaucoupDeSorties || beaucoupDeReintegres;
  const feuilleChoisie = feuilles.find((x) => x.nom === feuille);
  // Visibles d'abord, les masquées à la fin et signalées
  const options = [...feuilles.filter((x) => !x.masquee), ...feuilles.filter((x) => x.masquee)].map((x) => ({
    valeur: x.nom,
    libelle: `${x.nom} (${nf.format(x.personnes)})${x.masquee ? " — masquée" : ""}`,
  }));
  /** La liste des payés qui sont aussi dans les RETRAITS, à ouvrir dans Excel (CSV). */
  const telechargerRetires = (r: Rapport) => {
    const champ = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lignes = [
      ["N°", "Noms et prénoms", "Ligne (liste payée)", "Département", "Établissement", "Cycle", "Montant payé", "Motif du retrait", "Ligne (RETRAITS)"],
      ...r.payesMaisRetiresDetail.map((p, i) => [i + 1, p.nom, p.ligne, p.departement, p.etablissement, p.cycle, p.montant, p.motifRetrait, p.ligneRetrait]),
    ];
    // BOM : Excel lit les accents ; « ; » : séparateur d'Excel en français
    const csv = "﻿" + lignes.map((l) => l.map(champ).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `Payés mais dans RETRAITS - ${libelleMois(r.mois)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Modale titre="Aligner le registre sur la bourse d’un mois" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="leading-relaxed text-zinc-600">
          Le fichier de la bourse <strong>payée</strong> d’un mois (ex. « Bourse Septembre 2026 Final »). Ceux qui y sont <strong>restent</strong> (ou{" "}
          <strong>entrent</strong>, ou sont <strong>réintégrés</strong> s’ils étaient sortis) ; ceux du registre qui n’y sont plus <strong>sortent</strong> au 1er du
          mois, avec le motif de la feuille <strong>RETRAITS</strong> (salarié → recruté à la Fonction publique, non partant, déserteur…, sinon « Retiré par la
          DDEPPSA »). Faites les mois <strong>dans l’ordre</strong> : septembre, puis octobre. Commencez par <strong>Vérifier</strong> : rien n’est enregistré.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 px-4 py-3 hover:border-marque-300 hover:bg-zinc-50">
          <FileSpreadsheet className={`size-5 ${fichier ? "text-marque-600" : "text-zinc-400"}`} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{envoi && !feuilles.length ? "Lecture du fichier…" : fichier ? fichier.name : "Choisir le fichier de la bourse (.xlsx)"}</span>
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
          <div className="grid gap-3 md:grid-cols-2">
            <Champ libelle="Feuille des payés">
              <Liste
                value={feuille}
                onChange={(e) => {
                  setFeuille(e.target.value);
                  oublier();
                }}
                vide="Choisir…"
                options={options}
              />
            </Champ>
            <Champ libelle="Feuille des retraits (motifs)">
              <Liste
                value={retraits}
                onChange={(e) => {
                  setRetraits(e.target.value);
                  oublier();
                }}
                vide="Aucune"
                options={options}
              />
            </Champ>
            <Champ libelle="Mois payé" className="md:col-span-2 md:max-w-sm">
              <ChoixMois
                value={mois}
                onChange={(m) => {
                  setMois(m);
                  oublier();
                }}
              />
            </Champ>
          </div>
        )}
        {feuilleChoisie?.masquee && (
          <Alerte ton="jaune">
            La feuille « {feuilleChoisie.nom} » est <strong>masquée</strong> dans le fichier : c’est souvent une ancienne version de la liste. La liste payée est
            en général la feuille visible (ex. « Liste générale (3) »).
          </Alerte>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}

        {rapport && (
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <div className={`rounded-xl px-3 py-2 font-medium ${rapport.essai ? "bg-or-100/60 text-or-700" : "bg-marque-50 text-marque-700"}`}>
              {rapport.essai ? "Vérification — rien n’est encore enregistré." : `C’est fait : le registre est aligné sur la bourse de ${libelleMois(rapport.mois)}.`}
            </div>
            <p className="text-zinc-600">
              « {rapport.feuille} » : {nf.format(rapport.lus)} ligne(s) lue(s), <strong>{nf.format(rapport.personnes)}</strong> personne(s) payée(s)
              {rapport.doublonsDansListe.n ? ` (${rapport.doublonsDansListe.n} doublon(s) dans la liste, comptés une fois)` : ""}, pour{" "}
              <strong>{nf.format(rapport.montantListe)} FCFA</strong>.
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                ["Restent", rapport.gardes, "text-marque-700"],
                ["Entrent", rapport.nouveaux.n, "text-encre"],
                ["Réintégrés", rapport.reintegres.n, "text-encre"],
                ["Sortent", rapport.sortants.n, "text-rouge-600"],
              ].map(([t, n, c]) => (
                <div key={String(t)} className="rounded-xl bg-zinc-50 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{t}</div>
                  <div className={`text-lg font-semibold tabular-nums ${c}`}>{nf.format(Number(n))}</div>
                </div>
              ))}
            </div>
            {rapport.premierMoisAvance > 0 && (
              <p className="text-[12px] text-zinc-500">
                {nf.format(rapport.premierMoisAvance)} fiche(s) prennent {libelleMois(rapport.mois)} comme premier mois payé (elles commençaient plus tard).
              </p>
            )}
            {rapport.sortantsParMotif.length > 0 && (
              <p className="text-[12px] text-zinc-600">
                Motifs des sorties : {rapport.sortantsParMotif.map((x) => `${x.motif} ${nf.format(x.n)}`).join(" · ")}
              </p>
            )}

            {rapport.possibles.length > 0 && (
              <div className="space-y-2 rounded-xl bg-or-100/40 px-3 py-2">
                <div className="font-semibold text-or-700">
                  Noms proches à confirmer ({nf.format(rapport.possibles.length)}) : cochez ceux qui sont la même personne ; les autres entrent comme nouveaux et
                  l’ancienne fiche sort.
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
                      <input type="checkbox" className="mt-0.5 size-4 accent-marque-600" checked={memes.has(x.paire)} onChange={() => basculer(x.paire)} />
                      <span>
                        <strong>{x.liste}</strong> <span className="text-zinc-400">(bourse, ligne {x.ligne})</span>
                        <span className="mx-1.5 text-zinc-400">≈</span>
                        <strong>{x.registre}</strong> <span className="text-zinc-400">(registre)</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {rapport.payesMaisRetires.n > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rouge-100/50 px-3 py-2 text-[12px]">
                <span className="text-rouge-600">
                  <strong>{nf.format(rapport.payesMaisRetires.n)}</strong> payé(s) qui sont aussi dans la feuille des retraits : ils restent en poste, à vérifier
                  avec le service de la bourse.
                </span>
                <Bouton variante="discret" onClick={() => telechargerRetires(rapport)}>
                  <Download /> Télécharger la liste (Excel)
                </Bouton>
              </div>
            )}
            <ListeCourte
              titre="Payés mais aussi dans les RETRAITS (à vérifier)"
              c={rapport.payesMaisRetires}
              ton="rouge"
              aide="Ils sont sur la liste payée : ils restent en poste. Vérifiez auprès du service de la bourse s’ils devaient être retirés. La liste complète, avec le département, l’établissement et le motif du retrait : « Télécharger la liste »."
            />
            <ListeCourte titre="Sortent (plus payés)" c={rapport.sortants} ton="rouge" />
            <ListeCourte titre="Entrent (nouveaux)" c={rapport.nouveaux} />
            <ListeCourte titre="Réintégrés (étaient sortis)" c={rapport.reintegres} />
            <ListeCourte titre="Rapprochés automatiquement (nom écrit autrement)" c={rapport.rapproches} />
            <ListeCourte titre="Doublons dans la liste payée" c={rapport.doublonsDansListe} ton="or" />
            <ListeCourte titre="Plusieurs fiches pour un même nom" c={rapport.plusieursFiches} ton="or" />
            <ListeCourte titre="Plusieurs fiches proches (ajoutés comme nouveaux, à vérifier)" c={rapport.ambigus} ton="or" />
            <ListeCourte titre="Nouveaux sans cycle reconnu" c={rapport.sansCategorie} ton="or" />
            <ListeCourte titre="Nouveaux sans département reconnu" c={rapport.sansDepartement} ton="or" />
            <ListeCourte titre="Montant payé différent du barème" c={rapport.montantsDifferents} ton="or" />
            {alerte && (
              <div className="space-y-2 rounded-xl bg-rouge-100/60 px-3 py-2 text-rouge-600">
                <div className="font-semibold">
                  Attention :{" "}
                  {beaucoupDeSorties ? `${nf.format(rapport.sortants.n)} des ${nf.format(avant)} volontaires en poste sortiraient` : ""}
                  {beaucoupDeSorties && beaucoupDeReintegres ? " et " : ""}
                  {beaucoupDeReintegres ? `${nf.format(rapport.reintegres.n)} volontaires sortis seraient réintégrés` : ""}. Vérifiez que c’est le bon fichier, la
                  bonne feuille (pas une feuille masquée) et le bon mois.
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="size-4 accent-rouge-600" checked={accepteSorties} onChange={(e) => setAccepteSorties(e.target.checked)} />
                  Oui, c’est la bonne bourse : ces personnes ne sont plus payées
                </label>
              </div>
            )}
            {aReverifier && <Alerte>Vous avez coché des noms : vérifiez de nouveau pour voir les chiffres à jour avant d’aligner.</Alerte>}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>{fait ? "Fermer" : "Annuler"}</Bouton>
          {!fait && (
            <>
              <Bouton chargement={envoi && !!feuilles.length && !rapport?.essai} disabled={!fichier || !feuille || envoi} onClick={() => envoyer(true)}>
                <RefreshCw /> Vérifier
              </Bouton>
              <Bouton variante="principal" chargement={envoi && !!rapport?.essai} disabled={!rapport?.essai || envoi || aReverifier || (alerte && !accepteSorties)} onClick={() => envoyer(false)}>
                <Check /> Aligner pour de bon
              </Bouton>
            </>
          )}
        </div>
      </div>
    </Modale>
  );
}
