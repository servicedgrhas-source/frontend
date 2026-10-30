"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { EnteteOfficielle } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc } from "@/components/pages-a4";
import type { Evaluation } from "@/components/recensement/evaluation";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";
import { APPRECIATIONS } from "@/lib/ecoles";

interface Fiche {
  agent: {
    nomComplet: string;
    numeroFiche: string | null;
    matricule: string | null;
    statut: string;
    grade: string | null;
    fonction: string | null;
    lieuService: string | null;
  };
  evaluation: Evaluation;
  lieu: string;
}

const dateFr = (d: string | null | undefined) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const virgule = (n: number) => String(n).replace(".", ",");

/**
 * Fiche d'évaluation imprimée (DG, 24/10/2026) : les deux notes avec ce qui les justifie, la
 * globale et la décision proposée, signée par le chef immédiat (l'évaluateur) et par l'agent.
 */
export function ImpressionEvaluation() {
  const { id } = useParams<{ id: string }>();
  const ev = useSearchParams().get("ev") ?? "";
  const f = useApi<Fiche>(ev ? `/evaluations/agents/${id}/fiche/${ev}` : null);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);
  useEffect(() => {
    if (f.donnees) document.title = `Fiche d’évaluation - ${f.donnees.agent.nomComplet}`;
  }, [f.donnees]);

  const blocs = useMemo((): Bloc[] | null => {
    if (!f.donnees) return null;
    const { agent: a, evaluation: e, lieu } = f.donnees;
    const ligne = (l: string, x: React.ReactNode) => (
      <div className="flex gap-2 py-0.5 text-[10.5pt]">
        <div className="w-[36%] text-zinc-700">{l}</div>
        <div className="flex-1 font-semibold">{x}</div>
      </div>
    );
    const titre = (t: string) => <div className="mb-1 border-b border-black text-[10.5pt] font-bold">{t}</div>;
    const note = (libelle: string, n: number, commentaire: string | null) => (
      <div className="mb-2">
        <div className="flex items-baseline justify-between text-[10.5pt]">
          <span className="font-semibold">{libelle}</span>
          <span>
            <strong>{n} / 5</strong> — {APPRECIATIONS[n - 1]}
          </span>
        </div>
        <div className="mt-0.5 min-h-[14mm] rounded border border-zinc-400 px-2 py-1 text-[10pt] italic">{commentaire || "—"}</div>
      </div>
    );
    return [
      { cle: "entete", type: "libre", contenu: <EnteteOfficielle titre="FICHE D’ÉVALUATION DE L’AGENT" sousTitre={`Année ${e.annee} — évaluation du ${dateFr(e.date)}`} /> },
      {
        cle: "agent",
        type: "libre",
        contenu: (
          <div className="mb-4">
            {titre("1. L’agent")}
            {ligne("Nom et prénoms", a.nomComplet)}
            {ligne("N° de fiche · matricule", [a.numeroFiche, a.matricule].filter(Boolean).join(" · ") || "—")}
            {ligne("Statut · grade", [a.statut, a.grade].filter(Boolean).join(" · "))}
            {ligne("Fonction", a.fonction ?? "—")}
            {ligne("Lieu de service", a.lieuService ?? "—")}
          </div>
        ),
      },
      {
        cle: "notes",
        type: "libre",
        contenu: (
          <div className="mb-4">
            {titre("2. Notes (de 1, très faible, à 5, excellent) et ce qui les justifie")}
            {note("Compétence professionnelle", e.competenceProfessionnelle, e.commentaireProfessionnel)}
            {note("Compétence sociale", e.competenceSociale, e.commentaireSocial)}
          </div>
        ),
      },
      {
        cle: "resultat",
        type: "libre",
        contenu: (
          <div className="mb-4">
            {titre("3. Appréciation")}
            {ligne("Compétence globale", `${virgule(e.globale)} / 5 — ${e.appreciation}`)}
            {ligne("Lecture", e.lecture)}
            {ligne("Décision proposée", e.decision ?? "—")}
            {ligne("Évaluateur (chef immédiat)", `${e.evaluateur ?? "—"}${e.valideeLe ? `, validée le ${new Date(e.valideeLe).toLocaleDateString("fr-FR")}` : " (brouillon)"}`)}
          </div>
        ),
      },
      {
        cle: "signatures",
        type: "libre",
        contenu: (
          <div className="mt-6 text-[10.5pt]">
            <div className="mb-6 text-right">
              Fait à {lieu || "Brazzaville"}, le {new Date().toLocaleDateString("fr-FR")}
            </div>
            <div className="grid grid-cols-2 gap-10 text-center">
              <div>
                <div>L’agent évalué</div>
                <div className="text-[9pt]">(lu et pris connaissance)</div>
                <div className="h-20" />
                <div className="font-bold">{a.nomComplet}</div>
              </div>
              <div>
                <div>Le chef immédiat</div>
                <div className="text-[9pt]">(l’évaluateur)</div>
                <div className="h-20" />
                <div className="font-bold">{e.evaluateur ?? ""}</div>
              </div>
            </div>
          </div>
        ),
      },
    ];
  }, [f.donnees]);

  if (!ev)
    return (
      <div className="p-6">
        <Alerte>Évaluation non précisée.</Alerte>
      </div>
    );
  if (f.erreur)
    return (
      <div className="p-6">
        <Alerte>{f.erreur}</Alerte>
      </div>
    );
  if (!f.donnees || !blocs) return <Chargement />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between">
        <span className="text-sm text-zinc-700">Fiche d’évaluation {f.donnees.evaluation.annee} — {f.donnees.agent.nomComplet}</span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <PagesA4 blocs={blocs} tableaux={{}} pied={{ gauche: `Fiche d’évaluation — ${f.donnees.agent.nomComplet}`, droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeCote={16} />
    </div>
  );
}
