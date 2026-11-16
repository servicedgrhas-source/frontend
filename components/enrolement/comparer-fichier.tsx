"use client";

import { Download, GitCompare } from "lucide-react";
import { useState } from "react";
import { deMois, nf } from "@/components/enrolement/volontaires";
import { Alerte, Badge, Bouton, Liste, Modale, Saisie, Segments, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api } from "@/lib/api";

/* Comparer un fichier initial (fait à la main, envoyé au Trésor) avec le système (DG, 16/11/2026). */

type TypeEcart = "AJOUT" | "RETRAIT" | "MONTANT";

interface LigneBourse {
  type: TypeEcart;
  nom: string;
  nomFichier: string | null;
  departement: string;
  cycleFichier: string | null;
  montantFichier: number;
  categorieSysteme: string | null;
  montantSysteme: number;
  incidence: number;
  motif: string;
  detail: string | null;
}

interface ResultatBourse {
  etat: { id: number; mois: string; population: string; statut: string };
  feuille: string;
  feuilles: { nom: string; personnes: number; total: number }[];
  initial: { n: number; total: number };
  systeme: { n: number; total: number };
  ecart: number;
  identiques: number;
  nomsProches: number;
  groupes: { type: TypeEcart; motif: string; n: number; incidence: number }[];
  lignes: LigneBourse[];
}

const TYPES: Record<TypeEcart, string> = {
  AJOUT: "Ajoutés (dans le système, pas dans le fichier)",
  RETRAIT: "Retirés (dans le fichier, pas dans le système)",
  MONTANT: "Montant différent",
};

const signe = (n: number) => `${n > 0 ? "+" : ""}${nf.format(n)} F`;
const couleur = (n: number) => (n > 0 ? "text-rouge-600" : n < 0 ? "text-marque-700" : "text-zinc-500");

/** Petite pagination d'une liste déjà chargée. */
function usePage<T>(lignes: T[], taille = 50) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(lignes.length / taille));
  const p = Math.min(page, pages);
  return {
    visibles: lignes.slice((p - 1) * taille, p * taille),
    barre:
      pages > 1 ? (
        <div className="mt-2 flex items-center justify-between text-[13px]">
          <Bouton variante="discret" disabled={p <= 1} onClick={() => setPage(p - 1)}>
            ← Précédent
          </Bouton>
          <span className="text-zinc-500">
            Page {p} sur {pages}
          </span>
          <Bouton variante="discret" disabled={p >= pages} onClick={() => setPage(p + 1)}>
            Suivant →
          </Bouton>
        </div>
      ) : null,
    revenir: () => setPage(1),
  };
}

/**
 * Comparer le fichier initial d'un mois (bourse des volontaires ou paiement des communautaires) avec
 * l'état du système : ajoutés, retirés avec leur motif, montants différents, et l'incidence financière.
 */
