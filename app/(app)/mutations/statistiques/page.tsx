"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Printer } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Alerte, Bouton, Carte, Chargement, Chiffre, cx, EnTete, Liste, Segments, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { CYCLES } from "@/lib/libelles";

interface Stat {
  base: string;
  total: number;
  departements: { code: string; nom: string }[];
  lignes: { cycle: string; specialite: string | null; valeurs: Record<string, { M: number; R: number; E: number }> }[];
}
type LigneStat = Stat["lignes"][number];

const nf = new Intl.NumberFormat("fr-FR");
const SPECIALITES: Record<string, string> = {
  FRANCAIS: "Français",
  ANGLAIS: "Anglais",
  "HISTOIRE-GEO": "Histoire-géographie",
  MATHS: "Mathématiques",
  "PHYS-CHIMIE": "Physique-chimie",
  SVT: "SVT",
  DESSIN: "Dessin / arts plastiques",
  MUSIQUE: "Musique",
  EPS: "EPS",
  PHILO: "Philosophie",
  ESPAGNOL: "Espagnol",
  RUSSE: "Russe",
  CHINOIS: "Chinois",
  ALLEMAND: "Allemand",
  LATIN: "Latin",
  AUTRES: "Autres spécialités",
};

export default function Statistiques() {
  const [base, setBase] = useState<"accordees" | "toutes">("accordees");
  const [departement, setDepartement] = useState("");
  const { donnees: s, erreur } = useApi<Stat>(`/mutations/statistiques?base=${base}`);

  const parDepartement = useMemo(() => {
    if (!s) return [];
    return s.departements.map((d) => {
      const M = s.lignes.reduce((t, l) => t + l.valeurs[d.code].M, 0);
      const R = s.lignes.reduce((t, l) => t + l.valeurs[d.code].R, 0);
      return { ...d, M, R, E: M - R };
    });
  }, [s]);

  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!s) return <Chargement />;

  const plusDemande = [...parDepartement].sort((a, b) => b.R - a.R)[0];
  const plusQuitte = [...parDepartement].sort((a, b) => b.M - a.M)[0];
  const libelleBase = base === "accordees" ? "mutations accordées" : "demandes";

  return (
    <div className="space-y-6">
      {/* ============================== Vue écran ============================== */}
      <div className="space-y-6 print:hidden">
        <EnTete
          titre="Statistiques des mutations"
          sousTitre="Départs et arrivées par département, puis le détail par cycle et spécialité."
          actions={
            <Bouton onClick={() => window.print()}>
              <Printer /> Imprimer la fiche officielle
            </Bouton>
          }
        />

        <Segments
          valeur={base}
          changer={setBase}
          options={[
            { valeur: "accordees", libelle: "Mutations accordées" },
            { valeur: "toutes", libelle: "Toutes les demandes" },
          ]}
        />

        {s.total === 0 ? (
          <Carte>
            <Vide>
              Aucune {libelleBase.replace(/s$/, "")} pour le moment.
              {base === "accordees" && (
                <div className="mt-3">
                  <Bouton onClick={() => setBase("toutes")}>Voir toutes les demandes</Bouton>
                </div>
              )}
            </Vide>
          </Carte>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Chiffre icone={<ArrowLeftRight />} libelle={base === "accordees" ? "Mutations accordées" : "Demandes de mutation"} valeur={nf.format(s.total)} />
              <Chiffre icone={<ArrowDownLeft />} ton="vert" libelle="Département le plus demandé" valeur={plusDemande?.nom ?? "—"} detail={`${nf.format(plusDemande?.R ?? 0)} arrivées`} />
              <Chiffre icone={<ArrowUpRight />} ton="rouge" libelle="Département le plus quitté" valeur={plusQuitte?.nom ?? "—"} detail={`${nf.format(plusQuitte?.M ?? 0)} départs`} />
            </div>

            <Carte
              titre="Mouvements par département"
              actions={
                <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rouge-600/70" /> Départs</span>
                  <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-marque-500" /> Arrivées</span>
                </div>
              }
            >
              <Papillon lignes={parDepartement} actif={departement} choisir={(c) => setDepartement(c === departement ? "" : c)} />
              <p className="mt-3 text-[11px] text-zinc-400">Cliquez sur un département pour voir le détail par cycle et spécialité.</p>
            </Carte>

            <Carte
              titre={departement ? `Détail – ${s.departements.find((d) => d.code === departement)?.nom}` : "Détail par cycle et spécialité"}
              actions={
                <Liste
                  className="w-52"
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value)}
                  vide="Tous les départements"
                  options={s.departements.map((d) => ({ valeur: d.code, libelle: d.nom }))}
                />
              }
            >
              <DetailCycles lignes={s.lignes} departements={s.departements} departement={departement} />
            </Carte>
          </>
        )}
      </div>

      {/* ======================= Fiche officielle (impression) ======================= */}
      <div className="hidden print:block">
        <FicheOfficielle s={s} base={base} />
      </div>
    </div>
  );
}

