"use client";

import { Check, Coffee, Download, FileSpreadsheet, ScanSearch, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/pagination";
import { Alerte, Badge, Bouton, Carte, Modale, Saisie, Segments } from "@/components/ui";
import { api } from "@/lib/api";

interface Membre {
  origine: string;
  feuille: string | null;
  ligne: number | null;
  nom: string;
  naissance: string | null;
  details: string;
}

type Doute = "NOM_PROCHE" | "DATE_DIFFERENTE" | "DATE_MANQUANTE";
type Decision = "MEME" | "DIFFERENTE";

interface Douteux {
  id: string;
  doute: Doute;
  libelle: string;
  suggestion: Decision | null;
  memeNaissance: boolean;
  a: Membre[];
  b: Membre[];
}

interface Resultat {
  fichiers: { nom: string; feuilles: { nom: string; lignes: number }[]; personnes: number; ecartesBase: number; ecartesFichiers: number }[];
  avecBase: boolean;
  bases: { nom: string; personnes: number }[];
  surs: Membre[][];
  sursTotal: number;
  douteux: Douteux[];
}

const nf = new Intl.NumberFormat("fr-FR");
const date = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "date ?");
const PAR_PAGE = 30;
const ou = (m: Membre) => (m.feuille ? `${m.origine} › ${m.feuille}, ligne ${m.ligne}` : m.origine);

