"use client";

import { BookOpen, Check, CheckSquare, FileSpreadsheet, FileText, Lock, Pencil, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Tableau, Vide, Zone, cx, useConfirmation } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

type Statut = "PROPOSEE" | "VALIDEE" | "REJETEE";
type Obs = "RECONDUIT" | "PROMU" | "MUTE" | "PERMUTE" | "RELEVE";

interface Nomination {
  id: number;
  annee: string;
  categorie: string;
  categorieLibelle: string;
  groupe: string | null;
  departementId: number | null;
  departement: string | null;
  circonscription: string | null;
  agentId: number | null;
  nomComplet: string;
  genre: string | null;
  grade: string | null;
  echelon: string | null;
  categorieAgent: string | null;
  echelle: string | null;
  specialite: string | null;
  vague: string | null;
  ancienPoste: string | null;
  nouveauPoste: string | null;
  observation: Obs;
  motif: string | null;
  statut: Statut;
  avisDdeppsa: string | null;
  avisDgrhas: string | null;
  decidePar: string | null;
  modifie: boolean;
  noteId: string | null;
  source: string;
  doublon: string | null;
}

interface Reponse {
  annee: string;
  annees: string[];
  departement: number | null;
  peutDecider: boolean;
  total: number;
  tronque: boolean;
  lignes: Nomination[];
  compteurs: { tous: number; proposees: number; validees: number; rejetees: number; modifiees: number; relevees: number; enNote: number; doublons: number };
  categories: { code: string; libelle: string; groupe: string; gabarit: string }[];
  observations: { code: Obs; libelle: string; feminin: string; proposer: string }[];
}

interface Candidat {
  id: number;
  nomComplet: string;
  statut: string;
  matricule: string | null;
  departement: string | null;
  structure: string | null;
  fonction: string | null;
  grade: string | null;
  echelon: string | null;
  specialite: string | null;
  remarques: string[];
}

const PAGE = 100;
const TON_STATUT: Record<Statut, "jaune" | "vert" | "rouge"> = { PROPOSEE: "jaune", VALIDEE: "vert", REJETEE: "rouge" };
const LIB_STATUT: Record<Statut, string> = { PROPOSEE: "Proposée", VALIDEE: "Validée", REJETEE: "Rejetée" };
const GROUPES = ["Préscolaire", "Primaire", "Collège", "Lycée", "Alphabétisation", "Inspections", "Inspecteurs itinérants", "Directions départementales"];
/**
 * Les mots de la DGRHAS ne changent pas (DG, 28/10/2026) : on les explique. Une ligne par terme,
 * affichée dans le lexique de la page et dans les bulles « ? ».
 */
const LEXIQUE: [string, string][] = [
  ["À reconduire, À muter, À promouvoir, À permuter, À relever", "Ce que la DDEPPSA propose. La décision n’est pas encore prise."],
  ["Reconduit(e)", "Garde le même poste et la même fonction."],
  ["Muté(e)", "Garde sa fonction mais change de poste (autre école, autre inspection)."],
  ["Promu(e)", "Monte en fonction : le surveillant général devient directeur des études, le directeur des études devient proviseur ou directeur…"],
  ["Permuté(e)", "Échange son poste avec un autre cadre (chacun prend la place de l’autre)."],
  ["Relevé(e)", "Retiré de sa fonction : il ne paraît pas dans la note de service. Il reste dans la base : on peut le nommer de nouveau plus tard."],
  ["Proposée", "En attente de la décision de la DGRHAS (commission, avis du ministre)."],
  ["Validée", "Décidée : elle va dans la note de service de sa fonction (sauf un relevé). Elle ne se change plus."],
  ["Rejetée", "La proposition n’est pas retenue."],
  ["Obs.", "L’observation de la note : Reconduit(e), Promu(e), Muté(e), Permuté(e) ou Relevé(e)."],
  ["G/E", "Grade et échelon de l’agent (ex. PCEG 4 : professeur de CEG, 4e échelon)."],
  ["Motif", "Pourquoi : « bon travail rendu », « nécessité de service », « peut mieux faire »… Obligatoire sauf pour une reconduction."],
  ["Fiche de validation", "La liste en Excel, au format de la DGRHAS, pour la commission et les DDEPPSA."],
];
const explication = (mot: string) => LEXIQUE.find(([m]) => m === mot)?.[1] ?? "";

const anneeSuivante = (a: string) => (/^\d{4}-\d{4}$/.test(a) ? `${a.slice(5)}-${Number(a.slice(5)) + 1}` : "");

/**
 * Nominations des cadres de gestion des établissements et des inspections (DGRHAS, 26/10/2026).
 * La DDEPPSA dit, pour chacun, ce que l'on fait (reconduire, muter, promouvoir, permuter, relever)
 * et ajoute les nouveaux pris dans la base du personnel ; la DGRHAS décide ; puis les notes.
 */
