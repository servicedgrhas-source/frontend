"use client";

import { ArrowLeftRight, ArrowRight, Bell, CheckCircle2, Clock3, Inbox, Printer, XCircle } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/session";
import { Alerte, Badge, Carte, Chargement, Chiffre, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";

interface TableauCircuit {
  perimetre: { national: boolean; structures: string[] };
  dossiers: { aTraiter: number; aSuivre: number; enRetard: number };
  plusAnciens: {
    id: string;
    numero: number;
    nomComplet: string;
    objet: string | null;
    etape: { sigle: string };
    depuis: number | null;
  }[];
  alertesNonLues: number;
  mutations: { total: number; enCours: number; enInstance: number; accordees: number; refusees: number };
}

interface Tache {
  id: string;
  libelle?: string;
  nomComplet?: string;
  action: string;
  detail: string;
}

const nf = new Intl.NumberFormat("fr-FR");
const LIBELLE_TACHE: Record<string, string> = {
  IMPRIMER: "Note à imprimer",
  IMPRIMER_DOSSIER: "Fiche et pièces à imprimer",
  SCANNER: "Scan de la note signée à joindre",
  ENVOYER: "À envoyer au secrétariat",
  CONFORMITE: "Avis de conformité à donner",
};

/**
 * Tableau de bord des comptes du circuit (DDEPPSA, cabinet, secrétariat) : leur travail
 * et les demandes où leurs structures interviennent — pas les chiffres de toute la DGRHAS.
 */
export function TableauDeBordCircuit() {
  const { profil } = useSession();
  const { donnees: t, erreur } = useApi<TableauCircuit>("/circuit/tableau");
  const taches = useApi<{ notes: Tache[]; dossiers: Tache[]; total: number }>("/notes/a-faire");
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!t) return <Chargement />;

  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const listeTaches = [...(taches.donnees?.dossiers ?? []), ...(taches.donnees?.notes ?? [])];
  const m = t.mutations;
  const perimetre = t.perimetre.national ? "Toutes les demandes de mutation" : `Demandes où intervient ${t.perimetre.structures.join(", ")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Bonjour, {profil.nom.split(" ")[0]}</h1>
        <p className="mt-0.5 text-sm text-zinc-400 first-letter:uppercase">{aujourdhui}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Chiffre
          href="/a-traiter"
          icone={<Inbox />}
          ton={t.dossiers.aTraiter ? "jaune" : "gris"}
          libelle="Dossiers à traiter"
          valeur={nf.format(t.dossiers.aTraiter)}
          detail={`${nf.format(t.dossiers.aSuivre)} à suivre`}
        />
        <Chiffre
          href="/a-traiter"
          icone={<Clock3 />}
          ton={t.dossiers.enRetard ? "rouge" : "gris"}
          libelle="En retard"
          valeur={nf.format(t.dossiers.enRetard)}
          detail="Plus de 7 jours à votre étape"
        />
        <Chiffre icone={<Bell />} ton={t.alertesNonLues ? "bleu" : "gris"} libelle="Alertes non lues" valeur={nf.format(t.alertesNonLues)} detail="Cloche « Alertes » du menu" />
        <Chiffre
          href="/a-traiter"
          icone={<Printer />}
          ton={taches.donnees?.total ? "jaune" : "gris"}
          libelle="Notes et impressions"
          valeur={taches.donnees ? nf.format(taches.donnees.total) : "…"}
          detail="Ce que vous avez à faire"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Carte
          titre="Les plus anciens à traiter"
          actions={
            <Link href="/a-traiter" className="inline-flex items-center gap-1 text-xs font-medium text-marque-700 hover:underline">
              Tout voir <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {!t.plusAnciens.length ? (
            <Vide>Aucun dossier ne vous attend.</Vide>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {t.plusAnciens.map((x) => (
                <li key={x.id}>
                  <Link href={`/mutation/${x.id}`} className="-mx-2 flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{x.nomComplet}</div>
                      <div className="text-xs text-zinc-400">
                        Demande n° {x.numero} · {x.objet ?? "mutation"}
                      </div>
                    </div>
                    <span className={`text-xs ${(x.depuis ?? 0) > 7 ? "font-semibold text-rouge-600" : "text-zinc-500"}`}>
                      {x.depuis === null ? "—" : x.depuis <= 0 ? "aujourd’hui" : `${nf.format(x.depuis)} j`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <Carte titre="Demandes de mutation">
          <p className="-mt-1 mb-4 text-xs text-zinc-400">{perimetre}</p>
          <ul className="space-y-2.5 text-[13px]">
            {(
              [
                [ArrowLeftRight, "En cours", m.enCours, "bleu"],
                [Clock3, "En instance", m.enInstance, "jaune"],
                [CheckCircle2, "Accordées", m.accordees, "vert"],
                [XCircle, "Refusées", m.refusees, "rouge"],
              ] as const
            ).map(([Icone, libelle, n, ton]) => (
              <li key={libelle} className="flex items-center gap-2.5">
                <Icone className="size-4 text-zinc-400" />
                <span className="flex-1">{libelle}</span>
                <Badge ton={n ? ton : "gris"}>{nf.format(n)}</Badge>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-zinc-100 pt-2.5 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{nf.format(m.total)}</span>
            </li>
          </ul>
        </Carte>
      </div>

      {listeTaches.length > 0 && (
        <Carte titre="Notes et impressions">
          <ul className="divide-y divide-zinc-100">
            {listeTaches.slice(0, 6).map((x) => (
              <li key={`${x.action}-${x.id}`}>
                <Link
                  href={x.action === "IMPRIMER_DOSSIER" || x.action === "ENVOYER" ? `/mutation/${x.id}` : `/note/${x.id}`}
                  className="-mx-2 flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{x.nomComplet ?? x.libelle}</div>
                    <div className="text-xs text-zinc-400">{LIBELLE_TACHE[x.action] ?? x.detail}</div>
                  </div>
                  <ArrowRight className="size-4 text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </div>
  );
}
