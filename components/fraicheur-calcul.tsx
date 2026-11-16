"use client";

import { useEffect } from "react";

/**
 * Quand les chiffres d'une page lourde ont été calculés (DG, 16/11/2026) : le serveur garde le calcul
 * tant que les données ne changent pas. Si elles ont changé, il affiche le dernier calcul et prépare
 * le nouveau en arrière-plan : la page se rafraîchit alors toute seule quelques secondes après.
 */
export function FraicheurCalcul({ calculeLe, aJour, recharger }: { calculeLe?: string; aJour?: boolean; recharger: () => void }) {
  useEffect(() => {
    if (aJour !== false) return;
    const t = setTimeout(recharger, 15_000);
    return () => clearTimeout(t);
  }, [aJour, calculeLe, recharger]);
  if (!calculeLe) return null;
  const d = new Date(calculeLe);
  return (
    <p className="text-[12px] text-zinc-500">
      Chiffres calculés le {d.toLocaleDateString("fr-FR")} à {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      {aJour === false ? (
        <span className="ml-1 font-medium text-or-700">· des données ont changé : mise à jour en cours, la page se rafraîchira toute seule.</span>
      ) : (
        <span> · à jour (refaits seulement quand les données changent).</span>
      )}
    </p>
  );
}
