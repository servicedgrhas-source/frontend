"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { type ActePrestation, ActeImprime } from "@/components/acte-prestation";
import { API_URL } from "@/lib/api";
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
  // « P-12 » : acte d'une demande de prestation (module à part)
  const prestation = /^P/i.test(numero);
  // Prestation : le scan de l'acte signé, déposé par la DGRHAS (pas d'acte avant la signature)
  const [m, setM] = useState<{ url: string; image: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Lien incomplet : rien à demander au serveur
  const manque = !numero || !code;
  useEffect(() => {
    if (manque) return;
    const q = `?numero=${encodeURIComponent(numero)}&code=${encodeURIComponent(code)}`;
    if (prestation)
      fetch(`${API_URL}/portail/prestations/acte${q}`)
        .then(async (r) => {
          if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { message?: string } | null)?.message ?? "Acte indisponible pour le moment.");
          const b = await r.blob();
          setM({ url: URL.createObjectURL(b), image: b.type.startsWith("image/") });
        })
        .catch((e: Error) => setErreur(e.message === "Failed to fetch" ? "Connexion impossible. Vérifiez votre accès à Internet et réessayez." : e.message));
    else
      appelPublic<ActePrestation>(`/acte${q}`)
        .then(setA)
        .catch((e: Error) => setErreur(e.message));
  }, [numero, code, manque, prestation]);
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link href={`/portail/suivi?numero=${encodeURIComponent(numero)}&code=${code}`} className="text-[13px] text-marque-700">
          ← Mon dossier
        </Link>
      </div>
      {manque && <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">Lien incomplet : ouvrez l’acte depuis « Mon dossier », avec votre numéro et votre code de suivi.</div>}
      {erreur && <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">{erreur}</div>}
      {!a && !m && !erreur && !manque && <p className="py-10 text-center text-zinc-400">Chargement…</p>}
      {m && (
        <>
          <div className="overflow-hidden rounded-2xl bg-white shadow-doux">
            {m.image ? <img src={m.url} alt="Votre acte signé" className="w-full" /> : <iframe src={m.url} title="Votre acte signé" className="h-[75vh] w-full" />}
          </div>
          <a href={m.url} download="acte-signe" className="block w-full rounded-2xl bg-marque-500 px-5 py-4 text-center text-[15px] font-semibold text-white print:hidden">
            Télécharger mon acte signé
          </a>
          <p className="text-center text-[12px] text-zinc-500 print:hidden">C’est la copie scannée de votre acte signé. Vous pouvez l’imprimer depuis le fichier téléchargé.</p>
        </>
      )}
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
