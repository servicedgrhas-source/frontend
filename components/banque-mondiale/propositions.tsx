"use client";

import { Building2, Check, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { peutControlerAjout } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Modale, Vide, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

/*
 * Les propositions d'ajout du volet Banque mondiale (DG, 18/11/2026). Le volet n'écrit jamais dans
 * nos bases : il propose. Une personne absente de nos bases est validée au contrôle des
 * modifications (Recensement), une école hors organigramme par le DG (Administration ›
 * Organigramme). Valider crée la fiche ou l'école ; rejeter ne change rien.
 */

interface Proposition {
  id: number;
  type: "AGENT" | "ECOLE";
  donnees: Record<string, unknown>;
  source: string | null;
  faitePar: string | null;
  faiteLe: string;
  memeNom?: number;
}

const quand = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ");
const nf = new Intl.NumberFormat("fr-FR");
const STATUTS: Record<string, string> = { FONCTIONNAIRE: "Fonctionnaire", CONTRACTUEL: "Contractuel", VOLONTAIRE: "Volontaire", COMMUNAUTAIRE: "Communautaire" };
const CYCLES: Record<string, string> = { PRESCOLAIRE: "Préscolaire", PRIMAIRE: "Primaire", COLLEGE: "Collège", LYCEE: "Lycée", ALPHABETISATION: "Alphabétisation" };
const RUBRIQUES: [string, string][] = [
  ["DATE_NAISSANCE", "Naissance"],
  ["GENRE", "Genre"],
  ["MATRICULE_SOLDE", "Matricule"],
  ["LIEU_SERVICE", "Lieu de service"],
  ["FONCTION", "Fonction"],
  ["DATE_PRISE_SERVICE", "Prise de service"],
  ["DEPARTEMENT", "Département"],
];
const dateFr = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : v);

function useDecision(chemin: string, recharger: () => void) {
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [doublon, setDoublon] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const valider = async (id: number, forcer = false, ok = "Proposition validée.") => {
    setErreur(null);
    setDoublon(null);
    setEnvoi(id);
    try {
      await api.post(`${chemin}/${id}/valider`, { forcer });
      setMessage(ok);
      recharger();
    } catch (x) {
      const m = (x as Error).message;
      setErreur(m);
      if (/Déjà recensé/i.test(m)) setDoublon(id);
    } finally {
      setEnvoi(null);
    }
  };
  const rejeter = async (id: number, note: string) => {
    setErreur(null);
    setEnvoi(id);
    try {
      await api.post(`${chemin}/${id}/rejeter`, { note });
      setMessage("Proposition rejetée : rien n’a été créé.");
      recharger();
      return true;
    } catch (x) {
      setErreur((x as Error).message);
      return false;
    } finally {
      setEnvoi(null);
    }
  };
  return { envoi, erreur, doublon, message, setMessage, valider, rejeter };
}

