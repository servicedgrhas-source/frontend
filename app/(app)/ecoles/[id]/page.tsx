"use client";

import { ArrowLeft, Building2, DoorOpen, PencilLine, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, Suspense } from "react";
import { SaisieReferentiel } from "@/components/saisie-referentiel";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { type Besoins, CYCLES, decimal, ecartTexte, ETATS_BESOIN, ETATS_LOCAL } from "@/lib/ecoles";

interface Batiment {
  id: number;
  nom: string;
  type: string | null;
  niveaux: number;
  anneeConstruction: number | null;
  etat: string;
  observation: string | null;
}
interface Salle {
  id: number;
  nom: string;
  batimentId: number | null;
  type: string | null;
  capacite: number | null;
  etat: string;
}
interface Classe {
  id: number;
  niveau: string;
  nom: string;
  salleId: number | null;
  effectif: number | null;
  effectifFilles: number | null;
}
interface Fiche {
  structure: {
    id: number;
    nom: string;
    cycle: string | null;
    localite: string | null;
    inspection: { id: number; nom: string } | null;
    posteResponsable: string;
    responsable: { id: number; nom: string } | null;
    responsableInterim: boolean;
  };
  annee: string;
  batiments: Batiment[];
  salles: Salle[];
  classes: Classe[];
  agents: { id: number; nomComplet: string; statut: string; fonction: string | null; specialite: string | null; enseignant: boolean; enPoste: boolean }[];
  niveaux: { code: string; libelle: string }[];
  besoins: Besoins;
}
type Onglet = "classes" | "locaux" | "personnel" | "besoins";
type Edition = { quoi: "batiments" | "salles" | "classes"; v: Record<string, unknown> } | null;

const annees = (a: string) => {
  const n = Number(a.slice(0, 4));
  return [n - 1, n, n + 1].map((x) => `${x}-${x + 1}`);
};

