"use client";

import { CalendarClock, ChevronLeft, ChevronRight, Clock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChoixStructure, type StructureCourte } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { CYCLE_PRESENCE, STATUTS_PRESENCE } from "@/lib/ecoles";

interface Semaine {
  structure: { id: number; nom: string };
  lundi: string;
  dates: string[];
  jours: string[];
  aujourdhui: string;
  agents: {
    id: number;
    nomComplet: string;
    fonction: string | null;
    horaire: Record<string, { debut: string | null; fin: string | null }> | null;
    attendus: boolean[];
    saisies: Record<string, { statut: string; motif: string | null; arrivee: string | null; depart: string | null; retard: number | null }>;
    bilan: Bilan;
  }[];
  manquantes: number;
  /** Semaine validée ou terminée : ses alertes sont calculées. */
  finie: boolean;
  alertes: number;
  validee: { par: string | null; le: string } | null;
}
interface AlertePresence {
  code: "JOURS" | "HEURES" | "DEUX_SEMAINES";
  texte: string;
}
interface Bilan {
  joursAttendus: number;
  joursAbsent: number;
  minutesPrevues: number | null;
  minutesFaites: number | null;
  minutesRetard: number;
  alertes: AlertePresence[];
}
interface Rapport {
  du: string;
  au: string;
  semainesDues: string[];
  taux: number | null;
  sansPointage: number;
  structures: {
    id: number;
    nom: string;
    type: string;
    departement: string | null;
    agents: number;
    presents: number;
    retards: number;
    justifies: number;
    absents: number;
    pointages: number;
    taux: number | null;
    semainesNonValidees: string[];
  }[];
  absents: { agentId: number; nomComplet: string; structure: string; absences: number }[];
  /** Alertes de fin de semaine (semaines validées de la période). */
  alertes: { agentId: number; nomComplet: string; structure: string; lundi: string; alertes: AlertePresence[] }[];
}

/** 465 → « 7 h 45 ». */
const heures = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
};

const dateFr = (d: string) => d.split("-").reverse().join("/");
const jourCourt = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
const decaler = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/**
 * Présence du personnel : le chef de structure pointe ses agents (chaque jour, ou en fin de semaine
 * sur sa fiche de présence) puis valide la semaine ; le rapport montre les absences et les
 * structures dont le chef n'a pas pointé.
 */
export default function Presence() {
  const { profil } = useSession();
  const chef = profil.role === "STRUCTURE";
  const [vue, setVue] = useState<"pointage" | "rapport">("pointage");
  return (
    <div className="space-y-5">
      <EnTete
        titre="Présence du personnel"
        sousTitre="Chaque agent a ses jours et heures de travail. Le chef de structure pointe depuis son téléphone ou son ordinateur, chaque jour ou en fin de semaine, puis valide la semaine. Une semaine non validée se voit dans le rapport."
      />
      <Segments
        valeur={vue}
        changer={setVue}
        options={[
          { valeur: "pointage", libelle: "Pointage de la semaine" },
          { valeur: "rapport", libelle: chef ? "Bilan de ma structure" : "Rapport" },
        ]}
      />
      {vue === "pointage" ? <Pointage /> : <RapportPresence />}
    </div>
  );
}

const parametre = (k: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(k));

