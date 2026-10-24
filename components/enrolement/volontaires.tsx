"use client";

import Link from "next/link";
import { useState } from "react";
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

/** Fiche complète d'un volontaire, son historique et les actions possibles. */
export function FicheVolontaire({ id, fermer, apres, controle }: { id: string; fermer: () => void; apres?: () => void; controle?: string }) {
  const { profil, refs } = useSession();
  const fiche = useApi<{
    volontaire: Volontaire;
    mouvements: Mouvement[];
    paiements: Paiement[];
    regularisations: RegularisationFiche[];
    personnel: { id: number; numeroFiche: string; taux: number; complet: boolean } | null;
  }>(`/enrolement/volontaires/${id}`);
  const config = useConfigEnrolement();
  const [action, setAction] = useState<Action>(controle ? "verifier" : null);
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
    else if (a === "verifier") setForm({ controle: controle ?? "", note: "" });
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
