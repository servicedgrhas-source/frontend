"use client";

import { CheckCheck, Save, Sheet } from "lucide-react";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { CYCLES, peut, type Ton } from "@/lib/libelles";

/*
 * Nombre de classes par école depuis le fichier des allocations budgétaires (DG, 26/11/2026). Le
 * fichier donne le nombre de classes pédagogiques de chaque établissement, sans leurs niveaux : il
 * sert au besoin en enseignants tant que les classes ne sont pas saisies une par une. Rien n'est
 * enregistré avant « Enregistrer le nombre de classes ».
 */

type Etat = "SURE" | "PROBABLE" | "ABSENTE" | "IGNOREE";

interface Ligne {
  cle: string;
  feuille: string;
  ligne: number;
  cycle: string;
  departement: string;
  circonscription: string | null;
  nomFichier: string;
  nombre: number;
  etat: Etat;
  ressemblance: number | null;
  memeInspection: boolean | null;
  structureId: number | null;
  ecole: string | null;
  inspection: string | null;
  classesSaisies: number;
  dejaDeclare: number | null;
  pourquoi: string | null;
  cochee: boolean;
  departementId: number | null;
  nomPropose: string | null;
  localite: string | null;
  zone: string | null;
  inspectionProposeeId: number | null;
  /** Aucune inspection de ce nom : celle à créer d'après la circonscription du fichier. */
  nouvelleInspection: string | null;
  doublonFichier: boolean;
}

interface Rapport {
  annee: string;
  lues: number;
  ignorees: number;
  compteurs: Record<Etat, number>;
  classes: number;
  lignes: Ligne[];
  inspections: Record<string, { id: number; nom: string }[]>;
}

interface Resultat {
  enregistrees: number;
  classes: number;
  ajoutees: number;
  inspections: number;
  refus: string[];
  annee: string;
}

const ETATS: Record<Etat, { libelle: string; ton: Ton; aide: string }> = {
  SURE: { libelle: "Écoles retrouvées", ton: "vert", aide: "La même école chez nous (même nom, dans le même département et le même cycle) : son nombre de classes est coché. Décochez une ligne pour ne pas la prendre." },
  PROBABLE: { libelle: "À confirmer", ton: "jaune", aide: "Un nom proche, ou plusieurs écoles possibles : cochez seulement si c’est bien la même école. Sans coche, rien n’est enregistré." },
  ABSENTE: { libelle: "Absentes de l’organigramme", ton: "rouge", aide: "Aucune école de ce nom dans le département et le cycle. Cochez celles à ajouter dans l’organigramme : elles sont créées dans l’inspection choisie (proposée d’après la circonscription du fichier), avec leur nombre de classes. Quand la circonscription n’a pas d’inspection chez nous, « Créer … » l’ajoute sous la DDEPPSA du département. Sans coche, rien n’est ajouté." },
  IGNOREE: { libelle: "Département inconnu", ton: "gris", aide: "Le département écrit dans le fichier n’est pas reconnu." },
};
const ORDRE: Etat[] = ["SURE", "PROBABLE", "ABSENTE", "IGNOREE"];

const nf = new Intl.NumberFormat("fr-FR");
const TAILLE = 50;

export default function Page() {
  const { profil } = useSession();
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  return <ClassesDuFichier peutEnregistrer={peut.modifierConfiguration(profil.role)} />;
}

