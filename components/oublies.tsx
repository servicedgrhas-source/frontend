"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Trash2, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { Alerte, Badge, Bouton, Carte, Champ, Modale, Saisie } from "./ui";
import { api, TRAVAIL_MODIFIE, useApi } from "@/lib/api";
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

/** Texte sans accents ni majuscules, pour la recherche. */
const plat = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Bloc réduit ou étendu : retenu sur ce poste (rien de grave s'il est perdu). */
const CLE_REDUIT = "dgrhas.oublies.reduit";
function lireReduit() {
  try {
    return localStorage.getItem(CLE_REDUIT) === "1";
  } catch {
    return false;
  }
}

/**
 * Liste des oubliés (DG, 31/10/2026) : les personnes ajoutées à la main dans la base des recrutés
 * attendent un contrôle avant d'entrer dans une note. Déjà affectée : hors des notes ; pas encore
 * affectée : dans les notes de son lot ; supprimée : ajoutée par erreur.
 */
export function ListeOublies({ apres }: { apres: (texte: string) => void }) {
  const { profil } = useSession();
  const liste = useApi<Oublie[]>("/recrutes/oublies");
  const { recharger } = liste;
  // Relue après chaque enregistrement sur les recrutés (ajout d'une personne, fiche corrigée,
  // affectation retirée…) : le bloc se met à jour au fur et à mesure (DG, 31/10/2026)
  useEffect(() => {
    const apres = (e: Event) => {
      const chemin = (e as CustomEvent<string>).detail ?? "";
      if (/^\/(recrutes|agents|affectations|import)/.test(chemin)) recharger();
    };
    window.addEventListener(TRAVAIL_MODIFIE, apres);
    return () => window.removeEventListener(TRAVAIL_MODIFIE, apres);
  }, [recharger]);
  const [reduit, setReduit] = useState(lireReduit);
  const basculer = () => {
    setReduit(!reduit);
    try {
      localStorage.setItem(CLE_REDUIT, reduit ? "0" : "1");
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour cette page
    }
  };
  const [voirDecides, setVoirDecides] = useState(false);
  // Recherche : nom, n° de texte, diplôme, département, lot… (tous les mots tapés doivent s'y trouver)
  const [recherche, setRecherche] = useState("");
  const [deja, setDeja] = useState<Oublie | null>(null);
  const [precision, setPrecision] = useState("");
  const [supprimer, setSupprimer] = useState<Oublie | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const controle = peut.controler(profil.role);
  const toutes = liste.donnees ?? [];
  if (!toutes.length) return null;
  const aControler = toutes.filter((o) => o.etat === "A_CONTROLER");
  const decides = toutes.filter((o) => o.etat !== "A_CONTROLER");
  const mots = plat(recherche).split(/\s+/).filter(Boolean);
  const trouve = (o: Oublie) => {
    const texte = plat(
      [o.nomComplet, o.texte, o.diplome, o.grade, o.specialite, o.departement, o.lot, o.liste, o.dateNaissance ? jour(o.dateNaissance) : "", o.ajoutePar, o.affectation?.motif]
        .filter(Boolean)
        .join(" "),
    );
    return mots.every((m) => texte.includes(m));
  };
  const aControlerVus = mots.length ? aControler.filter(trouve) : aControler;
  const decidesVus = mots.length ? decides.filter(trouve) : decides;

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
    <Carte
      titre={`Oubliés à contrôler (${aControler.length})`}
      actions={
        <Bouton variante="discret" onClick={basculer} aria-expanded={!reduit}>
          {reduit ? <ChevronRight /> : <ChevronDown />} {reduit ? "Étendre" : "Réduire"}
        </Bouton>
      }
    >
      {reduit ? (
        <p className="text-[13px] text-zinc-500">
          {aControler.length
            ? `${aControler.length} personne(s) ajoutée(s) à la main attendent le contrôle avant d’entrer dans une note.`
            : "Tout est contrôlé."}{" "}
          {decides.length > 0 && `${decides.length} déjà contrôlée(s).`}
        </p>
      ) : (
        <>
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
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Saisie
              className="max-w-md"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher : nom, n° de texte, diplôme, département, lot…"
              aria-label="Rechercher dans la liste des oubliés"
            />
            {mots.length > 0 && (
              <span className="text-[12px] text-zinc-500">
                {aControlerVus.length + decidesVus.length} résultat(s) sur {toutes.length}
                <button type="button" className="ml-2 text-marque-700 underline" onClick={() => setRecherche("")}>
                  Effacer
                </button>
              </span>
            )}
          </div>
          {aControlerVus.length ? (
            <div className="space-y-2">{aControlerVus.map(ligne)}</div>
          ) : mots.length ? (
            <p className="text-[13px] text-zinc-500">Aucune personne à contrôler ne correspond à « {recherche} ».</p>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-marque-700">
              <CheckCircle2 className="size-4" /> Tout est contrôlé.
            </p>
          )}
          {decidesVus.length > 0 && (
            <div className="mt-4">
              <button type="button" className="flex items-center gap-1 text-[13px] font-medium text-zinc-600 hover:text-marque-700" onClick={() => setVoirDecides(!voirDecides)}>
                {voirDecides || mots.length ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} Déjà contrôlés ({decidesVus.length}
                {mots.length ? ` sur ${decides.length}` : ""})
              </button>
              {/* Une recherche ouvre aussi les personnes déjà contrôlées qui correspondent */}
              {(voirDecides || mots.length > 0) && <div className="mt-2 space-y-2">{decidesVus.map(ligne)}</div>}
            </div>
          )}
        </>
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
