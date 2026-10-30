"use client";

import { ArrowLeftRight, ArrowRight, CheckCircle2, ClipboardCheck, FileText, HandHeart, Layers, ShieldCheck, Stamp, TriangleAlert, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RechercheGlobale } from "@/components/recherche-globale";
import { TableauDeBordCircuit } from "@/components/tableau-circuit";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Chargement, Chiffre, Pastille, Progression } from "@/components/ui";
import { useApi } from "@/lib/api";
import { dateCourte, peut } from "@/lib/libelles";
import type { StatutNote } from "@/lib/types";

interface TableauBord {
  agents: { total: number; textesRecus: number; anomalies: number };
  affectations: { statut: string; n: number }[];
  notes: { module: string; statut: StatutNote; n: number }[];
  recommandations: { enAttente: number; avisDirecteur: number; decisionDg: number; total: number };
  /** Hors demandes retirées : total = en cours + en instance + accordées + refusées. */
  mutations: { total: number; accordees: number; refusees: number; enCours: number; enInstance: number };
  /** Paquets reçus de la FP (un envoi = une date de réception). */
  lots: { numero: number; dateReception: string | null; agents: number; affectes: number; lots: number }[];
  /** Mutations et autres prestations (congés, attestations…), hors demandes retirées. */
  demandes: { total: number; enCours: number; accordees: number; anomalies: number; autres: number; autresEnCours: number; enRetard: number };
  /** Base du personnel : seules les fiches acceptées comptent (pas celles en contrôle ou rejetées). */
  personnel: { total: number; complets: number; incomplets: number; aControler: number; aDecider: number; sansStructure: number; doublons: number; parStatut: Record<string, number> };
  registre: { volontaires: number; communautaires: number; sansCategorie: number; sansDepartement: number };
  /** Structures à compléter (organigramme). */
  structures?: { sansCycle: number; ecolesSansInspection: number; sansSuperieure: number };
  paiementsDuMois: { population: string; statut: string; effectif: number; total: string }[];
  ecoles: { ecoles: number; classes: number };
}

const nf = new Intl.NumberFormat("fr-FR");

/** Paquets montrés sur l'accueil (les plus récents) ; la page « Lots » les a tous. */
const PAQUETS_HISTOGRAMME = 12;
const PAQUETS_LISTE = 6;

/** Comptes du circuit (DDEPPSA, cabinet, secrétariat) : leur propre tableau de bord. */
const ROLES_CIRCUIT_SEUL = ["DDEPPSA", "CABINET", "SECRETARIAT"];

export default function TableauDeBord() {
  const { profil } = useSession();
  return ROLES_CIRCUIT_SEUL.includes(profil.role) ? <TableauDeBordCircuit /> : <TableauDeBordDgrhas />;
}