function ModaleRejet({ fermer, rejeter }: { fermer: () => void; rejeter: (note: string) => Promise<boolean> }) {
  const [motif, setMotif] = useState("");
  return (
    <Modale titre="Rejeter la proposition" ouverte fermer={fermer}>
      <div className="space-y-3">
        <p className="text-[13px] text-zinc-600">Rien n’est créé. Dites pourquoi : la personne qui a proposé le lira dans le volet Banque mondiale.</p>
        <Champ libelle="Motif du rejet *">
          <Zone value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. la personne a quitté l’école ; l’école est fermée" />
        </Champ>
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="danger" disabled={!motif.trim()} onClick={async () => (await rejeter(motif)) && fermer()}>
            Rejeter
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/** Recensement : les personnes proposées à l'ajout, à valider (création de la fiche) ou rejeter. */
export function PropositionsAgents() {
  const { profil } = useSession();
  const r = useApi<{ total: number; lignes: Proposition[] }>("/propositions-ajout");
  const d = useDecision("/propositions-ajout", r.recharger);
  const [rejet, setRejet] = useState<number | null>(null);
  const controleur = peutControlerAjout(profil.role) || profil.role === "DG";
  if (!r.donnees?.total && !r.erreur) return null;
  return (
    <Carte titre={`Personnes proposées à l’ajout (Banque mondiale)${r.donnees ? ` (${nf.format(r.donnees.total)})` : ""}`}>
      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
        Des personnes des rapports de fin d’année des DDEPPSA, absentes de nos bases. <strong>Aucune fiche n’existe encore</strong> :{" "}
        {controleur ? "« Valider » crée la fiche avec ce que donne le rapport ; « Rejeter » ne crée rien." : "le bureau du contrôle les valide (création de la fiche) ou les rejette."} Regardez d’abord s’il y a déjà
        des fiches au même nom.
      </p>
      <Annonce fermer={() => d.setMessage(null)}>{d.message}</Annonce>
      {(r.erreur || d.erreur) && <Alerte>{r.erreur ?? d.erreur}</Alerte>}
      {!r.donnees ? (
        <Chargement />
      ) : !r.donnees.lignes.length ? (
        <Vide>Aucune proposition en attente.</Vide>
      ) : (
        <ul className="space-y-2">
          {r.donnees.lignes.map((p) => {
            const x = (p.donnees.donnees ?? {}) as Record<string, string>;
            return (
              <li key={p.id} className="flex flex-wrap items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[14px] font-semibold">{x.NOMS_PRENOMS}</span>
                    <Badge ton="gris">{STATUTS[String(p.donnees.statut)] ?? String(p.donnees.statut)}</Badge>
                    {!!p.memeNom && <Badge ton="jaune">{nf.format(p.memeNom)} fiche(s) au même nom dans la base : à regarder</Badge>}
                  </div>
                  <div className="mt-1 text-[12px] text-zinc-600">
                    {RUBRIQUES.filter(([k]) => x[k])
                      .map(([k, l]) => `${l} : ${dateFr(x[k])}`)
                      .join(" · ")}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-400">
                    {p.source} · proposée par {p.faitePar ?? "—"} le {quand(p.faiteLe)}
                  </div>
                  {d.doublon === p.id && (
                    <div className="mt-2">
                      <Bouton chargement={d.envoi === p.id} onClick={() => void d.valider(p.id, true, "Fiche créée (autre personne que l’homonyme).")}>
                        C’est une autre personne : créer quand même
                      </Bouton>
                    </div>
                  )}
                </div>
                {controleur && (
                  <div className="flex shrink-0 gap-1.5">
                    <Bouton chargement={d.envoi === p.id} onClick={() => void d.valider(p.id, false, `Fiche créée pour « ${x.NOMS_PRENOMS} ».`)}>
                      <UserPlus /> Valider
                    </Bouton>
                    <Bouton variante="danger" disabled={d.envoi === p.id} onClick={() => setRejet(p.id)}>
                      <X /> Rejeter
                    </Bouton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rejet !== null && <ModaleRejet fermer={() => setRejet(null)} rejeter={(note) => d.rejeter(rejet, note)} />}
    </Carte>
  );
}

/** Organigramme : les écoles proposées depuis le volet Banque mondiale, à valider par le DG. */
export function PropositionsEcoles({ apres }: { apres?: () => void }) {
  const { profil } = useSession();
  const r = useApi<{ total: number; lignes: Proposition[] }>("/propositions-ecoles");
  const d = useDecision("/propositions-ecoles", () => {
    r.recharger();
    apres?.();
  });
  const [rejet, setRejet] = useState<number | null>(null);
  const dg = peut.modifierConfiguration(profil.role);
  if (!r.donnees?.total && !r.erreur) return null;
  return (
    <Carte titre={`Écoles proposées par le volet Banque mondiale${r.donnees ? ` (${nf.format(r.donnees.total)})` : ""}`}>
      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
        Des écoles connues seulement par le nom écrit dans les fichiers, proposées à l’organigramme. <strong>Elles n’y sont pas encore</strong> :{" "}
        {dg ? "« Valider » crée l’école sous l’inspection indiquée ; « Rejeter » ne crée rien." : "le DG les valide ou les rejette."}
      </p>
      <Annonce fermer={() => d.setMessage(null)}>{d.message}</Annonce>
      {(r.erreur || d.erreur) && <Alerte>{r.erreur ?? d.erreur}</Alerte>}
      {!r.donnees ? (
        <Chargement />
      ) : (
        <ul className="space-y-2">
          {r.donnees.lignes.map((p) => {
            const x = p.donnees as Record<string, string | number | null>;
            return (
              <li key={p.id} className="flex flex-wrap items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Building2 className="size-4 text-zinc-400" />
                    <span className="text-[14px] font-semibold">{x.nom}</span>
                    <Badge ton="gris">{CYCLES[String(x.cycle)] ?? x.cycle}</Badge>
                  </div>
                  <div className="mt-1 text-[12px] text-zinc-600">
                    Sous l’inspection : <strong>{x.inspection}</strong> · {x.departement}
                    {x.personnes ? ` · ${nf.format(Number(x.personnes))} personne(s) y sont comptées` : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-400">
                    {p.source} · proposée par {p.faitePar ?? "—"} le {quand(p.faiteLe)}
                  </div>
                </div>
                {dg && (
                  <div className="flex shrink-0 gap-1.5">
                    <Bouton chargement={d.envoi === p.id} onClick={() => void d.valider(p.id, false, `« ${x.nom} » est ajoutée à l’organigramme.`)}>
                      <Check /> Valider
                    </Bouton>
                    <Bouton variante="danger" disabled={d.envoi === p.id} onClick={() => setRejet(p.id)}>
                      <X /> Rejeter
                    </Bouton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rejet !== null && <ModaleRejet fermer={() => setRejet(null)} rejeter={(note) => d.rejeter(rejet, note)} />}
    </Carte>
  );
}
