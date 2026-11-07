"use client";

import { CheckCircle2, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Une fiche de la base du personnel, au format d'une demande de mutation (GET /mutations/agents). */
export interface AgentTrouve {
  id: number;
  numeroFiche: string | null;
  nomComplet: string;
  statut: string;
  genre: "M" | "F";
  matricule: string | null;
  grade: string | null;
  echelon: number | null;
  gradeBrut: string | null;
  typeAgent: "FONCTIONNAIRE" | "FINALISTE";
  statutAgent: "ENSEIGNANT" | "PERSONNEL_ADMINISTRATIF";
  departementId: number | null;
  departement: string | null;
  lieuService: string | null;
  specialite: string | null;
  datePriseService: string | null;
  cycle: string | null;
  fonction: string | null;
}

/**
 * Retrouver l'agent avant de taper sa demande (07/11/2026) : son matricule ou son nom, et sa fiche
 * de la base du personnel remplit le formulaire. Rien n'est écrit dans la base du personnel.
 * Pas trouvé ? On tape à la main : ce n'est jamais bloquant.
 */
export function RechercheAgentMutation({ choisi, choisir }: { choisi: AgentTrouve | null; choisir: (a: AgentTrouve | null) => void }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<AgentTrouve[] | null>(null);
  const [cherche, setCherche] = useState(false);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) {
      setResultats(null);
      return;
    }
    const minuterie = setTimeout(() => {
      setCherche(true);
      api
        .get<AgentTrouve[]>(`/mutations/agents?q=${encodeURIComponent(t)}`)
        .then(setResultats)
        .catch(() => setResultats([]))
        .finally(() => setCherche(false));
    }, 350);
    return () => clearTimeout(minuterie);
  }, [q]);

  if (choisi)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-marque-50 px-4 py-3 ring-1 ring-marque-200">
        <CheckCircle2 className="size-5 shrink-0 text-marque-600" aria-hidden />
        <div className="min-w-0 flex-1 text-[13px]">
          <div className="font-semibold text-encre">
            Rempli depuis la fiche du personnel{choisi.numeroFiche ? ` ${choisi.numeroFiche}` : ""} : {choisi.nomComplet}
          </div>
          <div className="text-marque-900">Vérifiez et complétez ce qui manque, puis la demande (département sollicité, motif…).</div>
        </div>
        <button type="button" onClick={() => choisir(null)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 ring-1 ring-zinc-200 hover:ring-zinc-300">
          <X className="size-3.5" aria-hidden /> Choisir un autre agent
        </button>
      </div>
    );

  return (
    <div className="rounded-2xl bg-white p-4 shadow-doux ring-1 ring-zinc-200">
      <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-encre">
        <Search className="size-4 text-marque-600" aria-hidden /> D’abord, retrouver l’agent dans la base du personnel
      </div>
      <p className="mb-3 text-[12.5px] text-zinc-500">Son matricule ou son nom (dans n’importe quel ordre) : sa fiche remplit le formulaire, il n’y a plus qu’à compléter la demande.</p>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex. 224664 N, ou MOUANDA Jean"
          className="h-11 w-full rounded-xl bg-zinc-50 pr-3 pl-9 text-[14px] ring-1 ring-zinc-200 outline-none focus:bg-white focus:ring-2 focus:ring-marque-300"
          autoComplete="off"
        />
      </div>
      {cherche && <p className="mt-2 text-[12px] text-zinc-500">Recherche…</p>}
      {resultats && !cherche && (
        <div className="mt-3">
          {resultats.length ? (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto">
              {resultats.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => choisir(a)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-zinc-200 transition hover:bg-marque-50 hover:ring-marque-300"
                  >
                    <UserRound className="size-5 shrink-0 text-zinc-400" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-encre">{a.nomComplet}</span>
                      <span className="block text-[12px] text-zinc-500">
                        {[a.matricule ?? "matricule ?", a.gradeBrut, a.lieuService, a.departement].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold text-marque-700">Utiliser cette fiche →</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900 ring-1 ring-amber-200">
              Aucune fiche trouvée dans la base du personnel. Ce n’est pas bloquant : tapez ses informations ci-dessous. La demande pourra être reliée à une fiche
              plus tard (ou une fiche créée après la note signée).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
