"use client";

import { Building2, Download, GitMerge, Loader2, Pencil } from "lucide-react";
import { useRef, useState } from "react";
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
  /** L'école de l'organigramme à laquelle cette écriture correspond (son nom). */
  ecoleOrganigramme?: string | null;
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
  /** Les deux écritures mènent à la même école de l'organigramme. */
  memeEcole?: boolean;
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
export function FicheEcole({ e, role }: { e: EcoleDetaillee; role?: "organigramme" | "fiches" }) {
  // Deux écritures d'une même école : à gauche l'école de l'organigramme, à droite ce que les fiches écrivent
  const ecrits = e.variantes.map((v) => `« ${v.ecrit} »`).join(", ");
  const titre = role === "organigramme" ? (e.ecoleOrganigramme ?? e.nom) : role === "fiches" ? ecrits : e.nom;
  return (
    <div className="min-w-0 space-y-1.5 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="font-semibold">{titre}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-zinc-500">
        {e.departement} · {e.cycle ? CYCLES_ECOLES[e.cycle] : "cycle non reconnu"}
        {role === "fiches" ? (
          <Badge ton="jaune">Écrit dans les fiches</Badge>
        ) : e.organigramme ? (
          <Badge ton="vert">École de l’organigramme</Badge>
        ) : (
          <Badge ton="gris">Écrit dans les fiches (pas dans l’organigramme)</Badge>
        )}
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
              {x.type === "MISE_A_JOUR" && [x.nom && `nom : « ${x.nom} »`, x.departement && `DDEPPSA : ${x.departement}`, x.cycle && `cycle : ${CYCLES_ECOLES[x.cycle] ?? x.cycle}`].filter(Boolean).join(" · ")}
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
type Onglet = "ressemblances" | "rattacher" | "hors-organigramme" | "harmoniser" | "decisions";

/** Les écoles à contrôler : ressemblances, hors organigramme, noms à harmoniser, décisions. */
export function ControleEcoles({ ongletInitial }: { ongletInitial?: string }) {
  const { profil, refs } = useSession();
  const [onglet, setOnglet] = useState<Onglet>(
    ["ressemblances", "rattacher", "hors-organigramme", "decisions"].includes(ongletInitial ?? "") ? (ongletInitial as Onglet) : "ressemblances",
  );
  const [departementId, setDepartementId] = useState("");
  const [cycle, setCycle] = useState("TOUS");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [aProposer, setAProposer] = useState<EcoleDetaillee | null>(null);
  const [, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [niveau, setNiveau] = useState<Niveau | "">("");
  // Les paires cochées, d'une page à l'autre : « a§b » → la paire
  const [cochees, setCochees] = useState<Map<string, { a: string; b: string }>>(new Map());
  const [fusionEnCours, setFusionEnCours] = useState(false);
  const [refuses, setRefuses] = useState<{ ecoles: string; raison: string }[]>([]);
  // Réactivité (19/11/2026) : une paire tranchée disparaît dès que le serveur a répondu, sans attendre
  // le recalcul ; pendant l'envoi, sa carte est verrouillée (bouton qui tourne, autres boutons inactifs).
  const [faites, setFaites] = useState<Set<string>>(new Set());
  const [absorbees, setAbsorbees] = useState<Set<string>>(new Set());
  const [envoi, setEnvoi] = useState<Map<string, string>>(new Map());
  const [refusParPaire, setRefusParPaire] = useState<Map<string, string>>(new Map());
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmation, demander] = useConfirmation();
  const [appliquePassees, setAppliquePassees] = useState(false);
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
  /** Relire en silence un peu après la dernière décision (pas une relecture par clic). */
  const relireBientot = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      resume.recharger();
      r.recharger();
      dec.recharger();
    }, 4000);
  };
  const marquer = <T,>(set: (f: (x: T) => T) => void, f: (x: T) => T) => set(f);
  /** Trancher une paire de la liste : la carte se verrouille, puis disparaît dès que c'est enregistré. */
  const trancher = async (p: PaireEcoles, bouton: "garder-a" | "garder-b" | "differentes", corps: Record<string, unknown>) => {
    const k = clePaire({ a: p.a.id, b: p.b.id });
    if (envoi.has(k) || fusionEnCours) return;
    setErreur(null);
    setSucces(null);
    marquer(setEnvoi, (m) => new Map(m).set(k, bouton));
    try {
      const x = await api.post<{ fiches?: number }>(`${API}/decisions`, corps);
      if (x.fiches) setSucces(`${nf.format(x.fiches)} fiche(s) mise(s) à jour dans nos bases (lieu de service, DDEPPSA).`);
      marquer(setFaites, (y) => new Set(y).add(k));
      // « Même école » : l'école absorbée n'existe plus seule ; ses autres paires se refont au recalcul
      if (corps.type === "JUMELEE") marquer(setAbsorbees, (x) => new Set(x).add(String(corps.cle)));
      cocher([{ a: p.a.id, b: p.b.id }], false);
      relireBientot();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      marquer(setEnvoi, (m) => {
        const n = new Map(m);
        n.delete(k);
        return n;
      });
    }
  };
  const annuler = async (id: number) => {
    setErreur(null);
    try {
      const x = await api.delete<{ fichesRemises?: number }>(`${API}/decisions/${id}`);
      if (x?.fichesRemises) setSucces(`Décision annulée : ${nf.format(x.fichesRemises)} fiche(s) remise(s) comme avant.`);
      // Une décision annulée peut faire revenir des paires : on oublie ce qu'on cachait
      setFaites(new Set());
      setAbsorbees(new Set());
      toutRelire();
    } catch (x) {
      setErreur((x as Error).message);
    }
  };
  const changer = (f: (v: string) => void) => (v: string) => {
    f(v);
    setPage(1);
    setCochees(new Map());
    setRefusParPaire(new Map());
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
    const aVerifier = (r.donnees?.paires ?? []).filter((p) => cochees.has(clePaire({ a: p.a.id, b: p.b.id })) && (p.niveau === "A_VERIFIER" || p.niveau === "PEU_PROBABLE")).length;
    const ok = await demander(
      `Fusionner ${nf.format(liste.length)} paire(s) d’écoles ? Pour chacune, les personnes sont comptées sous le nom gardé (celui de l’organigramme, sinon le plus complet).${aVerifier ? ` Attention : ${nf.format(aVerifier)} paire(s) cochée(s) sont « à vérifier » ou « peu probables » : ce sont peut-être deux écoles différentes.` : ""} Une école reliée à plusieurs autres (groupe de plus de deux) n’est fusionnée que si toutes se ressemblent assez entre elles : sinon ses paires restent, avec la raison, à trancher une par une. Chaque fusion reste dans « Décisions » et s’annule.`,
      "Oui, fusionner",
    );
    if (!ok) return;
    setErreur(null);
    setSucces(null);
    setRefuses([]);
    setFusionEnCours(true);
    try {
      const x = await api.post<{ fusionnees: number; groupes: number; fiches?: number; refuses: { ecoles: string; raison: string; ids?: string[] }[]; ignorees: number }>(`${API}/decisions/fusion`, { paires: liste });
      // Une paire est refusée si ses deux écoles sont dans un groupe refusé
      const raisonDe = (q: { a: string; b: string }) => x.refuses.find((g) => g.ids?.includes(q.a) && g.ids?.includes(q.b))?.raison;
      const refusees = new Map<string, string>();
      const faitesIci: string[] = [];
      for (const q of liste) {
        const raison = raisonDe(q);
        if (raison) refusees.set(clePaire(q), raison);
        else faitesIci.push(clePaire(q));
      }
      setFaites((f) => new Set([...f, ...faitesIci]));
      setRefusParPaire(refusees);
      setSucces(
        `${nf.format(faitesIci.length)} paire(s) fusionnée(s) (${nf.format(x.fusionnees)} école(s) comptée(s) sous un autre nom).` +
          (refusees.size ? ` ${nf.format(refusees.size)} paire(s) laissée(s) dans la liste, avec la raison sur la carte : à trancher une par une.` : "") +
          (x.ignorees ? ` ${nf.format(x.ignorees)} paire(s) déjà traitée(s) ignorée(s).` : "") +
          (x.fiches ? ` ${nf.format(x.fiches)} fiche(s) mise(s) à jour dans nos bases.` : ""),
      );
      setRefuses([]);
      setCochees(new Map());
      relireBientot();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setFusionEnCours(false);
    }
  };
  const cachee = (p: PaireEcoles) => faites.has(clePaire({ a: p.a.id, b: p.b.id })) || absorbees.has(p.a.id) || absorbees.has(p.b.id);
  const retirees = (r.donnees?.paires ?? []).filter(cachee);
  const paires = (r.donnees?.paires ?? []).filter((p) => !cachee(p));
  const resumeLu = resume.donnees;
  const n = resumeLu ? { ...resumeLu, ressemblances: Math.max(0, resumeLu.ressemblances - retirees.length) } : resumeLu;

  return (
    <div className="space-y-4">
      {confirmation}
      <Carte>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-[13px] text-zinc-600">
            Les noms d’écoles écrits dans les fichiers (registre de la bourse, base du personnel) ne sont pas toujours ceux de l’organigramme. Ici, on tranche : <strong>même école</strong> ou <strong>deux écoles</strong>, nom
            corrigé ou pas une école. <strong>Nos bases sont mises à jour</strong> : quand l’école gardée est dans l’organigramme, les fiches du personnel et du registre comptées dans l’autre école prennent cette école (lieu de service, DDEPPSA). Chaque décision s’annule, et les fiches reprennent alors leur valeur d’avant.
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
          <Liste value={departementId} onChange={(e) => changer(setDepartementId)(e.target.value)} vide="Toutes les DDEPPSA" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
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
          { valeur: "rattacher", libelle: `Rattacher à l’organigramme${n ? ` (${nf.format(n.horsOrganigramme)})` : ""}` },
          { valeur: "hors-organigramme", libelle: "Hors organigramme (détail)" },
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
            Deux écoles de la même DDEPPSA dont les noms se ressemblent, de la plus probable à la moins probable. « Même école » les compte ensemble sous le nom gardé ; « Deux écoles différentes » ne les propose plus.
            Pour aller vite : cochez les paires (ou toutes les « très probables » d’un coup), puis « Fusionner la sélection ».
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {([["", "Toutes"], ...NIVEAUX] as [Niveau | "", string, Ton?][]).map(([v, libelle]) => {
              const moins = (x: Niveau) => retirees.filter((q) => q.niveau === x).length;
              const nb = !r.donnees ? null : v ? Math.max(0, r.donnees.niveaux[v] - moins(v)) : Math.max(0, Object.values(r.donnees.niveaux).reduce((s, x) => s + x, 0) - retirees.length);
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
              <Bouton variante="discret" disabled={!paires.length} onClick={() => cocher(paires.map((p) => ({ a: p.a.id, b: p.b.id })), true)}>
                Cocher cette page
              </Bouton>
              {!!r.donnees?.niveaux.TRES_PROBABLE && (
                <Bouton variante="discret" onClick={() => cocherNiveau("TRES_PROBABLE")}>
                  Cocher toutes les très probables ({nf.format(Math.max(0, r.donnees.niveaux.TRES_PROBABLE - retirees.filter((q) => q.niveau === "TRES_PROBABLE").length))})
                </Bouton>
              )}
              {!!r.donnees?.niveaux.PROBABLE && (
                <Bouton variante="discret" onClick={() => cocherNiveau("PROBABLE")}>
                  … et les probables ({nf.format(Math.max(0, r.donnees.niveaux.PROBABLE - retirees.filter((q) => q.niveau === "PROBABLE").length))})
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
          ) : !paires.length ? (
            retirees.length ? <Squelette n={2} h="h-40" /> : <Vide>Aucune paire à trancher pour ces filtres.</Vide>
          ) : (
            <div className="space-y-4">
              {paires.map((p) => {
                // Deux écritures d'une même école : le côté qui écrit le nom de l'organigramme le représente
                const plat = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                const cote = p.memeEcole ? [p.a, p.b].find((e) => e.variantes.some((v) => plat(v.ecrit) === plat(e.ecoleOrganigramme ?? ""))) : undefined;
                const garde = cote ?? (p.garder === "a" ? p.a : p.b);
                const autre = garde === p.a ? p.b : p.a;
                const nomOrg = p.a.ecoleOrganigramme ?? p.b.ecoleOrganigramme ?? garde.nom;
                const k = clePaire({ a: p.a.id, b: p.b.id });
                const coche = cochees.has(k);
                const bouton = envoi.get(k);
                const verrou = !!bouton || (fusionEnCours && coche);
                const refus = refusParPaire.get(k);
                const [, libelleNiveau, ton] = NIVEAUX.find(([v]) => v === p.niveau) ?? ["", p.niveau, "gris"];
                return (
                  <div
                    key={k}
                    aria-busy={verrou}
                    className={`relative rounded-2xl border p-3 transition ${verrou ? "pointer-events-none opacity-60" : ""} ${coche ? "border-marque-400 bg-marque-50/40" : refus ? "border-or-300 bg-or-50/50" : "border-zinc-200 bg-zinc-50/60"}`}
                  >
                    {verrou && (
                      <span className="absolute top-3 right-4 z-[2] inline-flex items-center gap-1.5 rounded-full bg-marque-600 px-2.5 py-1 text-[11px] font-medium text-white shadow">
                        <Loader2 className="size-3 animate-spin" /> Enregistrement…
                      </span>
                    )}
                    {refus && (
                      <div className="mb-2 rounded-xl bg-or-100 px-3 py-1.5 text-[12px] text-or-800">
                        Pas fusionnée : {refus}.
                      </div>
                    )}
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
                      {controle && (
                        <input
                          type="checkbox"
                          className="size-4 accent-marque-600"
                          checked={coche}
                          disabled={verrou}
                          onChange={(e) => cocher([{ a: p.a.id, b: p.b.id }], e.target.checked)}
                          aria-label="Cocher cette paire pour la fusionner"
                        />
                      )}
                      <Badge ton={ton}>{libelleNiveau}</Badge>
                      <span>
                        {p.a.departement} · ressemblance <strong className="text-zinc-800">{pourcent(p.score)}</strong> · {p.raison}
                      </span>
                    </div>
                    {p.memeEcole && (
                      <p className="mb-2 rounded-lg bg-marque-50 px-3 py-2 text-[12px] text-marque-800">
                        À gauche, l’école de l’organigramme ; à droite, le nom tel qu’il est écrit dans {autre.total} fiche(s). C’est la même école : le bouton vert corrige ces fiches (rien ne change dans
                        l’organigramme).
                      </p>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      {[garde, autre].map((e) => (
                        <button key={e.id} type="button" className="relative text-left" onClick={() => setOuverte(e.id)} title="Ouvrir cette école">
                          {e.id === garde.id && !p.memeEcole && (
                            <span className="absolute top-2 right-2 z-[1]">
                              <Badge ton="vert">Nom gardé</Badge>
                            </span>
                          )}
                          <FicheEcole e={e} role={p.memeEcole ? (e.id === garde.id ? "organigramme" : "fiches") : undefined} />
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.memeEcole ? (
                        <Bouton variante="principal" disabled={verrou} chargement={bouton === "garder-a"} onClick={() => void trancher(p, "garder-a", { type: "JUMELEE", cle: autre.id, autreCle: garde.id })}>
                          <GitMerge /> Rattacher ces {autre.total} fiche(s) à « {nomOrg} »
                        </Bouton>
                      ) : (
                        <>
                          <Bouton variante="principal" disabled={verrou} chargement={bouton === "garder-a"} onClick={() => void trancher(p, "garder-a", { type: "JUMELEE", cle: autre.id, autreCle: garde.id })}>
                            <GitMerge /> Même école : garder « {garde.nom} »
                          </Bouton>
                          <Bouton disabled={verrou} chargement={bouton === "garder-b"} onClick={() => void trancher(p, "garder-b", { type: "JUMELEE", cle: garde.id, autreCle: autre.id })}>
                            <GitMerge /> Même école : garder « {autre.nom} »
                          </Bouton>
                        </>
                      )}
                      <Bouton variante="discret" disabled={verrou} chargement={bouton === "differentes"} onClick={() => void trancher(p, "differentes", { type: "DIFFERENTES", cle: p.a.id, autreCle: p.b.id })}>
                        Deux écoles différentes
                      </Bouton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pages page={page} pages={r.donnees ? Math.max(1, Math.ceil(Math.max(0, r.donnees.total - retirees.length) / 20)) : 1} changer={setPage} />
        </Carte>
      )}

      {onglet === "rattacher" && (
        <OngletRattacher filtres={filtres} controle={controle} ouvrir={setOuverte} proposer={setAProposer} relu={() => resume.recharger()} />
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
                  <th>DDEPPSA · cycle</th>
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
        <Carte
          titre="Décisions prises sur les écoles"
          actions={
            controle && (
              <Bouton
                chargement={appliquePassees}
                onClick={async () => {
                  if (!(await demander("Mettre à jour les fiches du personnel et du registre d’après les décisions « même école » déjà prises (celles vers une école de l’organigramme) ? Chaque fiche garde sa valeur d’avant : annuler la décision la remet.", "Oui, mettre à jour"))) return;
                  setErreur(null);
                  setAppliquePassees(true);
                  try {
                    const x = await api.post<{ decisions: number; fiches: number }>(`${API}/decisions/appliquer-passees`, {});
                    setSucces(`${nf.format(x.fiches)} fiche(s) mise(s) à jour d’après ${nf.format(x.decisions)} décision(s) déjà prise(s).`);
                    toutRelire();
                  } catch (e) {
                    setErreur((e as Error).message);
                  } finally {
                    setAppliquePassees(false);
                  }
                }}
                title="Pour les décisions prises avant que le contrôle des écoles mette nos bases à jour"
              >
                Mettre à jour les fiches (décisions déjà prises)
              </Bouton>
            )
          }
        >
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
        <Champ libelle="DDEPPSA">
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
            <p className="text-[12px] text-zinc-500">Les écoles de la même DDEPPSA dont le nom se rapproche le plus. « Même école » compte ses effectifs avec l’autre, sous le nom de l’autre.</p>
            <Saisie value={cherche} onChange={(x) => setCherche(x.target.value)} placeholder="Chercher une autre école de la DDEPPSA…" />
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
              <Champ libelle="DDEPPSA">
                <Liste value={dep ?? String(e.departementId ?? "")} onChange={(x) => setDep(x.target.value)} vide="—" options={departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
              </Champ>
              <Champ libelle="Cycle">
                <Liste value={cyc ?? e.cycle ?? ""} onChange={(x) => setCyc(x.target.value)} vide="—" options={Object.entries(CYCLES_ECOLES).map(([valeur, libelle]) => ({ valeur, libelle }))} />
              </Champ>
            </div>
            <Champ libelle="Motif (facultatif)">
              <Saisie value={motif} onChange={(x) => setMotif(x.target.value)} placeholder="Ex. : nom officiel d’après la DDEPPSA" />
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


interface Candidat {
  id: string;
  nom: string;
  cycle: string | null;
  total: number;
  score: number;
  /** La DDEPPSA de l'école de l'organigramme (montrée quand ce n'est pas celle du fichier). */
  departement?: string;
  memeDdeppsa?: boolean;
}
type EcoleARattacher = Ecole & { candidats: Candidat[] };
interface Rattachement {
  total: number;
  nombres: { tresProches: number; proches: number; lointaines: number; sansCandidat: number };
  ecoles: EcoleARattacher[];
}

/**
 * Rattacher à l'organigramme (19/11/2026 : le but est que chaque école écrite dans les fichiers
 * finisse dans une école de l'organigramme). Pour chaque école hors organigramme : les écoles de
 * l'organigramme les plus proches, la meilleure choisie d'avance ; on rattache d'un clic, ou en série.
 * La carte disparaît dès que c'est enregistré.
 */
function OngletRattacher({
  filtres,
  controle,
  ouvrir,
  proposer,
  relu,
}: {
  filtres: Record<string, string | undefined>;
  controle: boolean;
  ouvrir: (id: string) => void;
  proposer: (e: EcoleDetaillee) => void;
  relu: () => void;
}) {
  const [page, setPage] = useState(1);
  const d = useApi<Rattachement>(`${API}/rattachement${qs({ ...filtres, page, taille: 20 })}`);
  // L'école de l'organigramme choisie pour chaque école (par défaut : la plus proche)
  const [choix, setChoix] = useState<Map<string, string>>(new Map());
  const [cochees, setCochees] = useState<Set<string>>(new Set());
  const [faites, setFaites] = useState<Set<string>>(new Set());
  const [envoi, setEnvoi] = useState<Set<string>>(new Set());
  const [lot, setLot] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relire = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      d.recharger();
      relu();
    }, 4000);
  };
  const cible = (e: EcoleARattacher) => choix.get(e.id) ?? e.candidats[0]?.id;
  const ecoles = (d.donnees?.ecoles ?? []).filter((e) => !faites.has(e.id));
  const basculer = (ids: string[], oui: boolean) =>
    setCochees((c) => {
      const n = new Set(c);
      for (const i of ids) {
        if (oui) n.add(i);
        else n.delete(i);
      }
      return n;
    });
  /** Envoyer des rattachements : école hors organigramme → école de l'organigramme. */
  const envoyer = async (paires: { a: string; b: string }[]) => {
    const r = await api.post<{ fusionnees: number; fiches?: number; refuses: { raison: string; ids?: string[] }[] }>(`${API}/decisions/fusion`, { paires });
    const refusees = new Set(r.refuses.flatMap((g) => g.ids ?? []));
    const ok = paires.filter((q) => !refusees.has(q.a)).map((q) => q.a);
    setFaites((f) => new Set([...f, ...ok]));
    basculer(ok, false);
    relire();
    return { ok: ok.length, refus: r.refuses, fiches: r.fiches ?? 0 };
  };
  const rattacherUne = async (e: EcoleARattacher) => {
    const b = cible(e);
    if (!b || envoi.has(e.id) || lot) return;
    setErreur(null);
    setSucces(null);
    setEnvoi((x) => new Set(x).add(e.id));
    try {
      // Une seule école : la décision simple (instantanée), pas la fusion en série (qui refait tout le calcul)
      const x = await api.post<{ fiches?: number }>(`${API}/decisions`, { type: "JUMELEE", cle: e.id, autreCle: b });
      setSucces(`« ${e.nom} » rattachée${x.fiches ? ` : ${nf.format(x.fiches)} fiche(s) mise(s) à jour dans nos bases` : ""}.`);
      setFaites((f) => new Set(f).add(e.id));
      basculer([e.id], false);
      relire();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi((x) => {
        const n = new Set(x);
        n.delete(e.id);
        return n;
      });
    }
  };
  // Les écoles cochées sur d'autres pages : leur école choisie vient du serveur (la plus proche)
  const [choixServeur, setChoixServeur] = useState<Map<string, string>>(new Map());
  const cocherAuDessus = async (seuil: number) => {
    setErreur(null);
    try {
      const r = await api.get<Rattachement & { choix: { a: string; b: string }[] }>(`${API}/rattachement${qs({ ...filtres, seuil, taille: 1 })}`);
      const libres = r.choix.filter((q) => !faites.has(q.a));
      setChoixServeur((m) => new Map([...m, ...libres.map((q) => [q.a, q.b] as [string, string])]));
      basculer(libres.map((q) => q.a), true);
    } catch (x) {
      setErreur((x as Error).message);
    }
  };
  const rattacherLot = async () => {
    const paires = [...cochees]
      .map((a) => {
        const e = d.donnees?.ecoles.find((x) => x.id === a);
        return { a, b: (e ? cible(e) : undefined) ?? choixServeur.get(a) };
      })
      .filter((q): q is { a: string; b: string } => !!q.b);
    if (!paires.length) return;
    setErreur(null);
    setSucces(null);
    setLot(true);
    try {
      const r = await envoyer(paires);
      setSucces(
        `${nf.format(r.ok)} école(s) rattachée(s) à l’organigramme${r.fiches ? ` : ${nf.format(r.fiches)} fiche(s) mise(s) à jour dans nos bases` : ""}.` +
          (r.refus.length ? ` ${nf.format(paires.length - r.ok)} laissée(s) : ${[...new Set(r.refus.map((g) => g.raison))].join(" ; ")}.` : ""),
      );
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setLot(false);
    }
  };
  const nb = d.donnees?.nombres;
  const niveau = (score: number): [string, Ton] => (score >= 0.85 ? ["très proche", "vert"] : score >= 0.7 ? ["proche", "bleu"] : ["lointaine", "jaune"]);

  return (
    <Carte titre="Rattacher à l’organigramme">
      <p className="mb-3 text-[12px] text-zinc-500">
        Chaque école écrite dans les fichiers mais absente de l’organigramme, avec les écoles de l’organigramme dont le nom ressemble le plus, cherchées dans toutes les DDEPPSA (une école des Plateaux peut être aujourd’hui dans Nkéni-Alima ou Djoué-Léfini : sa DDEPPSA est alors écrite en bleu) (la meilleure est choisie d’avance ; cliquez
        une autre pour changer). « Rattacher » met à jour les fiches de ses personnes (lieu de service, DDEPPSA) avec l’école de l’organigramme ; la décision s’annule dans « Décisions » et les fiches reprennent alors leur valeur d’avant. Sans école proche : ouvrez-la (autre école, pas une école) ou
        proposez-la au DG.
      </p>
      {nb && (
        <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
          <Badge ton="vert">très proches : {nf.format(nb.tresProches)}</Badge>
          <Badge ton="bleu">proches : {nf.format(nb.proches)}</Badge>
          <Badge ton="jaune">lointaines : {nf.format(nb.lointaines)}</Badge>
          <Badge ton="gris">sans école proche : {nf.format(nb.sansCandidat)}</Badge>
        </div>
      )}
      {controle && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <span className="px-1 text-[12px] text-zinc-600">
            <strong className="text-zinc-900">{nf.format(cochees.size)}</strong> école(s) cochée(s)
          </span>
          <Bouton variante="discret" disabled={!ecoles.length} onClick={() => basculer(ecoles.filter((e) => e.candidats.length).map((e) => e.id), true)}>
            Cocher cette page
          </Bouton>
          {!!nb?.tresProches && (
            <Bouton variante="discret" onClick={() => void cocherAuDessus(0.85)}>
              Cocher toutes les très proches ({nf.format(nb.tresProches)})
            </Bouton>
          )}
          {!!nb?.proches && (
            <Bouton variante="discret" onClick={() => void cocherAuDessus(0.7)}>
              … et les proches ({nf.format(nb.proches)})
            </Bouton>
          )}
          {cochees.size > 0 && (
            <Bouton variante="discret" onClick={() => setCochees(new Set())}>
              Tout décocher
            </Bouton>
          )}
          <span className="flex-1" />
          <Bouton variante="principal" disabled={!cochees.size} chargement={lot} onClick={() => void rattacherLot()}>
            <GitMerge /> Rattacher la sélection
          </Bouton>
        </div>
      )}
      {erreur && <Alerte>{erreur}</Alerte>}
      {succes && <Alerte ton="vert">{succes}</Alerte>}
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      {!d.donnees || d.chargement ? (
        <Squelette n={4} h="h-32" />
      ) : !ecoles.length ? (
        faites.size ? <Squelette n={2} h="h-32" /> : <Vide>Toutes les écoles de ces filtres sont dans l’organigramme.</Vide>
      ) : (
        <div className="space-y-3">
          {ecoles.map((e) => {
            const verrou = envoi.has(e.id) || (lot && cochees.has(e.id));
            const choisie = cible(e);
            const coche = cochees.has(e.id);
            return (
              <div
                key={e.id}
                aria-busy={verrou}
                className={`relative rounded-2xl border p-3 transition ${verrou ? "pointer-events-none opacity-60" : ""} ${coche ? "border-marque-400 bg-marque-50/40" : "border-zinc-200 bg-zinc-50/60"}`}
              >
                {verrou && (
                  <span className="absolute top-3 right-4 z-[2] inline-flex items-center gap-1.5 rounded-full bg-marque-600 px-2.5 py-1 text-[11px] font-medium text-white shadow">
                    <Loader2 className="size-3 animate-spin" /> Enregistrement…
                  </span>
                )}
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div className="flex items-start gap-2">
                    {controle && e.candidats.length > 0 && (
                      <input type="checkbox" className="mt-1 size-4 accent-marque-600" checked={coche} disabled={verrou} onChange={(x) => basculer([e.id], x.target.checked)} aria-label={`Cocher ${e.nom}`} />
                    )}
                    <div className="min-w-0">
                      <button type="button" className="text-left font-semibold text-encre hover:underline" onClick={() => ouvrir(e.id)} title="Ouvrir cette école">
                        {e.nom}
                      </button>
                      <div className="text-[12px] text-zinc-500">
                        {e.departement} · {e.cycle ? CYCLES_ECOLES[e.cycle] : "cycle non reconnu"} · <Badge ton="gris">hors organigramme</Badge>
                      </div>
                      <div className="mt-1">
                        <EnBref e={e} />
                      </div>
                    </div>
                  </div>
                  <div>
                    {e.candidats.length ? (
                      <>
                        <div className="mb-1 text-[11px] font-semibold text-zinc-400 uppercase">Écoles de l’organigramme proches</div>
                        <div className="space-y-1">
                          {e.candidats.map((x) => {
                            const [lib, ton] = niveau(x.score);
                            return (
                              <button
                                key={x.id}
                                type="button"
                                disabled={verrou}
                                onClick={() => setChoix((m) => new Map(m).set(e.id, x.id))}
                                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-[13px] ring-1 transition ${choisie === x.id ? "bg-marque-600 text-white ring-marque-600" : "bg-white text-zinc-700 ring-zinc-200 hover:ring-marque-300"}`}
                              >
                                <span className="min-w-0 truncate font-medium">
                                  {x.nom}
                                  {x.memeDdeppsa === false && <span className={`ml-2 text-[11px] font-normal ${choisie === x.id ? "text-white/85" : "text-sky-700"}`}>DDEPPSA {x.departement}</span>}
                                </span>
                                <span className="flex shrink-0 items-center gap-2 text-[11px]">
                                  {choisie !== x.id && <Badge ton={ton}>{lib}</Badge>}
                                  <span className="tabular-nums">{pourcent(x.score)}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {controle && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Bouton variante="principal" disabled={verrou} chargement={envoi.has(e.id)} onClick={() => void rattacherUne(e)}>
                              <GitMerge /> Rattacher à « {e.candidats.find((x) => x.id === choisie)?.nom} »
                            </Bouton>
                            <Bouton variante="discret" disabled={verrou} onClick={() => ouvrir(e.id)}>
                              <Pencil /> Autre choix
                            </Bouton>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl bg-white p-3 text-[12px] text-zinc-600 ring-1 ring-zinc-200">
                        Aucune école de l’organigramme au nom proche dans cette DDEPPSA.
                        {controle && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Bouton variante="discret" onClick={() => ouvrir(e.id)}>
                              <Pencil /> Chercher une autre école / pas une école
                            </Bouton>
                            <Bouton variante="discret" onClick={() => proposer({ ...e, variantes: [] })}>
                              <Building2 /> Proposer à l’organigramme
                            </Bouton>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pages page={page} pages={d.donnees ? Math.max(1, Math.ceil(Math.max(0, d.donnees.total - faites.size) / 20)) : 1} changer={setPage} />
    </Carte>
  );
}
