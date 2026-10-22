import { ArrowRight, FileText, Search, Smartphone } from "lucide-react";
import Link from "next/link";

/** Accueil du portail : les démarches en ligne (la mutation d'abord) et le suivi. */
export default function AccueilPortail() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-encre">Mes démarches en ligne</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-zinc-600">
          Faites votre demande depuis votre établissement, sur votre téléphone. Elle suit ensuite toute seule la voie hiérarchique : votre chef d’établissement,
          l’inspection, la direction départementale, puis la DGRHAS.
        </p>
      </div>

      <Link href="/portail/mutation" className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-doux active:scale-[0.99]">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-marque-500 text-white">
          <FileText className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Faire une demande de mutation</span>
          <span className="block text-[13px] text-zinc-500">Raisons de santé, sociales, rapprochement de conjoints, ancienneté, permutation…</span>
        </span>
        <ArrowRight className="size-5 text-zinc-300" />
      </Link>

      <Link href="/portail/suivi" className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-doux active:scale-[0.99]">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-nuit text-white">
          <Search className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Suivre ma demande</span>
          <span className="block text-[13px] text-zinc-500">Avec le numéro et le code reçus à l’envoi</span>
        </span>
        <ArrowRight className="size-5 text-zinc-300" />
      </Link>

      <section className="rounded-3xl bg-white/60 p-5 text-[13px] leading-relaxed text-zinc-600 ring-1 ring-zinc-200">
        <div className="mb-2 flex items-center gap-2 font-semibold text-encre">
          <Smartphone className="size-4" /> Comment ça marche ?
        </div>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Écrivez et signez votre demande manuscrite, faites-la enregistrer dans le registre de votre établissement.</li>
          <li>Remplissez le formulaire en ligne et joignez la photo ou le scan de la demande et des pièces demandées.</li>
          <li>Gardez précieusement le numéro et le code affichés à la fin : ils permettent de suivre votre dossier.</li>
        </ol>
        <p className="mt-3 text-[12px] text-zinc-500">D’autres démarches (attestations, congés…) seront ajoutées plus tard.</p>
      </section>
    </div>
  );
}
