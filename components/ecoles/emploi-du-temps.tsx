"use client";

import { CalendarRange, Printer, RefreshCw, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Alerte, Badge, Bouton, Carte, Chargement, Liste, Segments, Tableau, Vide, cx, useConfirmation } from "@/components/ui";
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
  reglages: { jours: number[]; creneaux: Creneau[]; heuresEnseignant: number };
  emploi: EmploiDuTemps | null;
  /** Ce qui a changé depuis la génération (classes, enseignants, matières, quotas) : à regénérer. */
  aRegenerer?: string[];
}

export const NOMS_JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** Couleur stable par matière : on reconnaît d'un coup d'œil le français, les maths… */
const TEINTES = ["bg-sky-50 text-sky-900", "bg-amber-50 text-amber-900", "bg-emerald-50 text-emerald-900", "bg-rose-50 text-rose-900", "bg-violet-50 text-violet-900", "bg-lime-50 text-lime-900", "bg-orange-50 text-orange-900", "bg-cyan-50 text-cyan-900", "bg-fuchsia-50 text-fuchsia-900", "bg-teal-50 text-teal-900"];
const teinte = (m: string) => TEINTES[[...m].reduce((s, c) => s + c.charCodeAt(0), 0) % TEINTES.length];

/**
 * La grille d'une semaine : les créneaux en lignes, les jours en colonnes ; dans chaque case, la
 * matière et l'enseignant (emploi du temps d'une classe) ou la matière et la classe (d'un enseignant).
 */
export function GrilleEdt({ e, seances, vue, impression }: { e: Pick<EmploiDuTemps, "jours" | "creneaux">; seances: Seance[]; vue: "classe" | "enseignant"; impression?: boolean }) {
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
              return (
                <td key={j} className={cx("border border-zinc-300 px-1 py-1 align-top", s && !impression && teinte(s.matiere))}>
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
  const e = d.donnees?.emploi ?? null;
  const classes = useMemo(() => [...new Map((e?.seances ?? []).map((s) => [s.classeId, s.classe])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr", { numeric: true })), [e]);
  const enseignants = useMemo(() => (e?.charges ?? []).filter((c) => c.heures > 0), [e]);
  const courant = vue === "classe" ? (choix || String(classes[0]?.[0] ?? "")) : choix || String(enseignants[0]?.agentId ?? "");
  const seances = (e?.seances ?? []).filter((s) => (vue === "classe" ? String(s.classeId) === courant : String(s.agentId) === courant));
  // Les heures placées sans enseignant ne comptent pas comme assurées
  const avecEnseignant = (e?.seances ?? []).filter((s) => s.agentId).length;
  const sansEnseignant = (e?.seances.length ?? 0) - avecEnseignant;

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
            <Bouton variante={e ? "secondaire" : "principal"} chargement={envoi} onClick={generer}>
              {e ? <RefreshCw /> : <CalendarRange />} {e ? "Regénérer" : "Générer l’emploi du temps"}
            </Bouton>
          )
        }
      >
        <p className="-mt-2 mb-3 text-[12px] leading-relaxed text-zinc-500">
          Le système répartit les heures du programme de chaque classe entre les enseignants de la matière (au plus {r.heuresEnseignant} h chacun), puis place chaque heure sur la semaine : jamais
          deux cours en même temps pour une classe, un enseignant ou une salle ; les jours et heures de travail de chaque enseignant respectés ; la vague A le matin, la vague B l’après-midi ; deux
          heures d’une matière par jour au plus. {r.jours.length} jours, {r.creneaux.length} créneaux par jour (Administration › Paramètres).
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

      {e && !!e.nonPlaces.length && (
        <Carte titre={`À régler (${e.nonPlaces.length})`}>
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
          <div className="overflow-x-auto">
            <GrilleEdt e={e} seances={seances} vue={vue} />
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
