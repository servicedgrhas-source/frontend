"use client";

import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, Chiffre, EnTete, Liste, Saisie, Tableau, Vide, cx } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Ligne {
  id: number;
  numeroFiche: string | null;
  nomComplet: string;
  matricule: string | null;
  statut: string;
  categorie: string | null;
  echelle: string | null;
  grade: string | null;
  departement: string | null;
  structure: string | null;
  cycle: string | null;
  echelon: number | null;
  echelonLibelle: string;
  depuis: string;
  origine: "DERNIER" | "ENTREE";
  dus: number;
  echelonTheorique: number | null;
  echelonTheoriqueLibelle: string;
  echeances: string[];
  dateManquante: boolean;
}
interface Reponse {
  reference: string;
  total: number;
  echelonsDus: number;
  dateManquante: number;
  parAttendu: { k: string; n: number }[];
  parCategorie: { k: string; n: number }[];
  parDepartement: { k: string; n: number }[];
  lignes: Ligne[];
}

const nf = new Intl.NumberFormat("fr-FR");
const dateFr = (d: string) => d.split("-").reverse().join("/");
const CYCLES = [
  { valeur: "PRESCOLAIRE", libelle: "Préscolaire" },
  { valeur: "PRIMAIRE", libelle: "Primaire" },
  { valeur: "COLLEGE", libelle: "Collège" },
  { valeur: "LYCEE", libelle: "Lycée" },
  { valeur: "ALPHABETISATION", libelle: "Alphabétisation" },
];
const PAGE = 200;

/**
 * Échelons en retard (réunion DG du 27/10/2026) : les fonctionnaires et contractuels qui auraient dû
 * avancer, pour préparer la commission administrative paritaire (révision de carrière) sans demander
 * de dossier aux agents. Classés par échelon attendu (DG, 28/10/2026 : la commission traite ensemble
 * ceux qui passent au même échelon), comptés par année (l'échelon de l'année est acquis au 31/12).
 */
