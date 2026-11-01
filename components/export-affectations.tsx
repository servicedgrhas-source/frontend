"use client";

import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { familleDe, GROUPES, type Famille } from "./choix-lots";
import { useSession } from "./session";
import { Alerte, Bouton, Champ, Liste, Modale } from "./ui";
import { api, qs, useApi } from "@/lib/api";
import type { Affectation, GroupeQuota, Lot } from "@/lib/types";

const CYCLES = [
  { valeur: "PRESCOLAIRE", libelle: "Préscolaire" },
  { valeur: "PRIMAIRE", libelle: "Primaire" },
  { valeur: "COLLEGE", libelle: "Collège" },
  { valeur: "LYCEE", libelle: "Lycée" },
  { valeur: "ADMINISTRATION", libelle: "Administration" },
];
const STATUTS = [
  { valeur: "A_TRAITER", libelle: "À traiter (pas encore affectés)" },
  { valeur: "AFFECTE", libelle: "Déjà affectés" },
  { valeur: "EXCLU", libelle: "Exclus" },
  { valeur: "", libelle: "Tous" },
];
const FAMILLES: { code: Famille; libelle: string }[] = [
  { code: "ARRETE", libelle: "Arrêtés" },
  { code: "DECRET", libelle: "Décrets" },
  { code: "ANCIENS", libelle: "Anciens lots" },
];

/**
 * Exporter une liste de « Traitement des affectations » (DG, 01/11/2026) : arrêtés ou décrets, les
 * lots, les quotas, les sans département, un cycle, un département… en Excel, Word ou PDF.
 */