function ClassesDuFichier({ peutEnregistrer }: { peutEnregistrer: boolean }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [annee, setAnnee] = useState("");
  const [r, setR] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [etat, setEtat] = useState<Etat>("SURE");
  const [dep, setDep] = useState("");
  const [cycle, setCycle] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [cochees, setCochees] = useState<Set<string>>(new Set());
  // Écoles absentes : cochées pour être ajoutées, et l'inspection choisie pour chacune
  const [ajouts, setAjouts] = useState<Set<string>>(new Set());
  const [inspection, setInspection] = useState<Record<string, number>>({});

  const analyser = async (f: File) => {
    setFichier(f);
    setEnvoi(true);
    setErreur(null);
    setResultat(null);
    try {
      const d = new FormData();
      d.append("fichier", f);
      d.append("annee", annee.trim());
      const x = await api.post<Rapport>("/classes-declarees/analyse", d);
      setR(x);
      setAnnee(x.annee);
      setCochees(new Set(x.lignes.filter((l) => l.cochee).map((l) => l.cle)));
      setAjouts(new Set());
      // -1 : créer l'inspection de la circonscription (elle n'existe pas encore dans l'organigramme)
      setInspection(Object.fromEntries(x.lignes.filter((l) => l.inspectionProposeeId || l.nouvelleInspection).map((l) => [l.cle, l.inspectionProposeeId ?? -1])));
      setEtat("SURE");
      setPage(1);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const departements = useMemo(() => [...new Set((r?.lignes ?? []).map((l) => l.departement))].sort((a, b) => a.localeCompare(b, "fr")), [r]);
  const q = recherche.trim().toUpperCase();
  const lignes = (r?.lignes ?? []).filter(
    (l) => l.etat === etat && (!dep || l.departement === dep) && (!cycle || l.cycle === cycle) && (!q || `${l.nomFichier} ${l.ecole ?? ""} ${l.circonscription ?? ""} ${l.inspection ?? ""}`.toUpperCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(lignes.length / TAILLE));
  const p0 = Math.min(page, pages);
  const visibles = lignes.slice((p0 - 1) * TAILLE, p0 * TAILLE);
  const cochable = etat === "SURE" || etat === "PROBABLE";
  const ajoutable = (l: Ligne) => l.etat === "ABSENTE" && !l.doublonFichier && !!l.departementId;
  const inspectionsDe = (l: Ligne) => r?.inspections[`${l.departementId}|${l.cycle}`] ?? [];

  const basculer = (cle: string, oui: boolean) =>
    setCochees((s) => {
      const n = new Set(s);
      if (oui) n.add(cle);
      else n.delete(cle);
      return n;
    });
  const toutCocher = (oui: boolean) => {
    if (etat === "ABSENTE")
      return setAjouts((s) => {
        const n = new Set(s);
        for (const l of lignes) if (oui && ajoutable(l) && inspection[l.cle]) n.add(l.cle);
        else if (!oui) n.delete(l.cle);
        return n;
      });
    setCochees((s) => {
      const n = new Set(s);
      for (const l of lignes) if (oui) n.add(l.cle);
      else n.delete(l.cle);
      return n;
    });
  };
  const basculerAjout = (cle: string, oui: boolean) =>
    setAjouts((s) => {
      const n = new Set(s);
      if (oui) n.add(cle);
      else n.delete(cle);
      return n;
    });

  const choisies = (r?.lignes ?? []).filter((l) => cochees.has(l.cle) && l.structureId);
  const totalChoisi = choisies.reduce((n, l) => n + l.nombre, 0);
  const remplacees = choisies.filter((l) => l.dejaDeclare != null && l.dejaDeclare !== l.nombre).length;
  const aAjouter = (r?.lignes ?? []).filter((l) => ajouts.has(l.cle) && inspection[l.cle]);
  const classesAjoutees = aAjouter.reduce((n, l) => n + l.nombre, 0);
  const inspectionsACreer = new Set(aAjouter.filter((l) => inspection[l.cle] === -1).map((l) => `${l.departementId}|${l.nouvelleInspection}`)).size;

  const enregistrer = async () => {
    if (!fichier || !r) return;
    const ajout = aAjouter.length ? ` et ajouter ${nf.format(aAjouter.length)} école(s) absente(s) dans l’organigramme (${nf.format(classesAjoutees)} classes${inspectionsACreer ? `, ${nf.format(inspectionsACreer)} inspection(s) à créer` : ""})` : "";
    if (!confirm(`Enregistrer le nombre de classes de ${nf.format(choisies.length)} école(s) retrouvée(s) (${nf.format(totalChoisi)} classes)${ajout} pour ${r.annee} ? Les écoles qui ont leurs classes saisies une par une gardent leur saisie pour le calcul des besoins.`)) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const d = new FormData();
      d.append("fichier", fichier);
      d.append("annee", r.annee);
      d.append("cles", JSON.stringify(choisies.map((l) => l.cle)));
      d.append("ajouter", JSON.stringify(aAjouter.map((l) => ({ cle: l.cle, inspectionId: inspection[l.cle] }))));
      const x = await api.post<Omit<Resultat, "annee">>("/classes-declarees/appliquer", d);
      setResultat({ ...x, annee: r.annee });
      setR(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const nomCycle = (c: string) => CYCLES[c] ?? c;

  return (
    <div className="space-y-4">
      <EnTete
        titre="Classes du fichier des allocations"
        sousTitre="Le fichier des allocations budgétaires donne le nombre de classes pédagogiques de chaque établissement. Enregistré dans les écoles retrouvées, il sert au besoin en enseignants tant que les classes ne sont pas saisies une par une. Faites d’abord l’essai : rien n’est enregistré avant « Enregistrer le nombre de classes »."
      />

      <Carte titre="1. Déposer le fichier">
        <div className="space-y-2 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-600">Année scolaire :</span>
            <Saisie placeholder="en cours" value={annee} onChange={(e) => setAnnee(e.target.value)} className="w-32" title="Laissez vide pour l’année scolaire en cours" />
          </div>
          <ZoneFichier accept=".xlsx" envoi={envoi && !r} envoyer={analyser} libelleBouton="Vérifier le fichier" aide="Le fichier tel que reçu (« ALLOCATIONS BUDGETAIRES-MEPPSA ») : une feuille par cycle, la colonne « NOMBRE DE CLASSES PEDAGOGIQUES ». Les lignes de total sont laissées de côté." />
          {erreur && <Alerte>{erreur}</Alerte>}
        </div>
      </Carte>

      {resultat && (
        <Alerte ton="vert">
          Enregistré pour {resultat.annee} : {nf.format(resultat.classes)} classes dans {nf.format(resultat.enregistrees)} école(s)
          {resultat.ajoutees > 0 && <>, dont {nf.format(resultat.ajoutees)} école(s) ajoutée(s) dans l’organigramme</>}
          {resultat.inspections > 0 && <> et {nf.format(resultat.inspections)} inspection(s) créée(s)</>}. Le besoin en enseignants de ces écoles en tient compte (Structures scolaires, Besoins en personnel).
          {resultat.refus.length > 0 && (
            <span className="mt-1 block">
              Non fait ({resultat.refus.length}) : {resultat.refus.slice(0, 5).join(" ; ")}
              {resultat.refus.length > 5 ? "…" : ""}
            </span>
          )}
          <span className="mt-1 block">Déposez à nouveau le fichier pour voir ce qui reste à confirmer.</span>
        </Alerte>
      )}

      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ORDRE.map((e) => (
              <button key={e} type="button" className="text-left" onClick={() => (setEtat(e), setPage(1))}>
                <Chiffre libelle={ETATS[e].libelle} valeur={nf.format(r.compteurs[e])} ton={ETATS[e].ton} detail={e === etat ? "affichées ci-dessous" : undefined} />
              </button>
            ))}
          </div>
          <p className="text-[12px] text-zinc-500">
            {nf.format(r.lues)} établissements lus pour {r.annee}
            {r.ignorees ? ` (${nf.format(r.ignorees)} ligne(s) de total ou sans nombre de classes laissées de côté)` : ""}. Les colonnes du nombre d’enseignants du fichier sont vides : seul le nombre de classes est pris.
          </p>

          <Carte titre="2. Vérifier et cocher">
            <div className="space-y-3 text-[13px]">
              <Segments valeur={etat} changer={(e) => (setEtat(e), setPage(1))} options={ORDRE.map((e) => ({ valeur: e, libelle: `${ETATS[e].libelle} (${nf.format(r.compteurs[e])})` }))} />
              <p className="text-zinc-600">{ETATS[etat].aide}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Liste value={dep} onChange={(e) => (setDep(e.target.value), setPage(1))} vide="Tous les départements" options={departements.map((d) => ({ valeur: d, libelle: d }))} />
                <Liste value={cycle} onChange={(e) => (setCycle(e.target.value), setPage(1))} vide="Tous les cycles" options={["PRESCOLAIRE", "PRIMAIRE", "COLLEGE", "LYCEE", "ALPHABETISATION"].map((c) => ({ valeur: c, libelle: nomCycle(c) }))} />
                <Saisie placeholder="Chercher une école, une circonscription…" value={recherche} onChange={(e) => (setRecherche(e.target.value), setPage(1))} className="w-64" />
                {(cochable || etat === "ABSENTE") && (
                  <>
                    <Bouton variante="discret" onClick={() => toutCocher(true)} title={etat === "ABSENTE" ? "Les lignes affichées qui ont une inspection (filtre compris)" : "Les lignes affichées (filtre compris)"}>
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
                      {(cochable || etat === "ABSENTE") && <th className="w-10"></th>}
                      <th>Dans le fichier</th>
                      <th>{cochable ? "École chez nous" : etat === "ABSENTE" ? "Ajouter dans l’organigramme" : "Pourquoi"}</th>
                      <th className="text-right">Classes (fichier)</th>
                      {cochable && <th>Déjà dans le système</th>}
                      <th>Ligne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((l) => (
                      <tr key={l.cle}>
                        {cochable && (
                          <td>
                            <input type="checkbox" checked={cochees.has(l.cle)} onChange={(e) => basculer(l.cle, e.target.checked)} />
                          </td>
                        )}
                        {etat === "ABSENTE" && (
                          <td>
                            <input
                              type="checkbox"
                              checked={ajouts.has(l.cle)}
                              disabled={!ajoutable(l) || !inspection[l.cle]}
                              title={!ajoutable(l) ? "Déjà ajoutée par une autre ligne du fichier" : inspection[l.cle] ? "Ajouter cette école dans l’organigramme" : "Choisissez d’abord l’inspection"}
                              onChange={(e) => basculerAjout(l.cle, e.target.checked)}
                            />
                          </td>
                        )}
                        <td>
                          <div className="font-medium">{l.nomFichier}</div>
                          <div className="text-[11px] text-zinc-500">
                            {nomCycle(l.cycle)} · {l.departement}
                            {l.circonscription ? ` · ${l.circonscription}` : ""}
                          </div>
                        </td>
                        <td>
                          {cochable ? (
                            <div>
                              <div>{l.ecole}</div>
                              <div className="text-[11px] text-zinc-500">{l.inspection ?? "inspection non renseignée"}</div>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {l.ressemblance != null && l.ressemblance < 100 && (
                                  <Badge ton={l.ressemblance >= 95 ? "vert" : "jaune"} titre="Ressemblance des noms">
                                    noms à {l.ressemblance} %
                                  </Badge>
                                )}
                                {l.memeInspection === false && (
                                  <Badge ton="jaune" titre="La circonscription du fichier ne correspond pas à l’inspection de l’école chez nous">
                                    autre inspection
                                  </Badge>
                                )}
                              </div>
                              {etat === "PROBABLE" && l.pourquoi && <div className="text-[11px] text-zinc-500">{l.pourquoi}</div>}
                            </div>
                          ) : etat === "ABSENTE" && ajoutable(l) ? (
                            <div className="space-y-1">
                              <div className="font-medium">{l.nomPropose}</div>
                              <Liste
                                value={inspection[l.cle] ?? ""}
                                vide="Choisir l’inspection"
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setInspection((i) => {
                                    const n = { ...i };
                                    if (v) n[l.cle] = v;
                                    else delete n[l.cle];
                                    return n;
                                  });
                                  basculerAjout(l.cle, !!v);
                                }}
                                options={[
                                  ...(l.nouvelleInspection ? [{ valeur: -1, libelle: `Créer « ${l.nouvelleInspection} »` }] : []),
                                  ...inspectionsDe(l).map((i) => ({ valeur: i.id, libelle: i.nom })),
                                ]}
                              />
                              <div className={inspection[l.cle] === -1 ? "text-[11px] text-or-700" : "text-[11px] text-zinc-500"}>
                                {inspection[l.cle] === -1
                                  ? "Cette circonscription n’a pas encore d’inspection chez nous : elle sera créée sous la DDEPPSA, une seule fois pour toutes ses écoles"
                                  : l.inspectionProposeeId
                                    ? "Inspection proposée d’après la circonscription du fichier"
                                    : "Aucune inspection ne porte le nom de la circonscription : choisissez-la"}
                                {l.localite ? ` · ${l.localite}` : ""}
                                {l.zone ? ` (${l.zone === "URBAINE" ? "urbaine" : "rurale"})` : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-600">{l.pourquoi}</span>
                          )}
                        </td>
                        <td className="text-right font-medium tabular-nums">{nf.format(l.nombre)}</td>
                        {cochable && (
                          <td className="text-[12px]">
                            {l.classesSaisies > 0 && <div>{nf.format(l.classesSaisies)} classe(s) saisie(s) une par une : elles restent la référence</div>}
                            {l.dejaDeclare != null && (
                              <div className={l.dejaDeclare === l.nombre ? "text-zinc-500" : "text-or-700"}>
                                {l.dejaDeclare === l.nombre ? "déjà enregistré" : `déjà ${nf.format(l.dejaDeclare)} du fichier : sera remplacé`}
                              </div>
                            )}
                            {!l.classesSaisies && l.dejaDeclare == null && <span className="text-zinc-400">—</span>}
                          </td>
                        )}
                        <td className="whitespace-nowrap text-[11px] text-zinc-500">
                          {l.feuille} {l.ligne}
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
              <Sheet className="size-5 text-marque-600" />
              <span>
                <b>{nf.format(choisies.length)}</b> école(s) cochée(s), <b>{nf.format(totalChoisi)}</b> classes pour {r.annee}
                {remplacees > 0 && <span className="text-or-700"> ({remplacees} nombre(s) déjà enregistré(s) remplacé(s))</span>}
                {aAjouter.length > 0 && (
                  <>
                    {" "}
                    ; <b>{nf.format(aAjouter.length)}</b> école(s) absente(s) à ajouter dans l’organigramme avec <b>{nf.format(classesAjoutees)}</b> classes
                    {inspectionsACreer > 0 && <span className="text-or-700"> ({nf.format(inspectionsACreer)} inspection(s) à créer)</span>}
                  </>
                )}
                .
              </span>
              {peutEnregistrer ? (
                <Bouton variante="principal" className="ml-auto" chargement={envoi} disabled={!choisies.length && !aAjouter.length} onClick={enregistrer}>
                  <Save /> Enregistrer le nombre de classes
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
