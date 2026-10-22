import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { cx } from "./ui";

type Porte = "saisie" | "reception" | "base";

const PORTES: { cle: Porte; titre: string; lien: string; quoi: string; circuit: string }[] = [
  {
    cle: "saisie",
    titre: "Saisie des candidats",
    lien: "/candidats",
    quoi: "De nouveaux candidats, qui n’ont pas encore d’arrêté ni de décret.",
    circuit: "Ils suivent tout le circuit : contrôle, validation du DG, envoi à la FP.",
  },
  {
    cle: "reception",
    titre: "Réception des textes",
    lien: "/reception",
    quoi: "Les arrêtés et décrets renvoyés par la FP, pour les personnes envoyées ; et le quota « Autres » (personnes sur les textes, non envoyées par nous).",
    circuit: "C’est la suite normale du circuit : la personne est prête pour l’affectation.",
  },
  {
    cle: "base",
    titre: "Base des recrutés",
    lien: "/recrutement",
    quoi: "Un travail fait avant le système ou en dehors (fiche de suivi complète, textes déjà sortis).",
    circuit: "Les personnes entrent directement, sans contrôle ni validation : à utiliser avec prudence.",
  },
];

/** Rappelle, sur chaque écran d'import, quelle porte d'entrée choisir. */
export function GuideImports({ ici }: { ici: Porte }) {
  return (
    <div className="rounded-2xl bg-or-100 p-4 ring-1 ring-or-400/50">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-or-700">
        <TriangleAlert className="size-4" /> Avant d’importer : êtes-vous au bon endroit ?
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {PORTES.map((p) => (
          <div key={p.cle} className={cx("rounded-xl p-3 text-[12px] leading-relaxed", p.cle === ici ? "bg-white shadow-doux ring-2 ring-or-400" : "bg-white/60")}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <strong className="text-[13px] text-encre">{p.titre}</strong>
              {p.cle === ici ? (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-or-400 px-2 py-0.5 text-[10px] font-semibold text-zinc-900">Vous êtes ici</span>
              ) : (
                <Link href={p.lien} className="inline-flex items-center gap-1 text-[11px] font-medium text-marque-700 underline">
                  Y aller <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
            <div className="text-zinc-600">{p.quoi}</div>
            <div className="mt-1 text-zinc-400">{p.circuit}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-or-700">
        Recommandé : suivre le circuit <strong>saisie → contrôle → validation → envoi à la FP → réception des textes</strong>. Ainsi, chaque personne est vérifiée avant d’être affectée.
      </p>
    </div>
  );
}
