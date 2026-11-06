"use client";

import { ArrowDown, ArrowUp, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { blocsEntete, enteteParDefaut } from "./note-imprimable";
import { Bouton, Champ, Modale, Saisie } from "./ui";
import { api } from "@/lib/api";
import type { NoteDetail } from "@/lib/types";

/**
 * Modifier l'en-tête d'une note (06/11/2026) : enlever ou ajouter une ligne ou un trait, changer
 * l'ordre, et la référence du numéro. L'aperçu à droite montre l'en-tête tel qu'il sera imprimé.
 */
export function FenetreEntete({ note, fermer, apres }: { note: NoteDetail; fermer: () => void; apres: (t: string, ton?: "vert" | "rouge") => void }) {
  const [lignes, setLignes] = useState<string[]>(note.entete.lignes ?? enteteParDefaut(note.entete.reference));
  const [reference, setReference] = useState(note.entete.reference);
  const [envoi, setEnvoi] = useState(false);
  const changer = (i: number, t: string) => setLignes((l) => l.map((x, j) => (j === i ? t : x)));
  const enlever = (i: number) => setLignes((l) => l.filter((_, j) => j !== i));
  const deplacer = (i: number, d: -1 | 1) =>
    setLignes((l) => {
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const inserer = (i: number, t: string) => setLignes((l) => [...l.slice(0, i + 1), t, ...l.slice(i + 1)]);

  async function enregistrer(habituel: boolean) {
    setEnvoi(true);
    try {
      await api.put(`/notes/${note.id}/entete`, habituel ? { lignes: null, reference: null } : { lignes: lignes.filter((l) => l.trim()), reference: reference.trim() || null });
      apres(habituel ? "La note reprend l’en-tête habituel." : "En-tête de la note enregistré.");
    } catch (e) {
      apres((e as Error).message, "rouge");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre="En-tête de la note" ouverte fermer={fermer} large>
      <div className="grid gap-5 text-[13px] lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-3">
          <p className="text-zinc-600">Changez le texte d’une ligne, enlevez-la avec la corbeille, ajoutez une ligne ou un trait (« ----- ») sous une autre. Les flèches changent l’ordre.</p>
          <ol className="space-y-1.5">
            {lignes.map((l, i) => (
              <li key={i} className="group flex items-center gap-1.5">
                {l === "---" ? (
                  <div className="flex h-9 flex-1 items-center gap-2 rounded-xl bg-zinc-50 px-3 text-zinc-400 ring-1 ring-dashed ring-zinc-200">
                    <Minus className="size-4" aria-hidden />
                    <span className="flex-1 border-t border-dashed border-zinc-300" />
                    <span className="text-[11px]">trait</span>
                  </div>
                ) : (
                  <Saisie className="flex-1 font-semibold uppercase" value={l} onChange={(e) => changer(i, e.target.value)} />
                )}
                <span className="flex items-center gap-0.5">
                  <button type="button" title="Monter" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-encre disabled:opacity-30" disabled={i === 0} onClick={() => deplacer(i, -1)}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" title="Descendre" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-encre disabled:opacity-30" disabled={i === lignes.length - 1} onClick={() => deplacer(i, 1)}>
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" title="Ajouter une ligne en dessous" className="rounded-lg p-1.5 text-zinc-400 hover:bg-marque-50 hover:text-marque-700" onClick={() => inserer(i, "")}>
                    <Plus className="size-4" />
                  </button>
                  <button type="button" title="Enlever" className="rounded-lg p-1.5 text-zinc-400 hover:bg-rouge-100 hover:text-rouge-600" onClick={() => enlever(i)}>
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Bouton variante="discret" onClick={() => setLignes((l) => [...l, ""])}>
              <Plus className="size-4" aria-hidden /> Ajouter une ligne
            </Bouton>
            <Bouton variante="discret" onClick={() => setLignes((l) => [...l, "---"])}>
              <Minus className="size-4" aria-hidden /> Ajouter un trait
            </Bouton>
          </div>
          <Champ libelle="Référence du numéro" aide="Ce qui suit « N°______/ ». Par défaut, celle des paramètres.">
            <Saisie value={reference} onChange={(e) => setReference(e.target.value)} />
          </Champ>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Aperçu</div>
          <div className="rounded-2xl bg-white p-4 text-center font-serif text-[11px] font-semibold leading-tight text-black shadow-doux ring-1 ring-zinc-200">
            {blocsEntete(lignes.filter((l) => l.trim())).map((b, i) =>
              b === null ? (
                <div key={i} className="leading-none">
                  -----------------
                </div>
              ) : (
                <div key={i}>
                  {b.lignes.map((l, j) => (
                    <div key={j}>{l}</div>
                  ))}
                  {b.visa && <div className="text-[9px] font-normal italic text-zinc-400">visa {b.visa === "DG" ? "du DG" : b.visa === "DIRECTION" ? "du directeur" : "du chef de service"}</div>}
                </div>
              ),
            )}
            <div className="mt-1 whitespace-nowrap">N°______________/{reference}</div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <Bouton variante="discret" onClick={() => enregistrer(true)} disabled={envoi}>
          <RotateCcw className="size-4" aria-hidden /> En-tête habituel
        </Bouton>
        <span className="flex gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" chargement={envoi} disabled={!lignes.some((l) => l.trim() && l !== "---")} onClick={() => enregistrer(false)}>
            Enregistrer
          </Bouton>
        </span>
      </div>
    </Modale>
  );
}
