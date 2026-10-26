"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GuideEnrolement } from "@/components/enrolement/guide";
import { useSession } from "@/components/session";
import { Alerte, EnTete, Pastille } from "@/components/ui";
import { useApi } from "@/lib/api";
import { ESPACES, POLES, rubriquesVisibles, travailEspace, type Compteurs, type Pole } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/** Page d'accueil d'un domaine : ses rubriques, dans l'ordre du travail, avec ce qui attend. */
export function VueEspace() {
  const { profil } = useSession();
  const { domaine } = useParams<{ domaine: string }>();
  const espace = ESPACES.find((e) => e.cle === domaine);
  const pole = POLES.find((x) => x.cle === domaine);
  const { donnees: c } = useApi<Compteurs>("/menu/compteurs");

  if (pole) return <VuePole pole={pole} c={c} />;
  if (!espace) return <Alerte>Cette page n’existe pas.</Alerte>;
  const rubriques = rubriquesVisibles(espace, profil);
  if (!rubriques.length) return <Alerte>Ce domaine n’est pas ouvert à votre rôle.</Alerte>;
  const Icone = espace.icone;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Pastille taille="lg">
          <Icone />
        </Pastille>
        <div className="min-w-0 flex-1">
          <EnTete titre={espace.titre} sousTitre={espace.description} />
        </div>
      </div>

      {espace.circuit && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[13px] text-zinc-600 shadow-doux">
          <span className="font-medium text-zinc-400">Le circuit :</span>
          {espace.circuit.split(" → ").map((etape, i, tout) => (
            <span key={etape} className="inline-flex items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-encre">{etape}</span>
              {i < tout.length - 1 && <ArrowRight className="size-3.5 text-zinc-300" />}
            </span>
          ))}
        </div>
      )}

      {espace.cle === "enrolement" && peut.traiter(profil.role) && <GuideEnrolement />}

      {/* Rubriques rangées par groupe (« Chaque mois : payer »…) quand le domaine en a */}
      {[...new Set(rubriques.map((r) => r.groupe ?? ""))].map((groupe) => (
      <div key={groupe || "tout"} className="space-y-3">
      {groupe && <h2 className="pt-2 text-[12px] font-semibold tracking-wider text-zinc-400 uppercase">{groupe}</h2>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rubriques.filter((r) => (r.groupe ?? "") === groupe).map((r, i) => {
          const travail = c && r.compteur ? r.compteur(c) : null;
          const info = c && r.info ? r.info(c) : null;
          const R = r.icone;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="group flex flex-col rounded-3xl bg-white p-6 shadow-doux transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <Pastille ton={travail?.n ? "jaune" : "gris"}>
                  <R />
                </Pastille>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-400">{r.groupe ? "Rubrique" : rubriques.length > 1 ? `Étape ${i + 1}` : "Rubrique"}</div>
                  <div className="text-[16px] font-semibold text-encre">{r.libelle}</div>
                </div>
                {!!travail?.n && <span className="rounded-full bg-or-400 px-2.5 py-0.5 text-[13px] font-bold text-zinc-900 tabular-nums">{travail.n}</span>}
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-zinc-500">{r.explication}</p>
              {(travail || info) && (
                <div className="mt-3 space-y-1 text-[12px]">
                  {travail && <div className={travail.n ? "font-medium text-or-700" : "text-zinc-400"}>{travail.n ? travail.texte : "Rien en attente"}</div>}
                  {info && info.n > 0 && <div className="text-zinc-500">{info.texte}</div>}
                </div>
              )}
              <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-marque-700">
                Ouvrir <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
      </div>
      ))}
    </div>
  );
}

/** Domaines ouverts aux comptes des écoles, inspections… (comme dans le menu). */
const ESPACES_STRUCTURE = ["personnel", "demandes", "structures"];

/**
 * Page d'une grande rubrique (« Personnel ») : une case par domaine, avec ce qu'on y fait et ce
 * qui attend ; on entre dans le domaine pour voir ses rubriques.
 */
function VuePole({ pole, c }: { pole: Pole; c: Compteurs | null }) {
  const { profil } = useSession();
  const espaces = pole.espaces
    .map((k) => ESPACES.find((e) => e.cle === k)!)
    .filter((e) => (profil.role !== "STRUCTURE" || ESPACES_STRUCTURE.includes(e.cle)) && rubriquesVisibles(e, profil).length);
  const Icone = pole.icone;
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Pastille taille="lg">
          <Icone />
        </Pastille>
        <div className="min-w-0 flex-1">
          <EnTete titre={pole.titre} sousTitre={pole.description} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {espaces.map((e) => {
          const travail = travailEspace(e, profil, c);
          const rubriques = rubriquesVisibles(e, profil);
          const E = e.icone;
          return (
            <Link key={e.cle} href={e.accesDirect ?? `/espace/${e.cle}`} className="group flex flex-col rounded-3xl bg-white p-6 shadow-doux transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start gap-3">
                <Pastille ton={travail ? "jaune" : "gris"}>
                  <E />
                </Pastille>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-zinc-400">{rubriques.length} rubrique(s)</div>
                  <div className="text-[16px] font-semibold text-encre">{e.titre}</div>
                </div>
                {travail > 0 && <span className="rounded-full bg-or-400 px-2.5 py-0.5 text-[13px] font-bold text-zinc-900 tabular-nums">{travail}</span>}
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-zinc-500">{e.description}</p>
              <div className="mt-3 text-[12px] text-zinc-400">{rubriques.map((r) => r.libelle).join(" · ")}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-marque-700">
                Ouvrir <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
