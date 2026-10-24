"use client";

/**
 * Acte délivré à l'agent quand sa demande est accordée (autorisation d'absence, attestation de
 * congé, certificat…). Il reprend l'en-tête des documents du ministère, l'objet, la période et la
 * signature de la structure qui a décidé. Imprimé depuis l'application, ou par l'agent sur le portail.
 */

export interface ActePrestation {
  numero: string;
  acte: string;
  prestation: string;
  agent: { nomComplet: string; genre: "M" | "F"; grade: string | null; echelon: number | null; matricule: string | null; lieuService: string | null; statut: string };
  objet: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  decisionLe: string | null;
  motivation: string | null;
  decideur: { sigle: string; nom: string; par: string | null } | null;
  lieu: string;
  demande: { numero: number; date: string | null };
}

const SEP = <div className="leading-none">-------------------</div>;
const dateLongue = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

export function ActeImprime({ a, a4 = true }: { a: ActePrestation; a4?: boolean }) {
  const civilite = a.agent.genre === "F" ? "Madame" : "Monsieur";
  const periode =
    a.dateDebut && a.dateFin ? `du ${dateLongue(a.dateDebut)} au ${dateLongue(a.dateFin)} inclus` : a.dateDebut ? `à compter du ${dateLongue(a.dateDebut)}` : null;
  const classe = a4 ? "page-a4 feuille-liste" : "rounded-2xl bg-white p-5 text-[13px] shadow-doux print:shadow-none";
  return (
    <div className={classe} style={a4 ? ({ "--marge-haut": "14mm", "--marge-cote": "18mm" } as React.CSSProperties) : undefined}>
      <div className="flex justify-between gap-4 text-[8.5pt]">
        <div className="w-[58%] text-center font-bold leading-tight">
          <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
          <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
          {SEP}
          {a.decideur && (
            <>
              <div>{a.decideur.nom.toUpperCase()}</div>
              {SEP}
            </>
          )}
          <div>N° {a.numero}</div>
        </div>
        <div className="w-[36%] text-center leading-tight">
          <div className="font-bold">REPUBLIQUE DU CONGO</div>
          <div className="font-semibold">Unité-Travail-Progrès</div>
          {SEP}
        </div>
      </div>

      <div className="mt-10 mb-8 text-center">
        <div className="text-[15pt] font-bold uppercase tracking-wide">{a.acte}</div>
        <div className="mt-1 text-[11pt] font-semibold">{a.prestation}</div>
      </div>

      <div className="space-y-4 text-justify text-[11pt] leading-relaxed">
        <p>
          {a.decideur ? `Le responsable de la structure « ${a.decideur.nom} »` : "La Direction générale des ressources humaines et de l’administration scolaire"}, vu la demande n° {a.demande.numero}
          {a.demande.date ? ` du ${dateLongue(a.demande.date)}` : ""} et les avis recueillis dans l’ordre hiérarchique, accorde à :
        </p>
        <table className="w-full text-[11pt]">
          <tbody>
            <tr>
              <td className="w-[38%] py-0.5 text-zinc-700">Nom et prénoms</td>
              <td className="py-0.5 font-bold">
                {civilite} {a.agent.nomComplet}
              </td>
            </tr>
            {(a.agent.grade || a.agent.echelon) && (
              <tr>
                <td className="py-0.5 text-zinc-700">Grade · échelon</td>
                <td className="py-0.5">{[a.agent.grade, a.agent.echelon ? `${a.agent.echelon}e échelon` : null].filter(Boolean).join(" · ")}</td>
              </tr>
            )}
            {a.agent.matricule && (
              <tr>
                <td className="py-0.5 text-zinc-700">Matricule solde</td>
                <td className="py-0.5">{a.agent.matricule}</td>
              </tr>
            )}
            <tr>
              <td className="py-0.5 text-zinc-700">Qualité</td>
              <td className="py-0.5">{a.agent.statut}</td>
            </tr>
            {a.agent.lieuService && (
              <tr>
                <td className="py-0.5 text-zinc-700">En service à</td>
                <td className="py-0.5">{a.agent.lieuService}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p>
          <strong>{a.objet ?? a.prestation}</strong>
          {periode ? `, ${periode}` : ""}.
        </p>
        {a.motivation && <p className="text-[10pt] italic text-zinc-700">Observation : {a.motivation}</p>}
        <p>{a.acte === "Attestation" || a.acte === "Certificat" ? "En foi de quoi la présente est délivrée à l’intéressé(e) pour servir et valoir ce que de droit." : "La présente lui est délivrée pour servir et valoir ce que de droit."}</p>
      </div>

      <div className="mt-12 flex justify-end text-[11pt]">
        <div className="w-[50%] text-center">
          <div>
            Fait à {a.lieu}, le {dateLongue(a.decisionLe)}
          </div>
          <div className="mt-3 font-bold">{a.decideur ? `Pour ${a.decideur.sigle},` : "Le Directeur général,"}</div>
          <div className="mt-16 font-bold">{a.decideur?.par ?? ""}</div>
        </div>
      </div>
    </div>
  );
}
