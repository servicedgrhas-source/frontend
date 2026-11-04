"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type CSSProperties } from "react";
import { StyleImpressionA4 } from "@/components/pages-a4";
import { ActeModuleImprime, MentionGenere } from "@/components/prestations";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";
import { valeurChamp, type ActeModule, type FichePrestation } from "@/lib/prestations";

/**
 * Impression d'une demande de prestation : le « Formulaire de demande de prestation » de la DGRHAS,
 * rempli avec les avis donnés dans l'ordre hiérarchique (?doc=formulaire, par défaut), ou l'acte
 * proposé une fois la demande accordée (?doc=acte).
 */
function Impression() {
  const { id } = useParams<{ id: string }>();
  const acte = useSearchParams().get("doc") === "acte";
  const f = useApi<FichePrestation>(acte ? null : `/demandes-prestation/${id}`);
  const a = useApi<ActeModule>(acte ? `/demandes-prestation/${id}/acte` : null);
  useEffect(() => {
    if (!lireSession().jeton) window.location.replace("/connexion");
  }, []);
  const erreur = f.erreur ?? a.erreur;
  if (erreur)
    return (
      <div className="p-6">
        <Alerte>{erreur}</Alerte>
      </div>
    );
  if (acte ? !a.donnees : !f.donnees) return <Chargement />;
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between gap-3">
        <span className="text-sm text-zinc-700">
          {acte ? `${a.donnees!.titre} — demande ${a.donnees!.reference} (modèle proposé, en attendant le modèle officiel)` : `Formulaire de la demande ${f.donnees!.numero}`}
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      {acte ? <ActeModuleImprime a={a.donnees!} /> : <Formulaire d={f.donnees!} />}
    </div>
  );
}

const SEP = <div className="leading-none">-------------------</div>;
const jour = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
const coche = (oui: boolean) => (oui ? "✔" : "");

