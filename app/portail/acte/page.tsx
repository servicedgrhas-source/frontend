"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { type ActePrestation, ActeImprime } from "@/components/acte-prestation";
import { appelPublic } from "@/lib/portail";

/** L'agent voit et imprime l'acte de sa demande accordée (numéro et code de suivi). */
export default function ActePortail() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-zinc-400">Chargement…</p>}>
      <Acte />
    </Suspense>
  );
}

function Acte() {
  const params = useSearchParams();
  const numero = params.get("numero") ?? "";
  const code = params.get("code") ?? "";
  const [a, setA] = useState<ActePrestation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Lien incomplet : rien à demander au serveur
  const manque = !numero || !code;
  useEffect(() => {
    if (manque) return;
    appelPublic<ActePrestation>(`/acte?numero=${encodeURIComponent(numero)}&code=${encodeURIComponent(code)}`)
      .then(setA)
      .catch((e: Error) => setErreur(e.message));
  }, [numero, code, manque]);
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link href={`/portail/suivi?numero=${numero}&code=${code}`} className="text-[13px] text-marque-700">
          ← Mon dossier
        </Link>
      </div>
      {manque && <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">Lien incomplet : ouvrez l’acte depuis « Mon dossier », avec votre numéro et votre code de suivi.</div>}
      {erreur && <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">{erreur}</div>}
      {!a && !erreur && !manque && <p className="py-10 text-center text-zinc-400">Chargement…</p>}
      {a && (
        <>
          <ActeImprime a={a} a4={false} />
          <button type="button" onClick={() => window.print()} className="w-full rounded-2xl bg-marque-500 px-5 py-4 text-[15px] font-semibold text-white print:hidden">
            Imprimer ou enregistrer en PDF
          </button>
          <p className="text-center text-[12px] text-zinc-500 print:hidden">L’original signé reste à retirer auprès de la structure qui a décidé, si elle le demande.</p>
        </>
      )}
    </div>
  );
}
