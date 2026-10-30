"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { API_URL } from "@/lib/api";

/** Listes de choix (Administration › Référentiels et organigramme). */
export type ListeReference =
  | "ETABLISSEMENT"
  | "INSPECTION"
  | "STRUCTURE"
  | "LOCALITE"
  | "MATIERE"
  | "TYPE_MATIERE"
  | "POSTE"
  | "NIVEAU"
  | "CYCLE"
  | "TYPE_BATIMENT"
  | "TYPE_SALLE"
  // Suggestions de la fiche du personnel (DG, 30/10/2026)
  | "GRADE"
  | "CATEGORIE"
  | "ECHELLE"
  | "ECHELON"
  | "LIEU_NAISSANCE"
  | "NATIONALITE"
  | "SPECIALITE";

interface OptionChoix {
  valeur: string;
  libelle: string;
  detail?: string;
}

const NOMS: Record<ListeReference, string> = {
  ETABLISSEMENT: "une école",
  INSPECTION: "une inspection",
  STRUCTURE: "une structure",
  LOCALITE: "une localité",
  MATIERE: "une matière",
  TYPE_MATIERE: "un type de matière",
  POSTE: "un poste",
  NIVEAU: "un niveau",
  CYCLE: "un cycle",
  TYPE_BATIMENT: "un type de bâtiment",
  TYPE_SALLE: "un type de salle",
  GRADE: "un grade",
  CATEGORIE: "une catégorie",
  ECHELLE: "une échelle",
  ECHELON: "un échelon",
  LIEU_NAISSANCE: "une ville ou un district",
  NATIONALITE: "une nationalité",
  SPECIALITE: "une spécialité ou une série",
};

/** Ce qui s'affiche sous un champ dont la valeur n'est pas dans la liste (par défaut). */
const HORS_LISTE = "Hors liste : gardé tel quel.";

const cle = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Champ texte avec la liste de référence : on tape quelques lettres, on choisit dans la liste
 * (écoles, inspections, localités, matières, postes…). Une valeur absente de la liste reste
 * possible : elle est simplement signalée « hors liste ».
 */
export function SaisieReferentiel({
  liste,
  valeur,
  changer,
  departementId,
  placeholder,
  desactive,
  className,
  avertissement = HORS_LISTE,
}: {
  liste: ListeReference;
  valeur: string;
  changer: (v: string) => void;
  /** Limite la liste à un département (écoles, inspections, localités). */
  departementId?: number | string | null;
  placeholder?: string;
  desactive?: boolean;
  className?: string;
  /** Phrase (en jaune) sous une valeur tapée à la main, absente de la liste ; `null` : rien. Jamais bloquant. */
  avertissement?: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [options, setOptions] = useState<OptionChoix[]>([]);
  const [connue, setConnue] = useState<boolean | null>(null);
  const [actif, setActif] = useState(0);
  const boite = useRef<HTMLDivElement>(null);
  const dep = departementId ? String(departementId) : "";

  // Recherche (légèrement différée pendant la frappe)
  useEffect(() => {
    let vivant = true;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_URL}/referentiels/options?liste=${liste}&q=${encodeURIComponent(valeur)}&departement=${dep}&limite=40`);
        const l = r.ok ? ((await r.json()) as OptionChoix[]) : [];
        if (!vivant) return;
        setOptions(l);
        setActif(0);
        if (valeur.trim()) setConnue(l.some((o) => cle(o.valeur) === cle(valeur) || cle(o.libelle) === cle(valeur)));
        else setConnue(null);
      } catch {
        if (vivant) setOptions([]);
      }
    }, 250);
    return () => {
      vivant = false;
      clearTimeout(t);
    };
  }, [liste, valeur, dep]);

  // Fermer en cliquant ailleurs
  useEffect(() => {
    if (!ouvert) return;
    const f = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [ouvert]);

  const choisir = (o: OptionChoix) => {
    changer(o.valeur);
    setConnue(true);
    setOuvert(false);
  };

  return (
    <div ref={boite} className={cx("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={valeur}
          disabled={desactive}
          placeholder={placeholder ?? `Chercher ${NOMS[liste]}…`}
          onChange={(e) => {
            changer(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={(e) => {
            if (e.key === "Tab") setOuvert(false);
            if (!ouvert || !options.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActif((i) => Math.min(i + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActif((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choisir(options[actif]);
            } else if (e.key === "Escape") setOuvert(false);
          }}
          className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-8 text-[13px] outline-none transition focus:border-marque-400 focus:ring-2 focus:ring-marque-100 disabled:bg-zinc-50"
        />
      </div>
      {ouvert && !desactive && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl bg-white py-1 text-[13px] shadow-lg ring-1 ring-zinc-200">
          {options.map((o, i) => (
            <li key={`${o.valeur}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(o)}
                className={cx("w-full px-3 py-1.5 text-left", i === actif ? "bg-marque-50" : "hover:bg-zinc-50")}
              >
                <span className="font-medium">{o.libelle}</span>
                {o.detail && <span className="ml-1.5 text-[11px] text-zinc-400">{o.detail}</span>}
              </button>
            </li>
          ))}
          {!options.length && <li className="px-3 py-2 text-[12px] text-zinc-500">Rien dans la liste : vous pouvez garder ce que vous avez tapé.</li>}
        </ul>
      )}
      {connue === false && valeur.trim() && !ouvert && avertissement && <div className="mt-1 rounded-lg bg-or-50 px-2 py-1 text-[11px] text-or-700">{avertissement}</div>}
    </div>
  );
}
