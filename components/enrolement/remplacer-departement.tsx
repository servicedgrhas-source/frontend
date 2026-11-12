"use client";

import { Check, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Champ, ChoixMois, Liste, Modale, Saisie } from "@/components/ui";
import { api, qs } from "@/lib/api";

interface Court {
  n: number;
  exemples: string[];
}

interface Rapport {
  essai: boolean;
  departement: string;
  feuilles: { nom: string; categorie: string; personnes: number }[];
  feuillesIgnorees: string[];
  lus: number;
  personnes: number;
  parCategorie: { libelle: string; avant: number; apres: number }[];
  montantAvant: number;
  montantApres: number;
  gardes: number;
  reintegres: Court;
  nouveaux: Court;
  sortants: Court;
  doublonsDansListe: Court;
  plusieursFiches: Court;
  rapproches: Court;
  ambigus: Court;
  dejaAilleurs: Court;
  possibles: { paire: string; liste: string; registre: string; feuille: string; ligne: number }[];
}

const nf = new Intl.NumberFormat("fr-FR");
const moisCourant = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" }).slice(0, 7);
const aujourdhui = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" });

/** Une liste de noms repliable (les 40 premiers, le nombre exact au-dessus). */
function ListeCourte({ titre, c, ton = "zinc" }: { titre: string; c: Court; ton?: "zinc" | "rouge" | "or" }) {
  if (!c.n) return null;
  return (
    <details className="rounded-xl bg-zinc-50 px-3 py-2 text-[12px]">
      <summary className={`cursor-pointer font-medium ${ton === "rouge" ? "text-rouge-600" : ton === "or" ? "text-or-700" : "text-zinc-700"}`}>
        {titre} ({nf.format(c.n)})
      </summary>
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
 * Remplacer les communautaires d'un département par sa nouvelle liste (DG, 12/11/2026 : la
 * Likouala et sa note de mutation du 30/10/2026). Une feuille par cycle. Vérifier d'abord : ceux
 * qui restent, entrent, sortent, et les noms à confirmer ; puis remplacer pour de bon.
 */
export function RemplacerDepartement({ fermer, apres }: { fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const [fichier, setFichier] = useState<File | null>(null);
  const [departementId, setDepartementId] = useState("");
  const [premierMois, setPremierMois] = useState(moisCourant());
  const [dateSortie, setDateSortie] = useState(aujourdhui());
  const [memes, setMemes] = useState<Set<string>>(new Set());
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  // Les confirmations au moment de la dernière vérification
  const [verifie, setVerifie] = useState("");
  // Beaucoup de sorties (mauvais fichier, mauvais département ?) : une confirmation de plus
  const [accepteSorties, setAccepteSorties] = useState(false);

  const oublier = () => {
    setRapport(null);
    setFait(false);
    setAccepteSorties(false);
  };
  async function envoyer(essai: boolean) {
    if (!fichier || !departementId) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      fd.append("memes", JSON.stringify([...memes]));
      const r = await api.post<Rapport>(`/enrolement/volontaires/remplacer-departement${qs({ departementId, premierMois, dateSortie, essai: essai ? 1 : 0 })}`, fd);
      setRapport(r);
      if (essai) setVerifie([...memes].sort().join("|"));
      if (!essai) {
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
  // Après un essai, des confirmations changées changent ce qui sera fait : il faut revérifier
  const cleMemes = [...memes].sort().join("|");
  const aReverifier = !!rapport?.essai && verifie !== cleMemes;
  const avant = rapport ? rapport.gardes + rapport.sortants.n : 0;
  const beaucoupDeSorties = !!rapport?.essai && avant > 0 && rapport.sortants.n > Math.max(20, avant * 0.3);

  return (
    <Modale titre="Remplacer les communautaires d’un département" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="leading-relaxed text-zinc-600">
          La nouvelle liste d’un département (par exemple la note de service de la préfecture), <strong>une feuille par cycle</strong> : Préscolaire, Primaire,
          Collège, Lycée, Alphabétisation… Ceux qui sont sur la liste <strong>restent</strong> (leur poste et leur cycle sont mis à jour) ou{" "}
          <strong>entrent</strong> ; ceux de ce département qui n’y sont plus <strong>sortent</strong> (motif « Retiré par la DDEPPSA », réintégrables en cas
          d’erreur). Commencez par <strong>Vérifier</strong> : rien n’est enregistré.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_1fr]">
          <Champ libelle="Département">
            <Liste
              value={departementId}
              onChange={(e) => {
                setDepartementId(e.target.value);
                oublier();
              }}
              vide="Choisir…"
              options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))}
            />
          </Champ>
          <Champ libelle="Premier mois payé des nouveaux">
            <ChoixMois
              value={premierMois}
              onChange={(m) => {
                setPremierMois(m);
                oublier();
              }}
            />
          </Champ>
          <Champ libelle="Date de sortie des absents">
            <Saisie
              type="date"
              value={dateSortie}
              onChange={(e) => {
                setDateSortie(e.target.value);
                oublier();
              }}
            />
          </Champ>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 px-4 py-3 hover:border-marque-300 hover:bg-zinc-50">
          <FileSpreadsheet className={`size-5 ${fichier ? "text-marque-600" : "text-zinc-400"}`} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{fichier ? fichier.name : "Choisir la liste du département (.xlsx)"}</span>
            <span className="block text-[11px] text-zinc-400">Une feuille par cycle, chacune avec une colonne « Noms et prénoms »</span>
          </span>
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => {
              setFichier(e.target.files?.[0] ?? null);
              setMemes(new Set());
              oublier();
            }}
          />
        </label>
        {erreur && <Alerte>{erreur}</Alerte>}

        {rapport && (
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <div className={`rounded-xl px-3 py-2 font-medium ${rapport.essai ? "bg-or-100/60 text-or-700" : "bg-marque-50 text-marque-700"}`}>
              {rapport.essai ? "Vérification — rien n’est encore enregistré." : `C’est fait : les communautaires du département ${rapport.departement} sont remplacés.`}
            </div>
            <p className="text-zinc-600">
              {rapport.departement} : {nf.format(rapport.lus)} ligne(s) lue(s), <strong>{nf.format(rapport.personnes)}</strong> personne(s)
              {rapport.doublonsDansListe.n ? ` (${rapport.doublonsDansListe.n} doublon(s) dans la liste, comptés une fois)` : ""}. Feuilles :{" "}
              {rapport.feuilles.map((f) => `${f.nom} → ${f.categorie} (${f.personnes})`).join(" ; ")}
              {rapport.feuillesIgnorees.length ? ` · ignorées : ${rapport.feuillesIgnorees.join(", ")}` : ""}.
            </p>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-1 font-medium">Cycle</th>
                  <th className="py-1 text-right font-medium">Avant</th>
                  <th className="py-1 text-right font-medium">Avec la liste</th>
                </tr>
              </thead>
              <tbody>
                {rapport.parCategorie.map((x) => (
                  <tr key={x.libelle} className="border-t border-zinc-100">
                    <td className="py-1">{x.libelle}</td>
                    <td className="py-1 text-right tabular-nums">{nf.format(x.avant)}</td>
                    <td className={`py-1 text-right font-medium tabular-nums ${x.apres !== x.avant ? "text-or-700" : ""}`}>{nf.format(x.apres)}</td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-200 font-semibold">
                  <td className="py-1">Montant mensuel</td>
                  <td className="py-1 text-right tabular-nums">{nf.format(rapport.montantAvant)}</td>
                  <td className="py-1 text-right tabular-nums">{nf.format(rapport.montantApres)}</td>
                </tr>
              </tbody>
            </table>
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

            {rapport.possibles.length > 0 && (
              <div className="space-y-2 rounded-xl bg-or-100/40 px-3 py-2">
                <div className="font-semibold text-or-700">
                  Noms proches à confirmer ({nf.format(rapport.possibles.length)}) : un seul nom diffère. Cochez ceux qui sont la même personne ; les autres
                  entrent comme nouveaux et l’ancienne fiche sort.
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
                        <strong>{x.liste}</strong> <span className="text-zinc-400">(liste · {x.feuille}, ligne {x.ligne})</span>
                        <span className="mx-1.5 text-zinc-400">≈</span>
                        <strong>{x.registre}</strong> <span className="text-zinc-400">(registre)</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <ListeCourte titre="Rapprochés automatiquement (nom écrit autrement)" c={rapport.rapproches} />
            <ListeCourte titre="Entrent (nouveaux)" c={rapport.nouveaux} />
            <ListeCourte titre="Sortent (absents de la liste)" c={rapport.sortants} ton="rouge" />
            <ListeCourte titre="Réintégrés (étaient sortis)" c={rapport.reintegres} />
            <ListeCourte titre="Doublons dans la liste" c={rapport.doublonsDansListe} ton="or" />
            <ListeCourte titre="Plusieurs fiches pour un même nom" c={rapport.plusieursFiches} ton="or" />
            <ListeCourte titre="Plusieurs fiches proches (ajoutés comme nouveaux, à vérifier)" c={rapport.ambigus} ton="or" />
            <ListeCourte titre="Déjà fonctionnaires, contractuels ou volontaires (à vérifier)" c={rapport.dejaAilleurs} ton="rouge" />
            {beaucoupDeSorties && (
              <div className="space-y-2 rounded-xl bg-rouge-100/60 px-3 py-2 text-rouge-600">
                <div className="font-semibold">
                  Attention : {nf.format(rapport.sortants.n)} des {nf.format(avant)} communautaires en poste dans ce département sortiraient. Vérifiez que c’est le bon
                  fichier et le bon département.
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="size-4 accent-rouge-600" checked={accepteSorties} onChange={(e) => setAccepteSorties(e.target.checked)} />
                  Oui, c’est la bonne liste : ces personnes ne sont plus en poste
                </label>
              </div>
            )}
            {aReverifier && <Alerte>Vous avez coché des noms : vérifiez de nouveau pour voir les chiffres à jour avant de remplacer.</Alerte>}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>{fait ? "Fermer" : "Annuler"}</Bouton>
          {!fait && (
            <>
              <Bouton chargement={envoi && !rapport?.essai} disabled={!fichier || !departementId || envoi} onClick={() => envoyer(true)}>
                <RefreshCw /> Vérifier
              </Bouton>
              <Bouton variante="principal" chargement={envoi && !!rapport?.essai} disabled={!rapport?.essai || envoi || aReverifier || (beaucoupDeSorties && !accepteSorties)} onClick={() => envoyer(false)}>
                <Check /> Remplacer pour de bon
              </Bouton>
            </>
          )}
        </div>
      </div>
    </Modale>
  );
}
