"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Saisie } from "./ui";

/**
 * Champ de mot de passe avec un œil à droite : un clic montre le mot de passe tapé, un autre le
 * cache de nouveau (08/11/2026). Le mot de passe est caché au départ.
 */
export function SaisieMotDePasse({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const libelle = visible ? "Cacher le mot de passe" : "Afficher le mot de passe";
  return (
    <div className="relative w-full">
      <Saisie {...props} type={visible ? "text" : "password"} spellCheck={false} autoCapitalize="none" className={`w-full pr-10 ${className ?? ""}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Le champ garde la main : on continue à taper sans recliquer dedans
        onMouseDown={(e) => e.preventDefault()}
        aria-label={libelle}
        aria-pressed={visible}
        title={libelle}
        className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-marque-300 focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
