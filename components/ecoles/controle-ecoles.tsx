"use client";

import { Building2, Download, GitMerge, Pencil } from "lucide-react";
import { useState } from "react";
import { FraicheurCalcul } from "@/components/fraicheur-calcul";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Champ, Liste, Modale, Saisie, Segments, Tableau, useConfirmation, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { peut, type Ton } from "@/lib/libelles";

/*
 * Les écoles à contrôler (DG, 17/11/2026), dans Structures scolaires (18/11/2026) : les écoles qui se
 * ressemblent (même école ou deux écoles ?), les noms écrits de plusieurs façons, les écoles absentes
 * de l'organigramme (à rattacher à leur inspection), et les décisions prises. La page de la Banque
 * mondiale les montre seulement.
 */

const API = "/ecoles-controle";
const nf = new Intl.NumberFormat("fr-FR");

export type Effectif = "volontaires" | "communautaires" | "contractuels" | "fonctionnaires";
export const EFFECTIFS: [Effectif, string, string][] = [
  ["volontaires", "Volontaires", "V"],
  ["communautaires", "Communautaires", "C"],
  ["contractuels", "Contractuels", "Ct"],
  ["fonctionnaires", "Fonctionnaires", "F"],
];

export const CYCLES_ECOLES: Record<string, string> = {
  PRESCOLAIRE: "Préscolaire",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  ALPHABETISATION: "Alphabétisation",
};

export type Nombres = Record<Effectif, number> & { total: number };

export interface Ecole extends Nombres {
  id: string;
  departementId: number | null;
  departement: string;
  cycle: string | null;
  nom: string;
  nomCorrige: boolean;
  organigramme: boolean;
  ecritures: number;
  jumelees: number;
  proche: { id: string; nom: string; score: number } | null;
}

export interface EcoleDetaillee extends Ecole {
  variantes: { ecrit: string; n: number }[];
  /** La proposition d'ajout à l'organigramme (DG), s'il y en a une (18/11/2026). */
  proposition?: { etat: "A_CONTROLER" | "VALIDEE" | "REJETEE"; note: string | null; controlePar: string | null } | null;
}

export interface DecisionEcole {
  id: number;
  type: "JUMELEE" | "DIFFERENTES" | "ECARTEE" | "MISE_A_JOUR";
  ecole: { id: string; nom: string; departement: string; cycle: string | null };
  autre: { id: string; nom: string; departement: string; cycle: string | null } | null;
  nom: string | null;
  departement: string | null;
  cycle: string | null;
  motif: string | null;
  par: string | null;
  le: string;
}

/** Probabilité que deux écoles qui se ressemblent soient la même (de la plus sûre à la moins sûre). */
export type Niveau = "TRES_PROBABLE" | "PROBABLE" | "A_VERIFIER" | "PEU_PROBABLE";
const NIVEAUX: [Niveau, string, Ton][] = [
  ["TRES_PROBABLE", "Très probables", "vert"],
  ["PROBABLE", "Probables", "bleu"],
  ["A_VERIFIER", "À vérifier", "jaune"],
  ["PEU_PROBABLE", "Peu probables", "gris"],
];

/** Une paire d'écoles qui se ressemblent, avec l'école dont le nom serait gardé. */
interface PaireEcoles {
  score: number;
  niveau: Niveau;
  raison: string;
  garder: "a" | "b";
  a: EcoleDetaillee;
  b: EcoleDetaillee;
}

export const pourcent = (s: number) => `${Math.round(s * 100)} %`;

/** Les effectifs d'une école en une ligne : « V 2 · C 14 · Ct 5 · F 13 ». */
export function EnBref({ e }: { e: Nombres }) {
  return (
    <span className="text-[12px] tabular-nums text-zinc-600">
      {EFFECTIFS.map(([k, , abr]) => `${abr} ${e[k]}`).join(" · ")} — <strong>{e.total}</strong> personne(s)
    </span>
  );
}

