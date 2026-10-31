"use client";

import Link from "next/link";
import { useState } from "react";
import { ModaleDoublons } from "@/components/doublons";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Champ, Chargement, Liste, Modale, Saisie, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";
import type { Role } from "@/lib/api";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

/* ------------------------------ Types ------------------------------ */

export interface CategorieBourse {
  code: string;
  libelle: string;
  bourse: number;
  equipement: number;
  motsCles: string[];
  actif: boolean;
}

export interface MotifSortie {
  code: string;
  libelle: string;
  arreteBourse: boolean;
  reintegrable: boolean;
  dernierMoisPaye: "MOIS_PRECEDENT" | "MOIS_DE_SORTIE";
  actif: boolean;
}

export type DebutBourse = "MOIS_NOTE" | "MOIS_SUIVANT_NOTE" | "MOIS_PRISE_SERVICE" | "MOIS_SUIVANT_PRISE_SERVICE";

export interface ConfigEnrolement {
  version: 1;
  categories: CategorieBourse[];
  /** Barème des communautaires (0 : montant pas encore fixé). */
  categoriesCommunautaires: CategorieBourse[];
  /** Année d'enrôlement de la 1re vague (2019 : 1re vague 2019-2020). */
  premiereVague: number;
  transport: Record<string, { billet: number | null; bagages: number | null }>;
  debutBourse: DebutBourse;
  dureeMaxMois: number;
  depassementDuree: "SIGNALER" | "ARRETER";
  motifsSortie: MotifSortie[];
  ageMinimum: number;
  ageMaximum: number;
  telephonePartage: number;
  signatairePaiementTitre: string;
  signatairePaiementNom: string;
}

export interface ReponseConfiguration {
  configuration: ConfigEnrolement;
  defaut: ConfigEnrolement;
  departements: { code: string; nom: string }[];
  reglesDebut: Record<DebutBourse, string>;
  controles: Record<string, { libelle: string; gravite: "BLOQUANT" | "SIGNALE" }>;
  boursesParCycle: Record<string, number>;
}

export interface Volontaire {
  id: string;
  /** VOLONTAIRE ou COMMUNAUTAIRE */
  population: string;
  vagueNumero: number | null;
  nomComplet: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  telephone: string | null;
  diplome: string | null;
  specialite: string | null;
  categorie: string | null;
  cycleBrut: string | null;
  departementId: number | null;
  departementBrut: string | null;
  etablissement: string | null;
  vague: string | null;
  noteReference: string | null;
  dateNote: string | null;
  datePriseService: string | null;
  premierMois: string | null;
  statut: "EN_POSTE" | "SORTI";
  motifSortie: string | null;
  dateSortie: string | null;
  observation: string | null;
  source: string | null;
  verifications: Record<string, { par: string; le: string; note: string }>;
  creePar: string | null;
  creeLe: string;
}

export interface Mouvement {
  id: number;
  type: string;
  dateEffet: string | null;
  motif: string | null;
  details: Record<string, unknown> | null;
  par: string | null;
  creeLe: string;
}

/* ------------------------------ Outils ------------------------------ */

export const nf = new Intl.NumberFormat("fr-FR");
export const fcfa = (n: number | string | null | undefined) => `${nf.format(Number(n ?? 0))} FCFA`;
export const dateFr = (d: string | null | undefined) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const moisFr = (m: string | null | undefined) => (m && /^\d{4}-\d{2}$/.test(m) ? `${MOIS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}` : "—");
/** « de septembre 2026 », « d’octobre 2026 » */
export const deMois = (m: string | null | undefined) => {
  const t = moisFr(m);
  return /^[aeiouéèh]/i.test(t) ? `d’${t}` : `de ${t}`;
};

/** Fiches modifiables (sorties, réintégrations, corrections) : chef de service, directeur, DG. */
export const peutGerer = (r?: Role) => !!r && ["ADMIN", "CHEF_SERVICE", "DIRECTEUR", "DG"].includes(r);

export function useConfigEnrolement() {
  return useApi<ReponseConfiguration>("/enrolement/configuration");
}

const TYPE_MOUVEMENT: Record<string, string> = {
  ENTREE: "Entrée dans le registre",
  SORTIE: "Sortie",
  REINTEGRATION: "Réintégration",
  MODIFICATION: "Fiche corrigée",
  VERIFICATION: "Contrôle vérifié",
};

/* ------------------------------ Fiche ------------------------------ */

