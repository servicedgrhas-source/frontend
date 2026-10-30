"use client";

import { Settings2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { duree, type ReglagesPresence } from "@/components/presence/pointage-jour";
import { ChoixStructure, type StructureCourte } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Champ, Chargement, Chiffre, Liste, Modale, Saisie, SaisieDate, Segments, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";

interface CasDuJour {
  agentId: number;
  nomComplet: string;
  structure: string;
  prevu: string | null;
  arrivee: string | null;
  depart: string | null;
  minutes: number;
  grave: boolean;
  coursManques: string[];
  motif: string | null;
}
interface LigneAgent {
  agentId: number;
  nomComplet: string;
  fonction: string | null;
  enseignant: boolean;
  structure: string;
  sourceLibelle: string;
  attendus: number;
  pointes: number;
  presents: number;
  aLHeure: number;
  retards: number;
  minutesRetard: number;
  retardMoyen: number;
  retardsGraves: number;
  departsAnticipes: number;
  minutesDepartAnticipe: number;
  coursManques: number;
  minutesCoursPerdues: number;
  absencesJustifiees: number;
  absencesNonJustifiees: number;
  nonPointes: number;
  dernierRetard: string | null;
  ponctualite: number | null;
  souventEnRetard: boolean;
  souventAbsent: boolean;
}
interface Analyse {
  du: string;
  au: string;
  aujourdhui: string;
  reglages: ReglagesPresence;
  structures: number;
  totaux: {
    agents: number;
    retards: number;
    minutesRetard: number;
    retardsGraves: number;
    departsAnticipes: number;
    minutesCoursPerdues: number;
    absencesNonJustifiees: number;
    absencesJustifiees: number;
    souventEnRetard: number;
    souventAbsent: number;
  };
  jour: { retards: CasDuJour[]; departs: CasDuJour[]; absents: CasDuJour[]; justifies: CasDuJour[]; nonPointes: CasDuJour[] };
  agents: LigneAgent[];
}

type Filtre = "" | "souvent" | "graves" | "departs" | "cours" | "absences";
type Tri = "minutesRetard" | "retards" | "absencesNonJustifiees" | "minutesCoursPerdues" | "ponctualite" | "nomComplet";

const nf = new Intl.NumberFormat("fr-FR");
const dateFr = (d: string) => d.split("-").reverse().join("/");
const decaler = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const AUJ = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);

/**
 * Retards et absences (DG, 30/10/2026) : aujourd'hui (qui est en retard et de combien, qui a 1 h
 * de retard ou plus, qui est parti avant l'heure, qui est absent, qui n'est pas pointé), puis sur la
 * période, agent par agent : retards, retard total et moyen, départs anticipés, cours manqués,
 * absences, ponctualité ; ceux qui sont souvent en retard ou souvent absents. Les marges et les
 * seuils se règlent ici (Directeur général) et s'appliquent partout.
 */
