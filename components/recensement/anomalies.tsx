"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AgentRecense, ConfigRecensement } from "@/components/recensement/commun";
import { Bouton, Carte, Chargement } from "@/components/ui";
import { useApi } from "@/lib/api";

/** Un problème d'une fiche (contrôle de la base), avec les autres fiches concernées. */
export interface AnomalieFiche {
  code: string;
  libelle: string;
  avec: { id: number; numeroFiche: string; nomComplet: string }[];
}

/**
 * Où se corrige un problème (DG, 29/10/2026 : « nous montrer où corriger, nous emmener à l'endroit
 * immédiat ») : la rubrique de la fiche (`champ-…`), un bloc de la fiche (`bloc-…`) ou une autre page,
 * et ce qu'il faut y faire.
 */
export function ouCorriger(code: string, c: ConfigRecensement, a?: Pick<AgentRecense, "manques" | "nomComplet"> | null): { cible: string | null; lien?: string; conseil: string } {
  const libelle = (k: string) => c.champs.find((x) => x.code === k)?.libelle ?? k;
  switch (code) {
    case "DOUBLON":
    case "MEME_PERSONNE":
      return { cible: "bloc-memes", conseil: "Comparez les deux fiches : si c’est la même personne, fusionnez-les (rien ne se perd) ; sinon, déclarez-les différentes." };
    case "MATRICULE_DOUBLE":
      return { cible: "champ-MATRICULE_SOLDE", conseil: "Plusieurs fiches portent ce matricule : vérifiez-le sur le bulletin de solde et corrigez celle qui est fausse." };
    case "TELEPHONE_PARTAGE":
      return { cible: "champ-TELEPHONE_1", conseil: "Ce numéro est sur plusieurs fiches (souvent celui d’un établissement) : écrivez le numéro personnel de l’agent." };
    case "AGE_MINIMUM":
      return { cible: "champ-DATE_NAISSANCE", conseil: "L’âge est trop bas : la date de naissance est sans doute mal écrite." };
    case "AGE_RETRAITE":
      return { cible: "champ-POSITION", conseil: "L’âge de la retraite est atteint : s’il est parti, mettez sa position à « Retraité » ; sinon, corrigez sa date de naissance." };
    case "DATE_PROMOTION_MANQUANTE":
      return { cible: "champ-DATE_GRADE", conseil: "Il est au-delà du 1er échelon : écrivez la date de sa dernière promotion (dernier arrêté), sinon ses avancements ne se calculent pas." };
    case "ECHELON_HORS_GRILLE":
      return { cible: "champ-ECHELON", conseil: "Cet échelon n’existe pas : le dernier est le 16e ; au-delà, écrivez le hors classe « HC 1 » à « HC 4 » (réglable dans Référentiels › Échelles)." };
    case "VALEUR_HORS_LISTE": {
      const k = (a?.manques.aVerifier ?? []).find((x) => !x.startsWith("REGLE:"));
      return { cible: k ? `champ-${k}` : null, conseil: k ? `« ${libelle(k)} » : la valeur n’est pas dans la liste ; choisissez la bonne.` : "Une rubrique a une valeur hors de sa liste : choisissez la bonne." };
    }
    case "VOLONTAIRE_AGENT_ETAT":
      return {
        cible: null,
        lien: `/enrolement/volontaires?recherche=${encodeURIComponent(a?.nomComplet ?? "")}`,
        conseil: "Il est encore payé comme volontaire alors qu’il est fonctionnaire ou contractuel : s’il est bien recruté, sortez-le du registre (motif « Recruté à la Fonction Publique »).",
      };
    case "CONTENTIEUX":
    case "CONTENTIEUX_DG":
      return { cible: "bloc-contentieux", conseil: code === "CONTENTIEUX" ? "Ajouté au recensement : le bureau du contrôle donne son avis." : "Contrôlé : le DG accepte la fiche dans la base, ou la rejette." };
    default:
      if (code.startsWith("REGLE:")) {
        if (code === "REGLE:INTEGRATION_PAR_ARRETE") return { cible: "champ-TEXTE_RECRUTEMENT", conseil: "Un fonctionnaire est entré par un arrêté ou un décret : écrivez la référence de ce texte." };
        const r = c.regles.find((x) => `REGLE:${x.code}` === code);
        return r
          ? { cible: `champ-${r.alors.champ}`, conseil: `Règle « ${r.libelle} » : quand « ${libelle(r.si.champ)} » vaut ${r.si.valeurs.join(" ou ")}, « ${libelle(r.alors.champ)} » doit valoir ${r.alors.valeurs.join(" ou ")}. Corrigez l’une des deux.` }
          : { cible: null, conseil: "Deux rubriques de la fiche ne vont pas ensemble : vérifiez-les." };
      }
      return { cible: null, conseil: "À vérifier sur la fiche." };
  }
}

