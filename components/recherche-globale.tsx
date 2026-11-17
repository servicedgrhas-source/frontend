"use client";

import { ArrowLeftRight, ArrowRight, FileText, HandHeart, Search, User, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FicheVolontaire } from "@/components/enrolement/volontaires";
import { FicheDossier } from "@/components/fiche-dossier";
import { Aide } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { useSession } from "@/components/session";
import { dateCourte, STATUT_NOTE } from "@/lib/libelles";

interface Dossiers {
  dossiers: { id: string; nomComplet: string; dateNaissance: string | null; diplome: string | null; departement: string | null; quota: number | string | null; etape: string; texte: string | null; trouvePar: "nom" | "texte" }[];
  mutations: { id: string; nomComplet: string; numero: number; motif: string; instruction: string | null; retiree: boolean }[];
  notes: { id: string; module: string; numero: string | null; statut: string; typeNote: string }[];
}
interface Personnel {
  total: number;
  lignes: { id: number; nomComplet: string; statut: string; dateNaissance: string | null; matricule: string | null; structureNom: string | null }[];
}
interface Registre {
  total: number;
  lignes: { id: string; nomComplet: string; population: string; statut: string; dateNaissance: string | null; etablissement: string | null; departement: string | null }[];
}

/** Une source de la recherche : rien (pas encore), ses résultats, ou « pas accessible » (droits, erreur). */
type Source<T> = { q: string; d: T | null } | null;

const STATUTS: Record<string, string> = { FONCTIONNAIRE: "Fonctionnaire", CONTRACTUEL: "Contractuel", VOLONTAIRE: "Volontaire", COMMUNAUTAIRE: "Communautaire" };
const nf = new Intl.NumberFormat("fr-FR");

