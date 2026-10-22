"use client";

import { ChevronLeft, ChevronRight, Download, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { FicheDossier } from "@/components/fiche-dossier";
import { Aide, Alerte, Badge, Bouton, Carte, Champ, Chargement, Liste, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte } from "@/lib/libelles";

interface Envoye {
  id: string;
  nomComplet: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  quota: number | null;
  statut: string | null;
  lotCommission: string | null;
  numeroListe: number | null;
  diplome: string | null;
  grade: string | null;
  contractuel: boolean | null;
  provisoire: boolean;
  departement: string | null;
  transmission: string;
  transmisLe: string | null;
  texte: { type: string | null; numero: string | null; lot: string | null } | null;
  rectifiee: boolean;
}
interface Page {
  total: number;
  page: number;
  taille: number;
  attente: number;
  recus: number;
  items: Envoye[];
}
interface Filtres {
  quotas: {
    quota: number;
    n: number;
    attente: number;
    transmissions: { numero: number; libelle: string; n: number; attente: number }[];
    lots: { lot: string; n: number }[];
  }[];
  diplomes: { code: string; libelle: string; n: number }[];
  departements: { id: number; nom: string; n: number }[];
  statuts: { statut: string; n: number }[];
}

const VIDE = { recherche: "", quota: "", transmission: "", lotCommission: "", statut: "", diplomeCode: "", departementId: "", texte: "attente" as "attente" | "recu" | "" };
const nf = new Intl.NumberFormat("fr-FR");

/** Tous les dossiers envoyés à la FP, avec filtres ; un clic ouvre la fiche du dossier. */
export function BaseEnvoyes() {
  const [f, setF] = useState(VIDE);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [export_, setExport] = useState(false);
  const filtres = useApi<Filtres>("/envois/filtres");
  // La recherche part après une courte pause de frappe
  useEffect(() => {
    const t = setTimeout(() => {
      setF((x) => ({ ...x, recherche }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [recherche]);
  const params = { ...f, page, taille: 50 };
  const liste = useApi<Page>(`/envois${qs(params)}`);
  const choisir = (k: keyof typeof VIDE, v: string) => {
    setF((x) => ({
      ...x,
      [k]: v,
      // Le quota change : sa transmission et son lot ne valent plus
      ...(k === "quota" ? { transmission: "", lotCommission: "" } : {}),
    }));
    setPage(1);
  };
  const q = filtres.donnees?.quotas.find((x) => String(x.quota) === f.quota);
  const filtre = Object.entries(f).some(([k, v]) => k !== "texte" && v);
  const d = liste.donnees;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.taille)) : 1;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { cle: "attente" as const, titre: "Texte attendu", n: d?.attente, texte: "Envoyés à la FP, arrêté ou décret pas encore revenu" },
          { cle: "recu" as const, titre: "Texte reçu", n: d?.recus, texte: "La FP a renvoyé leur arrêté ou leur décret" },
          { cle: "" as const, titre: "Tous les envoyés", n: d ? d.attente + d.recus : undefined, texte: "Tout ce qui est parti à la FP" },
        ].map((c) => (
          <button
            key={c.cle}
            type="button"
            onClick={() => choisir("texte", c.cle)}
            className={`rounded-3xl bg-white p-4 text-left shadow-doux transition hover:-translate-y-0.5 ${f.texte === c.cle ? "ring-2 ring-or-400" : ""}`}
          >
            <div className="text-2xl font-semibold tabular-nums">{c.n === undefined ? "…" : nf.format(c.n)}</div>
            <div className="text-[13px] font-medium">{c.titre}</div>
            <div className="text-[11px] text-zinc-400">{c.texte}</div>
          </button>
        ))}
      </div>

      <Carte
        titre="Base des envoyés à la Fonction Publique"
        actions={
          <Bouton
            chargement={export_}
            onClick={async () => {
              setExport(true);
              await api.telecharger(`/envois/excel${qs(f)}`, "Envoyés à la FP.xlsx").catch(() => undefined);
              setExport(false);
            }}
          >
            <Download /> Exporter (Excel)
            <Aide>Le fichier contient les dossiers de la liste ci-dessous, avec les filtres choisis. Sans incidence financière.</Aide>
          </Bouton>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Champ libelle="Rechercher" aide="Nom et prénoms (dans n’importe quel ordre) ou n° du texte" className="md:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Saisie className="w-full pl-9!" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Ex. MOUANDA Jean, ou 6758" />
            </div>
          </Champ>
          <Champ libelle="Quota">
            <Liste value={f.quota} onChange={(e) => choisir("quota", e.target.value)} vide="Tous les quotas" options={(filtres.donnees?.quotas ?? []).map((x) => ({ valeur: String(x.quota), libelle: `Quota ${x.quota} (${nf.format(x.n)})` }))} />
          </Champ>
          <Champ libelle="Transmission" aide={!f.quota ? "Choisissez d’abord le quota" : undefined}>
            <Liste
              value={f.transmission}
              disabled={!q}
              onChange={(e) => choisir("transmission", e.target.value)}
              vide="Toutes"
              options={(q?.transmissions ?? []).map((t) => ({ valeur: String(t.numero), libelle: `${t.libelle} (${t.n}, dont ${t.attente} en attente)` }))}
            />
          </Champ>
          <Champ libelle="Lot de la commission" aide={!f.quota ? "Choisissez d’abord le quota" : undefined}>
            <Liste value={f.lotCommission} disabled={!q} onChange={(e) => choisir("lotCommission", e.target.value)} vide="Tous" options={(q?.lots ?? []).map((l) => ({ valeur: l.lot, libelle: `${l.lot} (${l.n})` }))} />
          </Champ>
          <Champ libelle="Statut">
            <Liste value={f.statut} onChange={(e) => choisir("statut", e.target.value)} vide="Volontaires et communautaires" options={(filtres.donnees?.statuts ?? []).map((s) => ({ valeur: s.statut, libelle: `${s.statut} (${nf.format(s.n)})` }))} />
          </Champ>
          <Champ libelle="Diplôme">
            <Liste value={f.diplomeCode} onChange={(e) => choisir("diplomeCode", e.target.value)} vide="Tous" options={(filtres.donnees?.diplomes ?? []).map((x) => ({ valeur: x.code, libelle: `${x.libelle} (${nf.format(x.n)})` }))} />
          </Champ>
          <Champ libelle="Département">
            <Liste value={f.departementId} onChange={(e) => choisir("departementId", e.target.value)} vide="Tous" options={(filtres.donnees?.departements ?? []).map((x) => ({ valeur: String(x.id), libelle: `${x.nom} (${nf.format(x.n)})` }))} />
          </Champ>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Segments
            valeur={f.texte}
            changer={(v) => choisir("texte", v)}
            options={[
              { valeur: "attente", libelle: "Texte attendu" },
              { valeur: "recu", libelle: "Texte reçu" },
              { valeur: "", libelle: "Tous" },
            ]}
          />
          <div className="flex items-center gap-3 text-[12px] text-zinc-500">
            {d && `${nf.format(d.total)} dossier(s)`}
            {filtre && (
              <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-marque-700 hover:underline"
                onClick={() => {
                  setF({ ...VIDE, texte: f.texte });
                  setRecherche("");
                  setPage(1);
                }}
              >
                <RotateCcw className="size-3.5" /> Effacer les filtres
              </button>
            )}
          </div>
        </div>

        {liste.erreur && <Alerte>{liste.erreur}</Alerte>}
        {!d ? (
          <Chargement />
        ) : !d.items.length ? (
          <Vide>Aucun dossier ne correspond à ces filtres.</Vide>
        ) : (
          <>
            <Tableau>
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Diplôme · grade</th>
                  <th>Quota · lot</th>
                  <th>Envoi</th>
                  <th>Texte de la FP</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((x) => (
                  <tr key={x.id} onClick={() => setOuvert(x.id)} className="cursor-pointer hover:bg-marque-50/50" title="Cliquer pour voir tout le dossier">
                    <td className="min-w-52">
                      <div className="font-medium text-marque-700">{x.nomComplet}</div>
                      <div className="text-[11px] text-zinc-400">
                        {x.dateNaissance ? `Né(e) le ${dateCourte(x.dateNaissance)}` : "Date de naissance à préciser"}
                        {x.lieuNaissance ? ` à ${x.lieuNaissance}` : ""} · {x.departement ?? "département ?"}
                      </div>
                    </td>
                    <td>
                      {x.diplome ?? "—"}
                      <div className="text-[11px] text-zinc-400">
                        {x.grade ?? "grade ?"}
                        {x.contractuel === null ? "" : x.contractuel ? " · contractuel" : " · fonctionnaire"}
                        {x.contractuel !== null && x.provisoire ? " (prévision)" : ""}
                      </div>
                    </td>
                    <td className="text-[12px]">
                      Quota {x.quota} · {x.statut}
                      <div className="text-[11px] text-zinc-400">
                        {x.lotCommission ?? "sans lot"}
                        {x.numeroListe ? ` · n° ${x.numeroListe} sur la liste` : ""}
                      </div>
                    </td>
                    <td className="text-[12px] whitespace-nowrap">
                      {x.transmission}
                      <div className="text-[11px] text-zinc-400">{dateCourte(x.transmisLe)}</div>
                      {x.rectifiee && <Badge ton="jaune">Corrigé après envoi</Badge>}
                    </td>
                    <td className="text-[12px]">
                      {x.texte ? (
                        <>
                          <Badge ton="vert">
                            {x.texte.type === "DECRET" ? "Décret" : "Arrêté"} n° {x.texte.numero ?? "?"}
                          </Badge>
                          <div className="mt-0.5 text-[11px] text-zinc-400">{x.texte.lot}</div>
                        </>
                      ) : (
                        <Badge ton="jaune">Attendu</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-[13px]">
                <Bouton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft /> Précédents
                </Bouton>
                <span className="text-zinc-500">
                  Page {page} sur {pages}
                </span>
                <Bouton disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Suivants <ChevronRight />
                </Bouton>
              </div>
            )}
          </>
        )}
      </Carte>

      {ouvert && <FicheDossier id={ouvert} fermer={() => setOuvert(null)} />}
    </div>
  );
}
