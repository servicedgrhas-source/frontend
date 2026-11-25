"use client";

import { CheckCheck, FileSpreadsheet, Save, UserCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut, type Ton } from "@/lib/libelles";

/*
 * Placer les nommés dans l'organigramme (DGRHAS, 21/11/2026 : « les nominations servent à placer
 * dans les écoles » ; toutes les écoles disaient « poste vacant »). Chaque nomination validée est
 * reliée à sa structure d'après le poste écrit dans la note : le chef devient le responsable de la
 * structure, la fiche du nommé y est rattachée avec sa fonction. Rien n'est enregistré avant
 * « Enregistrer ».
 */

type Etat = "A_PLACER" | "A_CONFIRMER" | "CONFLIT" | "SANS_FICHE" | "INTROUVABLE" | "SANS_STRUCTURE" | "DEJA_FAIT";

interface Ligne {
  id: number;
  etat: Etat;
  categorie: string;
  fonction: string;
  chef: boolean;
  departementId: number | null;
  departement: string | null;
  nomComplet: string;
  observation: string;
  poste: string | null;
  circonscription: string | null;
  agentId: number | null;
  structureId: number | null;
  structure: string | null;
  ressemblance: number | null;
  pourquoi: string | null;
  ficheStructure: string | null;
  remplace: string | null;
  inspectionAjoutId: number | null;
  inspectionAjout: string | null;
  cochee: boolean;
}

interface Rapport {
  annee: string | null;
  annees: string[];
  compteurs: Record<Etat, number>;
  responsables: number;
  nominations: Ligne[];
  inspections: Record<string, { id: number; nom: string }[]>;
}

interface Resultat {
  placees: number;
  responsables: number;
  fiches: number;
  changementsDepartement: number;
  ecolesAjoutees: number;
  refus: string[];
}

const ETATS: Record<Etat, { libelle: string; ton: Ton; aide: string }> = {
  A_PLACER: { libelle: "À placer", ton: "vert", aide: "La structure de la note est retrouvée sans doute possible. Le chef (directeur, proviseur, chef de circonscription, coordonnateur) en devient le responsable ; la fiche de chaque nommé y est rattachée avec sa fonction." },
  A_CONFIRMER: { libelle: "À confirmer", ton: "jaune", aide: "La structure ressemble mais le système n’est pas sûr (nom proche, ou plusieurs structures possibles). Cochez seulement si c’est bien elle ; sinon, laissez." },
  CONFLIT: { libelle: "Conflits", ton: "rouge", aide: "Deux responsables nommés pour une même structure, ou une même personne nommée à deux postes : à trancher d’abord dans la page Nominations." },
  SANS_FICHE: { libelle: "Sans fiche", ton: "rouge", aide: "Le nommé n’est pas relié à sa fiche de la base du personnel : rattachez-le dans la page Nominations, puis revenez ici." },
  INTROUVABLE: { libelle: "Structure introuvable", ton: "bleu", aide: "Le poste écrit dans la note n’est pas dans l’organigramme. Quand l’inspection de la circonscription est connue, l’école peut être ajoutée, et le nommé y est placé." },
  SANS_STRUCTURE: { libelle: "Sans structure", ton: "gris", aide: "Fonction départementale sans structure dans l’organigramme (coordonnateurs départementaux d’alphabétisation) : la fiche n’est pas déplacée." },
  DEJA_FAIT: { libelle: "Déjà en place", ton: "gris", aide: "La fiche et la structure le disent déjà : rien à faire." },
};
const ORDRE: Etat[] = ["A_PLACER", "A_CONFIRMER", "INTROUVABLE", "CONFLIT", "SANS_FICHE", "SANS_STRUCTURE", "DEJA_FAIT"];
const OBS: Record<string, string> = { RECONDUIT: "reconduit(e)", PROMU: "promu(e)", MUTE: "muté(e)", PERMUTE: "permuté(e)" };

const nf = new Intl.NumberFormat("fr-FR");
const TAILLE = 50;

export default function Page() {
  const { profil } = useSession();
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  return <Placer peutEnregistrer={peut.modifierConfiguration(profil.role)} />;
}

