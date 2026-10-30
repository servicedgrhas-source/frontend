"use client";

import { ArrowRight, Check, Circle, FileText, History, Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, BoutonIcone, Chargement, Modale, ZoneFichier, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte, peut, STATUT_NOTE } from "@/lib/libelles";
import type { StatutNote } from "@/lib/types";

/** Tout ce qui concerne un dossier, renvoyé par « /dossiers/:id ». */
export interface Dossier {
  id: string;
  /** Sa fiche dans la Base du personnel, si on la retrouve (même nom et même date de naissance). */
  ficheId?: number | null;
  etape: string;
  etapes: { titre: string; fait: boolean; detail: string | null }[];
  /** Notes signées hors du système où figure la personne (fichier de contrôle des affectations). */
  doubleAffectation?: boolean;
  notesHorsSysteme?: { brut: string; lieuAffectation: string | null; service: string | null; lieuService: string | null; source: string }[];
  identite: {
    nomComplet: string;
    dateNaissance: string | null;
    dateNaissanceBrute: string | null;
    lieuNaissance: string | null;
    diplome: string | null;
    cycle: string | null;
    grade: string | null;
    gradeLibelle: string | null;
    classification: string | null;
    contractuel: boolean | null;
    age: number | null;
    dateAge: string;
    provisoire: boolean;
    statutImpose: boolean;
  };
  recrutement: {
    feuille: string;
    origineFiche: string;
    quota: number | null;
    statut: string | null;
    lotCommission: string | null;
    numeroOrdre: number | null;
    numeroListe: number | null;
    departement: string | null;
    lieuService: string | null;
    dateDepot: string | null;
    observation: string | null;
    origine: string | null;
    membreCommission: string | null;
    saisiePar: string | null;
    controleePar: string | null;
    valideePar: string | null;
    contentieuxAge: string | null;
    remarqueControle: string | null;
    reporteDe: number | null;
    reportMotif: string | null;
    misDeCoteMotif: string | null;
    misDeCoteLe: string | null;
    anomalies: string[];
  };
  fp: {
    transmission: string | null;
    transmisLe: string | null;
    rectifiee: boolean;
    typeTexte: "ARRETE" | "DECRET" | null;
    numeroTexte: string | null;
    reference: string | null;
    dateReception: string | null;
    lot: { numero: number; libelle: string } | null;
    paquet: string | null;
    textePointePar: string | null;
  };
  affectation: {
    statut: string;
    typeNote: string;
    departement: string | null;
    etablissement: string | null;
    structure: string | null;
    specialite: string | null;
    motifExclusion: string | null;
    lotNumero: number | null;
  } | null;
  note: { id: string; statut: StatutNote; numero: string | null; dateSignature: string | null; libelle: string; definitive: boolean } | null;
  mutations: { id: string; numero: number; motif: string; instruction: string | null; retiree: boolean }[];
  historique: { date: string; action: string; par: string | null }[];
}

const ACTIONS: Record<string, string> = {
  SAISIE_CANDIDAT: "Candidat saisi",
  MODIFICATION_CANDIDAT: "Fiche modifiée",
  CONTROLE_CANDIDAT: "Fiche contrôlée",
  RETOUR_CANDIDAT: "Fiche renvoyée pour correction",
  CONTENTIEUX_AGE: "Décision sur le contentieux d’âge",
  MISE_DE_COTE: "Mis de côté (FP : dossier incomplet)",
  RATTACHEMENT_TRANSMISSION: "Remis dans sa transmission",
  ANNULATION_REPORT: "Mise à part annulée",
  ANNULATION_RECEPTION: "Retiré d’un texte reçu",
  CORRECTION_AGENT: "Fiche corrigée",
  MODIFICATION_AFFECTATION: "Affectation modifiée",
};