type Action = null | "modifier" | "sortir" | "reintegrer" | "verifier" | "regulariser";

interface Paiement {
  genre: "BOURSE" | "MISE_EN_ROUTE";
  libelle: string;
  montant: number;
  statut: string;
}

interface RegularisationFiche {
  id: number;
  type: "COMPLEMENT" | "RETENUE";
  montant: number;
  reste: number;
  motif: string;
  statut: string;
  creeLe: string;
}

export const STATUT_REGULARISATION: Record<string, { libelle: string; ton: "jaune" | "vert" | "gris" | "rouge" }> = {
  EN_ATTENTE: { libelle: "En attente", ton: "jaune" },
  SOLDEE: { libelle: "Soldée", ton: "vert" },
  ANNULEE: { libelle: "Annulée", ton: "gris" },
  A_RECOUVRER: { libelle: "À recouvrer", ton: "rouge" },
};

/** Un contrôle de la bourse à régler pour ce volontaire (ouvert depuis Paiement mensuel › Contrôles). */
export interface ProblemeBourse {
  code: string;
  message: string;
  gravite: "BLOQUANT" | "SIGNALE";
  /** Doublon, payé sur l'autre liste : l'autre fiche. */
  autreId?: string;
  /** Mois de l'état de bourse (« 2026-10 ») : date de sortie proposée au 1er du mois. */
  mois?: string;
}

/**
 * Fiche complète d'un volontaire, son historique et les actions possibles. Ouverte depuis un
 * contrôle de la bourse (`probleme`), elle montre d'abord le problème et ce qui le règle, sur place
 * (DG, 28/10/2026 : « la modale correspondante pour régler le problème de la personne »).
 */