export default function Nominations() {
  const { profil, refs } = useSession();
  const [f, setF] = useState({ annee: "", departement: "", groupe: "", categorie: "", statut: "", observation: "", recherche: "", modifiees: "", doublons: "" });
  const [page, setPage] = useState(1);
  const [coches, setCoches] = useState<Set<number>>(new Set());
  const [edition, setEdition] = useState<Nomination | null>(null);
  const [ajout, setAjout] = useState(false);
  const [importer, setImporter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  // « Comment faire » : ouvert la première fois, puis replié si la personne le ferme
  const [guide, setGuide] = useState(() => {
    try {
      return localStorage.getItem("nominations.guide") !== "ferme";
    } catch {
      return true;
    }
  });
  const fermerGuide = () => {
    setGuide(false);
    try {
      localStorage.setItem("nominations.guide", "ferme");
    } catch {
      // stockage indisponible : le guide se rouvrira, sans gravité
    }
  };
  const ouvert = peut.traiter(profil.role) || profil.role === "DDEPPSA" || accesDonne(profil);
  const filtre = qs(f);
  const r = useApi<Reponse>(ouvert ? `/nominations${filtre}` : null);
  const maj = (k: keyof typeof f, v: string) => {
    setF({ ...f, [k]: v });
    setPage(1);
    setCoches(new Set());
  };

  if (!ouvert) return <Alerte>Accès réservé à la DGRHAS et aux directions départementales.</Alerte>;
  const d = r.donnees;
  const libObs = (n: Pick<Nomination, "observation" | "genre" | "statut">) => {
    const o = d?.observations.find((x) => x.code === n.observation);
    if (!o) return n.observation;
    return n.statut === "PROPOSEE" ? o.proposer : n.genre === "F" ? o.feminin : o.libelle;
  };
  const visibles = d?.lignes.slice((page - 1) * PAGE, page * PAGE) ?? [];
  // Lignes en attente parmi celles affichées (sans doublon à trancher) : « Cocher toutes les proposées »
  const aDecider = d?.lignes.filter((n) => n.statut === "PROPOSEE" && !n.doublon && !n.noteId) ?? [];
  const pages = d ? Math.max(1, Math.ceil(d.lignes.length / PAGE)) : 1;

  async function agir(fn: () => Promise<unknown>, ok: string | ((x: unknown) => string)) {
    setErreur(null);
    try {
      const x = await fn();
      setMessage(typeof ok === "string" ? ok : ok(x));
      r.recharger();
      return true;
    } catch (e) {
      setErreur((e as Error).message);
      return false;
    }
  }
  const decider = (decision: Statut) =>
    agir(
      () => api.post<{ faites: number; erreurs: string[] }>("/nominations/decision", { ids: [...coches], decision }),
      (x) => {
        const res = x as { faites: number; erreurs: string[] };
        setCoches(new Set());
        return `${res.faites} nomination(s) ${decision === "VALIDEE" ? "validée(s)" : decision === "REJETEE" ? "rejetée(s)" : "remise(s) en proposition"}.${res.erreurs.length ? ` Non faites : ${res.erreurs.slice(0, 4).join(" ; ")}${res.erreurs.length > 4 ? "…" : ""}` : ""}`;
      },
    );

  return (
    <div className="space-y-5">
      <EnTete
        titre="Nominations"
        sousTitre={
          d?.departement
            ? "Les cadres de gestion de votre département (directeurs, directeurs des études, surveillants généraux, économes, inspecteurs…). Pour chacun, dites ce que l’on fait : reconduire, muter, promouvoir, permuter ou relever, avec le motif. Ajoutez les nouveaux, pris dans la base du personnel. La DGRHAS décide ensuite."
            : "La base des nominations des cadres de gestion des établissements et des inspections. Chaque DDEPPSA propose pour son département ; la DGRHAS (commission, ministre) décide ; les nominations validées vont dans les notes de nomination."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Bouton
              onClick={() => api.telecharger(`/nominations/excel${filtre}`, `Nominations ${d?.annee ?? ""}.xlsx`).catch((e: Error) => setErreur(e.message))}
              title="La liste affichée (avec vos filtres), au format de la fiche de validation de la DGRHAS"
            >
              <FileSpreadsheet /> Fiche de validation (Excel)
            </Bouton>
            <Bouton variante="principal" onClick={() => setAjout(true)} title="Un agent qui n’est pas encore dans la base des nominations : un promu, quelqu’un qui vient d’ailleurs">
              <Plus /> Nouvelle proposition
            </Bouton>
          </div>
        }
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {r.erreur && <Alerte>{r.erreur}</Alerte>}
      {!d ? (
        <Chargement texte="Chargement de la base des nominations…" />
      ) : (
        <>
          {guide ? (
            <div className="relative rounded-2xl bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-sky-950 ring-1 ring-sky-200">
              <button type="button" onClick={fermerGuide} className="absolute top-2 right-3 text-[12px] text-sky-700 underline">
                Masquer
              </button>
              <strong>Comment faire</strong>
              {d.peutDecider ? (
                <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                  <li>Les DDEPPSA font leurs propositions (lignes « Proposée » ; en jaune, ce qu’elles ont changé).</li>
                  <li>
                    Filtrez si besoin (département, fonction…), <strong>cochez</strong> les lignes, puis <strong>Valider</strong> ou <strong>Rejeter</strong> ; « Cocher toutes les proposées » coche d’un coup
                    tout ce qui est affiché. Une ligne seule : le bouton <strong>Valider</strong> de la ligne.
                  </li>
                  <li>
                    Les nominations validées vont dans les <Link href="/notes/nomination" className="font-medium underline">notes de nomination</Link> (« Préparer les notes de nomination »).
                  </li>
                </ol>
              ) : (
                <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                  <li>Chaque ligne est un cadre de votre département, proposé « À reconduire » à son poste. <strong>S’il ne change pas, ne faites rien.</strong></li>
                  <li>
                    S’il change : <strong>Changer</strong> sur sa ligne, puis À muter, À promouvoir, À permuter ou À relever, avec le motif.
                  </li>
                  <li>Un nouveau (promu, venu d’ailleurs) : <strong>Nouvelle proposition</strong>, en le cherchant dans la base du personnel.</li>
                  <li>
                    <strong>Rien à envoyer</strong> : la DGRHAS voit vos propositions dès qu’elles sont enregistrées, puis décide (colonne Décision).
                  </li>
                </ol>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => setGuide(true)} className="inline-flex items-center gap-1 text-[12px] font-medium text-marque-700 underline">
              <BookOpen className="size-3.5" /> Comment faire ?
            </button>
          )}

          {d.peutDecider && (
            <Carte>
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <span className="font-medium">Année scolaire</span>
                <Liste className="w-40" value={f.annee || d.annee} onChange={(e) => maj("annee", e.target.value)} options={(d.annees.length ? d.annees : [d.annee]).map((a) => ({ valeur: a, libelle: a }))} />
                <span className="hidden h-6 w-px bg-zinc-200 md:block" />
                <Bouton
                  title={`Reprend les nominations validées de ${d.annee} (sauf les relevés), chacun « À reconduire » à son poste : le travail de l’année suivante commence`}
                  onClick={async () => {
                    const a = anneeSuivante(d.annee);
                    if (await demander(`Ouvrir l’année ${a} ? Les nominations validées de ${d.annee} (sauf les relevés) sont reprises, chacun proposé « à reconduire » à son poste ; les DDEPPSA ne changent que ce qui change.`, `Ouvrir ${a}`))
                      await agir(
                        () => api.post<{ reprises: number }>("/nominations/annee", { annee: a }),
                        (x) => {
                          maj("annee", a);
                          return `Année ${a} ouverte : ${(x as { reprises: number }).reprises} nomination(s) reprises, à reconduire ou à changer par les DDEPPSA.`;
                        },
                      );
                  }}
                >
                  <RotateCcw /> Ouvrir l’année {anneeSuivante(d.annee)}
                </Bouton>
                <Bouton onClick={() => setImporter(true)} title="Le classeur des nominations de la DGRHAS (feuille « COMPIL ») : un essai d’abord, rien n’est enregistré sans votre accord">
                  <Upload /> Importer la base (Excel)
                </Bouton>
                <Link href="/notes/nomination" className="ml-auto inline-flex items-center gap-1 font-medium text-marque-700 hover:underline">
                  <FileText className="size-4" /> Notes de nomination
                </Link>
              </div>
            </Carte>
          )}

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Chiffre libelle={`Nominations ${d.annee}`} valeur={d.compteurs.tous} />
            <Chiffre libelle="Proposées" valeur={d.compteurs.proposees} ton={d.compteurs.proposees ? "jaune" : "gris"} detail="en attente de la DGRHAS" />
            <Chiffre libelle="Validées" valeur={d.compteurs.validees} ton="vert" detail={`${d.compteurs.enNote} déjà dans une note`} />
            <Chiffre libelle="Modifiées (en jaune)" valeur={d.compteurs.modifiees} ton={d.compteurs.modifiees ? "jaune" : "gris"} detail="changées par la DDEPPSA" />
            <Chiffre libelle="Relevés" valeur={d.compteurs.relevees} ton="gris" detail="ne paraissent pas dans la note" />
            <Chiffre libelle="Doublons" valeur={d.compteurs.doublons} ton={d.compteurs.doublons ? "rouge" : "gris"} detail={d.compteurs.doublons ? "même personne proposée deux fois : à trancher" : "aucun"} />
          </div>

          <Carte>
            <div className="grid gap-3 md:grid-cols-4">
              {!d.departement && (
                <Liste aria-label="Département" value={f.departement} onChange={(e) => maj("departement", e.target.value)} vide="Tous les départements" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
              )}
              <Liste aria-label="Groupe" value={f.groupe} onChange={(e) => maj("groupe", e.target.value)} vide="Tous les cycles et inspections" options={GROUPES.map((g) => ({ valeur: g, libelle: g }))} />
              <Liste
                aria-label="Fonction"
                value={f.categorie}
                onChange={(e) => maj("categorie", e.target.value)}
                vide="Toutes les fonctions"
                options={d.categories.filter((c) => !f.groupe || c.groupe === f.groupe).map((c) => ({ valeur: c.code, libelle: c.libelle }))}
              />
              <Liste
                aria-label="Décision"
                value={f.statut}
                onChange={(e) => maj("statut", e.target.value)}
                vide="Toutes les décisions"
                options={[
                  { valeur: "PROPOSEE", libelle: "Proposées (en attente de la DGRHAS)" },
                  { valeur: "VALIDEE", libelle: "Validées" },
                  { valeur: "REJETEE", libelle: "Rejetées" },
                ]}
              />
              <Liste aria-label="Obs." value={f.observation} onChange={(e) => maj("observation", e.target.value)} vide="Toutes les Obs. (reconduits, mutés, promus…)" options={d.observations.map((o) => ({ valeur: o.code, libelle: o.libelle }))} />
              <div className="md:col-span-2">
                <Saisie value={f.recherche} onChange={(e) => maj("recherche", e.target.value)} placeholder="Nom, poste ou circonscription…" aria-label="Recherche" />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="accent-marque-600" checked={f.modifiees === "1"} onChange={(e) => maj("modifiees", e.target.checked ? "1" : "")} /> Modifiées
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="accent-marque-600" checked={f.doublons === "1"} onChange={(e) => maj("doublons", e.target.checked ? "1" : "")} /> Doublons
                </label>
              </div>
            </div>
          </Carte>

          {d.peutDecider && !!d.lignes.length && (
            <div className={cx("sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-[13px] shadow-lg", coches.size ? "bg-nuit text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200")}>
              {coches.size ? (
                <>
                  <strong>{coches.size} cochée(s)</strong>
                  <Bouton variante="principal" onClick={() => decider("VALIDEE")}>
                    <Check /> Valider
                  </Bouton>
                  <Bouton variante="danger" onClick={() => decider("REJETEE")}>
                    <X /> Rejeter
                  </Bouton>
                  <Bouton onClick={() => decider("PROPOSEE")} title="La ligne redevient « Proposée » (en attente) : on peut de nouveau la changer">
                    <RotateCcw /> Annuler la décision
                  </Bouton>
                  <button type="button" className="ml-auto underline" onClick={() => setCoches(new Set())}>
                    Tout décocher
                  </button>
                </>
              ) : (
                <>
                  <span>Pour décider : cochez les lignes, puis Valider ou Rejeter.</span>
                  {!!aDecider.length && (
                    <Bouton onClick={() => setCoches(new Set(aDecider.map((n) => n.id)))} title="Toutes les lignes « Proposée » affichées (avec vos filtres), sur toutes les pages">
                      <CheckSquare /> Cocher toutes les proposées ({aDecider.length})
                    </Bouton>
                  )}
                </>
              )}
            </div>
          )}

          <Carte titre={`${d.total.toLocaleString("fr-FR")} nomination(s)`}>
            {!d.lignes.length ? (
              <Vide>{d.compteurs.tous ? "Aucune nomination pour ces filtres." : d.peutDecider ? "Aucune nomination pour cette année : importez la base de la DGRHAS, ou ouvrez l’année à partir de la précédente." : "La DGRHAS n’a pas encore ouvert les nominations de l’année."}</Vide>
            ) : (
              <>
                <div className="-mt-2 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-500">
                  <span>
                    <span className="mr-1 inline-block size-3 rounded bg-or-100 align-middle ring-1 ring-or-300" /> En jaune : ce que la DDEPPSA a changé. Une ligne sans changement reste « À reconduire » à son poste.
                  </span>
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-marque-700 underline">Lexique : que veulent dire les mots ?</summary>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 rounded-xl bg-zinc-50 p-3 text-zinc-700 ring-1 ring-zinc-200 sm:grid-cols-[max-content_1fr]">
                      {LEXIQUE.map(([m, e]) => (
                        <div key={m} className="contents">
                          <dt className="font-semibold">{m}</dt>
                          <dd>{e}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </div>
                <Tableau>
                  <thead>
                    <tr>
                      {d.peutDecider && (
                        <th className="w-8">
                          <input
                            type="checkbox"
                            aria-label="Tout cocher sur la page"
                            className="accent-marque-600"
                            checked={visibles.length > 0 && visibles.every((n) => coches.has(n.id))}
                            onChange={(e) => setCoches(e.target.checked ? new Set([...coches, ...visibles.filter((n) => !n.noteId).map((n) => n.id)]) : new Set([...coches].filter((id) => !visibles.some((n) => n.id === id))))}
                          />
                        </th>
                      )}
                      <th>Département · circonscription</th>
                      <th>Fonction</th>
                      <th>Nom et prénoms</th>
                      <th>
                        <span className="inline-flex items-center gap-1">
                          G/E <Aide>{explication("G/E")}</Aide>
                        </span>
                      </th>
                      <th>Ancien poste</th>
                      <th>Nouveau poste</th>
                      <th>
                        <span className="inline-flex items-center gap-1">
                          Obs. et motif <Aide>{explication("Obs.")} « À … » : ce que la DDEPPSA propose, pas encore décidé.</Aide>
                        </span>
                      </th>
                      <th>
                        <span className="inline-flex items-center gap-1">
                          Décision <Aide>Proposée : en attente de la DGRHAS. Validée : va dans la note (sauf un relevé). Rejetée : non retenue.</Aide>
                        </span>
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((n) => (
                      <tr key={n.id} className={cx(n.modifie && "bg-or-100/40", n.observation === "RELEVE" && "text-zinc-400")}>
                        {d.peutDecider && (
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Cocher ${n.nomComplet}`}
                              className="accent-marque-600"
                              disabled={!!n.noteId}
                              checked={coches.has(n.id)}
                              onChange={() => {
                                const s = new Set(coches);
                                if (s.has(n.id)) s.delete(n.id);
                                else s.add(n.id);
                                setCoches(s);
                              }}
                            />
                          </td>
                        )}
                        <td className="text-[12px]">
                          {n.departement ?? <span className="text-rouge-600">département ?</span>}
                          <div className="text-[11px] text-zinc-400">{n.circonscription ?? ""}</div>
                        </td>
                        <td className="text-[12px]">{n.categorieLibelle}</td>
                        <td>
                          {n.agentId ? (
                            <Link href={`/personnel/agents/${n.agentId}`} className="font-medium text-marque-700 hover:underline">
                              {n.nomComplet}
                            </Link>
                          ) : (
                            <span className="font-medium">{n.nomComplet}</span>
                          )}
                          {n.doublon && <div className="text-[11px] font-medium text-rouge-700">Doublon : {n.doublon.replace(/^Proposé\(e\)/, "proposé(e)")}</div>}
                        </td>
                        <td className="text-[12px] whitespace-nowrap">{[n.grade, n.echelon].filter(Boolean).join(" ") || "—"}</td>
                        <td className="text-[12px]">{n.ancienPoste ?? "—"}</td>
                        <td className="text-[12px] font-medium">{n.nouveauPoste ?? "—"}</td>
                        <td className="text-[12px]">
                          <span title={sensObs(n.observation)}>
                            <Badge ton={n.observation === "RELEVE" ? "gris" : n.observation === "RECONDUIT" ? "bleu" : "jaune"}>{libObs(n)}</Badge>
                          </span>
                          {n.motif && <div className="mt-0.5 text-[11px] text-zinc-500">{n.motif}</div>}
                        </td>
                        <td className="text-[12px]">
                          <Badge ton={TON_STATUT[n.statut]}>{LIB_STATUT[n.statut]}</Badge>
                          <div className="text-[11px] text-zinc-500">
                            {n.statut === "PROPOSEE"
                              ? "en attente de la DGRHAS"
                              : n.noteId
                                ? "dans une note de service"
                                : n.statut === "VALIDEE"
                                  ? n.observation === "RELEVE"
                                    ? "ne paraîtra pas dans la note"
                                    : "ira dans la note"
                                  : ""}
                          </div>
                          {n.avisDgrhas && <div className="text-[11px] text-zinc-500">{n.avisDgrhas}</div>}
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {n.statut === "PROPOSEE" ? (
                            <span className="inline-flex gap-1">
                              <Bouton variante="discret" title="Changer la proposition : À muter, À promouvoir, À relever…" onClick={() => setEdition(n)}>
                                <Pencil className="size-4" /> Changer
                              </Bouton>
                              {d.peutDecider && !n.doublon && (
                                <Bouton variante="discret" title="Valider cette seule ligne" onClick={() => agir(() => api.post("/nominations/decision", { ids: [n.id], decision: "VALIDEE" }), `${n.nomComplet} : validé(e).`)}>
                                  <Check className="size-4" /> Valider
                                </Bouton>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400" title={n.noteId ? "Dans une note de service validée : elle ne se change plus" : "Décidée par la DGRHAS : pour la changer, la DGRHAS annule d’abord la décision"}>
                              <Lock className="size-3.5" /> décidée
                            </span>
                          )}
                          {n.statut === "PROPOSEE" && n.source === "SAISIE" && (
                            <Bouton
                              variante="discret"
                              title="Retirer cette proposition ajoutée"
                              onClick={async () => {
                                if (await demander(`Retirer la proposition de ${n.nomComplet} ?`, "Retirer")) await agir(() => api.delete(`/nominations/${n.id}`), "Proposition retirée.");
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Bouton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
                {pages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-[12px] text-zinc-500">
                    <span>
                      Page {page} sur {pages}
                      {d.tronque && " (les 1 500 premières : précisez les filtres)"}
                    </span>
                    <div className="flex gap-2">
                      <Bouton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        Précédente
                      </Bouton>
                      <Bouton disabled={page >= pages} onClick={() => setPage(page + 1)}>
                        Suivante
                      </Bouton>
                    </div>
                  </div>
                )}
              </>
            )}
          </Carte>
        </>
      )}

      {edition && d && (
        <ModaleProposition
          n={edition}
          d={d}
          fermer={() => setEdition(null)}
          apres={() => {
            setEdition(null);
            setMessage("Proposition enregistrée.");
            r.recharger();
          }}
        />
      )}
      {ajout && d && (
        <ModaleAjout
          d={d}
          fermer={() => setAjout(false)}
          apres={() => {
            setAjout(false);
            setMessage("Nouveau proposé : la DGRHAS décidera.");
            r.recharger();
          }}
        />
      )}
      {importer && d && (
        <ModaleImport
          annee={d.annee}
          fermer={() => setImporter(false)}
          apres={(texte) => {
            setImporter(false);
            setMessage(texte);
            r.recharger();
          }}
        />
      )}
      {confirmation}
    </div>
  );
}

/** Le sens d'une observation, en une phrase (lexique de la DGRHAS). */
function sensObs(o: Obs) {
  const mot = { RECONDUIT: "Reconduit(e)", PROMU: "Promu(e)", MUTE: "Muté(e)", PERMUTE: "Permuté(e)", RELEVE: "Relevé(e)" }[o];
  return `${mot} : ${explication(mot)}`;
}

/** Ce que l'on fait de la personne : boutons simples, du plus courant au plus rare. */
function ChoixObservation({ valeur, changer, d }: { valeur: Obs; changer: (o: Obs) => void; d: Reponse }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {d.observations.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => changer(o.code)}
          className={cx("rounded-xl px-2 py-2 text-[13px] ring-1", valeur === o.code ? (o.code === "RELEVE" ? "bg-rouge-600 text-white ring-rouge-600" : "bg-marque-600 text-white ring-marque-600") : "bg-white ring-zinc-200 hover:bg-zinc-50")}
        >
          {o.proposer}
        </button>
      ))}
    </div>
  );
}

function ModaleProposition({ n, d, fermer, apres }: { n: Nomination; d: Reponse; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const [v, setV] = useState({
    observation: n.observation,
    nouveauPoste: n.nouveauPoste ?? "",
    categorie: n.categorie,
    circonscription: n.circonscription ?? "",
    departementId: String(n.departementId ?? ""),
    motif: n.motif ?? "",
    vague: n.vague ?? "",
    avisDdeppsa: n.avisDdeppsa ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const besoinPoste = ["MUTE", "PROMU", "PERMUTE"].includes(v.observation);
  return (
    <Modale titre={`${n.nomComplet} — ${n.categorieLibelle}`} ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">
          Poste actuel : <strong>{n.ancienPoste ?? "—"}</strong>
          {n.circonscription ? ` (${n.circonscription})` : ""}, {n.departement ?? "département ?"}. {[n.grade, n.echelon].filter(Boolean).join(" ")}
        </p>
        <div>
          <div className="mb-1.5 text-xs font-medium text-zinc-500">Que fait-on ?</div>
          <ChoixObservation valeur={v.observation} d={d} changer={(o) => setV({ ...v, observation: o, nouveauPoste: o === "RECONDUIT" ? (n.ancienPoste ?? "") : v.nouveauPoste })} />
          <p className="mt-1.5 text-[12px] text-zinc-500">{sensObs(v.observation)}</p>
        </div>
        {v.observation === "PROMU" && (
          <Champ libelle="Nouvelle fonction" aide="Une promotion change souvent de fonction : le surveillant devient directeur des études, le directeur des études devient proviseur…">
            <Liste value={v.categorie} onChange={(e) => setV({ ...v, categorie: e.target.value })} options={d.categories.map((c) => ({ valeur: c.code, libelle: `${c.groupe} — ${c.libelle}` }))} />
          </Champ>
        )}
        {v.observation !== "RELEVE" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle={besoinPoste ? "Nouveau poste *" : "Poste"}>
              <Saisie value={v.nouveauPoste} onChange={(e) => setV({ ...v, nouveauPoste: e.target.value })} placeholder="École, collège, lycée, inspection…" />
            </Champ>
            <Champ libelle="Circonscription scolaire">
              <Saisie value={v.circonscription} onChange={(e) => setV({ ...v, circonscription: e.target.value })} placeholder="Ex. Madingou" />
            </Champ>
            {!d.departement && (v.observation === "MUTE" || v.observation === "PERMUTE") && (
              <Champ libelle="Département du nouveau poste">
                <Liste value={v.departementId} onChange={(e) => setV({ ...v, departementId: e.target.value })} options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
              </Champ>
            )}
            {/(_DE|_SG)$/.test(v.categorie) && (
              <Champ libelle="Vague">
                <Liste value={v.vague} onChange={(e) => setV({ ...v, vague: e.target.value })} vide="—" options={["A", "B"].map((x) => ({ valeur: x, libelle: `Vague ${x}` }))} />
              </Champ>
            )}
          </div>
        )}
        <Champ libelle={v.observation === "RECONDUIT" ? "Motif (facultatif pour une reconduction)" : "Motif *"} aide="Pourquoi : « bon travail rendu », « nécessité de service », « compétence », « peut mieux faire »…">
          <Zone value={v.motif} onChange={(e) => setV({ ...v, motif: e.target.value })} />
        </Champ>
        <Champ libelle="Avis de la DDEPPSA (facultatif)">
          <Saisie value={v.avisDdeppsa} onChange={(e) => setV({ ...v, avisDdeppsa: e.target.value })} />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={async () => {
            setErreur(null);
            try {
              await api.put(`/nominations/${n.id}`, {
                ...v,
                departementId: v.departementId ? Number(v.departementId) : n.departementId,
              });
              apres();
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Enregistrer la proposition
        </Bouton>
      </div>
    </Modale>
  );
}

/** Nouveau nommé : un agent sur le terrain, pris dans la base du personnel (DGRHAS, 26/10/2026). */
function ModaleAjout({ d, fermer, apres }: { d: Reponse; fermer: () => void; apres: () => void }) {
  const { refs } = useSession();
  const [categorie, setCategorie] = useState("");
  const [q, setQ] = useState("");
  const [trouves, setTrouves] = useState<Candidat[] | null>(null);
  const [agent, setAgent] = useState<Candidat | null>(null);
  const [v, setV] = useState({ observation: "PROMU" as Obs, departementId: d.departement ? String(d.departement) : "", circonscription: "", nouveauPoste: "", ancienPoste: "", motif: "", vague: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 3) return;
    const t = setTimeout(() => {
      api
        .get<Candidat[]>(`/nominations/candidats${qs({ q, categorie })}`)
        .then(setTrouves)
        .catch((e: Error) => setErreur(e.message));
    }, 350);
    return () => clearTimeout(t);
  }, [q, categorie]);
  return (
    <Modale titre="Nouvelle proposition : un cadre qui n’est pas encore dans la base des nominations" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <Champ libelle="Fonction *">
          <Liste value={categorie} onChange={(e) => setCategorie(e.target.value)} vide="— Choisir —" options={d.categories.map((c) => ({ valeur: c.code, libelle: `${c.groupe} — ${c.libelle}` }))} />
        </Champ>
        {!agent ? (
          <div>
            <Champ libelle="L’agent, dans la base du personnel *" aide="Tapez son nom ou son matricule. On ne nomme qu’un agent sur le terrain : un enseignant du cycle, fonctionnaire ou contractuel.">
              <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou matricule (3 lettres au moins)" />
            </Champ>
            {trouves && (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {!trouves.length && <li className="text-zinc-500">Personne trouvé dans la base du personnel.</li>}
                {trouves.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setAgent(a);
                        setV({ ...v, ancienPoste: a.structure ?? "" });
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left ring-1 ring-zinc-200 hover:bg-zinc-50"
                    >
                      <div className="font-medium">
                        {a.nomComplet} <span className="font-normal text-zinc-500">· {a.statut.toLowerCase()}{a.matricule ? ` · ${a.matricule}` : ""}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500">{[a.fonction, a.specialite, a.structure, a.departement, [a.grade, a.echelon].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</div>
                      {a.remarques.map((x) => (
                        <div key={x} className="text-[11px] text-or-700">
                          ⚠ {x}
                        </div>
                      ))}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <div>
              <div className="font-medium">{agent.nomComplet}</div>
              <div className="text-[11px] text-zinc-500">{[agent.fonction, agent.specialite, agent.structure, agent.departement].filter(Boolean).join(" · ")}</div>
              {agent.remarques.map((x) => (
                <div key={x} className="text-[11px] text-or-700">
                  ⚠ {x}
                </div>
              ))}
            </div>
            <Bouton variante="discret" onClick={() => setAgent(null)}>
              Changer
            </Bouton>
          </div>
        )}
        <div>
          <div className="mb-1.5 text-xs font-medium text-zinc-500">Que fait-on ?</div>
          <ChoixObservation valeur={v.observation} d={{ ...d, observations: d.observations.filter((o) => o.code !== "RELEVE" && o.code !== "RECONDUIT") }} changer={(o) => setV({ ...v, observation: o })} />
          <p className="mt-1.5 text-[12px] text-zinc-500">{sensObs(v.observation)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {!d.departement && (
            <Champ libelle="Département *">
              <Liste value={v.departementId} onChange={(e) => setV({ ...v, departementId: e.target.value })} vide="— Choisir —" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
            </Champ>
          )}
          <Champ libelle="Circonscription scolaire">
            <Saisie value={v.circonscription} onChange={(e) => setV({ ...v, circonscription: e.target.value })} placeholder="Ex. Madingou" />
          </Champ>
          <Champ libelle="Poste actuel">
            <Saisie value={v.ancienPoste} onChange={(e) => setV({ ...v, ancienPoste: e.target.value })} />
          </Champ>
          <Champ libelle="Nouveau poste *">
            <Saisie value={v.nouveauPoste} onChange={(e) => setV({ ...v, nouveauPoste: e.target.value })} placeholder="École, collège, lycée, inspection…" />
          </Champ>
          {/(_DE|_SG)$/.test(categorie) && (
            <Champ libelle="Vague">
              <Liste value={v.vague} onChange={(e) => setV({ ...v, vague: e.target.value })} vide="—" options={["A", "B"].map((x) => ({ valeur: x, libelle: `Vague ${x}` }))} />
            </Champ>
          )}
        </div>
        <Champ libelle="Motif *">
          <Zone value={v.motif} onChange={(e) => setV({ ...v, motif: e.target.value })} placeholder="Ex. Compétent, a fait ses preuves comme surveillant général" />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          disabled={!agent || !categorie}
          title={!agent ? "Choisissez d’abord l’agent dans la base du personnel" : undefined}
          onClick={async () => {
            setErreur(null);
            try {
              await api.post("/nominations", {
                ...v,
                annee: d.annee,
                agentId: agent?.id,
                categorie,
                departementId: v.departementId ? Number(v.departementId) : undefined,
              });
              apres();
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Proposer
        </Bouton>
      </div>
    </Modale>
  );
}

interface RapportImport {
  feuille: string;
  feuilles: { nom: string; lignes: number }[];
  lues: number;
  creees: number;
  validees: number;
  proposees: number;
  relevees: number;
  reliees: number;
  dejaLa: number;
  vacants: number;
  sansCategorie: number;
  sansDepartement: number;
  fonctionsInconnues: { cycle: string; fonction: string; n: number }[];
  essai: boolean;
}

/** Import de la base des nominations de la DGRHAS : d'abord un essai (rien n'est enregistré). */
function ModaleImport({ annee, fermer, apres }: { annee: string; fermer: () => void; apres: (texte: string) => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [a, setA] = useState(annee);
  const [feuille, setFeuille] = useState("");
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  async function envoyer(essai: boolean) {
    if (!fichier) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      const x = await api.post<RapportImport>(`/nominations/import${qs({ annee: a, feuille, essai: essai ? "1" : "0" })}`, fd);
      if (essai) {
        setRapport(x);
        setFeuille(x.feuille);
      } else apres(`${x.creees} nomination(s) importée(s) pour ${a} (feuille « ${x.feuille} »).`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Modale titre="Importer la base des nominations" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <p className="text-zinc-600">
          Le classeur de la DGRHAS (« MEPPSA_Nominations … Base de données ») : une ligne par personne, avec le département, la circonscription, le cycle, la fonction, le grade, l’ancien et le
          nouveau poste et l’observation. « Reconduit », « Promu », « Muté » : validée ; « À reconduire », « À promouvoir »… : proposée ; « À pourvoir » (sans nom) : ignorée.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Année scolaire de ces nominations">
            <Saisie value={a} onChange={(e) => setA(e.target.value)} placeholder="2025-2026" />
          </Champ>
          <Champ libelle="Classeur Excel">
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFichier(e.target.files?.[0] ?? null);
                setRapport(null);
              }}
            />
          </Champ>
        </div>
        {rapport && (
          <>
            <Champ libelle="Feuille à importer" aide="Par défaut « COMPILATION » (toutes les nominations). Les autres feuilles reprennent souvent les mêmes personnes.">
              <Liste value={feuille} onChange={(e) => setFeuille(e.target.value)} options={rapport.feuilles.map((x) => ({ valeur: x.nom, libelle: `${x.nom} (${x.lignes} lignes)` }))} />
            </Champ>
            <Alerte ton="bleu">
              Essai sur « {rapport.feuille} » : {rapport.lues} lignes lues, <strong>{rapport.creees} nomination(s) à importer</strong> ({rapport.validees} validées, {rapport.proposees} proposées, dont{" "}
              {rapport.relevees} relevées) ; {rapport.reliees} reliées à leur fiche du personnel ; {rapport.vacants} postes à pourvoir ou sans nom ignorés ; {rapport.dejaLa} déjà là ;{" "}
              {rapport.sansCategorie} fonction(s) non reconnue(s) ; {rapport.sansDepartement} sans département.
            </Alerte>
            {!!rapport.fonctionsInconnues.length && (
              <p className="text-[12px] text-or-700">Fonctions non reconnues (lignes ignorées) : {rapport.fonctionsInconnues.map((x) => `${x.fonction} (${x.cycle}) ×${x.n}`).join(" ; ")}.</p>
            )}
          </>
        )}
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton disabled={!fichier} chargement={envoi} onClick={() => envoyer(true)}>
          {rapport ? "Refaire l’essai" : "Vérifier le fichier"}
        </Bouton>
        {rapport && (
          <Bouton variante="principal" chargement={envoi} onClick={() => envoyer(false)}>
            Importer {rapport.creees} nomination(s)
          </Bouton>
        )}
      </div>
    </Modale>
  );
}
