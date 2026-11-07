"use client";

import { AlertTriangle, ArrowRight, Check, Copy, FileSpreadsheet, RefreshCw, Sheet, Sparkles, UserCheck, UserX, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type Decision, Liste, Onglet, Tuile } from "@/components/enrolement/import-enrolement";
import { Bouton, Modale, ZoneFichier } from "@/components/ui";
import { api, qs } from "@/lib/api";

/** Ce qu'on compare de deux lignes qui se ressemblent. */
interface Apercu {
  matricule: string | null;
  grade: string | null;
  cycle: string | null;
  origine: string | null;
  lieuService: string | null;
  sollicite: string | null;
  lieuSollicite: string | null;
}
type Choix = Decision | "REMPLACER";
interface PaireFichier {
  cle: string;
  nom: string;
  motif: string;
  valeurs: Apercu;
  avec: { cle: string; nom: string; motif: string; valeurs: Apercu };
  exact: boolean;
  raison: string;
}
interface PaireBase {
  cle: string;
  nom: string;
  motif: string;
  valeurs: Apercu;
  existant: { id: string; numero: number; nom: string; motif: string; departement: string | null; etat: string; valeurs: Apercu };
  raison: string;
}
interface Rapport {
  choisirFeuille?: true;
  feuillesDispo: { nom: string; lignes: number }[];
  feuilles?: string[];
  lues: number;
  creees: number;
  misesAJour: number;
  identiques: number;
  fusionnees: number;
  ecartees: number;
  dejaDansCompilation: number;
  numerosEnDouble: number[];
  anomalies: Record<string, number>;
  tronque?: boolean;
  /** Base du personnel (07/11/2026) : lue seulement. */
  personnel?: { trouvees: number; doute: number; introuvables: number; avecEcarts: number; aCompleter: number };
  details?: {
    personnel?: SituationPersonnel[];
    aMettreAJour: { cle: string; nom: string; motif: string; existant: { id: string; numero: number; bloquee: string | null }; ecarts: { champ: string; libelle: string; base: string; fichier: string }[] }[];
    doublonsFichier: PaireFichier[];
    doublonsBase: PaireBase[];
  };
}

/** La situation d'un agent dans la base du personnel, comparée à sa demande. */
interface SituationPersonnel {
  cle: string;
  nom: string;
  motif: string;
  etat: "TROUVE" | "DOUTE" | "INTROUVABLE";
  fiche: { id: number; numero: string | null; nom: string } | null;
  candidats: number;
  ecarts: { champ: string; libelle: string; demande: string; personnel: string }[];
  manquants: { champ: string; libelle: string; personnel: string }[];
}

const ligneExcel = (cle: string) => {
  const [f, n] = cle.split("#");
  return `${f}, ligne ${n}`;
};
const CYCLES: Record<string, string> = { PRESCOLAIRE: "Préscolaire", PRIMAIRE: "Primaire", COLLEGE: "Collège", LYCEE: "Lycée", ALPHABETISATION: "Alphabétisation", ADMINISTRATION: "Administration" };
const CHAMPS: [keyof Apercu, string][] = [
  ["matricule", "Matricule"],
  ["grade", "Grade / échelon"],
  ["cycle", "Cycle"],
  ["origine", "Département d’origine"],
  ["lieuService", "Lieu de service"],
  ["sollicite", "Département sollicité"],
  ["lieuSollicite", "Lieu sollicité"],
];
const val = (a: Apercu, k: keyof Apercu) => (k === "cycle" ? (a.cycle ? (CYCLES[a.cycle] ?? a.cycle) : null) : a[k]);

