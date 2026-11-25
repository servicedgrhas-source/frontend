"use client";

import { ArrowLeft, ArrowRight, ClipboardCheck, Download, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { peutRecenser } from "@/components/recensement/commun";
import { jourFr, type Campagne } from "@/components/recensement/recensement-ouvert";
import { ImportFichier } from "@/components/recensement/import-fichier";
import { RechercheAgent } from "@/components/recensement/recherche-agent";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Chargement, cx } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { accesDonne, ESPACES, rubriquesVisibles } from "@/lib/espaces";

/*
 * Un recensement (DG, 25/11/2026) : ses pages (terrain, agents recenseurs, suivi, modèle Excel) et
 * le contrôle des données qu'il a produites (à contrôler, à décider par le DG, acceptés, rejetés).
 */

const nf = new Intl.NumberFormat("fr-FR");
// Les pages d'un recensement, dans cet ordre (libellé, icône et explication : ceux du menu)
const PAGES = ["/recensement/terrain", "/recensement/recenseurs", "/recensement/recenseurs/suivi", "/personnel/import"];

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <UnRecensement />
    </Suspense>
  );
}

function UnRecensement() {
  const { profil } = useSession();
  const { id } = useParams<{ id: string }>();
  const recherche = useSearchParams().get("recherche") ?? "";
  const r = useApi<{ lignes: Campagne[] }>("/recensement/campagnes");
  const [erreur, setErreur] = useState<string | null>(null);

  if (!peutRecenser(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;
  if (r.erreur) return <Alerte>{r.erreur}</Alerte>;
  if (!r.donnees) return <Chargement />;
  const c = r.donnees.lignes.find((x) => String(x.id) === id);
  if (!c) return <Alerte>Ce recensement n’existe pas (ou plus).</Alerte>;
  const ouvert = !c.clotureLe;
  const rubriques = ESPACES.flatMap((e) => rubriquesVisibles(e, profil));
  const pages = PAGES.map((href) => rubriques.find((x) => x.href === href)).filter((x): x is NonNullable<typeof x> => !!x);
  const bilan = () => api.telecharger(`/recensement/campagnes/${c.id}/bilan.xlsx`, `Bilan ${c.nom}.xlsx`).catch((e: Error) => setErreur(e.message));

  return (
    <div className="space-y-6">
      <Link href="/recensement" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-marque-700 hover:underline">
        <ArrowLeft className="size-4" /> Les recensements
      </Link>

      {/* En-tête : le recensement, ce qu'il a produit, le contrôle de ses données */}
      <section className={cx("relative overflow-hidden rounded-3xl p-6 shadow-doux sm:p-8", ouvert ? "bg-nuit text-white" : "bg-white")}>
        {ouvert && <div className="bandeau-national absolute inset-x-0 top-0 h-1" aria-hidden />}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className={cx("text-[12px] font-semibold tracking-wide uppercase", ouvert ? "text-or-400" : "text-zinc-400")}>
              {ouvert ? "Recensement en cours" : (
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3" /> Clôturé le {jourFr(c.clotureLe)}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight">{c.nom}</h1>
            <p className={cx("mt-1 text-[14px]", ouvert ? "text-white/60" : "text-zinc-500")}>
              {c.anneeScolaire ? `Année scolaire ${c.anneeScolaire}` : c.annee} · du {jourFr(c.debut)}
              {c.fin ? ` au ${jourFr(c.fin)}` : " (fin non fixée)"}
            </p>
            {c.observation && <p className={cx("mt-2 max-w-2xl text-[13px]", ouvert ? "text-white/70" : "text-zinc-600")}>{c.observation}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/recensement/controle?campagne=${c.id}`}>
              <Bouton variante="principal" className="h-11 px-5 text-[14px]">
                <ClipboardCheck /> Contrôle des données
                {c.aControler > 0 && <span className="ml-1 rounded-full bg-or-400 px-2 py-px text-[11px] font-bold text-zinc-900 tabular-nums">{nf.format(c.aControler)}</span>}
              </Bouton>
            </Link>
            <Bouton className="h-11" onClick={() => void bilan()} title="Le bilan de ce recensement en Excel">
              <Download /> Bilan
            </Bouton>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              [c.ajoutes, "agent(s) ajouté(s)"],
              [c.modifications, "fiche(s) modifiée(s)"],
              [c.signalements, "constat(s) du terrain"],
              [c.recenseurs, "agent(s) recenseur(s)"],
            ] as [number, string][]
          ).map(([n, t]) => (
            <div key={t} className={cx("rounded-2xl px-4 py-3", ouvert ? "bg-white/[0.06]" : "bg-zinc-50")}>
              <div className="text-[22px] font-semibold tabular-nums">{nf.format(n)}</div>
              <div className={cx("text-[12px]", ouvert ? "text-white/55" : "text-zinc-500")}>{t}</div>
            </div>
          ))}
        </div>
      </section>
      {erreur && <Alerte>{erreur}</Alerte>}

      {/* Les pages du recensement */}
      {!ouvert && <Alerte ton="bleu">Ce recensement est clôturé : le terrain, les agents recenseurs, leur suivi et l’import servent au recensement en cours. Ses données restent à contrôler ici.</Alerte>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pages.map((p) => {
          const I = p.icone;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-disabled={!ouvert}
              tabIndex={ouvert ? undefined : -1}
              className={cx(
                "group flex flex-col rounded-3xl bg-white p-5 shadow-doux transition-all duration-200",
                ouvert ? "hover:-translate-y-0.5 hover:shadow-lg" : "pointer-events-none opacity-55",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-marque-50 text-marque-700">
                <I className="size-5" />
              </span>
              <h2 className="mt-4 text-[16px] font-semibold text-encre">{p.libelle}</h2>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-zinc-500">{p.explication}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-marque-700">
                Ouvrir <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      {ouvert && (
        <>
          <RechercheAgent rechercheInitiale={recherche} />
          {/* Le fichier d'un recensement fait sur le terrain : ses nouveaux agents passent au contrôle */}
          <ImportFichier titre="Importer le fichier d’un recensement" recensement apres={() => r.recharger()} />
        </>
      )}
    </div>
  );
}