/** Une école dans une comparaison : nom, DEPPSA, effectifs, écritures rencontrées. */
export function FicheEcole({ e }: { e: EcoleDetaillee }) {
  return (
    <div className="min-w-0 space-y-1.5 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="font-semibold">{e.nom}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-500">
        {e.departement} · {e.cycle ? CYCLES_ECOLES[e.cycle] : "cycle non reconnu"}
        {e.organigramme ? <Badge ton="vert">dans l’organigramme</Badge> : <Badge ton="gris">hors organigramme</Badge>}
        {e.jumelees > 0 && <Badge ton="bleu">{e.jumelees} école(s) jumelée(s)</Badge>}
      </div>
      <EnBref e={e} />
      <ul className="space-y-0.5 text-[11px] text-zinc-500">
        {e.variantes.map((v) => (
          <li key={v.ecrit}>
            « {v.ecrit} » <span className="tabular-nums">({v.n})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Squelette({ n = 4, h = "h-28" }: { n?: number; h?: string }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`${h} w-full animate-pulse rounded-2xl bg-zinc-200`} />
      ))}
    </div>
  );
}

function Pages({ page, pages, changer }: { page: number; pages: number; changer: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-[13px]">
      <Bouton variante="discret" disabled={page <= 1} onClick={() => changer(page - 1)}>
        ← Précédent
      </Bouton>
      <span className="text-zinc-500">
        Page {page} sur {nf.format(pages)}
      </span>
      <Bouton variante="discret" disabled={page >= pages} onClick={() => changer(page + 1)}>
        Suivant →
      </Bouton>
    </div>
  );
}

const LIBELLE_DECISION: Record<DecisionEcole["type"], string> = {
  JUMELEE: "Même école",
  DIFFERENTES: "Deux écoles différentes",
  ECARTEE: "Écartée (pas une école)",
  MISE_A_JOUR: "Mise à jour",
};

