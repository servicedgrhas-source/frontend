"use client";

import { FileUp, Paperclip, Printer, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { BoutonIcone, Bouton, Liste, Modale, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";

export interface Piece {
  id: string;
  libelle: string;
  nomOrigine: string;
  taille: number;
  ajoutePar: string | null;
  creeLe: string;
}

const taille = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.ceil(o / 1024)} Ko`);

/**
 * Pièces d'une demande : la demande manuscrite scannée et les justificatifs, plusieurs
 * fichiers, chacun rattaché à une pièce exigée. Les pièces encore manquantes sont signalées.
 */
export function PiecesDemande({ id, exigees, modifiable, ancien }: { id: string; exigees: string[]; modifiable: boolean; ancien?: boolean }) {
  const pieces = useApi<Piece[]>(`/mutations/${id}/pieces`);
  const [libelle, setLibelle] = useState(exigees[0] ?? "Pièce jointe");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [impression, setImpression] = useState(false);
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const [confirmation, demander] = useConfirmation();
  const champ = useRef<HTMLInputElement>(null);
  const liste = pieces.donnees ?? [];
  const manquantes = exigees.filter((p) => !liste.some((x) => x.libelle === p));

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    const fd = new FormData();
    for (const f of Array.from(fichiers)) {
      fd.append("fichiers", f);
      fd.append("libelles", libelle);
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await api.post(`/mutations/${id}/pieces`, fd);
      pieces.recharger();
      const suivante = manquantes.find((p) => p !== libelle);
      if (suivante) setLibelle(suivante);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
      if (champ.current) champ.current.value = "";
    }
  }

  return (
    <div className="space-y-3 text-[13px]">
      {confirmation}
      {liste.length > 0 ? (
        <ul className="space-y-1.5">
          {liste.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2">
              <Paperclip className="size-4 shrink-0 text-zinc-400" />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => api.ouvrirFichier(`/mutations/${id}/pieces/${p.id}`).catch((e: Error) => setErreur(e.message))}>
                <span className="block font-medium text-marque-700 hover:underline">{p.libelle}</span>
                <span className="block truncate text-[11px] text-zinc-400">
                  {p.nomOrigine} · {taille(p.taille)} · {p.ajoutePar ?? "—"}
                </span>
              </button>
              {modifiable && (
                <BoutonIcone
                  libelle="Retirer cette pièce"
                  ton="rouge"
                  onClick={async () => {
                    if (!(await demander(`Retirer « ${p.libelle} » (${p.nomOrigine}) de la demande ?`))) return;
                    await api.delete(`/mutations/${id}/pieces/${p.id}`).catch((e: Error) => setErreur(e.message));
                    pieces.recharger();
                  }}
                >
                  <Trash2 />
                </BoutonIcone>
              )}
            </li>
          ))}
        </ul>
      ) : (
        pieces.donnees && <p className="text-zinc-400">{ancien ? "Pas d’autre pièce jointe." : "Aucune pièce jointe pour l’instant."}</p>
      )}
      {liste.length > 0 && (
        <Bouton onClick={() => setImpression(true)}>
          <Printer /> Imprimer les pièces jointes
        </Bouton>
      )}
      <Modale titre="Imprimer les pièces jointes" ouverte={impression} fermer={() => setImpression(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Ces pièces sont annexées à la fiche individuelle avant l’envoi à la signature du ministre, aux Finances ou à la Fonction publique. Cliquez sur chaque pièce : elle
          s’ouvre dans un nouvel onglet ; appuyez ensuite sur <strong>Ctrl + P</strong> pour l’imprimer.
        </p>
        <ol className="mt-3 space-y-2">
          {liste.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2 text-[13px]">
              <span className="w-5 text-zinc-400">{i + 1}.</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.libelle}</span>
                <span className="block truncate text-[11px] text-zinc-400">{p.nomOrigine}</span>
              </span>
              {ouvertes.has(p.id) && <span className="text-[11px] text-vert-600">ouverte ✓</span>}
              <Bouton
                onClick={() =>
                  api
                    .ouvrirFichier(`/mutations/${id}/pieces/${p.id}`)
                    .then(() => setOuvertes((s) => new Set(s).add(p.id)))
                    .catch((e: Error) => setErreur(e.message))
                }
              >
                <Printer /> Ouvrir pour imprimer
              </Bouton>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex justify-end">
          <Bouton onClick={() => setImpression(false)}>Fermer</Bouton>
        </div>
      </Modale>
      {manquantes.length > 0 && exigees.length > 0 && (
        <div className="rounded-2xl bg-or-100/60 px-3 py-2 text-[12px] text-or-700">
          <strong>Pièces exigées encore absentes :</strong> {manquantes.join(" · ")}
        </div>
      )}
      {modifiable && (
        <div className="flex flex-wrap items-end gap-2">
          <Liste
            className="min-w-56 flex-1"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            options={[...exigees, "Autre pièce"].map((p) => ({ valeur: p, libelle: `${liste.some((x) => x.libelle === p) ? "✓ " : ""}${p}` }))}
          />
          <input ref={champ} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => envoyer(e.target.files)} />
          <Bouton chargement={envoi} onClick={() => champ.current?.click()}>
            <FileUp /> Joindre (un ou plusieurs fichiers)
          </Bouton>
        </div>
      )}
      {erreur && <div className="text-[12px] text-rouge-600">{erreur}</div>}
    </div>
  );
}
