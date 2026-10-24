"use client";

import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Paperclip, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SaisieReferentiel } from "@/components/saisie-referentiel";
import { appelPublic, type ReferencesPortail } from "@/lib/portail";

const GRANDS = "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[16px] text-encre outline-none focus:border-marque-300 focus:ring-4 focus:ring-marque-100";
const ETAPES = ["Demande", "Vous", "Votre poste", "Détail", "Pièces", "Envoi"];

/** Familles de démarches, pour s'y retrouver dans la liste. */
const FAMILLES: [RegExp, string][] = [
  [/^CONGE|MATERNITE|PATERNITE/, "Congés"],
  [/ABSENCE|AUTORISATION/, "Autorisations"],
  [/^PRIME|INDEMNITE|ALLOCATION|RAPPEL|CAPITAL/, "Primes, indemnités et allocations"],
  [/CERTIFICAT|ATTESTATION/, "Certificats et attestations"],
];
const famille = (code: string) => FAMILLES.find(([r]) => r.test(code))?.[1] ?? "Autres démarches";

interface Formulaire {
  typePrestation: string;
  nomComplet: string;
  genre: "M" | "F";
  grade: string;
  echelon: string;
  matricule: string;
  statutAgent: "ENSEIGNANT" | "PERSONNEL_ADMINISTRATIF";
  telephone: string;
  departementOrigineId: string;
  structureOrigineId: string;
  structureOrigineTexte: string;
  lieuService: string;
  objet: string;
  dateDebut: string;
  dateFin: string;
  observation: string;
}
const VIDE: Formulaire = {
  typePrestation: "",
  nomComplet: "",
  genre: "M",
  grade: "",
  echelon: "",
  matricule: "",
  statutAgent: "ENSEIGNANT",
  telephone: "",
  departementOrigineId: "",
  structureOrigineId: "",
  structureOrigineTexte: "",
  lieuService: "",
  objet: "",
  dateDebut: "",
  dateFin: "",
  observation: "",
};

