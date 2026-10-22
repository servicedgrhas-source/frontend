"use client";

import {
  ArrowRight,
  Award,
  Baby,
  BookOpen,
  Briefcase,
  Check,
  GraduationCap,
  Link2,
  PencilLine,
  Plus,
  RotateCcw,
  School,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, cx, EnTete, Liste, Modale, Pastille, Saisie } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { CYCLES, peut } from "@/lib/libelles";

interface Grade {
  code: string;
  abreviation: string;
  libelle: string;
  categorie: string | null;
  echelle: number | null;
  echelon: number | null;
  indice: number | null;
  diplomes: string[];
}

interface Regle {
  code: string;
  libelle: string;
  cycle: string;
  typeNote: string;
  gradeCode: string | null;
  ecritures: string[];
  agents: number;
}

interface Etat {
  grades: Grade[];
  regles: Regle[];
  nonReconnus: { libelle: string | null; n: number }[];
  notes: { code: string; libelle: string }[];
}

type Bilan = { diplomesChanges: number; notesChangees: number };

const nf = new Intl.NumberFormat("fr-FR");

const ICONES_CYCLE: Record<string, LucideIcon> = {
  PRESCOLAIRE: Baby,
  PRIMAIRE: BookOpen,
  COLLEGE: School,
  LYCEE: GraduationCap,
  ADMINISTRATION: Briefcase,
};

/** Note conseillée pour chaque cycle. */
const NOTE_CONSEILLEE: Record<string, string[]> = {
  PRESCOLAIRE: ["PRESCOLAIRE"],
  PRIMAIRE: ["PRIMAIRE"],
  COLLEGE: ["DEMA", "DECRET_COLLEGE"],
  LYCEE: ["DECRET_LYCEE"],
  ADMINISTRATION: ["PERS_ADM"],
};

function classification(g: Pick<Grade, "categorie" | "echelle" | "echelon">) {
  return `${g.categorie ?? "—"} / ${g.echelle ?? "—"} / ${g.echelon ?? "—"}`;
}

function texteBilan(b: Bilan) {
  if (!b.diplomesChanges && !b.notesChangees) return "Aucun agent n’était concerné.";
  return `${nf.format(b.diplomesChanges)} agent(s) reconnu(s) autrement, ${nf.format(b.notesChangees)} changement(s) de note.`;
}

