"use client";

import { Award, Briefcase, Star, CircleDot, FileText, MapPin, Paperclip, Pencil, Printer, Trash2, TrendingUp, Upload, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { type ChampFiche, type ConfigRecensement, SaisieRubrique } from "@/components/recensement/commun";
import { Alerte, Badge, BoutonIcone, Bouton, Carte, Champ, Chargement, Liste, Modale, Saisie, Zone, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import type { Ton } from "@/lib/libelles";

export interface ElementCarriere {
  genre: "STATUT" | "GRADE" | "AFFECTATION" | "MUTATION" | "PRESTATION" | "EVENEMENT" | "EVALUATION";
  id: string;
  date: string | null;
  type: string | null;
  /** Colonne « Nature » : intégration, engagement, promotion, affectation… */
  nature: string;
  intitule: string;
  acte: string | null;
  lieu: string | null;
  changements: {
    champ: string;
    libelle: string;
    de: string | null;
    vers: string;
  }[];
  commentaire: string | null;
  fichier: boolean;
  origine: string | null;
  modifiable: boolean;
  reporte?: boolean;
  saisie?: Saisie;
}
interface Saisie {
  type: string;
  dateEffet: string | null;
  acteNature: string | null;
  acteNumero: string | null;
  acteDate: string | null;
  nouveau: Record<string, unknown>;
  commentaire: string | null;
  reporter?: boolean;
  /** Événement saisi avec un ancien type : il se modifie sans changer de type. */
  ancienAccepte?: boolean;
}
export interface DossierCarriere {
  agent: {
    id: number;
    numeroFiche: string | null;
    nomComplet: string;
    dateNaissance: string | null;
    lieuNaissance: string | null;
    genre: string | null;
    nationalite: string | null;
    matricule: string | null;
    statut: string;
    libelleStatut: string;
  };
  famille: {
    situationMatrimoniale: string | null;
    nombreEnfants: string | null;
    enfants: { nom: string | null; naissance: string | null; pere: string | null; mere: string | null }[];
  };
  /** Signature de la fiche imprimée : le Directeur général. */
  signature: { titre: string; nom: string | null; lieu: string };
  situation: {
    valeurs: Record<string, { libelle: string; valeur: string | null }>;
    /** Dernière promotion (fonctionnaire) ou dernier avancement (contractuel), et le prochain. */
    avancement: {
      nature: "PROMOTION" | "AVANCEMENT";
      libelle: string;
      depuis: string;
      origine: "DERNIER" | "ENTREE";
      prochain: string;
    } | null;
    echelonDepuis: string | null;
    echelle: {
      libelle: string;
      dureeEchelonMois: number | null;
      nombreEchelons: number | null;
    } | null;
    prochainEchelon: string | null;
    /** Promotions (ou avancements) attendues depuis la dernière, avec l'échelon attendu. */
    attendues?: { date: string; echelon: number | null; echelle?: string | null }[];
    dernierEchelon: boolean;
  };
  elements: ElementCarriere[];
  types: {
    code: string;
    libelle: string;
    aide: string | null;
    /** Ancien type : affiché, mais plus proposé pour un nouvel événement. */
    ancien?: boolean;
    rubriques: { code: string }[];
  }[];
  actes: { code: string; libelle: string }[];
}

export const dateFr = (d: string | null | undefined) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "");

export const GENRES: Record<ElementCarriere["genre"], { libelle: string; ton: Ton }> = {
  STATUT: { libelle: "Entrée", ton: "vert" },
  GRADE: { libelle: "Grade et échelon", ton: "jaune" },
  AFFECTATION: { libelle: "Affectation", ton: "bleu" },
  MUTATION: { libelle: "Mutation", ton: "bleu" },
  PRESTATION: { libelle: "Prestation", ton: "gris" },
  EVENEMENT: { libelle: "Carrière", ton: "jaune" },
  EVALUATION: { libelle: "Évaluation", ton: "gris" },
};
const ICONES: Record<ElementCarriere["genre"], typeof CircleDot> = {
  STATUT: UserRound,
  GRADE: TrendingUp,
  AFFECTATION: MapPin,
  MUTATION: MapPin,
  PRESTATION: FileText,
  EVALUATION: Star,
  EVENEMENT: Award,
};
const POINTS: Record<Ton, string> = {
  vert: "bg-marque-600 text-white",
  bleu: "bg-sky-600 text-white",
  jaune: "bg-or-500 text-white",
  gris: "bg-zinc-400 text-white",
  rouge: "bg-rouge-600 text-white",
};

/**
 * Dossier de carrière d'un agent : sa situation actuelle, puis tout ce qui lui est arrivé depuis son
 * entrée (statuts, affectations, mutations, avancements, nominations…), chaque fois avec son acte.
 */
export function CarteCarriere({
  c,
  agentId,
  peutModifier,
  departementId,
  attente,
  apres,
}: {
  c: ConfigRecensement;
  agentId: number;
  peutModifier: boolean;
  departementId?: number | null;
  /** Modifications de la fiche pas encore enregistrées : un événement rechargerait la fiche. */
  attente?: string | null;
  apres: () => void;
}) {
  const d = useApi<DossierCarriere>(`/recensement/agents/${agentId}/carriere`);
  const [edition, setEdition] = useState<{
    id: string | null;
    saisie: Saisie;
  } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const fichier = useRef<HTMLInputElement>(null);
  const [cible, setCible] = useState<string | null>(null);
  const recharger = () => {
    d.recharger();
    apres();
  };

  async function joindre(f: File) {
    if (!cible) return;
    setErreur(null);
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      await api.post(`/recensement/agents/${agentId}/carriere/${cible}/acte`, fd);
      d.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  return (
    <Carte
      titre="Dossier de carrière"
      actions={
        <div className="flex gap-2">
          <Bouton variante="discret" onClick={() => window.open(`/impression/carriere/${agentId}`, "_blank")}>
            <Printer className="size-3.5" /> Imprimer le dossier
          </Bouton>
          {peutModifier && (
            <Bouton
              variante="principal"
              disabled={!!attente}
              title={attente ?? undefined}
              onClick={() =>
                setEdition({
                  id: null,
                  saisie: {
                    type: "PROMOTION",
                    dateEffet: "",
                    acteNature: "ARRETE",
                    acteNumero: "",
                    acteDate: "",
                    nouveau: {},
                    commentaire: "",
                  },
                })
              }
            >
              Ajouter un événement
            </Bouton>
          )}
        </div>
      }
    >
      {d.erreur ? (
        <Alerte>{d.erreur}</Alerte>
      ) : !d.donnees ? (
        <Chargement />
      ) : (
        <>
          <Situation d={d.donnees} />
          <p className="mt-4 mb-3 text-[12px] text-zinc-500">
            Tout ce qui est arrivé à l’agent depuis son entrée, avec l’acte de chaque étape. L’intégration ou l’engagement, les grades et échelons successifs de la fiche, les notes d’affectation et
            les mutations accordées s’ajoutent seuls ; les promotions, avancements, reclassements, nominations et changements de position se saisissent ici (y compris les anciens, pour
            reconstituer le dossier) et mettent la fiche à jour.
          </p>
          <Frise
            elements={d.donnees.elements}
            peutModifier={peutModifier}
            ouvrir={(e) => api.ouvrirFichier(`/recensement/agents/${agentId}/carriere/${e.id}/acte`)}
            joindre={(e) => {
              setCible(e.id);
              fichier.current?.click();
            }}
            modifier={(e) => e.saisie && setEdition({ id: e.id, saisie: { ...e.saisie, reporter: e.reporte !== false, ancienAccepte: !!d.donnees?.types.find((t) => t.code === e.saisie?.type)?.ancien } })}
            supprimer={async (e) => {
              const ch = e.changements.length && e.reporte ? " La fiche reprendra les valeurs d’avant (si elles n’ont pas été changées depuis)." : "";
              if (!(await demander(`Annuler « ${e.intitule} » du ${dateFr(e.date)} ?${ch}`, "Annuler l’événement"))) return;
              try {
                await api.delete(`/recensement/agents/${agentId}/carriere/${e.id}`);
                recharger();
              } catch (x) {
                setErreur((x as Error).message);
              }
            }}
          />
          <input
            ref={fichier}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void joindre(f);
            }}
          />
          {erreur && (
            <div className="mt-3">
              <Alerte>{erreur}</Alerte>
            </div>
          )}
          {edition && (
            <Edition
              c={c}
              dossier={d.donnees}
              agentId={agentId}
              id={edition.id}
              depart={edition.saisie}
              departementId={departementId}
              fermer={() => setEdition(null)}
              apres={() => {
                setEdition(null);
                recharger();
              }}
            />
          )}
        </>
      )}
      {confirmation}
    </Carte>
  );
}