/** Fenêtre « Fiche du dossier » : le fil du dossier et toutes ses informations. */
export function FicheDossier({ id, fermer }: { id: string; fermer: () => void }) {
  const { donnees: d, erreur } = useApi<Dossier>(`/dossiers/${id}`);
  return (
    <Modale titre={d ? d.identite.nomComplet : "Fiche du dossier"} ouverte large fermer={fermer}>
      {erreur && <Alerte>{erreur}</Alerte>}
      {!d ? (
        <Chargement />
      ) : (
        <div className="space-y-5 text-[13px]">
          <Fil d={d} />

          {(d.recrutement.anomalies.length > 0 || d.recrutement.remarqueControle || d.recrutement.misDeCoteMotif) && (
            <Alerte ton="jaune">
              {d.recrutement.remarqueControle && <div>À corriger : {d.recrutement.remarqueControle}</div>}
              {d.recrutement.misDeCoteMotif && <div>Mis de côté : {d.recrutement.misDeCoteMotif}</div>}
              {d.recrutement.anomalies.length > 0 && <div>À vérifier : {d.recrutement.anomalies.join(" · ")}</div>}
            </Alerte>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Bloc titre="La personne">
              <Info l="Né(e) le" v={d.identite.dateNaissance ? dateCourte(d.identite.dateNaissance) : d.identite.dateNaissanceBrute ? `illisible (« ${d.identite.dateNaissanceBrute} »)` : null} />
              <Info l="Lieu de naissance" v={d.identite.lieuNaissance} />
              <Info l="Diplôme" v={d.identite.diplome} />
              <Info l="Grade" v={d.identite.grade ? `${d.identite.grade}${d.identite.gradeLibelle ? ` – ${d.identite.gradeLibelle}` : ""}` : null} />
              <Info l="Classification" v={d.identite.classification} />
              <Info
                l="Statut"
                v={
                  d.identite.contractuel === null
                    ? "à préciser (date de naissance)"
                    : `${d.identite.contractuel ? "Contractuel" : "Fonctionnaire"}${d.identite.statutImpose ? " (écrit sur le texte)" : d.identite.age !== null ? ` · ${d.identite.age} ans au ${dateCourte(d.identite.dateAge)}` : ""}${d.identite.provisoire ? " · prévision, texte pas encore signé" : ""}`
                }
              />
            </Bloc>
            <Bloc titre="Le recrutement">
              <Info l="Liste" v={d.recrutement.feuille === "QUOTA_AUTRES" ? "Quota « Autres »" : `Quota ${d.recrutement.quota ?? "?"}${d.recrutement.statut ? ` · ${d.recrutement.statut}` : ""}`} />
              <Info l="Lot de la commission" v={d.recrutement.lotCommission ? `${d.recrutement.lotCommission}${d.recrutement.numeroOrdre ? ` · n° d’ordre ${d.recrutement.numeroOrdre}` : ""}` : null} />
              <Info l="Département" v={d.recrutement.departement} />
              <Info l="Lieu de service" v={d.recrutement.lieuService} />
              <Info l="Dépôt du dossier" v={d.recrutement.dateDepot ? dateCourte(d.recrutement.dateDepot) : null} />
              <Info l="Origine (interne)" v={d.recrutement.origine} />
              <Info l="Membre de la commission" v={d.recrutement.membreCommission} />
              <Info l="Mis à part" v={d.recrutement.reporteDe ? `venant du quota ${d.recrutement.reporteDe}${d.recrutement.reportMotif ? ` : ${d.recrutement.reportMotif}` : ""}` : null} />
              <Info l="Observation" v={d.recrutement.observation} />
            </Bloc>
            <Bloc titre="Fonction Publique">
              <Info l="Envoi" v={d.fp.transmission ? `${d.fp.transmission}${d.fp.transmisLe ? `, le ${dateCourte(d.fp.transmisLe)}` : ""}${d.fp.rectifiee ? " (corrigé après envoi)" : ""}` : "pas encore envoyé"} />
              <Info l="Texte" v={d.fp.numeroTexte ? `${d.fp.typeTexte === "DECRET" ? "Décret" : "Arrêté"} n° ${d.fp.reference ?? d.fp.numeroTexte}` : d.fp.transmission ? "attendu" : null} />
              <Info l="Reçu le" v={d.fp.dateReception ? `${dateCourte(d.fp.dateReception)}${d.fp.paquet ? ` (${d.fp.paquet.toLowerCase()})` : ""}` : null} />
              <Info l="Lot de réception" v={d.fp.lot?.libelle ?? null} />
            </Bloc>
            <Bloc titre="Affectation">
              {!d.affectation ? (
                <p className="text-zinc-400">{d.fp.lot ? "Pas encore préparée." : "Après la réception du texte."}</p>
              ) : (
                <>
                  <Info l="Note" v={d.affectation.typeNote} />
                  <Info l="Département" v={d.affectation.departement} />
                  <Info l="Établissement / structure" v={d.affectation.etablissement ?? d.affectation.structure} />
                  <Info l="Spécialité" v={d.affectation.specialite} />
                  <Info l="Retiré de la note" v={d.affectation.motifExclusion} />
                </>
              )}
              {d.note && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2">
                  <FileText className="size-4 text-zinc-400" />
                  <span className="min-w-0 flex-1">
                    {d.note.libelle}
                    {d.note.numero ? ` · n° ${d.note.numero}` : ""}
                    {d.note.dateSignature ? ` du ${dateCourte(d.note.dateSignature)}` : ""}
                  </span>
                  <Badge ton={STATUT_NOTE[d.note.statut].ton}>{STATUT_NOTE[d.note.statut].libelle}</Badge>
                </div>
              )}
              {!!d.notesHorsSysteme?.length && (
                <div className={`mt-2 rounded-2xl px-3 py-2 ${d.doubleAffectation ? "bg-rouge-100/60" : "bg-zinc-50"}`}>
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase">Notes signées hors du système</div>
                  {d.notesHorsSysteme.map((x) => (
                    <div key={x.brut} className="mt-1">
                      Note n° {x.brut}
                      {x.lieuAffectation ? ` · ${x.lieuAffectation}` : ""}
                      {x.lieuService ? ` · ${x.lieuService}` : ""}
                      {x.service ? ` · ${x.service}` : ""}
                    </div>
                  ))}
                  {d.doubleAffectation && (
                    <div className="mt-1 text-[12px] font-medium text-rouge-600">
                      Affectée deux fois{d.note?.numero && d.affectation?.statut === "AFFECTE" ? ` (aussi dans la note n° ${d.note.numero} du système)` : ""} : voir « Rapprochement et contrôles › Notes déjà signées ».
                    </div>
                  )}
                </div>
              )}
            </Bloc>
          </div>

          <Scans id={d.id} />

          {d.mutations.length > 0 && (
            <Bloc titre="Demandes de mutation au même nom">
              <p className="mb-1 text-[11px] text-zinc-400">Même nom : vérifiez qu’il s’agit bien de la même personne (homonyme possible).</p>
              {d.mutations.map((m) => (
                <Link key={m.id} href={`/mutation/${m.id}`} className="flex items-center gap-2 py-1 text-marque-700 hover:underline">
                  Demande n° {m.numero} · {m.motif.toLowerCase().replaceAll("_", " ")}
                  {m.retiree ? " · retirée" : m.instruction ? ` · ${m.instruction === "ACCORDEE" ? "accordée" : "refusée"}` : " · en cours"}
                  <ArrowRight className="size-3" />
                </Link>
              ))}
            </Bloc>
          )}

          {d.historique.length > 0 && (
            <details className="rounded-2xl bg-zinc-50 px-4 py-3">
              <summary className="flex cursor-pointer items-center gap-2 font-medium text-zinc-600">
                <History className="size-4" /> Historique ({d.historique.length})
              </summary>
              <ul className="mt-2 space-y-1 text-[12px] text-zinc-600">
                {d.historique.map((h, i) => (
                  <li key={i}>
                    {new Date(h.date).toLocaleDateString("fr-FR")} · {ACTIONS[h.action] ?? h.action.toLowerCase().replaceAll("_", " ")}
                    {h.par ? ` · ${h.par}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
            {/* Toutes ses informations d'un coup : sa fiche, ou la Base du personnel cherchée à son nom */}
            <Lien href={d.ficheId ? `/personnel/agents/${d.ficheId}` : `/personnel/agents?recherche=${encodeURIComponent(d.identite.nomComplet)}`}>Voir sa fiche</Lien>
            {d.note && (
              <Lien href={`/note/${d.note.id}`}>Ouvrir la note de service</Lien>
            )}
            {d.affectation?.lotNumero && <Lien href={`/affectations?lot=${d.affectation.lotNumero}`}>Ouvrir dans « Affectations »</Lien>}
            {d.fp.lot && !d.affectation && <Lien href="/lots">Voir le lot de réception</Lien>}
            {!d.fp.transmission && d.recrutement.feuille === "MEPPSA" && d.recrutement.origineFiche === "SAISIE" && <Lien href="/candidats">Ouvrir dans « Saisie des candidats »</Lien>}
          </div>
        </div>
      )}
    </Modale>
  );
}

interface Piece {
  id: string;
  nature: "TEXTE" | "AUTRE";
  legalise: boolean;
  nomOrigine: string;
  taille: number;
  ajoutePar: string | null;
  creeLe: string;
}

/** Scans joints : le texte de la FP (légalisé ou non), pour le réimprimer s'il est perdu. */
function Scans({ id }: { id: string }) {
  const { profil } = useSession();
  const pieces = useApi<Piece[]>(`/dossiers/${id}/pieces`);
  const [envoi, setEnvoi] = useState(false);
  const [legalise, setLegalise] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const controleur = peut.controler(profil.role);

  async function joindre(f: File) {
    const fd = new FormData();
    fd.append("fichier", f);
    fd.append("nature", "TEXTE");
    fd.append("legalise", legalise ? "1" : "0");
    setEnvoi(true);
    setErreur(null);
    try {
      await api.post(`/dossiers/${id}/pieces`, fd);
      pieces.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Bloc titre="Scan du texte de la FP">
      {confirmation}
      {!!pieces.donnees?.length && (
        <ul className="mb-3 space-y-1.5">
          {pieces.donnees.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2">
              <Paperclip className="size-4 text-zinc-400" />
              <button type="button" className="min-w-0 flex-1 text-left text-marque-700 hover:underline" onClick={() => api.ouvrirFichier(`/dossiers/${id}/pieces/${p.id}`).catch((e: Error) => setErreur(e.message))}>
                {p.nomOrigine}
              </button>
              <label className="inline-flex items-center gap-1.5 text-[12px] text-zinc-600" title="Le texte porte le cachet « Certifié conforme »">
                <input
                  type="checkbox"
                  className="size-4 accent-marque-500"
                  checked={p.legalise}
                  onChange={async () => {
                    await api.patch(`/dossiers/${id}/pieces/${p.id}`, { legalise: !p.legalise }).catch((e: Error) => setErreur(e.message));
                    pieces.recharger();
                  }}
                />
                légalisé
              </label>
              <span className="text-[11px] text-zinc-400">
                {new Date(p.creeLe).toLocaleDateString("fr-FR")} · {p.ajoutePar ?? "—"}
              </span>
              {controleur && (
                <BoutonIcone
                  libelle="Retirer ce scan"
                  ton="rouge"
                  onClick={async () => {
                    if (!(await demander(`Retirer le scan « ${p.nomOrigine} » de ce dossier ?`))) return;
                    await api.delete(`/dossiers/${id}/pieces/${p.id}`).catch((e: Error) => setErreur(e.message));
                    pieces.recharger();
                  }}
                >
                  <Trash2 />
                </BoutonIcone>
              )}
            </li>
          ))}
        </ul>
      )}
      {pieces.donnees && !pieces.donnees.length && <p className="mb-2 text-zinc-400">Aucun scan pour l’instant.</p>}
      <label className="mb-2 inline-flex items-center gap-2 text-[12px] text-zinc-600">
        <input type="checkbox" className="size-4 accent-marque-500" checked={legalise} onChange={(e) => setLegalise(e.target.checked)} />
        Le texte scanné est légalisé (cachet « Certifié conforme au registre »)
      </label>
      <ZoneFichier accept=".pdf,.jpg,.jpeg,.png" envoi={envoi} envoyer={joindre} libelleBouton="Joindre le scan" aide="PDF, JPG ou PNG, 15 Mo au plus" />
      {erreur && <div className="mt-2 text-[12px] text-rouge-600">{erreur}</div>}
    </Bloc>
  );
}

/** Le fil du dossier : chaque étape cochée ou à venir. */
function Fil({ d }: { d: Dossier }) {
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-3 rounded-2xl bg-marque-50/60 px-4 py-3">
      {d.etapes.map((e, i) => (
        <li key={e.titre} className="flex min-w-36 flex-1 items-start gap-2">
          <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full ${e.fait ? "bg-marque-500 text-white" : "bg-zinc-200 text-zinc-400"}`}>
            {e.fait ? <Check className="size-3" /> : <Circle className="size-2" />}
          </span>
          <span className="min-w-0">
            <span className={`block text-[12px] font-semibold ${e.fait ? "text-encre" : "text-zinc-400"}`}>
              {i + 1}. {e.titre}
            </span>
            {e.detail && <span className="block text-[11px] text-zinc-500">{e.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl ring-1 ring-zinc-200 px-4 py-3">
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{titre}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Info({ l, v }: { l: string; v: ReactNode | null | undefined }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 text-zinc-400">{l}</span>
      <span className="min-w-0 text-encre">{v}</span>
    </div>
  );
}

function Lien({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-xl bg-nuit px-3 py-2 text-[12px] font-medium text-white transition hover:opacity-90">
      {children} <ArrowRight className="size-3.5" />
    </Link>
  );
}
