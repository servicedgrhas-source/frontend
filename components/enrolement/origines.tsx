"use client";

import { GitMerge, Pencil, Upload } from "lucide-react";
import { useState } from "react";
import { nf } from "@/components/enrolement/volontaires";
import { Alerte, Annonce, Bouton, Champ, Modale, Saisie, Segments, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, useApi } from "@/lib/api";

/*
 * Origine des enrôlés (DG, 16/11/2026) : qui les a recommandés. Décisive, pour la DGRHAS seulement.
 * L'écriture du fichier est gardée ; les écritures d'une même origine sont regroupées. Pas d'origine
 * écrite : la case reste vide (rien n'est inventé).
 */

export interface GroupeOrigine {
  cle: string;
  libelle: string;
  renomme: boolean;
  rattachees: string[];
  ecritures: { ecrit: string; n: number }[];
  n: number;
  retenus: number;
  ecartes: number;
  nonRetenus: number;
  enCours: number;
  bourse: number;
  equipement: number;
}

export interface Origines {
  groupes: GroupeOrigine[];
  sansOrigine: { n: number; retenus: number; bourse: number };
  proches: { a: string; b: string; score: number }[];
  total: number;
}

interface Recuperation {
  feuilles: { feuille: string; colonne: string | null; personnes: number; avecOrigine: number }[];
  lignes: number;
  rapprochees: number;
  introuvables: { feuille: string; ligne: number; nom: string; origine: string | null }[];
  ambigues: number;
  sansOrigine: number;
  identiques: number;
  aRemplir: { id: string; nom: string; origine: string }[];
  conflits: { id: string; nom: string; systeme: string | null; fichier: string[] }[];
  enregistrees?: number;
}

/** L'origine dans une ligne du tableau : le nom regroupé, l'écriture du fichier en dessous. */
export function CelluleOrigine({ libelle, ecrit, modifier }: { libelle: string | null | undefined; ecrit: string | null | undefined; modifier: () => void }) {
  return (
    <span className="group inline-flex items-start gap-1">
      <span>
        {libelle ? <span className="font-medium text-zinc-800">{libelle}</span> : <span className="text-zinc-300">—</span>}
        {ecrit && ecrit !== libelle && <span className="block text-[11px] text-zinc-400">« {ecrit} »</span>}
      </span>
      <button type="button" className="opacity-0 transition group-hover:opacity-100" title="Écrire ou corriger l’origine" onClick={modifier}>
        <Pencil className="size-3 text-zinc-400" aria-hidden />
      </button>
    </span>
  );
}