/** Va à l'endroit où l'on corrige : la rubrique (ou le bloc) défile, s'éclaire, et la saisie y est placée. */
export function allerA(cible: string) {
  const el = document.getElementById(cible);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-4", "ring-or-300", "rounded-2xl");
  setTimeout(() => el.classList.remove("ring-4", "ring-or-300"), 3500);
  const saisie = el.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])");
  setTimeout(() => saisie?.focus({ preventScroll: true }), 450);
  return true;
}

/**
 * Problèmes de cette fiche, en haut de la fiche : chacun avec ce qu'il faut faire et « Corriger »,
 * qui mène à la rubrique ou au bloc. Ouverte depuis la liste (`?corriger=CODE`), la fiche va
 * directement à l'endroit du problème choisi.
 */
export function ProblemesFiche({ c, agent, corriger }: { c: ConfigRecensement; agent: AgentRecense; corriger: string | null }) {
  const r = useApi<{ anomalies: AnomalieFiche[] }>(`/recensement/agents/${agent.id}/anomalies`);
  const deja = useRef(false);
  const liste = r.donnees?.anomalies ?? [];
  useEffect(() => {
    if (deja.current || !corriger || !r.donnees) return;
    deja.current = true;
    const cible = ouCorriger(corriger, c, agent).cible;
    // La fiche vient de s'afficher : on laisse la page se poser avant d'y aller
    if (cible) setTimeout(() => allerA(cible), 300);
  }, [corriger, r.donnees, c, agent]);
  if (!r.donnees) return r.erreur ? null : <Chargement texte="Contrôle de la fiche…" />;
  if (!liste.length) return null;
  return (
    <Carte titre={`Problèmes de cette fiche (${liste.length})`}>
      <ul className="-mt-1 divide-y divide-zinc-100">
        {liste.map((x) => {
          const o = ouCorriger(x.code, c, agent);
          return (
            <li key={x.code} className={`flex flex-wrap items-start gap-3 py-2.5 ${x.code === corriger ? "rounded-xl bg-or-50 px-2" : ""}`}>
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-or-600" />
              <div className="min-w-0 flex-1 text-[13px]">
                <div className="font-semibold">{x.libelle}</div>
                <div className="text-[12px] text-zinc-600">{o.conseil}</div>
                {!!x.avec.length && (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    <span className="text-zinc-500">Autre(s) fiche(s) :</span>
                    {x.avec.map((y) => (
                      <Link key={y.id} href={`/personnel/agents/${y.id}`} target="_blank" className="font-medium text-marque-700 underline">
                        {y.nomComplet} ({y.numeroFiche})
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {o.cible ? (
                <Bouton variante="discret" onClick={() => allerA(o.cible!)}>
                  Corriger <ArrowRight className="size-3.5" />
                </Bouton>
              ) : (
                o.lien && (
                  <Link href={o.lien}>
                    <Bouton variante="discret">
                      Corriger <ArrowRight className="size-3.5" />
                    </Bouton>
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    </Carte>
  );
}
