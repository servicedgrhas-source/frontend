"use client";

import { ArrowRight, CalendarPlus, CalendarRange, ClipboardCheck, Lock, Radio, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { peutRecenser } from "@/components/recensement/commun";
import { jourFr, type Campagne } from "@/components/recensement/recensement-ouvert";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Chargement, EnTete, Vide, cx } from "@/components/ui";
import { qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/*
 * Recensement (DG, 25/11/2026) : la page montre les recensements créés ; chacun ouvre sa page
 * (terrain, agents recenseurs, suivi, modèle Excel, contrôle des données).
 */

const nf = new Intl.NumberFormat("fr-FR");

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Recensements />
    </Suspense>
  );
}

function Recensements() {
  const { profil } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const r = useApi<{ lignes: Campagne[]; ouverte: { id: number; nom: string } | null }>("/recensement/campagnes");

  // Anciennes adresses (« /recensement?onglet=… », « ?recherche=… ») : leur nouvelle page
  const onglet = params.get("onglet");
  const recherche = params.get("recherche");
  const ouverte = r.donnees?.ouverte?.id;
  useEffect(() => {
    if (onglet) router.replace(`/recensement/controle${qs({ onglet })}`);
    else if (recherche && ouverte) router.replace(`/recensement/campagnes/${ouverte}${qs({ recherche })}`);
  }, [onglet, recherche, ouverte, router]);

  if (!peutRecenser(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;
  const gerer = peut.controler(profil.role);

  return (
    <div className="space-y-6">
      <EnTete
        titre="Recensement"
        sousTitre="Les recensements créés. Ouvrez-en un pour la mission sur le terrain, ses agents recenseurs, leur suivi, le modèle Excel, et le contrôle des données qu’il a produites."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/recensement/controle">
              <Bouton title="Les agents ajoutés et les fiches modifiées, tous recensements confondus">
                <ClipboardCheck /> Tout le contrôle
              </Bouton>
            </Link>
            {gerer && (
              <Link href="/recensement/campagnes">
                <Bouton variante="principal" title="Ouvrir un recensement, le modifier, le clôturer, voir son bilan">
                  {r.donnees?.ouverte ? <Settings2 /> : <CalendarPlus />} {r.donnees?.ouverte ? "Gérer les recensements" : "Ouvrir un recensement"}
                </Bouton>
              </Link>
            )}
          </div>
        }
      />

      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !r.donnees ? (
        <Chargement />
      ) : !r.donnees.lignes.length ? (
        <Vide>Aucun recensement pour l’instant.{gerer ? " « Ouvrir un recensement » : son nom, l’année, l’année scolaire, le début (la fin est facultative)." : ""}</Vide>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {r.donnees.lignes.map((c) => (
            <CarteRecensement key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Un recensement : celui qui est ouvert ressort (vert sombre), les clôturés restent sobres. */
function CarteRecensement({ c }: { c: Campagne }) {
  const ouvert = !c.clotureLe;
  const chiffres: [number, string][] = [
    [c.ajoutes, "ajouté(s)"],
    [c.modifications, "fiche(s) modifiée(s)"],
    [c.recenseurs, "recenseur(s)"],
  ];
  return (
    <Link
      href={`/recensement/campagnes/${c.id}`}
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-3xl p-6 shadow-doux transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        ouvert ? "bg-nuit text-white" : "bg-white text-encre",
      )}
    >
      {ouvert && <div className="bandeau-national absolute inset-x-0 top-0 h-1" aria-hidden />}
      <div className="flex items-start justify-between gap-3">
        <span className={cx("flex size-11 shrink-0 items-center justify-center rounded-2xl", ouvert ? "bg-white/10 text-or-400" : "bg-zinc-100 text-zinc-500")}>
          {ouvert ? <Radio className="size-5" /> : <CalendarRange className="size-5" />}
        </span>
        {ouvert ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marque-500/20 px-2.5 py-1 text-[11px] font-semibold text-marque-200">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-marque-300 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-marque-300" />
            </span>
            En cours
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
            <Lock className="size-3" /> Clôturé le {jourFr(c.clotureLe)}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-[18px] leading-snug font-semibold">{c.nom}</h2>
      <p className={cx("mt-1 text-[13px]", ouvert ? "text-white/60" : "text-zinc-500")}>
        {c.anneeScolaire ? `Année scolaire ${c.anneeScolaire}` : c.annee} · du {jourFr(c.debut)}
        {c.fin ? ` au ${jourFr(c.fin)}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chiffres.map(([n, t]) => (
          <span key={t} className={cx("rounded-full px-2.5 py-1 text-[12px]", ouvert ? "bg-white/10 text-white/80" : "bg-zinc-100 text-zinc-600")}>
            <strong className="tabular-nums">{nf.format(n)}</strong> {t}
          </span>
        ))}
        {c.aControler > 0 && (
          <span className="rounded-full bg-or-400 px-2.5 py-1 text-[12px] font-semibold text-zinc-900">
            <strong className="tabular-nums">{nf.format(c.aControler)}</strong> à contrôler
          </span>
        )}
      </div>
      <span className={cx("mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold", ouvert ? "text-or-400" : "text-marque-700")}>
        Ouvrir <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
