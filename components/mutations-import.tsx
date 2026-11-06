"use client";

import { AlertTriangle, ArrowRight, Check, Copy, FileSpreadsheet, GitMerge, RefreshCw, Sheet, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Decision, Liste, Onglet, Tuile } from "@/components/enrolement/import-enrolement";
import { Bouton, Modale, ZoneFichier } from "@/components/ui";
import { api, qs } from "@/lib/api";

interface Rapport {
  choisirFeuille?: true;
  feuillesDispo: { nom: string; lignes: number }[];
  feuilles?: string[];
  parFeuille?: { nom: string; lues: number; retenues: number }[];
  lues: number;
  creees: number;
  misesAJour: number;
  identiques: number;
  fusionnees: number;
  ecartees: number;
  ignorees: number;
  dejaDansCompilation: number;
  numerosAttribues: number;
  numerosCorriges: number;
  numerosEnDouble: number[];
  anomalies: Record<string, number>;
  tronque?: boolean;
  details?: {
    aMettreAJour: { cle: string; nom: string; motif: string; existant: { id: string; numero: number; bloquee: string | null }; ecarts: { champ: string; libelle: string; base: string; fichier: string }[] }[];
    doublonsFichier: { cle: string; nom: string; motif: string; avec: { cle: string; nom: string; motif: string }; exact: boolean }[];
    doublonsBase: {
      cle: string;
      nom: string;
      motif: string;
      existant: { id: string; numero: number; nom: string; motif: string; departement: string | null; etat: string };
      raison: string;
    }[];
  };
}

const ligneExcel = (cle: string) => {
  const [f, n] = cle.split("#");
  return `${f}, ligne ${n}`;
};

function Personne({ x }: { x: { cle: string; nom: string; motif: string } }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-semibold text-encre">{x.nom}</span>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{x.motif}</span>
      <span className="text-[11px] text-zinc-400">{ligneExcel(x.cle)}</span>
    </div>
  );
}

/**
 * Reprendre le registre Excel des mutations (refait le 06/11/2026), comme l'enrôlement :
 * 1. choisir la feuille (pas la feuille « DOUBLONS »), 2. vérifier : ce qui est déjà dans la base
 * des MUTATIONS (avec ce qui change), deux fois dans le fichier, ou proche d'une demande déjà
 * enregistrée ; décider ligne par ligne ou par groupe, 3. importer. La base du personnel n'est pas
 * touchée : elle suit après la note signée.
 */
