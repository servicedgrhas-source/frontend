"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { useSession } from "./session";
import { Alerte, Badge, Bouton, Carte, Champ, Modale, Saisie } from "./ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Oublie {
  id: string;
  nomComplet: string;
  dateNaissance: string | null;
  liste: string;
  diplome: string | null;
  grade: string | null;
  specialite: string | null;
  departement: string | null;
  texte: string | null;
  typeTexte: string | null;
  lot: string | null;
  etat: "A_CONTROLER" | "DEJA_AFFECTE" | "PAS_AFFECTE";
  ajouteLe: string;
  ajoutePar: string | null;
  decidePar: string | null;
  decideLe: string | null;
  affectation: { statut: string; dansUneNote: boolean; motif: string | null } | null;
}

const ETAT: Record<Oublie["etat"], { libelle: string; ton: "jaune" | "gris" | "vert" }> = {
  A_CONTROLER: { libelle: "À contrôler", ton: "jaune" },
  DEJA_AFFECTE: { libelle: "Déjà affecté : hors des notes", ton: "gris" },
  PAS_AFFECTE: { libelle: "Pas encore affecté : entre dans les notes", ton: "vert" },
};

const jour = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

/**
 * Liste des oubliés (DG, 31/10/2026) : les personnes ajoutées à la main dans la base des recrutés
 * attendent un contrôle avant d'entrer dans une note. Déjà affectée : hors des notes ; pas encore
 * affectée : dans les notes de son lot ; supprimée : ajoutée par erreur.
 */
