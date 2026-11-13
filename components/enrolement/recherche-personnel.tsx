"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Bouton, Chargement, Saisie } from "@/components/ui";
import { api, qs } from "@/lib/api";

/** Ce que la base du personnel sait d'une personne, et sa situation (DG, 13/11/2026). */
export interface CandidatPriseEnCharge {
  agentRecenseId: number;
  numeroFiche: string | null;
  statut: string;
  matricule: string | null;
  dejaRelie: boolean;
  ton: "rouge" | "orange" | "vert";
  situation: { ton: "rouge" | "orange" | "vert"; titre: string; detail?: string }[];
  registreId: string | null;
  valeurs: {
    nomComplet: string;
    dateNaissance: string | null;
    lieuNaissance: string | null;
    telephone: string | null;
    diplome: string | null;
    specialite: string | null;
    categorie: string | null;
    cycleBrut: string | null;
    departementId: number | null;
    departement: string | null;
    etablissement: string | null;
    datePriseService: string | null;
  };
}

const TONS = {
  rouge: { boite: "bg-rouge-100 text-rouge-700 ring-rouge-300", Icone: AlertOctagon },
  orange: { boite: "bg-or-100 text-or-800 ring-or-300", Icone: AlertTriangle },
  vert: { boite: "bg-marque-50 text-marque-800 ring-marque-200", Icone: CheckCircle2 },
} as const;

/** La situation d'une personne, en gros et en couleur : on sait ce qu'on fait avant de la prendre en charge. */
export function SituationPersonne({ c }: { c: CandidatPriseEnCharge }) {
  return (
    <div className="space-y-1.5">
      {c.situation.map((s, i) => {
        const { boite, Icone } = TONS[s.ton];
        return (
          <div key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 ring-1 ${boite}`}>
            <Icone className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <div className="text-[13px] font-extrabold tracking-wide">{s.titre}</div>
              {s.detail && <div className="text-[12px]">{s.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const jour = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "date ?");

/**
 * Chercher dans la base du personnel une personne à prendre en charge (nom, téléphone ou matricule) :
 * ce qu'elle sait remplit la fiche du registre ; sa situation (déjà fonctionnaire, déjà au registre,
 * pas prise en charge…) est montrée en gros avant de choisir.
 */
export function RecherchePersonnel({
  population,
  agentInitial,
  choisir,
  ouvrirRegistre,
}: {
  population: string;
  /** Fiche du personnel d'où l'on vient (« Prendre en charge dans la bourse »). */
  agentInitial?: number | null;
  choisir: (c: CandidatPriseEnCharge, forcerFonctionnaire: boolean) => void;
  ouvrirRegistre: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<CandidatPriseEnCharge[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Fonctionnaire ou contractuel : on coche « je sais » avant de pouvoir l'utiliser
  const [conscients, setConscients] = useState<Set<number>>(new Set());

  // Assez pour chercher : 3 lettres, ou 6 chiffres (téléphone, matricule), ou la fiche d'où l'on vient
  const assez = !!agentInitial || q.replace(/[^a-zA-ZÀ-ÿ]/g, "").length >= 3 || q.replace(/\D/g, "").length >= 6;
  useEffect(() => {
    if (!assez) return;
    let actif = true;
    const t = setTimeout(
      async () => {
        setEnvoi(true);
        setErreur(null);
        try {
          const r = await api.get<CandidatPriseEnCharge[]>(`/enrolement/volontaires/candidats-prise-en-charge${qs({ q, population, agent: !q && agentInitial ? agentInitial : undefined })}`);
          if (actif) setResultats(r);
        } catch (x) {
          if (actif) setErreur((x as Error).message);
        } finally {
          if (actif) setEnvoi(false);
        }
      },
      agentInitial && !q ? 0 : 400,
    );
    return () => {
      actif = false;
      clearTimeout(t);
    };
  }, [q, population, agentInitial, assez]);
  const affiches = assez ? resultats : null;

  return (
    <div className="space-y-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <div className="flex items-center gap-2">
        <Search className="size-4 text-zinc-400" aria-hidden />
        <Saisie className="flex-1" autoFocus value={q} onChange={(x) => setQ(x.target.value)} placeholder="Chercher dans la base du personnel : nom, téléphone ou matricule…" />
      </div>
      <p className="text-[12px] text-zinc-500">
        La fiche se remplit avec ce que la base du personnel sait. Regardez bien la <strong>situation</strong> de la personne (en couleur) avant de la prendre en charge.
      </p>
      {erreur && <p className="text-[12px] text-rouge-600">{erreur}</p>}
      {envoi && !affiches && <Chargement texte="Recherche…" />}
      {affiches && !affiches.length && <p className="text-[12px] text-zinc-500">Personne dans la base du personnel avec « {q} ». Vous pouvez remplir la fiche à la main.</p>}
      {affiches && affiches.length > 0 && (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {affiches.map((c) => {
            const rouge = c.ton === "rouge";
            const relie = c.dejaRelie || !!c.registreId;
            return (
              <li key={c.agentRecenseId} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="font-semibold text-encre">{c.valeurs.nomComplet}</span>{" "}
                    <span className="text-[12px] text-zinc-500">
                      · né(e) le {jour(c.valeurs.dateNaissance)}
                      {c.valeurs.departement ? ` · ${c.valeurs.departement}` : ""}
                      {c.valeurs.etablissement ? ` · ${c.valeurs.etablissement}` : ""}
                      {c.valeurs.telephone ? ` · tél. ${c.valeurs.telephone}` : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    fiche du personnel {c.numeroFiche ?? `n° ${c.agentRecenseId}`}
                    {c.matricule ? ` · matricule ${c.matricule}` : ""}
                  </span>
                </div>
                <SituationPersonne c={c} />
                <div className="flex flex-wrap items-center gap-2">
                  {c.registreId && (
                    <Bouton onClick={() => ouvrirRegistre(c.registreId!)}>Ouvrir sa fiche du registre</Bouton>
                  )}
                  {rouge && (
                    <label className="flex items-center gap-2 text-[12px] font-medium text-rouge-700">
                      <input
                        type="checkbox"
                        className="size-4 accent-rouge-600"
                        checked={conscients.has(c.agentRecenseId)}
                        onChange={() =>
                          setConscients((s) => {
                            const n = new Set(s);
                            if (n.has(c.agentRecenseId)) n.delete(c.agentRecenseId);
                            else n.add(c.agentRecenseId);
                            return n;
                          })
                        }
                      />
                      Je sais : je le (la) prends en charge quand même
                    </label>
                  )}
                  {!c.dejaRelie && (
                    <Bouton
                      variante={c.ton === "vert" ? "principal" : undefined}
                      disabled={rouge && !conscients.has(c.agentRecenseId)}
                      onClick={() => choisir(c, rouge)}
                      title={relie ? "Une fiche du même nom est déjà au registre : vérifiez que ce n’est pas la même personne" : undefined}
                    >
                      Utiliser ces informations
                    </Bouton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
