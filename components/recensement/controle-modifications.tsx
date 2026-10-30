"use client";

import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { peutControlerAjout } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, Carte, Champ, Chargement, Modale, Vide, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";

interface Modification {
  id: number;
  agentId: number;
  nomComplet: string;
  numeroFiche: string;
  structure: string | null;
  faitePar: string | null;
  faiteLe: string;
  champs: { code: string; libelle: string; avant: string; apres: string }[];
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
  const controleur = peutControlerAjout(profil.role) || profil.role === "DG";
  const lignes = r.donnees?.lignes ?? [];

  const decider = async (ids: number[], decision: "VALIDER" | "REJETER", note?: string) => {
    setErreur(null);
    setEnvoi(true);
    try {
      const x = await api.post<{ controlees: number; restaurees: number; gardees: number }>("/recensement/modifications/controle", { ids, decision, note });
      setMessage(
        decision === "VALIDER"
          ? `${x.controlees} modification(s) validée(s).`
          : `${x.controlees} modification(s) rejetée(s) : ${x.restaurees} rubrique(s) remise(s) à leur ancienne valeur${x.gardees ? `, ${x.gardees} laissée(s) car modifiée(s) de nouveau depuis` : ""}.`,
      );
      setChoisies(new Set());
      setRejet(null);
      setMotif("");
      r.recharger();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const basculer = (id: number) =>
    setChoisies((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Carte titre={`4. Fiches modifiées au recensement : contrôle${r.donnees ? ` (${r.donnees.total})` : ""}`}>
      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
        Une fiche complétée ou corrigée depuis cette page passe au contrôle, comme un agent ajouté. Pour chaque rubrique changée : l’ancienne valeur (barrée) et la nouvelle.{" "}
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
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  className="size-4 accent-marque-600"
                  checked={choisies.size === lignes.length}
                  onChange={(e) => setChoisies(e.target.checked ? new Set(lignes.map((l) => l.id)) : new Set())}
                />
                Tout cocher
              </label>
              <span className="text-[12px] text-zinc-500">{choisies.size} cochée(s)</span>
              <Bouton variante="principal" disabled={!choisies.size || envoi} onClick={() => void decider([...choisies], "VALIDER")}>
                <Check /> Valider la sélection
              </Bouton>
              <Bouton variante="danger" disabled={!choisies.size || envoi} onClick={() => setRejet([...choisies])}>
                <X /> Rejeter la sélection
              </Bouton>
            </div>
          )}
          <ul className="space-y-2">
            {lignes.map((m) => (
              <li key={m.id} className={`flex flex-wrap items-start gap-3 rounded-2xl px-4 py-3 ${choisies.has(m.id) ? "bg-marque-50 ring-1 ring-marque-200" : "bg-zinc-50"}`}>
                {controleur && <input type="checkbox" aria-label={`Choisir la modification de ${m.nomComplet}`} className="mt-1 size-4 accent-marque-600" checked={choisies.has(m.id)} onChange={() => basculer(m.id)} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={`/personnel/agents/${m.agentId}`} className="text-[14px] font-semibold text-marque-700 hover:underline">
                      {m.nomComplet}
                    </Link>
                    <span className="text-[12px] text-zinc-400">
                      {m.numeroFiche}
                      {m.structure ? ` · ${m.structure}` : ""} · modifiée par {m.faitePar ?? "—"} le {quand(m.faiteLe)}
                    </span>
                  </div>
                  <table className="mt-1.5 w-full text-[12px]">
                    <tbody>
                      {m.champs.map((x) => (
                        <tr key={x.code} className="align-top">
                          <td className="w-56 py-0.5 pr-3 text-zinc-500">{x.libelle}</td>
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
            <p className="text-[13px] text-zinc-600">Les rubriques reprennent leur ancienne valeur (sauf celles modifiées de nouveau depuis). Dites pourquoi : la personne qui a modifié le lira.</p>
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
