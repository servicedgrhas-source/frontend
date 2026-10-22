import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Portail DGRHAS – Mes démarches",
  description: "Portail de la DGRHAS (MEPPSA) : faire sa demande de mutation en ligne et suivre son dossier.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1813" };

/** Portail public de la DGRHAS : pensé pour le téléphone, sans compte. */
export default function LayoutPortail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fond">
      <header className="bg-nuit text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link href="/portail" className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white p-1">
              <Image src="/armoiries.png" alt="Armoiries de la République du Congo" width={44} height={44} className="h-full w-full object-contain" priority />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[15px] font-semibold">Portail DGRHAS</span>
              <span className="block truncate text-[11px] text-white/55">Ministère de l’Enseignement préscolaire, primaire, secondaire et de l’alphabétisation</span>
            </span>
          </Link>
        </div>
        <div className="bandeau-national h-1" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-8 text-center text-[11px] text-zinc-400">
        République du Congo · Unité – Travail – Progrès
        <br />
        Direction générale des ressources humaines et de l’administration scolaire
      </footer>
    </div>
  );
}
