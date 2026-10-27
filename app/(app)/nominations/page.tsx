"use client";

import { ArrowRight, Award, ClipboardCheck, FileSignature, History, Network, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/session";
import { Alerte, Carte, EnTete } from "@/components/ui";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/** Ce que fera le module, dans l'ordre du circuit. */
const ETAPES = [
  { icone: Search, titre: "Repérer les postes vacants", texte: "Chaque structure dit déjà si son poste de responsable est occupé, tenu par intérim ou vacant." },
  { icone: ClipboardCheck, titre: "Proposer un agent", texte: "À partir de sa fiche : grade, ancienneté, diplômes, évaluations et dossier de carrière." },
  { icone: ShieldCheck, titre: "Avis et décision", texte: "La proposition suit la voie hiérarchique jusqu’à la décision, comme une mutation." },
  { icone: FileSignature, titre: "Acte de nomination", texte: "La note ou l’arrêté signé, scanné, et la prise de fonction inscrite au dossier de carrière." },
  { icone: History, titre: "Historique", texte: "Qui a dirigé chaque structure, depuis quand, et avec quel acte." },
];

/**
 * Nominations aux postes de responsabilité (DG : « mouvement du personnel » = affectations,
 * mutations et nominations). Module en préparation : la page dit ce qui vient et ce que l'on peut
 * déjà faire, pour que l'utilisateur sache où il en est.
 */
export default function Nominations() {
  const { profil } = useSession();
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé à la DGRHAS.</Alerte>;
  return (
    <div className="space-y-6">
      <EnTete
        titre="Nominations"
        sousTitre="Les nominations aux postes de responsabilité : chef de bureau, chef de service, directeur, inspecteur, chef d’établissement… De la proposition à l’acte signé."
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marque-700 to-marque-900 p-8 text-white shadow-doux md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/5" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 right-24 size-48 rounded-full bg-or-400/10" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20">
            <Award className="size-10 text-or-400" />
          </span>
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-or-400 px-3 py-1 text-[12px] font-semibold text-zinc-900">
              <span className="size-1.5 animate-pulse rounded-full bg-zinc-900" /> Module en préparation
            </div>
            <h2 className="text-[22px] font-semibold leading-snug">Les nominations rejoindront bientôt les affectations et les mutations.</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">
              Ce module est en cours de construction avec la Direction générale, sur le même modèle que les mutations : une proposition, des avis motivés, une décision et un
              acte signé, tracés de bout en bout. Rien de ce que vous saisissez aujourd’hui ne sera perdu : les responsables déjà déclarés dans l’organigramme et les
              dossiers de carrière seront repris tels quels le jour de l’ouverture.
            </p>
          </div>
        </div>
      </section>

      <Carte titre="Ce que fera le module">
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ETAPES.map((e, i) => {
            const I = e.icone;
            return (
              <li key={e.titre} className="relative rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-marque-50 text-marque-700">
                    <I className="size-[18px]" />
                  </span>
                  <span className="text-[12px] font-semibold text-zinc-400">Étape {i + 1}</span>
                </div>
                <div className="mt-3 text-[14px] font-semibold text-encre">{e.titre}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{e.texte}</p>
              </li>
            );
          })}
        </ol>
      </Carte>

      <Carte titre="En attendant, vous pouvez déjà">
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/administration/organigramme" className="group flex items-center gap-4 rounded-2xl border border-zinc-200 p-4 hover:border-marque-300 hover:bg-marque-50/40">
            <span className="flex size-10 items-center justify-center rounded-xl bg-or-100 text-or-700">
              <Network className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-encre">Déclarer le responsable de chaque structure</span>
              <span className="block text-[12.5px] text-zinc-500">Administration › Organigramme, bouton « Responsable » : en poste, intérim ou vacant.</span>
            </span>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-marque-700" />
          </Link>
          <Link href="/structures" className="group flex items-center gap-4 rounded-2xl border border-zinc-200 p-4 hover:border-marque-300 hover:bg-marque-50/40">
            <span className="flex size-10 items-center justify-center rounded-xl bg-marque-50 text-marque-700">
              <Search className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-encre">Voir les postes vacants</span>
              <span className="block text-[12.5px] text-zinc-500">Structures et besoins › Structures administratives : chaque fiche dit qui la dirige.</span>
            </span>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-marque-700" />
          </Link>
        </div>
      </Carte>
    </div>
  );
}