/** Tableau de bord de la DGRHAS : chiffres de tout le pays. */
function TableauDeBordDgrhas() {
  const { profil } = useSession();
  const { donnees: t, erreur } = useApi<TableauBord>("/tableau-de-bord");
  // Alertes de dépassement d'enveloppe : visibles du DG seulement
  const alertes = useApi<{ niveau: "rouge" | "jaune"; texte: string }[]>(peut.parametrer(profil.role) ? "/pilotage/alertes" : null);
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!t) return <Chargement />;

  const aff = (s: string) => t.affectations.find((x) => x.statut === s)?.n ?? 0;
  const notes = (m: string, s: StatutNote) => t.notes.find((x) => x.module === m && x.statut === s)?.n ?? 0;
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const totalTextes = t.lots.reduce((s, l) => s + l.agents, 0);
  const moisCourant = new Date().toLocaleDateString("fr-FR", { month: "long" });
  const bourse = t.paiementsDuMois.find((x) => x.population === "VOLONTAIRE");
  const paiement = !t.registre.volontaires
    ? "registre vide"
    : !bourse
      ? `bourse de ${moisCourant} à préparer`
      : bourse.statut === "VALIDE"
        ? `bourse de ${moisCourant} validée`
        : `bourse de ${moisCourant} en projet`;
  const totalAffectes = t.lots.reduce((s, l) => s + l.affectes, 0);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* ----------------------------- Colonne principale ----------------------------- */}
      <div className="min-w-0 space-y-6">
        {peut.traiter(profil.role) && <RechercheGlobale />}
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Bonjour, {profil.nom.split(" ")[0]}</h1>
          <p className="mt-0.5 text-sm text-zinc-400 first-letter:uppercase">{aujourdhui}</p>
        </div>

        {alertes.donnees?.map((a, i) => (
          <Alerte key={i} ton={a.niveau}>
            {a.texte}{" "}
            <Link href="/pilotage" className="font-semibold underline">
              Voir le pilotage
            </Link>
          </Alerte>
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          <Chiffre
            href="/personnel"
            icone={<UserRound />}
            ton="vert"
            libelle="Agents dans la base du personnel"
            valeur={nf.format(t.personnel.total)}
            detail={
              [
                ["FONCTIONNAIRE", "fonctionnaires"],
                ["CONTRACTUEL", "contractuels"],
                ["VOLONTAIRE", "volontaires"],
                ["COMMUNAUTAIRE", "communautaires"],
              ]
                .filter(([k]) => t.personnel.parStatut[k])
                .map(([k, l]) => `${nf.format(t.personnel.parStatut[k])} ${l}`)
                .join(" · ") || "Aucun agent pour l’instant"
            }
          />
          <Chiffre href="/recrutement" icone={<Users />} libelle="Recrutés en cours (base des recrutés)" valeur={nf.format(t.agents.total)} detail={`Candidats suivis jusqu’à leur affectation · ${nf.format(t.agents.textesRecus)} textes reçus de la FP`} />
          <Chiffre
            href="/affectations"
            icone={<ClipboardCheck />}
            ton="jaune"
            libelle="À affecter"
            valeur={nf.format(aff("A_TRAITER"))}
            detail={`${nf.format(aff("AFFECTE"))} affectés · ${nf.format(aff("EXCLU"))} exclus`}
          />
          {/* Le registre (qui sert à payer la bourse) fait foi ; tant qu'il est vide, les volontaires et
              communautaires de la base du personnel sont montrés, pour ne pas afficher 0 à tort */}
          {t.registre.volontaires || t.registre.communautaires || !(t.personnel.parStatut.VOLONTAIRE || t.personnel.parStatut.COMMUNAUTAIRE) ? (
            <Chiffre href="/enrolement/volontaires" icone={<HandHeart />} ton="vert" libelle="Volontaires en poste" valeur={nf.format(t.registre.volontaires)} detail={`${nf.format(t.registre.communautaires)} communautaires · ${paiement}`} />
          ) : (
            <Chiffre
              href="/personnel/agents?statut=VOLONTAIRE"
              icone={<HandHeart />}
              ton="vert"
              libelle="Volontaires dans la base du personnel"
              valeur={nf.format(t.personnel.parStatut.VOLONTAIRE ?? 0)}
              detail={`${nf.format(t.personnel.parStatut.COMMUNAUTAIRE ?? 0)} communautaires · registre de la bourse encore vide`}
            />
          )}
          <Chiffre
            href="/mutations"
            icone={<ArrowLeftRight />}
            ton="bleu"
            libelle="Demandes de mutation"
            valeur={nf.format(t.mutations.total)}
            detail={[
              `${nf.format(t.mutations.enCours)} en cours`,
              t.mutations.enInstance ? `${nf.format(t.mutations.enInstance)} en instance` : null,
              `${nf.format(t.mutations.accordees)} accordées`,
              t.demandes.autres ? `${nf.format(t.demandes.autres)} autre(s) demande(s)` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Chiffre
            href="/recommandations"
            icone={<Stamp />}
            ton={t.recommandations.enAttente ? "rouge" : "gris"}
            libelle="Recommandations en attente"
            valeur={t.recommandations.enAttente}
            detail={t.recommandations.enAttente ? `${t.recommandations.avisDirecteur} chez le directeur · ${t.recommandations.decisionDg} chez le DG` : "Affectations, mutations, enrôlements"}
          />
        </div>

        <Carte
          titre="Textes reçus par paquet"
          actions={
            <span className="text-xs text-zinc-400">
              {t.lots.length > PAQUETS_HISTOGRAMME ? `${PAQUETS_HISTOGRAMME} derniers paquets · ` : ""}
              {nf.format(totalTextes)} agents au total
            </span>
          }
        >
          <Histogramme lots={t.lots.slice(-PAQUETS_HISTOGRAMME)} />
        </Carte>

        <Carte
          titre="Paquets de textes de la Fonction Publique"
          actions={
            <Link href="/lots" className="inline-flex items-center gap-1 text-xs font-medium text-marque-700 hover:underline">
              Tout gérer <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <ul className="divide-y divide-zinc-100">
            {[...t.lots].reverse().slice(0, PAQUETS_LISTE).map((l) => {
              const fini = l.agents > 0 && l.affectes === l.agents;
              return (
                <li key={l.numero}>
                  <Link href="/lots" className="-mx-2 flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50">
                    <Pastille ton={fini ? "vert" : l.affectes ? "jaune" : "gris"}>
                      {fini ? <CheckCircle2 /> : <Layers />}
                    </Pastille>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">Paquet du {dateCourte(l.dateReception)}</div>
                      <div className="text-xs text-zinc-400">{l.lots} lot(s) : par quota et par type de texte</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{nf.format(l.agents)}</div>
                      <div className="text-[11px] text-zinc-400">{l.affectes ? `${nf.format(l.affectes)} affectés` : "à traiter"}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {t.lots.length > PAQUETS_LISTE && (
            <Link href="/lots" className="mt-2 block text-center text-xs text-zinc-500 hover:text-encre hover:underline">
              {t.lots.length - PAQUETS_LISTE} paquet(s) plus ancien(s) : voir tous les paquets
            </Link>
          )}
        </Carte>
      </div>

      {/* ------------------------------- Panneau de droite ------------------------------- */}
      <aside className="space-y-6 xl:border-l xl:border-zinc-200/70 xl:pl-8">
        {/* En premier : ce qui reste à corriger, toutes bases confondues */}
        <Fiabiliser t={t} />
        <section>
          <h2 className="text-[15px] font-semibold">Avancement des affectations</h2>
          <p className="mb-4 text-xs text-zinc-400">
            {nf.format(totalAffectes)} agents affectés sur {nf.format(totalTextes)}
            {t.lots.length > PAQUETS_LISTE ? ` · ${PAQUETS_LISTE} derniers paquets` : ""}
          </p>
          <ul className="space-y-4">
            {[...t.lots].reverse().slice(0, PAQUETS_LISTE).map((l) => {
              const p = l.agents ? (100 * l.affectes) / l.agents : 0;
              return (
                <li key={l.numero}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="text-zinc-600">Paquet du {dateCourte(l.dateReception)}</span>
                    <span className="text-xs font-medium tabular-nums text-zinc-500">{Math.round(p)} %</span>
                  </div>
                  <Progression valeur={p} ton={p >= 100 ? "vert" : p > 0 ? "jaune" : "gris"} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-doux">
          <h2 className="mb-3 text-[15px] font-semibold">Notes de service</h2>
          {[
            ["AFFECTATION", "Affectations", "/notes/affectation"],
            ["MUTATION", "Mutations", "/notes/mutation"],
            ["ENROLEMENT", "Enrôlement", "/notes/enrolement"],
            ["NOMINATION", "Nominations", "/notes/nomination"],
          ].map(([m, lib, href]) => (
            <Link key={m} href={href} className="-mx-2 block rounded-2xl px-2 py-2.5 transition hover:bg-zinc-50">
              <div className="mb-2 flex items-center gap-2.5">
                <Pastille ton="gris" taille="sm"><FileText /></Pastille>
                <span className="flex-1 text-[13px] font-medium">{lib}</span>
                <ArrowRight className="size-3.5 text-zinc-300" />
              </div>
              {/* Une case par étape, chacune avec son libellé : pas de chiffre à deviner */}
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    ["BROUILLON", "À soumettre", "bg-zinc-50 text-zinc-700"],
                    ["SOUMISE", "Chez le DG", "bg-or-100 text-or-700"],
                    ["VALIDEE", "Validées", "bg-sky-50 text-sky-700"],
                    ["SIGNEE", "Signées", "bg-marque-50 text-marque-700"],
                  ] as [StatutNote, string, string][]
                ).map(([s, libelle, couleur]) => (
                  <div key={s} className={`rounded-xl px-1 py-1.5 text-center ${notes(m, s) ? couleur : "bg-zinc-50 text-zinc-300"}`}>
                    <div className="text-[15px] font-semibold leading-none tabular-nums">{notes(m, s)}</div>
                    <div className="mt-1 text-[9.5px] leading-tight">{libelle}</div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </section>

      </aside>
    </div>
  );
}

/**
 * Bases à fiabiliser : ce qui reste à corriger dans toutes les bases (recrutés, personnel, registre de l’enrôlement,
 * demandes), une ligne par problème, avec le lien vers la liste à corriger. Rien à corriger : « Bases fiables ».
 */
function Fiabiliser({ t }: { t: TableauBord }) {
  const toutes: { n: number; texte: string; href: string; ton: "rouge" | "jaune" }[] = [
    { n: t.agents.anomalies, texte: "fiche(s) de la base des recrutés avec une anomalie (date, département, diplôme…)", href: "/recrutement?anomalies=1", ton: "rouge" },
    { n: t.personnel.doublons, texte: "agent(s) du personnel en double probable (même nom, même date de naissance)", href: "/personnel/agents?controle=DOUBLON", ton: "rouge" },
    { n: t.registre.sansCategorie, texte: "volontaire(s) ou communautaire(s) en poste sans catégorie (pas de montant)", href: "/enrolement/volontaires", ton: "rouge" },
    { n: t.registre.sansDepartement, texte: "volontaire(s) ou communautaire(s) en poste sans département", href: "/enrolement/volontaires", ton: "rouge" },
    { n: t.personnel.aControler, texte: "agent(s) ajouté(s) au recensement à contrôler", href: "/recensement?onglet=controler", ton: "jaune" },
    { n: t.structures?.sansCycle ?? 0, texte: "inspection(s) ou école(s) sans cycle (pas de préfixe, pas de besoin calculé)", href: "/administration/organigramme?completer=1", ton: "jaune" },
    { n: t.structures?.ecolesSansInspection ?? 0, texte: "école(s) rattachée(s) à aucune inspection", href: "/administration/organigramme?completer=1", ton: "jaune" },
    { n: t.structures?.sansSuperieure ?? 0, texte: "inspection(s), direction(s), service(s) ou bureau(x) sans structure supérieure (circuit bloqué)", href: "/administration/organigramme?completer=1", ton: "rouge" },
    { n: t.personnel.aDecider, texte: "agent(s) ajouté(s) au recensement à accepter ou rejeter (DG)", href: "/recensement?onglet=decider", ton: "jaune" },
    { n: t.personnel.incomplets, texte: "fiche(s) du personnel incomplète(s) (rubriques ou pièces)", href: "/personnel/agents?complet=non", ton: "jaune" },
    { n: t.personnel.sansStructure, texte: "agent(s) du personnel sans établissement de rattachement", href: "/personnel", ton: "jaune" },
    { n: t.demandes.anomalies, texte: "demande(s) de mutation en cours avec une anomalie", href: "/mutations", ton: "jaune" },
    { n: t.demandes.enRetard, texte: "demande(s) à la même étape depuis plus de 7 jours", href: "/a-traiter", ton: "jaune" },
  ];
  const lignes = toutes.filter((x) => x.n > 0);
  if (!lignes.length)
    return <Encart titre="Bases fiables" texte="Aucune anomalie dans les bases des recrutés, du personnel et de l’enrôlement." href="/personnel" action="Voir le personnel" />;
  return (
    <section className="rounded-3xl bg-white p-5 shadow-doux">
      <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
        <TriangleAlert className="size-4 text-or-700" /> Bases à fiabiliser
      </h2>
      <p className="mb-3 text-[12px] text-zinc-500">Ce qui reste à corriger, toutes bases confondues. Un clic ouvre la liste.</p>
      <ul className="space-y-1">
        {lignes.map((x) => (
          <li key={x.texte}>
            <Link href={x.href} className="-mx-2 flex items-start gap-3 rounded-2xl px-2 py-2 transition hover:bg-zinc-50">
              <span className={`min-w-12 text-right text-[15px] font-semibold tabular-nums ${x.ton === "rouge" ? "text-rouge-600" : "text-or-700"}`}>{nf.format(x.n)}</span>
              <span className="flex-1 text-[12.5px] leading-snug text-zinc-600">{x.texte}</span>
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-zinc-300" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-100 pt-3 text-[11px] text-zinc-400">
        <ShieldCheck className="size-3.5" /> {nf.format(t.personnel.complets)} fiche(s) du personnel complète(s) sur {nf.format(t.personnel.total)}
      </div>
    </section>
  );
}

/** Encart d'action du panneau de droite, aux couleurs nationales. */
function Encart({ titre, texte, href, action, alerte }: { titre: string; texte: string; href: string; action: string; alerte?: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-marque-50 to-white p-5 text-center shadow-doux">
      <div className="mx-auto mb-4 flex h-20 items-end justify-center gap-1.5" aria-hidden>
        <span className="h-10 w-7 rounded-t-xl bg-marque-500" />
        <span className="h-16 w-7 rounded-t-xl bg-or-400" />
        <span className="h-12 w-7 rounded-t-xl bg-rouge-600" />
      </div>
      <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
        {alerte && <TriangleAlert className="size-4 text-or-700" />}
        {titre}
      </div>
      <p className="mx-auto mt-1.5 max-w-60 text-xs leading-relaxed text-zinc-500">{texte}</p>
      <Link href={href}>
        <Bouton variante="sombre" className="mt-4 w-full">
          {action}
        </Bouton>
      </Link>
    </section>
  );
}

/** Histogramme d'une seule série (textes par paquet), avec info-bulle au survol. */
function Histogramme({ lots }: { lots: TableauBord["lots"] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const max = Math.max(1, ...lots.map((l) => l.agents));
  // « jj/mm » ; l'année en dessous (« 2026 ») si les paquets montrés couvrent plusieurs années :
  // sur une seule ligne, douze dates « jj/mm/aa » ne tiennent pas et poussent les barres hors du cadre
  const annees = new Set(lots.map((l) => l.dateReception?.slice(0, 4)));
  const surDeuxLignes = annees.size > 1;
  const basEtiquettes = surDeuxLignes ? "2.25rem" : "1.5rem";
  const graduations = [0, 0.5, 1].map((f) => Math.round(f * max));

  return (
    <div className="relative">
      <div className="flex h-44 gap-1.5 pl-9 sm:gap-3">
        {/* graduations */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col-reverse justify-between" style={{ bottom: basEtiquettes }}>
          {graduations.map((g) => (
            <div key={g} className="flex items-center gap-2">
              <span className="w-7 text-right text-[10px] tabular-nums text-zinc-300">{nf.format(g)}</span>
              <span className="h-px flex-1 bg-zinc-100" />
            </div>
          ))}
        </div>
        {lots.map((l) => {
          const h = (l.agents / max) * 100;
          const affH = l.agents ? (l.affectes / l.agents) * 100 : 0;
          return (
            <div
              key={l.numero}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setSurvol(l.numero)}
              onMouseLeave={() => setSurvol(null)}
            >
              {survol === l.numero && (
                <div className="absolute z-10 rounded-xl bg-nuit px-3 py-2 text-[11px] whitespace-nowrap text-white shadow-lg" style={{ bottom: `calc(${h}% + 0.5rem)` }}>
                  <div className="font-semibold">Paquet du {dateCourte(l.dateReception)}</div>
                  <div className="text-white/70">{nf.format(l.agents)} textes · {nf.format(l.affectes)} affectés</div>
                </div>
              )}
              <div className="relative flex w-full max-w-9 items-end" style={{ height: `calc(100% - ${basEtiquettes})` }}>
                <div
                  className={`relative w-full overflow-hidden rounded-t-[4px] transition-colors ${survol === l.numero ? "bg-marque-300" : "bg-marque-200"}`}
                  style={{ height: `${Math.max(h, 1.5)}%` }}
                >
                  <div className="absolute inset-x-0 bottom-0 bg-marque-500" style={{ height: `${affH}%` }} />
                </div>
              </div>
              <span className={`mt-2 text-center text-[11px] leading-tight tabular-nums ${survol === l.numero ? "font-medium text-encre" : "text-zinc-400"}`}>
                {dateCourte(l.dateReception).slice(0, 5)}
                {surDeuxLignes && <span className="block text-[10px]">{l.dateReception?.slice(0, 4)}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-marque-200" /> Textes reçus</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-marque-500" /> Dont affectés</span>
      </div>
    </div>
  );
}
