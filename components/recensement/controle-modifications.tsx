"use client";

import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { peutControlerAjout } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, Carte, Champ, Chargement, Modale, Progression, Vide, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";

interface Modification {
  id: number;
  agentId: number;
  nomComplet: string;
  numeroFiche: string;
  structure: string | null;
  faitePar: string | null;
  faiteLe: string;
  /** Proposition (rapports des DDEPPSA) : la fiche n'est pas encore modifiée. */
  proposition: boolean;
  source: string | null;
  /** Le recensement pendant lequel la modification a été faite. */
  campagne: string | null;
  champs: { code: string; libelle: string; avant: string; apres: string }[];
}

/** Ce qui est arrivé à une rubrique : ajoutée (elle était vide), effacée, ou modifiée. */
const nature = (x: { avant: string; apres: string }) => (!x.avant ? "ajouté" : !x.apres ? "effacé" : "modifié");
/** La phrase du contrôle : « Rattaché à l’école et genre modifié », « Téléphone ajouté »… */
function resume(m: Modification) {
  if (m.proposition) return "Proposée";
  const parties = m.champs.map((x) => (x.code === "STRUCTURE" ? "Rattaché à une autre école" : `${x.libelle} ${nature(x)}`));
  const t = parties.length > 3 ? `${parties.slice(0, 3).join(", ")} et ${parties.length - 3} autre(s)` : parties.join(", ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Modifiée";
}

const quand = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ");

/**
 * Fiches modifiées au recensement (DG, 30/10/2026) : comme les agents ajoutés, elles passent au
 * contrôle. Chaque modification montre l'ancienne et la nouvelle valeur de chaque rubrique ; le
 * bureau du contrôle valide ou rejette une modification, ou toute une sélection d'un coup.
 */
export function ControleModifications() {
  const { profil } = useSession();
  const r = useApi<{ total: number; lignes: Modification[] }>("/recensement/modifications");
  const [choisies, setChoisies] = useState<Set<number>>(new Set());
  const [rejet, setRejet] = useState<number[] | null>(null);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  /** Décision en cours : où on en est (envoyée par paquets, chaque fiche est longue à traiter). */
  const [progres, setProgres] = useState<{ fait: number; total: number; decision: "VALIDER" | "REJETER" } | null>(null);
  /** Décidées pendant cette visite : elles quittent la liste tout de suite, sans attendre la relecture. */
  const [faites, setFaites] = useState<Set<number>>(new Set());
  const controleur = peutControlerAjout(profil.role) || profil.role === "DG";
  const lignes = (r.donnees?.lignes ?? []).filter((l) => !faites.has(l.id));
  // Celles faites mais encore dans les données lues (la relecture ne les ramène plus : total déjà juste)
  const restantes = Math.max(0, (r.donnees?.total ?? 0) - ((r.donnees?.lignes.length ?? 0) - lignes.length));

  const decider = async (ids: number[], decision: "VALIDER" | "REJETER", note?: string) => {
    if (envoi) return;
    setErreur(null);
    setMessage(null);
    setRejet(null);
    setEnvoi(true);
    setProgres({ fait: 0, total: ids.length, decision });
    const s = { controlees: 0, restaurees: 0, gardees: 0, appliquees: 0 };
    const erreurs: string[] = [];
    // Par paquets de 25 : la progression se voit, et les fiches faites quittent la liste au fur et à mesure
    for (let i = 0; i < ids.length; i += 25) {
      const lot = ids.slice(i, i + 25);
      try {
        const x = await api.post<{ controlees: number; restaurees: number; gardees: number; appliquees: number; erreurs: { id: number; message: string }[] }>("/recensement/modifications/controle", {
          ids: lot,
          decision,
          note,
        });
        s.controlees += x.controlees;
        s.restaurees += x.restaurees;
        s.gardees += x.gardees;
        s.appliquees += x.appliquees;
        const refusees = new Set((x.erreurs ?? []).map((e) => e.id));
        erreurs.push(...(x.erreurs ?? []).map((e) => e.message));
        setFaites((f) => new Set([...f, ...lot.filter((id) => !refusees.has(id))]));
      } catch (e) {
        erreurs.push((e as Error).message);
      }
      setProgres({ fait: Math.min(i + 25, ids.length), total: ids.length, decision });
    }
    setMessage(
      decision === "VALIDER"
        ? `${s.controlees} modification(s) validée(s)${s.appliquees ? ` ; ${s.appliquees} rubrique(s) proposée(s) appliquée(s) aux fiches` : ""}${s.gardees ? ` ; ${s.gardees} laissée(s) car la fiche a changé depuis la proposition` : ""}.`
        : `${s.controlees} modification(s) rejetée(s) : ${s.restaurees} rubrique(s) remise(s) à leur ancienne valeur${s.gardees ? `, ${s.gardees} laissée(s) car modifiée(s) de nouveau depuis` : ""}.`,
    );
    if (erreurs.length) setErreur(`${erreurs.length} non ${decision === "VALIDER" ? "validée(s)" : "rejetée(s)"}, à revoir (elles restent dans la liste) : ${erreurs.join(" ; ")}`);
    setChoisies(new Set());
    setMotif("");
    setProgres(null);
    setEnvoi(false);
    r.recharger();
  };

  const basculer = (id: number) =>
    setChoisies((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Carte titre={`4. Fiches modifiées au recensement : contrôle${r.donnees ? ` (${restantes})` : ""}`}>
      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
        Une fiche complétée ou corrigée depuis cette page passe au contrôle, comme un agent ajouté. Pour chaque rubrique changée : l’ancienne valeur (barrée) et la nouvelle. Les{" "}
        <strong>propositions</strong> (venues des rapports de fin d’année des DDEPPSA) ne sont pas encore dans la fiche : « Valider » les applique, « Rejeter » ne change rien.{" "}
        {controleur
          ? "Validez ce qui est juste ; rejetez le reste (la fiche reprend alors ses anciennes valeurs). Cochez plusieurs lignes pour décider d’un coup."
          : "Le bureau du contrôle les valide ou les rejette."}
      </p>
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !r.donnees ? (
        <Chargement />
      ) : !lignes.length ? (
        <Vide>Aucune modification n’attend le contrôle.</Vide>
      ) : (
        <>
          {controleur && (
            // Collée en haut de l'écran : on voit l'avancement même en bas de la liste
            <div className="sticky top-0 z-10 -mx-2 mb-3 rounded-2xl bg-white/95 px-2 py-2 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className="size-4 accent-marque-600"
                    disabled={envoi}
                    checked={lignes.length > 0 && choisies.size === lignes.length}
                    onChange={(e) => setChoisies(e.target.checked ? new Set(lignes.map((l) => l.id)) : new Set())}
                  />
                  Tout cocher
                </label>
                <span className="text-[12px] text-zinc-500">
                  {choisies.size} cochée(s){restantes > lignes.length ? ` · ${lignes.length} affichées sur ${restantes} (les suivantes viennent quand celles-ci sont décidées)` : ""}
                </span>
                <Bouton variante="principal" chargement={progres?.decision === "VALIDER"} disabled={!choisies.size || envoi} onClick={() => void decider([...choisies], "VALIDER")}>
                  <Check /> {progres?.decision === "VALIDER" ? "Validation…" : "Valider la sélection"}
                </Bouton>
                <Bouton variante="danger" chargement={progres?.decision === "REJETER"} disabled={!choisies.size || envoi} onClick={() => setRejet([...choisies])}>
                  <X /> {progres?.decision === "REJETER" ? "Rejet…" : "Rejeter la sélection"}
                </Bouton>
              </div>
              {progres && (
                <div className="mt-2 space-y-1">
                  <p className="text-[13px] font-medium text-marque-700">
                    {progres.decision === "VALIDER" ? "Validation" : "Rejet"} en cours : {progres.fait} / {progres.total} — chaque fiche est mise à jour une à une, cela peut prendre quelques minutes. Restez sur la page.
                  </p>
                  <Progression valeur={(progres.fait / progres.total) * 100} />
                </div>
              )}
            </div>
          )}
          <ul className="space-y-2">
            {lignes.map((m) => (
              <li key={m.id} className={`flex flex-wrap items-start gap-3 rounded-2xl px-4 py-3 transition-opacity ${choisies.has(m.id) ? "bg-marque-50 ring-1 ring-marque-200" : "bg-zinc-50"} ${envoi && choisies.has(m.id) ? "opacity-60" : ""}`}>
                {controleur && <input type="checkbox" aria-label={`Choisir la modification de ${m.nomComplet}`} className="mt-1 size-4 accent-marque-600" disabled={envoi} checked={choisies.has(m.id)} onChange={() => basculer(m.id)} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={`/personnel/agents/${m.agentId}`} className="text-[14px] font-semibold text-marque-700 hover:underline">
                      {m.nomComplet}
                    </Link>
                    <span className="text-[12px] text-zinc-400">
                      {m.numeroFiche}
                      {m.structure ? ` · ${m.structure}` : ""}
                    </span>
                  </div>
                  {/* Qui l'a fait, et quoi (le nom du contrôleur qui valide n'est pas utile ici) */}
                  <p className="mt-0.5 text-[13px] text-zinc-700">
                    {resume(m)} par <strong>{m.faitePar ?? "auteur inconnu"}</strong>
                    <span className="text-zinc-500"> · le {quand(m.faiteLe)}</span>
                    {m.campagne && <span className="ml-2 rounded-full bg-marque-50 px-2 py-0.5 text-[11px] text-marque-700 ring-1 ring-marque-100">{m.campagne}</span>}
                  </p>
                  {m.proposition && (
                    <div className="mt-1 rounded-xl bg-sky-50 px-3 py-1.5 text-[12px] text-sky-800 ring-1 ring-sky-100">
                      <strong>Proposition, pas encore dans la fiche</strong>
                      {m.source ? ` — ${m.source}` : ""}. Valider l’applique ; rejeter ne change rien.
                    </div>
                  )}
                  <table className="mt-1.5 w-full text-[12px]">
                    <tbody>
                      {m.champs.map((x) => (
                        <tr key={x.code} className="align-top">
                          <td className="w-56 py-0.5 pr-3 text-zinc-500">
                            {x.libelle} <span className={`ml-1 rounded px-1 text-[10px] font-medium ${nature(x) === "ajouté" ? "bg-marque-100 text-marque-800" : nature(x) === "effacé" ? "bg-rouge-100 text-rouge-700" : "bg-or-100 text-or-800"}`}>{nature(x)}</span>
                          </td>
                          <td className="py-0.5 pr-2 text-rouge-600 line-through decoration-rouge-300">{x.avant || <span className="text-zinc-400 no-underline">(vide)</span>}</td>
                          <td className="w-5 py-0.5 text-zinc-300">
                            <ArrowRight className="size-3.5" />
                          </td>
                          <td className="py-0.5 font-medium text-marque-700">{x.apres || <span className="text-zinc-400">(effacé)</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {controleur && (
                  <div className="flex shrink-0 gap-1.5">
                    <Bouton disabled={envoi} onClick={() => void decider([m.id], "VALIDER")}>
                      <Check /> Valider
                    </Bouton>
                    <Bouton variante="danger" disabled={envoi} onClick={() => setRejet([m.id])}>
                      <X /> Rejeter
                    </Bouton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {rejet && (
        <Modale titre={`Rejeter ${rejet.length} modification(s)`} ouverte fermer={() => setRejet(null)}>
          <div className="space-y-3">
            <p className="text-[13px] text-zinc-600">
              Les rubriques modifiées reprennent leur ancienne valeur (sauf celles modifiées de nouveau depuis) ; une proposition est simplement écartée (la fiche n’a pas changé). Dites pourquoi : la personne qui a
              modifié ou proposé le lira.
            </p>
            <Champ libelle="Motif du rejet *">
              <Zone value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. le matricule ne correspond pas au bulletin de solde" />
            </Champ>
            <div className="flex justify-end gap-2">
              <Bouton onClick={() => setRejet(null)}>Annuler</Bouton>
              <Bouton variante="danger" disabled={!motif.trim() || envoi} onClick={() => void decider(rejet, "REJETER", motif)}>
                Rejeter
              </Bouton>
            </div>
          </div>
        </Modale>
      )}
    </Carte>
  );
}