export function ComparerEtat({ etat, fermer }: { etat: { id: number; mois: string; population: string }; fermer: () => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [r, setR] = useState<ResultatBourse | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [type, setType] = useState<TypeEcart | "TOUS">("TOUS");
  const [recherche, setRecherche] = useState("");
  const comparer = async (f: File, feuille?: string) => {
    setFichier(f);
    setEnvoi(true);
    setErreur(null);
    try {
      const d = new FormData();
      d.append("fichier", f);
      setR(await api.post<ResultatBourse>(`/enrolement/bourse/${etat.id}/comparer${feuille ? `?feuille=${encodeURIComponent(feuille)}` : ""}`, d));
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  const excel = () => {
    if (!fichier || !r) return;
    const d = new FormData();
    d.append("fichier", fichier);
    void api
      .telechargerPost(`/enrolement/bourse/${etat.id}/comparer/excel?feuille=${encodeURIComponent(r.feuille)}`, d, `Comparaison ${etat.population === "COMMUNAUTAIRE" ? "Communautaires" : "Volontaires"} ${etat.mois}.xlsx`)
      .catch((x: Error) => setErreur(x.message));
  };
  const q = recherche.trim().toUpperCase();
  const lignes = (r?.lignes ?? []).filter((l) => (type === "TOUS" || l.type === type) && (!q || `${l.nom} ${l.motif} ${l.departement}`.toUpperCase().includes(q)));
  const pg = usePage(lignes);
  const liste = etat.population === "COMMUNAUTAIRE" ? "paiement des communautaires" : "bourse des volontaires";

  return (
    <Modale titre={`Comparer avec le fichier initial — ${liste} ${deMois(etat.mois)}`} ouverte fermer={fermer} ecran>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">
          Déposez le fichier fait à la main (celui envoyé au Trésor) pour ce mois. Le système dit qui est ajouté, qui est retiré et pourquoi, quels montants ont changé, et l’incidence financière de chaque écart. Le fichier n’est pas enregistré, rien n’est modifié.
        </p>
        <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={(f) => comparer(f)} libelleBouton="Comparer" />
        {erreur && <Alerte>{erreur}</Alerte>}
        {r && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="block text-[12px] text-zinc-500">Liste lue dans le fichier</span>
                <Liste value={r.feuille} onChange={(e) => fichier && comparer(fichier, e.target.value)} options={r.feuilles.map((f) => ({ valeur: f.nom, libelle: `${f.nom} (${nf.format(f.personnes)} pers., ${nf.format(f.total)} F)` }))} />
              </label>
              <Bouton variante="principal" onClick={excel} title="Synthèse, ajoutés, retirés et montants différents, avec l’en-tête officiel">
                <Download /> Excel de la comparaison
              </Bouton>
            </div>

            <Tableau>
              <thead>
                <tr>
                  <th></th>
                  <th className="text-right">Personnes</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fichier initial</td>
                  <td className="text-right tabular-nums">{nf.format(r.initial.n)}</td>
                  <td className="text-right tabular-nums">{nf.format(r.initial.total)} F</td>
                </tr>
                <tr>
                  <td>État du système {r.etat.statut === "VALIDE" ? "(validé)" : "(projet)"}</td>
                  <td className="text-right tabular-nums">{nf.format(r.systeme.n)}</td>
                  <td className="text-right tabular-nums">{nf.format(r.systeme.total)} F</td>
                </tr>
                <tr className="font-semibold">
                  <td>Écart (système − fichier)</td>
                  <td className="text-right tabular-nums">{signe(r.systeme.n - r.initial.n).replace(" F", "")}</td>
                  <td className={`text-right tabular-nums ${couleur(r.ecart)}`}>{signe(r.ecart)}</td>
                </tr>
              </tbody>
            </Tableau>

            <div>
              <h3 className="mb-1 font-semibold">L’écart, expliqué</h3>
              {!r.groupes.length ? (
                <Vide>Aucun écart : le fichier et le système sont identiques.</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      <th>Motif</th>
                      <th className="text-right">Personnes</th>
                      <th className="text-right">Incidence financière</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.groupes.map((g) => (
                      <tr key={`${g.type}|${g.motif}`} className="cursor-pointer hover:bg-zinc-50" onClick={() => { setType(g.type); setRecherche(g.motif); pg.revenir(); }} title="Voir ces personnes">
                        <td>
                          <Badge ton={g.type === "AJOUT" ? "bleu" : g.type === "RETRAIT" ? "rouge" : "jaune"}>{g.type === "AJOUT" ? "Ajouté" : g.type === "RETRAIT" ? "Retiré" : "Montant"}</Badge> {g.motif}
                        </td>
                        <td className="text-right tabular-nums">{nf.format(g.n)}</td>
                        <td className={`text-right tabular-nums ${couleur(g.incidence)}`}>{signe(g.incidence)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>Total (égal à l’écart)</td>
                      <td className="text-right tabular-nums">{nf.format(r.groupes.reduce((n, g) => n + g.n, 0))}</td>
                      <td className={`text-right tabular-nums ${couleur(r.ecart)}`}>{signe(r.groupes.reduce((n, g) => n + g.incidence, 0))}</td>
                    </tr>
                  </tbody>
                </Tableau>
              )}
              <p className="mt-1 text-[12px] text-zinc-500">
                Identiques dans les deux (même nom, même montant) : {nf.format(r.identiques)}. Noms écrits autrement, rapprochés par ressemblance (à vérifier) : {nf.format(r.nomsProches)}.
              </p>
            </div>

            {r.lignes.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Segments
                    valeur={type}
                    changer={(v) => { setType(v); pg.revenir(); }}
                    options={[{ valeur: "TOUS", libelle: `Tous (${r.lignes.length})` }, ...(["AJOUT", "RETRAIT", "MONTANT"] as TypeEcart[]).map((t) => ({ valeur: t, libelle: `${TYPES[t].split(" (")[0]} (${r.lignes.filter((l) => l.type === t).length})` }))]}
                  />
                  <Saisie className="w-64" value={recherche} onChange={(e) => { setRecherche(e.target.value); pg.revenir(); }} placeholder="Nom, motif, département…" />
                </div>
                <Tableau>
                  <thead>
                    <tr>
                      <th>Nom et prénoms</th>
                      <th>Département</th>
                      <th className="text-right">Fichier</th>
                      <th className="text-right">Système</th>
                      <th className="text-right">Incidence</th>
                      <th>Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.visibles.map((l, i) => (
                      <tr key={`${l.type}|${l.nom}|${i}`} className="align-top">
                        <td>
                          <span className="font-medium">{l.nom}</span>
                          {l.detail && <div className="text-[11px] text-zinc-500">{l.detail}</div>}
                        </td>
                        <td className="text-[12px] text-zinc-600">{l.departement}</td>
                        <td className="text-right tabular-nums">
                          {l.montantFichier ? nf.format(l.montantFichier) : "—"}
                          {l.cycleFichier && <div className="text-[11px] text-zinc-500">{l.cycleFichier}</div>}
                        </td>
                        <td className="text-right tabular-nums">
                          {l.montantSysteme ? nf.format(l.montantSysteme) : "—"}
                          {l.categorieSysteme && <div className="text-[11px] text-zinc-500">{l.categorieSysteme}</div>}
                        </td>
                        <td className={`text-right tabular-nums ${couleur(l.incidence)}`}>{signe(l.incidence)}</td>
                        <td className="text-[12px]">{l.motif}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
                {pg.barre}
              </div>
            )}
          </>
        )}
      </div>
    </Modale>
  );
}

interface LigneEnrolement {
  type: string;
  nom: string;
  nomFichier: string | null;
  feuille: string | null;
  cycle: string | null;
  situation: string;
  departementRetenuFichier: string | null;
  departementRetenuSysteme: string | null;
  bourse: number;
  equipement: number;
  motif: string;
}

interface ResultatEnrolement {
  campagne: { id: number; annee: number };
  fichier: { feuilles: { nom: string; personnes: number; retrait: boolean }[]; n: number; retraits: number };
  systeme: { n: number; parSituation: { situation: string; n: number; bourse: number; equipement: number }[] };
  rapproches: number;
  ecarts: Record<string, { n: number; bourse: number; equipement: number }>;
  retraitsCoherents: number;
  lignes: LigneEnrolement[];
}

const ECARTS_ENROLEMENT: Record<string, string> = {
  FICHIER_SEUL: "Dans le fichier, absents du système",
  SYSTEME_SEUL: "Dans le système, absents du fichier",
  RETRAIT_RETENU: "Retirés dans le fichier mais retenus dans le système",
  DEPARTEMENT: "Département retenu différent",
  NOM_PROCHE: "Nom écrit autrement (à vérifier)",
};

/**
 * Comparer le fichier des dossiers d'enrôlement (avec sa feuille des retraits) avec le système :
 * retenus avec ou sans département retenu, écartés (mis de côté), écarts, et l'incidence financière
 * (bourse par mois et mise d'équipement des retenus).
 */
export function ComparerEnrolement({ campagne, fermer }: { campagne: { id: number; annee: number }; fermer: () => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [r, setR] = useState<ResultatEnrolement | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [type, setType] = useState("RETRAIT_RETENU");
  const comparer = async (f: File) => {
    setFichier(f);
    setEnvoi(true);
    setErreur(null);
    try {
      const d = new FormData();
      d.append("fichier", f);
      setR(await api.post<ResultatEnrolement>(`/enrolement/listes/comparer?campagne=${campagne.id}`, d));
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  const excel = () => {
    if (!fichier) return;
    const d = new FormData();
    d.append("fichier", fichier);
    void api.telechargerPost(`/enrolement/listes/comparer/excel?campagne=${campagne.id}`, d, `Comparaison Enrôlement ${campagne.annee}.xlsx`).catch((x: Error) => setErreur(x.message));
  };
  const lignes = (r?.lignes ?? []).filter((l) => l.type === type);
  const pg = usePage(lignes);

  return (
    <Modale titre={`Comparer avec le fichier d’enrôlement — ${campagne.annee}`} ouverte fermer={fermer} ecran>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">
          Déposez le fichier des dossiers reçus (avec sa feuille des retraits, s’il y en a une). Le système dit où en est chaque personne : retenue avec ou sans département retenu, écartée (mise de côté), absente — et ce que cela coûte : bourse par mois et mise d’équipement des retenus. Le fichier n’est pas enregistré.
        </p>
        <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={comparer} libelleBouton="Comparer" />
        {erreur && <Alerte>{erreur}</Alerte>}
        {r && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-zinc-600">
                Fichier : {r.fichier.feuilles.map((f) => `« ${f.nom} » ${nf.format(f.personnes)}${f.retrait ? " (retraits)" : ""}`).join(" · ")} — rapprochés : {nf.format(r.rapproches)}
              </span>
              <Bouton variante="principal" onClick={excel}>
                <Download /> Excel de la comparaison
              </Bouton>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-1 font-semibold">Les enrôlés dans le système</h3>
                <Tableau>
                  <thead>
                    <tr>
                      <th>Situation</th>
                      <th className="text-right">Personnes</th>
                      <th className="text-right">Bourse / mois</th>
                      <th className="text-right">Équipement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.systeme.parSituation.map((p) => (
                      <tr key={p.situation}>
                        <td>{p.situation}</td>
                        <td className="text-right tabular-nums">{nf.format(p.n)}</td>
                        <td className="text-right tabular-nums">{nf.format(p.bourse)} F</td>
                        <td className="text-right tabular-nums">{nf.format(p.equipement)} F</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
                <p className="mt-1 text-[12px] text-zinc-500">Pour les écartés, la bourse et l’équipement indiqués sont ce qui n’est pas dépensé ; pour ceux pas encore décidés, ce que coûterait leur retenue.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Écarts entre le fichier et le système</h3>
                <Tableau>
                  <thead>
                    <tr>
                      <th>Écart</th>
                      <th className="text-right">Personnes</th>
                      <th className="text-right">Bourse / mois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(ECARTS_ENROLEMENT).map(([k, libelle]) => (
                      <tr key={k} className={`cursor-pointer hover:bg-zinc-50 ${type === k ? "bg-zinc-50 font-medium" : ""}`} onClick={() => { setType(k); pg.revenir(); }}>
                        <td>{libelle}</td>
                        <td className="text-right tabular-nums">{nf.format(r.ecarts[k]?.n ?? 0)}</td>
                        <td className="text-right tabular-nums">{nf.format(r.ecarts[k]?.bourse ?? 0)} F</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
                <p className="mt-1 text-[12px] text-zinc-500">Retraits du fichier qui ne sont pas retenus dans le système (cohérent) : {nf.format(r.retraitsCoherents)}.</p>
              </div>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">{ECARTS_ENROLEMENT[type]} ({lignes.length})</h3>
              {!lignes.length ? (
                <Vide>Personne.</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      <th>Nom et prénoms</th>
                      <th>Cycle</th>
                      <th>Situation dans le système</th>
                      <th>Département retenu</th>
                      <th className="text-right">Bourse / mois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.visibles.map((l, i) => (
                      <tr key={`${l.nom}|${i}`} className="align-top">
                        <td>
                          <span className="font-medium">{l.nom}</span>
                          {l.nomFichier && <div className="text-[11px] text-zinc-500">Dans le fichier : {l.nomFichier}</div>}
                        </td>
                        <td className="text-[12px]">{l.cycle}</td>
                        <td className="text-[12px]">{l.situation}</td>
                        <td className="text-[12px]">
                          {l.departementRetenuSysteme ?? "—"}
                          {l.departementRetenuFichier && <div className="text-zinc-500">fichier : {l.departementRetenuFichier}</div>}
                        </td>
                        <td className="text-right tabular-nums">{l.bourse ? `${nf.format(l.bourse)} F` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              )}
              {pg.barre}
            </div>
          </>
        )}
      </div>
    </Modale>
  );
}

/** Le bouton qui ouvre la comparaison (même apparence partout). */
export function BoutonComparer({ onClick, libelle = "Comparer avec le fichier initial" }: { onClick: () => void; libelle?: string }) {
  return (
    <Bouton onClick={onClick} title="Comparer avec un fichier fait à la main : ajoutés, retirés, montants différents, incidence financière">
      <GitCompare /> {libelle}
    </Bouton>
  );
}