const eme = (n: number | string) => (String(n) === "1" ? "1er" : `${n}e`);
/** « 5 » → « 5e échelon » ; « HC 2 » → « 2e échelon hors classe » (après le 16e, DG 29/10/2026) */
const echelonEnClair = (k: string) => (k.startsWith("HC ") ? `${eme(k.slice(3))} échelon hors classe` : `${eme(k)} échelon`);
export default function RetardsEchelons() {
  const { profil, refs } = useSession();
  const annee = new Date().getFullYear();
  const [f, setF] = useState({ annee: "", departement: "", categorie: "", cycle: "", attendu: "", statut: "", recherche: "" });
  const [page, setPage] = useState(1);
  const ouvert = peut.traiter(profil.role) || profil.role === "DDEPPSA" || accesDonne(profil);
  const filtre = qs(f);
  const r = useApi<Reponse>(ouvert ? `/recensement/retards-echelons${filtre}` : null);
  const [erreur, setErreur] = useState<string | null>(null);
  const maj = (k: keyof typeof f, v: string) => {
    setF({ ...f, [k]: v });
    setPage(1);
  };
  const exporter = (format: "excel" | "word") =>
    api.telecharger(`/recensement/retards-echelons/${format}${filtre}`, `Échelons en retard.${format === "excel" ? "xlsx" : "docx"}`).catch((e: Error) => setErreur(e.message));

  if (!ouvert) return <Alerte>Accès réservé à la DGRHAS et aux DDEPPSA.</Alerte>;
  const d = r.donnees;
  const visibles = d?.lignes.slice(0, page * PAGE) ?? [];
  return (
    <div className="space-y-5">
      <EnTete
        titre="Échelons en retard"
        sousTitre="Les fonctionnaires (une promotion tous les 2 ans) et les contractuels (un avancement tous les 2 ans et 4 mois) qui auraient dû avancer, d’après la date de leur dernière promotion, leur échelon et leur échelle. Pour préparer la commission administrative paritaire (révision de carrière) sans demander de dossier aux agents."
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Bouton onClick={() => exporter("excel")}>
              <FileSpreadsheet /> Excel
            </Bouton>
            <Bouton onClick={() => exporter("word")}>
              <FileText /> Word
            </Bouton>
            <Bouton onClick={() => window.open(`/impression/retards-echelons${filtre}`, "_blank")} title="Liste imprimable : en-tête du ministère, pages numérotées, signature du Directeur général">
              <Printer /> Imprimer / PDF
            </Bouton>
          </div>
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}

      <Carte className="no-print">
        <div className="grid gap-3 md:grid-cols-4">
          <Liste
            aria-label="Situation au"
            value={f.annee}
            onChange={(e) => maj("annee", e.target.value)}
            vide="Situation aujourd’hui"
            options={[annee, annee + 1, annee + 2].map((a) => ({ valeur: String(a), libelle: `Situation au 31/12/${a}` }))}
          />
          <Liste aria-label="Département" value={f.departement} onChange={(e) => maj("departement", e.target.value)} vide="Tous les départements" options={refs.departements.map((x) => ({ valeur: String(x.id), libelle: x.nom }))} />
          <Liste
            aria-label="Catégorie"
            value={f.categorie}
            onChange={(e) => maj("categorie", e.target.value)}
            vide="Toutes les catégories"
            options={["I", "II", "III", "HORS_CATEGORIE"].map((x) => ({ valeur: x, libelle: x === "HORS_CATEGORIE" ? "Hors catégorie" : `Catégorie ${x}` }))}
          />
          <Liste aria-label="Cycle" value={f.cycle} onChange={(e) => maj("cycle", e.target.value)} vide="Tous les cycles" options={CYCLES} />
          <Liste
            aria-label="Statut"
            value={f.statut}
            onChange={(e) => maj("statut", e.target.value)}
            vide="Fonctionnaires et contractuels"
            options={[
              { valeur: "FONCTIONNAIRE", libelle: "Fonctionnaires" },
              { valeur: "CONTRACTUEL", libelle: "Contractuels" },
            ]}
          />
          <Liste
            aria-label="Échelon attendu"
            value={f.attendu}
            onChange={(e) => maj("attendu", e.target.value)}
            vide="Tous les échelons attendus"
            options={[
              ...[...Array.from({ length: 15 }, (_, i) => String(i + 2)), ...Array.from({ length: 4 }, (_, i) => `HC ${i + 1}`)].map((k) => ({ valeur: k, libelle: `Attendus au ${echelonEnClair(k)}` })),
              { valeur: "date", libelle: "Date de dernière promotion à renseigner" },
            ]}
          />
          <div className="md:col-span-2">
            <Saisie value={f.recherche} onChange={(e) => maj("recherche", e.target.value)} placeholder="Nom, matricule ou n° de fiche…" aria-label="Recherche" />
          </div>
        </div>
      </Carte>

      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !d ? (
        <Chargement texte="Calcul de l’échelon attendu pour chaque agent…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Chiffre libelle={`Agents en retard au ${dateFr(d.reference)}`} valeur={nf.format(d.total)} />
            <Chiffre libelle="Échelons de retard au total" valeur={nf.format(d.echelonsDus)} detail="Pour chiffrer les moyens de la commission" />
            <Chiffre libelle="Date de dernière promotion à renseigner" valeur={nf.format(d.dateManquante)} detail="Échelon au-delà du 1er sans date : rien ne peut être calculé" />
          </div>
          <Carte titre="Répartition (pour préparer la commission)" className="no-print">
            <div className="flex flex-wrap gap-1.5">
              {d.parAttendu.map((x) => (
                <button
                  key={x.k}
                  type="button"
                  onClick={() => maj("attendu", f.attendu === x.k ? "" : x.k)}
                  className={cx("rounded-xl px-3 py-1.5 text-[12px] ring-1", f.attendu === x.k ? "bg-marque-500 text-white ring-marque-500" : "bg-white ring-zinc-200 hover:bg-zinc-50")}
                >
                  {x.k === "date" ? "Date à renseigner" : `Attendus au ${echelonEnClair(x.k)}`} · <strong>{nf.format(x.n)}</strong>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-zinc-500">
              Par catégorie : {d.parCategorie.map((x) => `${x.k === "HORS_CATEGORIE" ? "Hors catégorie" : x.k} ${nf.format(x.n)}`).join(" · ")}. Par département : {d.parDepartement.slice(0, 15).map((x) => `${x.k} ${nf.format(x.n)}`).join(" · ")}.
            </p>
          </Carte>
          <Carte titre={`${nf.format(d.total)} agent(s)`}>
            {!d.lignes.length ? (
              <Vide>Aucun agent en retard pour ces filtres.</Vide>
            ) : (
              <>
                <Tableau>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Catégorie · échelle</th>
                      <th>Département · structure</th>
                      <th className="text-right">Échelon actuel</th>
                      <th>Dernière promotion</th>
                      <th className="text-right">Échelon attendu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <Link href={`/personnel/agents/${l.id}`} className="font-medium text-marque-700 hover:underline">
                            {l.nomComplet}
                          </Link>
                          <div className="text-[11px] text-zinc-500">
                            {l.statut === "CONTRACTUEL" ? "Contractuel" : "Fonctionnaire"}
                            {l.matricule ? ` · matricule ${l.matricule}` : ""}
                            {l.grade ? ` · ${l.grade}` : ""}
                          </div>
                        </td>
                        <td className="text-[12px]">{[l.categorie === "HORS_CATEGORIE" ? "Hors cat." : l.categorie, l.echelle && `éch. ${l.echelle}`].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="text-[12px]">
                          {l.departement ?? "—"}
                          <div className="text-[11px] text-zinc-500">{[l.structure, l.cycle].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td className="text-right tabular-nums">{l.echelonLibelle || "—"}</td>
                        <td className="text-[12px]">
                          {l.dateManquante ? <Badge ton="rouge">à renseigner</Badge> : `${dateFr(l.depuis)}${l.origine === "ENTREE" ? " (entrée)" : ""}`}
                        </td>
                        <td className="text-right font-semibold tabular-nums" title={l.echeances.length ? `Échéances : ${l.echeances.map((x) => x.slice(0, 4)).join(", ")}` : undefined}>
                          {l.dateManquante ? "—" : l.echelonTheoriqueLibelle || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
                {d.lignes.length > visibles.length && (
                  <div className="no-print mt-3 text-center">
                    <Bouton onClick={() => setPage(page + 1)}>Voir les {Math.min(PAGE, d.lignes.length - visibles.length)} suivants</Bouton>
                  </div>
                )}
              </>
            )}
            <p className="mt-3 text-[11px] text-zinc-400">
              Échelon actuel : celui de la fiche (dernier arrêté). Échelon attendu : celui qu’il aurait en avançant normalement jusqu’au {dateFr(d.reference)}, compté par année (l’échelon d’une année est acquis au 31 décembre ; choisissez « Situation au 31/12 » pour compter celui de l’année). Les promotions exceptionnelles se saisissent sur la fiche (bouton « Exception » du dossier de carrière).
            </p>
          </Carte>
        </>
      )}
    </div>
  );
}