export function FicheVolontaire({
  id,
  fermer,
  apres,
  probleme,
  regle,
}: {
  id: string;
  fermer: () => void;
  apres?: () => void;
  probleme?: ProblemeBourse;
  /** Le problème est réglé : la page recalcule et ferme la fiche. */
  regle?: (texte: string) => void;
}) {
  const { profil, refs } = useSession();
  const fiche = useApi<{
    volontaire: Volontaire;
    mouvements: Mouvement[];
    paiements: Paiement[];
    regularisations: RegularisationFiche[];
    personnel: { id: number; numeroFiche: string; taux: number; complet: boolean } | null;
  }>(`/enrolement/volontaires/${id}`);
  const config = useConfigEnrolement();
  const [action, setAction] = useState<Action>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const c = config.donnees?.configuration;
  const v = fiche.donnees?.volontaire;
  const gerer = peutGerer(profil.role);

  const nomCat = (code: string | null) => categoriesDe(c, v?.population ?? "VOLONTAIRE").find((x) => x.code === code)?.libelle ?? code;
  const nomMotif = (code: string | null) => c?.motifsSortie.find((x) => x.code === code)?.libelle ?? code;
  const nomDep = (d: number | null) => refs.departements.find((x) => x.id === d)?.nom;

  function ouvrir(a: Action) {
    setErreur(null);
    if (a === "modifier" && v)
      setForm({
        nomComplet: v.nomComplet,
        dateNaissance: v.dateNaissance ?? "",
        lieuNaissance: v.lieuNaissance ?? "",
        telephone: v.telephone ?? "",
        categorie: v.categorie ?? "",
        departementId: v.departementId ? String(v.departementId) : "",
        etablissement: v.etablissement ?? "",
        vague: v.vague ?? "",
        noteReference: v.noteReference ?? "",
        dateNote: v.dateNote ?? "",
        datePriseService: v.datePriseService ?? "",
        premierMois: v.premierMois ?? "",
        observation: v.observation ?? "",
      });
    else if (a === "verifier") setForm({ controle: probleme?.code ?? "", note: "" });
    else if (a === "regulariser") setForm({ type: "COMPLEMENT", montant: "", motif: "" });
    else setForm({ date: new Date().toISOString().slice(0, 10) });
    setAction(a);
  }

  async function envoyer() {
    setErreur(null);
    try {
      if (action === "modifier")
        await api.put(`/enrolement/volontaires/${id}`, {
          ...Object.fromEntries(Object.entries(form).map(([k, x]) => [k, x === "" ? null : x])),
          departementId: form.departementId ? Number(form.departementId) : null,
        });
      else if (action === "sortir") await api.post(`/enrolement/volontaires/${id}/sortie`, form);
      else if (action === "reintegrer") await api.post(`/enrolement/volontaires/${id}/reintegration`, form);
      else if (action === "verifier") await api.post(`/enrolement/volontaires/${id}/verification`, form);
      else if (action === "regulariser") await api.post("/enrolement/regularisations", { volontaireId: id, type: form.type, montant: Number((form.montant ?? "").replace(/\D/g, "")), motif: form.motif });
      setAction(null);
      fiche.recharger();
      apres?.();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  const ligne = (libelle: string, valeur: React.ReactNode) => (
    <div className="flex gap-3 border-b border-zinc-100 py-1.5 text-[13px] last:border-0">
      <span className="w-44 shrink-0 text-zinc-400">{libelle}</span>
      <span className="min-w-0 flex-1">{valeur || "—"}</span>
    </div>
  );
  const champ = (k: string, libelle: string, type = "text", aide?: string) => (
    <Champ libelle={libelle} aide={aide}>
      {k === "etablissement" || k === "specialite" ? (
        <SaisieReferentiel
          liste={k === "etablissement" ? "ETABLISSEMENT" : "MATIERE"}
          valeur={form[k] ?? ""}
          changer={(x) => setForm({ ...form, [k]: x })}
          departementId={k === "etablissement" ? form.departementId : null}
        />
      ) : (
        <Saisie type={type} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      )}
    </Champ>
  );
  const motifActuel = c?.motifsSortie.find((x) => x.code === v?.motifSortie);

  return (
    <Modale titre={v?.nomComplet ?? "Volontaire"} ouverte fermer={fermer} large>
      {fiche.erreur && <Alerte>{fiche.erreur}</Alerte>}
      {!v || !c ? (
        <Chargement />
      ) : action === null ? (
        <div className="space-y-5">
          {probleme && gerer && v && (
            <PanneauProbleme
              v={v}
              probleme={probleme}
              libelle={config.donnees?.controles[probleme.code]?.libelle ?? probleme.code}
              categories={categoriesDe(c, v.population).filter((x) => x.actif)}
              fini={(texte) => {
                fiche.recharger();
                apres?.();
                regle?.(texte);
              }}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {v.statut === "EN_POSTE" ? <Badge ton="vert">En poste</Badge> : <Badge ton="rouge">Sorti : {nomMotif(v.motifSortie)}</Badge>}
            {v.dateSortie && <span className="text-[12px] text-zinc-500">le {dateFr(v.dateSortie)}</span>}
            {Object.entries(v.verifications ?? {}).map(([k, x]) => (
              <Badge key={k} ton="bleu" titre={`${x.note} — ${x.par}, ${dateFr(x.le)}`}>
                {config.donnees?.controles[k]?.libelle ?? k} : vérifié
              </Badge>
            ))}
          </div>
          <div>
            {ligne("Naissance", [dateFr(v.dateNaissance) !== "—" && dateFr(v.dateNaissance), v.lieuNaissance].filter(Boolean).join(" à "))}
            {ligne("Téléphone", v.telephone)}
            {ligne("Diplôme", [v.diplome, v.specialite].filter(Boolean).join(" · "))}
            {ligne(v.population === "COMMUNAUTAIRE" ? "Cycle (communautaire)" : "Catégorie de bourse", v.categorie ? `${nomCat(v.categorie)} (${fcfa(categoriesDe(c, v.population).find((x) => x.code === v.categorie)?.bourse)})` : <span className="text-rouge-600">à choisir (fichier : « {v.cycleBrut ?? "vide"} »)</span>)}
            {ligne("Département", nomDep(v.departementId) ?? <span className="text-rouge-600">non reconnu (fichier : « {v.departementBrut ?? "vide"} »)</span>)}
            {ligne("Établissement", v.etablissement)}
            {v.population !== "COMMUNAUTAIRE" && ligne("Vague", libelleVague(v.vagueNumero, v.vague))}
            {ligne("Note de service", [v.noteReference, v.dateNote && `du ${dateFr(v.dateNote)}`].filter(Boolean).join(" "))}
            {ligne("Prise de service", dateFr(v.datePriseService))}
            {ligne("Premier mois payé", v.premierMois ? moisFr(v.premierMois) : `selon la règle : ${config.donnees?.reglesDebut[c.debutBourse]?.toLowerCase()}`)}
            {ligne("Observation", v.observation)}
            {ligne("Origine", <span className="text-[12px] text-zinc-500">{v.source}</span>)}
            {fiche.donnees?.personnel &&
              ligne(
                "Base du personnel",
                <Link href={`/personnel/agents/${fiche.donnees.personnel.id}`} className="font-medium text-marque-700 hover:underline">
                  Fiche {fiche.donnees.personnel.numeroFiche} ({fiche.donnees.personnel.complet ? "complète" : `${fiche.donnees.personnel.taux} % remplie`})
                </Link>,
              )}
          </div>
          {(fiche.donnees!.paiements.length > 0 || fiche.donnees!.regularisations.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-[13px] font-semibold">Paiements</h4>
                <ul className="space-y-1 text-[12px]">
                  {fiche.donnees!.paiements.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {p.genre === "BOURSE" ? `Bourse ${moisFr(p.libelle)}` : p.libelle}
                        {p.statut !== "VALIDE" && <span className="text-zinc-400"> (projet)</span>}
                      </span>
                      <span className="tabular-nums">{fcfa(p.montant)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-[13px] font-semibold">Régularisations</h4>
                {!fiche.donnees!.regularisations.length ? (
                  <p className="text-[12px] text-zinc-400">Aucune.</p>
                ) : (
                  <ul className="space-y-1.5 text-[12px]">
                    {fiche.donnees!.regularisations.map((r) => (
                      <li key={r.id}>
                        <span className={r.type === "RETENUE" ? "text-rouge-600" : "text-marque-700"}>
                          {r.type === "RETENUE" ? "Retenue" : "Complément"} {fcfa(r.montant)}
                        </span>{" "}
                        <Badge ton={STATUT_REGULARISATION[r.statut]?.ton ?? "gris"}>{STATUT_REGULARISATION[r.statut]?.libelle ?? r.statut}</Badge>
                        {r.statut === "EN_ATTENTE" && r.reste !== r.montant && <span className="text-zinc-400"> · reste {fcfa(r.reste)}</span>}
                        <div className="text-zinc-500">{r.motif}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <div>
            <h4 className="mb-2 text-[13px] font-semibold">Historique</h4>
            <ul className="space-y-1.5 text-[12px]">
              {fiche.donnees!.mouvements.map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="w-28 shrink-0 text-zinc-400">{dateFr(m.creeLe)}</span>
                  <span>
                    <strong className="font-medium">{TYPE_MOUVEMENT[m.type] ?? m.type}</strong>
                    {m.motif && m.motif !== "REPRISE" && ` · ${nomMotif(m.motif) ?? m.motif}`}
                    {m.dateEffet && ` · effet le ${dateFr(m.dateEffet)}`}
                    {typeof m.details?.note === "string" && ` · « ${m.details.note} »`}
                    {typeof m.details?.observation === "string" && ` · ${m.details.observation}`}
                    {m.par && <span className="text-zinc-400"> — {m.par}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {gerer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
              <Bouton onClick={() => ouvrir("verifier")}>Marquer un contrôle comme vérifié</Bouton>
              <Bouton onClick={() => ouvrir("regulariser")}>Régularisation</Bouton>
              <Bouton onClick={() => ouvrir("modifier")}>Corriger la fiche</Bouton>
              {v.statut === "EN_POSTE" ? (
                <Bouton variante="danger" onClick={() => ouvrir("sortir")}>
                  Sortir du registre
                </Bouton>
              ) : (
                motifActuel?.reintegrable !== false && (
                  <Bouton variante="principal" onClick={() => ouvrir("reintegrer")}>
                    Réintégrer
                  </Bouton>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {action === "modifier" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {champ("nomComplet", "Nom et prénoms")}
              {champ("telephone", "Téléphone")}
              {champ("dateNaissance", "Date de naissance", "date")}
              {champ("lieuNaissance", "Lieu de naissance")}
              <Champ libelle="Catégorie de bourse">
                <Liste value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} vide="— À choisir —" options={categoriesDe(c, v.population).filter((x) => x.actif).map((x) => ({ valeur: x.code, libelle: `${x.libelle} (${fcfa(x.bourse)})` }))} />
              </Champ>
              <Champ libelle="Département">
                <Liste value={form.departementId} onChange={(e) => setForm({ ...form, departementId: e.target.value })} vide="— À choisir —" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
              </Champ>
              {champ("etablissement", "Établissement")}
              {champ("vague", "Vague")}
              {champ("noteReference", "Note de service (n°)")}
              {champ("dateNote", "Date de la note", "date")}
              {champ("datePriseService", "Date de prise de service", "date")}
              {champ("premierMois", "Premier mois payé", "month", "Vide : la règle de la configuration s’applique.")}
              <Champ libelle="Observation" className="sm:col-span-2">
                <Zone value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
              </Champ>
            </div>
          )}
          {action === "sortir" && (
            <>
              <Champ libelle="Motif de la sortie">
                <Liste value={form.motif ?? ""} onChange={(e) => setForm({ ...form, motif: e.target.value })} vide="— Choisir —" options={c.motifsSortie.filter((x) => x.actif).map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
              </Champ>
              {champ("date", "Date de la sortie (prise en charge, abandon de poste…)", "date")}
              {form.motif && form.date && (
                <Alerte ton="jaune">
                  {(() => {
                    const mo = c.motifsSortie.find((x) => x.code === form.motif);
                    if (!mo?.arreteBourse) return "Ce motif n’arrête pas la bourse.";
                    const m = form.date.slice(0, 7);
                    const [a, mm] = m.split("-").map(Number);
                    const prec = mm === 1 ? `${a - 1}-12` : `${a}-${String(mm - 1).padStart(2, "0")}`;
                    return `Dernier mois payé : ${moisFr(mo.dernierMoisPaye === "MOIS_DE_SORTIE" ? m : prec)}.${mo.reintegrable ? " Il pourra être réintégré." : " Ce motif ne permet pas de réintégration."}`;
                  })()}
                </Alerte>
              )}
              <Champ libelle="Observation">
                <Zone value={form.observation ?? ""} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
              </Champ>
            </>
          )}
          {action === "reintegrer" && (
            <>
              {champ("date", "Date de reprise du poste", "date", "La bourse reprend le mois de la reprise.")}
              <Champ libelle="Observation">
                <Zone value={form.observation ?? ""} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
              </Champ>
            </>
          )}
          {action === "verifier" && (
            <>
              <p className="text-[13px] text-zinc-600">Un contrôle vérifié ne bloque plus la bourse de ce volontaire. Notez ce que vous avez constaté : c’est gardé dans son historique.</p>
              <Champ libelle="Contrôle">
                <Liste value={form.controle} onChange={(e) => setForm({ ...form, controle: e.target.value })} vide="— Choisir —" options={Object.entries(config.donnees?.controles ?? {}).map(([k, x]) => ({ valeur: k, libelle: x.libelle }))} />
              </Champ>
              <Champ libelle="Ce qui a été vérifié">
                <Zone value={form.note} placeholder="Ex. : pas la même date de naissance, pièces d’identité vues à la DDEPPSA." onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </Champ>
            </>
          )}
          {action === "regulariser" && (
            <>
              <p className="text-[13px] text-zinc-600">Un complément est versé avec la prochaine bourse ; une retenue est déduite des prochaines bourses (dans la limite de ce qui est payé). Pour un volontaire sorti, la retenue reste « à recouvrer ».</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ libelle="Type">
                  <Liste
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    options={[
                      { valeur: "COMPLEMENT", libelle: "Complément (somme due au volontaire)" },
                      { valeur: "RETENUE", libelle: "Retenue (trop-perçu)" },
                    ]}
                  />
                </Champ>
                {champ("montant", "Montant (FCFA)")}
              </div>
              <Champ libelle="Motif">
                <Zone value={form.motif} placeholder="Ex. : bourse de septembre 2026 payée 60 000 au lieu de 75 000 (lycée compté au collège)." onChange={(e) => setForm({ ...form, motif: e.target.value })} />
              </Champ>
            </>
          )}
          {erreur && <Alerte>{erreur}</Alerte>}
          <div className="flex justify-end gap-2">
            <Bouton onClick={() => setAction(null)}>Retour</Bouton>
            <Bouton variante={action === "sortir" ? "danger" : "principal"} onClick={envoyer}>
              {action === "sortir" ? "Confirmer la sortie" : action === "reintegrer" ? "Réintégrer" : "Enregistrer"}
            </Bouton>
          </div>
        </div>
      )}
      {!peut.traiter(profil.role) && <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>}
    </Modale>
  );
}

/** Les deux listes payées chaque mois. */
export type Population = "VOLONTAIRE" | "COMMUNAUTAIRE";
export const LISTES: Record<Population, { titre: string; un: string; des: string }> = {
  VOLONTAIRE: { titre: "Volontaires", un: "volontaire", des: "volontaires" },
  COMMUNAUTAIRE: { titre: "Communautaires", un: "communautaire", des: "communautaires" },
};
/** Barème d'une liste. */
export const categoriesDe = (c: ConfigEnrolement | undefined, p: string) => (p === "COMMUNAUTAIRE" ? c?.categoriesCommunautaires : c?.categories) ?? [];
/** « 8e vague », « 1re vague », « avant la 1re vague ». */
export const libelleVague = (n: number | null | undefined, brut?: string | null) =>
  n === null || n === undefined ? (brut ?? "—") : n === 0 ? "Avant la 1re vague" : `${n}${n === 1 ? "re" : "e"} vague`;

/** Ce qui règle chaque contrôle, sur place, sans chercher le bon bouton (DG, 28/10/2026). */
function PanneauProbleme({
  v,
  probleme,
  libelle,
  categories,
  fini,
}: {
  v: Volontaire;
  probleme: ProblemeBourse;
  libelle: string;
  categories: { code: string; libelle: string; bourse: number }[];
  fini: (texte: string) => void;
}) {
  const { refs, profil } = useSession();
  const autre = useApi<{ volontaire: Volontaire }>(probleme.autreId ? `/enrolement/volontaires/${probleme.autreId}` : null);
  const [f, setF] = useState<Record<string, string>>({
    categorie: v.categorie ?? "",
    departementId: v.departementId ? String(v.departementId) : "",
    etablissement: v.etablissement ?? "",
    premierMois: v.premierMois ?? "",
    dateNote: v.dateNote ?? "",
    datePriseService: v.datePriseService ?? "",
    note: "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [pasLaMeme, setPasLaMeme] = useState(false);
  // Comparer et supprimer définitivement la fiche en trop (jamais payée), comme partout ailleurs
  const [comparaison, setComparaison] = useState(false);
  const dateSortie = probleme.mois ? `${probleme.mois}-01` : new Date().toISOString().slice(0, 10);
  const a = autre.donnees?.volontaire;

  async function faire(action: () => Promise<unknown>, texte: string) {
    setErreur(null);
    setEnvoi(true);
    try {
      await action();
      fini(texte);
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  const corriger = (champs: Record<string, unknown>, texte: string) => faire(() => api.put(`/enrolement/volontaires/${v.id}`, champs), texte);
  const sortir = (qui: string, motif: string, observation: string, texte: string) => faire(() => api.post(`/enrolement/volontaires/${qui}/sortie`, { motif, date: dateSortie, observation }), texte);
  const verifier = (ids: string[], texte: string) =>
    faire(async () => {
      for (const x of ids) await api.post(`/enrolement/volontaires/${x}/verification`, { controle: probleme.code, note: f.note });
    }, texte);

  const champNote = (
    <Champ libelle="Ce que vous avez constaté *" aide="Gardé dans l’historique : par exemple « pas la même date de naissance, pièces vues à la DDEPPSA ».">
      <Zone value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
    </Champ>
  );
  const comparer = (lib: string, x: (w: Volontaire) => React.ReactNode) => (
    <tr>
      <td className="pr-3 text-zinc-500">{lib}</td>
      <td className="pr-3">{x(v) || "—"}</td>
      <td>{a ? x(a) || "—" : "…"}</td>
    </tr>
  );

  return (
    <div className="space-y-3 rounded-2xl bg-or-100/60 p-4 ring-1 ring-or-300">
      <div>
        <div className="text-[12px] font-semibold tracking-wide text-or-800 uppercase">À régler {probleme.gravite === "BLOQUANT" ? "(bloque la bourse)" : "(signalé)"}</div>
        <div className="text-[15px] font-semibold">{libelle}</div>
        <p className="text-[13px] text-zinc-700">{probleme.message}</p>
      </div>

      {probleme.code === "CATEGORIE" && (
        <div className="flex flex-wrap items-end gap-2">
          <Champ libelle="Catégorie de bourse" className="min-w-64 flex-1">
            <Liste value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} vide="— Choisir —" options={categories.map((x) => ({ valeur: x.code, libelle: `${x.libelle} (${fcfa(x.bourse)})` }))} />
          </Champ>
          <Bouton variante="principal" disabled={!f.categorie || envoi} onClick={() => corriger({ categorie: f.categorie }, "Catégorie enregistrée.")}>
            Enregistrer
          </Bouton>
        </div>
      )}

      {probleme.code === "MONTANT" && (
        <p className="text-[13px] text-zinc-700">
          Ce n’est pas la fiche qui est en cause : le <strong>montant de cette catégorie</strong> n’est pas encore fixé. Fixez-le une fois dans{" "}
          <Link href="/enrolement/configuration" className="font-medium text-marque-700 underline">
            Enrôlement › Configuration
          </Link>{" "}
          : tous les {v.population === "COMMUNAUTAIRE" ? "communautaires" : "volontaires"} de la catégorie sont réglés d’un coup. Si la catégorie est fausse, changez-la avec « Corriger la fiche ».
        </p>
      )}

      {probleme.code === "DEPARTEMENT" && (
        <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Champ libelle="Département">
            <Liste value={f.departementId} onChange={(e) => setF({ ...f, departementId: e.target.value })} vide="— Choisir —" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </Champ>
          <Champ libelle="Établissement">
            <SaisieReferentiel liste="ETABLISSEMENT" valeur={f.etablissement} changer={(x) => setF({ ...f, etablissement: x })} departementId={f.departementId} />
          </Champ>
          <Bouton variante="principal" disabled={!f.departementId || envoi} onClick={() => corriger({ departementId: Number(f.departementId), etablissement: f.etablissement || null }, "Département enregistré.")}>
            Enregistrer
          </Bouton>
        </div>
      )}

      {probleme.code === "DEBUT" && (
        <>
          <p className="text-[13px] text-zinc-700">Remplissez au moins l’un des trois : le premier mois payé, ou la date de la note de service, ou la date de prise de service (la règle de la configuration en déduit le premier mois).</p>
          <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Champ libelle="Premier mois payé">
              <Saisie type="month" value={f.premierMois} onChange={(e) => setF({ ...f, premierMois: e.target.value })} />
            </Champ>
            <Champ libelle="Date de la note">
              <Saisie type="date" value={f.dateNote} onChange={(e) => setF({ ...f, dateNote: e.target.value })} />
            </Champ>
            <Champ libelle="Prise de service">
              <Saisie type="date" value={f.datePriseService} onChange={(e) => setF({ ...f, datePriseService: e.target.value })} />
            </Champ>
            <Bouton
              variante="principal"
              disabled={!(f.premierMois || f.dateNote || f.datePriseService) || envoi}
              onClick={() => corriger({ premierMois: f.premierMois || null, dateNote: f.dateNote || null, datePriseService: f.datePriseService || null }, "Début de la bourse enregistré.")}
            >
              Enregistrer
            </Bouton>
          </div>
        </>
      )}

      {(probleme.code === "DOUBLON" || probleme.code === "AUTRE_LISTE") && (
        <>
          {probleme.autreId ? (
            <div className="overflow-x-auto rounded-xl bg-white p-3 text-[12px] ring-1 ring-zinc-200">
              <table>
                <thead>
                  <tr className="text-left">
                    <th />
                    <th className="pr-3">Cette fiche</th>
                    <th>L’autre fiche</th>
                  </tr>
                </thead>
                <tbody>
                  {comparer("Nom", (w) => w.nomComplet)}
                  {comparer("Liste", (w) => (w.population === "COMMUNAUTAIRE" ? "Communautaires" : "Volontaires"))}
                  {comparer("Naissance", (w) => [dateFr(w.dateNaissance) !== "—" && dateFr(w.dateNaissance), w.lieuNaissance].filter(Boolean).join(" à "))}
                  {comparer("Téléphone", (w) => w.telephone)}
                  {comparer("Département", (w) => refs.departements.find((d) => d.id === w.departementId)?.nom)}
                  {comparer("Établissement", (w) => w.etablissement)}
                  {comparer("Vague", (w) => libelleVague(w.vagueNumero, w.vague))}
                  {comparer("Note de service", (w) => [w.noteReference, w.dateNote && `du ${dateFr(w.dateNote)}`].filter(Boolean).join(" "))}
                  {comparer("Prise de service", (w) => dateFr(w.datePriseService))}
                  {comparer("Origine", (w) => <span className="text-zinc-500">{w.source}</span>)}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[12px] text-zinc-500">Recalculez la bourse pour voir l’autre fiche côte à côte.</p>
          )}
          {!pasLaMeme ? (
            <div className="flex flex-wrap gap-2">
              {probleme.autreId && (
                <>
                  <Bouton variante="principal" disabled={envoi} onClick={() => sortir(probleme.autreId!, "DOUBLON", `Doublon de la fiche gardée (${v.nomComplet}, ${v.etablissement ?? "établissement inconnu"})`, "L’autre fiche est sortie du registre (doublon).")}>
                    Garder cette fiche, sortir l’autre
                  </Bouton>
                  <Bouton disabled={envoi} onClick={() => sortir(v.id, "DOUBLON", `Doublon de la fiche gardée (${a?.nomComplet ?? ""}, ${a?.etablissement ?? "établissement inconnu"})`, "Cette fiche est sortie du registre (doublon).")}>
                    Garder l’autre, sortir celle-ci
                  </Bouton>
                </>
              )}
              <Bouton disabled={envoi} onClick={() => setPasLaMeme(true)}>
                Ce ne sont pas les mêmes personnes
              </Bouton>
              {probleme.code === "DOUBLON" && (
                <Bouton variante="discret" disabled={envoi} onClick={() => setComparaison(true)}>
                  Supprimer définitivement la fiche en trop…
                </Bouton>
              )}
            </div>
          ) : (
            <>
              {champNote}
              <div className="flex gap-2">
                <Bouton onClick={() => setPasLaMeme(false)}>Retour</Bouton>
                <Bouton variante="principal" disabled={f.note.trim().length < 5 || envoi} onClick={() => verifier([v.id, ...(probleme.autreId ? [probleme.autreId] : [])], "Vérifié : ce ne sont pas les mêmes personnes (les deux fiches).")}>
                  Enregistrer : deux personnes différentes
                </Bouton>
              </div>
            </>
          )}
          {comparaison && (
            <ModaleDoublons
              base="VOLONTAIRES"
              id={v.id}
              fermer={() => setComparaison(false)}
              apres={(texte) => {
                setComparaison(false);
                fini(texte);
              }}
            />
          )}
          <p className="text-[11px] text-zinc-500">Une fiche jamais payée peut être supprimée définitivement (« Supprimer… ») ; une fiche déjà payée se sort du registre. La fiche sortie l’est au 1er du mois de la bourse, avec le motif « Doublon (inscrit deux fois) » : elle n’est plus payée. Elle reste dans l’historique.</p>
        </>
      )}

      {probleme.code === "RECRUTE_FP" && (
        <>
          {!pasLaMeme ? (
            <div className="flex flex-wrap gap-2">
              <Bouton variante="principal" disabled={envoi} onClick={() => sortir(v.id, "RECRUTE_FP", probleme.message.replace(/ S’il est recruté.*$/, ""), "Sorti du registre : recruté à la Fonction Publique.")}>
                C’est bien lui : sortir du registre (recruté)
              </Bouton>
              <Bouton disabled={envoi} onClick={() => setPasLaMeme(true)}>
                Ce n’est pas la même personne
              </Bouton>
            </div>
          ) : (
            <>
              {champNote}
              <div className="flex gap-2">
                <Bouton onClick={() => setPasLaMeme(false)}>Retour</Bouton>
                <Bouton variante="principal" disabled={f.note.trim().length < 5 || envoi} onClick={() => verifier([v.id], "Vérifié : ce n’est pas la même personne.")}>
                  Enregistrer
                </Bouton>
              </div>
            </>
          )}
          <p className="text-[11px] text-zinc-500">
            Sorti au 1er du mois de la bourse ({moisFr(probleme.mois ?? "")}) : il n’est pas payé ce mois-là. Plusieurs à la fois : cochez-les dans la liste des contrôles.
          </p>
        </>
      )}

      {probleme.gravite === "SIGNALE" && (
        <>
          <p className="text-[13px] text-zinc-700">Ce contrôle ne bloque pas la bourse. Si tout est en ordre, marquez-le comme vérifié : il ne sera plus signalé pour ce {v.population === "COMMUNAUTAIRE" ? "communautaire" : "volontaire"}.</p>
          {champNote}
          <Bouton variante="principal" disabled={f.note.trim().length < 5 || envoi} onClick={() => verifier([v.id], "Contrôle marqué comme vérifié.")}>
            Marquer comme vérifié
          </Bouton>
        </>
      )}

      {erreur && <Alerte>{erreur}</Alerte>}
      {!peutGerer(profil.role) && <p className="text-[12px] text-zinc-500">Seuls le chef de service, le directeur et le DG règlent les contrôles.</p>}
    </div>
  );
}
