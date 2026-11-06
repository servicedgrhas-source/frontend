"use client";

import { AlertTriangle, ArrowRight, Check, Copy, FileSpreadsheet, GitMerge, RefreshCw, Sheet, UserCheck, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Bouton, Modale, ZoneFichier } from "@/components/ui";
import { api, qs } from "@/lib/api";

type Decision = "MAJ" | "FUSION" | "AJOUTER" | "IGNORER";
interface Ident {
  cle: string;
  nom: string;
  naissance: string | null;
}
interface Rapport {
  choisirFeuille?: true;
  feuillesDispo: { nom: string; lignes: number }[];
  feuilles?: string[];
  lues: number;
  ajoutes: number;
  dejaLa: number;
  sansDiplome: number;
  nonConformes: number;
  aVerifier: number;
  doublonsProbables: number;
  dejaConnus: number;
  misAJour: number;
  fusionnes: number;
  ignores: number;
  tronque?: boolean;
  details?: {
    aMettreAJour: (Ident & { existant: { id: string; nom: string; etat: string; dansUneNote: boolean }; ecarts: { champ: string; libelle: string; base: string; fichier: string }[] })[];
    doublonsFichier: (Ident & { avec: Ident; exact: boolean })[];
    doublonsBase: (Ident & { existant: { id: string; nom: string; naissance: string | null; etat: string } })[];
    connus: (Ident & { sources: { source: string; nom: string; naissance: string | null; detail: string }[] })[];
  };
}

const date = (d: string | null) => (d ? d.split("-").reverse().join("/") : "date ?");
const ligneExcel = (cle: string) => {
  const [f, n] = cle.split("#");
  return `${f}, ligne ${n}`;
};

/**
 * Importer une liste Excel des dossiers déposés (refait le 06/11/2026) : 1. choisir la feuille,
 * 2. vérifier (ce qui ressemble à la campagne, au fichier lui-même, aux recrutés, à la base du
 * personnel, aux volontaires) et décider ligne par ligne ou par groupe, 3. importer.
 */