/** Congé, autorisation d'absence, attestation, prime… demandés par l'agent depuis son téléphone. */
export default function DemandePortail() {
  const [refs, setRefs] = useState<ReferencesPortail | null>(null);
  const [erreurRefs, setErreurRefs] = useState<string | null>(null);
  const [etape, setEtape] = useState(0);
  const [f, setF] = useState<Formulaire>(VIDE);
  const [pieces, setPieces] = useState<{ libelle: string; fichier: File }[]>([]);
  const [piege, setPiege] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fini, setFini] = useState<{ numero: number; code: string; etape: string } | null>(null);

  useEffect(() => {
    appelPublic<ReferencesPortail>("/references")
      .then(setRefs)
      .catch((e: Error) => setErreurRefs(e.message));
  }, []);

  const types = useMemo(() => (refs?.types ?? []).filter((t) => !t.mutation), [refs]);
  const groupes = useMemo(() => {
    const m = new Map<string, typeof types>();
    for (const t of types) m.set(famille(t.code), [...(m.get(famille(t.code)) ?? []), t]);
    return [...m.entries()];
  }, [types]);
  const type = types.find((t) => t.code === f.typePrestation);
  const maj = <K extends keyof Formulaire>(k: K, v: Formulaire[K]) => setF((x) => ({ ...x, [k]: v }));
  const structuresDep = useMemo(
    () => (refs?.structures ?? []).filter((s) => ["ETABLISSEMENT", "INSPECTION", "DDEPPSA"].includes(s.type) && String(s.departementId) === f.departementOrigineId).sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    [refs, f.departementOrigineId],
  );
  const exigees = type?.pieces ?? [];
  const periode = /CONGE|ABSENCE|MATERNITE|PATERNITE|AUTORISATION|DETACHEMENT|DISPONIBILITE/.test(f.typePrestation);

  const bloquant = (() => {
    if (etape === 0) return !f.typePrestation ? "Choisissez votre démarche." : null;
    if (etape === 1) return f.nomComplet.trim().length < 3 ? "Écrivez votre nom et vos prénoms." : !f.telephone.trim() ? "Laissez un numéro de téléphone pour être joint." : null;
    if (etape === 2) return !f.departementOrigineId ? "Choisissez votre département." : !f.structureOrigineId && !f.structureOrigineTexte.trim() ? "Choisissez votre établissement ou votre service, ou écrivez son nom." : null;
    if (etape === 3) {
      if (f.objet.trim().length < 4) return "Écrivez l’objet de votre demande.";
      if (f.dateDebut && f.dateFin && f.dateFin < f.dateDebut) return "La date de fin est avant la date de début.";
      return null;
    }
    if (etape === 4) return !pieces.some((x) => x.libelle === exigees[0]) ? `Joignez au moins : ${exigees[0] ?? "votre demande manuscrite"}.` : null;
    return null;
  })();

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    const n = (v: string) => (v ? Number(v) : null);
    const donnees = {
      ...f,
      echelon: n(f.echelon),
      departementOrigineId: n(f.departementOrigineId),
      structureOrigineId: n(f.structureOrigineId),
      typeAgent: "FONCTIONNAIRE",
      motif: "PRESTATION",
      dateDebut: f.dateDebut || null,
      dateFin: f.dateFin || null,
    };
    const fd = new FormData();
    fd.append("donnees", JSON.stringify(donnees));
    fd.append("site", piege);
    for (const x of pieces) {
      fd.append("fichiers", x.fichier);
      fd.append("libelles", x.libelle);
    }
    try {
      setFini(await appelPublic<{ numero: number; code: string; etape: string }>("/demandes", { method: "POST", body: fd }));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (erreurRefs) return <Message>{erreurRefs}</Message>;
  if (!refs) return <p className="py-10 text-center text-zinc-400">Chargement…</p>;
  if (!types.length)
    return (
      <div className="space-y-4">
        <Link href="/portail" className="text-[13px] text-marque-700">
          ← Accueil
        </Link>
        <div className="rounded-3xl bg-white p-5 text-[14px] text-zinc-600 shadow-doux">Aucune autre démarche n’est encore ouverte en ligne. Adressez-vous à votre chef d’établissement.</div>
      </div>
    );

  if (fini)
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-white p-6 text-center shadow-doux">
          <CheckCircle2 className="mx-auto size-12 text-marque-500" />
          <h1 className="mt-3 text-[20px] font-semibold">Demande envoyée</h1>
          <p className="mt-1 text-[14px] text-zinc-600">Elle est arrivée chez {fini.etape}, qui va la viser.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="text-[12px] text-zinc-500">Numéro</div>
              <div className="text-[26px] font-bold tabular-nums">{fini.numero}</div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="text-[12px] text-zinc-500">Code</div>
              <div className="text-[26px] font-bold tracking-widest">{fini.code}</div>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-or-100 px-4 py-3 text-[13px] font-medium text-or-700">
            Notez ce numéro et ce code : ils servent à suivre votre demande et, une fois accordée, à imprimer votre acte.
          </p>
        </div>
        <Link href={`/portail/suivi?numero=${fini.numero}&code=${fini.code}`} className="block rounded-2xl bg-nuit px-5 py-4 text-center text-[15px] font-semibold text-white">
          Suivre ma demande
        </Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <Link href="/portail" className="text-[13px] text-marque-700">
          ← Accueil
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold">Congés, autorisations, attestations, primes…</h1>
      </div>
      <ol className="flex gap-1.5" aria-label="Étapes">
        {ETAPES.map((e, i) => (
          <li key={e} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= etape ? "bg-marque-500" : "bg-zinc-200"}`} />
            <div className={`mt-1 text-center text-[10px] ${i === etape ? "font-semibold text-encre" : "text-zinc-400"}`}>{e}</div>
          </li>
        ))}
      </ol>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-doux">
        {etape === 0 && (
          <>
            <h2 className="text-[16px] font-semibold">Quelle est votre démarche ?</h2>
            {groupes.map(([g, liste]) => (
              <div key={g} className="space-y-2">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-zinc-400">{g}</div>
                {liste.map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setF((x) => ({ ...x, typePrestation: t.code, objet: x.objet || t.libelle }))}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-[15px] ring-1 transition ${f.typePrestation === t.code ? "bg-marque-50 font-semibold ring-2 ring-marque-500" : "ring-zinc-200"}`}
                  >
                    {t.libelle}
                    {t.acte && <span className="block text-[12px] font-normal text-zinc-500">Vous recevrez : {t.acte.toLowerCase()}</span>}
                  </button>
                ))}
              </div>
            ))}
            {type && (
              <div className="rounded-2xl bg-zinc-50 p-4 text-[13px] text-zinc-600">
                <div className="mb-1 font-semibold text-encre">Pièces à préparer :</div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {type.pieces.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {etape === 1 && (
          <>
            <h2 className="text-[16px] font-semibold">Vous</h2>
            <Bloc libelle="Nom et prénoms *">
              <input className={GRANDS} value={f.nomComplet} onChange={(e) => maj("nomComplet", e.target.value)} autoComplete="name" placeholder="Ex. MOUANDA Jean Paul" />
            </Bloc>
            <Bloc libelle="Vous êtes">
              <Choix valeur={f.genre} changer={(v) => maj("genre", v)} options={[["M", "Un homme"], ["F", "Une femme"]]} />
            </Bloc>
            <div className="grid grid-cols-2 gap-3">
              <Bloc libelle="Grade">
                <input className={GRANDS} value={f.grade} onChange={(e) => maj("grade", e.target.value)} placeholder="Ex. Instituteur" />
              </Bloc>
              <Bloc libelle="Échelon">
                <input className={GRANDS} inputMode="numeric" value={f.echelon} onChange={(e) => maj("echelon", e.target.value.replace(/\D/g, "").slice(0, 2))} />
              </Bloc>
            </div>
            <Bloc libelle="Matricule solde" aide="Sur votre bulletin de solde">
              <input className={GRANDS} value={f.matricule} onChange={(e) => maj("matricule", e.target.value)} />
            </Bloc>
            <Bloc libelle="Fonction">
              <Choix valeur={f.statutAgent} changer={(v) => maj("statutAgent", v)} options={[["ENSEIGNANT", "Enseignant"], ["PERSONNEL_ADMINISTRATIF", "Personnel administratif"]]} />
            </Bloc>
            <Bloc libelle="Téléphone *" aide="Pour vous joindre si une pièce manque">
              <input className={GRANDS} type="tel" inputMode="tel" autoComplete="tel" value={f.telephone} onChange={(e) => maj("telephone", e.target.value)} placeholder="Ex. 06 000 00 00" />
            </Bloc>
          </>
        )}

        {etape === 2 && (
          <>
            <h2 className="text-[16px] font-semibold">Votre poste</h2>
            <Bloc libelle="Département *">
              <select className={GRANDS} value={f.departementOrigineId} onChange={(e) => setF((x) => ({ ...x, departementOrigineId: e.target.value, structureOrigineId: "" }))}>
                <option value="">— Choisir —</option>
                {refs.departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </Bloc>
            {f.departementOrigineId && (
              <Bloc libelle="Votre établissement ou service *" aide="Votre demande lui arrive d’abord, puis suit la voie hiérarchique">
                <select className={GRANDS} value={f.structureOrigineId} onChange={(e) => maj("structureOrigineId", e.target.value)}>
                  <option value="">{structuresDep.length ? "— Choisir —" : "Aucun enregistré"}</option>
                  {structuresDep.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
                {!f.structureOrigineId && <input className={`${GRANDS} mt-2`} value={f.structureOrigineTexte} onChange={(e) => maj("structureOrigineTexte", e.target.value)} placeholder="Pas dans la liste ? Écrivez son nom" />}
              </Bloc>
            )}
            <Bloc libelle="Lieu de service" aide="École, collège, lycée ou bureau où vous travaillez">
              <SaisieReferentiel liste="ETABLISSEMENT" valeur={f.lieuService} changer={(v) => maj("lieuService", v)} departementId={f.departementOrigineId} placeholder="Tapez le nom" />
            </Bloc>
          </>
        )}

        {etape === 3 && (
          <>
            <h2 className="text-[16px] font-semibold">Votre demande</h2>
            <Bloc libelle="Objet *" aide="Ce que vous demandez, en une phrase">
              <input className={GRANDS} value={f.objet} onChange={(e) => maj("objet", e.target.value)} />
            </Bloc>
            {periode && (
              <div className="grid grid-cols-2 gap-3">
                <Bloc libelle="Du">
                  <input className={GRANDS} type="date" value={f.dateDebut} onChange={(e) => maj("dateDebut", e.target.value)} />
                </Bloc>
                <Bloc libelle="Au">
                  <input className={GRANDS} type="date" value={f.dateFin} onChange={(e) => maj("dateFin", e.target.value)} />
                </Bloc>
              </div>
            )}
            <Bloc libelle="Précisions" aide="Facultatif : le motif, ce qui peut aider la décision">
              <textarea className={`${GRANDS} min-h-24`} value={f.observation} onChange={(e) => maj("observation", e.target.value)} />
            </Bloc>
          </>
        )}

        {etape === 4 && (
          <>
            <h2 className="text-[16px] font-semibold">Vos pièces</h2>
            <p className="text-[13px] text-zinc-500">Une photo nette ou le fichier de chaque pièce (PDF, JPG ou PNG, 10 Mo au plus). La première est obligatoire.</p>
            <div className="space-y-2">
              {[...exigees, "Autre pièce"].map((lib, i) => {
                const choisis = pieces.filter((x) => x.libelle === lib);
                return (
                  <div key={lib} className={`rounded-2xl px-4 py-3 ring-1 ${choisis.length ? "bg-marque-50 ring-marque-200" : "ring-zinc-200"}`}>
                    <div className="text-[14px] font-medium">
                      {choisis.length ? "✓ " : ""}
                      {lib}
                      {i === 0 && " *"}
                    </div>
                    {choisis.map((x) => (
                      <div key={x.fichier.name + x.fichier.size} className="mt-1 flex items-center gap-2 text-[12px] text-zinc-600">
                        <Paperclip className="size-3.5" />
                        <span className="min-w-0 flex-1 truncate">{x.fichier.name}</span>
                        <button type="button" aria-label="Retirer" onClick={() => setPieces((l) => l.filter((y) => y !== x))}>
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-[14px] font-medium ring-1 ring-zinc-300">
                      <Camera className="size-4" /> Photo ou fichier
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const l = Array.from(e.target.files ?? []).filter((x) => x.size <= 10 * 1024 * 1024);
                          setPieces((p) => [...p, ...l.map((fichier) => ({ libelle: lib, fichier }))].slice(0, 12));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {etape === 5 && (
          <>
            <h2 className="text-[16px] font-semibold">Vérifiez avant d’envoyer</h2>
            <dl className="space-y-2 text-[14px]">
              <Ligne l="Démarche">{type?.libelle}</Ligne>
              <Ligne l="Objet">{f.objet}</Ligne>
              {(f.dateDebut || f.dateFin) && <Ligne l="Période">{[f.dateDebut, f.dateFin].filter(Boolean).map((d) => d.split("-").reverse().join("/")).join(" au ")}</Ligne>}
              <Ligne l="Nom">{f.nomComplet}</Ligne>
              <Ligne l="Poste">{refs.structures.find((s) => String(s.id) === f.structureOrigineId)?.nom ?? f.structureOrigineTexte}</Ligne>
              <Ligne l="Pièces jointes">{pieces.length} fichier(s)</Ligne>
            </dl>
            <input type="text" name="site" value={piege} onChange={(e) => setPiege(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
            {erreur && <Message>{erreur}</Message>}
          </>
        )}
      </section>

      <div className="flex gap-3">
        {etape > 0 && (
          <button type="button" onClick={() => setEtape((e) => e - 1)} className="flex items-center gap-1 rounded-2xl bg-white px-5 py-4 text-[15px] font-medium ring-1 ring-zinc-200">
            <ArrowLeft className="size-4" /> Retour
          </button>
        )}
        {etape < ETAPES.length - 1 ? (
          <button
            type="button"
            disabled={!!bloquant}
            onClick={() => {
              setEtape((e) => e + 1);
              window.scrollTo({ top: 0 });
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-marque-500 px-5 py-4 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            Continuer <ArrowRight className="size-4" />
          </button>
        ) : (
          <button type="button" disabled={envoi} onClick={envoyer} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-marque-500 px-5 py-4 text-[15px] font-semibold text-white disabled:opacity-50">
            <Send className="size-4" /> {envoi ? "Envoi en cours…" : "Envoyer ma demande"}
          </button>
        )}
      </div>
      {bloquant && etape < ETAPES.length - 1 && <p className="text-center text-[13px] text-zinc-500">{bloquant}</p>}
    </div>
  );
}

function Bloc({ libelle, aide, children }: { libelle: string; aide?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">{libelle}</span>
      {children}
      {aide && <span className="mt-1 block text-[12px] text-zinc-400">{aide}</span>}
    </label>
  );
}

function Choix<T extends string>({ valeur, changer, options }: { valeur: T; changer: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => changer(v)} className={`rounded-2xl px-3 py-3 text-[14px] ring-1 ${valeur === v ? "bg-marque-50 font-semibold ring-2 ring-marque-500" : "ring-zinc-200"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Ligne({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-zinc-100 pb-2">
      <dt className="text-zinc-500">{l}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">{children}</div>;
}
