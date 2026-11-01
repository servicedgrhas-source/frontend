"use client";

import { CheckCircle2, ChevronDown, ChevronRight, PencilLine, Trash2, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { FicheDossier } from "./fiche-dossier";
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
  observation: string | null;
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
export function ListeOublies({ apres, modifier }: { apres: (texte: string) => void; /** Ouvre « Corriger la fiche ». */ modifier?: (id: string) => void }) {
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
  // Ouvert depuis le traitement des affectations (/recrutement#oublies) : bloc étendu, à l'écran
  const pret = !!liste.donnees?.length;
  useEffect(() => {
    if (!pret || window.location.hash !== "#oublies") return;
    const t = setTimeout(() => {
      setReduit(false);
      // Saut direct (à l'arrivée sur la page, pas d'animation)
      document.getElementById("oublies")?.scrollIntoView({ block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [pret]);
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
  // Fiche complète de la personne (identité, recrutement, texte, affectation, pièces…), DG 31/10/2026
  const [ficheOuverte, setFicheOuverte] = useState<string | null>(null);
  // Plusieurs personnes cochées, traitées ensemble (DG, 01/11/2026)
  const [cochees, setCochees] = useState<string[]>([]);
  const [groupe, setGroupe] = useState<"DEJA_AFFECTE" | "PAS_AFFECTE" | "SUPPRIMER" | null>(null);
  const [precisionGroupe, setPrecisionGroupe] = useState("");
  const [encours, setEncours] = useState<number | null>(null);
  const [bilan, setBilan] = useState<{ ok: number; refus: { nom: string; raison: string }[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const controle = peut.controler(profil.role);
  const toutes = liste.donnees ?? [];
  // Liste vide : rien à afficher, sauf le bilan d'une action groupée (sa fenêtre reste ouverte)
  if (!toutes.length && !groupe) return null;
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
  // Personne dans une note validée : sa décision est figée, elle ne se coche pas
  const fige = (o: Oublie) => !!o.affectation?.dansUneNote || o.affectation?.statut === "AFFECTE";
  const cochablesAControler = aControlerVus.filter((o) => !fige(o));
  const choisies = toutes.filter((o) => cochees.includes(o.id) && !fige(o));
  const toutCoche = cochablesAControler.length > 0 && cochablesAControler.every((o) => cochees.includes(o.id));
  const basculerCoche = (id: string) => setCochees((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  /** La même action pour chaque personne cochée, l'une après l'autre ; bilan à la fin. */
  async function agirGroupe() {
    if (!groupe) return;
    let ok = 0;
    const refus: { nom: string; raison: string }[] = [];
    for (const [i, o] of choisies.entries()) {
      setEncours(i + 1);
      try {
        if (groupe === "SUPPRIMER") await api.delete(`/recrutes/oublies/${o.id}`);
        else await api.post(`/recrutes/oublies/${o.id}/decision`, { etat: groupe, precision: precisionGroupe.trim() || undefined });
        ok++;
      } catch (e) {
        refus.push({ nom: o.nomComplet, raison: (e as Error).message });
      }
    }
    setEncours(null);
    setBilan({ ok, refus });
    setCochees([]);
    liste.recharger();
    apres(
      `${ok} personne(s) ${groupe === "SUPPRIMER" ? "supprimée(s)" : groupe === "DEJA_AFFECTE" ? "déclarée(s) déjà affectée(s)" : "déclarée(s) pas encore affectée(s)"}${refus.length ? `, ${refus.length} refus` : ""}.`,
    );
  }
  const fermerGroupe = () => {
    setGroupe(null);
    setBilan(null);
    setPrecisionGroupe("");
  };

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
      <div key={o.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3 text-[13px] ${cochees.includes(o.id) ? "bg-marque-50 ring-1 ring-marque-200" : "bg-zinc-50"}`}>
        {controle && !bloque && (
          <input type="checkbox" className="size-4" aria-label={`Cocher ${o.nomComplet}`} checked={cochees.includes(o.id)} onChange={() => basculerCoche(o.id)} />
        )}
        <div className="min-w-56 flex-1">
          <button
            type="button"
            onClick={() => setFicheOuverte(o.id)}
            title="Voir toute la fiche"
            className="cursor-pointer text-left font-medium text-encre hover:text-marque-700 hover:underline"
          >
            {o.nomComplet}
          </button>
          <div className="text-[12px] text-zinc-500">
            {o.dateNaissance ? `Né(e) le ${jour(o.dateNaissance)} · ` : ""}
            {o.liste} · {o.diplome ?? "—"}
            {o.grade ? ` · ${o.grade}` : ""}
            {o.specialite ? ` · ${o.specialite}` : ""}
            {o.departement ? ` · ${o.departement}` : ""}
          </div>
          <div className="text-[12px] text-zinc-500">
            {o.lot
              ? `${o.lot} · ${o.typeTexte === "DECRET" ? "Décret" : "Arrêté"} ${o.texte ?? ""}`
              : o.texte
                ? `Sans lot · ${o.typeTexte === "DECRET" ? "Décret" : "Arrêté"} ${o.texte}`
                : "En attente du texte de la FP"}
            {` · ajouté(e) le ${jour(o.ajouteLe)}${o.ajoutePar ? ` par ${o.ajoutePar}` : ""}`}
            {o.decidePar && o.etat !== "A_CONTROLER" ? ` · décidé par ${o.decidePar} le ${jour(o.decideLe)}` : ""}
          </div>
          {o.observation && <div className="text-[12px] font-medium text-rouge-600">Observation : {o.observation}</div>}
          {o.etat === "DEJA_AFFECTE" && o.affectation?.motif && <div className="text-[12px] text-zinc-500">{o.affectation.motif}</div>}
        </div>
        <Badge ton={ETAT[o.etat].ton}>{ETAT[o.etat].libelle}</Badge>
        {controle &&
          (bloque ? (
            <span className="text-[12px] text-zinc-400">Dans une note validée : décision figée</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {modifier && (
                <Bouton variante="discret" onClick={() => modifier(o.id)} title="Corriger la fiche : nom, date, diplôme, grade, texte, spécialité…">
                  <PencilLine /> Modifier
                </Bouton>
              )}
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
    <div id="oublies" className="scroll-mt-4">
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
            {controle && (cochablesAControler.length > 0 || choisies.length > 0) && (
              <div className="sticky top-2 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2 text-[13px]">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={toutCoche}
                    disabled={!cochablesAControler.length}
                    onChange={() =>
                      setCochees(toutCoche ? cochees.filter((id) => !cochablesAControler.some((o) => o.id === id)) : [...new Set([...cochees, ...cochablesAControler.map((o) => o.id)])])
                    }
                  />
                  Tout cocher{mots.length ? " (résultats)" : ""}
                </label>
                {choisies.length > 0 && (
                  <>
                    <span className="text-zinc-500">· {choisies.length} cochée(s)</span>
                    <span className="ml-auto flex flex-wrap gap-1.5">
                      <Bouton onClick={() => setGroupe("DEJA_AFFECTE")}>
                        <UserX /> Déjà affecté
                      </Bouton>
                      <Bouton variante="principal" onClick={() => setGroupe("PAS_AFFECTE")}>
                        <UserCheck /> Pas encore affecté
                      </Bouton>
                      <Bouton variante="danger" onClick={() => setGroupe("SUPPRIMER")}>
                        <Trash2 /> Supprimer
                      </Bouton>
                      <Bouton variante="discret" onClick={() => setCochees([])}>
                        Tout décocher
                      </Bouton>
                    </span>
                  </>
                )}
              </div>
            )}
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
        <Modale
        titre={
          bilan
            ? "Terminé"
            : groupe === "SUPPRIMER"
              ? `Supprimer ${choisies.length} fiche(s) ?`
              : groupe === "DEJA_AFFECTE"
                ? `Déclarer ${choisies.length} personne(s) déjà affectée(s) ?`
                : `Déclarer ${choisies.length} personne(s) pas encore affectée(s) ?`
        }
        ouverte={!!groupe}
        fermer={encours ? () => undefined : fermerGroupe}
      >
        {bilan ? (
          <div className="space-y-3 text-[13px]">
            <Alerte ton={bilan.refus.length ? "jaune" : "vert"}>
              {bilan.ok} personne(s) traitée(s).{bilan.refus.length > 0 && ` ${bilan.refus.length} n’ont pas pu l’être :`}
            </Alerte>
            {bilan.refus.length > 0 && (
              <ul className="max-h-60 space-y-1 overflow-auto">
                {bilan.refus.map((x) => (
                  <li key={x.nom} className="rounded-xl bg-zinc-50 px-3 py-2">
                    <strong>{x.nom}</strong> <span className="text-zinc-500">— {x.raison}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <Bouton variante="principal" onClick={fermerGroupe}>
                Fermer
              </Bouton>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
            <p>
              {groupe === "SUPPRIMER" ? (
                <>
                  Ces fiches sont <strong>supprimées définitivement</strong> de la base des recrutés (ajoutées par erreur, en double…). Cette action ne peut
                  pas être annulée.
                </>
              ) : groupe === "DEJA_AFFECTE" ? (
                "Ces personnes ne rentreront dans aucune note de service. Vous pourrez revenir sur cette décision tant qu’elles ne sont pas dans une note validée."
              ) : (
                "Ces personnes rentreront dans les notes de leur lot."
              )}
            </p>
            <ul className="max-h-48 space-y-1 overflow-auto">
              {choisies.map((o) => (
                <li key={o.id} className="rounded-xl bg-zinc-50 px-3 py-1.5">
                  <strong className="text-encre">{o.nomComplet}</strong>
                  <span className="text-zinc-500">
                    {" "}
                    · {o.diplome ?? "—"}
                    {o.lot ? ` · ${o.lot}` : ""}
                  </span>
                  {o.observation && <span className="text-rouge-600"> · {o.observation}</span>}
                </li>
              ))}
            </ul>
            {groupe === "DEJA_AFFECTE" && (
              <Champ libelle="Note où elles sont déjà affectées (facultatif, la même pour toutes)" aide="Ex. note n° 270 du 08/04/2026, note CBD…">
                <Saisie value={precisionGroupe} onChange={(e) => setPrecisionGroupe(e.target.value)} />
              </Champ>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              {encours && (
                <span className="mr-auto text-[12px] text-zinc-500">
                  En cours… {encours} / {choisies.length}
                </span>
              )}
              <Bouton onClick={fermerGroupe} disabled={!!encours}>
                Annuler
              </Bouton>
              <Bouton variante={groupe === "SUPPRIMER" ? "danger" : "principal"} disabled={!!encours || !choisies.length} onClick={agirGroupe}>
                {groupe === "SUPPRIMER" ? `Supprimer les ${choisies.length}` : `Confirmer pour les ${choisies.length}`}
              </Bouton>
            </div>
          </div>
        )}
      </Modale>

      {ficheOuverte && <FicheDossier id={ficheOuverte} fermer={() => setFicheOuverte(null)} />}
      </Carte>
    </div>
  );
}
