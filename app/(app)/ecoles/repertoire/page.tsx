"use client";

import { BookCheck, CheckCheck, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { CYCLES, peut, type Ton } from "@/lib/libelles";

/*
 * Répertoire officiel des établissements publics (DGRHAS, 20/11/2026) : les écoles de l'organigramme
 * prennent l'écriture du répertoire (les anciens noms restent reconnus dans les fiches et les
 * fichiers), les écoles qui manquent sont ajoutées dans leur inspection. Rien n'est enregistré
 * avant « Enregistrer dans l'organigramme ».
 */

type Etat = "IDENTIQUE" | "RENOMMER" | "PROBABLE" | "AJOUTER" | "A_PLACER" | "DOUBLON";

interface Proposition {
  cle: string;
  feuille: string;
  ligne: number;
  departementId: number;
  departement: string;
  cycle: string;
  nomRepertoire: string;
  nomPropose: string;
  typeLocalite: string | null;
  localite: string | null;
  zone: string | null;
  etat: Etat;
  ressemblance: number | null;
  memeLocalite: boolean | null;
  structureId: number | null;
  nomActuel: string | null;
  localiteActuelle: string | null;
  inspectionId: number | null;
  inspection: string | null;
  inspectionAjoutId?: number | null;
  pourquoi: string | null;
  cochee: boolean;
}

interface Rapport {
  lues: number;
  feuilles: string[];
  ignorees: { raison: string; n: number; exemples: string[] }[];
  compteurs: Record<Etat, number>;
  propositions: Proposition[];
  inspections: Record<string, { id: number; nom: string }[]>;
  horsRepertoire: number;
}

interface Resultat {
  renommees: number;
  ajoutees: number;
  zones: number;
  localites: number;
  fichesMisesAJour: number;
  refus: string[];
}

const ETATS: Record<Etat, { libelle: string; ton: Ton; aide: string }> = {
  RENOMMER: { libelle: "Nom à mettre à jour", ton: "vert", aide: "La même école, sûre (même nom au même endroit) : elle prend l’écriture du répertoire. L’ancien nom reste reconnu dans les fiches et les fichiers." },
  PROBABLE: { libelle: "À confirmer", ton: "jaune", aide: "Un nom proche ou une autre localité : dites si c’est la même école (elle prend le nom du répertoire) ou une autre école (elle est ajoutée). Sans réponse, rien ne change." },
  AJOUTER: { libelle: "À ajouter", ton: "bleu", aide: "Écoles du répertoire absentes de l’organigramme, avec l’inspection qui tient déjà les écoles de leur localité. Une école au nom proche d’une école existante n’est pas cochée : vérifiez d’abord." },
  A_PLACER: { libelle: "Inspection à choisir", ton: "rouge", aide: "Écoles à ajouter dont l’inspection n’a pas pu être trouvée (aucune école de ce cycle dans leur localité chez nous) : choisissez-la." },
  DOUBLON: { libelle: "Écrites deux fois", ton: "gris", aide: "Le répertoire écrit la même école deux fois (même nom au même endroit) : elle n’est comptée qu’une fois." },
  IDENTIQUE: { libelle: "Déjà à jour", ton: "gris", aide: "Même nom, écrit pareil : rien à faire." },
};
const ORDRE: Etat[] = ["RENOMMER", "PROBABLE", "AJOUTER", "A_PLACER", "DOUBLON", "IDENTIQUE"];

const nf = new Intl.NumberFormat("fr-FR");
const TAILLE = 50;

type Decision = "" | "MEME" | "AUTRE";

export default function Page() {
  const { profil } = useSession();
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  return <Repertoire peutEnregistrer={peut.modifierConfiguration(profil.role)} />;
}

function Repertoire({ peutEnregistrer }: { peutEnregistrer: boolean }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [r, setR] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [etat, setEtat] = useState<Etat>("RENOMMER");
  const [dep, setDep] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  // Choix de la DGRHAS
  const [renommer, setRenommer] = useState<Set<string>>(new Set());
  const [ajouter, setAjouter] = useState<Set<string>>(new Set());
  const [inspection, setInspection] = useState<Record<string, number>>({});

  const analyser = async (f: File) => {
    setFichier(f);
    setEnvoi(true);
    setErreur(null);
    setResultat(null);
    try {
      const d = new FormData();
      d.append("fichier", f);
      const x = await api.post<Rapport>("/ecoles-repertoire/analyse", d);
      setR(x);
      setRenommer(new Set(x.propositions.filter((p) => p.cochee && (p.etat === "RENOMMER" || p.etat === "PROBABLE")).map((p) => p.cle)));
      setAjouter(new Set(x.propositions.filter((p) => p.cochee && (p.etat === "AJOUTER" || p.etat === "A_PLACER")).map((p) => p.cle)));
      const i: Record<string, number> = {};
      for (const p of x.propositions) {
        const id = p.etat === "PROBABLE" ? p.inspectionAjoutId : p.etat === "AJOUTER" ? p.inspectionId : null;
        if (id) i[p.cle] = id;
      }
      setInspection(i);
      setEtat(x.compteurs.RENOMMER ? "RENOMMER" : x.compteurs.PROBABLE ? "PROBABLE" : "AJOUTER");
      setPage(1);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const departements = useMemo(() => [...new Set((r?.propositions ?? []).map((p) => p.departement))].sort((a, b) => a.localeCompare(b, "fr")), [r]);
  const q = recherche.trim().toUpperCase();
  const lignes = (r?.propositions ?? []).filter(
    (p) => p.etat === etat && (!dep || p.departement === dep) && (!q || `${p.nomRepertoire} ${p.nomActuel ?? ""} ${p.localite ?? ""} ${p.inspection ?? ""}`.toUpperCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(lignes.length / TAILLE));
  const p0 = Math.min(page, pages);
  const visibles = lignes.slice((p0 - 1) * TAILLE, p0 * TAILLE);

  const basculer = (s: Set<string>, cle: string, oui: boolean) => {
    const n = new Set(s);
    if (oui) n.add(cle);
    else n.delete(cle);
    return n;
  };
  const decisionDe = (p: Proposition): Decision => (renommer.has(p.cle) ? "MEME" : ajouter.has(p.cle) ? "AUTRE" : "");
  const decider = (p: Proposition, d: Decision) => {
    setRenommer((s) => basculer(s, p.cle, d === "MEME"));
    setAjouter((s) => basculer(s, p.cle, d === "AUTRE"));
  };
  const inspectionsDe = (p: Proposition) => r?.inspections[`${p.departementId}|${p.cycle}`] ?? [];
  const toutCocher = (oui: boolean) => {
    if (etat === "RENOMMER") setRenommer((s) => lignes.reduce((n, p) => basculer(n, p.cle, oui), s));
    if (etat === "AJOUTER" || etat === "A_PLACER") setAjouter((s) => lignes.reduce((n, p) => basculer(n, p.cle, oui && !!inspection[p.cle]), s));
  };

  const choixRenommer = [...renommer];
  const choixAjouter = [...ajouter].filter((c) => inspection[c]).map((cle) => ({ cle, inspectionId: inspection[cle] }));
  const sansInspection = [...ajouter].filter((c) => !inspection[c]).length;

  const enregistrer = async () => {
    if (!fichier || !r) return;
    if (!confirm(`Enregistrer dans l’organigramme : ${nf.format(choixRenommer.length)} école(s) prennent le nom du répertoire, ${nf.format(choixAjouter.length)} école(s) sont ajoutées ? Les anciens noms restent reconnus.`)) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const d = new FormData();
      d.append("fichier", fichier);
      d.append("choix", JSON.stringify({ renommer: choixRenommer, ajouter: choixAjouter }));
      setResultat(await api.post<Resultat>("/ecoles-repertoire/appliquer", d));
      setR(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const nomCycle = (c: string) => CYCLES[c] ?? c;
  const ou = (p: Proposition) => `${p.departement} · ${p.localite ?? "—"}${p.zone ? ` (${p.zone === "URBAINE" ? "urbaine" : "rurale"})` : ""}`;

  return (
    <div className="space-y-4">
      <EnTete
        titre="Répertoire officiel des écoles"
        sousTitre="Le répertoire des établissements publics (Excel du ministère) devient la référence de l’organigramme : les écoles déjà connues prennent son écriture, celles qui manquent sont ajoutées dans leur inspection. Faites d’abord l’essai : rien n’est enregistré avant « Enregistrer dans l’organigramme »."
      />

      <Carte titre="1. Déposer le répertoire">
        <div className="space-y-2 text-[13px]">
          <ZoneFichier accept=".xlsx" envoi={envoi && !r} envoyer={analyser} libelleBouton="Vérifier le fichier" aide="Le fichier tel que reçu : une feuille par département. Les écoles privées et les lignes de total sont laissées de côté." />
          {erreur && <Alerte>{erreur}</Alerte>}
        </div>
      </Carte>

      {resultat && (
        <Alerte ton="vert">
          Enregistré : {nf.format(resultat.renommees)} école(s) au nom du répertoire, {nf.format(resultat.ajoutees)} école(s) ajoutée(s), {nf.format(resultat.zones)} zone(s) urbaine ou rurale, {nf.format(resultat.localites)} localité(s) complétée(s), {nf.format(resultat.fichesMisesAJour)} fiche(s) dont le lieu de service suit le nouveau nom.
          {resultat.refus.length > 0 && (
            <span className="mt-1 block">
              Non fait ({resultat.refus.length}) : {resultat.refus.slice(0, 5).join(" ; ")}
              {resultat.refus.length > 5 ? "…" : ""}
            </span>
          )}
          <span className="mt-1 block">Déposez à nouveau le répertoire pour voir ce qui reste à confirmer.</span>
        </Alerte>
      )}

      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {ORDRE.map((e) => (
              <button key={e} type="button" className="text-left" onClick={() => (setEtat(e), setPage(1))}>
                <Chiffre libelle={ETATS[e].libelle} valeur={nf.format(r.compteurs[e])} ton={ETATS[e].ton} detail={e === etat ? "affichées ci-dessous" : undefined} />
              </button>
            ))}
          </div>
          <p className="text-[12px] text-zinc-500">
            {nf.format(r.lues)} lignes lues dans {r.feuilles.length} feuilles.
            {r.ignorees.map((i) => ` ${i.raison} : ${i.n}.`).join("")} {nf.format(r.horsRepertoire)} école(s) de l’organigramme ne sont pas dans le répertoire : elles restent telles quelles (à voir dans « Écoles à contrôler »).
          </p>

          <Carte titre="2. Vérifier et cocher">
            <div className="space-y-3 text-[13px]">
              <Segments valeur={etat} changer={(e) => (setEtat(e), setPage(1))} options={ORDRE.map((e) => ({ valeur: e, libelle: `${ETATS[e].libelle} (${nf.format(r.compteurs[e])})` }))} />
              <p className="text-zinc-600">{ETATS[etat].aide}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Liste value={dep} onChange={(e) => (setDep(e.target.value), setPage(1))} vide="Tous les départements" options={departements.map((d) => ({ valeur: d, libelle: d }))} />
                <Saisie placeholder="Chercher une école, une localité…" value={recherche} onChange={(e) => (setRecherche(e.target.value), setPage(1))} className="w-64" />
                {(etat === "RENOMMER" || etat === "AJOUTER" || etat === "A_PLACER") && (
                  <>
                    <Bouton variante="discret" onClick={() => toutCocher(true)} title="Les lignes affichées (filtre compris)">
                      <CheckCheck /> Tout cocher
                    </Bouton>
                    <Bouton variante="discret" onClick={() => toutCocher(false)}>
                      Tout décocher
                    </Bouton>
                  </>
                )}
                <span className="ml-auto text-zinc-500">{nf.format(lignes.length)} ligne(s)</span>
              </div>

              {!visibles.length ? (
                <Vide>Rien dans cette liste.</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      {etat !== "DOUBLON" && etat !== "IDENTIQUE" && <th className="w-10"></th>}
                      <th>Dans le répertoire</th>
                      <th>{etat === "AJOUTER" || etat === "A_PLACER" ? "Inspection où l’ajouter" : etat === "DOUBLON" ? "Pourquoi" : "Chez nous aujourd’hui"}</th>
                      <th>Cycle</th>
                      <th>Ligne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((p) => (
                      <tr key={p.cle}>
                        {etat === "RENOMMER" && (
                          <td>
                            <input type="checkbox" checked={renommer.has(p.cle)} onChange={(e) => setRenommer((s) => basculer(s, p.cle, e.target.checked))} />
                          </td>
                        )}
                        {(etat === "AJOUTER" || etat === "A_PLACER") && (
                          <td>
                            <input type="checkbox" checked={ajouter.has(p.cle)} disabled={!inspection[p.cle]} title={inspection[p.cle] ? undefined : "Choisissez d’abord l’inspection"} onChange={(e) => setAjouter((s) => basculer(s, p.cle, e.target.checked))} />
                          </td>
                        )}
                        {etat === "PROBABLE" && (
                          <td>
                            <Liste
                              value={decisionDe(p)}
                              onChange={(e) => decider(p, e.target.value as Decision)}
                              className="w-40"
                              options={[
                                { valeur: "", libelle: "À voir" },
                                { valeur: "MEME", libelle: "Même école" },
                                { valeur: "AUTRE", libelle: "Autre école : l’ajouter" },
                              ]}
                            />
                          </td>
                        )}
                        <td>
                          <div className="font-medium">{p.nomPropose}</div>
                          {p.nomPropose !== p.nomRepertoire && <div className="text-[11px] text-zinc-500">écrit « {p.nomRepertoire} »</div>}
                          <div className="text-[11px] text-zinc-500">{ou(p)}</div>
                        </td>
                        <td>
                          {etat === "AJOUTER" || etat === "A_PLACER" || (etat === "PROBABLE" && decisionDe(p) === "AUTRE") ? (
                            <div className="space-y-1">
                              {etat === "PROBABLE" && (
                                <div className="text-[11px] text-zinc-500">
                                  Proche de « {p.nomActuel} » ({p.localiteActuelle ?? "—"}) — sera ajoutée dans :
                                </div>
                              )}
                              <Liste
                                value={inspection[p.cle] ?? ""}
                                vide="Choisir l’inspection"
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setInspection((i) => {
                                    const n = { ...i };
                                    if (v) n[p.cle] = v;
                                    else delete n[p.cle];
                                    return n;
                                  });
                                  if (!v && etat !== "PROBABLE") setAjouter((s) => basculer(s, p.cle, false));
                                  else if (v && etat !== "PROBABLE") setAjouter((s) => basculer(s, p.cle, true));
                                }}
                                options={inspectionsDe(p).map((i) => ({ valeur: i.id, libelle: i.nom }))}
                              />
                              {p.pourquoi && <div className={p.pourquoi.includes("existe déjà") ? "text-[11px] text-or-700" : "text-[11px] text-zinc-500"}>{p.pourquoi}</div>}
                            </div>
                          ) : etat === "DOUBLON" ? (
                            <span className="text-zinc-600">{p.pourquoi}</span>
                          ) : (
                            <div>
                              <div>{p.nomActuel}</div>
                              <div className="text-[11px] text-zinc-500">
                                {p.localiteActuelle ?? "localité non renseignée"}
                                {p.inspection ? ` · ${p.inspection}` : ""}
                              </div>
                              {etat === "PROBABLE" && (
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  <Badge ton={(p.ressemblance ?? 0) >= 95 ? "vert" : "jaune"} titre="Ressemblance des noms">
                                    noms à {p.ressemblance} %
                                  </Badge>
                                  {!p.memeLocalite && <Badge ton="rouge">autre localité</Badge>}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td>{nomCycle(p.cycle)}</td>
                        <td className="whitespace-nowrap text-[11px] text-zinc-500">
                          {p.feuille} {p.ligne}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              )}
              {pages > 1 && (
                <div className="flex items-center justify-between">
                  <Bouton variante="discret" disabled={p0 <= 1} onClick={() => setPage(p0 - 1)}>
                    ← Précédent
                  </Bouton>
                  <span className="text-zinc-500">
                    Page {p0} sur {pages}
                  </span>
                  <Bouton variante="discret" disabled={p0 >= pages} onClick={() => setPage(p0 + 1)}>
                    Suivant →
                  </Bouton>
                </div>
              )}
            </div>
          </Carte>

          <Carte titre="3. Enregistrer">
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <BookCheck className="size-5 text-marque-600" />
              <span>
                <b>{nf.format(choixRenommer.length)}</b> école(s) prendront le nom du répertoire, <b>{nf.format(choixAjouter.length)}</b> école(s) seront ajoutées
                {sansInspection > 0 && <span className="text-rouge-600"> ({sansInspection} sans inspection : non ajoutée(s))</span>}. La zone urbaine ou rurale du répertoire est notée pour les écoles retrouvées.
              </span>
              {peutEnregistrer ? (
                <Bouton variante="principal" className="ml-auto" chargement={envoi} disabled={!choixRenommer.length && !choixAjouter.length} onClick={enregistrer}>
                  <Save /> Enregistrer dans l’organigramme
                </Bouton>
              ) : (
                <span className="ml-auto text-zinc-500">L’enregistrement est réservé au DG (et aux administrateurs).</span>
              )}
            </div>
          </Carte>
        </>
      )}
    </div>
  );
}
