"use client";

import { ChevronFirst, ChevronLast } from "lucide-react";
import { useState } from "react";
import { Bouton, Saisie } from "@/components/ui";

/**
 * Pages d'une longue liste (DG, 24/10/2026) : précédente et suivante, mais aussi la première, la
 * dernière et « aller à la page n° » pour ne pas cliquer cent fois sur « Suivante ». Un curseur
 * (DG, 08/11/2026) mène aussi à une page précise : la page ne se charge qu'une fois le curseur
 * lâché, pas pendant le mouvement.
 */
export function Pagination({ page, pages, aller }: { page: number; pages: number; aller: (p: number) => void }) {
  const [saisie, setSaisie] = useState("");
  const [curseur, setCurseur] = useState(page);
  const [glisse, setGlisse] = useState(false);
  if (pages <= 1) return null;
  const lacher = (v: number) => {
    setGlisse(false);
    if (v !== page) aller(v);
  };
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
      {pages > 2 && (
        <div className="relative flex items-center gap-2">
          <span className="tabular-nums text-zinc-400">1</span>
          <input
            type="range"
            min={1}
            max={pages}
            step={1}
            value={glisse ? curseur : page}
            aria-label="Choisir la page avec le curseur"
            title="Glissez puis lâchez : la page se charge au lâcher"
            className="w-40 cursor-pointer accent-marque-600 sm:w-56"
            onChange={(e) => {
              setGlisse(true);
              setCurseur(Number(e.target.value));
            }}
            onPointerUp={(e) => lacher(Number(e.currentTarget.value))}
            onTouchEnd={(e) => lacher(Number(e.currentTarget.value))}
            onKeyUp={(e) => lacher(Number(e.currentTarget.value))}
            onBlur={(e) => glisse && lacher(Number(e.currentTarget.value))}
          />
          <span className="tabular-nums text-zinc-400">{pages.toLocaleString("fr-FR")}</span>
          {glisse && curseur !== page && (
            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-white tabular-nums shadow">
              Page {curseur.toLocaleString("fr-FR")}
            </span>
          )}
        </div>
      )}
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