/** Les décisions ; « Annuler » (quand on peut décider) revient au comptage d'avant. */
export function ListeDecisions({ decisions, annuler, controle }: { decisions: DecisionEcole[]; annuler?: (id: number) => void; controle: boolean }) {
  return (
    <Tableau>
      <thead>
        <tr>
          <th>Décision</th>
          <th>École</th>
          <th>Détail</th>
          <th>Par</th>
          {annuler && <th></th>}
        </tr>
      </thead>
      <tbody>
        {decisions.map((x) => (
          <tr key={x.id} className="align-top">
            <td>
              <Badge ton={x.type === "JUMELEE" ? "bleu" : x.type === "ECARTEE" ? "rouge" : x.type === "MISE_A_JOUR" ? "vert" : "gris"}>{LIBELLE_DECISION[x.type]}</Badge>
            </td>
            <td>
              <span className="font-medium">{x.ecole.nom}</span>
              <div className="text-[11px] text-zinc-500">{x.ecole.departement}</div>
            </td>
            <td className="text-[12px] text-zinc-600">
              {x.type === "JUMELEE" && x.autre && <>comptée avec « {x.autre.nom} »</>}
              {x.type === "DIFFERENTES" && x.autre && <>pas la même que « {x.autre.nom} »</>}
              {x.type === "MISE_A_JOUR" && [x.nom && `nom : « ${x.nom} »`, x.departement && `DEPPSA : ${x.departement}`, x.cycle && `cycle : ${CYCLES_ECOLES[x.cycle] ?? x.cycle}`].filter(Boolean).join(" · ")}
              {x.motif && <div className="text-zinc-500">Motif : {x.motif}</div>}
            </td>
            <td className="text-[12px] text-zinc-500">
              {x.par}
              <br />
              {new Date(x.le).toLocaleString("fr-FR")}
            </td>
            {annuler && (
              <td>
                {(x.type !== "ECARTEE" || controle) && (
                  <Bouton variante="discret" onClick={() => annuler(x.id)} title="Revenir au comptage d’avant cette décision">
                    Annuler
                  </Bouton>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </Tableau>
  );
}

// « Noms à harmoniser » n'est plus à l'écran (18/11/2026) : rien à décider, la liste reste dans l'Excel
type Onglet = "ressemblances" | "hors-organigramme" | "harmoniser" | "decisions";

/** Les écoles à contrôler : ressemblances, hors organigramme, noms à harmoniser, décisions. */
export function ControleEcoles({ ongletInitial }: { ongletInitial?: string }) {
  const { profil, refs } = useSession();
  const [onglet, setOnglet] = useState<Onglet>(
    ["ressemblances", "hors-organigramme", "decisions"].includes(ongletInitial ?? "") ? (ongletInitial as Onglet) : "ressemblances",
  );
  const [departementId, setDepartementId] = useState("");
  const [cycle, setCycle] = useState("TOUS");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [aProposer, setAProposer] = useState<EcoleDetaillee | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [niveau, setNiveau] = useState<Niveau | "">("");
  // Les paires cochées, d'une page à l'autre : « a§b » → la paire
  const [cochees, setCochees] = useState<Map<string, { a: string; b: string }>>(new Map());
  const [fusionEnCours, setFusionEnCours] = useState(false);
  const [refuses, setRefuses] = useState<{ ecoles: string; raison: string }[]>([]);
  const [confirmation, demander] = useConfirmation();
  const filtres = { cycle, departementId: departementId || undefined, recherche: recherche.trim() || undefined };
  const resume = useApi<{ ressemblances: number; aHarmoniser: number; horsOrganigramme: number; decisions: number; reclassees: number; calculeLe: string; aJour: boolean }>(`${API}${qs(filtres)}`);
  const r = useApi<{ total: number; niveaux: Record<Niveau, number>; paires: PaireEcoles[] }>(
    onglet === "ressemblances" ? `${API}/ressemblances${qs({ ...filtres, page, niveau: niveau || undefined })}` : null,
  );
  const l = useApi<{ total: number; ecoles: EcoleDetaillee[] }>(onglet === "hors-organigramme" || onglet === "harmoniser" ? `${API}/liste/${onglet}${qs({ ...filtres, page })}` : null);
  const dec = useApi<DecisionEcole[]>(onglet === "decisions" ? `${API}/decisions` : null);
  const controle = peut.controler(profil.role);

  const toutRelire = () => {
    resume.recharger();
    r.recharger();
    l.recharger();
    dec.recharger();
  };
  const decider = async (cle: string, corps: Record<string, unknown>) => {
    setErreur(null);
    setSucces(null);
    setEnCours(cle);
    try {
      await api.post(`${API}/decisions`, corps);
      toutRelire();
      return true;
    } catch (x) {
      setErreur((x as Error).message);
      return false;
    } finally {
      setEnCours(null);
    }
  };
  const annuler = async (id: number) => {
    setErreur(null);
    try {
      await api.delete(`${API}/decisions/${id}`);
      toutRelire();
    } catch (x) {
      setErreur((x as Error).message);
    }
  };
  const changer = (f: (v: string) => void) => (v: string) => {
    f(v);
    setPage(1);
    setCochees(new Map());
  };
  const clePaire = (p: { a: string; b: string }) => `${p.a}§${p.b}`;
  const cocher = (liste: { a: string; b: string }[], oui: boolean) =>
    setCochees((m) => {
      const n = new Map(m);
      for (const p of liste) {
        if (oui) n.set(clePaire(p), { a: p.a, b: p.b });
        else n.delete(clePaire(p));
      }
      return n;
    });
  /** Cocher d'un coup toutes les paires d'un niveau (toutes les pages). */
  const cocherNiveau = async (n: Niveau) => {
    setErreur(null);
    try {
      cocher(await api.get<{ a: string; b: string }[]>(`${API}/ressemblances/toutes${qs({ ...filtres, niveau: n })}`), true);
    } catch (x) {
      setErreur((x as Error).message);
    }
  };
  const fusionner = async () => {
    const liste = [...cochees.values()];
    if (!liste.length) return;
    const ok = await demander(
      `Fusionner ${nf.format(liste.length)} paire(s) d’écoles ? Pour chacune, les personnes sont comptées sous le nom gardé (celui de l’organigramme, sinon le plus complet). Les paires qui se touchent sont regroupées sous une seule école. Chaque fusion reste dans « Décisions » et s’annule.`,
      "Oui, fusionner",
    );
    if (!ok) return;
    setErreur(null);
    setSucces(null);
    setRefuses([]);
    setFusionEnCours(true);
    try {
      const x = await api.post<{ fusionnees: number; groupes: number; refuses: { ecoles: string; raison: string }[]; ignorees: number }>(`${API}/decisions/fusion`, { paires: liste });
      setSucces(
        `${nf.format(x.fusionnees)} école(s) fusionnée(s) dans ${nf.format(x.groupes)} école(s).` +
          (x.ignorees ? ` ${nf.format(x.ignorees)} paire(s) déjà traitée(s) ignorée(s).` : ""),
      );
      setRefuses(x.refuses);
      setCochees(new Map());
      setPage(1);
      toutRelire();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setFusionEnCours(false);
    }
  };
  const n = resume.donnees;

  return (
    <div className="space-y-4">
      {confirmation}
      <Carte>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-[13px] text-zinc-600">
            Les noms d’écoles écrits dans les fichiers (registre de la bourse, base du personnel) ne sont pas toujours ceux de l’organigramme. Ici, on tranche : <strong>même école</strong> ou <strong>deux écoles</strong>, nom
            corrigé ou pas une école. Ce sont des décisions de <strong>comptage</strong>, pour compter juste les effectifs par école : les fiches et l’organigramme ne sont pas modifiés ici ; chaque décision s’annule.
          </p>
          <div className="flex flex-col items-end gap-2">
            {n && <FraicheurCalcul calculeLe={n.calculeLe} aJour={n.aJour} recharger={resume.recharger} />}
            <Bouton
              onClick={() => api.telecharger(`${API}/excel${qs(filtres)}`, "Écoles à contrôler.xlsx").catch((x: Error) => setErreur(x.message))}
              title="Effectifs par école, plus les noms d’écoles à harmoniser dans les fichiers d’origine et les écoles qui se ressemblent"
            >
              <Download /> Excel (noms à harmoniser compris)
            </Bouton>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Liste value={departementId} onChange={(e) => changer(setDepartementId)(e.target.value)} vide="Toutes les DEPPSA" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
          <Liste
            value={cycle}
            onChange={(e) => changer(setCycle)(e.target.value)}
            options={[{ valeur: "TOUS", libelle: "Tous les cycles" }, ...Object.entries(CYCLES_ECOLES).map(([valeur, libelle]) => ({ valeur, libelle })), { valeur: "SANS", libelle: "Cycle non reconnu" }]}
          />
          <Saisie value={recherche} onChange={(e) => changer(setRecherche)(e.target.value)} placeholder="Nom de l’école…" />
        </div>
      </Carte>

      <Segments
        valeur={onglet}
        changer={(o) => { setOnglet(o); setPage(1); }}
        options={[
          { valeur: "ressemblances", libelle: `Écoles qui se ressemblent${n ? ` (${nf.format(n.ressemblances)})` : ""}` },
          { valeur: "hors-organigramme", libelle: `Hors organigramme${n ? ` (${nf.format(n.horsOrganigramme)})` : ""}` },
          { valeur: "decisions", libelle: `Décisions${n ? ` (${nf.format(n.decisions)})` : ""}` },
        ]}
      />
      {erreur && <Alerte>{erreur}</Alerte>}
      {succes && <Alerte ton="vert">{succes}</Alerte>}
      {refuses.length > 0 && (
        <Alerte ton="jaune">
          <p className="font-medium">{nf.format(refuses.length)} groupe(s) non fusionné(s) : à trancher une paire à la fois.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {refuses.map((x) => (
              <li key={x.ecoles}>
                {x.ecoles} — {x.raison}
              </li>
            ))}
          </ul>
        </Alerte>
      )}

      {onglet === "ressemblances" && (
        <Carte titre="Écoles qui se ressemblent">
          <p className="mb-3 text-[12px] text-zinc-500">
            Deux écoles de la même DEPPSA dont les noms se ressemblent, de la plus probable à la moins probable. « Même école » les compte ensemble sous le nom gardé ; « Deux écoles différentes » ne les propose plus.
            Pour aller vite : cochez les paires (ou toutes les « très probables » d’un coup), puis « Fusionner la sélection ».
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {([["", "Toutes"], ...NIVEAUX] as [Niveau | "", string, Ton?][]).map(([v, libelle]) => {
              const nb = !r.donnees ? null : v ? r.donnees.niveaux[v] : Object.values(r.donnees.niveaux).reduce((s, x) => s + x, 0);
              return (
                <button
                  key={v || "toutes"}
                  type="button"
                  onClick={() => { setNiveau(v); setPage(1); }}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${niveau === v ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                >
                  {libelle}{nb !== null ? ` (${nf.format(nb)})` : ""}
                </button>
              );
            })}
          </div>
          {controle && (
            <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-sm backdrop-blur">
              <span className="px-1 text-[12px] text-zinc-600">
                <strong className="text-zinc-900">{nf.format(cochees.size)}</strong> paire(s) cochée(s)
              </span>
              <Bouton variante="discret" disabled={!r.donnees?.paires.length} onClick={() => cocher((r.donnees?.paires ?? []).map((p) => ({ a: p.a.id, b: p.b.id })), true)}>
                Cocher cette page
              </Bouton>
              {!!r.donnees?.niveaux.TRES_PROBABLE && (
                <Bouton variante="discret" onClick={() => cocherNiveau("TRES_PROBABLE")}>
                  Cocher toutes les très probables ({nf.format(r.donnees.niveaux.TRES_PROBABLE)})
                </Bouton>
              )}
              {!!r.donnees?.niveaux.PROBABLE && (
                <Bouton variante="discret" onClick={() => cocherNiveau("PROBABLE")}>
                  … et les probables ({nf.format(r.donnees.niveaux.PROBABLE)})
                </Bouton>
              )}
              {cochees.size > 0 && (
                <Bouton variante="discret" onClick={() => setCochees(new Map())}>
                  Tout décocher
                </Bouton>
              )}
              <span className="flex-1" />
              <Bouton variante="principal" disabled={!cochees.size} chargement={fusionEnCours} onClick={fusionner}>
                <GitMerge /> Fusionner la sélection
              </Bouton>
            </div>
          )}
          {r.erreur && <Alerte>{r.erreur}</Alerte>}
          {!r.donnees || r.chargement ? (
            <Squelette n={3} h="h-40" />
          ) : !r.donnees.paires.length ? (
            <Vide>Aucune paire à trancher pour ces filtres.</Vide>
          ) : (
            <div className="space-y-4">
              {r.donnees.paires.map((p) => {
                const garde = p.garder === "a" ? p.a : p.b;
                const autre = p.garder === "a" ? p.b : p.a;
                const coche = cochees.has(clePaire({ a: p.a.id, b: p.b.id }));
                const [, libelleNiveau, ton] = NIVEAUX.find(([v]) => v === p.niveau) ?? ["", p.niveau, "gris"];
                return (
                  <div key={`${p.a.id}§${p.b.id}`} className={`rounded-2xl border p-3 transition ${coche ? "border-marque-400 bg-marque-50/40" : "border-zinc-200 bg-zinc-50/60"}`}>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
                      {controle && (
                        <input
                          type="checkbox"
                          className="size-4 accent-marque-600"
                          checked={coche}
                          onChange={(e) => cocher([{ a: p.a.id, b: p.b.id }], e.target.checked)}
                          aria-label="Cocher cette paire pour la fusionner"
                        />
                      )}
                      <Badge ton={ton}>{libelleNiveau}</Badge>
                      <span>
                        {p.a.departement} · ressemblance <strong className="text-zinc-800">{pourcent(p.score)}</strong> · {p.raison}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[p.a, p.b].map((e) => (
                        <button key={e.id} type="button" className="relative text-left" onClick={() => setOuverte(e.id)} title="Ouvrir cette école">
                          {e.id === garde.id && (
                            <span className="absolute top-2 right-2 z-[1]">
                              <Badge ton="vert">Nom gardé</Badge>
                            </span>
                          )}
                          <FicheEcole e={e} />
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Bouton variante="principal" chargement={enCours === autre.id} onClick={() => decider(autre.id, { type: "JUMELEE", cle: autre.id, autreCle: garde.id })}>
                        <GitMerge /> Même école : garder « {garde.nom} »
                      </Bouton>
                      <Bouton chargement={enCours === garde.id} onClick={() => decider(garde.id, { type: "JUMELEE", cle: garde.id, autreCle: autre.id })}>
                        <GitMerge /> Même école : garder « {autre.nom} »
                      </Bouton>
                      <Bouton variante="discret" onClick={() => decider(p.a.id, { type: "DIFFERENTES", cle: p.a.id, autreCle: p.b.id })}>
                        Deux écoles différentes
                      </Bouton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pages page={page} pages={r.donnees ? Math.max(1, Math.ceil(r.donnees.total / 20)) : 1} changer={setPage} />
        </Carte>
      )}

      {(onglet === "hors-organigramme" || onglet === "harmoniser") && (
        <Carte titre={onglet === "harmoniser" ? "Noms à harmoniser" : "Écoles hors organigramme"}>
          <p className="mb-3 text-[12px] text-zinc-500">
            {onglet === "harmoniser"
              ? "Une même école écrite de plusieurs façons dans les fichiers. Elle est déjà comptée une seule fois ; ouvrez-la pour lui donner son nom officiel, ou la compter avec une autre école."
              : "Écoles connues seulement par le nom écrit dans les fichiers : elles ne sont pas dans l’organigramme (Établissements). Ouvrez-les si c’est une autre école mal écrite (même école) ou pas une école. Une vraie école peut être proposée à l’organigramme : elle n’y entre que si le DG valide (Administration › Organigramme)."}
            {" "}Les plus nombreuses d’abord.
          </p>
          {l.erreur && <Alerte>{l.erreur}</Alerte>}
          {!l.donnees || l.chargement ? (
            <Squelette n={6} h="h-14" />
          ) : !l.donnees.ecoles.length ? (
            <Vide>Aucune école pour ces filtres.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>École</th>
                  <th>DEPPSA · cycle</th>
                  <th>Personnes</th>
                  <th>Écritures rencontrées</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {l.donnees.ecoles.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td>
                      <button type="button" className="text-left font-medium text-marque-700 hover:underline" onClick={() => setOuverte(e.id)}>
                        {e.nom}
                      </button>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {e.organigramme ? <Badge ton="vert">dans l’organigramme</Badge> : <Badge ton="gris">hors organigramme</Badge>}
                        {e.proche && <Badge ton="jaune">≈ {e.proche.nom} ({pourcent(e.proche.score)})</Badge>}
                        {e.proposition?.etat === "A_CONTROLER" && <Badge ton="bleu">proposée à l’organigramme : en attente du DG</Badge>}
                        {e.proposition?.etat === "VALIDEE" && <Badge ton="vert">ajoutée à l’organigramme</Badge>}
                        {e.proposition?.etat === "REJETEE" && (
                          <Badge ton="rouge">
                            proposition rejetée{e.proposition.note ? ` : « ${e.proposition.note} »` : ""}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-[12px] text-zinc-600">
                      {e.departement}
                      <br />
                      {e.cycle ? CYCLES_ECOLES[e.cycle] : <span className="text-or-700">cycle non reconnu</span>}
                    </td>
                    <td>
                      <EnBref e={e} />
                    </td>
                    <td className="text-[11px] text-zinc-500">
                      {e.variantes.slice(0, 4).map((v) => (
                        <div key={v.ecrit}>
                          « {v.ecrit} » ({v.n})
                        </div>
                      ))}
                      {e.variantes.length > 4 && <div>… et {e.variantes.length - 4} autre(s)</div>}
                    </td>
                    <td>
                      <div className="flex flex-col items-end gap-1.5">
                        <Bouton variante="discret" onClick={() => setOuverte(e.id)}>
                          <Pencil /> Décider
                        </Bouton>
                        {!e.organigramme && e.proposition?.etat !== "A_CONTROLER" && e.proposition?.etat !== "VALIDEE" && (
                          <Bouton variante="discret" onClick={() => setAProposer(e)} title="L’école n’entre dans l’organigramme que si le DG valide">
                            <Building2 /> Proposer à l’organigramme
                          </Bouton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
          <Pages page={page} pages={l.donnees ? Math.max(1, Math.ceil(l.donnees.total / 30)) : 1} changer={setPage} />
        </Carte>
      )}

      {onglet === "decisions" && (
        <Carte titre="Décisions prises sur les écoles">
          {dec.erreur && <Alerte>{dec.erreur}</Alerte>}
          {!dec.donnees || dec.chargement ? <Squelette n={5} h="h-10" /> : !dec.donnees.length ? <Vide>Aucune décision pour le moment.</Vide> : <ListeDecisions decisions={dec.donnees} annuler={annuler} controle={controle} />}
        </Carte>
      )}

      {aProposer && (
        <ModaleProposition
          ecole={aProposer}
          fermer={() => setAProposer(null)}
          fait={(nom) => {
            setAProposer(null);
            setSucces(`« ${nom} » est proposée à l’organigramme : elle y entrera si le DG valide (Administration › Organigramme).`);
            toutRelire();
          }}
        />
      )}
      {ouverte && <ModaleEcole id={ouverte} fermer={() => setOuverte(null)} decider={decider} annuler={annuler} controle={controle} departements={refs.departements} />}
    </div>
  );
}

interface GroupeInspections {
  departementId: number | null;
  departement: string;
  inspections: { id: number; nom: string; sigle: string; cycle: string | null }[];
}

/**
 * Proposer une école hors organigramme à l'organigramme (18/11/2026) : nom officiel, cycle et
 * inspection. Rien n'est créé ici : la proposition attend la décision du DG.
 */
function ModaleProposition({ ecole, fermer, fait }: { ecole: EcoleDetaillee; fermer: () => void; fait: (nom: string) => void }) {
  const ins = useApi<GroupeInspections[]>(`${API}/inspections`);
  const [nom, setNom] = useState(ecole.nom);
  const [cycle, setCycle] = useState(ecole.cycle ?? "");
  const [dep, setDep] = useState(ecole.departementId === null ? "" : String(ecole.departementId));
  const [inspection, setInspection] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const groupe = ins.donnees?.find((g) => String(g.departementId ?? "") === dep);
  // Les inspections du cycle de l'école d'abord
  const liste = [...(groupe?.inspections ?? [])].sort((a, b) => Number(b.cycle === cycle) - Number(a.cycle === cycle) || a.nom.localeCompare(b.nom));
  const envoyer = async () => {
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`${API}/propositions`, { cle: ecole.id, nom: nom.trim(), cycle, inspectionId: Number(inspection) });
      fait(nom.trim());
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Modale titre={`Proposer « ${ecole.nom} » à l’organigramme`} ouverte fermer={fermer}>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          L’école n’est <strong>pas créée tout de suite</strong> : la proposition part au DG (Administration › Organigramme), qui la valide ou la rejette. Écrivez son nom officiel et choisissez son inspection.
        </p>
        <Champ libelle="Nom officiel">
          <Saisie value={nom} onChange={(e) => setNom(e.target.value)} />
        </Champ>
        <Champ libelle="Cycle">
          <Liste value={cycle} onChange={(e) => setCycle(e.target.value)} vide="Choisir…" options={Object.entries(CYCLES_ECOLES).map(([valeur, libelle]) => ({ valeur, libelle }))} />
        </Champ>
        <Champ libelle="DEPPSA">
          <Liste
            value={dep}
            onChange={(e) => {
              setDep(e.target.value);
              setInspection("");
            }}
            vide="Choisir…"
            options={(ins.donnees ?? []).map((g) => ({ valeur: String(g.departementId ?? ""), libelle: g.departement }))}
          />
        </Champ>
        <Champ libelle="Inspection">
          <Liste value={inspection} onChange={(e) => setInspection(e.target.value)} vide={ins.donnees ? "Choisir…" : "Chargement…"} options={liste.map((i) => ({ valeur: String(i.id), libelle: `${i.nom}${i.cycle ? ` (${CYCLES_ECOLES[i.cycle] ?? i.cycle})` : ""}` }))} />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!nom.trim() || !cycle || !inspection} chargement={envoi} onClick={envoyer}>
            <Building2 /> Proposer au DG
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Une école : la comparer aux plus proches, la jumeler, corriger son nom ou sa DEPPSA, l'écarter. */
function ModaleEcole({
  id,
  fermer,
  decider,
  annuler,
  controle,
  departements,
}: {
  id: string;
  fermer: () => void;
  decider: (cle: string, corps: Record<string, unknown>) => Promise<boolean>;
  annuler: (id: number) => void;
  controle: boolean;
  departements: { id: number; nom: string }[];
}) {
  const d = useApi<{ ecole: EcoleDetaillee; proches: (Ecole & { score: number })[]; decisions: DecisionEcole[] }>(`${API}/ecole${qs({ id })}`);
  const [cherche, setCherche] = useState("");
  const e = d.donnees?.ecole;
  const autres = useApi<{ ecoles: Ecole[] }>(cherche.trim().length >= 2 && e ? `${API}/ecoles${qs({ cycle: "TOUS", departementId: e.departementId ?? undefined, recherche: cherche.trim(), taille: 8 })}` : null);
  const [nom, setNom] = useState<string | null>(null);
  const [dep, setDep] = useState<string | null>(null);
  const [cyc, setCyc] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [ecarter, setEcarter] = useState(false);
  const fait = async (corps: Record<string, unknown>) => {
    if (await decider(id, { cle: id, motif: motif.trim() || undefined, ...corps })) fermer();
  };
  const candidats = [...(d.donnees?.proches ?? []), ...(autres.donnees?.ecoles ?? []).filter((x) => x.id !== id && !d.donnees?.proches.some((p) => p.id === x.id)).map((x) => ({ ...x, score: NaN }))];

  return (
    <Modale titre={e ? e.nom : "École"} ouverte fermer={fermer} large>
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!e ? (
        <Squelette n={2} h="h-32" />
      ) : (
        <div className="space-y-5 text-[13px]">
          <FicheEcole e={e} />

          <section className="space-y-2">
            <h3 className="font-semibold">Même école qu’une autre ?</h3>
            <p className="text-[12px] text-zinc-500">Les écoles de la même DEPPSA dont le nom se rapproche le plus. « Même école » compte ses effectifs avec l’autre, sous le nom de l’autre.</p>
            <Saisie value={cherche} onChange={(x) => setCherche(x.target.value)} placeholder="Chercher une autre école de la DEPPSA…" />
            {!candidats.length ? (
              <Vide>Aucune école proche.</Vide>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {candidats.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {p.nom} {!Number.isNaN(p.score) && <span className="text-[12px] font-normal text-zinc-500">({pourcent(p.score)})</span>}
                      </div>
                      <EnBref e={p} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Bouton variante="principal" onClick={() => fait({ type: "JUMELEE", autreCle: p.id })} title={`Compter « ${e.nom} » avec « ${p.nom} »`}>
                        <GitMerge /> Même école
                      </Bouton>
                      <Bouton variante="discret" onClick={() => fait({ type: "DIFFERENTES", autreCle: p.id })}>
                        Différentes
                      </Bouton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Mettre à jour</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Champ libelle="Nom de l’école">
                <Saisie value={nom ?? e.nom} onChange={(x) => setNom(x.target.value)} />
              </Champ>
              <Champ libelle="DEPPSA">
                <Liste value={dep ?? String(e.departementId ?? "")} onChange={(x) => setDep(x.target.value)} vide="—" options={departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
              </Champ>
              <Champ libelle="Cycle">
                <Liste value={cyc ?? e.cycle ?? ""} onChange={(x) => setCyc(x.target.value)} vide="—" options={Object.entries(CYCLES_ECOLES).map(([valeur, libelle]) => ({ valeur, libelle }))} />
              </Champ>
            </div>
            <Champ libelle="Motif (facultatif)">
              <Saisie value={motif} onChange={(x) => setMotif(x.target.value)} placeholder="Ex. : nom officiel d’après la DEPPSA" />
            </Champ>
            <Bouton
              disabled={(nom === null || nom.trim() === e.nom) && (dep === null || dep === String(e.departementId ?? "")) && (cyc === null || cyc === (e.cycle ?? ""))}
              onClick={() =>
                fait({
                  type: "MISE_A_JOUR",
                  nom: nom !== null && nom.trim() !== e.nom ? nom.trim() : undefined,
                  departementId: dep && dep !== String(e.departementId ?? "") ? Number(dep) : undefined,
                  cycle: cyc && cyc !== (e.cycle ?? "") ? cyc : undefined,
                })
              }
            >
              <Pencil /> Enregistrer la mise à jour
            </Bouton>
          </section>

          {controle && (
            <section className="space-y-2 rounded-xl border border-rouge-100 p-3">
              <h3 className="font-semibold text-rouge-600">Ce n’est pas une école</h3>
              <p className="text-[12px] text-zinc-500">Mairie, centre de santé, nom vide de sens… ou école fermée : elle n’est plus comptée, ses {e.total} personne(s) passent dans « sans école ». Réservé au contrôle ; annulable.</p>
              {!ecarter ? (
                <Bouton variante="danger" onClick={() => setEcarter(true)}>
                  Écarter cette école
                </Bouton>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Bouton variante="danger" onClick={() => fait({ type: "ECARTEE" })}>
                    Oui, écarter
                  </Bouton>
                  <Bouton onClick={() => setEcarter(false)}>Non</Bouton>
                </div>
              )}
            </section>
          )}

          {d.donnees!.decisions.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Décisions déjà prises</h3>
              <ListeDecisions decisions={d.donnees!.decisions} annuler={(x) => { annuler(x); fermer(); }} controle={controle} />
            </section>
          )}
        </div>
      )}
    </Modale>
  );
}

