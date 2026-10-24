"use client";

import { useParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { type ActePrestation, ActeImprime } from "@/components/acte-prestation";
import { StyleImpressionA4 } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";

/** Acte d'une prestation accordée, à imprimer et remettre à l'agent. */
function ImpressionActe() {
  const { id } = useParams<{ id: string }>();
  const { donnees: a, erreur } = useApi<ActePrestation>(`/demandes/${id}/acte`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.replace("/connexion");
  }, []);
  useEffect(() => {
    if (a) document.title = `${a.acte} ${a.numero} - ${a.agent.nomComplet}`;
  }, [a]);
  if (erreur)
    return (
      <div className="p-6">
        <Alerte>{erreur}</Alerte>
      </div>
    );
  if (!a) return <Chargement />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between">
        <span className="text-sm text-zinc-700">
          {a.acte} n° {a.numero}
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <ActeImprime a={a} />
    </div>
  );
}

/** Les paramètres de l'adresse ne sont connus qu'au chargement : la page attend dans un <Suspense> (exigé au build). */
export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <ImpressionActe />
    </Suspense>
  );
}