/** Le formulaire officiel, rempli : identité, objet, pièces, avis dans l'ordre hiérarchique, décision. */
function Formulaire({ d }: { d: FichePrestation }) {
  const a = d.agent;
  const def = d.definition;
  const externes = d.circuit.filter((e) => e.phase === "EXTERNE");
  const internes = d.circuit.filter((e) => e.phase === "INTERNE");
  const precisions = def ? def.champs.map((c) => [c.libelle, valeurChamp(c, d.details)] as const).filter(([, v]) => v) : [];
  const cellule = "border border-black px-1.5 py-[2px] align-top";
  const ligneAvis = (e: FichePrestation["circuit"][number], i: number) => (
    <tr key={i}>
      <td className={cellule}>{e.nom === e.sigle ? e.sigle : `${e.sigle} — ${e.nom}`}</td>
      <td className={cellule}>{e.sautee ? "franchie sans avis" : e.visaPar ? `${e.visaPar}, le ${jour(e.visaLe)}` : ""}</td>
      <td className={`${cellule} text-center`}>{coche(!e.sautee && e.avis === "FAVORABLE")}</td>
      <td className={`${cellule} text-center`}>{coche(!e.sautee && e.avis === "REJET")}</td>
      <td className={cellule}>{e.sautee ?? e.motivation ?? ""}</td>
    </tr>
  );
  const enteteAvis = (titre: string) => (
    <tr className="bg-zinc-100 font-bold">
      <td className={cellule}>{titre}</td>
      <td className={`${cellule} w-[26%]`}>Visa (nom, date)</td>
      <td className={`${cellule} w-[11%] text-center`}>Avis favorable</td>
      <td className={`${cellule} w-[8%] text-center`}>Rejet</td>
      <td className={`${cellule} w-[28%]`}>Motivation</td>
    </tr>
  );
  return (
    <div className="page-a4 text-[8.5pt] leading-tight" style={{ "--marge-haut": "9mm", "--marge-cote": "12mm" } as CSSProperties}>
      <div className="flex justify-between gap-4 text-[8pt]">
        <div className="w-[58%] text-center font-bold leading-tight">
          <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
          <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
          {SEP}
          <div>CABINET</div>
          {SEP}
          <div>DIRECTION GENERALE DES RESSOURCES HUMAINES ET DE L’ADMINISTRATION SCOLAIRE</div>
          {SEP}
        </div>
        <div className="w-[36%] text-center leading-tight">
          <div className="font-bold">REPUBLIQUE DU CONGO</div>
          <div className="font-semibold">Unité-Travail-Progrès</div>
          {SEP}
        </div>
      </div>
      <div className="mt-3 text-center text-[13pt] font-bold uppercase tracking-wide">FORMULAIRE DE DEMANDE DE PRESTATION</div>
      {/* Le type de prestation saute aux yeux : bandeau de couleur, écrit en blanc (DG, 03/11/2026) */}
      <div
        className="mt-2 rounded-sm px-3 py-1.5 text-center text-[11.5pt] font-bold uppercase text-white"
        style={{ background: "#1d5c3a", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        {def?.libelle ?? d.type}
      </div>
      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cellule} w-[14%] font-bold`}>N° DE LA DEMANDE</td>
            <td className={`${cellule} w-[14%]`}>{d.numero}</td>
            <td className={`${cellule} w-[8%] font-bold`}>DATE</td>
            <td className={`${cellule} w-[14%]`}>{jour(d.creeLe)}</td>
            <td className={`${cellule} w-[14%] font-bold`}>DÉPARTEMENT</td>
            <td className={cellule}>{a.departement ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <table className="mt-2 w-full border-collapse">
        <tbody>
          {[
            ["NOM(S) ET PRÉNOM(S) DU DEMANDEUR", a.nomComplet],
            ["GRADE / CATÉGORIE / ÉCHELLE / ÉCHELON", [a.grade, a.categorie, a.echelle, a.echelon].map((x) => x ?? "—").join(" / ")],
            ["LIEU DE SERVICE", `${a.lieuService ?? ""}${a.ville ? `   —   Ville/district ou arrond. : ${a.ville}` : ""}`],
            ["OBJET", `${d.objet}${precisions.length ? ` (${precisions.map(([l, v]) => `${l} : ${v}`).join(" ; ")})` : ""}`],
            ["PIÈCES JOINTES", d.pieces.length ? [...new Set(d.pieces.map((p) => p.libelle))].join(" ; ") : "—"],
            ["NIVEAU DE DÉCISION (DESTINATAIRE FINAL)", def?.niveauDecision ?? ""],
          ].map(([l, v]) => (
            <tr key={l}>
              <td className={`${cellule} w-[34%] font-bold`}>{l}</td>
              <td className={cellule}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 text-center font-bold">LES AVIS DANS L’ORDRE HIÉRARCHIQUE</div>
      <table className="mt-1 w-full border-collapse">
        <tbody>
          {enteteAvis("Circuit département scolaire / administration centrale")}
          {externes.length ? externes.map(ligneAvis) : (
            <tr>
              <td className={cellule} colSpan={5}>
                Sans voie hiérarchique : déposée directement à la DGRHAS.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {internes.length > 0 && (
        <>
          <div className="mt-2 text-center font-bold">LE CIRCUIT DE TRAITEMENT À LA DGRHAS</div>
          <table className="mt-1 w-full border-collapse">
            <tbody>
              {enteteAvis("Circuit interne")}
              {internes.map(ligneAvis)}
            </tbody>
          </table>
        </>
      )}

      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cellule} w-[18%] font-bold`}>DÉCISION</td>
            <td className={cellule}>Prestation accordée : {coche(d.decision === "ACCORDEE") || "☐"}</td>
            <td className={cellule}>Prestation rejetée : {coche(d.decision === "REJETEE") || "☐"}</td>
            <td className={cellule}>Prestation en instance : {coche(d.decision === "EN_INSTANCE") || "☐"}</td>
          </tr>
          {d.decisionMotivation && (
            <tr>
              <td className={`${cellule} font-bold`}>Motivation</td>
              <td className={cellule} colSpan={3}>
                {d.decisionMotivation} {d.decisionPar ? `— ${d.decisionPar}, le ${jour(d.decisionLe)}` : ""}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* La note, et à côté la place du cachet et de la signature (DG, 03/11/2026) */}
      <div className="mt-2 flex items-start gap-3">
        <div className="flex-1 text-[8pt] leading-snug">
          <strong className="underline">N.B.</strong> : 1°) Le formulaire de demande de prestation devra accompagner la demande manuscrite et les pièces jointes afin de prendre les avis
          successifs des autorités hiérarchiques.
          <br />
          2°) La rétention des demandes de prestation est proscrite. Toute demande doit parvenir au destinataire final (niveau de décision) avec les avis favorables ou
          défavorables des autorités hiérarchiques successives.
        </div>
        <div className="h-[26mm] w-[58mm] shrink-0 border border-dashed border-zinc-500 p-1.5 text-center text-[8pt] text-zinc-600">Cachet et signature</div>
      </div>
      <MentionGenere />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <Impression />
    </Suspense>
  );
}
