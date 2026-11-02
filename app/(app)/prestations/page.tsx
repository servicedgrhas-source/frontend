"use client";

import { ArrowRight, Clock3, FilePlus2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alerte, Badge, Bouton, Chargement, EnTete, Liste, Saisie, Segments, Vide } from "@/components/ui";
import { qs, useApi } from "@/lib/api";
import { ETAT_PRESTATION, type DefinitionPrestation, type EtatPrestation } from "@/lib/prestations";

type Onglet = "aTraiter" | "aSuivre" | "toutes";

interface Ligne {
  id: string;
  numero: string;
  type: string;
  libelle: string;
  nomComplet: string;
  lieuService: string | null;
  departement: string | null;
  objet: string;
  canal: string;
  etat: EtatPrestation;
  etape: { sigle: string; nom: string } | null;
  rang: number | null;
  etapes: number;
  depuis: number | null;
  creeLe: string;
}

interface Reponse {
  onglet: Onglet;
  compte: Record<Onglet, number>;
  lignes: Ligne[];
}

const ONGLETS: { valeur: Onglet; libelle: string; aide: string }[] = [
  { valeur: "aTraiter", libelle: "À traiter", aide: "Le dossier est chez vous : c’est à vous de viser et de donner votre avis (ou de décider)." },
  { valeur: "aSuivre", libelle: "À suivre", aide: "Le dossier est en route ailleurs dans le circuit : vous le suivez, sans rien à faire pour l’instant." },
  { valeur: "toutes", libelle: "Toutes", aide: "Toutes les demandes que vous pouvez voir, y compris celles déjà décidées." },
];

/**
 * Demandes de prestations (module à part des mutations) : ce qui attend un avis du compte, ce qu'il
 * suit, et toutes les demandes de son périmètre, avec la position de chacune dans le circuit.
 */
export default function Prestations() {
  const [onglet, setOnglet] = useState<Onglet>("aTraiter");
  const [type, setType] = useState("");
  const [etat, setEtat] = useState("");
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setRecherche(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const catalogue = useApi<DefinitionPrestation[]>("/demandes-prestation/catalogue");
  const r = useApi<Reponse>(`/demandes-prestation${qs({ onglet, type, etat: onglet === "toutes" ? etat : "", recherche })}`);
  const d = r.donnees;
  const aide = ONGLETS.find((o) => o.valeur === onglet)!.aide;

  return (
    <div className="space-y-5">
      <EnTete
        titre="Demandes de prestations"
        sousTitre="Affectations, nominations… : chaque demande suit le circuit du formulaire de la DGRHAS. Chaque niveau vise et donne un avis motivé, favorable ou non, et le dossier monte toujours jusqu’à la décision. Les mutations ont leur propre module."
        actions={
          <Link href="/demandes/nouvelle">
            <Bouton variante="principal">
              <FilePlus2 /> Déposer une demande
            </Bouton>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segments
          valeur={onglet}
          changer={setOnglet}
          options={ONGLETS.map((o) => ({
            valeur: o.valeur,
            libelle: (
              <span className="flex items-center gap-1.5">
                {o.libelle}
                {d && <span className={`rounded-full px-1.5 text-[11px] ${o.valeur === onglet ? "bg-white/20" : o.valeur === "aTraiter" && d.compte.aTraiter ? "bg-or-400 text-zinc-900" : "bg-zinc-100"}`}>{d.compte[o.valeur]}</span>}
              </span>
            ),
          }))}
        />
        <span className="text-[12px] text-zinc-500">{aide}</span>
      </div>

      <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-doux md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-zinc-400" />
          <Saisie className="w-full pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou n° (P-12)…" aria-label="Recherche" />
        </div>
        <Liste aria-label="Démarche" value={type} onChange={(e) => setType(e.target.value)} vide="Toutes les démarches" options={(catalogue.donnees ?? []).map((p) => ({ valeur: p.code, libelle: p.libelle }))} />
        {onglet === "toutes" && (
          <Liste
            aria-label="État"
            value={etat}
            onChange={(e) => setEtat(e.target.value)}
            vide="Tous les états"
            options={(Object.keys(ETAT_PRESTATION) as EtatPrestation[]).map((k) => ({ valeur: k, libelle: ETAT_PRESTATION[k].libelle }))}
          />
        )}
      </div>

      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !d ? (
        <Chargement />
      ) : !d.lignes.length ? (
        <Vide>
          {onglet === "aTraiter"
            ? "Rien à traiter : aucune demande de prestation n’attend votre avis."
            : onglet === "aSuivre"
              ? "Aucune demande en route ailleurs dans votre circuit."
              : "Aucune demande pour ces filtres."}
        </Vide>
      ) : (
        <ul className="space-y-2">
          {d.lignes.map((l) => (
            <li key={l.id}>
              <Link href={`/prestations/${l.id}`} className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-doux transition hover:ring-1 hover:ring-marque-200">
                <span className="w-14 shrink-0 text-[13px] font-semibold text-zinc-500 tabular-nums">{l.numero}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{l.nomComplet}</span>
                  <span className="block truncate text-[12px] text-zinc-500">
                    {l.libelle}
                    {l.lieuService ? ` · ${l.lieuService}` : l.departement ? ` · ${l.departement}` : ""}
                    {l.canal === "PORTAIL" ? " · déposée sur le portail" : ""}
                  </span>
                </span>
                <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  {l.etat === "EN_COURS" && l.etape ? (
                    <span className="flex items-center gap-1.5 text-[12px]">
                      <span className="text-zinc-500">
                        Chez <strong className="text-encre">{l.etape.sigle}</strong>
                      </span>
                      <span className="text-zinc-400">
                        ({(l.rang ?? 0) + 1}/{l.etapes})
                      </span>
                    </span>
                  ) : (
                    <Badge ton={ETAT_PRESTATION[l.etat].ton}>{ETAT_PRESTATION[l.etat].libelle}</Badge>
                  )}
                  {l.etat === "EN_COURS" && l.depuis !== null && (
                    <span className={`flex items-center gap-1 text-[11px] ${l.depuis > 7 ? "font-medium text-rouge-600" : "text-zinc-400"}`}>
                      <Clock3 className="size-3" /> {l.depuis === 0 ? "arrivée aujourd’hui" : `depuis ${l.depuis} jour${l.depuis > 1 ? "s" : ""}`}
                      {l.depuis > 7 && " · en retard"}
                    </span>
                  )}
                </span>
                <ArrowRight className="size-4 shrink-0 text-zinc-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