/** Graphique « papillon » : départs à gauche, arrivées à droite, un département par ligne. */
function Papillon({
  lignes,
  actif,
  choisir,
}: {
  lignes: { code: string; nom: string; M: number; R: number; E: number }[];
  actif: string;
  choisir: (code: string) => void;
}) {
  const max = Math.max(1, ...lignes.flatMap((l) => [l.M, l.R]));
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[9rem_1fr_1fr_4.5rem] gap-3 px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        <span>Département</span>
        <span className="text-right">Départs</span>
        <span>Arrivées</span>
        <span className="text-right">Solde</span>
      </div>
      {lignes.map((l) => (
        <button
          key={l.code}
          onClick={() => choisir(l.code)}
          title={`${l.nom} : ${l.M} départ(s), ${l.R} arrivée(s)`}
          className={cx(
            "grid w-full grid-cols-[9rem_1fr_1fr_4.5rem] items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors",
            actif === l.code ? "bg-marque-50 ring-1 ring-marque-200" : "hover:bg-zinc-50",
          )}
        >
          <span className="truncate text-[13px] font-medium">{l.nom}</span>
          <span className="flex items-center justify-end gap-2">
            <span className="text-[11px] tabular-nums text-zinc-500">{l.M || ""}</span>
            <span className="h-3 rounded-l-[4px] bg-rouge-600/70" style={{ width: `${(l.M / max) * 100}%`, minWidth: l.M ? 3 : 0 }} />
          </span>
          <span className="flex items-center gap-2 border-l border-zinc-200">
            <span className="h-3 rounded-r-[4px] bg-marque-500" style={{ width: `${(l.R / max) * 100}%`, minWidth: l.R ? 3 : 0 }} />
            <span className="text-[11px] tabular-nums text-zinc-500">{l.R || ""}</span>
          </span>
          <span className={cx("text-right text-[13px] font-semibold tabular-nums", l.E > 0 ? "text-rouge-600" : l.E < 0 ? "text-marque-700" : "text-zinc-300")}>
            {l.E > 0 ? `−${l.E}` : l.E < 0 ? `+${-l.E}` : "0"}
          </span>
        </button>
      ))}
      <p className="px-2 pt-2 text-[11px] text-zinc-400">Solde : arrivées moins départs (+ le département gagne des agents, − il en perd).</p>
    </div>
  );
}

