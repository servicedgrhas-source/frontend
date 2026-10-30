"use client";

import { LogIn, LogOut, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChoixStructure, type StructureCourte } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Modale, Saisie, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { STATUTS_PRESENCE } from "@/lib/ecoles";

export interface ReglagesPresence {
  toleranceArrivee: number;
  toleranceDepart: number;
  retardGrave: number;
  retardsFrequents: number;
  absencesFrequentes: number;
  debutDefaut: string;
  finDefaut: string;
}
export interface Cours {
  debut: string;
  fin: string;
  libelle: string;
}
export interface AnalyseJour {
  retard: number | null;
  retardGrave: boolean;
  departAnticipe: number;
  coursManques: (Cours & { minutes: number })[];
  minutesCoursPerdues: number;
}
interface SemaineJour {
  structure: { id: number; nom: string };
  lundi: string;
  dates: string[];
  jours: string[];
  aujourdhui: string;
  validee: { par: string | null; le: string } | null;
  reglages: ReglagesPresence;
  agents: {
    id: number;
    nomComplet: string;
    fonction: string | null;
    attendus: boolean[];
    prevu: Record<string, { debut: string | null; fin: string | null }>;
    source: "EDT" | "HORAIRE" | "DEFAUT";
    cours: Record<string, Cours[]>;
    saisies: Record<string, { statut: string; motif: string | null; arrivee: string | null; depart: string | null; analyse?: AnalyseJour }>;
  }[];
}

export const SOURCE_HORAIRE = { EDT: "emploi du temps", HORAIRE: "horaire saisi", DEFAUT: "heures par défaut" } as const;

