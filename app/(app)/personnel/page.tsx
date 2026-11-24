"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, FileWarning, Users } from "lucide-react";
import Link from "next/link";
import { CentreControleEffectifs } from "@/components/recensement/centre-controle";
import { libelleStatut, peutRecenser, useConfigRecensement } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { SqueletteTableauPersonnel } from "@/components/squelette";
import { Alerte, Carte, Chiffre, EnTete, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";
import { libelleRattachement } from "@/lib/structures";

interface Tableau {
  total: number;
  complets: number;
  tauxMoyen: number;
  parStatut: { statut: string; n: number; complets: number }[];
  parDepartement: { departementId: number | null; n: number; complets: number }[];
  champsManquants: { code: string; libelle: string; n: number }[];
  piecesManquantes: { code: string; libelle: string; n: number; total: number }[];
  controles: { code: string; libelle: string; n: number }[];
  parRattachement: { rattachement: string; n: number }[];
}

/**
 * Où sont rattachées les fiches (DG, 24/11/2026) : à une école, une inspection, une direction… ou à
 * rien. Chaque chiffre ouvre la liste des fiches.
 */
function OuRattachees({ lignes, total }: { lignes: Tableau["parRattachement"]; total: number }) {
  const avec = lignes.filter((x) => !x.rattachement.startsWith("SANS_"));
  const sans = lignes.filter((x) => x.rattachement.startsWith("SANS_"));
  const nAvec = avec.reduce((s, x) => s + x.n, 0);
  const pc = (n: number) => {
    const x = total ? (n / total) * 100 : 0;
    return x > 0 && x < 1 ? "moins de 1 %" : `${x.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
  };
  return (
    <Carte titre="Où sont rattachées les fiches">
      <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
        {nf.format(nAvec)} fiche(s) sur {nf.format(total)} ({pc(nAvec)}) sont rattachées à une structure : une école, mais aussi une inspection, une direction départementale ou une direction centrale. Le chiffre ouvre la liste des fiches.
      </p>
      <ul className="divide-y divide-zinc-100">
        {[...avec, ...sans].map((x) => (
          <LigneLien key={x.rattachement} href={`/personnel/agents?rattachement=${x.rattachement}`} texte={`${libelleRattachement(x.rattachement)} · ${pc(x.n)}`} n={x.n} ton={x.rattachement.startsWith("SANS_") ? "rouge" : "or"} />
        ))}
      </ul>
      {sans.some((x) => x.rattachement === "SANS_LIEU") && (
        <p className="mt-3 text-[11px] text-zinc-500">
          Les fiches qui ont un lieu écrit mais pas de structure se rattachent dans{" "}
          <Link href="/personnel/sans-ecole" className="font-medium text-marque-700 hover:underline">
            Personnel › Agents sans école
          </Link>
          . Le système ne rattache seul que si une seule école ou inspection porte ce nom dans le département : en cas de doute, il laisse la fiche sans structure.
        </p>
      )}
    </Carte>
  );
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
  const c = config.donnees?.configuration;
  const entete = (
    <EnTete
      titre="Personnel : tableau de bord"
      sousTitre="Où en est la base du personnel : toutes les fiches du système justifiées (centre de contrôle), fiches complètes, rubriques et pièces qui manquent, incohérences à corriger. Chaque ligne s’ouvre sur la liste des agents concernés."
    />
  );
  // Pendant le calcul : le titre tout de suite, et un squelette à la forme de la page
  if (!t)
    return (
      <div className="space-y-6">
        {entete}
        <SqueletteTableauPersonnel />
      </div>
    );

  return (
    <div className="space-y-6">
      {entete}

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

          {/* Toutes les fiches du système, justifiées une à une (DGRHAS : tout le pays) */}
          {peut.traiter(profil.role) && <CentreControleEffectifs />}

          {!!t.parRattachement?.length && <OuRattachees lignes={t.parRattachement} total={t.total} />}

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
            <p className="mt-3 text-[11px] text-zinc-500">
              Le chiffre à gauche est le nombre d’agents concernés ; « Voir » ouvre leur liste, avec « Corriger » sur chaque fiche. Les seuils de ces contrôles (âge minimum, âge de la retraite, nombre de
              fiches pour un même téléphone) et les règles de cohérence se modifient dans{" "}
              <Link href="/personnel/configuration" className="font-medium text-marque-700 hover:underline">
                Personnel › Configuration
              </Link>
              .
            </p>
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
            <Carte titre="Fiches complètes par département">
              <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
                Pour chaque département : combien de fiches sont complètes (toutes les rubriques obligatoires remplies et toutes les pièces exigées déposées) sur le nombre de fiches du
                département. La barre verte montre la part complète. Cliquez sur un département pour voir ses agents.
              </p>
              <ul className="space-y-2.5">
                {t.parDepartement.map((d) => (
                  <li key={String(d.departementId)}>
                    <Link href={`/personnel/agents?departement=${d.departementId ?? ""}`} className="grid grid-cols-[160px_1fr_190px] items-center gap-3 text-[13px] hover:text-marque-700">
                      <span>{refs.departements.find((x) => x.id === d.departementId)?.nom ?? "Non renseigné"}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div className="h-full rounded-full bg-marque-500" style={{ width: `${d.n ? Math.round((d.complets / d.n) * 100) : 0}%` }} />
                      </div>
                      <span className="text-right text-[12px] text-zinc-500 tabular-nums">
                        {nf.format(d.complets)} complètes sur {nf.format(d.n)} ({d.n ? Math.round((d.complets / d.n) * 100) : 0} %)
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