/** Tableau par cycle et spécialité, pour tous les départements ou un seul. */
function DetailCycles({ lignes, departements, departement }: { lignes: LigneStat[]; departements: Stat["departements"]; departement: string }) {
  const codes = departement ? [departement] : departements.map((d) => d.code);
  const val = (l: LigneStat, k: "M" | "R") => codes.reduce((t, c) => t + l.valeurs[c][k], 0);
  const groupes = [
    { titre: "Administration", lignes: lignes.filter((l) => l.cycle === "ADMINISTRATION") },
    { titre: "Préscolaire", lignes: lignes.filter((l) => l.cycle === "PRESCOLAIRE") },
    { titre: "Primaire", lignes: lignes.filter((l) => l.cycle === "PRIMAIRE") },
    { titre: "Collège", lignes: lignes.filter((l) => l.cycle === "COLLEGE") },
    { titre: "Lycée", lignes: lignes.filter((l) => l.cycle === "LYCEE") },
  ];
  const max = Math.max(1, ...lignes.map((l) => Math.max(val(l, "M"), val(l, "R"))));

  return (
    <div className="divide-y divide-zinc-100">
      <div className="grid grid-cols-[1fr_5rem_5rem_5rem] gap-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        <span>Cycle / spécialité</span>
        <span className="text-right">{departement ? "Départs" : "Mutations"}</span>
        <span className="text-right">{departement ? "Arrivées" : ""}</span>
        <span className="text-right">{departement ? "Solde" : ""}</span>
      </div>
      {groupes.map((g) => {
        const M = g.lignes.reduce((t, l) => t + val(l, "M"), 0);
        const R = g.lignes.reduce((t, l) => t + val(l, "R"), 0);
        const details = g.lignes.filter((l) => l.specialite && (val(l, "M") || val(l, "R")));
        return (
          <div key={g.titre} className="py-3">
            <Rangee libelle={g.titre} M={M} R={R} parDepartement={!!departement} max={max} principal />
            {details.length > 0 && (
              <div className="mt-1 space-y-0.5 pl-4">
                {details.map((l) => (
                  <Rangee key={l.specialite} libelle={SPECIALITES[l.specialite!] ?? l.specialite!} M={val(l, "M")} R={val(l, "R")} parDepartement={!!departement} max={max} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Rangee({ libelle, M, R, parDepartement, max, principal }: { libelle: string; M: number; R: number; parDepartement: boolean; max: number; principal?: boolean }) {
  const solde = R - M;
  return (
    <div className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center gap-3 py-1">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cx("w-44 shrink-0 truncate", principal ? "text-[13px] font-semibold" : "text-[12px] text-zinc-500")}>{libelle}</span>
        {!parDepartement && (
          <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 sm:block">
            <span className="block h-full rounded-full bg-marque-500" style={{ width: `${(M / max) * 100}%` }} />
          </span>
        )}
      </div>
      <span className={cx("text-right tabular-nums", principal ? "text-[13px] font-semibold" : "text-[12px]", !M && "text-zinc-300")}>{nf.format(M)}</span>
      <span className={cx("text-right tabular-nums", principal ? "text-[13px] font-semibold" : "text-[12px]", !R && "text-zinc-300")}>{parDepartement ? nf.format(R) : ""}</span>
      <span className={cx("text-right text-[12px] font-semibold tabular-nums", solde > 0 ? "text-marque-700" : solde < 0 ? "text-rouge-600" : "text-zinc-300")}>
        {parDepartement ? (solde > 0 ? `+${solde}` : solde < 0 ? `−${-solde}` : "0") : ""}
      </span>
    </div>
  );
}

/** Fiche statistique officielle (format Excel de la DGRHAS), utilisée pour l'impression. */
function FicheOfficielle({ s, base }: { s: Stat; base: string }) {
  const somme = (lignes: LigneStat[], code: string, k: "M" | "R" | "E") => lignes.reduce((t, l) => t + l.valeurs[code][k], 0);
  const total = (l: LigneStat, k: "M" | "R" | "E") => s.departements.reduce((t, d) => t + l.valeurs[d.code][k], 0);
  const groupes: { titre: string; lignes: LigneStat[]; sousTotal?: string }[] = [
    { titre: "", lignes: s.lignes.filter((l) => !l.specialite) },
    { titre: "COLLEGE", lignes: s.lignes.filter((l) => l.cycle === "COLLEGE"), sousTotal: "SOUS-TOTAL COLLEGE" },
    { titre: "LYCEE", lignes: s.lignes.filter((l) => l.cycle === "LYCEE"), sousTotal: "SOUS-TOTAL LYCEE" },
  ];
  const nom = (d: { nom: string }) => d.nom.toUpperCase().replace("POINTE-NOIRE", "P/NOIRE").replace("CONGO-OUBANGUI", "CONGO-OUB.");

  return (
    <div className="text-black">
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>
      <h1 className="text-center text-base font-bold">FICHE STATISTIQUE DES MUTATIONS</h1>
      <p className="mb-1 text-center text-xs">{base === "accordees" ? "Mutations accordées" : "Toutes les demandes"} — Légende : M = Muté ; R = Reçu ; E = Écart</p>
      <table className="w-full border-collapse text-[7pt] [&_td]:border [&_td]:border-black [&_td]:px-0.5 [&_td]:text-center [&_th]:border [&_th]:border-black [&_th]:px-0.5">
        <thead>
          <tr>
            <th rowSpan={2}>CYCLE</th>
            <th rowSpan={2}>SPÉCIALITÉ</th>
            {s.departements.map((d) => (
              <th key={d.code} colSpan={3}>{nom(d)}</th>
            ))}
            <th colSpan={3}>TOTAL</th>
          </tr>
          <tr>
            {[...s.departements, { code: "T" }].map((d) => (
              <Fragment key={d.code}>
                <th>M</th>
                <th>R</th>
                <th>E</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupes.map((g) => (
            <Fragment key={g.titre || "base"}>
              {g.lignes.map((l, i) => (
                <tr key={l.cycle + (l.specialite ?? "")}>
                  {(!g.titre || i === 0) && (
                    <td rowSpan={g.titre ? g.lignes.length : 1} className="font-bold">
                      {g.titre || CYCLES[l.cycle].toUpperCase()}
                    </td>
                  )}
                  <td className="text-left">{l.specialite ?? ""}</td>
                  {s.departements.map((d) => (
                    <Fragment key={d.code}>
                      <td>{l.valeurs[d.code].M || ""}</td>
                      <td>{l.valeurs[d.code].R || ""}</td>
                      <td>{l.valeurs[d.code].E || ""}</td>
                    </Fragment>
                  ))}
                  <td className="font-bold">{total(l, "M")}</td>
                  <td className="font-bold">{total(l, "R")}</td>
                  <td className="font-bold">{total(l, "E")}</td>
                </tr>
              ))}
              {g.sousTotal && (
                <tr className="font-bold">
                  <td colSpan={2}>{g.sousTotal}</td>
                  {s.departements.map((d) => (
                    <Fragment key={d.code}>
                      <td>{somme(g.lignes, d.code, "M")}</td>
                      <td>{somme(g.lignes, d.code, "R")}</td>
                      <td>{somme(g.lignes, d.code, "E")}</td>
                    </Fragment>
                  ))}
                  <td>{g.lignes.reduce((t, l) => t + total(l, "M"), 0)}</td>
                  <td>{g.lignes.reduce((t, l) => t + total(l, "R"), 0)}</td>
                  <td>{g.lignes.reduce((t, l) => t + total(l, "E"), 0)}</td>
                </tr>
              )}
            </Fragment>
          ))}
          <tr className="font-bold">
            <td colSpan={2}>TOTAL GÉNÉRAL</td>
            {s.departements.map((d) => (
              <Fragment key={d.code}>
                <td>{somme(s.lignes, d.code, "M")}</td>
                <td>{somme(s.lignes, d.code, "R")}</td>
                <td>{somme(s.lignes, d.code, "E")}</td>
              </Fragment>
            ))}
            <td>{s.lignes.reduce((t, l) => t + total(l, "M"), 0)}</td>
            <td>{s.lignes.reduce((t, l) => t + total(l, "R"), 0)}</td>
            <td>{s.lignes.reduce((t, l) => t + total(l, "E"), 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