/** 70 → « 1 h 10 », 25 → « 25 min ». */
export const duree = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}` : `${min} min`);
const maintenant = () => new Date().toTimeString().slice(0, 5);
const parametre = (k: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(k));

/**
 * Pointage du jour, comme à l'entrée d'une école (DG, 30/10/2026) : pour chaque agent attendu
 * aujourd'hui, son heure prévue (son emploi du temps pour un enseignant) ; « Arrivé » et « Parti »
 * notent l'heure exacte (modifiable), et le système dit tout de suite s'il est en retard et de
 * combien, s'il part avant l'heure, et quels cours il a manqués. Une absence se note d'un clic.
 */
export function PointageJour() {
  const { profil } = useSession();
  const chef = profil.role === "STRUCTURE";
  const structures = useApi<StructureCourte[]>(chef ? null : "/recensement/structures");
  const [structure, setStructure] = useState(() => (chef ? String(profil.structureId ?? "") : (parametre("structure") ?? "")));
  const s = useApi<SemaineJour>(structure ? `/presence/semaine?structure=${structure}` : null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [absence, setAbsence] = useState<{ agent: SemaineJour["agents"][number]; justifiee: boolean } | null>(null);
  const [motif, setMotif] = useState("");
  const [heures, setHeures] = useState<Record<number, { arrivee: string; depart: string }>>({});

  const g = s.donnees;
  const auj = g?.aujourdhui ?? "";
  const i = g ? g.dates.indexOf(auj) : -1;
  const jour = String(i + 1);

  async function noter(a: SemaineJour["agents"][number], x: { statut: string; arrivee?: string | null; depart?: string | null; motif?: string | null }) {
    setErreur(null);
    setEnvoi(a.id);
    const avant = a.saisies[auj];
    try {
      await api.put("/presence/semaine", {
        structureId: Number(structure),
        saisies: [
          {
            agentId: a.id,
            date: auj,
            statut: x.statut,
            motif: x.motif !== undefined ? x.motif : (avant?.motif ?? null),
            arrivee: x.arrivee !== undefined ? x.arrivee : (avant?.arrivee ?? null),
            depart: x.depart !== undefined ? x.depart : (avant?.depart ?? null),
          },
        ],
      });
      setHeures((h) => {
        const n = { ...h };
        delete n[a.id];
        return n;
      });
      s.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(null);
    }
  }

  const attendus = g && i >= 0 ? g.agents.filter((a) => a.attendus[i]) : [];
  const autres = g && i >= 0 ? g.agents.filter((a) => !a.attendus[i]) : [];
  const ligne = (a: SemaineJour["agents"][number], attendu: boolean) => {
    const p = a.saisies[auj];
    const x = p?.analyse;
    const prevu = a.prevu[jour];
    const cours = a.cours[jour] ?? [];
    const absent = p?.statut.startsWith("ABSENT");
    const h = heures[a.id] ?? { arrivee: p?.arrivee ?? "", depart: p?.depart ?? "" };
    const ferme = !!g!.validee;
    return (
      <li key={a.id} className={`grid gap-3 rounded-2xl px-4 py-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.3fr)] lg:items-center ${attendu ? "bg-zinc-50" : "bg-zinc-50/50 opacity-70"}`}>
        <div className="min-w-0">
          <Link href={`/personnel/agents/${a.id}`} className="font-medium hover:underline">
            {a.nomComplet}
          </Link>
          <div className="text-[11px] text-zinc-400">{a.fonction ?? ""}</div>
        </div>
        <div className="text-[12px]">
          {attendu && prevu?.debut ? (
            <>
              <div className="font-medium tabular-nums">
                Prévu {prevu.debut}–{prevu.fin}
              </div>
              <div className="text-[11px] text-zinc-400">{SOURCE_HORAIRE[a.source]}</div>
              {!!cours.length && (
                <div className="mt-0.5 text-[11px] text-zinc-500" title={cours.map((c) => `${c.debut}–${c.fin} ${c.libelle}`).join("\n")}>
                  {cours.length} cours : {cours.map((c) => c.debut).join(", ")}
                </div>
              )}
            </>
          ) : (
            <span className="text-zinc-400">pas attendu aujourd’hui</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {absent ? (
            <Badge ton={p!.statut === "ABSENT" ? "rouge" : "bleu"}>
              {STATUTS_PRESENCE[p!.statut].libelle}
              {p!.motif ? ` : ${p!.motif}` : ""}
            </Badge>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <Saisie
                  type="time"
                  aria-label={`Arrivée de ${a.nomComplet}`}
                  value={h.arrivee}
                  disabled={ferme}
                  onChange={(e) => setHeures((y) => ({ ...y, [a.id]: { ...h, arrivee: e.target.value } }))}
                  onBlur={() => h.arrivee !== (p?.arrivee ?? "") && h.arrivee && void noter(a, { statut: "PRESENT", arrivee: h.arrivee })}
                  className="w-24"
                />
                {!p?.arrivee && (
                  <Bouton variante="principal" disabled={ferme || envoi === a.id} onClick={() => void noter(a, { statut: "PRESENT", arrivee: maintenant() })} title="Noter l’heure d’arrivée : maintenant">
                    <LogIn /> Arrivé
                  </Bouton>
                )}
              </span>
              {p?.arrivee && (
                <span className="flex items-center gap-1">
                  <Saisie
                    type="time"
                    aria-label={`Départ de ${a.nomComplet}`}
                    value={h.depart}
                    disabled={ferme}
                    onChange={(e) => setHeures((y) => ({ ...y, [a.id]: { ...h, depart: e.target.value } }))}
                    onBlur={() => h.depart !== (p?.depart ?? "") && void noter(a, { statut: "PRESENT", depart: h.depart || null })}
                    className="w-24"
                  />
                  {!p?.depart && (
                    <Bouton disabled={ferme || envoi === a.id} onClick={() => void noter(a, { statut: "PRESENT", depart: maintenant() })} title="Noter l’heure de départ : maintenant">
                      <LogOut /> Parti
                    </Bouton>
                  )}
                </span>
              )}
            </>
          )}
          {!ferme && (
            <span className="flex gap-1">
              {!absent && !p?.arrivee && (
                <>
                  <Bouton variante="danger" disabled={envoi === a.id} onClick={() => setAbsence({ agent: a, justifiee: false })}>
                    Absent
                  </Bouton>
                  <Bouton disabled={envoi === a.id} onClick={() => setAbsence({ agent: a, justifiee: true })}>
                    Absent justifié
                  </Bouton>
                </>
              )}
              {(absent || p?.arrivee) && (
                <button type="button" className="text-[11px] text-zinc-400 hover:text-rouge-600 hover:underline" onClick={() => void noter(a, { statut: "", arrivee: null, depart: null, motif: null })}>
                  annuler
                </button>
              )}
            </span>
          )}
        </div>
        <div className="text-[12px] leading-snug">
          {x && p?.arrivee ? (
            <>
              {x.retard ? (
                <div className={`font-semibold ${x.retardGrave ? "text-rouge-600" : "text-or-700"}`}>
                  {x.retardGrave && <TriangleAlert className="mr-1 inline size-3.5" />}
                  {duree(x.retard)} de retard
                </div>
              ) : (
                <div className="font-medium text-marque-700">À l’heure</div>
              )}
              {!!x.departAnticipe && <div className="font-medium text-or-700">Parti {duree(x.departAnticipe)} avant la fin</div>}
              {!!x.coursManques.length && (
                <div className="text-rouge-600">
                  {x.coursManques.length} cours manqué(s) : {x.coursManques.map((c) => `${c.debut} ${c.libelle}`).join(" ; ")}
                </div>
              )}
            </>
          ) : absent && cours.length ? (
            <div className="text-rouge-600">{cours.length} cours non faits</div>
          ) : attendu && !p ? (
            <span className="text-zinc-400">pas encore pointé</span>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <>
      {!chef && (
        <Carte titre="Structure">
          {!structures.donnees ? <Chargement /> : <ChoixStructure structures={structures.donnees} valeur={structure} changer={setStructure} vide={null} />}
        </Carte>
      )}
      {chef && !profil.structureId && <Alerte>Votre compte n’est rattaché à aucune structure : demandez à l’administrateur de l’indiquer.</Alerte>}
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {s.erreur && <Alerte>{s.erreur}</Alerte>}
      {structure && !g && !s.erreur && <Chargement />}
      {g &&
        (i < 0 ? (
          <Vide>Aujourd’hui n’est pas un jour de travail (dimanche) : rien à pointer.</Vide>
        ) : (
          <Carte titre={`${g.structure.nom} — ${g.jours[i]} ${auj.split("-").reverse().join("/")}`}>
            <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
              « Arrivé » et « Parti » notent l’heure exacte (vous pouvez la corriger). Marge de {g.reglages.toleranceArrivee} min à l’arrivée et de {g.reglages.toleranceDepart} min au départ
              (le temps des formalités) ; au-delà, le retard compte depuis l’heure prévue. Un retard de {duree(g.reglages.retardGrave)} ou plus est signalé en rouge. Pour un enseignant,
              l’heure prévue est celle de son premier cours et la fin celle de son dernier, d’après l’emploi du temps.
            </p>
            {g.validee && <Alerte ton="vert">Semaine validée : plus modifiable.</Alerte>}
            {!g.agents.length ? (
              <Vide>Aucun agent en poste rattaché à cette structure.</Vide>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
                  <Badge ton="gris">{attendus.length} attendu(s)</Badge>
                  <Badge ton="vert">{attendus.filter((a) => a.saisies[auj]?.arrivee || a.saisies[auj]?.statut === "PRESENT").length} arrivé(s)</Badge>
                  <Badge ton="jaune">{attendus.filter((a) => a.saisies[auj]?.analyse?.retard).length} en retard</Badge>
                  <Badge ton="rouge">{attendus.filter((a) => a.saisies[auj]?.statut.startsWith("ABSENT")).length} absent(s)</Badge>
                  <Badge ton="gris">{attendus.filter((a) => !a.saisies[auj]).length} pas encore pointé(s)</Badge>
                </div>
                <ul className="space-y-2">{attendus.map((a) => ligne(a, true))}</ul>
                {!!autres.length && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-[12px] font-medium text-zinc-500">{autres.length} agent(s) pas attendu(s) aujourd’hui (venus quand même ?)</summary>
                    <ul className="mt-2 space-y-2">{autres.map((a) => ligne(a, false))}</ul>
                  </details>
                )}
              </>
            )}
          </Carte>
        ))}
      {absence && (
        <Modale titre={`${absence.justifiee ? "Absence justifiée" : "Absence"} — ${absence.agent.nomComplet}`} ouverte fermer={() => setAbsence(null)}>
          <div className="space-y-3">
            <Champ libelle={absence.justifiee ? "Motif (certificat médical, mission, permission…) *" : "Motif connu (facultatif)"}>
              <Saisie value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={absence.justifiee ? "Ex. certificat médical" : ""} />
            </Champ>
            <div className="flex justify-end gap-2">
              <Bouton onClick={() => setAbsence(null)}>Annuler</Bouton>
              <Bouton
                variante={absence.justifiee ? "principal" : "danger"}
                disabled={absence.justifiee && !motif.trim()}
                onClick={async () => {
                  await noter(absence.agent, { statut: absence.justifiee ? "ABSENT_JUSTIFIE" : "ABSENT", arrivee: null, depart: null, motif: motif.trim() || null });
                  setMessage(`${absence.agent.nomComplet} : ${absence.justifiee ? "absence justifiée" : "absent"} noté(e).`);
                  setAbsence(null);
                  setMotif("");
                }}
              >
                Noter l’absence
              </Bouton>
            </div>
          </div>
        </Modale>
      )}
    </>
  );
}
