"use client";

import { ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Circle, CircleDot, Rocket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { deMois, fcfa, moisFr, nf } from "@/components/enrolement/volontaires";
import { Aide, cx } from "@/components/ui";
import { useApi } from "@/lib/api";

interface Guide {
  mois: string;
  registre: { enPoste: number; sortis: number; notes: number; sansCategorie: number; sansDepartement: number };
  misesEnRoute: { reprises: number; projets: number; valides: number; sansMiseEnRoute: number; notesSansMiseEnRoute: string | null };
  bourse: { valides: number; dernierValide: string | null; moisCourant: { id: number; statut: string; bloquants: number; effectif: number; total: number } | null };
  campagne: { id: number; annee: number; ouverte: boolean; quota: number; aControler: number; aDecider: number; retenus: number; sansDepartement: number; horsNote: number; membres: number } | null;
  notes: { aSoumettre: number; soumises: number; validees: number; signeesSansScan: number; signees: number };
  enrolesAIntegrer: number;
  regularisations: { enAttente: number; tropPercus: number };
}

type Etat = "fait" | "afaire" | "info" | "attente";

interface Etape {
  titre: string;
  quoi: string;
  qui: string;
  href: string;
  ou: string;
  etat: Etat;
  /** Ce que dit l'état (« 12 dossiers à contrôler », « Fait »…). */
  detail: string;
}

type Parcours = "mois" | "annee" | "demarrage";

const ETATS: Record<Etat, { icone: typeof Circle; classe: string }> = {
  fait: { icone: CheckCircle2, classe: "text-marque-600" },
  afaire: { icone: CircleDot, classe: "text-or-700" },
  info: { icone: Circle, classe: "text-zinc-300" },
  attente: { icone: Circle, classe: "text-zinc-300" },
};

const pluriel = (n: number, un: string, plusieurs: string) => `${nf.format(n)} ${n > 1 ? plusieurs : un}`;

function etapes(g: Guide): Record<Parcours, Etape[]> {
  const ce = g.bourse.moisCourant;
  const enMois = deMois(g.mois);
  const c = g.campagne;
  const annee = new Date().getFullYear();
  const demarre = g.registre.enPoste + g.registre.sortis > 0;
  return {
    demarrage: [
      { titre: "Vérifier la configuration", quoi: "Bourse par catégorie, mise d’équipement, transport par département, début et fin de bourse, motifs de sortie, signataire.", qui: "DG", href: "/enrolement/configuration", ou: "Enrôlement › Configuration", etat: "info", detail: "À relire une fois" },
      { titre: "Reprendre la dernière liste de bourse payée", quoi: "Le fichier Excel de la dernière bourse (ex. « Bourse Septembre 2026 », feuille « Liste générale ») : type « Volontaires en poste », avec le mois de cette bourse.", qui: "Chef de service", href: "/enrolement/volontaires", ou: "Volontaires en poste › Reprendre une liste existante", etat: g.registre.enPoste ? "fait" : "afaire", detail: g.registre.enPoste ? `${pluriel(g.registre.enPoste, "volontaire en poste", "volontaires en poste")}` : "Registre vide" },
      { titre: "Reprendre les sortants", quoi: "Les feuilles « Recrutés en 2023 », « Déserteurs »… : type « Sortants », avec le motif (recruté à la Fonction Publique, déserteur…).", qui: "Chef de service", href: "/enrolement/volontaires", ou: "Volontaires en poste › Reprendre une liste existante", etat: g.registre.sortis ? "fait" : demarre ? "afaire" : "attente", detail: g.registre.sortis ? pluriel(g.registre.sortis, "sortant", "sortants") : "Aucun sortant enregistré" },
      { titre: "Reprendre les notes de service déjà signées", quoi: "Chaque note d’affectation signée (n° 1006, 1038…) : type « Note de service », avec son numéro et sa date. Les doubles affectations sont signalées.", qui: "Chef de service", href: "/enrolement/volontaires", ou: "Volontaires en poste › Reprendre une liste existante", etat: g.registre.notes ? "fait" : demarre ? "afaire" : "attente", detail: g.registre.notes ? pluriel(g.registre.notes, "note reprise", "notes reprises") : "Aucune note" },
      { titre: "Reprendre les fiches de mise en route déjà payées", quoi: "Les fiches Excel de paiement des mises en route : elles servent à repérer les personnes payées deux fois.", qui: "Chef de service", href: "/enrolement/mise-en-route", ou: "Mise en route › Reprendre une fiche déjà payée", etat: g.misesEnRoute.reprises ? "fait" : g.registre.notes ? "afaire" : "attente", detail: g.misesEnRoute.reprises ? pluriel(g.misesEnRoute.reprises, "fiche reprise", "fiches reprises") : "Aucune fiche" },
      { titre: "Traiter les sommes versées à tort", quoi: "Vérifier la liste des trop-perçus (mise en route payée deux fois…), puis créer les retenues.", qui: "Chef de service", href: "/enrolement/regularisations", ou: "Régularisations › Trop-perçus détectés", etat: g.regularisations.tropPercus ? "afaire" : g.misesEnRoute.reprises ? "fait" : "attente", detail: g.regularisations.tropPercus ? pluriel(g.regularisations.tropPercus, "trop-perçu à traiter", "trop-perçus à traiter") : "Rien à traiter" },
      { titre: "Préparer et faire valider la première bourse", quoi: "Le mois de la liste reprise (ex. septembre 2026) : régler les contrôles bloquants (recrutés, doublons…), puis le DG valide. Ce mois sert de point de départ.", qui: "Chef de service, puis DG", href: "/enrolement/bourse", ou: "Bourse mensuelle", etat: g.bourse.valides ? "fait" : demarre ? "afaire" : "attente", detail: g.bourse.valides ? `Dernier état validé : ${moisFr(g.bourse.dernierValide)}` : "Aucun état validé" },
    ],
    annee: [
      { titre: "Ouvrir la campagne de l’année", quoi: "Année, année scolaire, enveloppe de bourses et places par cycle.", qui: "DG", href: "/enrolement/campagne", ou: "Campagne, quota et commission", etat: c && c.annee >= annee ? "fait" : "afaire", detail: c ? `Enrôlement ${c.annee}${c.ouverte ? " (ouvert)" : " (fermé)"}` : "Aucune campagne" },
      { titre: "Inscrire la commission et ses places", quoi: "Les membres de la commission d’enrôlement, et les places de chacun.", qui: "DG", href: "/enrolement/campagne", ou: "Campagne, quota et commission", etat: c?.membres ? "fait" : c ? "afaire" : "attente", detail: c?.membres ? pluriel(c.membres, "membre", "membres") : "Aucun membre" },
      { titre: "Saisir ou importer les dossiers déposés", quoi: "Un formulaire par dossier, ou la liste Excel des dossiers.", qui: "Agents de la DGRHAS", href: "/enrolement/saisie", ou: "Saisie des enrôlements", etat: c ? "info" : "attente", detail: c ? "Au fil des dépôts" : "Ouvrir d’abord la campagne" },
      { titre: "Contrôler les dossiers", quoi: "Comparer chaque fiche au dossier papier : conforme, ou à corriger.", qui: "Chef de service, DRSC, bureau d’études", href: "/enrolement/saisie", ou: "Saisie des enrôlements › À contrôler", etat: c?.aControler ? "afaire" : c ? "fait" : "attente", detail: c?.aControler ? pluriel(c.aControler, "dossier à contrôler", "dossiers à contrôler") : "Rien à contrôler" },
      { titre: "Retenir les volontaires", quoi: "Le DG retient ou non chaque dossier contrôlé, dans la limite des places et de l’enveloppe.", qui: "DG", href: "/enrolement/saisie", ou: "Saisie des enrôlements › À décider", etat: c?.aDecider ? "afaire" : c ? "fait" : "attente", detail: c?.aDecider ? pluriel(c.aDecider, "dossier à décider", "dossiers à décider") : c ? pluriel(c.retenus, "retenu", "retenus") : "—" },
      { titre: "Placer les retenus", quoi: "Pour chaque retenu : département et établissement (sinon « à la disposition de la DDEPPSA »).", qui: "Chef de bureau, DG", href: "/enrolement/base", ou: "Base des enrôlés (icône repère)", etat: c?.sansDepartement ? "afaire" : c?.retenus ? "fait" : "attente", detail: c?.sansDepartement ? pluriel(c.sansDepartement, "retenu sans département", "retenus sans département") : c?.retenus ? "Tous placés" : "—" },
      { titre: "Préparer et faire signer les notes d’enrôlement", quoi: "Préparer, soumettre au DG, valider, avis de conformité, impression, signature du Ministre, puis numéro, date et scan.", qui: "Chef de bureau, DG, secrétariat", href: "/notes/enrolement", ou: "Notes d’enrôlement", etat: c?.horsNote || g.notes.aSoumettre || g.notes.soumises || g.notes.validees || g.notes.signeesSansScan ? "afaire" : g.notes.signees ? "fait" : "attente", detail: [c?.horsNote ? pluriel(c.horsNote, "retenu hors note", "retenus hors note") : "", g.notes.aSoumettre ? `${g.notes.aSoumettre} à soumettre` : "", g.notes.soumises ? `${g.notes.soumises} chez le DG` : "", g.notes.validees ? `${g.notes.validees} à faire signer` : "", g.notes.signeesSansScan ? `${g.notes.signeesSansScan} sans scan` : ""].filter(Boolean).join(" · ") || (g.notes.signees ? pluriel(g.notes.signees, "note signée", "notes signées") : "—") },
      { titre: "Faire entrer les nouveaux dans le registre", quoi: "Les enrôlés des notes signées entrent dans le registre : leur bourse démarre selon la règle de la configuration.", qui: "Chef de service", href: "/enrolement/volontaires", ou: "Volontaires en poste › « Les intégrer au registre »", etat: g.enrolesAIntegrer ? "afaire" : g.notes.signees ? "fait" : "attente", detail: g.enrolesAIntegrer ? pluriel(g.enrolesAIntegrer, "enrôlé à intégrer", "enrôlés à intégrer") : "À jour" },
      { titre: "Payer la mise en route", quoi: "Pour chaque note : préparer la fiche (équipement et transport), le DG valide, puis la fiche Excel part au paiement.", qui: "Chef de service, puis DG", href: "/enrolement/mise-en-route", ou: "Mise en route", etat: g.misesEnRoute.sansMiseEnRoute || g.misesEnRoute.projets ? "afaire" : g.misesEnRoute.valides ? "fait" : "attente", detail: g.misesEnRoute.sansMiseEnRoute ? `${pluriel(g.misesEnRoute.sansMiseEnRoute, "volontaire pas encore mis en route", "volontaires pas encore mis en route")}${g.misesEnRoute.notesSansMiseEnRoute ? ` (note ${g.misesEnRoute.notesSansMiseEnRoute})` : ""}` : g.misesEnRoute.projets ? `${g.misesEnRoute.projets} fiche(s) à valider` : "À jour" },
    ],
    mois: [
      { titre: "Signaler les mouvements du mois", quoi: "Avant de préparer : sortir les recrutés, déserteurs, absents, décédés ; réintégrer ceux qui ont repris ; corriger les fiches (catégorie, département).", qui: "Chef de service (sur information des DDEPPSA)", href: "/enrolement/volontaires", ou: "Volontaires en poste › fiche du volontaire", etat: g.registre.sansCategorie + g.registre.sansDepartement ? "afaire" : "info", detail: g.registre.sansCategorie + g.registre.sansDepartement ? `${g.registre.sansCategorie} sans catégorie, ${g.registre.sansDepartement} sans département` : "Avant le 10 du mois" },
      { titre: `Préparer la bourse ${enMois}`, quoi: "Le système calcule qui est payé, combien, les rappels et les régularisations, et fait les contrôles.", qui: "Chef de service", href: "/enrolement/bourse", ou: "Bourse mensuelle › Préparer", etat: ce ? "fait" : g.bourse.valides ? "afaire" : "attente", detail: ce ? `${pluriel(ce.effectif, "volontaire", "volontaires")} · ${fcfa(ce.total)}` : "Pas encore préparée" },
      { titre: "Régler les contrôles bloquants", quoi: "Doublons, recrutés à la Fonction Publique, catégorie ou département manquant : corriger la fiche, sortir la personne, ou marquer le contrôle comme vérifié.", qui: "Chef de service", href: "/enrolement/bourse", ou: "Bourse mensuelle › Contrôles", etat: !ce ? "attente" : ce.statut === "VALIDE" || !ce.bloquants ? "fait" : "afaire", detail: !ce ? "—" : ce.statut === "VALIDE" ? "Réglés" : ce.bloquants ? pluriel(ce.bloquants, "contrôle bloquant", "contrôles bloquants") : "Aucun contrôle bloquant" },
      { titre: "Faire valider par le DG", quoi: "Le DG valide l’état : les montants sont figés.", qui: "DG", href: "/enrolement/bourse", ou: "Bourse mensuelle › Valider", etat: ce?.statut === "VALIDE" ? "fait" : ce && !ce.bloquants ? "afaire" : "attente", detail: ce?.statut === "VALIDE" ? "Validé" : "En attente" },
      { titre: "Éditer l’état de paiement", quoi: "Le fichier Excel (liste générale, une feuille par département, récapitulatif arrêté en lettres) part au paiement.", qui: "Chef de service", href: "/enrolement/bourse", ou: "Bourse mensuelle › État de paiement Excel", etat: ce?.statut === "VALIDE" ? "fait" : "attente", detail: ce?.statut === "VALIDE" ? "Prêt à télécharger" : "Après la validation" },
      { titre: "Suivre les régularisations", quoi: "Créer les retenues des trop-perçus ; suivre les compléments et retenues en attente, et les sommes à recouvrer des sortis.", qui: "Chef de service", href: "/enrolement/regularisations", ou: "Régularisations", etat: g.regularisations.tropPercus ? "afaire" : "info", detail: [g.regularisations.tropPercus ? pluriel(g.regularisations.tropPercus, "trop-perçu à traiter", "trop-perçus à traiter") : "", g.regularisations.enAttente ? `${g.regularisations.enAttente} en attente` : ""].filter(Boolean).join(" · ") || "Rien à traiter" },
    ],
  };
}

const PARCOURS: { cle: Parcours; titre: string; sous: string; icone: typeof Rocket }[] = [
  { cle: "mois", titre: "Payer la bourse du mois", sous: "Chaque mois", icone: CalendarClock },
  { cle: "annee", titre: "Enrôler de nouveaux volontaires", sous: "Chaque année", icone: CalendarDays },
  { cle: "demarrage", titre: "Démarrer : reprendre l’existant", sous: "Une seule fois", icone: Rocket },
];

/**
 * Guide de l'enrôlement : trois parcours (chaque mois, chaque année, une seule fois), chaque
 * étape avec qui la fait, où aller, et où l'on en est. La prochaine étape à faire est mise en avant.
 */
export function GuideEnrolement() {
  const { donnees: g, erreur } = useApi<Guide>("/enrolement/guide");
  const [choisi, setChoisi] = useState<Parcours | null>(null);
  if (erreur || !g) return null;
  const tout = etapes(g);
  // Registre vide : on commence par le démarrage ; sinon par la bourse du mois
  const parcours = choisi ?? (g.registre.enPoste + g.registre.sortis === 0 ? "demarrage" : "mois");
  const liste = tout[parcours];
  const prochaine = liste.findIndex((e) => e.etat === "afaire");

  return (
    <section className="rounded-3xl bg-white p-5 shadow-doux">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-[17px] font-semibold text-encre">Que voulez-vous faire ?</h2>
        <Aide>Choisissez ce que vous voulez faire : les étapes s’affichent dans l’ordre, avec qui les fait et où aller. Une coche verte : c’est fait. Un point orange : c’est à faire maintenant. Un rond gris : plus tard, ou à faire au fil de l’eau.</Aide>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PARCOURS.map((p) => {
          const I = p.icone;
          const n = tout[p.cle].filter((e) => e.etat === "afaire").length;
          const actif = p.cle === parcours;
          return (
            <button
              key={p.cle}
              type="button"
              aria-pressed={actif}
              onClick={() => setChoisi(p.cle)}
              className={cx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition",
                actif ? "bg-nuit text-white ring-nuit" : "bg-white ring-zinc-200 hover:ring-zinc-300",
              )}
            >
              <I className={cx("size-5 shrink-0", actif ? "text-or-400" : "text-zinc-400")} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{p.titre}</span>
                <span className={cx("block text-[11px]", actif ? "text-zinc-300" : "text-zinc-400")}>{p.sous}</span>
              </span>
              {n > 0 && <span className="rounded-full bg-or-400 px-2 py-0.5 text-[11px] font-bold text-zinc-900">{n}</span>}
            </button>
          );
        })}
      </div>

      {prochaine >= 0 ? (
        <Link href={liste[prochaine].href} className="group mt-4 flex items-center gap-3 rounded-2xl bg-or-100 px-4 py-3 ring-1 ring-or-400/50 transition hover:bg-or-100/70">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-or-700">Prochaine étape</span>
          <span className="flex-1 text-[14px] font-medium text-encre">
            {prochaine + 1}. {liste[prochaine].titre} <span className="text-[12px] font-normal text-zinc-500">— {liste[prochaine].detail}</span>
          </span>
          <ArrowRight className="size-4 text-or-700 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : (
        <div className="mt-4 rounded-2xl bg-marque-50 px-4 py-3 text-[13px] text-marque-700">Tout est à jour pour ce parcours.</div>
      )}

      <ol className="mt-4 divide-y divide-zinc-100">
        {liste.map((e, i) => {
          const E = ETATS[e.etat];
          const Ic = E.icone;
          return (
            <li key={e.titre} className={cx("flex items-start gap-3 py-3", i === prochaine && "-mx-2 rounded-2xl bg-or-100/60 px-2")}>
              <Ic className={cx("mt-0.5 size-5 shrink-0", E.classe)} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-encre">
                  {i + 1}. {e.titre}
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">{e.quoi}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-zinc-400">
                  <span>
                    <b className="font-medium text-zinc-500">Qui :</b> {e.qui}
                  </span>
                  <span>
                    <b className="font-medium text-zinc-500">Où :</b> {e.ou}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={cx("text-[12px]", e.etat === "afaire" ? "font-semibold text-or-700" : e.etat === "fait" ? "text-marque-700" : "text-zinc-400")}>{e.detail}</span>
                <Link href={e.href} className="inline-flex items-center gap-1 text-[12px] font-semibold text-marque-700 hover:underline">
                  Y aller <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
