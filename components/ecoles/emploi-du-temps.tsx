"use client";

import { CalendarDays, CalendarRange, Printer, RefreshCw, Settings2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
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
  enseignants?: { id: number; nom: string; specialite: string | null; jours: Record<string, { debut: string | null; fin: string | null }> | null }[];
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
                    <div className="leading-tight">
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
              <Bouton variante="discret" onClick={() => setJoursProfs(true)} title="Les jours et heures où chaque enseignant peut avoir cours">
                <CalendarDays className="size-4" /> Jours des enseignants
              </Bouton>
              <Bouton variante={e ? "secondaire" : "principal"} chargement={envoi} onClick={generer}>
                {e ? <RefreshCw /> : <CalendarRange />} {e ? "Regénérer" : "Générer l’emploi du temps"}
              </Bouton>
            </span>
          )
        }
      >
        <p className="-mt-2 mb-3 text-[12px] leading-relaxed text-zinc-500">
          Le système répartit les heures du programme de chaque classe entre les enseignants de la matière (au plus {r.heuresEnseignant} h chacun), puis place chaque heure sur la semaine : jamais
          deux cours en même temps pour une classe, un enseignant ou une salle ; les jours et heures de travail de chaque enseignant respectés ; la vague A le matin, la vague B l’après-midi ; deux
          heures d’une matière par jour au plus. {r.jours.length} jours ({r.jours.map((j) => NOMS_JOURS[j].toLowerCase()).join(", ")}), {r.creneaux.length} créneaux par jour,{" "}
          {r.heuresEnseignant} h au plus par enseignant : {r.propres ? <strong>réglages propres à cette école</strong> : "réglages généraux (Administration › Paramètres), modifiables pour cette école avec « Réglages de l’école »"}.
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
      {joursProfs && d.donnees && <ModaleJoursEnseignants ecole={ecole} jours={r.jours} enseignants={d.donnees.enseignants ?? []} fermer={() => setJoursProfs(false)} apres={() => d.recharger()} />}

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
 * Jours et heures de travail de chaque enseignant, réglés depuis l'école (DG, 28/10/2026) : un
 * professeur peut venir le lundi de 9 h à 12 h, le mardi de 7 h à 9 h, le jeudi toute la journée…
 * L'emploi du temps ne lui donne cours que dans ces heures ; ce sont aussi ses jours dans Présence.
 */
