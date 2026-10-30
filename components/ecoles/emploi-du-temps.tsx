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
  creneau: number;
  /** Plage saisie par l'école (sinon placée par le système). */
  fixe?: boolean;
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
              const absent = vue === "enseignant" && joursTravail !== undefined && !s && !estDisponible(joursTravail, j, c);
              return (
                <td
                  key={j}
                  className={cx("border border-zinc-300 px-1 py-1 align-top", s && !impression && teinte(s.matiere), absent && "bg-zinc-200/70 text-center align-middle text-zinc-400")}
                  title={absent ? "Pas de travail à cette heure (jours et heures de l’enseignant)" : undefined}
                >
                  {absent && <span className={impression ? "text-[7pt]" : "text-[10px]"}>—</span>}
                  {s && (
                    <div className="relative leading-tight" title={s.fixe ? "Plage horaire saisie par l’école" : undefined}>
                      {s.fixe && !impression && <span className="absolute -top-0.5 right-0 size-1.5 rounded-full bg-marque-600" aria-label="Plage saisie par l’école" />}
                      <div className="font-semibold">{s.matiereLibelle}</div>
                      <div className={cx(impression ? "" : "text-[11px]", !s.agent && vue === "classe" && "font-medium text-rouge-600")}>{vue === "classe" ? (s.agent ?? "à pourvoir") : s.classe}</div>
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
          avecPlages.length ? `${avecPlages.reduce((t, x) => t + (x.plages?.length ?? 0), 0)} h · ${avecPlages.length} enseignant(s)` : "aucune",
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
  /** La semaine de l'enseignant ouvert : « jour:début » → classe. */
  const [grille, setGrille] = useState<Record<string, number>>({});
  const [lignes, setLignes] = useState<Record<number, { travaille: boolean; debut: string; fin: string }>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const prof = enseignants.find((x) => x.id === choisi) ?? null;
  const nomClasse = (id: number) => classes.find((c) => c.id === id)?.nom ?? "classe fermée";
  const heuresProgramme = (classeId: number, matiere: string | null) => {
    const c = classes.find((x) => x.id === classeId);
    return matiere && c ? Math.round(programme[c.niveau]?.find((p) => p.matiere === matiere)?.heures ?? 0) : 0;
  };
  // Les classes déjà prises par un collègue, créneau par créneau : « jour:début:classe » → son nom
  const prises = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of enseignants) if (x.id !== choisi) for (const p of x.plages ?? []) m.set(`${p.jour}:${p.debut}:${p.classeId}`, x.nom);
    return m;
  }, [enseignants, choisi]);
  const resume = (x: (typeof enseignants)[number]) => {
    const parClasse = new Map<number, number>();
    for (const p of x.plages ?? []) parClasse.set(p.classeId, (parClasse.get(p.classeId) ?? 0) + 1);
    return [...parClasse].map(([id, n]) => `${nomClasse(id)} (${n} h)`).join(", ");
  };
  const ouvrir = (id: number) => {
    const x = enseignants.find((y) => y.id === id);
    setErreur(null);
    setChoisi(id);
    setGrille(Object.fromEntries((x?.plages ?? []).map((p) => [`${p.jour}:${p.debut}`, p.classeId])));
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
  const saisies = Object.entries(grille).filter(([, c]) => c);
  // Heures saisies pour lui, par classe, face au programme de sa matière
  const parClasse = new Map<number, number>();
  for (const [, c] of saisies) parClasse.set(c, (parClasse.get(c) ?? 0) + 1);

  async function enregistrer() {
    if (!prof) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const plages = saisies.map(([k, classeId]) => {
        const [jour, debut] = k.split(/:(.+)/);
        return { classeId, jour: Number(jour), debut, fin: r.creneaux.find((c) => c.debut === debut)?.fin ?? "" };
      });
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
                            <strong>{x.plages.length} h</strong> · {resume(x)}
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
                Matière : <strong>{prof.matiereLibelle}</strong>. Dans chaque case, choisissez la classe où il fait cours (vide : pas de cours). Une classe déjà prise par un collègue à cette heure
                est indiquée et ne peut pas être choisie.
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
                      {r.creneaux.map((c) => (
                        <tr key={c.debut}>
                          <td className="border border-zinc-300 px-1 py-1 text-center tabular-nums text-zinc-600">
                            {c.debut}
                            <br />
                            {c.fin}
                          </td>
                          {r.jours.map((j) => {
                            const k = `${j}:${c.debut}`;
                            const v = grille[k] ?? 0;
                            return (
                              <td key={j} className={cx("border border-zinc-300 p-0.5", v ? "bg-marque-50" : "")}>
                                <select
                                  aria-label={`${NOMS_JOURS[j]} ${c.debut}-${c.fin}`}
                                  value={v || ""}
                                  onChange={(e) => setGrille((g) => ({ ...g, [k]: Number(e.target.value) || 0 }))}
                                  className={cx("w-full rounded-md bg-transparent px-1 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-marque-300", v ? "font-semibold text-marque-800" : "text-zinc-400")}
                                >
                                  <option value="">—</option>
                                  {classes.map((cl) => {
                                    const qui = prises.get(`${j}:${c.debut}:${cl.id}`);
                                    return (
                                      <option key={cl.id} value={cl.id} disabled={!!qui}>
                                        {cl.nom}
                                        {qui ? ` (prise : ${qui})` : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                <Badge ton={saisies.length > r.heuresEnseignant ? "rouge" : saisies.length ? "vert" : "gris"}>
                  {saisies.length} h par semaine{saisies.length > r.heuresEnseignant ? ` : plus que les ${r.heuresEnseignant} h d’un enseignant` : ""}
                </Badge>
                {[...parClasse].map(([id, n]) => {
                  const prevu = heuresProgramme(id, prof.matiere ?? null);
                  return (
                    <Badge key={id} ton={n === prevu ? "vert" : n > prevu ? "rouge" : "jaune"}>
                      {nomClasse(id)} : {n} h sur {prevu} h au programme
                    </Badge>
                  );
                })}
                {!!saisies.length && (
                  <button type="button" className="ml-auto font-medium text-rouge-700 underline" onClick={() => setGrille({})}>
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