function Placer({ peutEnregistrer }: { peutEnregistrer: boolean }) {
  const [annee, setAnnee] = useState<string | undefined>(undefined);
  const lecture = useApi<Rapport>(`/nominations-placement${qs({ annee })}`);
  const r = lecture.donnees;
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [etat, setEtat] = useState<Etat>("A_PLACER");
  const [dep, setDep] = useState("");
  const [exportEnCours, setExportEnCours] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  // Les choix de la DGRHAS, en écart de ce que le serveur coche d'office
  const [modifPlacer, setModifPlacer] = useState<Map<number, boolean>>(new Map());
  const [modifAjouter, setModifAjouter] = useState<Map<number, boolean>>(new Map());
  const [modifInspection, setModifInspection] = useState<Map<number, number | null>>(new Map());
  const parId = useMemo(() => new Map((r?.nominations ?? []).map((n) => [n.id, n])), [r]);
  const inspectionDe = (id: number) => (modifInspection.has(id) ? modifInspection.get(id) : parId.get(id)?.inspectionAjoutId) ?? null;
  const placerA = (n: Ligne) => modifPlacer.get(n.id) ?? n.cochee;
  const ajouterA = (n: Ligne) => !!(modifAjouter.get(n.id) && inspectionDe(n.id) && n.agentId && n.poste);
  const oublierChoix = () => {
    setModifPlacer(new Map());
    setModifAjouter(new Map());
    setModifInspection(new Map());
    setPage(1);
  };
  const changerAnnee = (a: string) => {
    setAnnee(a);
    oublierChoix();
  };
  const modifier = <T,>(m: Map<number, T>, ids: number[], v: T) => {
    const n = new Map(m);
    for (const id of ids) n.set(id, v);
    return n;
  };

  const departements = useMemo(() => [...new Set((r?.nominations ?? []).map((n) => n.departement).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "fr")), [r]);
  const q = recherche.trim().toUpperCase();
  const lignes = (r?.nominations ?? []).filter(
    (n) => n.etat === etat && (!dep || n.departement === dep) && (!q || `${n.nomComplet} ${n.poste ?? ""} ${n.structure ?? ""} ${n.fonction}`.toUpperCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(lignes.length / TAILLE));
  const p0 = Math.min(page, pages);
  const visibles = lignes.slice((p0 - 1) * TAILLE, p0 * TAILLE);

  const toutCocher = (oui: boolean) => {
    const ids = lignes.map((l) => l.id);
    if (etat === "A_PLACER" || etat === "A_CONFIRMER") setModifPlacer((m) => modifier(m, ids, oui));
    if (etat === "INTROUVABLE") setModifAjouter((m) => modifier(m, ids, oui));
  };

  const tout = r?.nominations ?? [];
  const choixPlacer = tout.filter((n) => (n.etat === "A_PLACER" || n.etat === "A_CONFIRMER") && placerA(n)).map((n) => n.id);
  const choixAjouter = tout.filter((n) => n.etat === "INTROUVABLE" && ajouterA(n)).map((n) => ({ id: n.id, inspectionId: inspectionDe(n.id)! }));
  const chefs = tout.filter((n) => n.chef && (choixPlacer.includes(n.id) || choixAjouter.some((a) => a.id === n.id))).length;

  const enregistrer = async () => {
    if (!r?.annee) return;
    if (!confirm(`Enregistrer : ${nf.format(choixPlacer.length + choixAjouter.length)} nommé(s) placé(s) dans leur structure, dont ${nf.format(chefs)} responsable(s) de structure${choixAjouter.length ? `, et les écoles manquantes ajoutées` : ""} ?`)) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const x = await api.post<Resultat>("/nominations-placement/appliquer", { annee: r.annee, placer: choixPlacer, ajouter: choixAjouter });
      setResultat(x);
      oublierChoix();
      lecture.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const cochable = etat === "A_PLACER" || etat === "A_CONFIRMER" || etat === "INTROUVABLE";

  return (
    <div className="space-y-4">
      <EnTete
        titre="Placer les nommés dans les structures"
        sousTitre="Les nominations validées de l’année prennent effet dans l’organigramme : le directeur, le proviseur, le chef de circonscription ou le coordonnateur devient le responsable de sa structure (fini le « poste vacant ») ; la fiche de chaque nommé est rattachée à sa structure, avec sa fonction. Rien n’est enregistré avant « Enregistrer »."
        actions={
          <div className="flex flex-wrap gap-2">
            {r && r.annees.length > 1 && <Liste value={annee ?? r.annee ?? ""} onChange={(e) => changerAnnee(e.target.value)} options={r.annees.map((a) => ({ valeur: a, libelle: `Nominations ${a}` }))} />}
            {r?.annee && (
              <Bouton
                chargement={exportEnCours}
                title={dep ? `Le département ${dep} : une feuille par situation, avec ce qui fait hésiter et une colonne pour la décision de la DDEPPSA` : "Tous les départements (choisissez-en un dans le filtre pour le fichier d’une DDEPPSA) : une feuille par situation"}
                onClick={() => {
                  setExportEnCours(true);
                  void api
                    .telecharger(`/nominations-placement/excel${qs({ annee: r.annee, departement: dep || undefined })}`, `Placement des nommés ${r.annee}${dep ? ` - ${dep}` : ""}.xlsx`)
                    .catch((e: Error) => setErreur(e.message))
                    .finally(() => setExportEnCours(false));
                }}
              >
                <FileSpreadsheet /> Excel {dep ? `(${dep})` : "(tous les départements)"}
              </Bouton>
            )}
          </div>
        }
      />

      {erreur && <Alerte>{erreur}</Alerte>}
      {lecture.erreur && <Alerte>{lecture.erreur}</Alerte>}
      {resultat && (
        <Alerte ton="vert">
          Enregistré : {nf.format(resultat.placees)} nommé(s) placé(s), {nf.format(resultat.responsables)} responsable(s) de structure désigné(s), {nf.format(resultat.fiches)} fiche(s) mise(s) à jour
          {resultat.changementsDepartement ? ` (dont ${nf.format(resultat.changementsDepartement)} changement(s) de département)` : ""}
          {resultat.ecolesAjoutees ? `, ${nf.format(resultat.ecolesAjoutees)} école(s) ajoutée(s) à l’organigramme` : ""}.
          {resultat.refus.length > 0 && (
            <span className="mt-1 block">
              Non fait ({resultat.refus.length}) : {resultat.refus.slice(0, 5).join(" ; ")}
              {resultat.refus.length > 5 ? "…" : ""}
            </span>
          )}
        </Alerte>
      )}

      {!r ? (
        <Chargement texte="Rapprochement des nominations et de l’organigramme…" />
      ) : !r?.annee ? (
        <Vide>Aucune nomination validée : importez ou validez d’abord les nominations dans la page Nominations.</Vide>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {ORDRE.map((e) => (
              <button key={e} type="button" className="text-left" onClick={() => (setEtat(e), setPage(1))}>
                <Chiffre libelle={ETATS[e].libelle} valeur={nf.format(r.compteurs[e])} ton={ETATS[e].ton} detail={e === etat ? "affichées ci-dessous" : undefined} />
              </button>
            ))}
          </div>
          <p className="text-[12px] text-zinc-500">
            Nominations {r.annee} validées : {nf.format(r.nominations.length)}. Les nommés à trancher (conflits) ou sans fiche se règlent dans la page <Link href="/nominations" className="underline">Nominations</Link>.
          </p>

          <Carte titre="Vérifier et cocher">
            <div className="space-y-3 text-[13px]">
              <Segments valeur={etat} changer={(e) => (setEtat(e), setPage(1))} options={ORDRE.map((e) => ({ valeur: e, libelle: `${ETATS[e].libelle} (${nf.format(r.compteurs[e])})` }))} />
              <p className="text-zinc-600">{ETATS[etat].aide}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Liste value={dep} onChange={(e) => (setDep(e.target.value), setPage(1))} vide="Tous les départements" options={departements.map((d) => ({ valeur: d, libelle: d }))} />
                <Saisie placeholder="Chercher un nom, une école…" value={recherche} onChange={(e) => (setRecherche(e.target.value), setPage(1))} className="w-64" />
                {cochable && (
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
                      {cochable && <th className="w-10"></th>}
                      <th>Nommé(e)</th>
                      <th>Poste dans la note</th>
                      <th>{etat === "INTROUVABLE" ? "École à ajouter dans" : "Structure dans l’organigramme"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((n) => (
                      <tr key={n.id}>
                        {cochable && (
                          <td>
                            {etat === "INTROUVABLE" ? (
                              <input type="checkbox" checked={ajouterA(n)} disabled={!inspectionDe(n.id) || !n.agentId || !n.poste} title={!n.agentId ? "Nommé sans fiche : rattachez-le d’abord" : !inspectionDe(n.id) ? "Choisissez d’abord l’inspection" : undefined} onChange={(e) => setModifAjouter((m) => modifier(m, [n.id], e.target.checked))} />
                            ) : (
                              <input type="checkbox" checked={placerA(n)} onChange={(e) => setModifPlacer((m) => modifier(m, [n.id], e.target.checked))} />
                            )}
                          </td>
                        )}
                        <td>
                          <div className="font-medium">{n.nomComplet}</div>
                          <div className="text-[11px] text-zinc-500">
                            {n.fonction}
                            {OBS[n.observation] ? ` · ${OBS[n.observation]}` : ""}
                          </div>
                          {n.chef && (
                            <Badge ton="vert" titre="Il ou elle devient le responsable de la structure">
                              responsable de la structure
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div>{n.poste ?? "—"}</div>
                          <div className="text-[11px] text-zinc-500">
                            {n.departement ?? "—"}
                            {n.circonscription && n.circonscription !== n.poste ? ` · ${n.circonscription}` : ""}
                          </div>
                        </td>
                        <td>
                          {etat === "INTROUVABLE" ? (
                            <div className="space-y-1">
                              <Liste
                                value={inspectionDe(n.id) ?? ""}
                                vide="Choisir l’inspection"
                                onChange={(e) => {
                                  const v = Number(e.target.value) || null;
                                  setModifInspection((m) => modifier(m, [n.id], v));
                                  setModifAjouter((m) => modifier(m, [n.id], !!v));
                                }}
                                options={(n.departementId ? (r.inspections[String(n.departementId)] ?? []) : []).map((i) => ({ valeur: i.id, libelle: i.nom }))}
                              />
                              {n.pourquoi && <div className="text-[11px] text-zinc-500">{n.pourquoi}</div>}
                            </div>
                          ) : (
                            <div>
                              <div>{n.structure ?? "—"}</div>
                              {n.pourquoi && <div className={etat === "CONFLIT" || etat === "SANS_FICHE" ? "text-[11px] text-rouge-600" : "text-[11px] text-or-700"}>{n.pourquoi}</div>}
                              {n.ficheStructure && n.ficheStructure !== n.structure && <div className="text-[11px] text-zinc-500">fiche aujourd’hui : {n.ficheStructure}</div>}
                              {n.remplace && <div className="text-[11px] text-zinc-500">remplace : {n.remplace}</div>}
                              {etat === "A_CONFIRMER" && n.ressemblance !== null && (
                                <Badge ton={n.ressemblance >= 90 ? "vert" : "jaune"} titre="Ressemblance du poste écrit et du nom de la structure">
                                  noms à {n.ressemblance} %
                                </Badge>
                              )}
                            </div>
                          )}
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

          <Carte titre="Enregistrer">
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <UserCheck className="size-5 text-marque-600" />
              <span>
                <b>{nf.format(choixPlacer.length + choixAjouter.length)}</b> nommé(s) seront placé(s) dans leur structure, dont <b>{nf.format(chefs)}</b> responsable(s) de structure
                {choixAjouter.length > 0 && <> ; des écoles manquantes seront ajoutées pour <b>{nf.format(choixAjouter.length)}</b> nommé(s)</>}.
              </span>
              {peutEnregistrer ? (
                <Bouton variante="principal" className="ml-auto" chargement={envoi} disabled={!choixPlacer.length && !choixAjouter.length} onClick={enregistrer}>
                  <Save /> Enregistrer
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