/** Deux colonnes côte à côte, les différences en couleur. */
function Comparaison({ gauche, droite }: { gauche: { titre: string; sous: string; valeurs: Apercu }; droite: { titre: string; sous: string; valeurs: Apercu } }) {
  return (
    <table className="mt-2 w-full table-fixed text-[12px]">
      <thead>
        <tr className="text-left">
          <th className="w-40 pb-1 font-normal text-zinc-400" />
          <th className="pb-1 pr-3 align-bottom">
            <div className="font-semibold text-encre">{gauche.titre}</div>
            <div className="font-normal text-zinc-400">{gauche.sous}</div>
          </th>
          <th className="pb-1 align-bottom">
            <div className="font-semibold text-encre">{droite.titre}</div>
            <div className="font-normal text-zinc-400">{droite.sous}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {CHAMPS.map(([k, libelle]) => {
          const a = val(gauche.valeurs, k);
          const b = val(droite.valeurs, k);
          const diff = (a ?? "") !== (b ?? "");
          return (
            <tr key={k} className={diff ? "bg-amber-50/70" : ""}>
              <td className="py-0.5 pl-1 text-zinc-500">{libelle}</td>
              <td className={`py-0.5 pr-3 ${diff ? "font-medium text-amber-900" : "text-zinc-700"}`}>{a || <span className="text-zinc-300">vide</span>}</td>
              <td className={`py-0.5 ${diff ? "font-medium text-amber-900" : "text-zinc-700"}`}>{b || <span className="text-zinc-300">vide</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Les choix d'une paire, en cartes : rien n'est choisi d'avance ; le choix conseillé est marqué. */
function ChoixPaire({ options, choisi, conseil, choisir }: { options: { d: Choix; titre: string; texte: string; desactive?: string }[]; choisi: Choix | undefined; conseil: Choix; choisir: (d: Choix) => void }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((o) => {
        const oui = choisi === o.d;
        return (
          <button
            key={o.d}
            type="button"
            disabled={!!o.desactive}
            title={o.desactive}
            onClick={() => choisir(o.d)}
            className={`flex items-start gap-2 rounded-xl p-2.5 text-left text-[12px] ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${oui ? "bg-marque-50 ring-2 ring-marque-500" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
          >
            <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${oui ? "bg-marque-600 text-white" : "ring-2 ring-zinc-300"}`}>{oui && <Check className="size-3" aria-hidden />}</span>
            <span>
              <span className="flex flex-wrap items-center gap-1 font-semibold text-encre">
                {o.titre}
                {o.d === conseil && <span className="rounded-full bg-sky-100 px-1.5 text-[10px] font-medium text-sky-800">conseillé</span>}
              </span>
              <span className="mt-0.5 block leading-snug text-zinc-500">{o.desactive ?? o.texte}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Une paire à décider (fichier ou base), avec son état. */
function Paire({ nom, sous, raison, decide, children }: { nom: string; sous: string; raison: string; decide: boolean; children: React.ReactNode }) {
  return (
    <li className={`px-4 py-3 ${decide ? "" : "bg-amber-50/40"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-encre">{nom}</span>
        <span className="text-[11px] text-zinc-400">{sous}</span>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">{raison}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${decide ? "bg-marque-50 text-marque-900 ring-marque-200" : "bg-amber-100 text-amber-900 ring-amber-300"}`}>
          {decide ? "Décidé" : "À décider"}
        </span>
      </div>
      {children}
    </li>
  );
}

/**
 * Reprendre le registre Excel des mutations (refait le 06/11/2026) : 1. choisir la feuille,
 * 2. vérifier et décider : demandes déjà enregistrées (avec ce qui change), personnes qui se
 * ressemblent (dans le fichier ou avec la base) comparées côte à côte, chacune décidée à la main ;
 * 3. importer, seulement quand tout est décidé. La base du personnel n'est pas touchée.
 */
export function ImportMutations({ apres }: { apres: (texte: string) => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuillesDispo, setFeuillesDispo] = useState<{ nom: string; lignes: number }[] | null>(null);
  const [feuilles, setFeuilles] = useState<string[]>([]);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Choix>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<"maj" | "fichier" | "base" | "personnel">("maj");
  // Base du personnel : garder la demande ou prendre la fiche, ligne par ligne ; compléter les cases vides
  const [choixPersonnel, setChoixPersonnel] = useState<Record<string, "GARDER" | "PERSONNEL">>({});
  const [completer, setCompleter] = useState(true);
  const [vuePersonnel, setVuePersonnel] = useState<"ecarts" | "completees" | "introuvables">("ecarts");
  const [voir, setVoir] = useState(40);
  const etape = !fichier ? 0 : !rapport ? 1 : 2;

  async function appeler(f: File, essai: boolean, choisies: string[] | null, dec: Record<string, Choix>) {
    const fd = new FormData();
    fd.append("fichier", f);
    if (choisies) fd.append("feuilles", JSON.stringify(choisies));
    fd.append("decisions", JSON.stringify(dec));
    fd.append("personnel", JSON.stringify(choixPersonnel));
    fd.append("completer", completer ? "1" : "0");
    return api.post<Rapport>(`/mutations/import${qs({ essai: essai ? 1 : 0 })}`, fd);
  }
  const choisirOnglet = (r: Rapport) => {
    const d = r.details;
    if (d) setOnglet(d.doublonsFichier.length ? "fichier" : d.doublonsBase.length ? "base" : "maj");
  };

  async function lire(f: File) {
    setFichier(f);
    setErreur(null);
    setRapport(null);
    setDecisions({});
    setEnvoi(true);
    try {
      const r = await appeler(f, true, null, {});
      setFeuillesDispo(r.feuillesDispo);
      if (r.choisirFeuille) {
        const compil = r.feuillesDispo.filter((x) => /compil/i.test(x.nom));
        setFeuilles(compil.length === 1 ? [compil[0].nom] : []);
      } else {
        setFeuilles(r.feuilles ?? []);
        setRapport(r);
        choisirOnglet(r);
      }
    } catch (e) {
      setErreur((e as Error).message);
      setFichier(null);
    } finally {
      setEnvoi(false);
    }
  }

  async function tester(choisies: string[], dec: Record<string, Choix>) {
    if (!fichier) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await appeler(fichier, true, choisies, dec);
      if (!rapport) choisirOnglet(r);
      setRapport(r);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const premier = useRef(true);
  useEffect(() => {
    if (premier.current || !rapport) {
      premier.current = false;
      return;
    }
    const t = setTimeout(() => tester(feuilles, decisions), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions, choixPersonnel, completer]);

  function fermer() {
    setFichier(null);
    setFeuillesDispo(null);
    setFeuilles([]);
    setRapport(null);
    setDecisions({});
    setChoixPersonnel({});
    setCompleter(true);
    setErreur(null);
    setVoir(40);
    premier.current = true;
  }

  const d = rapport?.details;
  // Le choix conseillé : même nom et même motif → une seule demande ; même matricule → la même
  // personne ; un nom proche avec un autre motif → sans doute une autre demande
  const conseilFichier = (p: PaireFichier): Choix => (p.exact || p.raison === "même matricule" ? "FUSION" : "AJOUTER");
  const conseilBase = (p: PaireBase): Choix => (p.raison === "même personne, autre motif" ? "AJOUTER" : p.existant.etat === "en instruction" ? "MAJ" : "IGNORER");
  const paires = [...(d?.doublonsFichier ?? []).map((p) => p.cle), ...(d?.doublonsBase ?? []).map((p) => p.cle)];
  const restent = paires.filter((c) => !decisions[c]).length;

  async function importer() {
    if (!fichier || restent) return;
    setEnvoi(true);
    try {
      const r = await appeler(fichier, false, feuilles, decisions);
      fermer();
      apres(
        [
          `${r.creees} demande(s) ajoutée(s)`,
          r.misesAJour ? `${r.misesAJour} mise(s) à jour` : "",
          r.fusionnees ? `${r.fusionnees} fusionnée(s)` : "",
          r.ecartees ? `${r.ecartees} ligne(s) écartée(s)` : "",
          r.identiques ? `${r.identiques} déjà à jour` : "",
        ]
          .filter(Boolean)
          .join(" ; ") + ". Les points à vérifier se corrigent dans la liste des demandes (filtre « Points à vérifier »).",
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const decider = (cles: string[], c: Choix) => setDecisions((x) => Object.fromEntries([...Object.entries(x), ...cles.map((k) => [k, c] as const)]));

  return (
    <>
      <ZoneFichier accept=".xlsx" envoi={envoi && etape === 0} envoyer={lire} libelleBouton="Choisir le fichier" aide="GESTIONS DES MUTATIONS (.xlsx)" />
      {fichier && (
        <Modale titre="Reprendre un fichier Excel de mutations" ouverte fermer={fermer} ecran>
          <div className="space-y-4 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <ol className="flex flex-wrap items-center gap-2 text-[12px]">
                {["Choisir la feuille", "Vérifier et décider", "Importer"].map((t, i) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className={`grid size-6 place-items-center rounded-full font-semibold ${i < etape ? "bg-marque-600 text-white" : i === etape ? "bg-marque-100 text-marque-900 ring-2 ring-marque-300" : "bg-zinc-100 text-zinc-500"}`}>
                      {i < etape ? <Check className="size-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span className={i === etape ? "font-semibold text-encre" : "text-zinc-500"}>{t}</span>
                    {i < 2 && <ArrowRight className="size-3.5 text-zinc-300" aria-hidden />}
                  </li>
                ))}
              </ol>
              <span className="flex items-center gap-1.5 text-zinc-600">
                <FileSpreadsheet className="size-4 text-marque-600" aria-hidden />
                <span className="font-medium text-encre">{fichier.name}</span>
                {rapport && feuillesDispo && feuillesDispo.length > 1 && (
                  <button type="button" className="ml-2 text-[12px] font-semibold text-marque-700 underline" onClick={() => setRapport(null)}>
                    Changer de feuille
                  </button>
                )}
              </span>
            </div>

            {!rapport && feuillesDispo && (
              <div className="space-y-3">
                <p className="rounded-2xl bg-sky-50 px-4 py-2.5 text-[12px] text-sky-900 ring-1 ring-sky-200">
                  Le fichier est comparé à la <strong>base des mutations</strong> seulement. La base du personnel n’est pas touchée : on y reporte les mutations après la
                  note signée (bouton « Importer dans la base du personnel » sur la note).
                </p>
                <p className="text-zinc-600">Ce fichier a plusieurs feuilles. Cochez celle (ou celles) à envoyer : en général la compilation, jamais la feuille des doublons.</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {feuillesDispo.map((f) => {
                    const oui = feuilles.includes(f.nom);
                    return (
                      <button
                        key={f.nom}
                        type="button"
                        onClick={() => setFeuilles((l) => (oui ? l.filter((x) => x !== f.nom) : [...l, f.nom]))}
                        className={`flex items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition ${oui ? "bg-marque-50 ring-2 ring-marque-300" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
                      >
                        <span className={`grid size-5 shrink-0 place-items-center rounded-md ${oui ? "bg-marque-600 text-white" : "ring-2 ring-zinc-300"}`}>{oui && <Check className="size-3.5" aria-hidden />}</span>
                        <Sheet className="size-5 text-zinc-400" aria-hidden />
                        <span>
                          <span className="block font-semibold text-encre">{f.nom}</span>
                          <span className="text-[12px] text-zinc-500">{f.lignes.toLocaleString("fr-FR")} ligne(s)</span>
                          {/doublon/i.test(f.nom) && <span className="block text-[11px] font-medium text-amber-700">Feuille des doublons : à ne pas envoyer</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <Bouton onClick={fermer}>Annuler</Bouton>
                  <Bouton variante="principal" disabled={!feuilles.length} chargement={envoi} onClick={() => tester(feuilles, decisions)}>
                    Vérifier {feuilles.length > 1 ? `ces ${feuilles.length} feuilles` : "cette feuille"}
                  </Bouton>
                </div>
              </div>
            )}
            {!rapport && !feuillesDispo && envoi && <p className="text-zinc-500">Lecture du fichier…</p>}

            {rapport && d && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                  <Tuile n={rapport.lues} texte="demandes lues" />
                  <Tuile n={rapport.creees} texte="nouvelles demandes" ton="vert" />
                  <Tuile n={rapport.misesAJour} texte="mises à jour dans la base" ton="bleu" />
                  <Tuile n={rapport.identiques + rapport.fusionnees + rapport.ecartees} texte="déjà à jour, fusionnées ou écartées" ton="gris" />
                  <div className={`rounded-2xl px-3 py-2.5 ${restent ? "bg-amber-100 text-amber-900" : "bg-marque-50 text-marque-900"}`}>
                    <div className="text-[20px] font-semibold tabular-nums">{restent}</div>
                    <div className="text-[11px] leading-tight">{restent ? "paire(s) de ressemblances encore à décider" : "tout est décidé"}</div>
                  </div>
                </div>
                {Object.keys(rapport.anomalies).length > 0 && (
                  <details className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[12px] text-amber-900 ring-1 ring-amber-200">
                    <summary className="cursor-pointer font-semibold">
                      {Object.values(rapport.anomalies).reduce((a, b) => a + b, 0)} point(s) à vérifier dans le fichier — ils n’empêchent pas l’import ; on les corrige ensuite
                      dans la liste des demandes
                    </summary>
                    <ul className="mt-2 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
                      {Object.entries(rapport.anomalies)
                        .sort((a, b) => b[1] - a[1])
                        .map(([a, n]) => (
                          <li key={a}>
                            <Link href={`/mutations?anomalie=${encodeURIComponent(a)}`} target="_blank" className="hover:underline">
                              <strong className="tabular-nums">{n}</strong> · {a} →
                            </Link>
                          </li>
                        ))}
                    </ul>
                    {rapport.numerosEnDouble.length > 0 && <p className="mt-1">N° d’enregistrement en double dans ce fichier : {rapport.numerosEnDouble.join(", ")}.</p>}
                  </details>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <Onglet actif={onglet === "fichier"} n={d.doublonsFichier.length} icone={Copy} texte="Se ressemblent dans le fichier" choisir={() => setOnglet("fichier")} />
                  <Onglet actif={onglet === "base"} n={d.doublonsBase.length} icone={Users} texte="Ressemblent à une demande de la base" choisir={() => setOnglet("base")} />
                  <Onglet actif={onglet === "maj"} n={d.aMettreAJour.length} icone={RefreshCw} texte="Déjà dans la base, avec du nouveau" choisir={() => setOnglet("maj")} />
                  {rapport.personnel && (
                    <Onglet
                      actif={onglet === "personnel"}
                      n={rapport.personnel.avecEcarts}
                      icone={UserCheck}
                      texte="Base du personnel"
                      choisir={() => setOnglet("personnel")}
                    />
                  )}
                </div>

                <div className="h-[56vh] overflow-y-auto rounded-2xl ring-1 ring-zinc-200">
                  {(onglet === "fichier" || onglet === "base") && (
                    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-white/95 px-4 py-2.5 backdrop-blur">
                      <span className="flex-1 text-[12px] text-zinc-600">
                        {onglet === "fichier"
                          ? "Deux lignes du fichier qui se ressemblent. Comparez-les, puis dites ce qu’il faut faire : rien n’est décidé à votre place."
                          : "Une ligne du fichier qui ressemble à une demande déjà enregistrée. Comparez, puis décidez : rien n’est décidé à votre place."}
                      </span>
                      <Bouton
                        variante="discret"
                        onClick={() =>
                          onglet === "fichier"
                            ? d.doublonsFichier.forEach((p) => decider([p.cle], conseilFichier(p)))
                            : d.doublonsBase.forEach((p) => decider([p.cle], conseilBase(p)))
                        }
                      >
                        <Sparkles className="size-4" aria-hidden /> Prendre le choix conseillé partout
                      </Bouton>
                    </div>
                  )}
                  {onglet === "fichier" &&
                    (d.doublonsFichier.length ? (
                      <ul className="divide-y divide-zinc-100">
                        {d.doublonsFichier.slice(0, voir).map((p) => (
                          <Paire key={p.cle} nom={p.nom} sous={`${p.motif} · ${ligneExcel(p.cle)}`} raison={p.exact ? "même nom, même motif" : p.raison} decide={!!decisions[p.cle]}>
                            <Comparaison
                              gauche={{ titre: "Cette ligne", sous: ligneExcel(p.cle), valeurs: p.valeurs }}
                              droite={{ titre: `L’autre ligne : ${p.avec.nom}`, sous: `${p.avec.motif} · ${ligneExcel(p.avec.cle)}`, valeurs: p.avec.valeurs }}
                            />
                            <ChoixPaire
                              choisi={decisions[p.cle]}
                              conseil={conseilFichier(p)}
                              choisir={(c) => decider([p.cle], c)}
                              options={[
                                { d: "FUSION", titre: "Même personne : fusionner", texte: "Une seule demande ; les cases vides de l’une sont remplies par l’autre." },
                                { d: "IGNORER", titre: "Même personne : garder l’autre ligne", texte: "Cette ligne-ci est écartée." },
                                { d: "REMPLACER", titre: "Même personne : garder cette ligne", texte: "L’autre ligne est remplacée par celle-ci." },
                                { d: "AJOUTER", titre: "Deux personnes différentes", texte: "Les deux lignes deviennent deux demandes." },
                              ]}
                            />
                          </Paire>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-6 text-center text-zinc-500">Aucune ressemblance dans le fichier.</p>
                    ))}
                  {onglet === "base" &&
                    (d.doublonsBase.length ? (
                      <ul className="divide-y divide-zinc-100">
                        {d.doublonsBase.slice(0, voir).map((p) => {
                          const bloquee = p.existant.etat === "dans une note" || p.existant.etat === "accordée" || p.existant.etat === "refusée";
                          return (
                            <Paire key={p.cle} nom={p.nom} sous={`${p.motif} · ${ligneExcel(p.cle)}`} raison={p.raison} decide={!!decisions[p.cle]}>
                              <Comparaison
                                gauche={{ titre: "La ligne du fichier", sous: `${p.motif} · ${ligneExcel(p.cle)}`, valeurs: p.valeurs }}
                                droite={{ titre: `La demande n° ${p.existant.numero} : ${p.existant.nom}`, sous: `${p.existant.motif} · ${p.existant.etat}`, valeurs: p.existant.valeurs }}
                              />
                              <ChoixPaire
                                choisi={decisions[p.cle]}
                                conseil={conseilBase(p)}
                                choisir={(c) => decider([p.cle], c)}
                                options={[
                                  {
                                    d: "MAJ",
                                    titre: "Même personne : mettre la base à jour",
                                    texte: "La demande de la base prend les valeurs de cette ligne (pas de nouvelle demande).",
                                    desactive: bloquee ? `Impossible : la demande de la base est ${p.existant.etat}.` : undefined,
                                  },
                                  { d: "IGNORER", titre: "Même personne : garder la base", texte: "Cette ligne n’est pas importée ; la base ne change pas." },
                                  { d: "AJOUTER", titre: "Deux personnes (ou deux demandes)", texte: "Cette ligne devient une nouvelle demande." },
                                ]}
                              />
                            </Paire>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="p-6 text-center text-zinc-500">Aucune ligne ne ressemble à une demande déjà enregistrée.</p>
                    ))}
                  {onglet === "maj" && (
                    <Liste
                      vide="Aucune demande déjà enregistrée n’a de valeur différente dans le fichier."
                      aide="Même personne et même motif qu’une demande déjà enregistrée. Proposé : mettre la demande à jour avec le fichier (le registre tenu à jour). Une demande déjà dans une note ou décidée par le Ministre ne bouge pas."
                      lignes={d.aMettreAJour}
                      groupe={[
                        { d: "MAJ", texte: "Tout mettre à jour" },
                        { d: "IGNORER", texte: "Tout garder comme dans la base" },
                      ]}
                      decider={(cles, c) => decider(cles, c)}
                      rendre={(x) => (
                        <>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-semibold text-encre">{x.nom}</span>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{x.motif}</span>
                            <span className="text-[11px] text-zinc-400">
                              {ligneExcel(x.cle)} · demande n° {x.existant.numero}
                            </span>
                          </div>
                          <table className="mt-1.5 w-full text-[12px]">
                            <tbody>
                              {x.ecarts.map((e) => (
                                <tr key={e.champ}>
                                  <td className="w-44 py-0.5 pr-2 text-zinc-500">{e.libelle}</td>
                                  <td className="py-0.5 pr-2 text-zinc-500 line-through decoration-zinc-300">{e.base || "vide"}</td>
                                  <td className="py-0.5 font-medium text-sky-800">→ {e.fichier}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {x.existant.bloquee && <p className="mt-1 text-[11px] text-amber-700">Demande {x.existant.bloquee} : elle ne change pas ici.</p>}
                        </>
                      )}
                      choix={(x) => [
                        { d: "MAJ" as Decision, texte: "Mettre à jour", desactive: !!x.existant.bloquee },
                        { d: "IGNORER" as Decision, texte: "Garder la base" },
                      ]}
                      defaut={(x) => (x.existant.bloquee ? "IGNORER" : "MAJ")}
                      decisions={decisions as Record<string, Decision>}
                    />
                  )}
                  {onglet === "personnel" && rapport.personnel && (
                    <OngletPersonnel
                      bilan={rapport.personnel}
                      lignes={d.personnel ?? []}
                      vue={vuePersonnel}
                      changerVue={setVuePersonnel}
                      choix={choixPersonnel}
                      choisir={(cles, c) => setChoixPersonnel((x) => Object.fromEntries([...Object.entries(x), ...cles.map((k) => [k, c] as const)]))}
                      completer={completer}
                      changerCompleter={setCompleter}
                    />
                  )}
                  {(onglet === "fichier" ? d.doublonsFichier.length : onglet === "base" ? d.doublonsBase.length : 0) > voir && (
                    <div className="p-3 text-center">
                      <Bouton variante="discret" onClick={() => setVoir((v) => v + 60)}>
                        Voir 60 de plus
                      </Bouton>
                    </div>
                  )}
                </div>
                {rapport.tronque && <p className="text-[12px] text-amber-700">Les listes sont longues : seules les 2 000 premières lignes de chaque groupe sont montrées.</p>}
                {erreur && (
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-rouge-600">
                    <AlertTriangle className="size-3.5" aria-hidden /> {erreur}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                  <span className={`text-[12px] ${restent ? "font-medium text-amber-800" : "text-zinc-500"}`}>
                    {envoi
                      ? "Mise à jour du résumé…"
                      : restent
                        ? `Encore ${restent} ressemblance(s) à décider avant d’importer (onglets « Se ressemblent… »).`
                        : "Tout est décidé. Rien n’est enregistré tant que vous ne cliquez pas sur « Importer »."}
                  </span>
                  <span className="flex gap-2">
                    <Bouton onClick={fermer}>Annuler</Bouton>
                    <Bouton variante="principal" chargement={envoi} disabled={!!restent || (!rapport.creees && !rapport.misesAJour)} onClick={importer}>
                      Importer : {rapport.creees} ajout(s){rapport.misesAJour ? `, ${rapport.misesAJour} mise(s) à jour` : ""}
                    </Bouton>
                  </span>
                </div>
              </div>
            )}
            {!rapport && erreur && <p className="text-[12px] font-medium text-rouge-600">{erreur}</p>}
          </div>
        </Modale>
      )}
    </>
  );
}

/**
 * Onglet « Base du personnel » de l'import des mutations (07/11/2026) : pour chaque agent, sa demande
 * à côté de sa fiche du personnel. On garde la demande telle quelle (par défaut) ou on prend la fiche ;
 * les cases vides de la demande peuvent être complétées depuis la fiche. La base des mutations reste à
 * part : rien n'est écrit dans la base du personnel avant la note signée. Un agent pas trouvé est
 * seulement signalé.
 */
function OngletPersonnel({
  bilan,
  lignes,
  vue,
  changerVue,
  choix,
  choisir,
  completer,
  changerCompleter,
}: {
  bilan: NonNullable<Rapport["personnel"]>;
  lignes: SituationPersonnel[];
  vue: "ecarts" | "completees" | "introuvables";
  changerVue: (v: "ecarts" | "completees" | "introuvables") => void;
  choix: Record<string, "GARDER" | "PERSONNEL">;
  choisir: (cles: string[], c: "GARDER" | "PERSONNEL") => void;
  completer: boolean;
  changerCompleter: (v: boolean) => void;
}) {
  const [voir, setVoir] = useState(40);
  const ecarts = lignes.filter((l) => l.ecarts.length);
  const completees = lignes.filter((l) => l.manquants.length);
  const absents = lignes.filter((l) => l.etat !== "TROUVE");
  const liste = vue === "ecarts" ? ecarts : vue === "completees" ? completees : absents;
  const pris = ecarts.filter((l) => choix[l.cle] === "PERSONNEL").length;
  const Bouton2 = ({ actif, children, onClick }: { actif: boolean; children: React.ReactNode; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${actif ? "bg-marque-600 text-white ring-marque-600" : "bg-white text-zinc-700 ring-zinc-200 hover:ring-zinc-300"}`}
    >
      {children}
    </button>
  );
  return (
    <div>
      <div className="sticky top-0 z-10 space-y-2 border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-[12px] text-zinc-600">
          Chaque agent du fichier est cherché dans la <strong>base du personnel</strong> (lecture seulement). La base des mutations reste à part : la fiche du personnel
          ne change qu’après la note signée (« Importer dans la base du personnel »).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-marque-50 px-2.5 py-1 text-[12px] text-marque-900 ring-1 ring-marque-200">
            <UserCheck className="mr-1 inline size-3.5" aria-hidden />
            {bilan.trouvees} retrouvé(s)
          </span>
          <Bouton2 actif={vue === "ecarts"} onClick={() => changerVue("ecarts")}>
            {bilan.avecEcarts} avec des différences
          </Bouton2>
          <Bouton2 actif={vue === "completees"} onClick={() => changerVue("completees")}>
            {bilan.aCompleter} avec des cases vides
          </Bouton2>
          <Bouton2 actif={vue === "introuvables"} onClick={() => changerVue("introuvables")}>
            {bilan.introuvables + bilan.doute} pas trouvé(s)
          </Bouton2>
          <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-50 px-3 py-1.5 text-[12px] ring-1 ring-zinc-200">
            <input type="checkbox" className="size-4 accent-marque-600" checked={completer} onChange={(e) => changerCompleter(e.target.checked)} />
            Compléter les cases vides des demandes depuis la base du personnel
          </label>
        </div>
        {vue === "ecarts" && ecarts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-600">
            {pris ? `${pris} demande(s) prendront les valeurs de la base du personnel.` : "Par défaut, chaque demande est gardée telle quelle."}
            <span className="ml-auto flex gap-2">
              <Bouton2 actif={false} onClick={() => choisir(ecarts.map((l) => l.cle), "GARDER")}>
                Tout garder tel quel
              </Bouton2>
              <Bouton2 actif={false} onClick={() => choisir(ecarts.map((l) => l.cle), "PERSONNEL")}>
                Tout prendre de la base du personnel
              </Bouton2>
            </span>
          </div>
        )}
      </div>
      {liste.length ? (
        <ul className="divide-y divide-zinc-100">
          {liste.slice(0, voir).map((l) => {
            const c = choix[l.cle] ?? "GARDER";
            return (
              <li key={l.cle} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-encre">{l.nom}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{l.motif}</span>
                  <span className="text-[11px] text-zinc-400">{ligneExcel(l.cle)}</span>
                  {l.fiche && (
                    <Link href={`/personnel/agents/${l.fiche.id}`} target="_blank" className="text-[11.5px] font-medium text-marque-700 hover:underline">
                      Fiche {l.fiche.numero ?? ""} →
                    </Link>
                  )}
                </div>
                {l.etat !== "TROUVE" ? (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[12px] text-amber-900 ring-1 ring-amber-200">
                    <UserX className="size-3.5" aria-hidden />
                    {l.etat === "DOUTE"
                      ? `Plusieurs fiches possibles (${l.candidats}) dans la base du personnel : on choisira après la note signée.`
                      : "Pas trouvé dans la base du personnel. Ce n’est pas bloquant : sa fiche pourra être reliée ou créée après la note signée."}
                  </p>
                ) : (
                  <>
                    {l.ecarts.length > 0 && (
                      <table className="mt-2 w-full text-[12px]">
                        <thead className="text-left text-[11px] text-zinc-400">
                          <tr>
                            <th className="w-44 pb-1 font-medium">Rubrique</th>
                            <th className="pb-1 font-medium">Dans la demande (au moment de la demande)</th>
                            <th className="pb-1 font-medium">Dans la base du personnel (aujourd’hui)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {l.ecarts.map((e) => (
                            <tr key={e.champ} className="border-t border-zinc-100">
                              <td className="py-1 pr-2 text-zinc-500">{e.libelle}</td>
                              <td className={`py-1 pr-2 ${c === "PERSONNEL" ? "text-zinc-400 line-through" : "font-medium text-zinc-800"}`}>{e.demande}</td>
                              <td className={`py-1 ${c === "PERSONNEL" ? "font-medium text-marque-900" : "text-zinc-500"}`}>{e.personnel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {l.manquants.length > 0 && (
                      <p className="mt-1.5 text-[12px] text-zinc-600">
                        <span className={completer ? "font-medium text-marque-900" : "text-zinc-500"}>{completer ? "Complété depuis la fiche :" : "Pourrait être complété depuis la fiche :"}</span>{" "}
                        {l.manquants.map((m) => `${m.libelle} ${m.personnel}`).join(" · ")}
                      </p>
                    )}
                    {l.ecarts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Bouton2 actif={c === "GARDER"} onClick={() => choisir([l.cle], "GARDER")}>
                          Garder la demande telle quelle
                        </Bouton2>
                        <Bouton2 actif={c === "PERSONNEL"} onClick={() => choisir([l.cle], "PERSONNEL")}>
                          Prendre les valeurs de la base du personnel
                        </Bouton2>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="p-6 text-center text-zinc-500">
          {vue === "ecarts" ? "Aucune différence entre les demandes et la base du personnel." : vue === "completees" ? "Aucune case vide à compléter." : "Tous les agents ont été retrouvés."}
        </p>
      )}
      {liste.length > voir && (
        <div className="p-3 text-center">
          <button type="button" className="text-[12px] font-semibold text-marque-700" onClick={() => setVoir((v) => v + 60)}>
            Voir 60 de plus
          </button>
        </div>
      )}
    </div>
  );
}