/** Une personne (ou un groupe de lignes déjà reconnues comme la même personne). */
function Cote({ membres }: { membres: Membre[] }) {
  return (
    <ul className="space-y-1.5">
      {membres.map((m, k) => (
        <li key={k} className="leading-snug">
          <strong className="text-encre">{m.nom}</strong> <span className="text-zinc-500">· {date(m.naissance)}</span>
          <div className={m.feuille ? "text-zinc-600" : "font-medium text-rouge-600"}>{ou(m)}</div>
          {m.details && <div className="text-[11px] text-zinc-400">{m.details}</div>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Rapprochement et détection des doublons (DG, 08/11/2026). Jusqu'à 4 fichiers Excel comparés
 * entre eux et avec toutes les bases du système, sauf la base des enrôlés. Les doublons sûrs sont
 * écartés d'office ; les cas douteux sont tranchés ici. On télécharge ensuite le fichier des
 * doublons (avec la raison) et le fichier nettoyé. Rien n'est enregistré.
 */
export function DetectionDoublons() {
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [avecBase, setAvecBase] = useState(true);
  const [masquees, setMasquees] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [prevenir, setPrevenir] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [r, setR] = useState<Resultat | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  // Décisions prises à la main (les autres sont des propositions du système)
  const [touchees, setTouchees] = useState<Set<string>>(new Set());
  const [vue, setVue] = useState<"tous" | "restants" | Doute>("restants");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [voirSurs, setVoirSurs] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const [feuilles, setFeuilles] = useState<{ nom: string; lignes: number; masquee: boolean; coche: boolean }[][] | null>(null);

  useEffect(() => {
    let actif = true;
    if (!fichiers.length) return;
    const fd = new FormData();
    for (const f of fichiers) fd.append("fichiers", f);
    fd.append("masquees", masquees ? "1" : "0");
    api
      .post<{ nom: string; feuilles: { nom: string; lignes: number; masquee: boolean }[] }[]>("/rapprochement/feuilles", fd)
      .then((x) => actif && setFeuilles(x.map((f) => f.feuilles.map((y) => ({ ...y, coche: !y.masquee && y.lignes > 0 })))))
      .catch((e: Error) => actif && setErreur(e.message));
    return () => {
      actif = false;
    };
  }, [fichiers, masquees]);

  const oublier = () => {
    setR(null);
    setDecisions({});
    setTouchees(new Set());
  };
  const basculerFeuille = (i: number, nom: string) => {
    setFeuilles((f) => f && f.map((liste, k) => (k === i ? liste.map((x) => (x.nom === nom ? { ...x, coche: !x.coche } : x)) : liste)));
    oublier();
  };

  const donnees = (avecDecisions = false) => {
    const fd = new FormData();
    for (const f of fichiers) fd.append("fichiers", f);
    fd.append("avecBase", avecBase ? "1" : "0");
    fd.append("masquees", masquees ? "1" : "0");
    if (feuilles) fd.append("feuilles", JSON.stringify(feuilles.map((l) => l.filter((x) => x.coche).map((x) => x.nom))));
    if (avecDecisions) fd.append("decisions", JSON.stringify(decisions));
    return fd;
  };

  async function analyser() {
    setEnvoi(true);
    setErreur(null);
    try {
      const x = await api.post<Resultat>("/rapprochement/doublons", donnees());
      setR(x);
      // Propositions du système : date différente → deux personnes ; même date, nom écrit autrement → la même
      setDecisions(Object.fromEntries(x.douteux.filter((d) => d.suggestion).map((d) => [d.id, d.suggestion as Decision])));
      setTouchees(new Set());
      setPage(1);
      setVue("restants");
    } catch (e) {
      oublier();
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function telecharger(quoi: "doublons" | "nettoye") {
    setErreur(null);
    const le = new Date().toLocaleDateString("fr-FR").replaceAll("/", "-");
    try {
      await api.telechargerPost(`/rapprochement/doublons/${quoi}`, donnees(true), quoi === "doublons" ? `Doublons détectés ${le}.xlsx` : `Fichier nettoyé sans doublons ${le}.xlsx`);
    } catch (e) {
      setErreur(`Le fichier n’a pas pu être préparé : ${(e as Error).message}`);
    }
  }

  const decider = (ids: string[], d: Decision) => {
    setDecisions((x) => ({ ...x, ...Object.fromEntries(ids.map((id) => [id, d])) }));
    setTouchees((t) => new Set([...t, ...ids]));
  };

  const douteux = useMemo(() => r?.douteux ?? [], [r]);
  const restants = douteux.filter((d) => !decisions[d.id]).length;
  const q = recherche.trim().toUpperCase();
  const visibles = douteux.filter(
    (d) =>
      (vue === "tous" || (vue === "restants" ? !decisions[d.id] : d.doute === vue)) &&
      (!q || [...d.a, ...d.b].some((m) => m.nom.toUpperCase().includes(q))),
  );
  const pages = Math.max(1, Math.ceil(visibles.length / PAR_PAGE));
  const pageVue = Math.min(page, pages);
  const compte = (doute: Doute) => douteux.filter((d) => d.doute === doute).length;
  const memes = Object.values(decisions).filter((d) => d === "MEME").length;

  return (
    <div className="space-y-5">
      <Carte titre="Rapprochement et détection des doublons">
        <div className="space-y-4">
          <div className="space-y-2 text-[13px] leading-relaxed text-zinc-600">
            <p>
              Déposez <strong>jusqu’à 4 fichiers Excel</strong> (listes d’enrôlement, listes reçues…). Le système cherche chaque personne{" "}
              <strong>dans le même fichier</strong>, <strong>d’un fichier à l’autre</strong>, et <strong>dans toutes les bases du système</strong> si vous le cochez :
              personnel, recrutés, recrutés des années passées, volontaires et communautaires, états de la bourse, demandes de mutation et de prestation,
              nominations. <strong>La base des enrôlés n’est jamais comparée.</strong>
            </p>
            <p>
              Les doublons <strong>sûrs</strong> (même nom, même date de naissance) sont écartés d’office. Les cas <strong>douteux</strong> (nom écrit autrement, date
              absente ou différente) vous sont montrés : vous décidez <em>même personne</em> ou <em>pas la même personne</em>. Vous téléchargez ensuite{" "}
              <strong>le fichier des doublons</strong>, avec la raison de chacun, et <strong>le fichier nettoyé</strong>. Le fichier nettoyé garde chaque personne
              une seule fois et ne contient personne de déjà connu dans une base. <strong>Rien n’est enregistré dans le système.</strong>
            </p>
          </div>
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
              oublier();
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            {fichiers.map((f, i) => (
              <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 py-1.5 pr-1.5 pl-3 text-[12px]">
                <FileSpreadsheet className="size-3.5 text-marque-600" />
                <strong>Fichier {i + 1}</strong> {f.name}
                <button
                  type="button"
                  title="Retirer ce fichier"
                  className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-rouge-600"
                  onClick={() => {
                    setFichiers((x) => x.filter((_, k) => k !== i));
                    setFeuilles(null);
                    oublier();
                  }}
                >
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
              <div className="font-semibold text-encre">Feuilles à lire</div>
              <p className="text-zinc-500">
                Une feuille qui reprend les autres (une « Liste générale » à côté des feuilles par diplôme, par exemple) ferait apparaître tout le monde en double : ne
                cochez que les feuilles utiles.
              </p>
              {feuilles.map((liste, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <strong className="w-20 shrink-0">Fichier {i + 1}</strong>
                  {liste.length ? (
                    liste.map((x) => (
                      <label key={x.nom} className={`inline-flex items-center gap-1.5 ${x.lignes ? "" : "text-zinc-400"}`}>
                        <input type="checkbox" className="size-3.5 accent-marque-600" checked={x.coche} onChange={() => basculerFeuille(i, x.nom)} />
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
              <input
                type="checkbox"
                className="size-4 accent-marque-600"
                checked={avecBase}
                onChange={(e) => {
                  setAvecBase(e.target.checked);
                  oublier();
                }}
              />
              Comparer aussi avec toutes les bases du système (sauf la base des enrôlés)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-marque-600"
                checked={masquees}
                onChange={(e) => {
                  setMasquees(e.target.checked);
                  oublier();
                }}
              />
              Lire aussi les feuilles masquées
            </label>
          </div>
          {erreur && <Alerte>{erreur}</Alerte>}
          <div className="flex justify-end">
            <Bouton
              variante="principal"
              chargement={envoi}
              disabled={!fichiers.length || (!!feuilles && feuilles.some((l) => !l.some((x) => x.coche)))}
              onClick={() => setPrevenir(true)}
            >
              <ScanSearch /> {envoi ? "Recherche des doublons…" : "Rechercher les doublons"}
            </Bouton>
          </div>
        </div>
      </Carte>

      <Modale titre="Avant de lancer la recherche" ouverte={prevenir} fermer={() => setPrevenir(false)}>
        <div className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-or-100 text-or-700">
            <Coffee className="size-5" />
          </div>
          <div className="space-y-2 text-[13px] leading-relaxed text-zinc-600">
            <p>
              Le système va lire {fichiers.length > 1 ? `les ${fichiers.length} fichiers` : "le fichier"} ligne par ligne et chercher chaque personne
              {avecBase ? " dans toutes les bases du système (sauf celle des enrôlés)" : " d’un fichier à l’autre"}, même quand son nom est écrit autrement.
            </p>
            <p>
              <strong>Cela peut prendre une à deux minutes.</strong> Laissez cette page ouverte : le résultat s’affichera en dessous.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setPrevenir(false)}>Pas maintenant</Bouton>
          <Bouton
            variante="principal"
            onClick={() => {
              setPrevenir(false);
              void analyser();
            }}
          >
            <ScanSearch /> D’accord, lancer la recherche
          </Bouton>
        </div>
      </Modale>

      {r && (
        <>
          <Carte titre="Ce qui a été trouvé">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] tracking-wide text-zinc-500 uppercase">
                    <th className="py-2 pr-3 font-semibold">Fichier</th>
                    <th className="px-3 py-2 text-right font-semibold">Personnes lues</th>
                    {r.avecBase && <th className="px-3 py-2 text-right font-semibold">Déjà dans une base</th>}
                    <th className="px-3 py-2 text-right font-semibold">En double dans les fichiers</th>
                  </tr>
                </thead>
                <tbody>
                  {r.fichiers.map((f, i) => (
                    <tr key={i} className="border-t border-zinc-100">
                      <td className="py-2 pr-3">
                        <div className="font-medium">
                          Fichier {i + 1} : {f.nom}
                        </div>
                        <div className="text-[11px] text-zinc-400">Feuilles lues : {f.feuilles.map((x) => x.nom).join(", ")}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{nf.format(f.personnes)}</td>
                      {r.avecBase && <td className={`px-3 py-2 text-right tabular-nums ${f.ecartesBase ? "font-semibold text-rouge-600" : ""}`}>{nf.format(f.ecartesBase)}</td>}
                      <td className={`px-3 py-2 text-right tabular-nums ${f.ecartesFichiers ? "font-semibold text-or-700" : ""}`}>{nf.format(f.ecartesFichiers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
              Chiffres des doublons <strong>sûrs</strong>, écartés d’office ; s’y ajouteront les cas douteux que vous jugerez « même personne ».{" "}
              {r.avecBase
                ? `Bases comparées : ${r.bases.map((b) => `${b.nom.toLowerCase()} (${nf.format(b.personnes)})`).join(", ")}. La base des enrôlés n’est pas comparée.`
                : "Les bases du système n’ont pas été comparées."}
            </p>
            {r.sursTotal > 0 && (
              <div className="mt-3">
                <Bouton variante="discret" onClick={() => setVoirSurs((v) => !v)}>
                  {voirSurs ? "Masquer" : "Voir"} les doublons sûrs ({nf.format(r.sursTotal)} personnes)
                </Bouton>
                {voirSurs && (
                  <div className="mt-2 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {r.surs.slice(0, 300).map((g, i) => (
                      <div key={i} className="rounded-2xl bg-rouge-100/40 px-4 py-3 text-[12px] ring-1 ring-rouge-100">
                        <Cote membres={g} />
                      </div>
                    ))}
                    {r.surs.length > 300 && <p className="text-[12px] text-zinc-500">300 premières affichées : le fichier des doublons les reprend toutes.</p>}
                  </div>
                )}
              </div>
            )}
          </Carte>

          <Carte
            titre={`Cas douteux à trancher (${nf.format(douteux.length)})`}
            actions={
              <Saisie
                className="w-56"
                placeholder="Rechercher un nom…"
                value={recherche}
                onChange={(e) => {
                  setRecherche(e.target.value);
                  setPage(1);
                }}
              />
            }
          >
            {!douteux.length ? (
              <p className="text-[13px] text-zinc-500">Aucun cas douteux : les fichiers sont prêts à être téléchargés.</p>
            ) : (
              <div className="space-y-3">
                <div className={`rounded-2xl px-4 py-3 text-[13px] ${restants ? "bg-or-100/60 text-or-700" : "bg-marque-50 text-marque-700"}`}>
                  {restants ? (
                    <>
                      <strong>{nf.format(restants)}</strong> cas restent à trancher avant de télécharger. Le système a déjà proposé une réponse pour{" "}
                      {nf.format(douteux.filter((d) => d.suggestion).length)} cas (date différente → deux personnes ; même date, nom écrit autrement → la même) :
                      vérifiez-les, vous pouvez les changer.
                    </>
                  ) : (
                    <>
                      Tout est tranché : {nf.format(memes)} « même personne », {nf.format(douteux.length - memes)} « pas la même personne ». Vous pouvez télécharger
                      les fichiers.
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Segments
                    valeur={vue}
                    changer={(v) => {
                      setVue(v);
                      setPage(1);
                    }}
                    options={[
                      { valeur: "restants", libelle: `À trancher (${nf.format(restants)})` },
                      { valeur: "NOM_PROCHE", libelle: `Nom écrit autrement (${nf.format(compte("NOM_PROCHE"))})` },
                      { valeur: "DATE_MANQUANTE", libelle: `Date absente (${nf.format(compte("DATE_MANQUANTE"))})` },
                      { valeur: "DATE_DIFFERENTE", libelle: `Date différente (${nf.format(compte("DATE_DIFFERENTE"))})` },
                      { valeur: "tous", libelle: "Tous" },
                    ]}
                  />
                  {visibles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Bouton variante="discret" onClick={() => decider(visibles.map((d) => d.id), "MEME")} title="Pour tous les cas de cette liste (filtre et recherche compris)">
                        Tous ceux-ci : même personne
                      </Bouton>
                      <Bouton variante="discret" onClick={() => decider(visibles.map((d) => d.id), "DIFFERENTE")} title="Pour tous les cas de cette liste (filtre et recherche compris)">
                        Tous ceux-ci : pas la même
                      </Bouton>
                    </div>
                  )}
                </div>
                {!visibles.length ? (
                  <p className="text-[13px] text-zinc-500">Aucun cas dans cette liste.</p>
                ) : (
                  <div className="space-y-2">
                    {visibles.slice((pageVue - 1) * PAR_PAGE, pageVue * PAR_PAGE).map((d) => {
                      const choix = decisions[d.id];
                      const propose = !!choix && choix === d.suggestion && !touchees.has(d.id);
                      return (
                        <div
                          key={d.id}
                          className={`rounded-2xl px-4 py-3 text-[12px] ring-1 ${choix === "MEME" ? "bg-rouge-100/30 ring-rouge-100" : choix === "DIFFERENTE" ? "bg-marque-50/60 ring-marque-100" : "bg-white ring-or-400/50"}`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge ton={d.doute === "DATE_DIFFERENTE" ? "bleu" : "jaune"}>{d.libelle}</Badge>
                            {d.memeNaissance && <Badge ton="gris">même date de naissance</Badge>}
                            {propose && <Badge ton="gris">réponse proposée</Badge>}
                          </div>
                          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                            <Cote membres={d.a} />
                            <div className="hidden items-center text-zinc-300 md:flex">≈</div>
                            <Cote membres={d.b} />
                          </div>
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Bouton variante={choix === "MEME" ? "principal" : "secondaire"} onClick={() => decider([d.id], "MEME")}>
                              {choix === "MEME" && <Check />} Même personne (doublon)
                            </Bouton>
                            <Bouton variante={choix === "DIFFERENTE" ? "principal" : "secondaire"} onClick={() => decider([d.id], "DIFFERENTE")}>
                              {choix === "DIFFERENTE" && <Check />} Pas la même personne
                            </Bouton>
                          </div>
                        </div>
                      );
                    })}
                    <Pagination page={pageVue} pages={pages} aller={setPage} />
                  </div>
                )}
              </div>
            )}
          </Carte>

          <Carte titre="Télécharger">
            <div className="space-y-3 text-[13px] text-zinc-600">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Fichier des doublons</strong> : chaque ligne écartée, avec la raison (en double dans le même fichier, dans un autre fichier, déjà dans telle
                  base) et la ligne gardée à sa place. Les cas jugés « pas la même personne » y sont rappelés.
                </li>
                <li>
                  <strong>Fichier nettoyé</strong> : les feuilles lues, recopiées avec leur mise en forme, sans les doublons. Une personne écrite dans plusieurs
                  fichiers n’y figure qu’une fois (la ligne la plus complète) ; une personne déjà dans une base n’y figure pas. La colonne « N° » est renumérotée.
                </li>
              </ul>
              <div className="flex flex-wrap justify-end gap-2">
                <Bouton disabled={restants > 0} title={restants ? "Tranchez d’abord les cas douteux" : undefined} onClick={() => telecharger("doublons")}>
                  <Download /> Fichier des doublons (Excel)
                </Bouton>
                <Bouton variante="principal" disabled={restants > 0} title={restants ? "Tranchez d’abord les cas douteux" : undefined} onClick={() => telecharger("nettoye")}>
                  <Download /> Fichier nettoyé (Excel)
                </Bouton>
              </div>
            </div>
          </Carte>
        </>
      )}
    </div>
  );
}
