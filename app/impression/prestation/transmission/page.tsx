"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StyleImpressionA4 } from "@/components/pages-a4";
import { LettreTransmissionImprimee, ModifierIntroduction } from "@/components/prestations";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, qs, useApi } from "@/lib/api";
import type { LettreTransmission } from "@/lib/prestations";

/**
 * Soit-transmis de plusieurs demandes du même type (?ids=…,…), comme les modèles de la DGRHAS :
 * « Transmission de six (06) demandes de … », avec le tableau des agents (DG, 03/11/2026).
 */
function Impression() {
  const ids = useSearchParams().get("ids") ?? "";
  const t = useApi<{ prestation: string; demandes: string[]; lettre: LettreTransmission }>(ids ? `/demandes-prestation/transmission${qs({ ids })}` : null);
  const [intro, setIntro] = useState(false);
  // Paragraphe écrit à la main, pour cette impression
  const [corps, setCorps] = useState<string | null>(null);
  useEffect(() => {
    if (!lireSession().jeton) window.location.replace("/connexion");
  }, []);
  if (!ids) return <div className="p-6"><Alerte>Aucune demande choisie.</Alerte></div>;
  if (t.erreur)
    return (
      <div className="p-6">
        <Alerte>{t.erreur}</Alerte>
      </div>
    );
  if (!t.donnees) return <Chargement />;
  const d = t.donnees;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between gap-3">
        <span className="text-sm text-zinc-700">
          Soit-transmis : {d.prestation} — {d.demandes.length} demande{d.demandes.length > 1 ? "s" : ""} ({d.demandes.join(", ")})
        </span>
        <div className="flex gap-2">
          <Bouton onClick={() => setIntro(true)}>Modifier l’introduction</Bouton>
          <Bouton variante="principal" onClick={() => window.print()}>
            Imprimer / Enregistrer en PDF
          </Bouton>
        </div>
      </div>
      <LettreTransmissionImprimee l={d.lettre} corps={corps ?? undefined} />
      {intro && (
        <ModifierIntroduction
          texte={corps ?? d.lettre.corps}
          modifie={corps !== null}
          memoire="impression"
          fermer={() => setIntro(false)}
          enregistrer={(texte) => setCorps(texte.trim() ? texte : null)}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Impression />
    </Suspense>
  );
}
