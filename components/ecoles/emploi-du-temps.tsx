"use client";

import { CalendarDays, CalendarRange, Printer, RefreshCw, Settings2, TriangleAlert } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Alerte, Badge, Bouton, Carte, Champ, Chargement, Liste, Modale, Saisie, Segments, Tableau, Vide, Zone, cx, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";

export interface Creneau {
  debut: string;
  fin: string;
}
export interface Seance {
  classeId: number;
  classe: string;
  matiere: string;
  matiereLibelle: string;
  agentId: number | null;
  agent: string | null;
  jour: number;
  /** Ligne de la grille : le créneau où la séance commence. */
  creneau: number;
  /** Plage saisie par l'école (sinon placée par le système). */
  fixe?: boolean;
  /** Heures propres d'une plage (07:00-08:00) quand elles diffèrent du créneau. */
  debut?: string;
  fin?: string;
  /** Heures de cours que compte la séance (une plage de 07:30 à 09:20 : 2). */
  heures?: number;
}
export interface EmploiDuTemps {
  jours: number[];
  creneaux: Creneau[];
  seances: Seance[];
  nonPlaces: { classe: string; matiere: string; matiereLibelle: string; heures: number; raison: string }[];
  charges: { agentId: number; agent: string; matiere: string | null; heures: number; classes: string[] }[];
  heuresTotal: number;
  heuresPlacees: number;
  generePar: string | null;
  genereLe: string;
}
export interface ReponseEdt {
  structure: { id: number; nom: string; cycle: string | null };
  annee: string;
  parMatiere: boolean;
  /** `propres` : réglages de l'école (sinon ceux d'Administration › Paramètres). */
  reglages: { jours: number[]; creneaux: Creneau[]; heuresEnseignant: number; propres?: boolean };
  /** Enseignants en poste et leurs jours de travail (vide : tous les jours, toute la journée). */
  enseignants?: {
    id: number;
    nom: string;
    specialite: string | null;
    /** Matière enseignée (code), reconnue d'après la spécialité de sa fiche. */
    matiere?: string | null;
    matiereLibelle?: string | null;
    jours: Record<string, { debut: string | null; fin: string | null }> | null;
    /** Plages horaires saisies par l'école : son emploi du temps, créneau par créneau. */
    plages?: { classeId: number; jour: number; debut: string; fin: string }[];
  }[];
  /** Classes de l'année, et le programme (heures par matière) de leur niveau. */
  classes?: { id: number; nom: string; niveau: string }[];
  programme?: Record<string, { matiere: string; heures: number }[]>;
  emploi: EmploiDuTemps | null;
  /** Ce qui a changé depuis la génération (classes, enseignants, matières, quotas) : à regénérer. */
  aRegenerer?: string[];
}

export const NOMS_JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** Jours et heures de travail d'un enseignant (1 = lundi) ; vide : tous les jours, toute la journée. */
export type JoursTravail = Record<string, { debut: string | null; fin: string | null }> | null;

/** L'enseignant est-il là pendant ce créneau (le créneau tient entre son arrivée et son départ) ? */
export function estDisponible(jours: JoursTravail | undefined, jour: number, c: Creneau) {
  if (!jours || !Object.keys(jours).length) return true;
  const h = jours[String(jour)];
  if (!h) return false;
  return (!h.debut || c.debut >= h.debut) && (!h.fin || c.fin <= h.fin);
}

/** « Lundi 09:00-12:00 · Mardi 07:00-09:00 · Jeudi toute la journée ». */
export function resumeJours(jours: JoursTravail | undefined) {
  if (!jours || !Object.keys(jours).length) return "tous les jours de cours, toute la journée";
  return Object.keys(jours)
    .map(Number)
    .sort()
    .map((j) => {
      const h = jours[String(j)];
      const heures = h.debut || h.fin ? `${h.debut ?? "début"}-${h.fin ?? "fin"}` : "toute la journée";
      return `${NOMS_JOURS[j]} ${heures}`;
    })
    .join(" · ");
}

const enMinutes = (h: string) => (/^\d{2}:\d{2}$/.test(h) ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : null);
/** Deux plages d'un même jour se chevauchent-elles (07:00-08:00 et 07:30-08:30 : oui) ? */
export const seChevauchent = (a: { debut: string; fin: string }, b: { debut: string; fin: string }) => !!a.debut && !!a.fin && !!b.debut && !!b.fin && a.debut < b.fin && b.debut < a.fin;
/** Durée d'une heure de cours de l'école (la plus courante de ses créneaux, 55 min). */
export function dureeHeure(creneaux: Creneau[]) {
  const d = creneaux.map((c) => (enMinutes(c.fin) ?? 0) - (enMinutes(c.debut) ?? 0)).filter((x) => x > 0).sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : 55;
}
/** Heures de cours que compte une plage : sa durée en heures de cours de l'école, au moins 1 (comme le serveur). */
export const heuresPlage = (p: { debut: string; fin: string }, creneaux: Creneau[]) => {
  const d = enMinutes(p.debut);
  const f = enMinutes(p.fin);
  return d === null || f === null || f <= d ? 0 : Math.max(1, Math.round((f - d) / dureeHeure(creneaux)));
};

/** Couleur stable par matière : on reconnaît d'un coup d'œil le français, les maths… */
const TEINTES = ["bg-sky-50 text-sky-900", "bg-amber-50 text-amber-900", "bg-emerald-50 text-emerald-900", "bg-rose-50 text-rose-900", "bg-violet-50 text-violet-900", "bg-lime-50 text-lime-900", "bg-orange-50 text-orange-900", "bg-cyan-50 text-cyan-900", "bg-fuchsia-50 text-fuchsia-900", "bg-teal-50 text-teal-900"];
const teinte = (m: string) => TEINTES[[...m].reduce((s, c) => s + c.charCodeAt(0), 0) % TEINTES.length];