function Pointage() {
  const { profil } = useSession();
  const chef = profil.role === "STRUCTURE";
  const structures = useApi<StructureCourte[]>(chef ? null : "/recensement/structures");
  // « ?structure=…&date=… » : ouverte depuis une alerte de présence, sur la semaine de l'agent
  const [structure, setStructure] = useState(() => (chef ? String(profil.structureId ?? "") : (parametre("structure") ?? "")));
  const [date, setDate] = useState(() => parametre("date") ?? "");
  const s = useApi<Semaine>(structure ? `/presence/semaine?structure=${structure}${date ? `&date=${date}` : ""}` : null);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [horaire, setHoraire] = useState<Semaine["agents"][number] | null>(null);
  const [heuresDe, setHeuresDe] = useState<Semaine["agents"][number] | null>(null);
  const cle = (a: number, d: string) => `${a}|${d}`;
  const valeur = (a: Semaine["agents"][number], d: string) => changes[cle(a.id, d)] ?? a.saisies[d]?.statut ?? "";
  const nbChanges = Object.keys(changes).length;

  async function enregistrer() {
    if (!s.donnees || !nbChanges) return true;
    setErreur(null);
    try {
      await api.put("/presence/semaine", {
        structureId: Number(structure),
        saisies: Object.entries(changes).map(([k, statut]) => {
          const [agentId, d] = k.split("|");
          const avant = s.donnees!.agents.find((a) => a.id === Number(agentId))?.saisies[d];
          return { agentId: Number(agentId), date: d, statut: statut || null, motif: avant?.motif ?? null, arrivee: avant?.arrivee ?? null, depart: avant?.depart ?? null };
        }),
      });
      setChanges({});
      s.recharger();
      return true;
    } catch (e) {
      setErreur((e as Error).message);
      return false;
    }
  }
  /** Toutes les cases attendues et vides (jusqu'à aujourd'hui, ou seulement aujourd'hui) : présent. */
  function toutPresent(seulementAujourdhui: boolean) {
    if (!s.donnees) return;
    const g = s.donnees;
    const n: Record<string, string> = { ...changes };
    for (const a of g.agents)
      g.dates.forEach((d, i) => {
        if (!a.attendus[i] || d > g.aujourdhui || (seulementAujourdhui && d !== g.aujourdhui)) return;
        if (!valeur(a, d)) n[cle(a.id, d)] = "PRESENT";
      });
    setChanges(n);
  }

  const changerSemaine = (n: number) => {
    if (nbChanges && !confirm("Des pointages ne sont pas enregistrés : changer de semaine quand même ?")) return;
    setChanges({});
    setDate(decaler(s.donnees?.lundi ?? new Date().toISOString().slice(0, 10), n));
  };

  return (
    <>
      {!chef && (
        <Carte titre="Structure">
          {!structures.donnees ? (
            <Chargement />
          ) : (
            <ChoixStructure
              structures={structures.donnees}
              valeur={structure}
              changer={(x) => {
                setStructure(x);
                setChanges({});
              }}
              vide={null}
            />
          )}
        </Carte>
      )}
      {chef && !profil.structureId && <Alerte>Votre compte n’est rattaché à aucune structure : demandez à l’administrateur de l’indiquer.</Alerte>}
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {s.erreur && <Alerte>{s.erreur}</Alerte>}
      {structure && !s.donnees && !s.erreur && <Chargement />}
      {s.donnees && (
        <Carte
          titre={`${s.donnees.structure.nom} — semaine du ${dateFr(s.donnees.lundi)}`}
          actions={
            <div className="flex items-center gap-1">
              <BoutonIcone libelle="Semaine précédente" onClick={() => changerSemaine(-7)}>
                <ChevronLeft />
              </BoutonIcone>
              <BoutonIcone libelle="Semaine suivante" disabled={decaler(s.donnees.lundi, 7) > s.donnees.aujourdhui} onClick={() => changerSemaine(7)}>
                <ChevronRight />
              </BoutonIcone>
            </div>
          }
        >
          <div className="-mt-2 mb-3 flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
            {s.donnees.validee && (
              <Badge ton="vert">
                Semaine validée par {s.donnees.validee.par} le {new Date(s.donnees.validee.le).toLocaleDateString("fr-FR")} : plus modifiable
              </Badge>
            )}
            {/* Une semaine validée est close : ce qui n'y est pas pointé le reste */}
            {!s.donnees.validee && s.donnees.manquantes > 0 && <Badge ton="jaune">{s.donnees.manquantes} journée(s) attendue(s) à pointer</Badge>}
            {!s.donnees.validee && !s.donnees.manquantes && <Badge ton="gris">Pas encore validée</Badge>}
            <span className={s.donnees.validee ? "hidden" : ""}>
              Touchez une case pour passer de vide à{" "}
              {CYCLE_PRESENCE.filter(Boolean)
                .map((k) => `${STATUTS_PRESENCE[k].court} (${STATUTS_PRESENCE[k].libelle.toLowerCase()})`)
                .join(", ")}
              . Les jours grisés ne sont pas des jours de travail de l’agent.
            </span>
          </div>
          {!s.donnees.agents.length ? (
            <Vide>
              Aucun agent en poste rattaché à cette structure. Les agents se rattachent dans leur fiche (
              <Link href="/personnel/agents" className="text-marque-700 underline">
                Base du personnel
              </Link>
              ).
            </Vide>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left text-[12px] font-medium text-zinc-500">Agent</th>
                    {s.donnees.dates.map((d, i) => (
                      <th key={d} className={`w-14 text-center text-[11px] font-medium ${d === s.donnees!.aujourdhui ? "text-marque-700" : "text-zinc-500"}`}>
                        {s.donnees!.jours[i].slice(0, 3)}
                        <div className="text-[10px] font-normal">{jourCourt(d)}</div>
                      </th>
                    ))}
                    <th className="min-w-36 text-left text-[11px] font-medium text-zinc-500">Semaine</th>
                  </tr>
                </thead>
                <tbody>
                  {s.donnees.agents.map((a) => (
                    <tr key={a.id}>
                      <td className="pr-2">
                        <div className="flex items-center gap-1">
                          <Link href={`/personnel/agents/${a.id}`} className="font-medium hover:underline">
                            {a.nomComplet}
                          </Link>
                          <BoutonIcone libelle="Jours et heures de travail" onClick={() => setHoraire(a)}>
                            <CalendarClock />
                          </BoutonIcone>
                          {!s.donnees!.validee && (
                            <BoutonIcone libelle="Heures d’arrivée et de départ de la semaine" onClick={() => setHeuresDe(a)}>
                              <Clock />
                            </BoutonIcone>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">{a.fonction ?? ""}</div>
                      </td>
                      {s.donnees!.dates.map((d, i) => {
                        const v = valeur(a, d);
                        const futur = d > s.donnees!.aujourdhui;
                        const modifie = cle(a.id, d) in changes;
                        return (
                          <td key={d} className="text-center">
                            <button
                              type="button"
                              disabled={futur || !!s.donnees!.validee}
                              title={v ? STATUTS_PRESENCE[v].libelle : a.attendus[i] ? "À pointer" : "Pas un jour de travail"}
                              onClick={() => setChanges((c) => ({ ...c, [cle(a.id, d)]: CYCLE_PRESENCE[(CYCLE_PRESENCE.indexOf(v) + 1) % CYCLE_PRESENCE.length] }))}
                              className={`h-9 w-full rounded-lg text-[12px] font-semibold transition ${
                                v ? STATUTS_PRESENCE[v].classe : a.attendus[i] ? (futur ? "bg-zinc-50" : "bg-white ring-1 ring-zinc-300") : "bg-zinc-100 text-zinc-300"
                              } ${modifie ? "ring-2 ring-encre/40" : ""} disabled:cursor-not-allowed`}
                            >
                              {v ? STATUTS_PRESENCE[v].court : a.attendus[i] && !futur ? "·" : ""}
                            </button>
                            {/* Heures notées et retard de la journée */}
                            {!modifie && a.saisies[d]?.arrivee && (
                              <div className="mt-0.5 text-[10px] leading-tight text-zinc-500 tabular-nums">
                                {a.saisies[d].arrivee}
                                {a.saisies[d].depart ? `–${a.saisies[d].depart}` : ""}
                                {!!a.saisies[d].retard && <div className="text-or-700">+{a.saisies[d].retard} min</div>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="align-top text-[11px] leading-snug text-zinc-600">
                        <div>
                          {a.bilan.joursAbsent ? <span className="font-medium text-rouge-600">{a.bilan.joursAbsent} absence(s)</span> : "aucune absence"} sur {a.bilan.joursAttendus} jour(s)
                        </div>
                        {a.bilan.minutesPrevues !== null && (
                          <div className="tabular-nums">
                            {heures(a.bilan.minutesFaites ?? 0)} / {heures(a.bilan.minutesPrevues)}
                            {!!a.bilan.minutesRetard && <span className="text-or-700"> · {a.bilan.minutesRetard} min de retard</span>}
                          </div>
                        )}
                        {a.bilan.alertes.map((x) => (
                          <div key={x.code} className="mt-0.5 flex items-start gap-1 font-medium text-rouge-600">
                            <TriangleAlert className="mt-px size-3 shrink-0" /> {x.texte}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!!s.donnees.agents.length && !s.donnees.validee && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Bouton onClick={() => toutPresent(true)}>Tous présents aujourd’hui</Bouton>
              <Bouton onClick={() => toutPresent(false)}>Compléter la semaine : présents</Bouton>
              <Bouton disabled={!nbChanges} onClick={async () => (await enregistrer()) && setMessage("Pointages enregistrés.")}>
                Enregistrer{nbChanges ? ` (${nbChanges})` : ""}
              </Bouton>
              <Bouton
                variante="principal"
                onClick={async () => {
                  if (!(await enregistrer())) return;
                  try {
                    const r = await api.post<{ alertes: { agent: string; alertes: AlertePresence[] }[] }>("/presence/semaine/valider", { structureId: Number(structure), date: s.donnees!.lundi });
                    setMessage(
                      r.alertes.length
                        ? `Semaine validée. ${r.alertes.length} agent(s) en alerte : ${r.alertes.map((x) => `${x.agent} (${x.alertes.map((a) => a.texte.toLowerCase()).join(" ; ")})`).join(" · ")}.`
                        : "Semaine validée. Aucune alerte.",
                    );
                    s.recharger();
                  } catch (e) {
                    setErreur((e as Error).message);
                  }
                }}
              >
                Valider la semaine
              </Bouton>
            </div>
          )}
        </Carte>
      )}
      {heuresDe && s.donnees && (
        <HeuresSemaine
          agent={heuresDe}
          semaine={s.donnees}
          statuts={Object.fromEntries(s.donnees.dates.map((d) => [d, valeur(heuresDe, d)]))}
          structureId={Number(structure)}
          fermer={() => setHeuresDe(null)}
          apres={() => {
            // Les cases de cet agent sont enregistrées avec leurs heures
            setChanges((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith(`${heuresDe.id}|`))));
            setHeuresDe(null);
            s.recharger();
          }}
        />
      )}
      {horaire && s.donnees && (
        <Horaire
          agent={horaire}
          structureId={Number(structure)}
          jours={s.donnees.jours}
          fermer={() => setHoraire(null)}
          apres={() => {
            setHoraire(null);
            s.recharger();
          }}
        />
      )}
    </>
  );
}

/**
 * Heures d'arrivée et de départ d'un agent pour chaque jour où il est venu (facultatives) : elles
 * donnent ses retards et ses heures faites dans la semaine. Arrivé après l'heure prévue : en retard.
 */
function HeuresSemaine({
  agent,
  semaine,
  statuts,
  structureId,
  fermer,
  apres,
}: {
  agent: Semaine["agents"][number];
  semaine: Semaine;
  statuts: Record<string, string>;
  structureId: number;
  fermer: () => void;
  apres: () => void;
}) {
  const venus = semaine.dates.filter((d) => ["PRESENT", "RETARD"].includes(statuts[d] ?? "") && d <= semaine.aujourdhui);
  const [h, setH] = useState<Record<string, { arrivee: string; depart: string }>>(() =>
    Object.fromEntries(venus.map((d) => [d, { arrivee: agent.saisies[d]?.arrivee ?? "", depart: agent.saisies[d]?.depart ?? "" }])),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const prevu = (d: string) => agent.horaire?.[String(semaine.dates.indexOf(d) + 1)];
  return (
    <Modale titre={`Heures de la semaine — ${agent.nomComplet}`} ouverte fermer={fermer}>
      <p className="mb-3 text-[12px] text-zinc-500">
        Pour chaque jour où l’agent est venu : son heure d’arrivée et son heure de départ (facultatives). Arrivé après l’heure prévue, il est noté en retard ; les heures faites comptent pour
        l’alerte « moins de la moitié des heures ».
      </p>
      {!venus.length ? (
        <Vide>Aucun jour pointé « présent » ou « en retard » cette semaine : pointez d’abord ses jours de présence.</Vide>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[8rem_1fr_1fr] gap-2 text-[11px] font-medium text-zinc-400">
            <span />
            <span>Arrivée</span>
            <span>Départ</span>
          </div>
          {venus.map((d) => (
            <div key={d} className="grid grid-cols-[8rem_1fr_1fr] items-center gap-2">
              <div className="text-[13px]">
                {semaine.jours[semaine.dates.indexOf(d)]} {jourCourt(d)}
                {prevu(d)?.debut && (
                  <div className="text-[11px] text-zinc-400">
                    prévu {prevu(d)!.debut}–{prevu(d)!.fin}
                  </div>
                )}
              </div>
              <Saisie type="time" aria-label="Heure d’arrivée" value={h[d]?.arrivee ?? ""} onChange={(e) => setH((x) => ({ ...x, [d]: { ...x[d], arrivee: e.target.value } }))} />
              <Saisie type="time" aria-label="Heure de départ" value={h[d]?.depart ?? ""} onChange={(e) => setH((x) => ({ ...x, [d]: { ...x[d], depart: e.target.value } }))} />
            </div>
          ))}
          {erreur && <Alerte>{erreur}</Alerte>}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        {!!venus.length && (
          <Bouton
            variante="principal"
            onClick={async () => {
              setErreur(null);
              try {
                await api.put("/presence/semaine", {
                  structureId,
                  saisies: venus.map((d) => ({
                    agentId: agent.id,
                    date: d,
                    statut: statuts[d],
                    motif: agent.saisies[d]?.motif ?? null,
                    arrivee: h[d]?.arrivee || null,
                    depart: h[d]?.depart || null,
                  })),
                });
                apres();
              } catch (e) {
                setErreur((e as Error).message);
              }
            }}
          >
            Enregistrer les heures
          </Bouton>
        )}
      </div>
    </Modale>
  );
}

/** Jours et heures de travail d'un agent (un professeur ne vient pas tous les jours). */
function Horaire({ agent, structureId, jours, fermer, apres }: { agent: Semaine["agents"][number]; structureId: number; jours: string[]; fermer: () => void; apres: () => void }) {
  const [h, setH] = useState<Record<string, { debut: string | null; fin: string | null }>>(
    agent.horaire && Object.keys(agent.horaire).length ? agent.horaire : Object.fromEntries([1, 2, 3, 4, 5].map((j) => [String(j), { debut: "07:30", fin: "14:00" }])),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <Modale titre={`Jours et heures de travail — ${agent.nomComplet}`} ouverte fermer={fermer}>
      <p className="mb-3 text-[12px] text-zinc-500">
        Cochez les jours où l’agent est attendu et ses heures (un professeur peut ne venir que trois jours ; l’administration du lundi au vendredi, parfois le samedi). Sans horaire saisi, il est
        attendu du lundi au vendredi.
      </p>
      <div className="space-y-2">
        {jours.map((j, i) => {
          const k = String(i + 1);
          const x = h[k];
          return (
            <div key={k} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={!!x}
                  onChange={(e) =>
                    setH((y) => {
                      const n = { ...y };
                      if (e.target.checked) n[k] = { debut: "07:30", fin: "14:00" };
                      else delete n[k];
                      return n;
                    })
                  }
                />
                {j}
              </label>
              <Saisie type="time" disabled={!x} value={x?.debut ?? ""} onChange={(e) => setH((y) => ({ ...y, [k]: { ...y[k], debut: e.target.value } }))} />
              <Saisie type="time" disabled={!x} value={x?.fin ?? ""} onChange={(e) => setH((y) => ({ ...y, [k]: { ...y[k], fin: e.target.value } }))} />
            </div>
          );
        })}
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={async () => {
            setErreur(null);
            try {
              await api.put(`/presence/horaires/${agent.id}`, { structureId, jours: h });
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

function RapportPresence() {
  const { profil, refs } = useSession();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [du, setDu] = useState(decaler(aujourdhui, -27));
  const [au, setAu] = useState(aujourdhui);
  const [departement, setDepartement] = useState("");
  const r = useApi<Rapport>(`/presence/rapport?du=${du}&au=${au}&departement=${departement}`);
  const central = !["DDEPPSA", "STRUCTURE"].includes(profil.role);
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Champ libelle="Du">
          <Saisie type="date" value={du} onChange={(e) => setDu(e.target.value)} />
        </Champ>
        <Champ libelle="Au">
          <Saisie type="date" value={au} onChange={(e) => setAu(e.target.value)} />
        </Champ>
        {central && (
          <Champ libelle="Département">
            <Liste className="w-56" value={departement} onChange={(e) => setDepartement(e.target.value)} vide="Tous" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
          </Champ>
        )}
      </div>
      {r.erreur && <Alerte>{r.erreur}</Alerte>}
      {!r.donnees ? (
        <Chargement />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Chiffre libelle="Taux de présence" valeur={r.donnees.taux === null ? "—" : `${r.donnees.taux} %`} detail="présents et retards sur les journées pointées" />
            <Chiffre libelle="Structures qui doivent pointer" valeur={r.donnees.structures.length} detail="celles qui ont des agents rattachés" />
            <Chiffre
              libelle="Chefs en retard de pointage"
              valeur={r.donnees.sansPointage}
              ton={r.donnees.sansPointage ? "rouge" : "vert"}
              detail={`${r.donnees.semainesDues.length} semaine(s) terminée(s) dans la période`}
            />
          </div>
          <Carte titre="Par structure">
            <p className="-mt-2 mb-3 text-[12px] leading-relaxed text-zinc-500">
              Chaque semaine, le chef de la structure pointe ses agents puis <strong>valide la semaine</strong> (onglet « Pointage de la semaine »). La dernière colonne donne les semaines terminées
              de la période qu’il n’a pas encore validées (du lundi au samedi) : c’est le retard de pointage. Les chiffres de présence ne comptent que les journées pointées.
            </p>
            {!r.donnees.structures.length ? (
              <Vide>Aucune structure avec des agents rattachés dans votre périmètre.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>Structure</th>
                    <th className="text-right">Agents</th>
                    <th className="text-right">Journées pointées</th>
                    <th className="text-right">Retards</th>
                    <th className="text-right">Absences justifiées</th>
                    <th className="text-right">Absences non justifiées</th>
                    <th className="text-right">Présence</th>
                    <th title="Semaines terminées que le chef de la structure n’a pas encore pointées et validées">Semaines pas encore validées par le chef</th>
                  </tr>
                </thead>
                <tbody>
                  {r.donnees.structures.slice(0, 300).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="font-medium">{s.nom}</div>
                        <div className="text-[11px] text-zinc-400">{s.departement ?? ""}</div>
                      </td>
                      <td className="text-right tabular-nums">{s.agents}</td>
                      <td className="text-right tabular-nums">{s.pointages}</td>
                      <td className="text-right tabular-nums">{s.retards}</td>
                      <td className="text-right tabular-nums">{s.justifies}</td>
                      <td className={`text-right tabular-nums ${s.absents ? "font-semibold text-rouge-600" : ""}`}>{s.absents}</td>
                      <td className="text-right tabular-nums">{s.taux === null ? "—" : `${s.taux} %`}</td>
                      <td className="text-[12px]">
                        {s.semainesNonValidees.length ? (
                          <span className="text-rouge-600">
                            <strong>{s.semainesNonValidees.length} semaine(s)</strong>
                            <span className="block text-[11px]">{s.semainesNonValidees.map((l) => `du ${dateFr(l).slice(0, 5)} au ${dateFr(decaler(l, 5)).slice(0, 5)}`).join(" · ")}</span>
                          </span>
                        ) : (
                          <span className="text-marque-700">à jour</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Carte>
          <Carte titre={`Alertes de fin de semaine (${r.donnees.alertes.length})`}>
            <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
              Pour chaque semaine validée : absent plus de la moitié des jours attendus, moins de la moitié des heures prévues, ou deux semaines d’affilée sans travailler.
            </p>
            {!r.donnees.alertes.length ? (
              <Vide>Aucune alerte sur les semaines validées de la période.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Structure</th>
                    <th>Semaine</th>
                    <th>Alerte</th>
                  </tr>
                </thead>
                <tbody>
                  {r.donnees.alertes.map((a) => (
                    <tr key={`${a.agentId}-${a.lundi}`}>
                      <td>
                        <Link href={`/personnel/agents/${a.agentId}`} className="font-medium text-marque-700 hover:underline">
                          {a.nomComplet}
                        </Link>
                      </td>
                      <td className="text-[12px] text-zinc-600">{a.structure}</td>
                      <td className="text-[12px] whitespace-nowrap">du {dateFr(a.lundi)}</td>
                      <td className="text-[12px] text-rouge-600">
                        {a.alertes.map((x) => (
                          <div key={x.code}>{x.texte}</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Carte>
          {!!r.donnees.absents.length && (
            <Carte titre="Absences non justifiées les plus nombreuses">
              <Tableau>
                <tbody>
                  {r.donnees.absents.map((a) => (
                    <tr key={a.agentId}>
                      <td>
                        <Link href={`/personnel/agents/${a.agentId}`} className="font-medium text-marque-700 hover:underline">
                          {a.nomComplet}
                        </Link>
                      </td>
                      <td className="text-[12px] text-zinc-600">{a.structure}</td>
                      <td className="text-right font-semibold text-rouge-600 tabular-nums">{a.absences} jour(s)</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            </Carte>
          )}
        </>
      )}
    </>
  );
}