export function ListeOublies({ apres }: { apres: (texte: string) => void }) {
  const { profil } = useSession();
  const liste = useApi<Oublie[]>("/recrutes/oublies");
  const [voirDecides, setVoirDecides] = useState(false);
  const [deja, setDeja] = useState<Oublie | null>(null);
  const [precision, setPrecision] = useState("");
  const [supprimer, setSupprimer] = useState<Oublie | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const controle = peut.controler(profil.role);
  const toutes = liste.donnees ?? [];
  if (!toutes.length) return null;
  const aControler = toutes.filter((o) => o.etat === "A_CONTROLER");
  const decides = toutes.filter((o) => o.etat !== "A_CONTROLER");

  async function agir(action: () => Promise<unknown>, texte: string) {
    setErreur(null);
    try {
      await action();
      setDeja(null);
      setSupprimer(null);
      setPrecision("");
      liste.recharger();
      apres(texte);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }
  const decider = (o: Oublie, etat: "DEJA_AFFECTE" | "PAS_AFFECTE", p?: string) =>
    agir(
      () => api.post(`/recrutes/oublies/${o.id}/decision`, { etat, precision: p || undefined }),
      etat === "DEJA_AFFECTE"
        ? `${o.nomComplet} : déjà affecté(e), ne rentre dans aucune note.`
        : `${o.nomComplet} : pas encore affecté(e), entre dans les notes de son lot.`,
    );

  const ligne = (o: Oublie) => {
    const bloque = !!o.affectation?.dansUneNote || o.affectation?.statut === "AFFECTE";
    return (
      <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
        <div className="min-w-56 flex-1">
          <div className="font-medium text-encre">{o.nomComplet}</div>
          <div className="text-[12px] text-zinc-500">
            {o.dateNaissance ? `Né(e) le ${jour(o.dateNaissance)} · ` : ""}
            {o.liste} · {o.diplome ?? "—"}
            {o.grade ? ` · ${o.grade}` : ""}
            {o.specialite ? ` · ${o.specialite}` : ""}
            {o.departement ? ` · ${o.departement}` : ""}
          </div>
          <div className="text-[12px] text-zinc-500">
            {o.lot ? `${o.lot} · ${o.typeTexte === "DECRET" ? "Décret" : "Arrêté"} ${o.texte ?? ""}` : "En attente du texte de la FP"}
            {` · ajouté(e) le ${jour(o.ajouteLe)}${o.ajoutePar ? ` par ${o.ajoutePar}` : ""}`}
            {o.decidePar && o.etat !== "A_CONTROLER" ? ` · décidé par ${o.decidePar} le ${jour(o.decideLe)}` : ""}
          </div>
          {o.etat === "DEJA_AFFECTE" && o.affectation?.motif && <div className="text-[12px] text-zinc-500">{o.affectation.motif}</div>}
        </div>
        <Badge ton={ETAT[o.etat].ton}>{ETAT[o.etat].libelle}</Badge>
        {controle &&
          (bloque ? (
            <span className="text-[12px] text-zinc-400">Dans une note validée : décision figée</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {o.etat !== "DEJA_AFFECTE" && (
                <Bouton onClick={() => setDeja(o)}>
                  <UserX /> Déjà affecté
                </Bouton>
              )}
              {o.etat !== "PAS_AFFECTE" && (
                <Bouton variante="principal" onClick={() => decider(o, "PAS_AFFECTE")}>
                  <UserCheck /> Pas encore affecté
                </Bouton>
              )}
              <Bouton variante="danger" onClick={() => setSupprimer(o)}>
                <Trash2 /> Supprimer
              </Bouton>
            </div>
          ))}
      </div>
    );
  };

  return (
    <Carte titre={`Oubliés à contrôler (${aControler.length})`}>
      <p className="mb-3 text-[13px] leading-relaxed text-zinc-600">
        Les personnes ajoutées à la main (« Ajouter une personne ») n’entrent dans aucune note avant ce contrôle. <strong>Déjà affecté</strong> : elle
        ne rentre pas dans les notes. <strong>Pas encore affecté</strong> : elle rentre dans les notes de son lot. <strong>Supprimer</strong> : ajoutée
        par erreur.
      </p>
      {erreur && (
        <div className="mb-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {aControler.length ? (
        <div className="space-y-2">{aControler.map(ligne)}</div>
      ) : (
        <p className="flex items-center gap-1.5 text-[13px] text-marque-700">
          <CheckCircle2 className="size-4" /> Tout est contrôlé.
        </p>
      )}
      {decides.length > 0 && (
        <div className="mt-4">
          <button type="button" className="flex items-center gap-1 text-[13px] font-medium text-zinc-600 hover:text-marque-700" onClick={() => setVoirDecides(!voirDecides)}>
            {voirDecides ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} Déjà contrôlés ({decides.length})
          </button>
          {voirDecides && <div className="mt-2 space-y-2">{decides.map(ligne)}</div>}
        </div>
      )}

      <Modale titre={`Déjà affecté – ${deja?.nomComplet ?? ""}`} ouverte={!!deja} fermer={() => setDeja(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">Cette personne ne rentrera dans aucune note de service. Vous pourrez revenir sur cette décision tant qu’elle n’est pas dans une note validée.</p>
        <Champ libelle="Note où elle est déjà affectée (facultatif)" className="mt-3" aide="Ex. note n° 270 du 08/04/2026, note CBD…">
          <Saisie value={precision} onChange={(e) => setPrecision(e.target.value)} />
        </Champ>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setDeja(null)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={() => deja && decider(deja, "DEJA_AFFECTE", precision)}>
            <UserX /> Déclarer déjà affecté
          </Bouton>
        </div>
      </Modale>

      <Modale titre={`Supprimer ${supprimer?.nomComplet ?? ""} ?`} ouverte={!!supprimer} fermer={() => setSupprimer(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          La fiche est <strong>supprimée définitivement</strong> de la base des recrutés (ajoutée par erreur, en double…). Cette action ne peut pas être annulée.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setSupprimer(null)}>Annuler</Bouton>
          <Bouton
            variante="danger"
            onClick={() => supprimer && agir(() => api.delete(`/recrutes/oublies/${supprimer.id}`), `${supprimer.nomComplet} : fiche supprimée.`)}
          >
            <Trash2 /> Supprimer définitivement
          </Bouton>
        </div>
      </Modale>
    </Carte>
  );
}
