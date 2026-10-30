"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StyleImpressionA4 } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement, Champ, Saisie, Zone } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";
import { nombreEnLettres } from "@/lib/libelles";
import { useParametreUrl } from "@/lib/url";

interface SoitTransmis {
  quota: number;
  numero: number;
  libelle: string;
  lots: number;
  dossiers: number;
  lignes: { type: string; cycle: string; classe: string; lots: number; dossiers: number }[];
  destinataire: string;
  reference: string;
  appel: string;
  signataireTitre: string;
  signataireNom: string;
  lieu: string;
}

const SEP = <div className="leading-none">-------------------</div>;
const deux = (n: number) => String(n).padStart(2, "0");
/** « seize (16) » */
const enToutesLettres = (n: number) => `${nombreEnLettres(n)} (${deux(n)})`;

/** Soit-transmis du Cabinet à la FP, pour une transmission ; les champs se complètent avant d'imprimer. */
export function ImpressionSoitTransmis() {
  const { numero } = useParams<{ numero: string }>();
  const quota = useParametreUrl("quota");
  const { donnees: d, erreur } = useApi<SoitTransmis>(quota ? `/transmissions/${quota}/${numero}/soit-transmis` : null);
  const [v, setV] = useState<{ numeroLettre: string; date: string; destinataire: string; titre: string; nom: string } | null>(null);

  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);

  if (erreur) return <div className="p-6"><Alerte>{erreur}</Alerte></div>;
  if (quota === null)
    return (
      <div className="p-6">
        <Alerte>Lien incomplet : ouvrez le soit-transmis depuis la page « Envoi à la FP ».</Alerte>
      </div>
    );
  if (!d) return <Chargement />;
  const f = v ?? { numeroLettre: "", date: "", destinataire: d.destinataire, titre: d.signataireTitre.replace(/,$/, ""), nom: d.signataireNom };
  const maj = (k: keyof typeof f, x: string) => setV({ ...f, [k]: x });
  // Lignes regroupées par type de dossiers (la cellule « Types » couvre ses cycles)
  const types = [...new Set(d.lignes.map((l) => l.type))];

  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-5 w-[210mm] space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <div className="text-[15px] font-semibold text-zinc-900">
            Soit-transmis de la {d.libelle} du quota {d.quota}
          </div>
          <div className="text-[12px] text-zinc-500">
            La lettre qui accompagne les dossiers envoyés à la FP. Le tableau est calculé à partir des lots de la transmission ({d.lots} lot(s), {d.dossiers}{" "}
            dossier(s)). Complétez si besoin les champs ci-dessous : ils changent seulement cette impression. Les valeurs par défaut se règlent dans
            « Administration › Paramètres ».
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Champ libelle="N° de la lettre" aide="Donné par le Cabinet ; laissé vide, une ligne est imprimée pour l’écrire à la main">
            <Saisie value={f.numeroLettre} onChange={(e) => maj("numeroLettre", e.target.value)} placeholder="Ex. 0123" />
          </Champ>
          <Champ libelle="Date" aide="Laissée vide : « le …… » à compléter à la main">
            <Saisie type="date" value={f.date} onChange={(e) => maj("date", e.target.value)} />
          </Champ>
          <Champ libelle="Destinataire" className="md:col-span-2">
            <Zone rows={2} value={f.destinataire} onChange={(e) => maj("destinataire", e.target.value)} />
          </Champ>
          <Champ libelle="Titre du signataire">
            <Saisie value={f.titre} onChange={(e) => maj("titre", e.target.value)} />
          </Champ>
          <Champ libelle="Nom du signataire">
            <Saisie value={f.nom} onChange={(e) => maj("nom", e.target.value)} />
          </Champ>
        </div>
        <div className="flex justify-end">
          <Bouton variante="principal" onClick={() => window.print()}>
            Imprimer / Enregistrer en PDF
          </Bouton>
        </div>
      </div>

      <div className="mx-auto min-h-[297mm] w-[210mm] bg-white px-[18mm] py-[14mm] text-[11pt] leading-snug text-black shadow-sm print:shadow-none">
        <div className="flex items-start justify-between gap-6 text-[9.5pt]">
          <div className="w-[58%] text-center font-bold leading-tight">
            <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
            <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
            {SEP}
            <div>CABINET</div>
            {SEP}
            <div>DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
            <div>ET DE L’ADMINISTRATION SCOLAIRE</div>
            {SEP}
            <div>DIRECTION DES RECRUTEMENTS ET DU SUIVI DES CARRIERES</div>
            {SEP}
            <div className="mt-2 font-normal">
              N°{f.numeroLettre || "____________"}/{d.reference}.
            </div>
          </div>
          <div className="w-[34%] text-center leading-tight">
            <div className="font-bold">REPUBLIQUE DU CONGO</div>
            <div className="font-semibold">Unité-Travail-Progrès</div>
            {SEP}
          </div>
        </div>

        <div className="mt-6 text-right">
          {d.lieu}, le {f.date ? new Date(f.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "………………………"}
        </div>
        <div className="mt-6 ml-[45%] space-y-3">
          <div className="font-bold">{f.titre}</div>
          <div>A</div>
          <div className="font-bold whitespace-pre-line">{f.destinataire}</div>
          <div className="font-bold underline">{d.lieu.toUpperCase()}.</div>
        </div>

        <div className="mt-6">
          <span className="font-bold underline">Objet</span> : Soit-transmis.
        </div>
        <p className="mt-5">{d.appel}</p>
        <p className="mt-3 text-justify indent-10">
          J’ai l’honneur de vous transmettre, pour compétence, {enToutesLettres(d.lots)} lot{d.lots > 1 ? "s" : ""} de dossiers correspondant à{" "}
          {enToutesLettres(d.dossiers)} dossier{d.dossiers > 1 ? "s" : ""} d’intégration des agents du Ministère de l’enseignement préscolaire, primaire,
          secondaire et de l’alphabétisation (quota {d.quota}, {d.libelle}), répartis ainsi qu’il suit :
        </p>

        <table className="mt-4 w-full border-collapse text-[10pt] [&_tr]:break-inside-avoid [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:py-1">
          <thead>
            <tr>
              <th className="w-8">N°</th>
              <th>Types de dossiers</th>
              <th>Cycle</th>
              <th>Catégorie/Echelle</th>
              <th>Nombre de lots</th>
              <th>Nombre de dossiers</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t, i) => {
              const ls = d.lignes.filter((l) => l.type === t);
              return ls.map((l, j) => (
                <tr key={`${t}${j}`}>
                  {j === 0 && (
                    <>
                      <td rowSpan={ls.length} className="text-center align-middle">
                        {i + 1}
                      </td>
                      <td rowSpan={ls.length} className="align-middle font-semibold">
                        {t}
                      </td>
                    </>
                  )}
                  <td>{l.cycle}</td>
                  <td className="text-center">{l.classe}</td>
                  <td className="text-center">{deux(l.lots)}</td>
                  <td className="text-center">{deux(l.dossiers)}</td>
                </tr>
              ));
            })}
            <tr className="font-bold">
              <td colSpan={4} className="text-center">
                TOTAL
              </td>
              <td className="text-center">{deux(d.lots)}</td>
              <td className="text-center">{deux(d.dossiers)}</td>
            </tr>
          </tbody>
        </table>

        {/* Formule de politesse et signature : toujours ensemble, sur la même page */}
        <div className="break-inside-avoid">
          <p className="mt-5 text-justify indent-10">
            Vous en souhaitant bonne réception, je vous prie de croire, {d.appel.replace(/,$/, "")}, en l’expression de ma franche collaboration.
          </p>
          <div className="mt-10 ml-[50%] text-center">
            <div>{f.titre}</div>
            <div className="mt-20 font-bold">{f.nom}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