export default function ReglesEtGrades() {
  const { profil } = useSession();
  const { donnees: e, erreur, recharger } = useApi<Etat>(peut.parametrer(profil.role) ? "/configuration" : null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [assistant, setAssistant] = useState<{ regle: Regle | null; prerempli?: string } | null>(null);
  const [gradeEdite, setGradeEdite] = useState<Grade | "nouveau" | null>(null);
  const [rattacher, setRattacher] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ titre: string; texte: ReactNode; action: () => Promise<void>; libelle: string } | null>(null);

  if (!peut.parametrer(profil.role)) return <Alerte>Accès réservé au DG et à l’administrateur.</Alerte>;
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!e) return <Chargement />;

  const notes = Object.fromEntries(e.notes.map((n) => [n.code, n.libelle]));
  const gradeDe = (code: string | null) => e.grades.find((g) => g.code === code) ?? null;
  const apres = (texte: string) => {
    setMessage({ ton: "vert", texte });
    recharger();
  };
  const echec = (err: unknown) => setMessage({ ton: "rouge", texte: (err as Error).message });
  const nonReconnus = e.nonReconnus.filter((x) => x.libelle);
  const vides = e.nonReconnus.find((x) => !x.libelle)?.n ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/administration" className="text-xs font-medium text-marque-700 hover:underline">
          ← Administration
        </Link>
      </div>
      <EnTete
        titre="Règles des diplômes et grades"
        sousTitre="Le diplôme d’un agent détermine son cycle, sa note de service et son grade. Le grade porte la classification (catégorie, échelle, échelon) imprimée sur les notes."
        actions={
          <>
            <Bouton variante="principal" onClick={() => setAssistant({ regle: null })}>
              <Plus /> Ajouter un diplôme
            </Bouton>
            <Bouton onClick={() => setGradeEdite("nouveau")}>
              <Plus /> Ajouter un grade
            </Bouton>
          </>
        }
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>

      {/* --------------------------- Diplômes non reconnus --------------------------- */}
      {nonReconnus.length > 0 && (
        <Carte
          titre={
            <span className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-or-700" /> Diplômes du fichier Excel que le système ne connaît pas encore
            </span>
          }
        >
          <p className="mb-3 text-[13px] text-zinc-500">
            Ces écritures figurent dans le fichier Excel mais ne correspondent à aucun diplôme. Créez un nouveau diplôme, ou rattachez l’écriture à un
            diplôme existant si c’est le même (par exemple une autre façon d’écrire « BAC »).
          </p>
          <ul className="divide-y divide-zinc-100">
            {nonReconnus.map((x) => (
              <li key={x.libelle} className="flex flex-wrap items-center gap-3 py-2.5">
                <Pastille ton="jaune" taille="sm">
                  <TriangleAlert />
                </Pastille>
                <span className="font-medium">« {x.libelle} »</span>
                <Badge>{x.n} agent(s)</Badge>
                <span className="ml-auto flex gap-2">
                  <Bouton onClick={() => setRattacher(x.libelle!)}>
                    <Link2 /> Rattacher à un diplôme
                  </Bouton>
                  <Bouton variante="principal" onClick={() => setAssistant({ regle: null, prerempli: x.libelle! })}>
                    <Plus /> Créer ce diplôme
                  </Bouton>
                </span>
              </li>
            ))}
          </ul>
          {vides > 0 && <p className="mt-2 text-[11px] text-zinc-400">{vides} agent(s) n’ont aucun diplôme saisi dans le fichier : à corriger fiche par fiche dans « Base des recrutés ».</p>}
        </Carte>
      )}

      {/* ---------------------------------- Diplômes --------------------------------- */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Diplômes ({e.regles.length})</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {e.regles.map((r) => {
            const g = gradeDe(r.gradeCode);
            const Icone = ICONES_CYCLE[r.cycle] ?? Award;
            return (
              <article key={r.code} className="rounded-3xl bg-white p-5 shadow-doux">
                <div className="flex items-start gap-3">
                  <Pastille ton="vert">
                    <Icone />
                  </Pastille>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{r.libelle}</h3>
                      <Badge>{nf.format(r.agents)} agent(s)</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
                      <span className="rounded-lg bg-zinc-100 px-2 py-0.5">{CYCLES[r.cycle] ?? r.cycle}</span>
                      <ArrowRight className="size-3.5 text-zinc-300" />
                      <span className="rounded-lg bg-zinc-100 px-2 py-0.5">Note {notes[r.typeNote] ?? r.typeNote}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px]">
                      <span className="text-[11px] text-zinc-400">Grade donné :</span>
                      {g ? (
                        <span className="rounded-lg bg-marque-50 px-2 py-0.5 font-medium text-marque-700">
                          {g.libelle} ({g.abreviation}) · {classification(g)}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-rouge-100 px-2 py-0.5 text-rouge-600">Aucun grade</span>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-zinc-400">Écrit dans Excel : {r.ecritures.join(", ")}</div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <BoutonIcone libelle="Modifier" onClick={() => setAssistant({ regle: r })}>
                      <PencilLine />
                    </BoutonIcone>
                    <BoutonIcone
                      libelle="Supprimer"
                      ton="rouge"
                      onClick={() =>
                        setConfirmation({
                          titre: `Supprimer le diplôme « ${r.libelle} » ?`,
                          texte: (
                            <>
                              Les <strong>{nf.format(r.agents)} agent(s)</strong> qui ont ce diplôme deviendront « diplôme non reconnu » et ne pourront plus entrer dans une note
                              tant qu’une règle n’est pas recréée. Les notes déjà validées ne changent pas.
                            </>
                          ),
                          libelle: "Supprimer",
                          action: async () => apres(`Diplôme supprimé. ${texteBilan(await api.delete<Bilan>(`/configuration/regles/${r.code}`))}`),
                        })
                      }
                    >
                      <Trash2 />
                    </BoutonIcone>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------- Grades ---------------------------------- */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold">Grades ({e.grades.length})</h2>
        <p className="mb-3 text-[13px] text-zinc-500">Modifier la classification d’un grade met à jour en une fois tous les diplômes qui le donnent.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {e.grades.map((g) => (
            <article key={g.code} className="flex flex-col rounded-3xl bg-white p-5 shadow-doux">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xl font-semibold">{g.abreviation}</div>
                  <div className="text-[12px] text-zinc-500">{g.libelle}</div>
                </div>
                <div className="flex gap-0.5">
                  <BoutonIcone libelle="Modifier" onClick={() => setGradeEdite(g)}>
                    <PencilLine />
                  </BoutonIcone>
                  <BoutonIcone
                    libelle="Supprimer"
                    ton="rouge"
                    onClick={() =>
                      setConfirmation({
                        titre: `Supprimer le grade « ${g.libelle} » ?`,
                        texte: g.diplomes.length ? `Il est utilisé par : ${g.diplomes.join(", ")}. Changez d’abord le grade de ces diplômes.` : "Ce grade n’est utilisé par aucun diplôme.",
                        libelle: "Supprimer",
                        action: async () => {
                          await api.delete(`/configuration/grades/${g.code}`);
                          apres("Grade supprimé.");
                        },
                      })
                    }
                  >
                    <Trash2 />
                  </BoutonIcone>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ["Catégorie", g.categorie],
                  ["Échelle", g.echelle],
                  ["Échelon", g.echelon],
                  ["Indice", g.indice],
                ].map(([l, v]) => (
                  <div key={String(l)} className="rounded-2xl bg-zinc-50 py-2">
                    <div className="text-base font-semibold">{v ?? "—"}</div>
                    <div className="text-[10px] text-zinc-400">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-3 text-[11px] text-zinc-400">
                {g.diplomes.length ? `Donné par : ${g.diplomes.join(", ")}` : "Donné par aucun diplôme"} · contractuel : {g.abreviation.replace(/\.+$/, "")}.C.
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Bouton
          variante="danger"
          onClick={() =>
            setConfirmation({
              titre: "Revenir aux règles d’origine ?",
              texte: "Tous les diplômes et grades reprennent les valeurs installées au départ (vérifiées sur les notes du lot 3). Vos ajouts et modifications seront effacés. Les notes déjà validées ne changent pas.",
              libelle: "Revenir aux règles d’origine",
              action: async () => apres(`Règles d’origine rétablies. ${texteBilan(await api.post<Bilan>("/configuration/reinitialiser"))}`),
            })
          }
        >
          <RotateCcw /> Revenir aux règles d’origine
        </Bouton>
      </div>

      {assistant && (
        <AssistantDiplome
          etat={e}
          regle={assistant.regle}
          prerempli={assistant.prerempli}
          fermer={() => setAssistant(null)}
          apres={(t) => {
            setAssistant(null);
            apres(t);
          }}
          creerGrade={() => setGradeEdite("nouveau")}
        />
      )}
      {gradeEdite && (
        <EditionGrade
          grade={gradeEdite === "nouveau" ? null : gradeEdite}
          fermer={() => setGradeEdite(null)}
          apres={(t) => {
            setGradeEdite(null);
            apres(t);
          }}
        />
      )}
      {rattacher && (
        <Rattacher
          ecriture={rattacher}
          regles={e.regles}
          fermer={() => setRattacher(null)}
          apres={(t) => {
            setRattacher(null);
            apres(t);
          }}
        />
      )}
      {confirmation && (
        <Modale titre={confirmation.titre} ouverte fermer={() => setConfirmation(null)}>
          <p className="text-[13px] leading-relaxed text-zinc-600">{confirmation.texte}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Bouton onClick={() => setConfirmation(null)}>Annuler</Bouton>
            <Bouton
              variante="danger"
              onClick={async () => {
                const c = confirmation;
                setConfirmation(null);
                try {
                  await c.action();
                } catch (err) {
                  echec(err);
                }
              }}
            >
              {confirmation.libelle}
            </Bouton>
          </div>
        </Modale>
      )}
    </div>
  );
}

/* ================================ Assistant ================================ */

const ETAPES = ["Diplôme", "Cycle", "Note", "Grade", "Vérification"];

function AssistantDiplome({
  etat,
  regle,
  prerempli,
  fermer,
  apres,
  creerGrade,
}: {
  etat: Etat;
  regle: Regle | null;
  prerempli?: string;
  fermer: () => void;
  apres: (t: string) => void;
  creerGrade: () => void;
}) {
  const [etape, setEtape] = useState(0);
  const [f, setF] = useState({
    libelle: regle?.libelle ?? prerempli ?? "",
    ecritures: regle?.ecritures ?? (prerempli ? [prerempli] : []),
    cycle: regle?.cycle ?? "",
    typeNote: regle?.typeNote ?? "",
    gradeCode: regle?.gradeCode ?? "",
  });
  const [nouvelleEcriture, setNouvelleEcriture] = useState("");
  const [apercu, setApercu] = useState<{ agents: number; exemples: string[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const grade = etat.grades.find((g) => g.code === f.gradeCode);
  const corps = { ...f, gradeCode: f.gradeCode || null };

  const etapeValide = [f.libelle.trim().length > 0, !!f.cycle, !!f.typeNote, !!f.gradeCode, true][etape];

  async function suivant() {
    setErreur(null);
    if (etape === 3) {
      try {
        setApercu(await api.post(regle ? `/configuration/apercu/${regle.code}` : "/configuration/apercu", corps));
      } catch (e) {
        setErreur((e as Error).message);
        return;
      }
    }
    setEtape((x) => x + 1);
  }

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const b = regle ? await api.put<Bilan>(`/configuration/regles/${regle.code}`, corps) : await api.post<Bilan>("/configuration/regles", corps);
      apres(`Diplôme « ${f.libelle} » enregistré. ${texteBilan(b)}`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  function ajouterEcriture() {
    const v = nouvelleEcriture.trim();
    if (v && !f.ecritures.some((x) => x.toLowerCase() === v.toLowerCase())) setF({ ...f, ecritures: [...f.ecritures, v] });
    setNouvelleEcriture("");
  }

  return (
    <Modale titre={regle ? `Modifier le diplôme « ${regle.libelle} »` : "Ajouter un diplôme"} ouverte fermer={fermer} large>
      {/* Étapes */}
      <ol className="mb-6 flex items-center gap-2">
        {ETAPES.map((nom, i) => (
          <li key={nom} className="flex flex-1 items-center gap-2">
            <span
              className={cx(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i < etape ? "bg-marque-500 text-white" : i === etape ? "bg-nuit text-white" : "bg-zinc-100 text-zinc-400",
              )}
            >
              {i < etape ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cx("hidden text-[12px] sm:inline", i === etape ? "font-semibold" : "text-zinc-400")}>{nom}</span>
            {i < ETAPES.length - 1 && <span className="h-px flex-1 bg-zinc-200" />}
          </li>
        ))}
      </ol>

      {erreur && <div className="mb-4"><Alerte>{erreur}</Alerte></div>}

      {etape === 0 && (
        <div className="space-y-5">
          <Champ libelle="Comment s’appelle ce diplôme ?" aide="Le nom affiché dans le système, par exemple « BAC » ou « Licence ».">
            <Saisie autoFocus value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="Ex. Licence" />
          </Champ>
          <div>
            <div className="text-xs font-medium text-zinc-500">Comment est-il écrit dans les fichiers Excel ?</div>
            <p className="mt-1 mb-2 text-[11px] text-zinc-400">
              Une écriture reconnaît aussi tout ce qui commence par elle : « BAC » reconnaît « BAC A4 », « BAC G2 »… Majuscules, accents et espaces
              ne comptent pas.
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[f.libelle, ...f.ecritures.filter((x) => x.toLowerCase() !== f.libelle.trim().toLowerCase())]
                .filter((x) => x.trim())
                .map((x, i) => (
                  <span key={x + i} className="inline-flex items-center gap-1 rounded-full bg-marque-50 px-3 py-1 text-[12px] text-marque-700">
                    {x}
                    {i > 0 && (
                      <button onClick={() => setF({ ...f, ecritures: f.ecritures.filter((y) => y !== x) })} aria-label={`Retirer ${x}`} className="hover:text-rouge-600">
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                ))}
            </div>
            <div className="flex gap-2">
              <Saisie
                className="flex-1"
                value={nouvelleEcriture}
                onChange={(e) => setNouvelleEcriture(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ajouterEcriture())}
                placeholder="Autre écriture, ex. « Lic. » — puis Entrée"
              />
              <Bouton onClick={ajouterEcriture} disabled={!nouvelleEcriture.trim()}>
                <Plus /> Ajouter
              </Bouton>
            </div>
          </div>
        </div>
      )}

      {etape === 1 && (
        <Choix
          question={`Dans quel cycle enseigne (ou travaille) un agent titulaire du « ${f.libelle} » ?`}
          options={Object.entries(CYCLES).map(([code, libelle]) => ({ code, libelle, icone: ICONES_CYCLE[code] }))}
          valeur={f.cycle}
          choisir={(cycle) => setF({ ...f, cycle, typeNote: NOTE_CONSEILLEE[cycle]?.[0] ?? f.typeNote })}
        />
      )}

      {etape === 2 && (
        <Choix
          question="Dans quelle note de service doit-il apparaître ?"
          options={etat.notes.map((n) => ({ code: n.code, libelle: n.libelle, conseille: NOTE_CONSEILLEE[f.cycle]?.includes(n.code) }))}
          valeur={f.typeNote}
          choisir={(typeNote) => setF({ ...f, typeNote })}
        />
      )}

      {etape === 3 && (
        <div>
          <Choix
            question="Quel grade donne ce diplôme ?"
            options={etat.grades.map((g) => ({ code: g.code, libelle: `${g.libelle} (${g.abreviation})`, detail: `Catégorie ${g.categorie ?? "—"} · Échelle ${g.echelle ?? "—"} · Échelon ${g.echelon ?? "—"}` }))}
            valeur={f.gradeCode}
            choisir={(gradeCode) => setF({ ...f, gradeCode })}
          />
          <button onClick={creerGrade} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-marque-700 hover:underline">
            <Plus className="size-4" /> Le bon grade n’existe pas : créer un nouveau grade
          </button>
        </div>
      )}

      {etape === 4 && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-zinc-50 p-5">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400">Résumé</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
              <strong>{f.libelle}</strong>
              <ArrowRight className="size-3.5 text-zinc-300" /> {CYCLES[f.cycle]}
              <ArrowRight className="size-3.5 text-zinc-300" /> note {etat.notes.find((n) => n.code === f.typeNote)?.libelle}
              <ArrowRight className="size-3.5 text-zinc-300" /> <strong>{grade?.libelle}</strong>
            </div>
            <div className="mt-1 text-[12px] text-zinc-500">Écrit dans Excel : {[f.libelle, ...f.ecritures].filter((x, i, t) => x.trim() && t.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i).join(", ")}</div>
          </div>
          {grade && (
            <div className="rounded-3xl border border-zinc-100 p-5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">Sur la note de service</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  Agent fonctionnaire : <strong>{grade.abreviation}</strong> · {classification(grade)}
                </div>
                <div>
                  Agent contractuel : <strong>{grade.abreviation.replace(/\.+$/, "")}.C.</strong> · {classification(grade)}
                </div>
              </div>
            </div>
          )}
          {apercu && (
            <Alerte ton={apercu.agents ? "jaune" : "bleu"}>
              {apercu.agents ? (
                <>
                  Cette règle concernera <strong>{nf.format(apercu.agents)} agent(s)</strong> pas encore affecté(s)
                  {apercu.exemples.length > 0 && <> (écrits « {apercu.exemples.join(" », « ")} » dans Excel)</>}. Leur grade et leur note seront recalculés.
                </>
              ) : (
                "Aucun agent actuel n’a ce diplôme : la règle servira pour les prochains imports."
              )}{" "}
              Les notes déjà validées par le DG ne changent pas.
            </Alerte>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
        <Bouton onClick={etape === 0 ? fermer : () => setEtape((x) => x - 1)}>{etape === 0 ? "Annuler" : "Précédent"}</Bouton>
        {etape < ETAPES.length - 1 ? (
          <Bouton variante="principal" disabled={!etapeValide} onClick={suivant}>
            Suivant <ArrowRight />
          </Bouton>
        ) : (
          <Bouton variante="principal" disabled={envoi} onClick={enregistrer}>
            <Check /> {envoi ? "Enregistrement…" : "Enregistrer"}
          </Bouton>
        )}
      </div>
    </Modale>
  );
}

function Choix({
  question,
  options,
  valeur,
  choisir,
}: {
  question: string;
  options: { code: string; libelle: string; icone?: LucideIcon; detail?: string; conseille?: boolean }[];
  valeur: string;
  choisir: (code: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 text-sm font-medium">{question}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const Icone = o.icone;
          const choisi = o.code === valeur;
          return (
            <button
              key={o.code}
              onClick={() => choisir(o.code)}
              className={cx(
                "flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors",
                choisi ? "border-marque-500 bg-marque-50" : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50",
              )}
            >
              {Icone && (
                <Pastille ton={choisi ? "vert" : "gris"} taille="sm">
                  <Icone />
                </Pastille>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  {o.libelle}
                  {o.conseille && <Badge ton="vert">Conseillé</Badge>}
                </span>
                {o.detail && <span className="block text-[11px] text-zinc-400">{o.detail}</span>}
              </span>
              {choisi && <Check className="size-4 text-marque-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================== Grade ================================== */

function EditionGrade({ grade, fermer, apres }: { grade: Grade | null; fermer: () => void; apres: (t: string) => void }) {
  const [f, setF] = useState({
    abreviation: grade?.abreviation ?? "",
    libelle: grade?.libelle ?? "",
    categorie: grade?.categorie ?? "II",
    echelle: String(grade?.echelle ?? 1),
    echelon: String(grade?.echelon ?? 1),
    indice: grade?.indice ? String(grade.indice) : "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const nombres = (n: number) => Array.from({ length: n }, (_, i) => ({ valeur: String(i + 1), libelle: String(i + 1) }));

  async function enregistrer() {
    const corps = { ...f, echelle: Number(f.echelle), echelon: Number(f.echelon), indice: f.indice ? Number(f.indice) : null };
    try {
      if (grade) await api.put(`/configuration/grades/${grade.code}`, corps);
      else await api.post("/configuration/grades", corps);
      apres(grade ? `Grade « ${f.libelle} » modifié${grade.diplomes.length ? ` : ${grade.diplomes.join(", ")} mis à jour` : ""}.` : `Grade « ${f.libelle} » créé.`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre={grade ? `Modifier le grade « ${grade.libelle} »` : "Nouveau grade"} ouverte fermer={fermer}>
      <div className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Abréviation (imprimée sur la note)">
            <Saisie value={f.abreviation} onChange={(e) => setF({ ...f, abreviation: e.target.value })} placeholder="Ex. Inst" />
          </Champ>
          <Champ libelle="Nom complet">
            <Saisie value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="Ex. Instituteur" />
          </Champ>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Champ libelle="Catégorie">
            <Liste value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} options={["I", "II", "III"].map((v) => ({ valeur: v, libelle: v }))} />
          </Champ>
          <Champ libelle="Échelle">
            <Liste value={f.echelle} onChange={(e) => setF({ ...f, echelle: e.target.value })} options={nombres(5)} />
          </Champ>
          <Champ libelle="Échelon">
            <Liste value={f.echelon} onChange={(e) => setF({ ...f, echelon: e.target.value })} options={nombres(12)} />
          </Champ>
        </div>
        <Champ libelle="Indice au recrutement" aide="Salaire brut mensuel = indice × point indiciaire (300 par défaut)">
          <Saisie inputMode="numeric" value={f.indice} onChange={(e) => setF({ ...f, indice: e.target.value.replace(/\D/g, "") })} placeholder="Ex. 488" />
        </Champ>
        <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
          Sur la note : <strong>{f.abreviation || "…"}</strong> · {f.categorie} / {f.echelle} / {f.echelon} — contractuel : <strong>{(f.abreviation || "…").replace(/\.+$/, "")}.C.</strong>
          {f.indice && <> · salaire brut : <strong>{new Intl.NumberFormat("fr-FR").format(Number(f.indice) * 300)} FCFA</strong></>}
        </div>
        {grade && grade.diplomes.length > 0 && (
          <Alerte ton="jaune">Ce grade est donné par : {grade.diplomes.join(", ")}. Tous ces diplômes seront mis à jour (sauf dans les notes déjà validées).</Alerte>
        )}
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!f.abreviation.trim() || !f.libelle.trim()} onClick={enregistrer}>
            <Check /> Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}

/* =============================== Rattachement =============================== */

function Rattacher({ ecriture, regles, fermer, apres }: { ecriture: string; regles: Regle[]; fermer: () => void; apres: (t: string) => void }) {
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const regle = regles.find((r) => r.code === code);

  async function enregistrer() {
    if (!regle) return;
    try {
      const b = await api.put<Bilan>(`/configuration/regles/${regle.code}`, {
        libelle: regle.libelle,
        ecritures: [...regle.ecritures, ecriture],
        cycle: regle.cycle,
        typeNote: regle.typeNote,
        gradeCode: regle.gradeCode,
      });
      apres(`« ${ecriture} » est maintenant reconnu comme ${regle.libelle}. ${texteBilan(b)}`);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <Modale titre={`Rattacher « ${ecriture} »`} ouverte fermer={fermer}>
      <div className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}
        <p className="text-[13px] text-zinc-500">« {ecriture} » est une autre façon d’écrire quel diplôme ?</p>
        <Liste value={code} onChange={(e) => setCode(e.target.value)} vide="Choisir le diplôme…" options={regles.map((r) => ({ valeur: r.code, libelle: r.libelle }))} className="w-full" />
        <div className="flex justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!regle} onClick={enregistrer}>
            <Link2 /> Rattacher
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
