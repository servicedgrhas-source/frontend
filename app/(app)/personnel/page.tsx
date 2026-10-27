"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, FileWarning, Users } from "lucide-react";
import Link from "next/link";
import { libelleStatut, peutRecenser, useConfigRecensement } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Carte, Chargement, Chiffre, EnTete, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";

interface Tableau {
  total: number;
  complets: number;
  tauxMoyen: number;
  parStatut: { statut: string; n: number; complets: number }[];
  parDepartement: { departementId: number | null; n: number; complets: number }[];
  champsManquants: { code: string; libelle: string; n: number }[];
  piecesManquantes: { code: string; libelle: string; n: number; total: number }[];
  controles: { code: string; libelle: string; n: number }[];
}

const nf = new Intl.NumberFormat("fr-FR");

function LigneLien({ href, texte, n, ton = "or" }: { href: string; texte: string; n: number; ton?: "or" | "rouge" }) {
  return (
    <li>
      <Link href={href} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 text-[13px] hover:bg-zinc-50">
        <span className={`min-w-14 text-right font-semibold tabular-nums ${ton === "rouge" ? "text-rouge-600" : "text-or-700"}`}>{nf.format(n)}</span>
        <span className="flex-1">{texte}</span>
        <span className="text-[12px] font-medium text-marque-700">Voir</span>
        <ArrowRight className="size-3.5 text-zinc-300" />
      </Link>
    </li>
  );
}

/** Tableau de bord du recensement : avancement, ce qui manque, incohérences à corriger. */
export default function TableauRecensement() {
  const { profil, refs } = useSession();
  const config = useConfigRecensement();
  const { donnees: t, erreur } = useApi<Tableau>("/recensement/tableau");
  if (!peutRecenser(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!t) return <Chargement />;
  const c = config.donnees?.configuration;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Personnel : tableau de bord"
        sousTitre="Où en est la base du personnel : agents, fiches complètes, rubriques et pièces qui manquent, incohérences à corriger. Chaque ligne s’ouvre sur la liste des agents concernés."
      />

      {!t.total ? (
        <Carte>
          <Vide>
            Aucun agent dans la base pour l’instant. Commencez par{" "}
            <Link href="/personnel/import" className="font-medium text-marque-700 hover:underline">
              importer une liste Excel
            </Link>{" "}
            (le modèle se télécharge sur la même page) ou{" "}
            <Link href="/personnel/agents/nouveau" className="font-medium text-marque-700 hover:underline">
              créer une fiche
            </Link>
            .
          </Vide>
        </Carte>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Chiffre href="/personnel/agents" icone={<Users />} ton="bleu" libelle="Agents dans la base" valeur={nf.format(t.total)} detail={t.parStatut.map((s) => `${nf.format(s.n)} ${libelleStatut(c, s.statut).toLowerCase()}`).join(" · ")} />
            <Chiffre href="/personnel/agents?complet=oui" icone={<CheckCircle2 />} ton="vert" libelle="Fiches complètes" valeur={nf.format(t.complets)} detail={`${t.total ? Math.round((t.complets / t.total) * 100) : 0} % des fiches`} />
            <Chiffre href="/personnel/agents?complet=non" icone={<FileWarning />} ton="jaune" libelle="À compléter" valeur={nf.format(t.total - t.complets)} detail={`complétude moyenne : ${t.tauxMoyen} %`} />
            <Chiffre icone={<AlertTriangle />} ton={t.controles.length ? "rouge" : "gris"} libelle="Incohérences" valeur={nf.format(t.controles.reduce((s, x) => s + x.n, 0))} detail={`${t.controles.length} type(s) de contrôle`} />
          </div>

          <Carte titre="Incohérences et contrôles">
            {!t.controles.length ? (
              <Vide>Aucune incohérence repérée.</Vide>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {t.controles.map((x) => (
                  <LigneLien key={x.code} href={`/personnel/agents?controle=${encodeURIComponent(x.code)}`} texte={x.libelle} n={x.n} ton="rouge" />
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-zinc-400">Âges, téléphone partagé et règles de cohérence se règlent dans « Configuration ».</p>
          </Carte>

          <div className="grid gap-6 xl:grid-cols-2">
            <Carte titre="Rubriques obligatoires non remplies">
              {!t.champsManquants.length ? (
                <Vide>Toutes les rubriques obligatoires sont remplies.</Vide>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {t.champsManquants.map((x) => (
                    <LigneLien key={x.code} href={`/personnel/agents?manque=${x.code}`} texte={`sans « ${x.libelle} »`} n={x.n} />
                  ))}
                </ul>
              )}
            </Carte>
            <Carte titre="Pièces justificatives manquantes">
              {!t.piecesManquantes.length ? (
                <Vide>Toutes les pièces exigées sont déposées.</Vide>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {t.piecesManquantes.map((x) => (
                    <LigneLien key={x.code} href={`/personnel/agents?manque=piece:${x.code}`} texte={`sans « ${x.libelle} »${x.total > x.n ? ` (${nf.format(x.total)} pièces)` : ""}`} n={x.n} />
                  ))}
                </ul>
              )}
            </Carte>
          </div>

          {t.parDepartement.length > 1 && (
            <Carte titre="Avancement par département">
              <ul className="space-y-2.5">
                {t.parDepartement.map((d) => (
                  <li key={String(d.departementId)}>
                    <Link href={`/personnel/agents?departement=${d.departementId ?? ""}`} className="grid grid-cols-[160px_1fr_120px] items-center gap-3 text-[13px] hover:text-marque-700">
                      <span>{refs.departements.find((x) => x.id === d.departementId)?.nom ?? "Non renseigné"}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div className="h-full rounded-full bg-marque-500" style={{ width: `${d.n ? Math.round((d.complets / d.n) * 100) : 0}%` }} />
                      </div>
                      <span className="text-right text-[12px] text-zinc-500 tabular-nums">
                        {nf.format(d.complets)} / {nf.format(d.n)} complètes
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Carte>
          )}
        </>
      )}
    </div>
  );
}
