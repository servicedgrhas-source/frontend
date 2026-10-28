"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GrilleEdt, type ReponseEdt, resumeJours } from "@/components/ecoles/emploi-du-temps";
import { EnteteOfficielle } from "@/components/impression-officielle";
import { PagesA4, StyleImpressionA4, type Bloc } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement, Segments } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";

/**
 * Emplois du temps imprimés (DG, 24/10/2026) : le général de l'établissement (une grille par
 * classe) ou celui de chaque enseignant, chacun sur sa page pour lui être remis.
 */
export function ImpressionEmploiDuTemps() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const vue = q.get("vue") === "enseignants" ? "enseignants" : "classes";
  const agent = q.get("agent");
  const annee = q.get("annee") ?? "";
  // Paysage par défaut : il remplit mieux la page affichée à l'école (DG, 27/10/2026)
  const [paysage, setPaysage] = useState(q.get("orientation") !== "portrait");
  const d = useApi<ReponseEdt>(`/etablissements/${id}/emploi-du-temps?annee=${annee}`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);

  const blocs = useMemo((): Bloc[] | null => {
    const e = d.donnees?.emploi;
    if (!d.donnees || !e) return null;
    const ecole = d.donnees.structure.nom;
    const titre = (t: string, sous: string) => (
      <div className="mt-2 mb-2 flex items-baseline justify-between border-b border-black pb-0.5">
        <span className="text-[11pt] font-bold">{t}</span>
        <span className="text-[9pt]">{sous}</span>
      </div>
    );
    if (vue === "classes") {
      const classes = [...new Map(e.seances.map((s) => [s.classeId, s.classe])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr", { numeric: true }));
      return [
        { cle: "entete", type: "libre", garderAvecSuivant: true, contenu: <EnteteOfficielle titre="EMPLOI DU TEMPS GÉNÉRAL" sousTitre={`${ecole} — année scolaire ${d.donnees.annee}`} /> },
        ...classes.map(
          ([cid, nom]): Bloc => ({
            cle: `c${cid}`,
            type: "libre",
            contenu: (
              <div className="mb-3">
                {titre(`Classe : ${nom}`, `${e.seances.filter((s) => s.classeId === cid).length} h par semaine`)}
                <GrilleEdt e={e} seances={e.seances.filter((s) => s.classeId === cid)} vue="classe" impression />
              </div>
            ),
          }),
        ),
      ];
    }
    const profs = e.charges.filter((c) => c.heures > 0 && (!agent || String(c.agentId) === agent));
    return profs.map(
      (c, i): Bloc => ({
        cle: `a${c.agentId}`,
        type: "libre",
        nouvellePage: i > 0,
        contenu: (
          <div>
            <EnteteOfficielle titre="EMPLOI DU TEMPS DE L’ENSEIGNANT" sousTitre={`${ecole} — année scolaire ${d.donnees!.annee}`} />
            {titre(c.agent, `${c.heures} h par semaine · ${[...new Set(c.classes)].join(", ")}`)}
            {/* Ses jours et heures de travail (réglés depuis l'école) : les cases grises, il n'est pas là */}
            <div className="mb-1.5 text-[9pt]">
              <strong>Jours et heures de travail :</strong> {resumeJours(d.donnees!.enseignants?.find((x) => x.id === c.agentId)?.jours)}.
            </div>
            <GrilleEdt e={e} seances={e.seances.filter((s) => s.agentId === c.agentId)} vue="enseignant" impression joursTravail={d.donnees!.enseignants?.find((x) => x.id === c.agentId)?.jours ?? null} />
            <div className="mt-6 grid grid-cols-2 gap-10 text-center text-[10pt]">
              <div>
                <div className="font-bold">L’enseignant</div>
                <div className="h-14" />
              </div>
              <div>
                <div className="font-bold">Le chef d’établissement</div>
                <div className="h-14" />
              </div>
            </div>
          </div>
        ),
      }),
    );
  }, [d.donnees, vue, agent]);

  useEffect(() => {
    if (d.donnees) document.title = `Emploi du temps - ${d.donnees.structure.nom}`;
  }, [d.donnees]);

  if (d.erreur)
    return (
      <div className="p-6">
        <Alerte>{d.erreur}</Alerte>
      </div>
    );
  if (!d.donnees) return <Chargement />;
  if (!blocs?.length)
    return (
      <div className="p-6">
        <Alerte ton="jaune">Pas d’emploi du temps généré pour {d.donnees.annee} : générez-le depuis la fiche de l’école (onglet « Emploi du temps »).</Alerte>
      </div>
    );
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 paysage={paysage} />
      <div className={`no-print mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 ${paysage ? "w-[297mm]" : "w-[210mm]"}`}>
        <span className="text-sm text-zinc-700">
          {vue === "classes" ? "Emploi du temps général" : "Emplois du temps des enseignants"} — {d.donnees.structure.nom}
        </span>
        <div className="flex items-center gap-3">
          <Segments
            valeur={paysage ? "paysage" : "portrait"}
            changer={(v) => setPaysage(v === "paysage")}
            options={[
              { valeur: "paysage", libelle: "Paysage (page couchée)" },
              { valeur: "portrait", libelle: "Portrait (page debout)" },
            ]}
          />
          <Bouton variante="principal" onClick={() => window.print()}>
            Imprimer / Enregistrer en PDF
          </Bouton>
        </div>
      </div>
      <PagesA4 key={paysage ? "paysage" : "portrait"} paysage={paysage} blocs={blocs} tableaux={{}} pied={{ gauche: `Emploi du temps — ${d.donnees.structure.nom}`, droite: "MEPPSA · DGRHAS" }} classeFeuille="feuille-liste" margeCote={10} />
    </div>
  );
}
