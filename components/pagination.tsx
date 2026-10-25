"use client";

import { ChevronFirst, ChevronLast } from "lucide-react";
import { useState } from "react";
import { Bouton, Saisie } from "@/components/ui";

/**
 * Pages d'une longue liste (DG, 24/10/2026) : précédente et suivante, mais aussi la première, la
 * dernière et « aller à la page n° » pour ne pas cliquer cent fois sur « Suivante ».
 */
export function Pagination({ page, pages, aller }: { page: number; pages: number; aller: (p: number) => void }) {
  const [saisie, setSaisie] = useState("");
  if (pages <= 1) return null;
  const valider = () => {
    const n = Number(saisie);
    if (Number.isInteger(n) && n >= 1 && n <= pages && n !== page) aller(n);
    setSaisie("");
  };
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-[12px] text-zinc-500">
      <Bouton variante="discret" disabled={page <= 1} onClick={() => aller(1)} title="Première page">
        <ChevronFirst className="size-3.5" />
      </Bouton>
      <Bouton variante="discret" disabled={page <= 1} onClick={() => aller(page - 1)}>
        Précédente
      </Bouton>
      <span className="tabular-nums">
        Page {page.toLocaleString("fr-FR")} sur {pages.toLocaleString("fr-FR")}
      </span>
      <Bouton variante="discret" disabled={page >= pages} onClick={() => aller(page + 1)}>
        Suivante
      </Bouton>
      <Bouton variante="discret" disabled={page >= pages} onClick={() => aller(pages)} title="Dernière page">
        <ChevronLast className="size-3.5" />
      </Bouton>
      <form
        className="ml-2 flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          valider();
        }}
      >
        <label htmlFor="aller-page">Aller à la page</label>
        <Saisie id="aller-page" inputMode="numeric" value={saisie} onChange={(e) => setSaisie(e.target.value.replace(/\D/g, ""))} placeholder={`1 à ${pages}`} className="w-24 py-1.5 text-[12px]" />
        <Bouton type="submit" variante="discret" disabled={!saisie}>
          Aller
        </Bouton>
      </form>
    </div>
  );
}