export function ImportMutations({ apres }: { apres: (texte: string) => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuillesDispo, setFeuillesDispo] = useState<{ nom: string; lignes: number }[] | null>(null);
  const [feuilles, setFeuilles] = useState<string[]>([]);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<"maj" | "fichier" | "base">("maj");
  const etape = !fichier ? 0 : !rapport ? 1 : 2;

  async function appeler(f: File, essai: boolean, choisies: string[] | null, dec: Record<string, Decision>) {
    const fd = new FormData();
    fd.append("fichier", f);
    if (choisies) fd.append("feuilles", JSON.stringify(choisies));
    fd.append("decisions", JSON.stringify(dec));
    return api.post<Rapport>(`/mutations/import${qs({ essai: essai ? 1 : 0 })}`, fd);
  }
  const choisirOnglet = (r: Rapport) => {
    const d = r.details;
    if (d) setOnglet(d.aMettreAJour.length ? "maj" : d.doublonsFichier.length ? "fichier" : "base");
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
        // Par défaut : la compilation visible, jamais une feuille « DOUBLONS »
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

  async function tester(choisies: string[], dec: Record<string, Decision>) {
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
  }, [decisions]);

  function fermer() {
    setFichier(null);
    setFeuillesDispo(null);
    setFeuilles([]);
    setRapport(null);
    setDecisions({});
    setErreur(null);
    premier.current = true;
  }

  async function importer() {
    if (!fichier) return;
    setEnvoi(true);
    try {
      const r = await appeler(fichier, false, feuilles, decisions);
      fermer();
      apres(
        [
          `${r.creees} demande(s) ajoutée(s)`,
          r.misesAJour ? `${r.misesAJour} mise(s) à jour` : "",
          r.fusionnees ? `${r.fusionnees} ligne(s) en double fusionnée(s)` : "",
          r.ecartees ? `${r.ecartees} écartée(s)` : "",
          r.identiques ? `${r.identiques} déjà à jour` : "",
          r.numerosEnDouble?.length ? `n° d’enregistrement écrits deux fois dans le registre : ${r.numerosEnDouble.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(" ; ") + ".",
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const decider = (cles: string[], d: Decision) => setDecisions((x) => Object.fromEntries([...Object.entries(x), ...cles.map((c) => [c, d] as const)]));
  const d = rapport?.details;

  return (
    <>
      <ZoneFichier accept=".xlsx" envoi={envoi && etape === 0} envoyer={lire} libelleBouton="Choisir le fichier" aide="GESTIONS DES MUTATIONS (.xlsx)" />
      {fichier && (
        <Modale titre="Reprendre un fichier Excel de mutations" ouverte fermer={fermer} large>
          <div className="space-y-4 text-[13px]">
            <ol className="flex flex-wrap items-center gap-2 text-[12px]">
              {["Choisir la feuille", "Vérifier et décider", "Importer"].map((t, i) => (
                <li key={t} className="flex items-center gap-2">
                  <span className={`grid size-6 place-items-center rounded-full font-semibold ${i < etape ? "bg-marque-600 text-white" : i === etape ? "bg-marque-100 text-marque-800 ring-2 ring-marque-300" : "bg-zinc-100 text-zinc-500"}`}>
                    {i < etape ? <Check className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span className={i === etape ? "font-semibold text-encre" : "text-zinc-500"}>{t}</span>
                  {i < 2 && <ArrowRight className="size-3.5 text-zinc-300" aria-hidden />}
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-4 py-2.5 text-zinc-600">
              <FileSpreadsheet className="size-4 text-marque-600" aria-hidden />
              <span className="truncate font-medium text-encre">{fichier.name}</span>
              {rapport && feuillesDispo && feuillesDispo.length > 1 && (
                <button type="button" className="ml-auto text-[12px] font-semibold text-marque-700 underline" onClick={() => setRapport(null)}>
                  Changer de feuille
                </button>
              )}
            </div>
            <p className="rounded-2xl bg-sky-50 px-4 py-2.5 text-[12px] text-sky-900 ring-1 ring-sky-200">
              Le fichier est comparé à la <strong>base des mutations</strong> seulement. La base du personnel n’est pas touchée : on y reporte les mutations après la
              note signée (bouton « Importer dans la base du personnel » sur la note).
            </p>

            {!rapport && feuillesDispo && (
              <div className="space-y-3">
                <p className="text-zinc-600">Ce fichier a plusieurs feuilles. Cochez celle (ou celles) à envoyer : en général la compilation, jamais la feuille des doublons.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {feuillesDispo.map((f) => {
                    const oui = feuilles.includes(f.nom);
                    const doublons = /doublon/i.test(f.nom);
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
                          {doublons && <span className="block text-[11px] font-medium text-amber-700">Feuille des doublons : à ne pas envoyer</span>}
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Tuile n={rapport.lues} texte="demandes lues" />
                  <Tuile n={rapport.creees} texte="nouvelles, seront ajoutées" ton="vert" />
                  <Tuile n={rapport.misesAJour} texte="mises à jour dans la base" ton="bleu" />
                  <Tuile n={rapport.identiques + rapport.fusionnees + rapport.ecartees} texte="déjà à jour, fusionnées ou écartées" ton="gris" />
                </div>
                {(rapport.dejaDansCompilation > 0 || rapport.numerosEnDouble.length > 0 || Object.keys(rapport.anomalies).length > 0) && (
                  <ul className="space-y-1 rounded-2xl bg-amber-50 px-4 py-3 text-[12px] text-amber-900 ring-1 ring-amber-200">
                    {rapport.dejaDansCompilation > 0 && <li>{rapport.dejaDansCompilation} ligne(s) des feuilles par motif déjà dans la compilation : non reprises.</li>}
                    {rapport.numerosEnDouble.length > 0 && <li>N° d’enregistrement écrits deux fois dans le registre, à vérifier : {rapport.numerosEnDouble.join(", ")}.</li>}
                    {Object.entries(rapport.anomalies).map(([a, n]) => (
                      <li key={a}>
                        {n} demande(s) : {a}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Onglet actif={onglet === "maj"} n={d.aMettreAJour.length} icone={RefreshCw} texte="Déjà dans la base, avec du nouveau" choisir={() => setOnglet("maj")} />
                  <Onglet actif={onglet === "fichier"} n={d.doublonsFichier.length} icone={Copy} texte="Deux fois dans le fichier" choisir={() => setOnglet("fichier")} />
                  <Onglet actif={onglet === "base"} n={d.doublonsBase.length} icone={Users} texte="Proche d’une demande déjà enregistrée" choisir={() => setOnglet("base")} />
                </div>
                <div className="max-h-[46vh] overflow-y-auto rounded-2xl ring-1 ring-zinc-200">
                  {onglet === "maj" && (
                    <Liste
                      vide="Aucune demande déjà enregistrée n’a de valeur différente dans le fichier."
                      aide="Même personne et même motif qu’une demande déjà enregistrée. Par défaut, le fichier (registre tenu à jour) met la demande à jour ; une demande déjà dans une note ou décidée par le Ministre ne bouge pas."
                      lignes={d.aMettreAJour}
                      groupe={[
                        { d: "MAJ", texte: "Tout mettre à jour" },
                        { d: "IGNORER", texte: "Tout garder comme dans la base" },
                      ]}
                      decider={decider}
                      rendre={(x) => (
                        <>
                          <Personne x={x} />
                          <div className="text-[11px] text-zinc-400">Demande n° {x.existant.numero}</div>
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
                      decisions={decisions}
                    />
                  )}
                  {onglet === "fichier" && (
                    <Liste
                      vide="Aucune demande n’apparaît deux fois dans le fichier."
                      aide="La même personne avec le même motif deux fois dans la feuille (fusionnée par défaut), ou deux noms très proches (gardés tous les deux par défaut)."
                      lignes={d.doublonsFichier}
                      groupe={[
                        { d: "FUSION", texte: "Tout fusionner" },
                        { d: "AJOUTER", texte: "Tout garder" },
                      ]}
                      decider={decider}
                      rendre={(x) => (
                        <>
                          <Personne x={x} />
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-zinc-600">
                            <GitMerge className="size-3.5 text-zinc-400" aria-hidden />
                            {x.exact ? "Identique à" : "Ressemble à"} <strong className="text-encre">{x.avec.nom}</strong> ({x.avec.motif}, {ligneExcel(x.avec.cle)})
                          </p>
                        </>
                      )}
                      choix={(x) =>
                        x.exact
                          ? [
                              { d: "FUSION" as Decision, texte: "Fusionner" },
                              { d: "AJOUTER" as Decision, texte: "Deux demandes" },
                              { d: "IGNORER" as Decision, texte: "Écarter" },
                            ]
                          : [{ d: "AJOUTER" as Decision, texte: "Deux personnes" }]
                      }
                      defaut={(x) => (x.exact ? "FUSION" : "AJOUTER")}
                      decisions={decisions}
                    />
                  )}
                  {onglet === "base" && (
                    <Liste
                      vide="Aucune ligne ne ressemble à une demande déjà enregistrée."
                      aide="Même matricule, ou nom très proche d’une demande déjà enregistrée. Fusionner : la demande de la base prend les valeurs de la ligne (sans en créer une autre)."
                      lignes={d.doublonsBase}
                      groupe={[
                        { d: "MAJ", texte: "Tout fusionner avec la base" },
                        { d: "AJOUTER", texte: "Tout ajouter" },
                        { d: "IGNORER", texte: "Ne rien importer" },
                      ]}
                      decider={decider}
                      rendre={(x) => (
                        <>
                          <Personne x={x} />
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-600">
                            <Users className="size-3.5 text-zinc-400" aria-hidden />
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">{x.raison}</span>
                            Demande n° {x.existant.numero} : <strong className="text-encre">{x.existant.nom}</strong> · {x.existant.motif}
                            {x.existant.departement ? ` → ${x.existant.departement}` : ""} · {x.existant.etat}
                          </p>
                        </>
                      )}
                      choix={() => [
                        { d: "MAJ" as Decision, texte: "Fusionner avec la base" },
                        { d: "AJOUTER" as Decision, texte: "Nouvelle demande" },
                        { d: "IGNORER" as Decision, texte: "Écarter" },
                      ]}
                      defaut={() => "AJOUTER"}
                      decisions={decisions}
                    />
                  )}
                </div>
                {rapport.tronque && <p className="text-[12px] text-amber-700">Les listes sont longues : seules les 2 000 premières lignes de chaque groupe sont montrées.</p>}
                {erreur && (
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-rouge-600">
                    <AlertTriangle className="size-3.5" aria-hidden /> {erreur}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                  <span className="text-[12px] text-zinc-500">{envoi ? "Mise à jour du résumé…" : "Le résumé suit vos choix."}</span>
                  <span className="flex gap-2">
                    <Bouton onClick={fermer}>Annuler</Bouton>
                    <Bouton variante="principal" chargement={envoi} disabled={!rapport.creees && !rapport.misesAJour} onClick={importer}>
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