function ModaleJoursEnseignants({
  ecole,
  jours,
  enseignants,
  fermer,
  apres,
}: {
  ecole: number;
  jours: number[];
  enseignants: NonNullable<ReponseEdt["enseignants"]>;
  fermer: () => void;
  apres: () => void;
}) {
  type Jour = { travaille: boolean; debut: string; fin: string };
  const versLignes = (x: JoursTravail): Record<number, Jour> =>
    Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((j) => {
        const vide = !x || !Object.keys(x).length;
        const h = x?.[String(j)];
        return [j, { travaille: vide ? jours.includes(j) : !!h, debut: h?.debut ?? "", fin: h?.fin ?? "" }];
      }),
    );
  const [choisi, setChoisi] = useState<number | null>(null);
  const [lignes, setLignes] = useState<Record<number, Jour>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const prof = enseignants.find((x) => x.id === choisi) ?? null;
  const maj = (j: number, v: Partial<Jour>) => setLignes((l) => ({ ...l, [j]: { ...l[j], ...v } }));
  const ouvrir = (id: number) => {
    setErreur(null);
    setChoisi(id);
    setLignes(versLignes(enseignants.find((x) => x.id === id)?.jours ?? null));
  };
  // Les mêmes heures pour tous les jours cochés (le cas le plus courant), à partir du premier jour rempli
  const recopier = () => {
    const modele = [1, 2, 3, 4, 5, 6].map((j) => lignes[j]).find((l) => l.travaille && (l.debut || l.fin));
    if (!modele) return;
    setLignes((l) => Object.fromEntries(Object.entries(l).map(([j, x]) => [j, x.travaille ? { ...x, debut: modele.debut, fin: modele.fin } : x])));
  };
  async function enregistrer() {
    if (!prof) return;
    setErreur(null);
    const faux = [1, 2, 3, 4, 5, 6].find((j) => lignes[j].travaille && lignes[j].debut && lignes[j].fin && lignes[j].fin <= lignes[j].debut);
    if (faux) return setErreur(`${NOMS_JOURS[faux]} : l’heure de départ doit être après l’heure d’arrivée.`);
    if (![1, 2, 3, 4, 5, 6].some((j) => lignes[j].travaille)) return setErreur("Cochez au moins un jour de travail.");
    setEnvoi(true);
    try {
      await api.put(`/presence/horaires/${prof.id}`, {
        structureId: ecole,
        jours: Object.fromEntries(
          [1, 2, 3, 4, 5, 6].filter((j) => lignes[j].travaille).map((j) => [String(j), { debut: lignes[j].debut || null, fin: lignes[j].fin || null }]),
        ),
      });
      apres();
      setChoisi(null);
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Modale titre={prof ? `Jours et heures de ${prof.nom}` : "Jours et heures des enseignants"} ouverte fermer={fermer} large>
      {!prof ? (
        <>
          <p className="mb-3 text-[13px] text-zinc-600">
            Pour chaque enseignant, les jours où il vient et, chaque jour, ses heures (par exemple le lundi de 9 h à 12 h, le mardi de 7 h à 9 h). L’emploi du temps ne lui donne cours que dans ces
            heures, à la prochaine génération ; ce sont aussi ses jours de travail dans Présence. Sans réglage : tous les jours de cours, toute la journée.
          </p>
          {!enseignants.length ? (
            <Vide>Aucun enseignant en poste rattaché à l’école.</Vide>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Tableau>
                <thead>
                  <tr>
                    <th>Enseignant</th>
                    <th>Jours et heures de travail</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {enseignants.map((x) => (
                    <tr key={x.id}>
                      <td className="text-[12px]">
                        <div className="font-medium">{x.nom}</div>
                        <div className="text-[11px] text-zinc-400">{x.specialite ?? "matière à choisir"}</div>
                      </td>
                      <td className={cx("text-[12px]", !x.jours || !Object.keys(x.jours).length ? "text-zinc-400" : "")}>{resumeJours(x.jours)}</td>
                      <td className="text-right">
                        <Bouton variante="discret" onClick={() => ouvrir(x.id)}>
                          Régler
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
          <p className="mb-3 text-[13px] text-zinc-600">Cochez les jours où il vient. Pour chacun, l’heure d’arrivée et l’heure de départ ; vides : toute la journée.</p>
          <Tableau>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Arrivée</th>
                <th>Départ</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((j) => {
                const l = lignes[j];
                return (
                  <tr key={j} className={l.travaille ? "" : "text-zinc-400"}>
                    <td>
                      <label className="flex items-center gap-2 font-medium">
                        <input type="checkbox" className="size-4 accent-marque-600" checked={l.travaille} onChange={(e) => maj(j, { travaille: e.target.checked })} />
                        {NOMS_JOURS[j]}
                        {!jours.includes(j) && <span className="text-[11px] font-normal text-or-700">(pas un jour de cours de l’école)</span>}
                      </label>
                    </td>
                    <td>
                      <Saisie type="time" className="w-32" disabled={!l.travaille} value={l.debut} onChange={(e) => maj(j, { debut: e.target.value })} aria-label={`${NOMS_JOURS[j]} : arrivée`} />
                    </td>
                    <td>
                      <Saisie type="time" className="w-32" disabled={!l.travaille} value={l.fin} onChange={(e) => maj(j, { fin: e.target.value })} aria-label={`${NOMS_JOURS[j]} : départ`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
          <button type="button" className="mt-2 text-[12px] font-medium text-marque-700 underline" onClick={recopier}>
            Mettre les mêmes heures à tous les jours cochés
          </button>
          {erreur && (
            <div className="mt-3">
              <Alerte>{erreur}</Alerte>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Bouton onClick={() => setChoisi(null)}>Retour à la liste</Bouton>
            <Bouton variante="principal" chargement={envoi} onClick={enregistrer}>
              Enregistrer
            </Bouton>
          </div>
        </>
      )}
    </Modale>
  );
}