/**
 * La grille d'une semaine : les créneaux en lignes, les jours en colonnes ; dans chaque case, la
 * matière et l'enseignant (emploi du temps d'une classe) ou la matière et la classe (d'un enseignant).
 */
export function GrilleEdt({
  e,
  seances,
  vue,
  impression,
  joursTravail,
}: {
  e: Pick<EmploiDuTemps, "jours" | "creneaux">;
  seances: Seance[];
  vue: "classe" | "enseignant";
  impression?: boolean;
  /** Emploi du temps d'un enseignant : ses jours et heures ; les créneaux où il n'est pas là sont grisés. */
  joursTravail?: JoursTravail;
}) {
  const parCase = new Map(seances.map((s) => [`${s.jour}:${s.creneau}`, s]));
  // Une plage longue (07:30-09:20) couvre aussi les créneaux suivants : « suite »
  const suites = new Map<string, Seance>();
  for (const s of seances)
    if (s.debut && s.fin)
      e.creneaux.forEach((c, i) => {
        if (i !== s.creneau && seChevauchent(s as { debut: string; fin: string }, c) && !parCase.has(`${s.jour}:${i}`)) suites.set(`${s.jour}:${i}`, s);
      });
  // Pause entre le matin et l'après-midi : une ligne de séparation
  const coupure = e.creneaux.findIndex((c) => c.debut >= "13:00");
  return (
    <table className={cx("w-full table-fixed border-collapse", impression ? "text-[8pt]" : "text-[12px]")}>
      <thead>
        <tr>
          <th className={cx("border border-zinc-300 bg-zinc-50 px-1 py-1 font-semibold", impression ? "w-[16mm]" : "w-24")}>Heure</th>
          {e.jours.map((j) => (
            <th key={j} className="border border-zinc-300 bg-zinc-50 px-1 py-1 font-semibold">
              {NOMS_JOURS[j]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {e.creneaux.map((c, i) => (
          <tr key={i} className={i === coupure && coupure > 0 ? "border-t-4 border-t-zinc-300" : ""}>
            <td className="border border-zinc-300 px-1 py-1 text-center whitespace-nowrap tabular-nums text-zinc-600">
              {c.debut}
              <br />
              {c.fin}
            </td>
            {e.jours.map((j) => {
              const s = parCase.get(`${j}:${i}`);
              const suite = !s ? suites.get(`${j}:${i}`) : undefined;
              const absent = vue === "enseignant" && joursTravail !== undefined && !s && !suite && !estDisponible(joursTravail, j, c);
              return (
                <td
                  key={j}
                  className={cx("border border-zinc-300 px-1 py-1 align-top", (s ?? suite) && !impression && teinte((s ?? suite)!.matiere), absent && "bg-zinc-200/70 text-center align-middle text-zinc-400")}
                  title={absent ? "Pas de travail à cette heure (jours et heures de l’enseignant)" : undefined}
                >
                  {absent && <span className={impression ? "text-[7pt]" : "text-[10px]"}>—</span>}
                  {s && (
                    <div className="relative leading-tight" title={s.fixe ? "Plage horaire saisie par l’école" : undefined}>
                      {s.fixe && !impression && <span className="absolute -top-0.5 right-0 size-1.5 rounded-full bg-marque-600" aria-label="Plage saisie par l’école" />}
                      <div className="font-semibold">{s.matiereLibelle}</div>
                      <div className={cx(impression ? "" : "text-[11px]", !s.agent && vue === "classe" && "font-medium text-rouge-600")}>{vue === "classe" ? (s.agent ?? "à pourvoir") : s.classe}</div>
                      {/* Plage à ses propres heures : on les écrit */}
                      {s.debut && s.fin && (
                        <div className={cx("font-semibold tabular-nums", impression ? "text-[7pt]" : "text-[10px] text-marque-800")}>
                          {s.debut}–{s.fin}
                        </div>
                      )}
                    </div>
                  )}
                  {suite && (
                    <div className={cx("leading-tight text-zinc-500 italic", impression ? "text-[7pt]" : "text-[10px]")}>
                      suite : {suite.matiereLibelle} ({suite.debut}–{suite.fin})
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** « 0730 », « 7:30 », « 7h30 » → « 07:30 » (vide : pas encore écrit). */
const lireHeure = (t: string) => {
  const m = /^(\d{1,2})\s*[:hH.]?\s*(\d{2})$/.exec(t.trim());
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : t.trim();
};

/** Heure tapée au clavier dans une case étroite (« 07:30 ») : plus lisible que le champ heure du navigateur. */
function HeureCourte({ libelle, valeur, changer }: { libelle: string; valeur: string; changer: (v: string) => void }) {
  const [texte, setTexte] = useState(valeur);
  const [avant, setAvant] = useState(valeur);
  if (avant !== valeur) {
    setAvant(valeur);
    setTexte(valeur);
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={libelle}
      placeholder="hh:mm"
      maxLength={5}
      value={texte}
      onChange={(e) => setTexte(e.target.value.replace(/[^\dhH:.]/g, ""))}
      onBlur={() => {
        const v = lireHeure(texte);
        setTexte(v);
        if (v !== valeur) changer(v);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-full min-w-0 rounded bg-white/80 px-1 py-0.5 text-center text-[11px] tabular-nums outline-none focus:ring-1 focus:ring-marque-300"
    />
  );
}

/** Un cours de l'enseignant dans la fenêtre des plages : sa classe, ses heures (modifiables), et ce qui ne va pas. */
function CasePlage({
  p,
  classes,
  occupant,
  probleme,
  maj,
  retirer,
}: {
  p: { classeId: number; jour: number; debut: string; fin: string };
  classes: { id: number; nom: string }[];
  occupant: (classeId: number, p: { jour: number; debut: string; fin: string }) => { nom: string; debut: string; fin: string } | undefined;
  probleme: string | null;
  maj: (v: Partial<{ classeId: number; debut: string; fin: string }>) => void;
  retirer: () => void;
}) {
  return (
    <div className={cx("mb-0.5 rounded-md p-0.5", probleme && "bg-rouge-100/60 ring-1 ring-rouge-300")}>
      <select
        aria-label={`${NOMS_JOURS[p.jour]} : classe`}
        value={p.classeId || ""}
        onChange={(e) => (Number(e.target.value) ? maj({ classeId: Number(e.target.value) }) : retirer())}
        className={cx("w-full rounded-md bg-transparent px-1 py-1 text-[12px] outline-none focus:ring-2 focus:ring-marque-300", p.classeId ? "font-semibold text-marque-800" : "text-zinc-400")}
      >
        <option value="">— (retirer)</option>
        {classes.map((cl) => {
          const qui = p.debut && p.fin ? occupant(cl.id, p) : undefined;
          return (
            <option key={cl.id} value={cl.id} disabled={!!qui && cl.id !== p.classeId}>
              {cl.nom}
              {qui ? ` (prise : ${qui.nom} ${qui.debut}–${qui.fin})` : ""}
            </option>
          );
        })}
      </select>
      <div className="flex items-center gap-0.5 px-0.5">
        <HeureCourte libelle="Début du cours" valeur={p.debut} changer={(v) => maj({ debut: v })} />
        <span className="text-[10px] text-zinc-400">–</span>
        <HeureCourte libelle="Fin du cours" valeur={p.fin} changer={(v) => maj({ fin: v })} />
      </div>
      {probleme && <div className="px-0.5 text-[10px] leading-tight font-medium text-rouge-700">{probleme}</div>}
    </div>
  );
}

/**
 * Emplois du temps d'un collège ou d'un lycée (DG, 24/10/2026) : générés à partir des classes
 * ouvertes, des quotas horaires du programme et des enseignants de l'école ; l'emploi du temps
 * général (par classe) et celui de chaque enseignant, à l'écran et à imprimer.
 */
export function CarteEmploiDuTemps({ ecole, annee, peutGenerer }: { ecole: number; annee: string; peutGenerer: boolean }) {
  const d = useApi<ReponseEdt>(`/etablissements/${ecole}/emploi-du-temps?annee=${annee}`);
  const [vue, setVue] = useState<"classe" | "enseignant">("classe");
  const [choix, setChoix] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, demander] = useConfirmation();
  const [reglages, setReglages] = useState(false);
  const [joursProfs, setJoursProfs] = useState(false);
  const e = d.donnees?.emploi ?? null;
  const classes = useMemo(() => [...new Map((e?.seances ?? []).map((s) => [s.classeId, s.classe])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr", { numeric: true })), [e]);
  const enseignants = useMemo(() => (e?.charges ?? []).filter((c) => c.heures > 0), [e]);
  const courant = vue === "classe" ? (choix || String(classes[0]?.[0] ?? "")) : choix || String(enseignants[0]?.agentId ?? "");
  const seances = (e?.seances ?? []).filter((s) => (vue === "classe" ? String(s.classeId) === courant : String(s.agentId) === courant));
  // Les heures placées sans enseignant ne comptent pas comme assurées
  const avecEnseignant = (e?.seances ?? []).filter((s) => s.agentId).length;
  const sansEnseignant = (e?.seances.length ?? 0) - avecEnseignant;
  // Déficit par matière : les heures sans enseignant, et le nombre d'enseignants qu'il faudrait
  const deficits = useMemo(() => {
    if (!e || !d.donnees) return [];
    const max = d.donnees.reglages.heuresEnseignant || 20;
    const parMatiere = new Map<string, { matiere: string; libelle: string; heures: number; classes: Set<string> }>();
    for (const x of e.nonPlaces)
      if (x.matiere && x.classe !== "—" && /enseignant à trouver/.test(x.raison)) {
        const m = parMatiere.get(x.matiere) ?? { matiere: x.matiere, libelle: x.matiereLibelle, heures: 0, classes: new Set<string>() };
        m.heures += x.heures;
        m.classes.add(x.classe);
        parMatiere.set(x.matiere, m);
      }
    return [...parMatiere.values()]
      .map((m) => ({ ...m, classes: m.classes.size, presents: e.charges.filter((c) => c.matiere === m.matiere).length, manquants: Math.ceil(m.heures / max) }))
      .sort((a, b) => b.heures - a.heures);
  }, [e, d.donnees]);

  async function generer() {
    if (e && !(await demander("Regénérer l’emploi du temps ? Il est recalculé à partir des classes, des quotas horaires et des enseignants d’aujourd’hui.", "Regénérer"))) return;
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/etablissements/${ecole}/emploi-du-temps/generer`, { anneeScolaire: annee });
      d.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  const imprimer = (q: string) => window.open(`/impression/emploi-du-temps/${ecole}?annee=${annee}&${q}`, "_blank");

  if (d.erreur) return <Alerte>{d.erreur}</Alerte>;
  if (!d.donnees) return <Chargement />;
  if (!d.donnees.parMatiere)
    return (
      <Carte titre={`Emploi du temps (${annee})`}>
        <Vide>Au préscolaire, au primaire et à l’alphabétisation, un maître fait toutes les matières de sa classe : l’emploi du temps par matière concerne les collèges et les lycées.</Vide>
      </Carte>
    );
  const r = d.donnees.reglages;
  return (
    <div className="space-y-4">
      <Carte
        titre={`Emploi du temps (${annee})`}
        actions={
          peutGenerer && (
            <span className="flex flex-wrap gap-2">
              <Bouton variante="discret" onClick={() => setReglages(true)} title="Jours de cours, créneaux et heures des enseignants propres à cette école">
                <Settings2 className="size-4" /> Réglages de l’école
              </Bouton>
              <Bouton variante="discret" onClick={() => setJoursProfs(true)} title="L’emploi du temps de chaque enseignant, créneau par créneau : dans chaque case, la classe où il fait cours">
                <CalendarDays className="size-4" /> Plages horaires des enseignants
              </Bouton>
              <Bouton variante={e ? "secondaire" : "principal"} chargement={envoi} onClick={generer}>
                {e ? <RefreshCw /> : <CalendarRange />} {e ? "Regénérer" : "Générer l’emploi du temps"}
              </Bouton>
            </span>
          )
        }
      >
        <PrisEnCompte d={d.donnees} />
        <p className="mb-3 text-[12px] leading-relaxed text-zinc-500">
          D’abord les <strong>plages horaires</strong> saisies par l’école, placées telles quelles. Puis le reste du programme de chaque classe, réparti entre les enseignants de la matière qui n’ont
          pas de plages (au plus {r.heuresEnseignant} h chacun) et placé sur la semaine : jamais deux cours en même temps pour une classe, un enseignant ou une salle ; leurs jours et heures
          respectés ; la vague A le matin, la vague B l’après-midi ; deux heures d’une matière par jour au plus. Ce qui n’a pas d’enseignant est marqué « à pourvoir ».
        </p>
        {erreur && (
          <div className="mb-3">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
        {e && !!d.donnees.aRegenerer?.length && (
          <div className="mb-3">
            <Alerte ton="jaune">
              <strong>Cet emploi du temps n’est plus à jour</strong> : {d.donnees.aRegenerer.join(" ; ")}.{peutGenerer ? " Cliquez sur « Regénérer »." : ""}
            </Alerte>
          </div>
        )}
        {!e ? (
          <Vide>Pas encore d’emploi du temps pour {annee}. Ouvrez les classes, vérifiez la spécialité des enseignants, puis générez-le.</Vide>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <Badge ton={avecEnseignant === e.heuresTotal ? "vert" : "jaune"}>
              {avecEnseignant} h sur {e.heuresTotal} h avec un enseignant
            </Badge>
            {sansEnseignant > 0 && <Badge ton="rouge">{sansEnseignant} h placées sans enseignant (à pourvoir)</Badge>}
            {e.heuresTotal - e.heuresPlacees > 0 && <Badge ton="rouge">{e.heuresTotal - e.heuresPlacees} h sans créneau</Badge>}
            <Badge ton="gris">{enseignants.length} enseignant(s)</Badge>
            <Badge ton="gris">{classes.length} classe(s)</Badge>
            <span className="text-[12px] text-zinc-400">
              Généré le {new Date(e.genereLe).toLocaleDateString("fr-FR")}
              {e.generePar ? ` par ${e.generePar}` : ""}
            </span>
            <span className="ml-auto flex flex-wrap gap-2">
              <Bouton variante="discret" onClick={() => imprimer("vue=classes")}>
                <Printer className="size-3.5" /> Emploi du temps général
              </Bouton>
              <Bouton variante="discret" onClick={() => imprimer("vue=enseignants")}>
                <Printer className="size-3.5" /> Un par enseignant
              </Bouton>
            </span>
          </div>
        )}
      </Carte>

      {reglages && d.donnees && (
        <ModaleReglagesEcole
          ecole={ecole}
          r={r}
          fermer={() => setReglages(false)}
          apres={() => {
            setReglages(false);
            d.recharger();
          }}
        />
      )}
      {joursProfs && d.donnees && (
        <ModalePlagesEnseignants
          ecole={ecole}
          r={r}
          enseignants={d.donnees.enseignants ?? []}
          classes={d.donnees.classes ?? []}
          programme={d.donnees.programme ?? {}}
          fermer={() => setJoursProfs(false)}
          apres={() => d.recharger()}
        />
      )}

      {e && !!deficits.length && (
        <Carte titre="Enseignants à trouver">
          <p className="-mt-2 mb-3 text-[12px] leading-relaxed text-zinc-500">
            Chaque enseignant fait au plus {r.heuresEnseignant} h par semaine. Quand ceux d’une matière ont tous leurs heures (ou qu’il n’y en a aucun dans l’école), les heures qui restent sont quand
            même placées dans la grille, marquées « à pourvoir » : c’est le <strong>déficit</strong> de l’école.
          </p>
          <Tableau>
            <thead>
              <tr>
                <th>Matière</th>
                <th className="text-right">Heures sans enseignant</th>
                <th className="text-right">Classes</th>
                <th className="text-right">Enseignants de la matière dans l’école</th>
                <th className="text-right">Enseignants à trouver</th>
              </tr>
            </thead>
            <tbody>
              {deficits.map((x) => (
                <tr key={x.matiere}>
                  <td className="font-medium">{x.libelle}</td>
                  <td className="text-right tabular-nums">{x.heures} h</td>
                  <td className="text-right tabular-nums">{x.classes}</td>
                  <td className="text-right tabular-nums">{x.presents}</td>
                  <td className="text-right font-semibold tabular-nums text-rouge-700">{x.manquants}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-[12px] leading-relaxed text-zinc-600 ring-1 ring-zinc-200">
            <strong>Que faire ?</strong> Ces enseignants sont à demander (affectation ou mutation vers l’école). Si un enseignant de l’école n’a pas sa matière, choisissez-la dans l’onglet
            « Personnel » : il recevra des heures. Quand un enseignant arrive, cliquez sur « Regénérer » : ses heures remplacent les « à pourvoir ».
          </div>
        </Carte>
      )}

      {e && !!e.nonPlaces.length && (
        <Carte titre={`À régler, classe par classe (${e.nonPlaces.length})`}>
          <ul className="space-y-1.5 text-[13px]">
            {e.nonPlaces.map((x, i) => (
              <li key={i} className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-or-700" />
                <span>
                  <strong>{x.matiereLibelle}</strong>
                  {x.classe !== "—" && ` en ${x.classe}`}
                  {x.heures > 0 && ` (${x.heures} h)`} : {x.raison}
                  {x.classe === "—" ? " (choisissez sa matière dans l’onglet « Personnel » de l’école)" : ""}.
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {e && (
        <Carte>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Segments
              valeur={vue}
              changer={(v) => {
                setVue(v);
                setChoix("");
              }}
              options={[
                { valeur: "classe", libelle: "Par classe" },
                { valeur: "enseignant", libelle: "Par enseignant" },
              ]}
            />
            <Liste
              className="w-72"
              value={courant}
              onChange={(x) => setChoix(x.target.value)}
              options={
                vue === "classe"
                  ? classes.map(([id, nom]) => ({ valeur: String(id), libelle: nom }))
                  : enseignants.map((c) => ({ valeur: String(c.agentId), libelle: `${c.agent} (${c.heures} h)` }))
              }
            />
            {vue === "enseignant" && courant && (
              <Bouton variante="discret" onClick={() => imprimer(`vue=enseignants&agent=${courant}`)}>
                <Printer className="size-3.5" /> Imprimer pour cet enseignant
              </Bouton>
            )}
          </div>
          {vue === "enseignant" && courant && (
            <p className="mb-2 text-[12px] text-zinc-600">
              <strong>Jours et heures de travail :</strong> {resumeJours(d.donnees.enseignants?.find((x) => String(x.id) === courant)?.jours)}. Les cases grises : il n’est pas là.
            </p>
          )}
          <div className="overflow-x-auto">
            <GrilleEdt e={e} seances={seances} vue={vue} joursTravail={vue === "enseignant" ? (d.donnees.enseignants?.find((x) => String(x.id) === courant)?.jours ?? null) : undefined} />
          </div>
        </Carte>
      )}

      {e && !!enseignants.length && (
        <Carte titre="Charge des enseignants">
          <Tableau>
            <thead>
              <tr>
                <th>Enseignant</th>
                <th className="text-right">Heures par semaine</th>
                <th>Classes</th>
              </tr>
            </thead>
            <tbody>
              {e.charges.map((c) => (
                <tr key={c.agentId}>
                  <td className="font-medium">{c.agent}</td>
                  <td className={cx("text-right tabular-nums", c.heures < r.heuresEnseignant / 2 && "text-or-700")}>{c.heures} h</td>
                  <td className="text-[12px] text-zinc-600">{[...new Set(c.classes)].join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          <p className="mt-2 text-[11px] text-zinc-400">
            Un enseignant qui n’a pas ses {r.heuresEnseignant} h peut compléter son service dans une école proche (temps partiel).
          </p>
        </Carte>
      )}
      {confirmation}
    </div>
  );
}

/** Réglages propres à l'école : jours de cours, créneaux de la journée, heures d'un enseignant (DG, 28/10/2026). */
function ModaleReglagesEcole({ ecole, r, fermer, apres }: { ecole: number; r: ReponseEdt["reglages"]; fermer: () => void; apres: () => void }) {
  const [jours, setJours] = useState<number[]>(r.jours);
  const [creneaux, setCreneaux] = useState(r.creneaux.map((c) => `${c.debut}-${c.fin}`).join(", "));
  const [heures, setHeures] = useState(String(r.heuresEnseignant));
  const [erreur, setErreur] = useState<string | null>(null);
  async function enregistrer(general: boolean) {
    setErreur(null);
    try {
      await api.put(`/etablissements/${ecole}/emploi-du-temps/reglages`, general ? { general: true } : { jours, creneaux, heuresEnseignant: Number(heures) });
      apres();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  return (
    <Modale titre="Réglages de l’école pour l’emploi du temps" ouverte fermer={fermer}>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">Chaque école peut avoir ses jours et ses horaires. Ces réglages ne valent que pour elle ; sans eux, ce sont ceux d’Administration › Paramètres.</p>
        <div>
          <div className="mb-1.5 text-xs font-medium text-zinc-500">Jours de cours</div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <label key={j} className={cx("flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 ring-1", jours.includes(j) ? "bg-marque-50 ring-marque-400" : "ring-zinc-200")}>
                <input type="checkbox" className="accent-marque-600" checked={jours.includes(j)} onChange={() => setJours(jours.includes(j) ? jours.filter((x) => x !== j) : [...jours, j].sort())} />
                {NOMS_JOURS[j]}
              </label>
            ))}
          </div>
        </div>
        <Champ libelle="Créneaux de la journée" aide="Début et fin de chaque heure de cours, séparés par des virgules. Ceux d’avant 13 h sont le matin (vague A), les autres l’après-midi (vague B).">
          <Zone value={creneaux} onChange={(e) => setCreneaux(e.target.value)} placeholder="07:30-08:25, 08:25-09:20, 09:20-10:15" />
        </Champ>
        <Champ libelle="Heures de cours d’un enseignant par semaine (au plus)">
          <Saisie type="number" min={1} max={40} value={heures} onChange={(e) => setHeures(e.target.value)} className="w-32" />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {r.propres && (
          <Bouton variante="discret" onClick={() => enregistrer(true)}>
            Revenir aux réglages généraux
          </Bouton>
        )}
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={() => enregistrer(false)}>
          Enregistrer pour cette école
        </Bouton>
      </div>
    </Modale>
  );
}

/**
 * Ce que l'emploi du temps prend en compte (DG, 28/10/2026 : « l'emploi du temps affiché doit
 * prendre en compte les vraies données ») : les chiffres d'aujourd'hui, et s'il est à jour.
 */
function PrisEnCompte({ d }: { d: ReponseEdt }) {
  const r = d.reglages;
  const e = d.emploi;
  const ens = d.enseignants ?? [];
  const classes = d.classes ?? [];
  const programme = classes.reduce((t, c) => t + (d.programme?.[c.niveau] ?? []).reduce((u, p) => u + Math.round(p.heures), 0), 0);
  const avecPlages = ens.filter((x) => x.plages?.length);
  const sansMatiere = ens.filter((x) => !x.matiere);
  const aJour = e && !d.aRegenerer?.length;
  const ligne = (titre: string, valeur: ReactNode, detail?: ReactNode) => (
    <div className="rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200">
      <div className="text-[11px] text-zinc-500">{titre}</div>
      <div className="text-[13px] font-semibold">{valeur}</div>
      {detail && <div className="text-[11px] text-zinc-500">{detail}</div>}
    </div>
  );
  return (
    <div className="mb-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] font-medium text-zinc-600">
        Ce que l’emploi du temps prend en compte
        {e ? (
          aJour ? (
            <Badge ton="vert">À jour : généré le {new Date(e.genereLe).toLocaleDateString("fr-FR")} à {new Date(e.genereLe).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Badge>
          ) : (
            <Badge ton="jaune">Pas à jour : ces données ont changé depuis la génération</Badge>
          )
        ) : (
          <Badge ton="gris">Pas encore généré</Badge>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {ligne(`Classes ouvertes (${d.annee})`, classes.length, "onglet « Classes » de l’école")}
        {ligne("Programme de ces classes", `${programme} h par semaine`, "Référentiels › Programmes")}
        {ligne("Enseignants en poste", ens.length, sansMatiere.length ? <span className="text-rouge-600">{sansMatiere.length} sans matière reconnue : aucune heure</span> : "tous avec leur matière")}
        {ligne(
          "Plages horaires saisies",
          avecPlages.length ? `${avecPlages.reduce((t, x) => t + (x.plages ?? []).reduce((n, p) => n + heuresPlage(p, r.creneaux), 0), 0)} h · ${avecPlages.length} enseignant(s)` : "aucune",
          avecPlages.length ? "placées telles quelles" : "tout est réparti automatiquement",
        )}
        {ligne("Semaine de l’école", `${r.jours.length} jours · ${r.creneaux.length} créneaux`, `${r.heuresEnseignant} h au plus par enseignant · ${r.propres ? "réglages de l’école" : "réglages généraux"}`)}
      </div>
    </div>
  );
}

/**
 * Plages horaires des enseignants (DG, 28/10/2026) : l'emploi du temps de chaque enseignant tel que
 * l'école le fait, créneau par créneau — dans chaque case de sa semaine, la classe où il fait cours
 * (le lundi 07:30-08:25 en 6ème 1, le mardi 10:30-11:25 en 5ème 2…), dans sa matière. L'emploi du
 * temps reprend ces plages telles quelles et n'ajoute rien à cet enseignant ; il est regénéré à
 * l'enregistrement. Sans plages, l'enseignant est réparti automatiquement, dans ses jours et heures.
 */
function ModalePlagesEnseignants({
  ecole,
  r,
  enseignants,
  classes,
  programme,
  fermer,
  apres,
}: {
  ecole: number;
  r: ReponseEdt["reglages"];
  enseignants: NonNullable<ReponseEdt["enseignants"]>;
  classes: NonNullable<ReponseEdt["classes"]>;
  programme: NonNullable<ReponseEdt["programme"]>;
  fermer: () => void;
  apres: () => void;
}) {
  const [choisi, setChoisi] = useState<number | null>(null);
  /** Les plages de l'enseignant ouvert, à leurs heures (celles d'un créneau, ou les siennes). */
  const [liste, setListe] = useState<{ cle: number; classeId: number; jour: number; debut: string; fin: string }[]>([]);
  const [lignes, setLignes] = useState<Record<number, { travaille: boolean; debut: string; fin: string }>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const prof = enseignants.find((x) => x.id === choisi) ?? null;
  const nomClasse = (id: number) => classes.find((c) => c.id === id)?.nom ?? "classe fermée";
  const heuresProgramme = (classeId: number, matiere: string | null) => {
    const c = classes.find((x) => x.id === classeId);
    return matiere && c ? Math.round(programme[c.niveau]?.find((p) => p.matiere === matiere)?.heures ?? 0) : 0;
  };
  // Les plages des collègues (leurs heures) : une classe ne peut pas avoir deux cours qui se chevauchent
  const collegues = useMemo(() => enseignants.filter((x) => x.id !== choisi).flatMap((x) => (x.plages ?? []).map((p) => ({ ...p, nom: x.nom }))), [enseignants, choisi]);
  const occupant = (classeId: number, p: { jour: number; debut: string; fin: string }) => collegues.find((q) => q.classeId === classeId && q.jour === p.jour && seChevauchent(q, p));
  const resume = (x: (typeof enseignants)[number]) => {
    const parClasse = new Map<number, number>();
    for (const p of x.plages ?? []) parClasse.set(p.classeId, (parClasse.get(p.classeId) ?? 0) + heuresPlage(p, r.creneaux));
    return [...parClasse].map(([id, n]) => `${nomClasse(id)} (${n} h)`).join(", ");
  };
  const ouvrir = (id: number) => {
    const x = enseignants.find((y) => y.id === id);
    setErreur(null);
    setChoisi(id);
    setListe((x?.plages ?? []).map((p, i) => ({ cle: i + 1, ...p })));
    const vide = !x?.jours || !Object.keys(x.jours).length;
    setLignes(
      Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((j) => {
          const h = x?.jours?.[String(j)];
          return [j, { travaille: vide ? r.jours.includes(j) : !!h, debut: h?.debut ?? "", fin: h?.fin ?? "" }];
        }),
      ),
    );
  };
  // Ligne de la grille d'une plage : le créneau où elle commence ; sinon « autres heures »
  const ligneDe = (debut: string) => r.creneaux.findIndex((c) => debut >= c.debut && debut < c.fin);
  const saisies = liste.filter((p) => p.classeId);
  const maj = (cle: number, v: Partial<(typeof liste)[number]>) => setListe((l) => l.map((p) => (p.cle === cle ? { ...p, ...v } : p)));
  const retirer = (cle: number) => setListe((l) => l.filter((p) => p.cle !== cle));
  const ajouter = (p: Omit<(typeof liste)[number], "cle">) => setListe((l) => [...l, { ...p, cle: Math.max(0, ...l.map((x) => x.cle)) + 1 }]);
  /** Ce qui ne va pas dans une plage : heures, chevauchement avec ses autres cours, ou avec un collègue dans la classe. */
  const probleme = (p: (typeof liste)[number]) => {
    if (!p.debut || !p.fin) return "heures à écrire";
    if (p.fin <= p.debut) return "la fin doit être après le début";
    if (!p.classeId) return null;
    const lui = saisies.find((q) => q.cle !== p.cle && q.jour === p.jour && seChevauchent(q, p));
    if (lui) return `chevauche son cours de ${lui.debut} à ${lui.fin} (${nomClasse(lui.classeId)})`;
    const autre = occupant(p.classeId, p);
    if (autre) return `${nomClasse(p.classeId)} : déjà cours avec ${autre.nom} de ${autre.debut} à ${autre.fin}`;
    return null;
  };
  const problemes = saisies.filter((p) => probleme(p));
  // Heures saisies pour lui, par classe, face au programme de sa matière
  const parClasse = new Map<number, number>();
  for (const p of saisies) parClasse.set(p.classeId, (parClasse.get(p.classeId) ?? 0) + heuresPlage(p, r.creneaux));
  const total = [...parClasse.values()].reduce((a, b) => a + b, 0);

  async function enregistrer() {
    if (!prof) return;
    setErreur(null);
    setEnvoi(true);
    try {
      if (problemes.length) throw new Error(`Corrigez d’abord ce qui est en rouge : ${problemes.map((p) => `${NOMS_JOURS[p.jour]} ${p.debut}-${p.fin} (${probleme(p)})`).join(" ; ")}.`);
      const plages = saisies.map((p) => ({ classeId: p.classeId, jour: p.jour, debut: p.debut, fin: p.fin }));
      // Sans plages : ses jours et heures de disponibilité (répartition automatique, Présence)
      if (!plages.length) {
        const faux = [1, 2, 3, 4, 5, 6].find((j) => lignes[j].travaille && lignes[j].debut && lignes[j].fin && lignes[j].fin <= lignes[j].debut);
        if (faux) throw new Error(`${NOMS_JOURS[faux]} : l’heure de départ doit être après l’heure d’arrivée.`);
        await api.put(`/presence/horaires/${prof.id}`, {
          structureId: ecole,
          jours: Object.fromEntries([1, 2, 3, 4, 5, 6].filter((j) => lignes[j].travaille).map((j) => [String(j), { debut: lignes[j].debut || null, fin: lignes[j].fin || null }])),
        });
      }
      // Les plages, puis l'emploi du temps regénéré par le serveur
      await api.put(`/etablissements/${ecole}/emploi-du-temps/enseignants/${prof.id}/plages`, { plages });
      apres();
      setChoisi(null);
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={prof ? `Plages horaires de ${prof.nom}` : "Plages horaires des enseignants"} ouverte fermer={fermer} large>
      {!prof ? (
        <>
          <p className="mb-3 text-[13px] text-zinc-600">
            Pour chaque enseignant, saisissez son emploi du temps comme l’école le fait : dans chaque case de sa semaine, la classe où il fait cours. L’emploi du temps reprend ces plages telles
            quelles, n’ajoute rien à cet enseignant, et complète le reste du programme avec les enseignants sans plages. Il est regénéré à chaque enregistrement.
          </p>
          {!enseignants.length ? (
            <Vide>Aucun enseignant en poste rattaché à l’école.</Vide>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Tableau>
                <thead>
                  <tr>
                    <th>Enseignant</th>
                    <th>Matière</th>
                    <th>Plages horaires</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {enseignants.map((x) => (
                    <tr key={x.id}>
                      <td className="text-[12px] font-medium">{x.nom}</td>
                      <td className={cx("text-[12px]", !x.matiere && "text-rouge-600")}>{x.matiereLibelle ?? "matière à choisir (onglet Personnel)"}</td>
                      <td className="text-[12px]">
                        {x.plages?.length ? (
                          <>
                            <strong>{x.plages.reduce((n, p) => n + heuresPlage(p, r.creneaux), 0)} h</strong> · {resume(x)}
                          </>
                        ) : (
                          <span className="text-zinc-400">aucune : réparti automatiquement ({resumeJours(x.jours)})</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Bouton variante="discret" onClick={() => ouvrir(x.id)}>
                          Saisir ses plages
                        </Bouton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Bouton onClick={fermer}>Fermer</Bouton>
          </div>
        </>
      ) : (
        <>
          {!prof.matiere ? (
            <Alerte>
              Sa matière n’est pas connue (spécialité de sa fiche : « {prof.specialite ?? "vide"} »). Choisissez-la dans l’onglet « Personnel » de l’école : ses plages se saisissent dans sa matière.
            </Alerte>
          ) : (
            <>
              <p className="mb-2 text-[13px] text-zinc-600">
                Matière : <strong>{prof.matiereLibelle}</strong>. Dans chaque case, choisissez la classe où il fait cours (vide : pas de cours). Les heures sont celles du créneau : changez-les si son
                cours commence ou finit à une autre heure (ex. 07:00–08:00). Un cours en dehors des créneaux se met dans « Autres heures ». Ce qui chevauche un autre de ses cours, ou le cours
                d’un collègue dans la même classe, s’affiche en rouge.
              </p>
              {!classes.length ? (
                <Vide>Aucune classe ouverte cette année : ouvrez d’abord les classes de l’école.</Vide>
              ) : (
                <div className="max-h-[52vh] overflow-auto">
                  <table className="w-full table-fixed border-collapse text-[12px]">
                    <thead>
                      <tr>
                        <th className="w-20 border border-zinc-300 bg-zinc-50 px-1 py-1">Heure</th>
                        {r.jours.map((j) => (
                          <th key={j} className="border border-zinc-300 bg-zinc-50 px-1 py-1">
                            {NOMS_JOURS[j]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.creneaux.map((c, i) => (
                        <tr key={c.debut}>
                          <td className="border border-zinc-300 px-1 py-1 text-center tabular-nums text-zinc-600">
                            {c.debut}
                            <br />
                            {c.fin}
                          </td>
                          {r.jours.map((j) => {
                            const ici = liste.filter((p) => p.jour === j && ligneDe(p.debut) === i);
                            return (
                              <td key={j} className={cx("border border-zinc-300 p-0.5 align-top", ici.some((p) => p.classeId) ? "bg-marque-50" : "")}>
                                {ici.length ? (
                                  ici.map((p) => <CasePlage key={p.cle} p={p} classes={classes} occupant={occupant} probleme={probleme(p)} maj={(v) => maj(p.cle, v)} retirer={() => retirer(p.cle)} />)
                                ) : saisies.some((p) => p.jour === j && seChevauchent(p, c)) ? (
                                  // Un cours long commencé plus tôt occupe aussi ce créneau
                                  (() => {
                                    const q = saisies.find((p) => p.jour === j && seChevauchent(p, c))!;
                                    return (
                                      <div className="px-1 py-1.5 text-[11px] text-marque-800 italic">
                                        suite : {nomClasse(q.classeId)} ({q.debut}–{q.fin})
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <select
                                    aria-label={`${NOMS_JOURS[j]} ${c.debut}-${c.fin}`}
                                    value=""
                                    onChange={(e) => Number(e.target.value) && ajouter({ classeId: Number(e.target.value), jour: j, debut: c.debut, fin: c.fin })}
                                    className="w-full rounded-md bg-transparent px-1 py-1.5 text-[12px] text-zinc-400 outline-none focus:ring-2 focus:ring-marque-300"
                                  >
                                    <option value="">—</option>
                                    {classes.map((cl) => {
                                      const qui = occupant(cl.id, { jour: j, debut: c.debut, fin: c.fin });
                                      return (
                                        <option key={cl.id} value={cl.id} disabled={!!qui}>
                                          {cl.nom}
                                          {qui ? ` (prise : ${qui.nom} ${qui.debut}–${qui.fin})` : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* Cours en dehors des créneaux de l'école (avant le premier, à la pause, après le dernier) */}
                      <tr>
                        <td className="border border-zinc-300 px-1 py-1 text-center text-[11px] text-zinc-600">Autres heures</td>
                        {r.jours.map((j) => (
                          <td key={j} className="border border-zinc-300 p-0.5 align-top">
                            {liste
                              .filter((p) => p.jour === j && ligneDe(p.debut) < 0)
                              .map((p) => (
                                <CasePlage key={p.cle} p={p} classes={classes} occupant={occupant} probleme={probleme(p)} maj={(v) => maj(p.cle, v)} retirer={() => retirer(p.cle)} />
                              ))}
                            <button type="button" className="w-full rounded-md px-1 py-1 text-[11px] font-medium text-marque-700 hover:bg-marque-50" onClick={() => ajouter({ classeId: 0, jour: j, debut: "", fin: "" })}>
                              + un cours
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                <Badge ton={total > r.heuresEnseignant ? "rouge" : total ? "vert" : "gris"}>
                  {total} h par semaine{total > r.heuresEnseignant ? ` : plus que les ${r.heuresEnseignant} h d’un enseignant` : ""}
                </Badge>
                {!!problemes.length && <Badge ton="rouge">{problemes.length} cours à corriger (en rouge)</Badge>}
                {[...parClasse].map(([id, n]) => {
                  const prevu = heuresProgramme(id, prof.matiere ?? null);
                  return (
                    <Badge key={id} ton={n === prevu ? "vert" : n > prevu ? "rouge" : "jaune"}>
                      {nomClasse(id)} : {n} h sur {prevu} h au programme
                    </Badge>
                  );
                })}
                {!!saisies.length && (
                  <button type="button" className="ml-auto font-medium text-rouge-700 underline" onClick={() => setListe([])}>
                    Vider ses plages (retour à la répartition automatique)
                  </button>
                )}
              </div>
            </>
          )}
          {!saisies.length && (
            <details className="mt-4 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
              <summary className="cursor-pointer text-[13px] font-medium">Sans plages : ses jours et heures de disponibilité (répartition automatique et Présence)</summary>
              <p className="my-2 text-[12px] text-zinc-500">Le système lui donne des heures dans sa matière, seulement ces jours-là, entre ces heures ; vides : toute la journée.</p>
              <Tableau>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((j) => {
                    const l = lignes[j];
                    if (!l) return null;
                    const maj = (v: Partial<typeof l>) => setLignes((x) => ({ ...x, [j]: { ...x[j], ...v } }));
                    return (
                      <tr key={j} className={l.travaille ? "" : "text-zinc-400"}>
                        <td>
                          <label className="flex items-center gap-2 font-medium">
                            <input type="checkbox" className="size-4 accent-marque-600" checked={l.travaille} onChange={(e) => maj({ travaille: e.target.checked })} />
                            {NOMS_JOURS[j]}
                            {!r.jours.includes(j) && <span className="text-[11px] font-normal text-or-700">(pas un jour de cours)</span>}
                          </label>
                        </td>
                        <td>
                          <Saisie type="time" className="w-28" disabled={!l.travaille} value={l.debut} onChange={(e) => maj({ debut: e.target.value })} aria-label={`${NOMS_JOURS[j]} : arrivée`} />
                        </td>
                        <td>
                          <Saisie type="time" className="w-28" disabled={!l.travaille} value={l.fin} onChange={(e) => maj({ fin: e.target.value })} aria-label={`${NOMS_JOURS[j]} : départ`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
            </details>
          )}
          {erreur && (
            <div className="mt-3">
              <Alerte>{erreur}</Alerte>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Bouton onClick={() => setChoisi(null)}>Retour à la liste</Bouton>
            <Bouton variante="principal" chargement={envoi} disabled={!prof.matiere && !!saisies.length} onClick={enregistrer}>
              Enregistrer et regénérer l’emploi du temps
            </Bouton>
          </div>
        </>
      )}
    </Modale>
  );
}