/** Situation actuelle, en tête du dossier. */
export function Situation({ d }: { d: DossierCarriere }) {
  const v = d.situation.valeurs;
  const val = (k: string) => v[k]?.valeur ?? null;
  const classement = [val("CATEGORIE") && `Catégorie ${val("CATEGORIE")}`, val("ECHELLE") && `Échelle ${val("ECHELLE")}`, val("ECHELON") && `Échelon ${val("ECHELON")}`].filter(Boolean).join(" · ");
  const av = d.situation.avancement;
  const du = d.situation.prochainEchelon && d.situation.prochainEchelon <= new Date().toISOString().slice(0, 10);
  const mot = av?.nature === "AVANCEMENT" ? "avancement" : "promotion";
  const cases: { l: string; v: React.ReactNode }[] = [
    { l: "Statut", v: d.agent.libelleStatut },
    { l: "Matricule solde", v: d.agent.matricule ?? "—" },
    { l: "Grade", v: val("GRADE") ?? "—" },
    { l: "Classement", v: classement || "—" },
    {
      l: av?.libelle ?? (d.agent.statut === "CONTRACTUEL" ? "Date du dernier avancement" : "Date de dernière promotion"),
      v: av ? (
        <>
          {av.origine === "DERNIER" ? dateFr(av.depuis) : <span className="text-zinc-500">aucune (entrée le {dateFr(av.depuis)})</span>}
          {d.situation.dernierEchelon ? (
            <span className="block text-[11px] text-zinc-500">dernier échelon de l’échelle</span>
          ) : d.situation.prochainEchelon ? (
            <span className={`block text-[11px] ${du ? "font-semibold text-or-700" : "text-zinc-500"}`}>
              {du ? (mot === "avancement" ? "avancement dû depuis le " : "promotion due depuis le ") : mot === "avancement" ? "prochain avancement le " : "prochaine promotion le "}
              {dateFr(d.situation.prochainEchelon)}
            </span>
          ) : null}
        </>
      ) : (
        "date inconnue"
      ),
    },
    { l: "Fonction", v: val("FONCTION") ?? "—" },
    { l: "Lieu de service", v: val("LIEU_SERVICE") ?? "—" },
    {
      l: "Position",
      v: [val("POSITION"), val("STATUT_ACTIVITE")].filter(Boolean).join(" · ") || "—",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-zinc-200 ring-1 ring-zinc-200 sm:grid-cols-4">
      {cases.map((x) => (
        <div key={x.l} className="bg-white px-3 py-2">
          <div className="text-[11px] text-zinc-500">{x.l}</div>
          <div className="text-[13px] font-medium text-encre">{x.v}</div>
        </div>
      ))}
    </div>
  );
}

function Frise({
  elements,
  peutModifier,
  ouvrir,
  joindre,
  modifier,
  supprimer,
}: {
  elements: ElementCarriere[];
  peutModifier: boolean;
  ouvrir: (e: ElementCarriere) => void;
  joindre: (e: ElementCarriere) => void;
  modifier: (e: ElementCarriere) => void;
  supprimer: (e: ElementCarriere) => void;
}) {
  if (!elements.length) return <p className="text-[13px] text-zinc-500">Rien encore dans le dossier.</p>;
  return (
    <ol className="relative ml-3 border-l border-zinc-200">
      {elements.map((e) => {
        const g = GENRES[e.genre];
        const Icone = e.genre === "EVENEMENT" && e.type === "NOMINATION" ? Briefcase : ICONES[e.genre];
        return (
          <li key={e.id} className="relative mb-4 pl-6 last:mb-0">
            <span className={`absolute -left-3 top-0.5 flex size-6 items-center justify-center rounded-full ring-4 ring-white ${POINTS[g.ton]}`}>
              <Icone className="size-3.5" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-20 text-[12px] font-semibold tabular-nums text-zinc-700">{e.date ? dateFr(e.date) : "date ?"}</span>
              <Badge ton={g.ton}>{e.nature || g.libelle}</Badge>
              <span className="text-[13px] font-semibold text-encre">{e.intitule}</span>
              {e.lieu && <span className="text-[13px] text-zinc-600">· {e.lieu}</span>}
              {e.modifiable && peutModifier && (
                <span className="ml-auto flex gap-1">
                  {e.fichier ? (
                    <BoutonIcone libelle="Voir l’acte" onClick={() => ouvrir(e)}>
                      <Paperclip />
                    </BoutonIcone>
                  ) : null}
                  <BoutonIcone libelle={e.fichier ? "Remplacer le scan de l’acte" : "Joindre le scan de l’acte"} onClick={() => joindre(e)}>
                    <Upload />
                  </BoutonIcone>
                  <BoutonIcone libelle="Modifier" onClick={() => modifier(e)}>
                    <Pencil />
                  </BoutonIcone>
                  <BoutonIcone libelle="Annuler l’événement" onClick={() => supprimer(e)}>
                    <Trash2 />
                  </BoutonIcone>
                </span>
              )}
              {e.modifiable && !peutModifier && e.fichier && (
                <span className="ml-auto">
                  <BoutonIcone libelle="Voir l’acte" onClick={() => ouvrir(e)}>
                    <Paperclip />
                  </BoutonIcone>
                </span>
              )}
            </div>
            <div className="mt-0.5 space-y-0.5 pl-22 text-[12px] text-zinc-600">
              {!!e.changements.length && (
                <div>
                  {e.changements.map((x, i) => (
                    <span key={x.champ}>
                      {i > 0 && " · "}
                      {x.libelle} : {x.de && x.de !== x.vers ? <span className="text-zinc-400 line-through">{x.de}</span> : null} {x.de && x.de !== x.vers ? "→ " : ""}
                      <strong className="text-encre">{x.vers}</strong>
                    </span>
                  ))}
                </div>
              )}
              {e.acte && (
                <div>
                  <FileText className="mr-1 inline size-3 text-zinc-400" />
                  {e.acte}
                  {e.modifiable && !e.fichier && <span className="text-zinc-400"> (scan non joint)</span>}
                </div>
              )}
              {e.commentaire && <div className="italic">{e.commentaire}</div>}
              {e.modifiable && e.reporte === false && !!e.changements.length && (
                <div className="text-[11px] text-zinc-400">Pour l’historique : un événement plus récent fixe la situation actuelle.</div>
              )}
              {e.origine && <div className="text-[11px] text-zinc-400">{e.origine}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Saisie ou modification d'un événement de carrière. */
function Edition({
  c,
  dossier,
  agentId,
  id,
  depart,
  departementId,
  fermer,
  apres,
}: {
  c: ConfigRecensement;
  dossier: DossierCarriere;
  agentId: number;
  id: string | null;
  depart: Saisie;
  departementId?: number | null;
  fermer: () => void;
  apres: () => void;
}) {
  const [s, setS] = useState<Saisie>(depart);
  const [scan, setScan] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  /** Événement déjà enregistré dont seul le scan a échoué : réessayer ne renvoie que le scan. */
  const [sansScan, setSansScan] = useState<string | null>(null);
  const t = dossier.types.find((x) => x.code === s.type);
  const rubriques = (t?.rubriques ?? []).map((r) => c.champs.find((x) => x.code === r.code)).filter((x): x is ChampFiche => !!x);
  const maj = (p: Partial<Saisie>) => setS((x) => ({ ...x, ...p }));

  async function enregistrer() {
    setErreur(null);
    setEnvoi(true);
    try {
      // Seules les rubriques du type choisi partent
      const nouveau = Object.fromEntries(rubriques.filter((r) => s.nouveau[r.code] !== undefined && s.nouveau[r.code] !== "").map((r) => [r.code, s.nouveau[r.code]]));
      const corps = {
        ...s,
        nouveau,
        acteDate: s.acteDate || null,
        acteNature: s.acteNature || null,
      };
      const e = sansScan ? { id: sansScan } : id ? await api.put<{ id: string }>(`/recensement/agents/${agentId}/carriere/${id}`, corps) : await api.post<{ id: string }>(`/recensement/agents/${agentId}/carriere`, corps);
      if (scan) {
        const fd = new FormData();
        fd.append("fichier", scan);
        try {
          await api.post(`/recensement/agents/${agentId}/carriere/${e.id}/acte`, fd);
        } catch (x) {
          setSansScan(e.id);
          throw new Error(`L’événement est enregistré, mais pas le scan de l’acte : ${(x as Error).message} « Réessayer » ne renvoie que le scan ; vous pouvez aussi fermer et le joindre plus tard.`);
        }
      }
      apres();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={id ? "Modifier l’événement" : `Nouvel événement de carrière — ${dossier.agent.nomComplet}`} ouverte fermer={fermer} large>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Événement *" aide={t?.aide ?? undefined}>
          <Liste
            value={s.type}
            onChange={(e) => maj({ type: e.target.value })}
            options={dossier.types
              .filter((x) => !x.ancien || x.code === depart.type)
              .map((x) => ({
                valeur: x.code,
                libelle: x.libelle,
              }))}
          />
        </Champ>
        <Champ libelle="Date d’effet *" aide="Un événement plus ancien que le dernier ne change pas la fiche : il complète l’historique.">
          <Saisie type="date" value={s.dateEffet ?? ""} onChange={(e) => maj({ dateEffet: e.target.value })} />
        </Champ>
        <Champ libelle="Acte">
          <Liste
            value={s.acteNature ?? ""}
            vide="— Sans acte —"
            onChange={(e) => maj({ acteNature: e.target.value })}
            options={dossier.actes.map((x) => ({
              valeur: x.code,
              libelle: x.libelle,
            }))}
          />
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="N° de l’acte">
            <Saisie value={s.acteNumero ?? ""} onChange={(e) => maj({ acteNumero: e.target.value })} placeholder="Ex. 1234/MEPPSA" />
          </Champ>
          <Champ libelle="Date de l’acte">
            <Saisie type="date" value={s.acteDate ?? ""} onChange={(e) => maj({ acteDate: e.target.value })} />
          </Champ>
        </div>
      </div>
      {!!rubriques.length && (
        <div className="mt-4 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-zinc-700">Ce qui change (laisser vide ce qui ne change pas)</span>
            <label className="flex items-center gap-1.5 text-[12px] text-zinc-700" title="Décochez pour un événement ancien : il complète seulement l’historique.">
              <input type="checkbox" checked={s.reporter !== false} onChange={(e) => maj({ reporter: e.target.checked })} />
              Mettre la fiche à jour
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {rubriques.map((r) => (
              <div key={r.code}>
                <SaisieRubrique
                  ch={r}
                  valeur={s.nouveau[r.code] ?? ""}
                  changer={(v) => maj({ nouveau: { ...s.nouveau, [r.code]: v } })}
                  requis={false}
                  manquant={false}
                  departementId={departementId}
                />
                <div className="mt-0.5 text-[11px] text-zinc-500">Actuellement : {dossier.situation.valeurs[r.code]?.valeur ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Champ libelle="Commentaire">
          <Zone value={s.commentaire ?? ""} onChange={(e) => maj({ commentaire: e.target.value })} placeholder="Ex. avancement au choix, sanction : blâme…" />
        </Champ>
        <Champ libelle="Scan de l’acte (PDF, JPG, PNG)" aide={scan ? scan.name : "Facultatif : il peut être joint plus tard."}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setScan(e.target.files?.[0] ?? null)} className="text-[12px]" />
        </Champ>
      </div>
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        {/* Événement déjà enregistré : fermer met aussi la liste à jour */}
        <Bouton onClick={sansScan ? apres : fermer}>{sansScan ? "Fermer" : "Annuler"}</Bouton>
        <Bouton variante="principal" disabled={envoi} onClick={enregistrer}>
          {sansScan ? "Réessayer" : id ? "Enregistrer" : "Ajouter au dossier"}
        </Bouton>
      </div>
    </Modale>
  );
}