/** Le squelette animé d'une liste de résultats, le temps que la recherche réponde. */
function Squelette({ n = 3 }: { n?: number }) {
  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100" aria-label="Recherche en cours">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="size-4 shrink-0 animate-pulse rounded-full bg-zinc-200" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3 animate-pulse rounded bg-zinc-200" style={{ width: `${55 - i * 10}%` }} />
            <span className="block h-2.5 animate-pulse rounded bg-zinc-100" style={{ width: `${75 - i * 8}%` }} />
          </span>
          <span className="h-4 w-16 shrink-0 animate-pulse rounded-full bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}

function Titre({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[11px] font-semibold text-zinc-400 uppercase">{children}</div>;
}

/**
 * Recherche dans tout le système : la base du personnel, le registre des volontaires et des
 * communautaires, les recrutés (dossiers envoyés à la FP), les demandes de mutation, les notes de
 * service. Les sources sont interrogées en même temps et s'affichent dès qu'elles répondent ; une
 * source que le compte ne peut pas ouvrir n'apparaît pas.
 */
export function RechercheGlobale() {
  const { refs } = useSession();
  const [texte, setTexte] = useState("");
  // Résultats rangés avec le texte cherché : on n'affiche que ceux du texte actuel
  const [dossiers, setDossiers] = useState<Source<Dossiers>>(null);
  const [personnel, setPersonnel] = useState<Source<Personnel>>(null);
  const [registre, setRegistre] = useState<Source<Registre>>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [volontaire, setVolontaire] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  const t = texte.trim();
  const actuel = <T,>(s: Source<T>) => (s && s.q === t ? s : null);
  const d = actuel(dossiers);
  const p = actuel(personnel);
  const v = actuel(registre);

  useEffect(() => {
    if (t.length < 2) return;
    const minuterie = setTimeout(() => {
      const lancer = <T,>(url: string, ranger: (s: Source<T>) => void) =>
        api
          .get<T>(url)
          .then((x) => ranger({ q: t, d: x }))
          .catch(() => ranger({ q: t, d: null }));
      lancer<Personnel>(`/recensement/agents/recherche${qs({ q: t })}`, setPersonnel);
      lancer<Registre>(`/enrolement/volontaires/recherche${qs({ q: t })}`, setRegistre);
      lancer<Dossiers>(`/dossiers/recherche${qs({ q: t })}`, setDossiers);
    }, 250);
    return () => clearTimeout(minuterie);
  }, [t]);

  const enCours = t.length >= 2 && (!d || !p || !v);
  const rien =
    t.length >= 2 &&
    !enCours &&
    !p?.d?.lignes.length &&
    !v?.d?.lignes.length &&
    !d?.d?.dossiers.length &&
    !d?.d?.mutations.length &&
    !d?.d?.notes.length;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-doux">
      <div className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold">
        Retrouver un dossier
        <Aide>
          Tapez un <strong>nom</strong> (le nom et les prénoms dans n’importe quel ordre, avec ou sans accents), un <strong>matricule</strong>, un <strong>n° de fiche</strong>, un{" "}
          <strong>n° d’arrêté ou de décret</strong>, ou un <strong>n° de note de service</strong>. La recherche regarde la base du personnel, le registre des volontaires et des communautaires,
          les recrutés, les demandes de mutation et les notes de service.
        </Aide>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" />
        <input
          ref={champ}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Nom et prénoms, matricule, n° de texte (ex. 6758) ou n° de note…"
          className="w-full rounded-2xl bg-zinc-100/80 py-3.5 pr-11 pl-12 text-[15px] outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-4 focus:ring-marque-100"
        />
        {texte && (
          <button
            type="button"
            title="Effacer"
            onClick={() => {
              setTexte("");
              champ.current?.focus();
            }}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-200"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {t.length >= 2 && (
        <div className="mt-3 space-y-4">
          {rien && <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-500">Rien trouvé. Vérifiez l’orthographe, ou cherchez avec un seul mot (le nom de famille, par exemple).</div>}

          {/* Base du personnel */}
          {!p ? (
            <div>
              <Titre>Base du personnel</Titre>
              <Squelette />
            </div>
          ) : (
            !!p.d?.lignes.length && (
              <div>
                <Titre>Base du personnel · {nf.format(p.d.total)}</Titre>
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                  {p.d.lignes.slice(0, 6).map((x) => (
                    <li key={x.id}>
                      <Link href={`/personnel/agents/${x.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-marque-50/60">
                        <UserRound className="size-4 shrink-0 text-zinc-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium">{x.nomComplet}</span>
                          <span className="block text-[11px] text-zinc-400">
                            {[x.dateNaissance && `Né(e) le ${dateCourte(x.dateNaissance)}`, x.matricule && `matricule ${x.matricule}`, x.structureNom].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">{STATUTS[x.statut] ?? x.statut}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {p.d.total > 6 && (
                  <Link href={`/personnel/agents${qs({ recherche: t })}`} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-marque-700 hover:underline">
                    Voir les {nf.format(p.d.total)} fiches dans la base du personnel <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>
            )
          )}

          {/* Registre des volontaires et des communautaires */}
          {!v ? (
            <div>
              <Titre>Volontaires et communautaires</Titre>
              <Squelette n={2} />
            </div>
          ) : (
            !!v.d?.lignes.length && (
              <div>
                <Titre>Volontaires et communautaires · {nf.format(v.d.total)}</Titre>
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                  {v.d.lignes.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => setVolontaire(x.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-marque-50/60">
                        <HandHeart className="size-4 shrink-0 text-zinc-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium">{x.nomComplet}</span>
                          <span className="block text-[11px] text-zinc-400">
                            {[x.dateNaissance && `Né(e) le ${dateCourte(x.dateNaissance)}`, x.etablissement, x.departement].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                          {STATUTS[x.population] ?? x.population}
                          {x.statut === "SORTI" ? " · sorti" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {/* Recrutés, mutations, notes */}
          {!d ? (
            <div>
              <Titre>Recrutés, mutations et notes</Titre>
              <Squelette n={2} />
            </div>
          ) : (
            <>
              {!!d.d?.dossiers.length && (
                <div>
                  <Titre>Recrutés (base des recrutés)</Titre>
                  <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                    {d.d.dossiers.map((x) => (
                      <li key={x.id}>
                        <button type="button" onClick={() => setOuvert(x.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-marque-50/60">
                          <User className="size-4 shrink-0 text-zinc-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium">{x.nomComplet}</span>
                            <span className="block text-[11px] text-zinc-400">
                              {x.dateNaissance ? `Né(e) le ${dateCourte(x.dateNaissance)} · ` : ""}
                              {x.diplome ?? "—"} · {x.departement ?? "département ?"} · {x.quota === "Autres" ? "quota « Autres »" : `quota ${x.quota ?? "?"}`}
                              {x.texte ? ` · ${x.texte}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">{x.etape}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!d.d?.mutations.length && (
                <div>
                  <Titre>Demandes de mutation</Titre>
                  <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                    {d.d.mutations.map((m) => (
                      <li key={m.id}>
                        <Link href={`/mutation/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-marque-50/60">
                          <ArrowLeftRight className="size-4 shrink-0 text-zinc-400" />
                          <span className="min-w-0 flex-1">
                            {m.nomComplet} <span className="text-[11px] text-zinc-400">· demande n° {m.numero}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-500">{m.retiree ? "retirée" : m.instruction === "ACCORDEE" ? "accordée" : m.instruction === "REFUSEE" ? "refusée" : "en cours"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!d.d?.notes.length && (
                <div>
                  <Titre>Notes de service</Titre>
                  <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl ring-1 ring-zinc-100">
                    {d.d.notes.map((n) => (
                      <li key={n.id}>
                        <Link href={`/note/${n.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-marque-50/60">
                          <FileText className="size-4 shrink-0 text-zinc-400" />
                          <span className="flex-1">
                            Note n° {n.numero} · {n.module === "AFFECTATION" ? "affectation" : "mutation"}
                            {refs.typesNote.find((x) => x.code === n.typeNote) && ` · ${refs.typesNote.find((x) => x.code === n.typeNote)!.libelle}`}
                          </span>
                          <span className="text-[11px] text-zinc-500">{STATUT_NOTE[n.statut as keyof typeof STATUT_NOTE]?.libelle}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {ouvert && <FicheDossier id={ouvert} fermer={() => setOuvert(null)} />}
      {volontaire && <FicheVolontaire id={volontaire} fermer={() => setVolontaire(null)} />}
    </section>
  );
}