export function ImportEnrolement({ campagne, apres }: { campagne: { id: number; annee: number }; apres: (texte: string) => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuillesDispo, setFeuillesDispo] = useState<{ nom: string; lignes: number }[] | null>(null);
  const [feuilles, setFeuilles] = useState<string[]>([]);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<"maj" | "fichier" | "base" | "connus">("maj");
  const etape = !fichier ? 0 : !rapport ? 1 : 2;

  async function appeler(f: File, essai: boolean, choisies: string[] | null, dec: Record<string, Decision>) {
    const fd = new FormData();
    fd.append("fichier", f);
    if (choisies) fd.append("feuilles", JSON.stringify(choisies));
    fd.append("decisions", JSON.stringify(dec));
    return api.post<Rapport>(`/enrolement/import${qs({ campagne: campagne.id, essai: essai ? 1 : 0 })}`, fd);
  }

  async function lire(f: File) {
    setFichier(f);
    setErreur(null);
    setRapport(null);
    setDecisions({});
    setEnvoi(true);
    try {
      const r = await appeler(f, true, null, {});
      setFeuillesDispo(r.feuillesDispo);
      if (r.choisirFeuille) setFeuilles([]);
      else {
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

  function choisirOnglet(r: Rapport) {
    const d = r.details;
    if (!d) return;
    setOnglet(d.aMettreAJour.length ? "maj" : d.doublonsFichier.length ? "fichier" : d.doublonsBase.length ? "base" : "connus");
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

  // Les décisions changent le résumé : on refait l'essai un instant après le dernier clic
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

  async function importer() {
    if (!fichier) return;
    setEnvoi(true);
    try {
      const r = await appeler(fichier, false, feuilles, decisions);
      fermer();
      apres(
        [
          `${r.ajoutes} dossier(s) ajouté(s)`,
          r.misAJour ? `${r.misAJour} mis à jour dans la base` : "",
          r.fusionnes ? `${r.fusionnes} fusionné(s)` : "",
          r.ignores ? `${r.ignores} non importé(s)` : "",
          r.dejaLa ? `${r.dejaLa} déjà dans la campagne (gardés tels quels)` : "",
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

  function fermer() {
    setFichier(null);
    setFeuillesDispo(null);
    setFeuilles([]);
    setRapport(null);
    setDecisions({});
    setErreur(null);
    premier.current = true;
  }

  const decider = (cles: string[], d: Decision) => setDecisions((x) => Object.fromEntries([...Object.entries(x), ...cles.map((c) => [c, d] as const)]));
  const d = rapport?.details;

  return (
    <>
      <ZoneFichier accept=".xlsx" envoi={envoi && etape === 0} envoyer={lire} libelleBouton="Choisir le fichier" aide="Fichier Excel (.xlsx)" />
      {fichier && (
        <Modale titre="Importer une liste Excel" ouverte fermer={fermer} large>
          <div className="space-y-4 text-[13px]">
            {/* Les trois étapes, toujours visibles */}
            <ol className="flex flex-wrap items-center gap-2 text-[12px]">
              {["Choisir la feuille", "Vérifier et décider", "Importer"].map((t, i) => {
                return (
                  <li key={t} className="flex items-center gap-2">
                    <span
                      className={`grid size-6 place-items-center rounded-full font-semibold ${i < etape ? "bg-marque-600 text-white" : i === etape ? "bg-marque-100 text-marque-800 ring-2 ring-marque-300" : "bg-zinc-100 text-zinc-500"}`}
                    >
                      {i < etape ? <Check className="size-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span className={i === etape ? "font-semibold text-encre" : "text-zinc-500"}>{t}</span>
                    {i < 2 && <ArrowRight className="size-3.5 text-zinc-300" aria-hidden />}
                  </li>
                );
              })}
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

            {/* 1. Feuille */}
            {!rapport && feuillesDispo && (
              <div className="space-y-3">
                <p className="text-zinc-600">Ce fichier a plusieurs feuilles. Cochez celle (ou celles) à envoyer au système :</p>
                <div className="grid gap-2 sm:grid-cols-2">
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

            {/* 2. Vérification */}
            {rapport && d && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Tuile n={rapport.lues} texte="lignes lues" />
                  <Tuile n={rapport.ajoutes} texte="seront ajoutés" ton="vert" />
                  <Tuile n={rapport.misAJour} texte="mis à jour dans la base" ton="bleu" />
                  <Tuile n={rapport.dejaLa + rapport.fusionnes + rapport.ignores} texte="identiques, fusionnés ou écartés" ton="gris" />
                </div>
                {(rapport.nonConformes > 0 || rapport.aVerifier > 0 || rapport.sansDiplome > 0) && (
                  <ul className="space-y-1 rounded-2xl bg-amber-50 px-4 py-3 text-[12px] text-amber-900 ring-1 ring-amber-200">
                    {rapport.nonConformes > 0 && <li>{rapport.nonConformes} diplôme(s) non conforme(s) : mis de côté dans « Non retenus », avec le motif.</li>}
                    {rapport.aVerifier > 0 && <li>{rapport.aVerifier} diplôme(s) à vérifier : signalés sur le dossier.</li>}
                    {rapport.sansDiplome > 0 && <li>{rapport.sansDiplome} sans diplôme lisible : à corriger au contrôle.</li>}
                  </ul>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <Onglet actif={onglet === "maj"} n={d.aMettreAJour.length} icone={RefreshCw} texte="Déjà dans la campagne, avec du nouveau" choisir={() => setOnglet("maj")} />
                  <Onglet actif={onglet === "fichier"} n={d.doublonsFichier.length} icone={Copy} texte="Deux fois dans le fichier" choisir={() => setOnglet("fichier")} />
                  <Onglet actif={onglet === "base"} n={d.doublonsBase.length} icone={Users} texte="Ressemble à un dossier de la campagne" choisir={() => setOnglet("base")} />
                  <Onglet actif={onglet === "connus"} n={d.connus.length} icone={UserCheck} texte="Déjà connu ailleurs" choisir={() => setOnglet("connus")} />
                </div>

                <div className="max-h-[46vh] overflow-y-auto rounded-2xl ring-1 ring-zinc-200">
                  {onglet === "maj" && (
                    <Liste
                      vide="Aucune personne de la campagne n’a de valeur différente dans le fichier."
                      aide="Même nom et même date de naissance qu’un dossier déjà saisi, avec des valeurs différentes. Par défaut, la base est gardée."
                      lignes={d.aMettreAJour}
                      groupe={[
                        { d: "MAJ", texte: "Tout mettre à jour" },
                        { d: "IGNORER", texte: "Tout garder comme dans la base" },
                      ]}
                      decider={decider}
                      rendre={(x) => (
                        <>
                          <Personne x={x} />
                          <table className="mt-1.5 w-full text-[12px]">
                            <tbody>
                              {x.ecarts.map((e) => (
                                <tr key={e.champ}>
                                  <td className="w-40 py-0.5 pr-2 text-zinc-500">{e.libelle}</td>
                                  <td className="py-0.5 pr-2 text-zinc-500 line-through decoration-zinc-300">{e.base || "vide"}</td>
                                  <td className="py-0.5 font-medium text-sky-800">→ {e.fichier}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {x.existant.dansUneNote && <p className="mt-1 text-[11px] text-amber-700">Dans une note validée : il ne peut pas être mis à jour ici.</p>}
                        </>
                      )}
                      choix={(x) => [
                        { d: "MAJ" as Decision, texte: "Mettre à jour la base", desactive: x.existant.dansUneNote },
                        { d: "IGNORER" as Decision, texte: "Garder la base" },
                      ]}
                      defaut={() => "IGNORER"}
                      decisions={decisions}
                    />
                  )}
                  {onglet === "fichier" && (
                    <Liste
                      vide="Personne n’apparaît deux fois dans le fichier."
                      aide="La même personne écrite deux fois (ou un nom très proche, même date). Fusionner : une seule fiche, complétée avec les deux lignes."
                      lignes={d.doublonsFichier}
                      groupe={[
                        { d: "FUSION", texte: "Tout fusionner" },
                        { d: "AJOUTER", texte: "Tout garder en double" },
                      ]}
                      decider={decider}
                      rendre={(x) => (
                        <>
                          <Personne x={x} />
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-zinc-600">
                            <GitMerge className="size-3.5 text-zinc-400" aria-hidden />
                            {x.exact ? "Identique à" : "Ressemble à"} <strong className="text-encre">{x.avec.nom}</strong> ({date(x.avec.naissance)}, {ligneExcel(x.avec.cle)})
                          </p>
                        </>
                      )}
                      choix={() => [
                        { d: "FUSION" as Decision, texte: "Fusionner" },
                        { d: "AJOUTER" as Decision, texte: "Deux personnes" },
                        { d: "IGNORER" as Decision, texte: "Ne pas importer" },
                      ]}
                      defaut={(x) => (x.exact ? "FUSION" : "AJOUTER")}
                      decisions={decisions}
                    />
                  )}
                  {onglet === "base" && (
                    <Liste
                      vide="Aucune ligne ne ressemble à un dossier déjà saisi."
                      aide="Nom écrit autrement, même date de naissance qu’un dossier de la campagne. Fusionner : le dossier de la base est mis à jour avec la ligne du fichier, sans en créer un autre."
                      lignes={d.doublonsBase}
                      groupe={[
                        { d: "MAJ", texte: "Tout fusionner avec la base" },
                        { d: "AJOUTER", texte: "Tout ajouter (à trancher ensuite)" },
                        { d: "IGNORER", texte: "Ne rien importer" },
                      ]}
                      decider={decider}
                      rendre={(x) => (
                        <>
                          <Personne x={x} />
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-zinc-600">
                            <Users className="size-3.5 text-zinc-400" aria-hidden />
                            Dans la campagne : <strong className="text-encre">{x.existant.nom}</strong> ({date(x.existant.naissance)})
                          </p>
                        </>
                      )}
                      choix={() => [
                        { d: "MAJ" as Decision, texte: "Fusionner avec la base" },
                        { d: "AJOUTER" as Decision, texte: "Ajouter quand même" },
                        { d: "IGNORER" as Decision, texte: "Ne pas importer" },
                      ]}
                      defaut={() => "AJOUTER"}
                      decisions={decisions}
                    />
                  )}
                  {onglet === "connus" && (
                    <Liste
                      vide="Personne n’est connu ailleurs dans le système."
                      aide="Ressemble à un recruté de la Fonction publique, à un agent de la base du personnel, à un volontaire ou communautaire, ou à un enrôlé d’une autre année. Ajoutés, ils seront à trancher dans « À trancher avant de retenir »."
                      lignes={d.connus}
                      groupe={[
                        { d: "AJOUTER", texte: "Tout importer (à trancher)" },
                        { d: "IGNORER", texte: "Ne rien importer" },
                      ]}
                      decider={decider}
                      rendre={(x) => (
                        <>
                          <Personne x={x} />
                          <ul className="mt-1 space-y-0.5 text-[12px] text-zinc-600">
                            {x.sources.map((s, i) => (
                              <li key={i} className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">{s.source}</span>
                                {s.nom} · {date(s.naissance)} {s.detail ? `· ${s.detail}` : ""}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      choix={() => [
                        { d: "AJOUTER" as Decision, texte: "Importer" },
                        { d: "IGNORER" as Decision, texte: "Ne pas importer" },
                      ]}
                      defaut={() => "AJOUTER"}
                      decisions={decisions}
                    />
                  )}
                </div>
                {rapport.tronque && <p className="text-[12px] text-amber-700">Les listes sont longues : seules les 2 000 premières lignes de chaque groupe sont montrées (les boutons « Tout… » s’appliquent à elles).</p>}
                {erreur && <p className="flex items-center gap-1.5 text-[12px] font-medium text-rouge-600"><AlertTriangle className="size-3.5" aria-hidden /> {erreur}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                  <span className="text-[12px] text-zinc-500">{envoi ? "Mise à jour du résumé…" : "Le résumé suit vos choix."}</span>
                  <span className="flex gap-2">
                    <Bouton onClick={fermer}>Annuler</Bouton>
                    <Bouton variante="principal" chargement={envoi} disabled={!rapport.ajoutes && !rapport.misAJour} onClick={importer}>
                      Importer : {rapport.ajoutes} ajout(s){rapport.misAJour ? `, ${rapport.misAJour} mise(s) à jour` : ""}
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

function Tuile({ n, texte, ton }: { n: number; texte: string; ton?: "vert" | "bleu" | "gris" }) {
  const c = ton === "vert" ? "bg-marque-50 text-marque-800" : ton === "bleu" ? "bg-sky-50 text-sky-800" : ton === "gris" ? "bg-zinc-50 text-zinc-700" : "bg-white text-encre ring-1 ring-zinc-200";
  return (
    <div className={`rounded-2xl px-3 py-2.5 ${c}`}>
      <div className="text-[20px] font-semibold tabular-nums">{n.toLocaleString("fr-FR")}</div>
      <div className="text-[11px] leading-tight">{texte}</div>
    </div>
  );
}

function Onglet({ actif, n, icone: Icone, texte, choisir }: { actif: boolean; n: number; icone: typeof Users; texte: string; choisir: () => void }) {
  return (
    <button
      type="button"
      onClick={choisir}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition ${actif ? "bg-nuit text-white ring-nuit" : n ? "bg-white text-encre ring-zinc-200 hover:ring-zinc-300" : "bg-white text-zinc-400 ring-zinc-100"}`}
    >
      <Icone className="size-3.5" aria-hidden />
      {texte}
      <span className={`rounded-full px-1.5 tabular-nums ${actif ? "bg-white/20" : n ? "bg-amber-100 text-amber-800" : "bg-zinc-100"}`}>{n}</span>
    </button>
  );
}

function Personne({ x }: { x: Ident }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-semibold text-encre">{x.nom}</span>
      <span className="text-[12px] text-zinc-500">né(e) le {date(x.naissance)}</span>
      <span className="text-[11px] text-zinc-400">{ligneExcel(x.cle)}</span>
    </div>
  );
}

/** Une liste à décider : chaque ligne a ses boutons, et des boutons pour tout le groupe. */
function Liste<T extends Ident>({
  lignes,
  vide,
  aide,
  groupe,
  decider,
  rendre,
  choix,
  defaut,
  decisions,
}: {
  lignes: T[];
  vide: string;
  aide: string;
  groupe: { d: Decision; texte: string }[];
  decider: (cles: string[], d: Decision) => void;
  rendre: (x: T) => React.ReactNode;
  choix: (x: T) => { d: Decision; texte: string; desactive?: boolean }[];
  defaut: (x: T) => Decision;
  decisions: Record<string, Decision>;
}) {
  const [voir, setVoir] = useState(50);
  if (!lignes.length) return <p className="p-6 text-center text-zinc-500">{vide}</p>;
  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-white/95 px-4 py-2.5 backdrop-blur">
        <span className="flex-1 text-[12px] text-zinc-500">{aide}</span>
        {groupe.map((g) => (
          <Bouton key={g.d} variante="discret" onClick={() => decider(lignes.map((x) => x.cle), g.d)}>
            {g.texte}
          </Bouton>
        ))}
      </div>
      <ul className="divide-y divide-zinc-100">
        {lignes.slice(0, voir).map((x) => {
          const actuelle = decisions[x.cle] ?? defaut(x);
          return (
            <li key={x.cle} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start">
              <div className="min-w-0 flex-1">{rendre(x)}</div>
              <div className="flex shrink-0 flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
                {choix(x).map((c) => (
                  <button
                    key={c.d}
                    type="button"
                    disabled={c.desactive}
                    onClick={() => decider([x.cle], c.d)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition disabled:opacity-40 ${actuelle === c.d ? "bg-white text-encre shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:text-encre"}`}
                  >
                    {c.texte}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {lignes.length > voir && (
        <div className="p-3 text-center">
          <Bouton variante="discret" onClick={() => setVoir((v) => v + 100)}>
            Voir 100 de plus ({lignes.length - voir} restantes)
          </Bouton>
        </div>
      )}
    </div>
  );
}
