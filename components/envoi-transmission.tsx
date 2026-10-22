"use client";

import { CheckSquare, ListChecks, Send, Square } from "lucide-react";
import { useState } from "react";
import { Alerte, Bouton, Chargement, Saisie, Tableau } from "@/components/ui";
import { qs, useApi } from "@/lib/api";
import type { Agent } from "@/lib/types";

/**
 * Choix des dossiers d'une transmission : tous les dossiers prêts du quota, ou seulement
 * ceux que l'on coche (tout cocher, ou un par un).
 */
export function EnvoiTransmission({
  quota,
  pretes,
  libelleProchaine,
  chargement,
  envoyer,
}: {
  quota: number;
  pretes: number;
  libelleProchaine: string;
  chargement: boolean;
  /** `ids` absent : tous les dossiers prêts partent. */
  envoyer: (ids?: string[]) => void;
}) {
  const [mode, setMode] = useState<"tous" | "cocher" | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState("");
  const liste = useApi<Agent[]>(mode === "cocher" ? `/candidats${qs({ etat: "VALIDEE", quota })}` : null);
  const r = recherche.trim().toUpperCase();
  const visibles = (liste.donnees ?? []).filter(
    (f) => !r || f.nomComplet.toUpperCase().includes(r) || (f.diplomeBrut ?? "").toUpperCase().includes(r) || (f.lotCommission ?? "").toUpperCase().includes(r),
  );
  const basculer = (id: string) =>
    setCoches((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const tousCoches = visibles.length > 0 && visibles.every((f) => coches.has(f.id));

  if (mode !== "cocher")
    return (
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("tous")}
            className={`rounded-2xl px-4 py-3 text-left text-[13px] ring-1 transition ${mode === "tous" ? "bg-marque-50 ring-marque-500" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
          >
            <div className="flex items-center gap-2 font-semibold text-encre">
              <Send className="size-4" /> Envoyer tous les dossiers prêts
            </div>
            <div className="mt-0.5 text-[12px] text-zinc-500">
              Les {pretes} dossier(s) prêts du quota {quota} partent dans la {libelleProchaine}.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode("cocher")}
            className="rounded-2xl bg-white px-4 py-3 text-left text-[13px] ring-1 ring-zinc-200 transition hover:ring-zinc-300"
          >
            <div className="flex items-center gap-2 font-semibold text-encre">
              <ListChecks className="size-4" /> Cocher des dossiers
            </div>
            <div className="mt-0.5 text-[12px] text-zinc-500">La liste des dossiers prêts s’affiche : cochez-les tous, ou un par un.</div>
          </button>
        </div>
        {mode === "tous" && (
          <div className="flex justify-end">
            <Bouton variante="principal" chargement={chargement} onClick={() => envoyer()}>
              <Send /> Envoyer les {pretes} dossier(s)
            </Bouton>
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Bouton variante="discret" onClick={() => setMode(null)}>
          ← Revenir au choix
        </Bouton>
        <Saisie className="w-64" placeholder="Rechercher un nom, un diplôme, un lot…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        <Bouton
          onClick={() =>
            setCoches((c) => {
              const n = new Set(c);
              for (const f of visibles) {
                if (tousCoches) n.delete(f.id);
                else n.add(f.id);
              }
              return n;
            })
          }
          disabled={!visibles.length}
        >
          {tousCoches ? <Square /> : <CheckSquare />} {tousCoches ? "Tout décocher" : r ? "Cocher ces dossiers" : "Tout cocher"}
        </Bouton>
        <span className="ml-auto text-[12px] font-medium text-zinc-600">
          {coches.size} / {liste.donnees?.length ?? pretes} coché(s)
        </span>
      </div>
      {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
      {!liste.donnees ? (
        <Chargement />
      ) : (
        <div className="max-h-[45vh] overflow-y-auto rounded-2xl ring-1 ring-zinc-100">
          <Tableau>
            <thead>
              <tr>
                <th className="w-10" />
                <th>Nom et prénoms</th>
                <th>Diplôme</th>
                <th>Lot de la commission</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.id} className={`cursor-pointer ${coches.has(f.id) ? "bg-marque-50/60" : ""}`} onClick={() => basculer(f.id)}>
                  <td>
                    <input type="checkbox" className="size-4 accent-marque-600" checked={coches.has(f.id)} onChange={() => basculer(f.id)} onClick={(e) => e.stopPropagation()} aria-label={`Cocher ${f.nomComplet}`} />
                  </td>
                  <td className="font-medium">{f.nomComplet}</td>
                  <td className="text-[12px]">{f.diplomeBrut ?? "—"}</td>
                  <td className="text-[12px]">{f.lotCommission ?? "—"}</td>
                  <td className="text-[12px]">{f.statut ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </div>
      )}
      <div className="flex justify-end">
        <Bouton variante="principal" chargement={chargement} disabled={!coches.size} onClick={() => envoyer([...coches])}>
          <Send /> Envoyer les {coches.size} dossier(s) coché(s)
        </Bouton>
      </div>
    </div>
  );
}