export function AnalysePresence() {
  const { profil, refs } = useSession();
  const chef = profil.role === "STRUCTURE";
  const central = !["STRUCTURE", "DDEPPSA"].includes(profil.role);
  const structures = useApi<StructureCourte[]>(chef ? null : "/recensement/structures");
  const [structure, setStructure] = useState(chef ? String(profil.structureId ?? "") : "");
  const [departement, setDepartement] = useState("");
  const [du, setDu] = useState(decaler(AUJ, -29));
  const [au, setAu] = useState(AUJ);
  const [filtre, setFiltre] = useState<Filtre>("");
  const [tri, setTri] = useState<Tri>("minutesRetard");
  const [reglage, setReglage] = useState(false);
  const r = useApi<Analyse>(`/presence/analyse?du=${du}&au=${au}${structure ? `&structure=${structure}` : ""}${departement ? `&departement=${departement}` : ""}`);
  const d = r.donnees;

  const lignes = (d?.agents ?? [])
    .filter((l) =>
      filtre === "souvent"
        ? l.souventEnRetard || l.souventAbsent
        : filtre === "graves"
          ? l.retardsGraves > 0
          : filtre === "departs"
            ? l.departsAnticipes > 0
            : filtre === "cours"
              ? l.coursManques > 0
              : filtre === "absences"
                ? l.absencesNonJustifiees > 0
                : true,
    )
    .sort((a, b) =>
      tri === "nomComplet" ? a.nomComplet.localeCompare(b.nomComplet) : tri === "ponctualite" ? (a.ponctualite ?? 101) - (b.ponctualite ?? 101) : Number(b[tri]) - Number(a[tri]) || a.nomComplet.localeCompare(b.nomComplet),
    );

  const cas = (titre: string, l: CasDuJour[], rendu: (x: CasDuJour) => React.ReactNode, ton: "rouge" | "or" | "gris") =>
    !!l.length && (
      <div>
        <div className={`mb-1 text-[12px] font-semibold ${ton === "rouge" ? "text-rouge-600" : ton === "or" ? "text-or-700" : "text-zinc-500"}`}>
          {titre} ({l.length})
        </div>
        <ul className="space-y-1">
          {l.map((x) => (
            <li key={`${titre}-${x.agentId}`} className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
              <Link href={`/personnel/agents/${x.agentId}`} className="font-medium hover:underline">
                {x.nomComplet}
              </Link>
              {!structure && <span className="text-zinc-400">{x.structure}</span>}
              {rendu(x)}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="space-y-5">
      <Carte titre="Période et structures">
        <div className="grid gap-3 md:grid-cols-4">
          <Champ libelle="Du">
            <SaisieDate aria-label="Début de la période" value={du} onChange={(v) => v && setDu(v)} />
          </Champ>
          <Champ libelle="Au">
            <SaisieDate aria-label="Fin de la période" value={au} onChange={(v) => v && setAu(v > AUJ ? AUJ : v)} />
          </Champ>
          {central && (
            <Champ libelle="Département">
              <Liste value={departement} onChange={(e) => setDepartement(e.target.value)} vide="Tous" options={refs.departements.map((x) => ({ valeur: String(x.id), libelle: x.nom }))} />
            </Champ>
          )}
        </div>
        {!chef && structures.donnees && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-zinc-500">Une seule structure (sinon toutes celles qui ont pointé dans la période)</div>
            <ChoixStructure structures={structures.donnees} valeur={structure} changer={setStructure} vide="Toutes" />
          </div>
        )}
        {d && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
            <span>
              Réglages : marge de {d.reglages.toleranceArrivee} min à l’arrivée et de {d.reglages.toleranceDepart} min au départ ; retard important à partir de {duree(d.reglages.retardGrave)} ;
              « souvent en retard » à partir de {d.reglages.retardsFrequents} retards, « souvent absent » à partir de {d.reglages.absencesFrequentes} absences non justifiées sur la période ; sans
              emploi du temps ni horaire, attendu de {d.reglages.debutDefaut} à {d.reglages.finDefaut} du lundi au vendredi.
            </span>
            {["DG", "ADMIN"].includes(profil.role) && (
              <Bouton variante="discret" onClick={() => setReglage(true)}>
                <Settings2 /> Modifier les réglages
              </Bouton>
            )}
          </p>
        )}
      </Carte>

      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !d ? (
        <Chargement texte="Comparaison des heures d’arrivée et de départ avec les heures prévues…" />
      ) : (
        <>
          {d.au === d.aujourdhui && (
            <Carte titre={`Aujourd’hui, ${dateFr(d.aujourdhui)}`}>
              {!d.jour.retards.length && !d.jour.departs.length && !d.jour.absents.length && !d.jour.justifies.length && !d.jour.nonPointes.length ? (
                <Vide>Rien à signaler aujourd’hui pour l’instant.</Vide>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {cas(
                    `En retard (dont ${d.jour.retards.filter((x) => x.grave).length} de ${duree(d.reglages.retardGrave)} ou plus)`,
                    d.jour.retards,
                    (x) => (
                      <>
                        <span className={`font-semibold ${x.grave ? "text-rouge-600" : "text-or-700"}`}>
                          {x.grave && <TriangleAlert className="mr-0.5 inline size-3" />}
                          {duree(x.minutes)}
                        </span>
                        <span className="text-zinc-500">
                          arrivé à {x.arrivee} (prévu {x.prevu})
                        </span>
                        {!!x.coursManques.length && <span className="text-rouge-600">· cours manqué(s) : {x.coursManques.join(", ")}</span>}
                      </>
                    ),
                    "or",
                  )}
                  {cas("Partis avant l’heure", d.jour.departs, (x) => <span className="text-or-700">parti à {x.depart}, {duree(x.minutes)} avant la fin (prévu {x.prevu})</span>, "or")}
                  {cas(
                    "Absents sans justification",
                    d.jour.absents,
                    (x) => (
                      <span className="text-zinc-500">
                        {x.motif ?? ""}
                        {x.coursManques.length ? ` · ${x.coursManques.length} cours non faits` : ""}
                      </span>
                    ),
                    "rouge",
                  )}
                  {cas("Absents justifiés", d.jour.justifies, (x) => <span className="text-zinc-500">{x.motif ?? ""}</span>, "gris")}
                  {cas("Attendus, pas encore pointés", d.jour.nonPointes, (x) => <span className="text-zinc-400">prévu {x.prevu ?? "—"}</span>, "gris")}
                </div>
              )}
            </Carte>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Chiffre ton="jaune" libelle="Retards" valeur={nf.format(d.totaux.retards)} detail={`${duree(d.totaux.minutesRetard)} au total · ${d.totaux.retardsGraves} de ${duree(d.reglages.retardGrave)} ou plus`} />
            <Chiffre ton="rouge" libelle="Absences non justifiées" valeur={nf.format(d.totaux.absencesNonJustifiees)} detail={`et ${nf.format(d.totaux.absencesJustifiees)} justifiée(s)`} />
            <Chiffre ton="jaune" libelle="Départs avant l’heure" valeur={nf.format(d.totaux.departsAnticipes)} detail={`cours perdus : ${duree(d.totaux.minutesCoursPerdues)}`} />
            <Chiffre ton="gris" libelle="À suivre de près" valeur={nf.format(d.totaux.souventEnRetard + d.totaux.souventAbsent)} detail={`${d.totaux.souventEnRetard} souvent en retard · ${d.totaux.souventAbsent} souvent absent(s)`} />
          </div>

          <Carte titre={`Agent par agent, du ${dateFr(d.du)} au ${dateFr(d.au)} (${d.totaux.agents} agents, ${d.structures} structure(s))`}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Segments
                valeur={filtre}
                changer={setFiltre}
                options={[
                  { valeur: "", libelle: "Tous" },
                  { valeur: "souvent", libelle: "Souvent en retard ou absents" },
                  { valeur: "graves", libelle: `Retards de ${duree(d.reglages.retardGrave)} ou plus` },
                  { valeur: "departs", libelle: "Partis avant l’heure" },
                  { valeur: "cours", libelle: "Cours manqués" },
                  { valeur: "absences", libelle: "Absences non justifiées" },
                ]}
              />
              <Liste
                aria-label="Trier par"
                value={tri}
                onChange={(e) => setTri(e.target.value as Tri)}
                options={[
                  { valeur: "minutesRetard", libelle: "Trier : retard total" },
                  { valeur: "retards", libelle: "Trier : nombre de retards" },
                  { valeur: "absencesNonJustifiees", libelle: "Trier : absences non justifiées" },
                  { valeur: "minutesCoursPerdues", libelle: "Trier : cours perdus" },
                  { valeur: "ponctualite", libelle: "Trier : ponctualité (la plus faible)" },
                  { valeur: "nomComplet", libelle: "Trier : nom" },
                ]}
                className="w-64"
              />
            </div>
            {!lignes.length ? (
              <Vide>{d.agents.length ? "Aucun agent dans ce cas." : "Aucun pointage dans la période : les chefs de structure pointent dans « Pointage du jour » ou « Pointage de la semaine »."}</Vide>
            ) : (
              <div className="overflow-x-auto">
                <Tableau>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th className="text-right">Jours attendus</th>
                      <th className="text-right">Venu</th>
                      <th className="text-right">Retards</th>
                      <th className="text-right">Retard total (moyen)</th>
                      <th className="text-right">≥ {duree(d.reglages.retardGrave)}</th>
                      <th className="text-right">Partis avant l’heure</th>
                      <th className="text-right">Cours manqués</th>
                      <th className="text-right">Absences (non justifiées / justifiées)</th>
                      <th className="text-right">Non pointés</th>
                      <th className="text-right">Ponctualité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l) => (
                      <tr key={l.agentId}>
                        <td>
                          <Link href={`/personnel/agents/${l.agentId}`} className="font-medium hover:underline">
                            {l.nomComplet}
                          </Link>
                          <div className="text-[11px] text-zinc-400">
                            {[!structure ? l.structure : null, l.fonction, `heures : ${l.sourceLibelle}`].filter(Boolean).join(" · ")}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {l.souventEnRetard && <Badge ton="jaune">souvent en retard</Badge>}
                            {l.souventAbsent && <Badge ton="rouge">souvent absent</Badge>}
                          </div>
                        </td>
                        <td className="text-right tabular-nums">{l.attendus}</td>
                        <td className="text-right tabular-nums">{l.presents}</td>
                        <td className={`text-right tabular-nums ${l.retards ? "font-semibold text-or-700" : ""}`}>{l.retards}</td>
                        <td className="text-right text-[12px] tabular-nums">{l.retards ? `${duree(l.minutesRetard)} (${duree(l.retardMoyen)})` : "—"}</td>
                        <td className={`text-right tabular-nums ${l.retardsGraves ? "font-semibold text-rouge-600" : ""}`}>{l.retardsGraves || "—"}</td>
                        <td className="text-right text-[12px] tabular-nums">{l.departsAnticipes ? `${l.departsAnticipes} (${duree(l.minutesDepartAnticipe)})` : "—"}</td>
                        <td className={`text-right text-[12px] tabular-nums ${l.coursManques ? "text-rouge-600" : ""}`}>{l.coursManques ? `${l.coursManques} (${duree(l.minutesCoursPerdues)})` : "—"}</td>
                        <td className="text-right tabular-nums">
                          <span className={l.absencesNonJustifiees ? "font-semibold text-rouge-600" : ""}>{l.absencesNonJustifiees}</span> / {l.absencesJustifiees}
                        </td>
                        <td className={`text-right tabular-nums ${l.nonPointes ? "text-zinc-500" : ""}`}>{l.nonPointes || "—"}</td>
                        <td className="text-right tabular-nums">{l.ponctualite === null ? "—" : `${l.ponctualite} %`}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              </div>
            )}
            <p className="mt-3 text-[11px] text-zinc-500">
              Jours attendus : ceux de son emploi du temps (enseignant), sinon de son horaire, sinon du lundi au vendredi. Ponctualité : jours où il est arrivé à l’heure (dans la marge) sur les jours où
              il est venu. Cours manqués : cours de son emploi du temps qui ont commencé avant son arrivée ou fini après son départ.
            </p>
          </Carte>
        </>
      )}
      {reglage && d && (
        <Reglages
          r={d.reglages}
          fermer={() => setReglage(false)}
          apres={() => {
            setReglage(false);
            r.recharger();
          }}
        />
      )}
    </div>
  );
}

/** Les marges et seuils de la présence (paramètres PRESENCE_…), modifiables par le Directeur général. */
function Reglages({ r, fermer, apres }: { r: ReglagesPresence; fermer: () => void; apres: () => void }) {
  const [v, setV] = useState({
    PRESENCE_TOLERANCE_ARRIVEE: String(r.toleranceArrivee),
    PRESENCE_TOLERANCE_DEPART: String(r.toleranceDepart),
    PRESENCE_RETARD_GRAVE: String(r.retardGrave),
    PRESENCE_RETARDS_FREQUENTS: String(r.retardsFrequents),
    PRESENCE_ABSENCES_FREQUENTES: String(r.absencesFrequentes),
    PRESENCE_HORAIRE_DEFAUT: `${r.debutDefaut}-${r.finDefaut}`,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = (k: keyof typeof v, libelle: string, aide: string) => (
    <Champ libelle={libelle} aide={aide}>
      <Saisie value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} />
    </Champ>
  );
  return (
    <Modale titre="Réglages de la présence" ouverte fermer={fermer}>
      <div className="grid gap-3 sm:grid-cols-2">
        {champ("PRESENCE_TOLERANCE_ARRIVEE", "Marge à l’arrivée (minutes)", "Le temps des formalités : arrivé dans cette marge, il est à l’heure.")}
        {champ("PRESENCE_TOLERANCE_DEPART", "Marge au départ (minutes)", "Parti plus tôt que cela avant la fin : départ anticipé.")}
        {champ("PRESENCE_RETARD_GRAVE", "Retard important (minutes)", "Signalé en rouge (60 : « 1 h de retard ou plus »).")}
        {champ("PRESENCE_RETARDS_FREQUENTS", "Souvent en retard : à partir de… retards", "Sur la période choisie.")}
        {champ("PRESENCE_ABSENCES_FREQUENTES", "Souvent absent : à partir de… absences", "Absences non justifiées, sur la période.")}
        {champ("PRESENCE_HORAIRE_DEFAUT", "Heures par défaut (lundi à vendredi)", "Sans emploi du temps ni horaire saisi. Ex. 07:30-14:00")}
      </div>
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={async () => {
            setErreur(null);
            try {
              for (const [cle, valeur] of Object.entries(v)) await api.put(`/parametres/${cle}`, { valeur: valeur.trim() });
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
