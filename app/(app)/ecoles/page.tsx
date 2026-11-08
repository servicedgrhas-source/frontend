"use client";

import { School } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pagination } from "@/components/pagination";
import { useSession } from "@/components/session";
import { Alerte, Badge, Carte, Chargement, EnTete, Liste, Saisie, Tableau, Vide } from "@/components/ui";
import { useApi } from "@/lib/api";
import { CYCLES } from "@/lib/ecoles";

interface Ligne {
  id: number;
  nom: string;
  cycle: string | null;
  localite: string | null;
  departement: string | null;
  inspection: string | null;
  classes: number;
  salles: number;
  agents: number;
}

const TAILLE = 50;

/** Écoles du périmètre : un chef d'établissement arrive directement sur la sienne. */
export default function Ecoles() {
  const { profil, refs } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [departement, setDepartement] = useState("");
  const [cycle, setCycle] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const central = !["DDEPPSA", "STRUCTURE"].includes(profil.role);
  const d = useApi<{ annee: string; page: number; pages: number; total: number; lignes: Ligne[] }>(
    `/etablissements?q=${encodeURIComponent(recherche)}&departement=${departement}&cycle=${cycle}&page=${page}&taille=${TAILLE}`,
  );
  useEffect(() => {
    // Une autre recherche, un autre filtre : retour à la première page
    const t = setTimeout(() => {
      setRecherche(q);
      if (q !== recherche) setPage(1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  // Compte d'une école : sa fiche directement
  useEffect(() => {
    if (profil.role === "STRUCTURE" && d.donnees?.lignes.length === 1 && !recherche) router.replace(`/ecoles/${d.donnees.lignes[0].id}`);
  }, [profil.role, d.donnees, recherche, router]);

  return (
    <div className="space-y-5">
      <EnTete
        titre="Écoles et classes"
        sousTitre="Pour chaque école : ses bâtiments et ses salles, les classes ouvertes de l’année, les agents qui y sont rattachés, et le besoin en enseignants qui s’en déduit (déficit ou pléthore)."
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_12rem]">
        <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une école (nom, localité)…" />
        {central ? (
          <Liste value={departement} onChange={(e) => {
              setDepartement(e.target.value);
              setPage(1);
            }} vide="Tous les départements" options={refs.departements.map((x) => ({ valeur: x.id, libelle: x.nom }))} />
        ) : (
          <span />
        )}
        <Liste value={cycle} onChange={(e) => {
            setCycle(e.target.value);
            setPage(1);
          }} vide="Tous les cycles" options={Object.entries(CYCLES).map(([k, v]) => ({ valeur: k, libelle: v }))} />
      </div>
      {d.erreur && <Alerte>{d.erreur}</Alerte>}
      <Carte titre={d.donnees ? `Année scolaire ${d.donnees.annee}` : "Écoles"}>
        {!d.donnees ? (
          <Chargement />
        ) : !d.donnees.lignes.length ? (
          <Vide>Aucune école trouvée.</Vide>
        ) : (
          <>
            <p className="-mt-2 mb-3 text-[12px] text-zinc-500">
              {d.donnees.total.toLocaleString("fr-FR")} école{d.donnees.total > 1 ? "s" : ""}, rangées par cycle puis par nom · {TAILLE} par page.
            </p>
            <Tableau>
              <thead>
                <tr>
                  <th>École</th>
                  <th>Cycle</th>
                  <th>Inspection</th>
                  <th>Localité</th>
                  <th className="text-right">Classes</th>
                  <th className="text-right">Salles</th>
                  <th className="text-right">Agents rattachés</th>
                </tr>
              </thead>
              <tbody>
                {d.donnees.lignes.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/ecoles/${l.id}`} className="flex items-center gap-2 font-medium text-marque-700 hover:underline">
                        <School className="size-3.5 text-zinc-400" />
                        {l.nom}
                      </Link>
                    </td>
                    <td>{l.cycle ? <Badge ton="gris">{CYCLES[l.cycle] ?? l.cycle}</Badge> : "—"}</td>
                    <td className="text-[12px] text-zinc-600">{l.inspection ?? "—"}</td>
                    <td className="text-[12px] text-zinc-600">{[l.localite, l.departement].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="text-right tabular-nums">{l.classes || <span className="text-zinc-400">0</span>}</td>
                    <td className="text-right tabular-nums">{l.salles || <span className="text-zinc-400">0</span>}</td>
                    <td className="text-right tabular-nums">{l.agents || <span className="text-zinc-400">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            <Pagination
              page={d.donnees.page}
              pages={d.donnees.pages}
              aller={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        )}
      </Carte>
    </div>
  );
}
