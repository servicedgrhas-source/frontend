"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { StyleImpressionA4 } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";

interface Fiche {
  brouillon: boolean;
  titre: string;
  mention: string | null;
  annee: string;
  periode: string;
  colonnes: { libelle: string; taux: number }[];
  lignes: { libelle: string; cellules: { eff: number; mont: number }[]; eff: number; mont: number }[];
  totaux: { eff: number; mont: number }[];
  effTotal: number;
  montantTotal: number;
  texteEffectif: string;
  texteFrais: string;
  signature: { titre: string; nom: string };
  nomFichier: string;
}

const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, " ");
const montant = (n: number) => (n ? nombre(n) : "-");
const taux = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Fiche de prise en charge à imprimer ou à enregistrer en PDF, au modèle du cabinet (« FICHE DE
 * PRISE EN CHARGE DES ENSEIGNANTS COMMUNAUTAIRES DU MOIS D'AOÛT 2026 », 14/11/2026) : une page A4
 * paysage, en-tête, titre, mesure, année scolaire, période sur une bande grise, tableau Eff. /
 * Montant par cycle (le taux dans le titre du cycle) et total mensuel, texte, signature.
 * `?police=gill` : en Gill Sans MT ; sinon la police étroite du modèle.
 */
export function ImpressionFichePriseEnCharge() {
  const { id } = useParams<{ id: string }>();
  const gill = useSearchParams().get("police") === "gill";
  const d = useApi<Fiche>(`/enrolement/bourse/${id}/prise-en-charge/donnees`);
  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);
  useEffect(() => {
    if (d.donnees) document.title = d.donnees.nomFichier;
  }, [d.donnees]);

  if (d.erreur)
    return (
      <div className="p-6">
        <Alerte>{d.erreur}</Alerte>
      </div>
    );
  if (!d.donnees) return <Chargement texte="Préparation de la fiche de prise en charge…" />;
  const f = d.donnees;
  const police = gill ? '"Gill Sans MT", "Gill Sans", Calibri, sans-serif' : '"Gill Sans MT Condensed", "Gill Sans Nova Cond", "Arial Narrow", sans-serif';
  const bord = "1px solid #000";
  const th = { border: bord, padding: "2px 3px", fontWeight: 700, textAlign: "center" as const, verticalAlign: "middle" as const };
  const td = { border: bord, padding: "1px 4px", textAlign: "center" as const };
  const tdD = { ...td, textAlign: "right" as const, whiteSpace: "nowrap" as const };
  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 paysage />
      <div className="no-print mx-auto mb-4 flex w-[297mm] flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-700">{f.nomFichier}</span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
        {f.brouillon && (
          <div className="w-full">
            <Alerte ton="jaune">Projet : l’état de paiement de ce mois n’est pas encore validé par le Directeur général.</Alerte>
          </div>
        )}
      </div>
      <div className="mx-auto box-border h-[210mm] w-[297mm] overflow-hidden bg-white px-[11mm] py-[9mm] text-black shadow print:shadow-none" style={{ fontFamily: police, fontSize: "10pt", lineHeight: 1.25 }}>
        {/* L'en-tête : le ministère à gauche, la République à droite */}
        <div className="flex items-start justify-between text-center text-[10pt] font-bold">
          <div className="w-[42%]">
            <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
            <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
            <div className="underline">CABINET</div>
            <div>DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
            <div className="underline">ET DE L’ADMINISTRATION SCOLAIRE</div>
          </div>
          <div className="w-[22%]">
            <div>REPUBLIQUE DU CONGO</div>
            <div className="underline">Unité-Travail-Progrès</div>
          </div>
        </div>
        <div className="mt-3 text-center text-[14pt] font-bold leading-tight">
          <div>{f.titre}</div>
          {f.mention && <div>{f.mention}</div>}
        </div>
        <div className="mt-2 text-center text-[12pt] font-bold">{f.annee}</div>
        {/* La période sur une bande grise, comme la fiche du cabinet */}
        <div className="mt-1 py-0.5 text-center text-[12pt] font-bold" style={{ background: "#bfbfbf", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
          {f.periode}
        </div>
        <table className="mt-2 w-full border-collapse text-[9pt]" style={{ border: bord }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...th, width: "11%" }}>
                DEPARTEMENT
              </th>
              {f.colonnes.map((x) => (
                <th key={x.libelle} colSpan={2} style={th}>
                  {x.libelle}
                  {x.taux ? (
                    <>
                      <br />({taux(x.taux)})
                    </>
                  ) : null}
                </th>
              ))}
              <th colSpan={2} style={th}>
                TOTAL MENSUEL
              </th>
            </tr>
            <tr>
              {[...f.colonnes, null].map((x, i) => [
                <th key={`e${i}`} style={th}>
                  Eff.
                </th>,
                <th key={`m${i}`} style={th}>
                  Montant
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {f.lignes.map((l) => (
              <tr key={l.libelle}>
                <td style={{ ...td, textAlign: "left", whiteSpace: "nowrap" }}>{l.libelle}</td>
                {l.cellules.map((x, i) => [
                  <td key={`e${i}`} style={td}>
                    {nombre(x.eff)}
                  </td>,
                  <td key={`m${i}`} style={tdD}>
                    {montant(x.mont)}
                  </td>,
                ])}
                <td style={{ ...td, fontWeight: 700 }}>{nombre(l.eff)}</td>
                <td style={{ ...tdD, fontWeight: 700 }}>{montant(l.mont)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: "#d9d9d9", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
              <td style={td}>TOTAL</td>
              {f.totaux.map((x, i) => [
                <td key={`e${i}`} style={td}>
                  {nombre(x.eff)}
                </td>,
                <td key={`m${i}`} style={tdD}>
                  {montant(x.mont)}
                </td>,
              ])}
              <td style={td}>{nombre(f.effTotal)}</td>
              <td style={tdD}>{montant(f.montantTotal)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3 text-[10.5pt]">
          <div>{f.texteEffectif}</div>
          <div>{f.texteFrais}</div>
        </div>
        <div className="mt-3 ml-[68%] text-[10.5pt] leading-normal">
          <div>Fait à Brazzaville, le</div>
          {/* Une ligne entre « Fait à… » et le titre, puis la place de la signature */}
          <div className="mt-[1.3em] font-bold">{f.signature.titre}</div>
          <div className="h-[3.6em]" />
          <div className="font-bold">{f.signature.nom}</div>
        </div>
      </div>
    </div>
  );
}