/** Écrire ou corriger l'origine d'un enrôlé. */
export function ModifierOrigine({ enrole, fermer, apres }: { enrole: { id: string; nomComplet: string; origineBrute: string | null }; fermer: () => void; apres: () => void }) {
  const [origine, setOrigine] = useState(enrole.origineBrute ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await api.patch(`/enrolement/dossiers/${enrole.id}/origine`, { origine: origine.trim() || null });
      apres();
      fermer();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modale titre={`Origine — ${enrole.nomComplet}`} ouverte fermer={fermer}>
      <div className="space-y-3 text-[13px]">
        <Champ libelle="Origine (qui l’a recommandé)" aide="Écrite comme dans le fichier. Vide : pas d’origine.">
          <Saisie value={origine} onChange={(e) => setOrigine(e.target.value)} placeholder="Ex. : S/C DRSC" />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" chargement={envoi} onClick={enregistrer}>
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Les origines d'une campagne : par origine (chiffres et incidence), à regrouper, récupérer d'un fichier. */
export function ModaleOrigines({ campagne, fermer, apres }: { campagne: { id: number; annee: number }; fermer: () => void; apres: () => void }) {
  const o = useApi<Origines>(`/enrolement/origines?campagne=${campagne.id}`);
  const [vue, setVue] = useState<"origines" | "regrouper" | "recuperer">("origines");
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [renommer, setRenommer] = useState<GroupeOrigine | null>(null);
  const [nom, setNom] = useState("");
  const [rattacher, setRattacher] = useState<GroupeOrigine | null>(null);
  const [cible, setCible] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [rapport, setRapport] = useState<Recuperation | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const parCle = new Map((o.donnees?.groupes ?? []).map((g) => [g.cle, g]));
  const relire = () => {
    o.recharger();
    apres();
  };
  const agir = async (f: () => Promise<unknown>, texte: string) => {
    setErreur(null);
    try {
      await f();
      setMessage(texte);
      relire();
    } catch (x) {
      setErreur((x as Error).message);
    }
  };
  const envoyer = async (chemin: "analyse" | "recuperer", f: File) => {
    setFichier(f);
    setEnvoi(true);
    setErreur(null);
    try {
      const d = new FormData();
      d.append("fichier", f);
      const r = await api.post<Recuperation>(`/enrolement/origines/${chemin}?campagne=${campagne.id}`, d);
      setRapport(r);
      if (chemin === "recuperer") {
        setMessage(`${nf.format(r.enregistrees ?? 0)} origine(s) enregistrée(s) depuis « ${f.name} ».`);
        relire();
      }
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  const groupes = o.donnees?.groupes ?? [];
  const totalBourse = groupes.reduce((s, g) => s + g.bourse, 0);

  return (
    <Modale titre={`Origine des enrôlés — ${campagne.annee}`} ouverte fermer={fermer} ecran>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">Qui a recommandé chaque enrôlé, pour la DGRHAS seulement. L’écriture du fichier est toujours gardée ; les écritures d’une même origine sont regroupées pour les chiffres. Sans origine écrite, la case reste vide.</p>
        {message && <Annonce fermer={() => setMessage(null)}>{message}</Annonce>}
        {erreur && <Alerte>{erreur}</Alerte>}
        {o.erreur && <Alerte>{o.erreur}</Alerte>}
        <Segments
          valeur={vue}
          changer={setVue}
          options={[
            { valeur: "origines", libelle: `Par origine (${groupes.length})` },
            { valeur: "regrouper", libelle: `À regrouper (${o.donnees?.proches.length ?? 0})` },
            { valeur: "recuperer", libelle: "Récupérer depuis un fichier" },
          ]}
        />

        {vue === "origines" &&
          (!o.donnees ? (
            <div className="h-40 animate-pulse rounded-xl bg-zinc-200" />
          ) : (
            <>
              <p className="text-zinc-600">
                {nf.format(o.donnees.total)} enrôlé(s) : {nf.format(o.donnees.total - o.donnees.sansOrigine.n)} avec une origine, {nf.format(o.donnees.sansOrigine.n)} sans origine écrite (dont {nf.format(o.donnees.sansOrigine.retenus)} retenus, {nf.format(o.donnees.sansOrigine.bourse)} F/mois).
              </p>
              {!groupes.length ? (
                <Vide>Aucune origine enregistrée : récupérez-les depuis les fichiers de saisie (onglet « Récupérer depuis un fichier »).</Vide>
              ) : (
                <Tableau>
                  <thead>
                    <tr>
                      <th>Origine</th>
                      <th className="text-right">Enrôlés</th>
                      <th className="text-right">Retenus</th>
                      <th className="text-right">Écartés</th>
                      <th className="text-right">Non retenus / en cours</th>
                      <th className="text-right">Bourse / mois (retenus)</th>
                      <th className="text-right">Équipement</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {groupes.map((g) => (
                      <tr key={g.cle} className="align-top">
                        <td>
                          <span className="font-medium">{g.libelle}</span>
                          {(g.ecritures.length > 1 || g.rattachees.length > 0) && <div className="text-[11px] text-zinc-400">{g.ecritures.slice(0, 6).map((x) => `« ${x.ecrit} » ${x.n}`).join(" · ")}{g.ecritures.length > 6 ? " …" : ""}</div>}
                        </td>
                        <td className="text-right tabular-nums">{nf.format(g.n)}</td>
                        <td className="text-right tabular-nums">{nf.format(g.retenus)}</td>
                        <td className="text-right tabular-nums">{nf.format(g.ecartes)}</td>
                        <td className="text-right tabular-nums text-zinc-500">{nf.format(g.nonRetenus + g.enCours)}</td>
                        <td className="text-right tabular-nums">{nf.format(g.bourse)} F</td>
                        <td className="text-right tabular-nums">{nf.format(g.equipement)} F</td>
                        <td className="whitespace-nowrap text-right">
                          <Bouton variante="discret" onClick={() => { setRenommer(g); setNom(g.libelle); }} title="Donner un nom à cette origine">
                            <Pencil /> Nom
                          </Bouton>
                          <Bouton variante="discret" onClick={() => { setRattacher(g); setCible(""); }} title="Compter cette origine avec une autre">
                            <GitMerge /> Avec…
                          </Bouton>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td>Total des origines</td>
                      <td className="text-right tabular-nums">{nf.format(groupes.reduce((s, g) => s + g.n, 0))}</td>
                      <td className="text-right tabular-nums">{nf.format(groupes.reduce((s, g) => s + g.retenus, 0))}</td>
                      <td className="text-right tabular-nums">{nf.format(groupes.reduce((s, g) => s + g.ecartes, 0))}</td>
                      <td className="text-right tabular-nums">{nf.format(groupes.reduce((s, g) => s + g.nonRetenus + g.enCours, 0))}</td>
                      <td className="text-right tabular-nums">{nf.format(totalBourse)} F</td>
                      <td className="text-right tabular-nums">{nf.format(groupes.reduce((s, g) => s + g.equipement, 0))} F</td>
                      <td />
                    </tr>
                  </tbody>
                </Tableau>
              )}
            </>
          ))}

        {vue === "regrouper" &&
          (!o.donnees ? (
            <div className="h-40 animate-pulse rounded-xl bg-zinc-200" />
          ) : !o.donnees.proches.length ? (
            <Vide>Aucune origine à regrouper.</Vide>
          ) : (
            <div className="space-y-2">
              <p className="text-zinc-600">Des origines dont les noms se ressemblent : la même, écrite autrement ? « Compter ensemble » les regroupe sous le nom choisi (annulable avec « Avec… » puis « Détacher »).</p>
              {o.donnees.proches.map((p) => {
                const a = parCle.get(p.a);
                const b = parCle.get(p.b);
                if (!a || !b) return null;
                return (
                  <div key={`${p.a}§${p.b}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 p-3">
                    <span>
                      <strong>{a.libelle}</strong> ({a.n}) ≈ <strong>{b.libelle}</strong> ({b.n}) <span className="text-zinc-400">· {Math.round(p.score * 100)} %</span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <Bouton onClick={() => agir(() => api.post("/enrolement/origines/rattacher", { cle: b.cle, cible: a.cle }), `« ${b.libelle} » compté avec « ${a.libelle} ».`)}>
                        <GitMerge /> Ensemble, sous « {a.libelle} »
                      </Bouton>
                      <Bouton onClick={() => agir(() => api.post("/enrolement/origines/rattacher", { cle: a.cle, cible: b.cle }), `« ${a.libelle} » compté avec « ${b.libelle} ».`)}>
                        <GitMerge /> Ensemble, sous « {b.libelle} »
                      </Bouton>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

        {vue === "recuperer" && (
          <div className="space-y-3">
            <p className="text-zinc-600">
              Déposez un fichier de saisie de l’enrôlement (CDEP, UDENMA, Équipe de saisie, Ajouts…). Le système retrouve chaque personne (même nom, même date de naissance) et lit son origine dans la colonne ORIGINE, sinon OBS. Il remplit seulement les origines encore vides : rien n’est écrasé. Vérifiez d’abord, puis enregistrez.
            </p>
            <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={(f) => envoyer("analyse", f)} libelleBouton="Vérifier le fichier" />
            {rapport && (
              <div className="space-y-3">
                <Tableau>
                  <tbody>
                    {rapport.feuilles.map((f) => (
                      <tr key={f.feuille}>
                        <td>Feuille « {f.feuille} »</td>
                        <td className="text-right">{nf.format(f.personnes)} personne(s)</td>
                        <td>{f.colonne ? `origine lue dans « ${f.colonne} » : ${nf.format(f.avecOrigine)}` : "aucune origine écrite"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
                <ul className="space-y-1">
                  <li>Retrouvées dans le système : <strong>{nf.format(rapport.rapprochees)}</strong> sur {nf.format(rapport.lignes)} ligne(s) · introuvables : {nf.format(rapport.introuvables.length)}{rapport.ambigues ? ` · plusieurs personnes du même nom : ${nf.format(rapport.ambigues)}` : ""}</li>
                  <li>Origines à enregistrer (encore vides dans le système) : <strong className="text-marque-700">{nf.format(rapport.aRemplir.length)}</strong></li>
                  <li>Déjà enregistrées, identiques : {nf.format(rapport.identiques)} · sans origine écrite dans le fichier : {nf.format(rapport.sansOrigine)}</li>
                  <li>Origines différentes (à trancher, pas écrasées) : <strong className={rapport.conflits.length ? "text-or-700" : ""}>{nf.format(rapport.conflits.length)}</strong></li>
                </ul>
                {rapport.enregistrees === undefined && rapport.aRemplir.length > 0 && fichier && (
                  <Bouton variante="principal" chargement={envoi} onClick={() => envoyer("recuperer", fichier)}>
                    <Upload /> Enregistrer {nf.format(rapport.aRemplir.length)} origine(s)
                  </Bouton>
                )}
                {rapport.conflits.length > 0 && (
                  <div>
                    <h3 className="mb-1 font-semibold">Origines différentes, à trancher</h3>
                    <Tableau>
                      <thead>
                        <tr>
                          <th>Nom et prénoms</th>
                          <th>Dans le système</th>
                          <th>Dans le fichier</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {rapport.conflits.map((c) => (
                          <tr key={c.id}>
                            <td className="font-medium">{c.nom}</td>
                            <td>{c.systeme ?? "—"}</td>
                            <td>{c.fichier.join(" / ")}</td>
                            <td className="text-right">
                              {c.fichier.map((f) => (
                                <Bouton key={f} variante="discret" onClick={() => agir(() => api.patch(`/enrolement/dossiers/${c.id}/origine`, { origine: f }), `Origine de ${c.nom} : « ${f} ».`)}>
                                  Prendre « {f} »
                                </Bouton>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Tableau>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {renommer && (
        <Modale titre={`Nom de l’origine « ${renommer.libelle} »`} ouverte fermer={() => setRenommer(null)}>
          <div className="space-y-3 text-[13px]">
            <Champ libelle="Nom affiché" aide="Vide : l’écriture la plus fréquente du fichier.">
              <Saisie value={nom} onChange={(e) => setNom(e.target.value)} />
            </Champ>
            <div className="flex justify-end gap-2">
              <Bouton onClick={() => setRenommer(null)}>Annuler</Bouton>
              <Bouton variante="principal" onClick={() => { const g = renommer; setRenommer(null); void agir(() => api.post("/enrolement/origines/renommer", { cle: g.cle, libelle: nom.trim() || null }), "Nom de l’origine enregistré."); }}>
                Enregistrer
              </Bouton>
            </div>
          </div>
        </Modale>
      )}
      {rattacher && (
        <Modale titre={`Compter « ${rattacher.libelle} » avec…`} ouverte fermer={() => setRattacher(null)}>
          <div className="space-y-3 text-[13px]">
            <Saisie value={cible} onChange={(e) => setCible(e.target.value)} placeholder="Chercher une origine…" />
            <div className="max-h-72 space-y-1 overflow-auto">
              {groupes
                .filter((g) => g.cle !== rattacher.cle && (!cible.trim() || g.libelle.toUpperCase().includes(cible.trim().toUpperCase())))
                .slice(0, 30)
                .map((g) => (
                  <button key={g.cle} type="button" className="flex w-full justify-between rounded-lg px-2 py-1 text-left hover:bg-zinc-50" onClick={() => { const r = rattacher; setRattacher(null); void agir(() => api.post("/enrolement/origines/rattacher", { cle: r.cle, cible: g.cle }), `« ${r.libelle} » compté avec « ${g.libelle} ».`); }}>
                    <span>{g.libelle}</span>
                    <span className="tabular-nums text-zinc-400">{g.n}</span>
                  </button>
                ))}
            </div>
            {rattacher.rattachees.length > 0 && (
              <div className="space-y-1">
                <p className="text-[12px] text-zinc-500">Déjà comptées avec celle-ci (cliquer pour les compter à part) :</p>
                <div className="flex flex-wrap gap-1.5">
                  {rattacher.rattachees.map((c) => (
                    <Bouton key={c} variante="discret" onClick={() => { setRattacher(null); void agir(() => api.post("/enrolement/origines/rattacher", { cle: c, cible: null }), `« ${c} » compté à part.`); }}>
                      Détacher « {c} »
                    </Bouton>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Bouton onClick={() => setRattacher(null)}>Annuler</Bouton>
            </div>
          </div>
        </Modale>
      )}
    </Modale>
  );
}
