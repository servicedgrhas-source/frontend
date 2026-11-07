"use client";

import { CheckCircle2, Search, UserCheck, UserRound, Users, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alerte, Badge, Bouton, Modale } from "./ui";
import { api } from "@/lib/api";
import type { AgentTrouve } from "./recherche-agent-mutation";

/**
 * « Compléter depuis la base du personnel » (DG, 06/11/2026 ; onglets le 07/11/2026). Le système
 * cherche la fiche de chaque demande et propose de remplir ses cases vides. Trois onglets :
 * - À compléter : fiche sûre (ou choisie) ; on coche les demandes à compléter (toutes par défaut) ;
 * - Plusieurs fiches possibles : on choisit la bonne, la demande passe dans « À compléter » ;
 * - Sans fiche : on cherche la fiche à la main (matricule ou nom), ou on laisse.
 * Rien n'est enregistré avant « Compléter ». La base du personnel n'est jamais modifiée.
 */

interface Demande {
  id: string;
  nom: string;
  matricule: string | null;
  grade?: string | null;
  departement: string | null;
  lieuService?: string | null;
}
interface Completion {
  essai: boolean;
  lues: number;
  avecFiche: number;
  completees: number;
  parChamp: Record<string, number>;
  doute: number;
  sansFiche: number;
  aCompleter: (Demande & { fiche: { id: number; numero: string | null; nom: string }; choisie: boolean; ajouts: { champ: string; valeur: string }[] })[];
  doutes: (Demande & { candidats: { id: number; numero: string | null; nom: string; matricule: string | null; grade: string | null; departement: string | null; lieuService: string | null }[] })[];
  sans: Demande[];
}

type Onglet = "completer" | "doutes" | "sans";

