"use client";

import { ShieldAlert } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { COMPTE_SIGNALE, compteSignale, fermerSession, oublierSignalement } from "@/lib/api";

/**
 * Écran du compte suspendu par l'outil de détection (DG, 08/11/2026) : par-dessus toute
 * l'application, jusqu'à la vérification par un humain (le DG ou l'administrateur).
 */
export function EcranCompteSignale() {
  const [signale, setSignale] = useState(false);

  useEffect(() => {
    const voir = () => setSignale(compteSignale());
    voir();
    window.addEventListener(COMPTE_SIGNALE, voir);
    return () => window.removeEventListener(COMPTE_SIGNALE, voir);
  }, []);

  if (!signale) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="titre-signale" className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,#14532d_0%,#0b2e1c_55%,#06170f_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-1.5" aria-hidden>
        <span className="flex-1 bg-[#009543]" />
        <span className="flex-1 bg-[#fbde4a]" />
        <span className="flex-1 bg-[#dc241f]" />
      </div>
      <div className="relative w-full max-w-xl rounded-3xl bg-white/95 p-8 text-center shadow-2xl ring-1 ring-white/20 sm:p-10">
        <div className="mx-auto mb-5 flex size-24 items-center justify-center">
          <Image src="/armoiries-transparent.png" alt="Armoiries de la République du Congo" width={474} height={464} className="h-full w-full object-contain" />
        </div>
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-or-100 text-or-700">
          <ShieldAlert className="size-6" aria-hidden />
        </div>
        <h1 id="titre-signale" className="text-[19px] font-semibold leading-snug text-encre sm:text-[21px]">
          Votre compte a été signalé par nos outils de détection.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-zinc-600">Veuillez patienter pendant qu’un humain vérifie votre compte.</p>
        <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-marque-50 px-4 py-1.5 text-[12px] font-semibold tracking-[0.2em] text-marque-700">SIGRHAS-MEPPSA</div>
        <button
          type="button"
          onClick={() => {
            oublierSignalement();
            fermerSession();
            window.location.href = "/connexion";
          }}
          className="mt-8 text-[13px] font-medium text-zinc-500 underline-offset-4 hover:text-marque-700 hover:underline"
        >
          Retour à la page de connexion
        </button>
      </div>
    </div>
  );
}