/** Fiche d'une école : classes de l'année, bâtiments et salles, agents rattachés, besoin en enseignants. */
function FicheEcole() {
  const { id } = useParams<{ id: string }>();
  const [annee, setAnnee] = useState("");
  const f = useApi<Fiche>(`/etablissements/${id}${annee ? `?annee=${annee}` : ""}`);
  const [onglet, setOnglet] = useState<Onglet>("classes");
  const [edition, setEdition] = useState<Edition>(null);
  const [ouvrir, setOuvrir] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();

  if (f.erreur) return <Alerte>{f.erreur}</Alerte>;
  if (!f.donnees) return <Chargement />;
  const d = f.donnees;
  const s = d.structure;
  const niveau = (code: string) => d.niveaux.find((n) => n.code === code)?.libelle ?? code;
  const salle = (sid: number | null) => d.salles.find((x) => x.id === sid)?.nom ?? null;
  const supprimer = async (quoi: string, x: number, libelle: string) => {
    if (!(await demander(`Supprimer « ${libelle} » ?`, "Supprimer"))) return;
    setErreur(null);
    try {
      await api.delete(`/etablissements/${s.id}/${quoi}/${x}`);
      f.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  };
  const b = d.besoins;
  const enseignants = d.agents.filter((a) => a.enseignant && a.enPoste).length;

  return (
    <div className="space-y-5">
      <Link href="/ecoles" className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-encre">
        <ArrowLeft className="size-3.5" /> Écoles
      </Link>
      <EnTete
        titre={s.nom}
        sousTitre={
          <span className="flex flex-wrap items-center gap-2">
            {s.cycle && <Badge ton="gris">{CYCLES[s.cycle] ?? s.cycle}</Badge>}
            {[s.inspection?.nom, s.localite].filter(Boolean).join(" · ")}
            <span className="text-zinc-400">·</span>
            {s.posteResponsable} :{" "}
            {s.responsable ? (
              <Link href={`/personnel/agents/${s.responsable.id}`} className="font-medium text-marque-700 hover:underline">
                {s.responsable.nom}
              </Link>
            ) : (
              <span className="text-or-700">poste vacant</span>
            )}
            {s.responsableInterim && <Badge ton="jaune">intérim</Badge>}
          </span>
        }
        actions={<Liste value={d.annee} onChange={(e) => setAnnee(e.target.value)} options={annees(d.annee).map((a) => ({ valeur: a, libelle: `Année ${a}` }))} />}
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      <div className="grid gap-4 sm:grid-cols-4">
        <Chiffre libelle="Classes ouvertes" valeur={d.classes.length} detail={`${d.classes.reduce((t, c) => t + (c.effectif ?? 0), 0)} élève(s) déclaré(s)`} />
        <Chiffre libelle="Salles" valeur={d.salles.length} detail={`${d.batiments.length} bâtiment(s)`} />
        <Chiffre libelle="Enseignants en poste" valeur={enseignants} detail={`${d.agents.length} agent(s) rattaché(s)`} />
        <Chiffre
          libelle="Besoin en enseignants"
          valeur={b.total ? decimal(b.total.besoin) : "—"}
          ton={b.total ? ETATS_BESOIN[b.total.etat]?.ton : undefined}
          detail={b.total ? `${ETATS_BESOIN[b.total.etat]?.libelle} : ${ecartTexte(b.total.ecart)}` : "cycle à indiquer"}
        />
      </div>

      <Segments
        valeur={onglet}
        changer={setOnglet}
        options={[
          { valeur: "classes", libelle: `Classes (${d.classes.length})` },
          { valeur: "locaux", libelle: `Bâtiments et salles (${d.salles.length})` },
          { valeur: "personnel", libelle: `Personnel (${d.agents.length})` },
          { valeur: "besoins", libelle: "Besoin en enseignants" },
        ]}
      />

      {onglet === "classes" && (
        <Carte
          titre={`Classes ouvertes en ${d.annee}`}
          actions={
            <div className="flex flex-wrap gap-2">
              {!d.classes.length && (
                <Bouton
                  onClick={async () => {
                    setErreur(null);
                    try {
                      const r = await api.post<{ ouvertes: number }>(`/etablissements/${s.id}/classes/ouvrir`, { reprendre: true, anneeScolaire: d.annee });
                      setMessage(`${r.ouvertes} classe(s) reprise(s) de l’année précédente.`);
                      f.recharger();
                    } catch (e) {
                      setErreur((e as Error).message);
                    }
                  }}
                >
                  Reprendre l’année précédente
                </Bouton>
              )}
              <Bouton onClick={() => setOuvrir(true)}>Ouvrir plusieurs classes</Bouton>
              <Bouton variante="principal" onClick={() => setEdition({ quoi: "classes", v: { anneeScolaire: d.annee } })}>
                <Plus /> Ajouter une classe
              </Bouton>
            </div>
          }
        >
          {!d.niveaux.length && <Alerte ton="jaune">Pas de niveaux pour ce cycle : indiquez le cycle de l’école dans l’organigramme, ou les niveaux dans les référentiels.</Alerte>}
          {!d.classes.length ? (
            <Vide>Aucune classe saisie pour {d.annee}. Ouvrez les classes de l’école : c’est d’elles que dépend le besoin en enseignants.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>Niveau</th>
                  <th>Salle</th>
                  <th className="text-right">Élèves</th>
                  <th className="text-right">dont filles</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.classes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.nom}</td>
                    <td>{niveau(c.niveau)}</td>
                    <td className="text-[12px]">{salle(c.salleId) ?? <span className="text-zinc-400">—</span>}</td>
                    <td className="text-right tabular-nums">{c.effectif ?? "—"}</td>
                    <td className="text-right tabular-nums">{c.effectifFilles ?? "—"}</td>
                    <td className="text-right">
                      <BoutonIcone libelle="Modifier" onClick={() => setEdition({ quoi: "classes", v: { ...c } })}>
                        <PencilLine />
                      </BoutonIcone>
                      <BoutonIcone libelle="Supprimer" ton="rouge" onClick={() => supprimer("classes", c.id, c.nom)}>
                        <Trash2 />
                      </BoutonIcone>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      {onglet === "locaux" && (
        <Carte
          titre="Bâtiments et salles"
          actions={
            <div className="flex gap-2">
              <Bouton onClick={() => setEdition({ quoi: "salles", v: {} })}>
                <Plus /> Salle
              </Bouton>
              <Bouton variante="principal" onClick={() => setEdition({ quoi: "batiments", v: { niveaux: 1, etat: "BON" } })}>
                <Plus /> Bâtiment
              </Bouton>
            </div>
          }
        >
          <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
            Chaque bâtiment (administratif, pédagogique, sanitaire, sportif) et ses salles : on sait ainsi dans quelle salle est logée chaque classe.
          </p>
          {!d.batiments.length && !d.salles.length ? (
            <Vide>Aucun bâtiment ni salle saisi.</Vide>
          ) : (
            <div className="space-y-4">
              {[...d.batiments, null].map((bt) => {
                const salles = d.salles.filter((x) => x.batimentId === (bt?.id ?? null));
                if (!bt && !salles.length) return null;
                return (
                  <div key={bt?.id ?? "sans"} className="rounded-xl ring-1 ring-zinc-200">
                    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2">
                      <Building2 className="size-4 text-zinc-400" />
                      <strong className="text-[13px]">{bt ? bt.nom : "Salles hors bâtiment"}</strong>
                      {bt?.type && <Badge ton="gris">{bt.type}</Badge>}
                      {bt && (
                        <span className="text-[12px] text-zinc-500">
                          {bt.niveaux > 1 ? `${bt.niveaux} niveaux · ` : ""}
                          {bt.anneeConstruction ? `construit en ${bt.anneeConstruction} · ` : ""}
                          {ETATS_LOCAL[bt.etat]}
                        </span>
                      )}
                      {bt && (
                        <span className="ml-auto flex">
                          <BoutonIcone libelle="Ajouter une salle" onClick={() => setEdition({ quoi: "salles", v: { batimentId: bt.id } })}>
                            <Plus />
                          </BoutonIcone>
                          <BoutonIcone libelle="Modifier" onClick={() => setEdition({ quoi: "batiments", v: { ...bt } })}>
                            <PencilLine />
                          </BoutonIcone>
                          <BoutonIcone libelle="Supprimer" ton="rouge" onClick={() => supprimer("batiments", bt.id, bt.nom)}>
                            <Trash2 />
                          </BoutonIcone>
                        </span>
                      )}
                    </div>
                    {salles.length ? (
                      <ul className="divide-y divide-zinc-100">
                        {salles.map((x) => (
                          <li key={x.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[13px]">
                            <DoorOpen className="size-3.5 text-zinc-400" />
                            <span className="font-medium">{x.nom}</span>
                            {x.type && <span className="text-zinc-500">· {x.type}</span>}
                            {x.capacite && <span className="text-zinc-500">· {x.capacite} places</span>}
                            {x.etat !== "BON" && <Badge ton={x.etat === "MAUVAIS" ? "rouge" : "jaune"}>{ETATS_LOCAL[x.etat]}</Badge>}
                            <span className="text-[12px] text-zinc-400">
                              {d.classes
                                .filter((c) => c.salleId === x.id)
                                .map((c) => c.nom)
                                .join(", ")}
                            </span>
                            <span className="ml-auto flex">
                              <BoutonIcone libelle="Modifier" onClick={() => setEdition({ quoi: "salles", v: { ...x } })}>
                                <PencilLine />
                              </BoutonIcone>
                              <BoutonIcone libelle="Supprimer" ton="rouge" onClick={() => supprimer("salles", x.id, x.nom)}>
                                <Trash2 />
                              </BoutonIcone>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-3 py-2 text-[12px] text-zinc-400">Aucune salle.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Carte>
      )}

      {onglet === "personnel" && (
        <Carte titre="Agents rattachés à l’école">
          <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
            Les fiches du personnel rattachées à cette école (choisie dans la fiche, ou reconnue d’après le lieu de service écrit). Le proviseur, le directeur, l’économe… ne comptent pas comme
            enseignants ; un agent détaché, en disponibilité ou retraité n’est pas en poste.
          </p>
          {!d.agents.length ? (
            <Vide>Aucun agent rattaché.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Fonction</th>
                  <th>Spécialité</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.agents.map((a) => (
                  <tr key={a.id} className={a.enPoste ? "" : "text-zinc-400"}>
                    <td>
                      <Link href={`/personnel/agents/${a.id}`} className="font-medium text-marque-700 hover:underline">
                        {a.nomComplet}
                      </Link>
                    </td>
                    <td className="text-[12px]">{a.fonction ?? "—"}</td>
                    <td className="text-[12px]">{a.specialite ?? (a.enseignant && ["COLLEGE", "LYCEE"].includes(s.cycle ?? "") ? <span className="text-or-700">à renseigner</span> : "—")}</td>
                    <td className="space-x-1 text-right">
                      {a.enseignant && <Badge ton="vert">enseignant</Badge>}
                      {!a.enPoste && <Badge ton="gris">pas en poste</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      {onglet === "besoins" && <CarteBesoins b={b} annee={d.annee} />}

      {edition && (
        <EditionLocal
          ecole={s.id}
          edition={edition}
          fiche={d}
          fermer={() => setEdition(null)}
          apres={() => {
            setEdition(null);
            f.recharger();
          }}
        />
      )}
      {ouvrir && (
        <OuvrirClasses
          ecole={s.id}
          annee={d.annee}
          niveaux={d.niveaux}
          fermer={() => setOuvrir(false)}
          apres={(n) => {
            setOuvrir(false);
            setMessage(`${n} classe(s) ouverte(s).`);
            f.recharger();
          }}
        />
      )}
      {confirmation}
    </div>
  );
}

/** Besoin en enseignants : par matière au collège et au lycée, une classe = un maître ailleurs. */
function CarteBesoins({ b, annee }: { b: Besoins; annee: string }) {
  return (
    <Carte titre={`Besoin en enseignants (${annee})`}>
      <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
        {b.mode === "CLASSE"
          ? "Un maître par classe : il faut autant d’enseignants que de classes ouvertes."
          : `Pour chaque matière, les heures du programme de chaque classe ouverte sont additionnées, puis divisées par ${b.heuresEnseignant} h (heures de cours d’un enseignant par semaine, réglables dans les paramètres). On compare aux enseignants de la matière rattachés à l’école.`}
      </p>
      {b.alertes.map((a) => (
        <div key={a} className="mb-2">
          <Alerte ton="jaune">{a}</Alerte>
        </div>
      ))}
      {b.total && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-[13px] ring-1 ring-zinc-200">
          {b.total.heures !== null && (
            <span>
              <strong>{b.total.heures} h</strong> de cours par semaine
            </span>
          )}
          <span>
            besoin : <strong>{decimal(b.total.besoin)}</strong> enseignant(s)
          </span>
          <span>
            en poste : <strong>{b.total.enPlace}</strong>
          </span>
          <Badge ton={ETATS_BESOIN[b.total.etat].ton}>
            {ETATS_BESOIN[b.total.etat].libelle} ({ecartTexte(b.total.ecart)})
          </Badge>
        </div>
      )}
      {b.mode === "MATIERE" && !!b.lignes.length && (
        <Tableau>
          <thead>
            <tr>
              <th>Matière</th>
              <th className="text-right">Heures / semaine</th>
              <th className="text-right">Enseignants nécessaires</th>
              <th className="text-right">En poste</th>
              <th className="text-right">Écart</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {b.lignes.map((l) => (
              <tr key={l.matiere}>
                <td className="font-medium">{l.libelle}</td>
                <td className="text-right tabular-nums">{l.heures} h</td>
                <td className="text-right tabular-nums">{decimal(l.besoin)}</td>
                <td className="text-right tabular-nums">{l.enPlace}</td>
                <td className={`text-right font-semibold tabular-nums ${l.ecart < 0 ? "text-rouge-600" : l.ecart > 0 ? "text-or-700" : ""}`}>{ecartTexte(l.ecart)}</td>
                <td className="text-right">
                  <Badge ton={ETATS_BESOIN[l.etat].ton}>{ETATS_BESOIN[l.etat].libelle}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
    </Carte>
  );
}

function OuvrirClasses({ ecole, annee, niveaux, fermer, apres }: { ecole: number; annee: string; niveaux: { code: string; libelle: string }[]; fermer: () => void; apres: (n: number) => void }) {
  const [niveau, setNiveau] = useState(niveaux[0]?.code ?? "");
  const [nombre, setNombre] = useState("1");
  const [prefixe, setPrefixe] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const lib = niveaux.find((n) => n.code === niveau)?.libelle ?? "";
  return (
    <Modale titre={`Ouvrir des classes (${annee})`} ouverte fermer={fermer}>
      <div className="space-y-3">
        <Champ libelle="Niveau">
          <Liste value={niveau} onChange={(e) => setNiveau(e.target.value)} options={niveaux.map((n) => ({ valeur: n.code, libelle: n.libelle }))} />
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Nombre de classes">
            <Saisie type="number" min={1} max={30} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Champ>
          <Champ libelle="Nom des classes" aide={`Ex. « ${prefixe || lib} 1 », « ${prefixe || lib} 2 »…`}>
            <Saisie value={prefixe} onChange={(e) => setPrefixe(e.target.value)} placeholder={lib} />
          </Champ>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={async () => {
            setErreur(null);
            try {
              const r = await api.post<{ ouvertes: number }>(`/etablissements/${ecole}/classes/ouvrir`, { niveau, nombre: Number(nombre), prefixe: prefixe || null, anneeScolaire: annee });
              apres(r.ouvertes);
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Ouvrir
        </Bouton>
      </div>
    </Modale>
  );
}

function EditionLocal({ ecole, edition, fiche, fermer, apres }: { ecole: number; edition: NonNullable<Edition>; fiche: Fiche; fermer: () => void; apres: () => void }) {
  const [v, setV] = useState<Record<string, unknown>>(edition.v);
  const [erreur, setErreur] = useState<string | null>(null);
  const txt = (k: string) => (v[k] === null || v[k] === undefined ? "" : String(v[k]));
  const maj = (k: string, x: unknown) => setV((y) => ({ ...y, [k]: x }));
  const id = v.id as number | undefined;
  const titre = { batiments: "bâtiment", salles: "salle", classes: "classe" }[edition.quoi];
  return (
    <Modale titre={`${id ? "Modifier" : "Ajouter"} : ${titre}`} ouverte fermer={fermer}>
      <div className="space-y-3">
        {edition.quoi === "classes" && (
          <>
            <Champ libelle="Niveau *">
              <Liste value={txt("niveau")} vide="— Choisir —" onChange={(e) => maj("niveau", e.target.value)} options={fiche.niveaux.map((n) => ({ valeur: n.code, libelle: n.libelle }))} />
            </Champ>
            <Champ libelle="Nom *" aide="Ex. 6e 1, 2nde C 2, CM1 A.">
              <Saisie value={txt("nom")} onChange={(e) => maj("nom", e.target.value)} />
            </Champ>
            <Champ libelle="Salle">
              <Liste
                value={txt("salleId")}
                vide="— Aucune —"
                onChange={(e) => maj("salleId", e.target.value ? Number(e.target.value) : null)}
                options={fiche.salles.map((s) => ({ valeur: s.id, libelle: s.nom }))}
              />
            </Champ>
            <div className="grid grid-cols-2 gap-3">
              <Champ libelle="Élèves">
                <Saisie type="number" min={0} value={txt("effectif")} onChange={(e) => maj("effectif", e.target.value)} />
              </Champ>
              <Champ libelle="dont filles">
                <Saisie type="number" min={0} value={txt("effectifFilles")} onChange={(e) => maj("effectifFilles", e.target.value)} />
              </Champ>
            </div>
          </>
        )}
        {edition.quoi === "batiments" && (
          <>
            <Champ libelle="Nom *" aide="Ex. Bâtiment A, Bloc administratif.">
              <Saisie value={txt("nom")} onChange={(e) => maj("nom", e.target.value)} />
            </Champ>
            <Champ libelle="Type">
              <SaisieReferentiel liste="TYPE_BATIMENT" valeur={txt("type")} changer={(x) => maj("type", x)} />
            </Champ>
            <div className="grid grid-cols-3 gap-3">
              <Champ libelle="Niveaux">
                <Saisie type="number" min={1} value={txt("niveaux")} onChange={(e) => maj("niveaux", e.target.value)} />
              </Champ>
              <Champ libelle="Construit en">
                <Saisie type="number" value={txt("anneeConstruction")} onChange={(e) => maj("anneeConstruction", e.target.value)} />
              </Champ>
              <Champ libelle="État">
                <Liste value={txt("etat") || "BON"} onChange={(e) => maj("etat", e.target.value)} options={Object.entries(ETATS_LOCAL).map(([k, l]) => ({ valeur: k, libelle: l }))} />
              </Champ>
            </div>
            <Champ libelle="Observation">
              <Saisie value={txt("observation")} onChange={(e) => maj("observation", e.target.value)} placeholder="Ex. toiture à refaire" />
            </Champ>
          </>
        )}
        {edition.quoi === "salles" && (
          <>
            <Champ libelle="Nom *" aide="Ex. Salle 3, Laboratoire de SVT.">
              <Saisie value={txt("nom")} onChange={(e) => maj("nom", e.target.value)} />
            </Champ>
            <Champ libelle="Bâtiment">
              <Liste
                value={txt("batimentId")}
                vide="— Aucun —"
                onChange={(e) => maj("batimentId", e.target.value ? Number(e.target.value) : null)}
                options={fiche.batiments.map((b) => ({ valeur: b.id, libelle: b.nom }))}
              />
            </Champ>
            <Champ libelle="Type">
              <SaisieReferentiel liste="TYPE_SALLE" valeur={txt("type")} changer={(x) => maj("type", x)} />
            </Champ>
            <div className="grid grid-cols-2 gap-3">
              <Champ libelle="Places">
                <Saisie type="number" min={1} value={txt("capacite")} onChange={(e) => maj("capacite", e.target.value)} />
              </Champ>
              <Champ libelle="État">
                <Liste value={txt("etat") || "BON"} onChange={(e) => maj("etat", e.target.value)} options={Object.entries(ETATS_LOCAL).map(([k, l]) => ({ valeur: k, libelle: l }))} />
              </Champ>
            </div>
          </>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={async () => {
            setErreur(null);
            try {
              if (id) await api.put(`/etablissements/${ecole}/${edition.quoi}/${id}`, v);
              else await api.post(`/etablissements/${ecole}/${edition.quoi}`, v);
              apres();
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

/** Les paramètres de l'adresse ne sont connus qu'au chargement : la page attend dans un <Suspense> (exigé au build). */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <FicheEcole />
    </Suspense>
  );
}