export function CompleterPersonnel({ apres }: { apres: (texte: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [r, setR] = useState<Completion | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("completer");
  // Fiches choisies à la main (doute tranché, recherche) et demandes décochées
  const [choix, setChoix] = useState<Record<string, number>>({});
  const [decochees, setDecochees] = useState<Set<string>>(new Set());
  const [voir, setVoir] = useState(60);

  async function lancer(essai: boolean, c = choix) {
    setOccupe(true);
    setErreur(null);
    try {
      const ids = essai ? undefined : (r?.aCompleter ?? []).filter((x) => x.ajouts.length && !decochees.has(x.id)).map((x) => x.id);
      const x = await api.post<Completion>(`/mutations/completer-personnel?essai=${essai ? 1 : 0}`, { choix: c, ids });
      if (essai) setR(x);
      else {
        setOuvert(false);
        setR(null);
        setChoix({});
        setDecochees(new Set());
        apres(`${x.completees} demande(s) complétée(s) depuis la base du personnel.`);
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  /** Une fiche choisie : la demande passe dans « À compléter » (l'essai est refait). */
  function choisir(demandeId: string, ficheId: number) {
    const c = { ...choix, [demandeId]: ficheId };
    setChoix(c);
    void lancer(true, c);
  }

  // Avec quelque chose à remplir ; les fiches choisies sans rien à remplir restent visibles (grisées)
  const aCompleter = (r?.aCompleter ?? []).filter((x) => x.ajouts.length);
  const lignesCompleter = r?.aCompleter ?? [];
  const cochees = aCompleter.filter((x) => !decochees.has(x.id));
  const toutesCochees = aCompleter.length > 0 && cochees.length === aCompleter.length;
  const basculer = (id: string) =>
    setDecochees((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <Bouton
        variante="secondaire"
        onClick={() => {
          setOuvert(true);
          setOnglet("completer");
          void lancer(true);
        }}
      >
        <CheckCircle2 className="size-4" aria-hidden /> Compléter depuis la base du personnel
      </Bouton>
      <Modale titre="Compléter les demandes depuis la base du personnel" ouverte={ouvert} fermer={() => setOuvert(false)} ecran>
        <p className="mb-3 text-[13px] leading-relaxed text-zinc-600">
          Le système cherche la fiche de chaque demande dans la base du personnel et remplit seulement les <strong>cases vides</strong> de la demande (matricule, grade et
          échelon, département d’origine, lieu de service, spécialité, date de prise de service). Rien n’est enregistré avant « Compléter ». La base du personnel n’est
          pas modifiée ; les demandes déjà dans une note ne bougent pas.
        </p>
        {erreur && <Alerte>{erreur}</Alerte>}
        {!r ? (
          <p className="py-10 text-center text-sm text-zinc-500">Recherche dans la base du personnel…</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <OngletBouton actif={onglet === "completer"} icone={<UserCheck className="size-4" />} n={lignesCompleter.length} texte="À compléter" choisir={() => setOnglet("completer")} />
              <OngletBouton actif={onglet === "doutes"} icone={<Users className="size-4" />} n={r.doutes.length} texte="Plusieurs fiches possibles" choisir={() => setOnglet("doutes")} />
              <OngletBouton actif={onglet === "sans"} icone={<UserX className="size-4" />} n={r.sans.length} texte="Sans fiche" choisir={() => setOnglet("sans")} />
              {occupe && <span className="ml-auto self-center text-[12px] text-marque-700">Mise à jour…</span>}
            </div>
            <div className="h-[52vh] overflow-y-auto rounded-2xl ring-1 ring-zinc-200">
              {onglet === "completer" && (
                <>
                  <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-2.5 text-[12.5px] backdrop-blur">
                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input type="checkbox" className="size-4 accent-marque-600" checked={toutesCochees} onChange={() => setDecochees(toutesCochees ? new Set(aCompleter.map((x) => x.id)) : new Set())} />
                      Tout cocher
                    </label>
                    <span className="text-zinc-500">
                      {cochees.length} cochée(s) sur {aCompleter.length} · décochez celles à laisser telles quelles
                    </span>
                  </div>
                  {lignesCompleter.length ? (
                    <ul className="divide-y divide-zinc-100">
                      {lignesCompleter.slice(0, voir).map((x) => (
                        <li key={x.id} className={`flex gap-3 px-4 py-2.5 ${decochees.has(x.id) || !x.ajouts.length ? "opacity-50" : ""}`}>
                          <input type="checkbox" className="mt-1 size-4 shrink-0 accent-marque-600" disabled={!x.ajouts.length} checked={!!x.ajouts.length && !decochees.has(x.id)} onChange={() => basculer(x.id)} aria-label={`Compléter ${x.nom}`} />
                          <div className="grid min-w-0 flex-1 gap-1 text-[13px] md:grid-cols-[1fr_1fr_1.2fr]">
                            <div>
                              <div className="font-semibold text-encre">{x.nom}</div>
                              <div className="text-[11.5px] text-zinc-500">{[x.matricule ?? "matricule ?", x.departement].filter(Boolean).join(" · ")}</div>
                            </div>
                            <div className="text-zinc-600">
                              <Link href={`/personnel/agents/${x.fiche.id}`} target="_blank" className="hover:underline">
                                {x.fiche.nom}
                              </Link>
                              {x.choisie && (
                                <span className="ml-1.5">
                                  <Badge ton="bleu">fiche choisie</Badge>
                                </span>
                              )}
                            </div>
                            <div className="text-zinc-700">
                              {!x.ajouts.length && <span className="text-zinc-500">Fiche reliée : rien à compléter, la demande a déjà ces informations.</span>}
                              {x.ajouts.map((a) => (
                                <div key={a.champ}>
                                  <span className="text-zinc-500">{a.champ} :</span> {a.valeur}
                                </div>
                              ))}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-6 text-center text-zinc-500">Rien à compléter : les demandes reliées à une fiche n’ont pas de case vide que la fiche connaît.</p>
                  )}
                  {lignesCompleter.length > voir && <PlusDeLignes plus={() => setVoir((v) => v + 100)} />}
                </>
              )}
              {onglet === "doutes" && (
                <>
                  <p className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-4 py-2.5 text-[12.5px] text-zinc-600 backdrop-blur">
                    Plusieurs fiches du personnel pourraient être cette personne. Choisissez la bonne (« C’est elle ») : la demande passe dans « À compléter ». Sinon, laissez.
                  </p>
                  {r.doutes.length ? (
                    <ul className="divide-y divide-zinc-100">
                      {r.doutes.slice(0, voir).map((d) => (
                        <li key={d.id} className="px-4 py-3">
                          <LigneDemande d={d} />
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            {d.candidats.map((c) => (
                              <div key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-zinc-200">
                                <UserRound className="size-5 shrink-0 text-zinc-400" aria-hidden />
                                <div className="min-w-0 flex-1 text-[12.5px]">
                                  <Link href={`/personnel/agents/${c.id}`} target="_blank" className="font-semibold text-encre hover:underline">
                                    {c.nom}
                                  </Link>
                                  <div className="text-zinc-500">{[c.matricule ?? "matricule ?", c.grade, c.lieuService, c.departement].filter(Boolean).join(" · ")}</div>
                                </div>
                                <Bouton variante="principal" disabled={occupe} onClick={() => choisir(d.id, c.id)}>
                                  C’est elle
                                </Bouton>
                              </div>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-6 text-center text-zinc-500">Aucune demande en doute.</p>
                  )}
                  {r.doutes.length > voir && <PlusDeLignes plus={() => setVoir((v) => v + 100)} />}
                </>
              )}
              {onglet === "sans" && (
                <>
                  <p className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-4 py-2.5 text-[12.5px] text-zinc-600 backdrop-blur">
                    Aucune fiche trouvée automatiquement. Cherchez-la par son matricule ou son nom (le nom est peut-être écrit autrement), ou laissez : ce n’est pas bloquant.
                  </p>
                  {r.sans.length ? (
                    <ul className="divide-y divide-zinc-100">
                      {r.sans.slice(0, voir).map((d) => (
                        <li key={d.id} className="px-4 py-3">
                          <LigneDemande d={d} />
                          <ChercherFiche nom={d.nom} matricule={d.matricule} occupe={occupe} choisir={(a) => choisir(d.id, a.id)} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-6 text-center text-zinc-500">Toutes les demandes ont une fiche.</p>
                  )}
                  {r.sans.length > voir && <PlusDeLignes plus={() => setVoir((v) => v + 100)} />}
                </>
              )}
            </div>
            {Object.keys(r.parChamp).length > 0 && (
              <p className="mt-2 text-[12px] text-zinc-500">
                Cases qui seront remplies :{" "}
                {Object.entries(r.parChamp)
                  .map(([c, n]) => `${c} (${n})`)
                  .join(", ")}
                .
              </p>
            )}
          </>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Bouton onClick={() => setOuvert(false)}>Fermer</Bouton>
          <Bouton variante="principal" disabled={occupe || !cochees.length} onClick={() => lancer(false)}>
            Compléter {cochees.length ? `${cochees.length} demande(s)` : ""}
          </Bouton>
        </div>
      </Modale>
    </>
  );
}

function OngletBouton({ actif, icone, n, texte, choisir }: { actif: boolean; icone: React.ReactNode; n: number; texte: string; choisir: () => void }) {
  return (
    <button
      type="button"
      onClick={choisir}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium ring-1 transition ${actif ? "bg-encre text-white ring-encre" : "bg-white text-zinc-700 ring-zinc-200 hover:ring-zinc-300"}`}
    >
      {icone}
      {texte}
      <span className={`rounded-full px-1.5 text-[11px] font-semibold ${actif ? "bg-white/20" : "bg-zinc-100"}`}>{n}</span>
    </button>
  );
}

function LigneDemande({ d }: { d: Demande }) {
  return (
    <div>
      <span className="font-semibold text-encre">{d.nom}</span>
      <span className="ml-2 text-[12px] text-zinc-500">{["la demande :", d.matricule ?? "matricule ?", d.grade, d.lieuService, d.departement].filter(Boolean).join(" · ")}</span>
    </div>
  );
}

function PlusDeLignes({ plus }: { plus: () => void }) {
  return (
    <div className="p-3 text-center">
      <button type="button" className="text-[12px] font-semibold text-marque-700" onClick={plus}>
        Voir 100 de plus
      </button>
    </div>
  );
}

/** Chercher la fiche d'une demande à la main (matricule ou nom), comme dans la saisie. */
function ChercherFiche({ nom, matricule, occupe, choisir }: { nom: string; matricule: string | null; occupe: boolean; choisir: (a: AgentTrouve) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState(matricule ?? nom);
  const [res, setRes] = useState<AgentTrouve[] | null>(null);
  useEffect(() => {
    if (!ouvert || q.trim().length < 3) return;
    const t = setTimeout(() => {
      api
        .get<AgentTrouve[]>(`/mutations/agents?q=${encodeURIComponent(q.trim())}`)
        .then(setRes)
        .catch(() => setRes([]));
    }, 350);
    return () => clearTimeout(t);
  }, [q, ouvert]);
  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-marque-700 hover:underline">
        <Search className="size-3.5" aria-hidden /> Chercher sa fiche
      </button>
    );
  return (
    <div className="mt-2 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-full rounded-lg bg-white pr-3 pl-9 text-[13px] ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-marque-300"
          placeholder="Matricule, ou nom dans n’importe quel ordre"
        />
      </div>
      {res && (
        <ul className="mt-2 space-y-1">
          {res.length ? (
            res.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200">
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <div className="font-semibold text-encre">{a.nomComplet}</div>
                  <div className="text-zinc-500">{[a.matricule ?? "matricule ?", a.gradeBrut, a.lieuService, a.departement].filter(Boolean).join(" · ")}</div>
                </div>
                <Bouton variante="principal" disabled={occupe} onClick={() => choisir(a)}>
                  C’est elle
                </Bouton>
              </li>
            ))
          ) : (
            <li className="text-[12px] text-zinc-500">Aucune fiche : essayez une autre écriture du nom, ou laissez (elle pourra être créée après la note signée).</li>
          )}
        </ul>
      )}
    </div>
  );
}
