"use client";

import { Coffee, Download, FileSpreadsheet, GitCompare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alerte, Badge, Bouton, Carte, Modale, Saisie, Segments, Tableau } from "@/components/ui";
import { api, API_URL, lireSession } from "@/lib/api";

interface Membre {
  origine: string;
  feuille: string | null;
  ligne: number | null;
  nom: string;
  naissance: string | null;
  details: string;
}

interface Resultat {
  fichiers: {
    nom: string;
    feuilles: { nom: string; lignes: number }[];
    personnes: number;
    doublonsInternes: number;
    dansAutresFichiers: number;
    dansBase: number;
    nullePart: number;
  }[];
  avecBase: boolean;
  base: { recrutes: number; anciens: number };
  groupes: { niveau: "IDENTIQUE" | "PROBABLE"; dansBase: boolean; doublonInterne: boolean; membres: Membre[] }[];
  groupesTotal: number;
  homonymes: Membre[][];
}

const nf = new Intl.NumberFormat("fr-FR");
const date = (d: string | null) => (d ? d.split("-").reverse().join("/") : "date ?");

/**
 * Rapprochement : jusqu'à 4 fichiers Excel comparés entre eux, et avec la base du système si
 * on le coche. Rien n'est enregistré : c'est une vérification.
 */
export function ComparerFichiers() {
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [avecBase, setAvecBase] = useState(true);
  const [masquees, setMasquees] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  // Avertissement avant de lancer : une comparaison de gros fichiers peut durer quelques minutes
  const [prevenir, setPrevenir] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [r, setR] = useState<Resultat | null>(null);
  const [vue, setVue] = useState<"tous" | "base" | "fichiers" | "doublons">("tous");
  const [recherche, setRecherche] = useState("");
  const champ = useRef<HTMLInputElement>(null);
  // Feuilles de chaque fichier, cochées = comparées
  const [feuilles, setFeuilles] = useState<{ nom: string; lignes: number; masquee: boolean; coche: boolean }[][] | null>(null);
  useEffect(() => {
    let actif = true;
    if (!fichiers.length) return;
    const fd = new FormData();
    for (const f of fichiers) fd.append("fichiers", f);
    fd.append("masquees", masquees ? "1" : "0");
    api
      .post<{ nom: string; feuilles: { nom: string; lignes: number; masquee: boolean }[] }[]>("/rapprochement/feuilles", fd)
      .then((r) => actif && setFeuilles(r.map((f) => f.feuilles.map((x) => ({ ...x, coche: !x.masquee && x.lignes > 0 })))))
      .catch((e: Error) => actif && setErreur(e.message));
    return () => {
      actif = false;
    };
  }, [fichiers, masquees]);
  const basculerFeuille = (i: number, nom: string) =>
    setFeuilles((f) => f && f.map((liste, k) => (k === i ? liste.map((x) => (x.nom === nom ? { ...x, coche: !x.coche } : x)) : liste)));

  const donnees = () => {
    const fd = new FormData();
    for (const f of fichiers) fd.append("fichiers", f);
    fd.append("avecBase", avecBase ? "1" : "0");
    fd.append("masquees", masquees ? "1" : "0");
    if (feuilles) fd.append("feuilles", JSON.stringify(feuilles.map((l) => l.filter((x) => x.coche).map((x) => x.nom))));
    return fd;
  };

  async function comparer() {
    setEnvoi(true);
    setErreur(null);
    try {
      setR(await api.post<Resultat>("/rapprochement", donnees()));
    } catch (e) {
      setR(null);
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function excel() {
    const { jeton } = lireSession();
    const rep = await fetch(`${API_URL}/rapprochement/excel`, { method: "POST", headers: jeton ? { Authorization: `Bearer ${jeton}` } : {}, body: donnees() });
    if (!rep.ok) return setErreur("Le fichier du résultat n’a pas pu être préparé.");
    const url = URL.createObjectURL(await rep.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rapprochement ${new Date().toLocaleDateString("fr-FR").replaceAll("/", "-")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const q = recherche.trim().toUpperCase();
  const groupes = (r?.groupes ?? []).filter(
    (g) =>
      (vue === "tous" || (vue === "base" && g.dansBase) || (vue === "fichiers" && new Set(g.membres.filter((m) => !m.origine.startsWith("Base") && !m.origine.startsWith("Recrutés")).map((m) => m.origine)).size > 1) || (vue === "doublons" && g.doublonInterne)) &&
      (!q || g.membres.some((m) => m.nom.toUpperCase().includes(q))),
  );

  return (
    <div className="space-y-5">
      <Carte titre="Comparer des fichiers">
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-zinc-600">
            Déposez <strong>jusqu’à 4 fichiers Excel</strong> (par exemple : la liste d’enrôlement, la bourse, la liste des recrutés, une liste reçue). Le système
            lit toutes les feuilles qui ont une colonne « Noms et prénoms », puis cherche les mêmes personnes : <strong>dans un même fichier</strong> (doublons),{" "}
            <strong>d’un fichier à l’autre</strong>, et <strong>dans la base du système</strong> si vous le cochez. Les noms peuvent être écrits dans un autre ordre
            ou avec une faute de frappe. <strong>Rien n’est enregistré</strong> : c’est une vérification.
          </p>
          <input
            ref={champ}
            type="file"
            accept=".xlsx"
            multiple
            className="hidden"
            onChange={(e) => {
              const nouveaux = [...(e.target.files ?? [])];
              setFichiers((f) => [...f, ...nouveaux].slice(0, 4));
              setFeuilles(null);
              setR(null);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            {fichiers.map((f, i) => (
              <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 py-1.5 pr-1.5 pl-3 text-[12px]">
                <FileSpreadsheet className="size-3.5 text-marque-600" />
                <strong>Fichier {i + 1}</strong> {f.name}
                <button type="button" title="Retirer ce fichier" className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-rouge-600" onClick={() => { setFichiers((x) => x.filter((_, k) => k !== i)); setFeuilles(null); setR(null); }}>
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            {fichiers.length < 4 && (
              <Bouton onClick={() => champ.current?.click()}>
                <FileSpreadsheet /> {fichiers.length ? "Ajouter un fichier" : "Choisir les fichiers"} ({fichiers.length} / 4)
              </Bouton>
            )}
          </div>
          {feuilles && fichiers.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[12px]">
              <div className="font-semibold text-encre">Feuilles à comparer</div>
              <p className="text-zinc-500">
                Une même personne écrite sur plusieurs feuilles d’un fichier (par exemple une feuille par département et une « Liste générale ») compterait
                comme un doublon : ne cochez que les feuilles utiles.
              </p>
              {feuilles.map((liste, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <strong className="w-20 shrink-0">Fichier {i + 1}</strong>
                  {liste.length ? (
                    liste.map((x) => (
                      <label key={x.nom} className={`inline-flex items-center gap-1.5 ${x.lignes ? "" : "text-zinc-400"}`}>
                        <input type="checkbox" className="size-3.5 accent-marque-600" checked={x.coche} onChange={() => { basculerFeuille(i, x.nom); setR(null); }} />
                        {x.nom} ({nf.format(x.lignes)}){x.masquee ? " · masquée" : ""}
                      </label>
                    ))
                  ) : (
                    <span className="text-rouge-600">aucune feuille avec une colonne « Noms et prénoms »</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-marque-600" checked={avecBase} onChange={(e) => { setAvecBase(e.target.checked); setR(null); }} />
              Comparer aussi avec la base du système (Base des recrutés, listes des années passées)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-marque-600" checked={masquees} onChange={(e) => { setMasquees(e.target.checked); setR(null); }} />
              Lire aussi les feuilles masquées
            </label>
          </div>
          {erreur && <Alerte>{erreur}</Alerte>}
          <div className="flex justify-end gap-2">
            {r && (
              <Bouton onClick={excel}>
                <Download /> Télécharger le résultat (Excel)
              </Bouton>
            )}
            <Bouton variante="principal" chargement={envoi} disabled={!fichiers.length || (!!feuilles && feuilles.some((l) => !l.some((x) => x.coche)))} onClick={() => setPrevenir(true)}>
              <GitCompare /> {envoi ? "Comparaison…" : "Comparer"}
            </Bouton>
          </div>
        </div>
      </Carte>

      <Modale titre="Avant de lancer la comparaison" ouverte={prevenir} fermer={() => setPrevenir(false)}>
        <div className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-or-100 text-or-700">
            <Coffee className="size-5" />
          </div>
          <div className="space-y-2 text-[13px] leading-relaxed text-zinc-600">
            <p>
              Le système va lire {fichiers.length > 1 ? `les ${fichiers.length} fichiers` : "le fichier"} ligne par ligne et chercher chaque personne
              {avecBase ? ", y compris dans la base du système" : ""}, même quand son nom est écrit autrement.
            </p>
            <p>
              <strong>Cela peut prendre jusqu’à 5 minutes</strong> si les fichiers sont longs. Pendant ce temps, laissez cette page ouverte : le résultat s’affichera
              tout seul en dessous.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setPrevenir(false)}>Pas maintenant</Bouton>
          <Bouton
            variante="principal"
            onClick={() => {
              setPrevenir(false);
              void comparer();
            }}
          >
            <GitCompare /> D’accord, lancer la comparaison
          </Bouton>
        </div>
      </Modale>

      {r && (
        <>
          <Carte titre="Résultat par fichier">
            <Tableau>
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th className="text-right">Personnes lues</th>
                  <th className="text-right">En double dans le fichier</th>
                  <th className="text-right">Dans un autre fichier</th>
                  {r.avecBase && <th className="text-right">Déjà dans la base</th>}
                  <th className="text-right">Trouvées nulle part</th>
                </tr>
              </thead>
              <tbody>
                {r.fichiers.map((f, i) => (
                  <tr key={f.nom}>
                    <td>
                      <div className="font-medium">
                        Fichier {i + 1} : {f.nom}
                      </div>
                      <div className="text-[11px] text-zinc-400">Feuilles lues : {f.feuilles.map((x) => `${x.nom} (${nf.format(x.lignes)})`).join(", ")}</div>
                    </td>
                    <td className="text-right tabular-nums">{nf.format(f.personnes)}</td>
                    <td className={`text-right tabular-nums ${f.doublonsInternes ? "text-or-700" : ""}`}>{nf.format(f.doublonsInternes)}</td>
                    <td className={`text-right tabular-nums ${f.dansAutresFichiers ? "text-rouge-600" : ""}`}>{nf.format(f.dansAutresFichiers)}</td>
                    {r.avecBase && <td className={`text-right tabular-nums ${f.dansBase ? "text-rouge-600" : ""}`}>{nf.format(f.dansBase)}</td>}
                    <td className="text-right font-semibold text-marque-700 tabular-nums">{nf.format(f.nullePart)}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            <p className="mt-3 text-[12px] text-zinc-500">
              « Trouvées nulle part » : ni en double, ni dans les autres fichiers{r.avecBase ? ", ni dans la base" : ""}. Pour l’enrôlement par exemple, ce sont les
              personnes que l’on peut retenir.{" "}
              {r.avecBase && `Base comparée : ${nf.format(r.base.recrutes)} recrutés et ${nf.format(r.base.anciens)} personnes des années passées.`} Le fichier
              Excel du résultat reprend chaque ligne, en rouge si la personne est trouvée ailleurs.
            </p>
          </Carte>

          <Carte
            titre={`Personnes trouvées plusieurs fois (${nf.format(r.groupesTotal)})`}
            actions={<Saisie className="w-56" placeholder="Rechercher un nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />}
          >
            <div className="mb-3">
              <Segments
                valeur={vue}
                changer={setVue}
                options={[
                  { valeur: "tous", libelle: "Toutes" },
                  ...(r.avecBase ? [{ valeur: "base" as const, libelle: "Déjà dans la base" }] : []),
                  { valeur: "fichiers", libelle: "D’un fichier à l’autre" },
                  { valeur: "doublons", libelle: "Doublons dans un même fichier" },
                ]}
              />
            </div>
            {!groupes.length ? (
              <p className="text-[13px] text-zinc-500">Aucune personne dans ce cas.</p>
            ) : (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {groupes.slice(0, 400).map((g, i) => (
                  <div key={i} className={`rounded-2xl px-4 py-3 ring-1 ${g.niveau === "IDENTIQUE" ? "bg-rouge-100/40 ring-rouge-100" : "bg-or-100/40 ring-or-100"}`}>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge ton={g.niveau === "IDENTIQUE" ? "rouge" : "jaune"}>{g.niveau === "IDENTIQUE" ? "Même personne" : "Très probablement la même personne"}</Badge>
                      {g.dansBase && <Badge>déjà dans la base</Badge>}
                      {g.doublonInterne && <Badge>en double dans un fichier</Badge>}
                    </div>
                    <ul className="space-y-1 text-[12px]">
                      {g.membres.map((m, k) => (
                        <li key={k} className="grid gap-x-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
                          <span>
                            <strong className="text-encre">{m.nom}</strong> <span className="text-zinc-500">· {date(m.naissance)}</span>
                          </span>
                          <span className="text-zinc-600">
                            {m.origine}
                            {m.feuille ? ` › ${m.feuille}, ligne ${m.ligne}` : ""}
                          </span>
                          <span className="text-zinc-500">{m.details}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {groupes.length > 400 && <p className="text-[12px] text-zinc-500">400 premiers affichés : téléchargez le résultat Excel pour tout voir.</p>}
              </div>
            )}
          </Carte>

          {r.homonymes.length > 0 && (
            <Carte titre={`Même nom, date de naissance différente (${nf.format(r.homonymes.length)}) : à vérifier`}>
              <p className="mb-3 text-[12px] text-zinc-500">
                Deux personnes différentes portant le même nom (homonymes), ou une erreur de date dans un des fichiers. Comparez les dossiers.
              </p>
              <div className="max-h-96 space-y-1.5 overflow-y-auto text-[12px]">
                {r.homonymes.map((h, i) => (
                  <div key={i} className="rounded-xl bg-zinc-50 px-3 py-2">
                    {h.map((m, k) => (
                      <div key={k}>
                        <strong>{m.nom}</strong> · {date(m.naissance)} — {m.origine}
                        {m.feuille ? ` › ${m.feuille}, ligne ${m.ligne}` : ""}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Carte>
          )}
        </>
      )}
    </div>
  );
}
