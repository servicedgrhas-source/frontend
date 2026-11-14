"use client";

import { Check, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { ListeCourte, moisDuNom } from "@/components/enrolement/aligner-bourse";
import { categoriesDe, type Population, useConfigEnrolement } from "@/components/enrolement/volontaires";
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

interface Absent {
  cle: string;
  nom: string;
  feuille: string;
  ligne: number;
  naissance: string | null;
  cycle: string | null;
  categorie: string | null;
  departementId: number | null;
  departement: string | null;
  etablissement: string | null;
  montant: number;
  propose: boolean;
  /** Nom d'un seul mot, même nom qu'une autre ligne de l'état : jamais proposé, l'agent décide. */
  alertes: string[];
}

interface Rapport {
  essai: boolean;
  mois: string;
  population: Population;
  feuilles: string[];
  lus: number;
  montantFichier: number;
  sansNom: Court & { montant: number };
  doublons: Court;
  retrouves: number;
  dejaPayables: number;
  avances: { n: number; exemples: string[] };
  sortiesReportees: Court;
  nouveaux: Absent[];
  ajoutes: number;
  motifNouveaux: string;
  possibles: { paire: string; liste: string; registre: string; feuille: string; ligne: number }[];
  rapproches: Court;
  ambigus: Court;
  plusieursFiches: Court;
  montantsDifferents: Court;
  prevision: { effectif: number; montantFichierRetrouves: number };
}

type Choix = Record<string, { ajouter: boolean; departementId: number | null; categorie: string | null }>;

const nf = new Intl.NumberFormat("fr-FR");
const libelleMois = (m: string) => new Date(`${m}-15`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const jour = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
/** La feuille à reprendre par défaut : la compilation (communautaires) ou la liste générale visible (volontaires). */
const feuillesParDefaut = (r: Feuille[], population: Population) => {
  const visibles = r.filter((x) => !x.masquee);
  const choisie =
    population === "COMMUNAUTAIRE"
      ? (visibles.find((x) => /COMPILATION\s+TRAIT/i.test(x.nom)) ?? visibles.find((x) => /COMPILATION/i.test(x.nom)))
      : [...visibles].filter((x) => /^\s*liste\s+g[ée]n[ée]rale/i.test(x.nom)).sort((a, b) => b.personnes - a.personnes)[0];
  return choisie ? [choisie.nom] : [];
};

/**
 * Reprendre un mois déjà payé par le DG avant le système (14/11/2026 : « on devait aussi payer
 * août »). Le registre apprend qui était payé ce mois-là sans que la situation d'aujourd'hui bouge :
 * pas de sortie, pas de réintégration. Vérifier d'abord, puis reprendre pour de bon, puis préparer
 * l'état de ce mois dans Paiement mensuel (et le faire valider avant les mois suivants).
 */
export function ReprendreMois({ population, fermer, apres }: { population: Population; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const config = useConfigEnrolement();
  const c = config.donnees?.configuration;
  const categories = categoriesDe(c, population);
  const motifs = (c?.motifsSortie ?? []).filter((m) => m.actif);
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuilles, setFeuilles] = useState<Feuille[]>([]);
  const [cochees, setCochees] = useState<Set<string>>(new Set());
  const [mois, setMois] = useState("2026-08");
  const [motif, setMotif] = useState("RETIRE_DDEPPSA");
  const [memes, setMemes] = useState<Set<string>>(new Set());
  const [choix, setChoix] = useState<Choix>({});
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [verifie, setVerifie] = useState("");
  const liste = population === "COMMUNAUTAIRE" ? "communautaires" : "volontaires";

  const oublier = () => {
    setRapport(null);
    setFait(false);
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
      setCochees(new Set(feuillesParDefaut(r, population)));
      const d = moisDuNom(f.name);
      if (d) setMois(d);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  const signature = () => [...memes].sort().join("|");
  async function envoyer(essai: boolean) {
    if (!fichier || !cochees.size) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      fd.append("feuilles", JSON.stringify([...cochees]));
      fd.append("memes", JSON.stringify([...memes]));
      fd.append("choix", JSON.stringify(choix));
      fd.append("motif", motif);
      const r = await api.post<Rapport>(`/enrolement/volontaires/reprendre-mois${qs({ mois, population, essai: essai ? 1 : 0 })}`, fd);
      setRapport(r);
      if (essai) {
        const suivant: Choix = {};
        for (const n of r.nouveaux) suivant[n.cle] = choix[n.cle] ?? { ajouter: n.propose, departementId: n.departementId, categorie: n.categorie };
        setChoix(suivant);
        setVerifie(signature());
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
  const changerChoix = (cle: string, x: Partial<Choix[string]>) => setChoix((s) => ({ ...s, [cle]: { ...s[cle], ...x } }));
  const basculerPaire = (paire: string) =>
    setMemes((s) => {
      const n = new Set(s);
      if (n.has(paire)) n.delete(paire);
      else n.add(paire);
      return n;
    });
  const aReverifier = !!rapport?.essai && verifie !== signature();
  const incomplets = useMemo(() => (rapport?.nouveaux ?? []).filter((n) => choix[n.cle]?.ajouter && (!choix[n.cle]?.departementId || !choix[n.cle]?.categorie)), [rapport, choix]);
  const nbAjouter = (rapport?.nouveaux ?? []).filter((n) => choix[n.cle]?.ajouter).length;
  const deps = refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }));
  const cats = categories.map((x) => ({ valeur: x.code, libelle: x.libelle }));
  const plusieursSortes = population === "COMMUNAUTAIRE" && [...cochees].some((n) => /COMPILATION/i.test(n)) && [...cochees].some((n) => /ETATS?\s+DE\s+PAIEMENT/i.test(n));

  return (
    <Modale titre={`Reprendre un mois déjà payé (${liste})`} ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="leading-relaxed text-zinc-600">
          Pour un mois que le DG a payé <strong>avant</strong> le système (août 2026) : le registre apprend qui était payé ce mois-là.{" "}
          <strong>Personne ne sort, personne n’est réintégré</strong> : les mois suivants ne bougent pas. Ceux de l’état qui commençaient plus tard commencent à ce
          mois ; un sorti avant ce mois mais payé par le DG garde son motif, sa sortie passe au 1er du mois suivant ; un absent du registre est ajouté{" "}
          <strong>payé ce mois seulement</strong>, si vous le cochez. Commencez par <strong>Vérifier</strong> : rien n’est enregistré.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 px-4 py-3 hover:border-marque-300 hover:bg-zinc-50">
          <FileSpreadsheet className={`size-5 ${fichier ? "text-marque-600" : "text-zinc-400"}`} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{envoi && !feuilles.length ? "Lecture du fichier…" : fichier ? fichier.name : `Choisir l’état de paiement des ${liste} de ce mois (.xlsx)`}</span>
            <span className="block text-[11px] text-zinc-400">
              {population === "COMMUNAUTAIRE" ? "Ex. « ETATS DE PAIEMENT DES ENSEIGNANTS COMMUNAUTAIRES AOUT 2026 II.xlsx »" : "Ex. « Bourse Août 2026 Final.xlsx »"}
            </span>
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
              <div className="mb-2 font-medium">
                Feuille(s) de l’état ({cochees.size} cochée{cochees.size > 1 ? "s" : ""}, {nf.format(feuilles.filter((f) => cochees.has(f.nom)).reduce((t, f) => t + f.personnes, 0))} lignes)
              </div>
              <p className="mb-2 text-[12px] text-zinc-500">
                {population === "COMMUNAUTAIRE"
                  ? "La « COMPILATION TRAITEE » contient tout l’état. Ne cochez pas en plus les feuilles des départements : chaque personne serait lue deux fois."
                  : "La liste générale du mois (ex. « Liste générale (3) », période « AOÛT 2026 »). Les feuilles des départements répètent les mêmes personnes."}
              </p>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {[...feuilles.filter((f) => !f.masquee), ...feuilles.filter((f) => f.masquee)].map((f) => (
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
              {plusieursSortes && <p className="mt-2 text-[12px] text-or-700">La compilation et des feuilles de départements sont cochées ensemble : les mêmes personnes seraient lues deux fois.</p>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Champ libelle="Mois payé par cet état">
                <ChoixMois
                  value={mois}
                  onChange={(m) => {
                    setMois(m);
                    oublier();
                  }}
                />
              </Champ>
              <Champ libelle="Motif de sortie des absents du registre ajoutés (payés ce mois seulement)">
                <Liste value={motif} onChange={(e) => setMotif(e.target.value)} options={motifs.map((m) => ({ valeur: m.code, libelle: m.libelle }))} />
              </Champ>
            </div>
          </>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}

        {rapport && (
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <div className={`rounded-xl px-3 py-2 font-medium ${rapport.essai ? "bg-or-100/60 text-or-700" : "bg-marque-50 text-marque-700"}`}>
              {rapport.essai
                ? "Vérification — rien n’est encore enregistré."
                : `C’est fait : le registre sait qui était payé en ${libelleMois(rapport.mois)}. Préparez maintenant l’état de ${libelleMois(rapport.mois)} dans Paiement mensuel, et faites-le valider avant septembre.`}
            </div>
            <p className="text-zinc-600">
              {rapport.feuilles.length} feuille(s) : <strong>{nf.format(rapport.lus)}</strong> personne(s) lue(s) pour <strong>{nf.format(rapport.montantFichier)} F</strong>
              {rapport.doublons.n ? ` (${rapport.doublons.n} doublon(s) du fichier, comptés une fois)` : ""}.
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                ["Retrouvés dans le registre", rapport.retrouves, "text-marque-700"],
                [`Commencent en ${libelleMois(rapport.mois)}`, rapport.avances.n, "text-encre"],
                ["Sortie reportée au mois suivant", rapport.sortiesReportees.n, "text-or-700"],
                [`Absents du registre (${nbAjouter} à ajouter)`, rapport.nouveaux.length, "text-encre"],
              ].map(([t, n, cl]) => (
                <div key={String(t)} className="rounded-xl bg-zinc-50 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{t}</div>
                  <div className={`text-lg font-semibold tabular-nums ${cl}`}>{nf.format(Number(n))}</div>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-zinc-600">
              Après la reprise, l’état de {libelleMois(rapport.mois)} devrait compter environ <strong>{nf.format(rapport.retrouves + nbAjouter)}</strong> personne(s)
              {rapport.dejaPayables ? ` (dont ${nf.format(rapport.dejaPayables)} déjà payables ce mois)` : ""}. Les montants suivent le barème de la Configuration.
            </p>

            {rapport.sansNom.n > 0 && (
              <div className="rounded-xl bg-rouge-100/50 px-3 py-2 text-[12px] text-rouge-600">
                <strong>{nf.format(rapport.sansNom.n)} ligne(s) sans nom</strong> dans le fichier, payées {nf.format(rapport.sansNom.montant)} F : elles ne peuvent pas être
                reprises. Demandez les noms au DG. <span className="text-rouge-600/80">{rapport.sansNom.exemples.slice(0, 12).join(" · ")}</span>
              </div>
            )}

            {rapport.possibles.length > 0 && (
              <div className="space-y-2 rounded-xl bg-or-100/40 px-3 py-2">
                <div className="font-semibold text-or-700">Noms proches à confirmer ({nf.format(rapport.possibles.length)}) : cochez ceux qui sont la même personne.</div>
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
                    Absents du registre : {nf.format(rapport.nouveaux.length)} — {nbAjouter} coché(s) pour être ajouté(s), payés en {libelleMois(rapport.mois)} seulement
                  </span>
                  <span className="flex gap-2 text-[12px]">
                    <Bouton variante="discret" onClick={() => setChoix((s) => Object.fromEntries(Object.entries(s).map(([k, x]) => [k, { ...x, ajouter: true }])))}>
                      Tout cocher
                    </Bouton>
                    <Bouton variante="discret" onClick={() => setChoix((s) => Object.fromEntries(Object.entries(s).map(([k, x]) => [k, { ...x, ajouter: false }])))}>
                      Tout décocher
                    </Bouton>
                  </span>
                </div>
                <div className="max-h-96 overflow-auto rounded-lg bg-white ring-1 ring-sky-100">
                  <table className="w-full table-fixed text-[12px]">
                    <colgroup>
                      <col className="w-8" />
                      <col />
                      <col className="w-[28%]" />
                      <col className="w-[28%]" />
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
                        const x = choix[n.cle] ?? { ajouter: n.propose, departementId: n.departementId, categorie: n.categorie };
                        const manque = x.ajouter && (!x.departementId || !x.categorie);
                        return (
                          <tr key={n.cle} className={`border-t border-zinc-100 align-top ${!x.ajouter ? "opacity-60" : manque ? "bg-rouge-100/40" : ""}`}>
                            <td className="px-2 py-1.5">
                              <input type="checkbox" className="size-4 accent-marque-600" checked={x.ajouter} onChange={(e) => changerChoix(n.cle, { ajouter: e.target.checked })} aria-label={`Ajouter ${n.nom}`} />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="font-medium">{n.nom}</div>
                              <div className="text-zinc-400">
                                né(e) le {jour(n.naissance)} · « {n.feuille} », ligne {n.ligne} · {nf.format(n.montant)} F
                              </div>
                              {n.etablissement && <div className="text-zinc-500">{n.etablissement}</div>}
                              {n.alertes.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {n.alertes.map((a) => (
                                    <Badge key={a} ton="jaune">
                                      {a}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <Liste className="w-full py-1.5! text-[12px]!" value={String(x.departementId ?? "")} onChange={(e) => changerChoix(n.cle, { departementId: e.target.value ? Number(e.target.value) : null })} vide="Choisir…" options={deps} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Liste className="w-full py-1.5! text-[12px]!" value={x.categorie ?? ""} onChange={(e) => changerChoix(n.cle, { categorie: e.target.value || null })} vide="Choisir…" options={cats} />
                              <div className="mt-0.5 text-[11px] text-zinc-400">sur l’état : « {n.cycle ?? "vide"} »</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <ListeCourte titre="Sorties reportées au 1er du mois suivant (payés ce mois d’après le DG)" c={rapport.sortiesReportees} ton="or" />
            <ListeCourte titre="Montant du fichier différent du barème (signalé ; l’état suit le barème)" c={rapport.montantsDifferents} ton="or" />
            <ListeCourte titre="Doublons du fichier (même nom et même date, comptés une fois)" c={rapport.doublons} ton="or" />
            <ListeCourte titre="Rapprochés automatiquement (nom écrit autrement)" c={rapport.rapproches} />
            <ListeCourte titre="Plusieurs fiches proches (à vérifier)" c={rapport.ambigus} ton="or" />
            <ListeCourte titre="Noms portés par plusieurs fiches du registre" c={rapport.plusieursFiches} />

            {incomplets.length > 0 && <Alerte>{incomplets.length} absent(s) coché(s) sans département ou sans cycle : choisissez-les, ou décochez-les.</Alerte>}
            {aReverifier && <Alerte ton="jaune">Vous avez coché des noms proches : vérifiez de nouveau avant de reprendre.</Alerte>}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>{fait ? "Fermer" : "Annuler"}</Bouton>
          {!fait && (
            <>
              <Bouton chargement={envoi && !!feuilles.length && !rapport?.essai} disabled={!fichier || !cochees.size || envoi} onClick={() => envoyer(true)}>
                <RefreshCw /> Vérifier
              </Bouton>
              <Bouton variante="principal" chargement={envoi && !!rapport?.essai} disabled={!rapport?.essai || envoi || aReverifier || incomplets.length > 0} onClick={() => envoyer(false)}>
                <Check /> Reprendre pour de bon
              </Bouton>
            </>
          )}
        </div>
      </div>
    </Modale>
  );
}