export function ExportAffectations({
  lots,
  familleDepart,
  selectionDepart,
  fermer,
}: {
  lots: Lot[];
  familleDepart: Famille;
  selectionDepart: number[];
  fermer: () => void;
}) {
  const { refs } = useSession();
  const [famille, setFamille] = useState<Famille>(familleDepart);
  const [choix, setChoix] = useState<number[]>(selectionDepart);
  const [groupes, setGroupes] = useState<GroupeQuota[]>(GROUPES.map((g) => g.code));
  const [departementId, setDepartementId] = useState("");
  const [cycle, setCycle] = useState("");
  const [statut, setStatut] = useState("A_TRAITER");
  const [erreur, setErreur] = useState<string | null>(null);

  const deLaFamille = lots.filter((l) => familleDe(l) === famille).sort((a, b) => (a.numeroFichier ?? a.numero) - (b.numeroFichier ?? b.numero));
  const lotsChoisis = deLaFamille.filter((l) => choix.includes(l.numero));
  const filtres = {
    lots: lotsChoisis.map((l) => l.numero).join(","),
    groupes: groupes.join(","),
    departementId,
    cycle,
    statut,
  };
  const pret = lotsChoisis.length > 0 && groupes.length > 0;
  const apercu = useApi<Affectation[]>(pret ? `/affectations${qs(filtres)}` : null);

  // Titre de la liste, écrit d'après les filtres : « Sans département — Arrêtés lots I et II — Collège »
  const titre = useMemo(() => {
    const morceaux: string[] = [];
    if (departementId === "SANS") morceaux.push("Personnes sans département");
    else if (departementId) morceaux.push(`Département ${refs.departements.find((d) => String(d.id) === departementId)?.nom ?? ""}`);
    else morceaux.push(statut === "AFFECTE" ? "Personnes déjà affectées" : statut === "EXCLU" ? "Personnes exclues" : "Personnes à affecter");
    const nomFamille = FAMILLES.find((f) => f.code === famille)?.libelle ?? "";
    const numeros = lotsChoisis.map((l) => l.libelle.split(" — lot ").pop() ?? l.libelle);
    morceaux.push(
      lotsChoisis.length === deLaFamille.length && deLaFamille.length > 1
        ? `${nomFamille}, tous les lots`
        : `${nomFamille} — lot${numeros.length > 1 ? "s" : ""} ${numeros.join(", ")}`,
    );
    if (cycle) morceaux.push(CYCLES.find((c) => c.valeur === cycle)?.libelle ?? cycle);
    if (groupes.length < GROUPES.length) morceaux.push(GROUPES.filter((g) => groupes.includes(g.code)).map((g) => g.libelle).join(", "));
    return morceaux.join(" — ");
  }, [departementId, statut, famille, lotsChoisis, deLaFamille.length, cycle, groupes, refs.departements]);

  async function telecharger(format: "xlsx" | "docx") {
    setErreur(null);
    try {
      await api.telecharger(`/affectations/export${qs({ ...filtres, format, titre })}`, `${titre.replace(/[\\/:*?"<>|]/g, "-").slice(0, 120)}.${format}`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  const basculerLot = (n: number) => setChoix((x) => (x.includes(n) ? x.filter((y) => y !== n) : [...x, n]));
  const basculerGroupe = (g: GroupeQuota) => setGroupes((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]));

  return (
    <Modale titre="Exporter une liste" ouverte fermer={fermer} large>
      <div className="space-y-4 text-[13px]">
        <div>
          <div className="mb-1.5 font-medium">1. Type de texte</div>
          <div className="inline-flex rounded-full bg-zinc-100 p-1">
            {FAMILLES.filter((f) => lots.some((l) => familleDe(l) === f.code)).map((f) => (
              <button
                key={f.code}
                type="button"
                onClick={() => {
                  setFamille(f.code);
                  setChoix(lots.filter((l) => familleDe(l) === f.code && !l.archive).map((l) => l.numero));
                }}
                className={`rounded-full px-4 py-1.5 font-medium transition ${famille === f.code ? "bg-encre text-white" : "text-zinc-600 hover:text-encre"}`}
              >
                {f.libelle}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-medium">2. Lots</span>
            <span className="flex gap-3 text-xs">
              <button type="button" className="text-marque-700 hover:underline" onClick={() => setChoix(deLaFamille.map((l) => l.numero))}>
                Tous
              </button>
              <button type="button" className="text-zinc-500 hover:underline" onClick={() => setChoix([])}>
                Aucun
              </button>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {deLaFamille.map((l) => (
              <label key={l.numero} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 ring-1 transition ${choix.includes(l.numero) ? "bg-marque-50 ring-marque-300" : "ring-zinc-200 hover:ring-zinc-300"}`}>
                <input type="checkbox" className="size-4 accent-marque-600" checked={choix.includes(l.numero)} onChange={() => basculerLot(l.numero)} />
                {l.libelle.split(" — ").pop()}
                {l.archive && <span className="text-[11px] text-zinc-400">traité</span>}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 font-medium">3. Quotas</div>
          <div className="flex flex-wrap gap-2">
            {GROUPES.map((g) => (
              <label key={g.code} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 ring-1 transition ${groupes.includes(g.code) ? "bg-marque-50 ring-marque-300" : "ring-zinc-200 hover:ring-zinc-300"}`}>
                <input type="checkbox" className="size-4 accent-marque-600" checked={groupes.includes(g.code)} onChange={() => basculerGroupe(g.code)} />
                {g.libelle}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Champ libelle="4. Département" aide="« Sans département » : les personnes qui n’ont pas encore de département d’affectation">
            <Liste
              value={departementId}
              onChange={(e) => setDepartementId(e.target.value)}
              options={[
                { valeur: "", libelle: "Tous" },
                { valeur: "SANS", libelle: "Sans département" },
                ...refs.departements.map((d) => ({ valeur: String(d.id), libelle: d.nom })),
              ]}
            />
          </Champ>
          <Champ libelle="5. Cycle" aide="Le cycle de la note de service : préscolaire, primaire, collège, lycée ou administration">
            <Liste value={cycle} onChange={(e) => setCycle(e.target.value)} options={[{ valeur: "", libelle: "Tous" }, ...CYCLES]} />
          </Champ>
          <Champ libelle="6. Personnes">
            <Liste value={statut} onChange={(e) => setStatut(e.target.value)} options={STATUTS} />
          </Champ>
        </div>

        <div className="rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Titre de la liste</div>
          <div className="font-medium text-encre">{titre}</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {!pret ? "Choisissez au moins un lot et un quota." : apercu.chargement ? "Calcul…" : `${apercu.donnees?.length ?? 0} personne(s)`}
          </div>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Bouton onClick={fermer}>Fermer</Bouton>
          <Bouton disabled={!pret || !apercu.donnees?.length} onClick={() => telecharger("xlsx")}>
            <FileSpreadsheet className="size-4" aria-hidden />
            Excel
          </Bouton>
          <Bouton disabled={!pret || !apercu.donnees?.length} onClick={() => telecharger("docx")}>
            <FileText className="size-4" aria-hidden />
            Word
          </Bouton>
          <Bouton variante="principal" disabled={!pret || !apercu.donnees?.length} onClick={() => window.open(`/impression/affectations${qs({ ...filtres, titre })}`, "_blank")}>
            <Printer className="size-4" aria-hidden />
            PDF / Imprimer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
