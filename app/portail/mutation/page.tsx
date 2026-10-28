"use client";

import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Paperclip, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { appelPublic, type ReferencesPortail } from "@/lib/portail";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

const GRANDS = "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[16px] text-encre outline-none focus:border-marque-300 focus:ring-4 focus:ring-marque-100";

interface Formulaire {
  typePrestation: string;
  nomComplet: string;
  genre: "M" | "F";
  grade: string;
  echelon: string;
  matricule: string;
  typeAgent: "FONCTIONNAIRE" | "FINALISTE";
  statutAgent: "ENSEIGNANT" | "PERSONNEL_ADMINISTRATIF";
  telephone: string;
  lieuTravail: "DEPARTEMENT" | "CENTRALE";
  departementOrigineId: string;
  structureOrigineId: string;
  structureOrigineTexte: string;
  lieuService: string;
  cycle: string;
  specialite: string;
  datePriseService: string;
  departementSolliciteId: string;
  lieuSollicite: string;
  motif: string;
  justificatif: string;
  observation: string;
}

const VIDE: Formulaire = {
  typePrestation: "",
  nomComplet: "",
  genre: "M",
  grade: "",
  echelon: "",
  matricule: "",
  typeAgent: "FONCTIONNAIRE",
  statutAgent: "ENSEIGNANT",
  telephone: "",
  lieuTravail: "DEPARTEMENT",
  departementOrigineId: "",
  structureOrigineId: "",
  structureOrigineTexte: "",
  lieuService: "",
  cycle: "",
  specialite: "",
  datePriseService: "",
  departementSolliciteId: "",
  lieuSollicite: "",
  motif: "",
  justificatif: "",
  observation: "",
};

const ETAPES = ["Demande", "Vous", "Votre poste", "Pièces", "Envoi"];

/** Message de ce qui manque → étape et champ du formulaire où on le remplit. */
const CHAMPS: [RegExp, number, string][] = [
  [/votre demande\./i, 0, "type"],
  [/nom et vos prénoms/i, 1, "nom"],
  [/téléphone/i, 1, "telephone"],
  [/département actuel|département d’origine|département d'origine/i, 2, "departementOrigine"],
  [/votre service/i, 2, "service"],
  [/établissement/i, 2, "etablissement"],
  [/département demandé/i, 2, "departementSollicite"],
  [/motif/i, 2, "motif"],
  [/cycle/i, 2, "cycle"],
  [/joignez|pièce/i, 3, "pieces"],
];
const champDe = (message: string) => CHAMPS.find(([re]) => re.test(message)) ?? null;
/** Fait défiler jusqu'au champ, l'entoure un instant et y place le curseur. */
function allerAuChamp(id: string) {
  const el = document.getElementById(`champ-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-rouge-500", "rounded-2xl");
  setTimeout(() => el.classList.remove("ring-2", "ring-rouge-500", "rounded-2xl"), 2500);
  el.querySelector<HTMLElement>("select, input, textarea, button")?.focus({ preventScroll: true });
}

/** Demande de mutation faite par l'agent lui-même, depuis son téléphone. */
export default function DemandeMutationPortail() {
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

  const type = refs?.types.find((t) => t.code === f.typePrestation);
  const maj = <K extends keyof Formulaire>(k: K, v: Formulaire[K]) => setF((x) => ({ ...x, [k]: v }));
  const structuresDep = useMemo(
    () =>
      (refs?.structures ?? [])
        .filter((s) => ["ETABLISSEMENT", "INSPECTION"].includes(s.type) && String(s.departementId) === f.departementOrigineId)
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    [refs, f.departementOrigineId],
  );
  const services = (refs?.structures ?? []).filter((s) => ["SERVICE", "DIRECTION_CENTRALE"].includes(s.type));
  const exigees = type?.pieces ?? [];
  const manquantes = exigees.filter((p) => !pieces.some((x) => x.libelle === p));

  /** Ce qui manque pour passer à l'étape suivante. */
  const bloquant = (() => {
    if (etape === 0) return !f.typePrestation ? "Choisissez votre demande." : null;
    if (etape === 1) return f.nomComplet.trim().length < 3 ? "Écrivez votre nom et vos prénoms." : !f.telephone.trim() ? "Laissez un numéro de téléphone pour être joint." : null;
    if (etape === 2) {
      if (f.lieuTravail === "DEPARTEMENT" && !f.departementOrigineId) return "Choisissez votre département actuel.";
      if (f.lieuTravail === "CENTRALE" && !f.structureOrigineId) return "Choisissez votre service.";
      if (f.lieuTravail === "DEPARTEMENT" && !f.structureOrigineId && !f.structureOrigineTexte.trim()) return "Choisissez votre établissement, ou écrivez son nom.";
      if (!f.departementSolliciteId) return "Choisissez le département demandé.";
      if (!type?.motif && !f.motif) return "Choisissez le motif de la mutation.";
      if (!f.cycle) return "Choisissez votre cycle.";
      return null;
    }
    if (etape === 3) return !pieces.some((x) => x.libelle === exigees[0]) ? `Joignez au moins : ${exigees[0] ?? "votre demande manuscrite"}.` : null;
    return null;
  })();

  /** Va à l'étape et au champ dont parle le message. */
  function corriger(message: string) {
    const c = champDe(message);
    if (!c) return;
    setEtape(c[1]);
    setTimeout(() => allerAuChamp(c[2]), 80);
  }

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    const n = (v: string) => (v ? Number(v) : null);
    const dep = refs?.departements.find((d) => String(d.id) === f.departementSolliciteId)?.nom;
    // Administration centrale : le département d'origine est celui du service (Brazzaville le plus souvent)
    const struct = refs?.structures.find((s) => String(s.id) === f.structureOrigineId);
    const donnees = {
      ...f,
      echelon: n(f.echelon),
      departementOrigineId: n(f.departementOrigineId) ?? struct?.departementId ?? refs?.departements.find((d) => /brazzaville/i.test(d.nom))?.id ?? null,
      departementSolliciteId: n(f.departementSolliciteId),
      structureOrigineId: n(f.structureOrigineId),
      objet: `Mutation à ${dep ?? ""}${f.lieuSollicite ? ` (${f.lieuSollicite})` : ""}`,
      motif: type?.motif ?? f.motif,
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

  if (erreurRefs) return <Message ton="rouge">{erreurRefs}</Message>;
  if (!refs) return <p className="py-10 text-center text-zinc-400">Chargement…</p>;

  if (fini)
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-white p-6 text-center shadow-doux">
          <CheckCircle2 className="mx-auto size-12 text-marque-500" />
          <h1 className="mt-3 text-[20px] font-semibold">Demande envoyée</h1>
          <p className="mt-1 text-[14px] text-zinc-600">Elle est arrivée chez {fini.etape}, qui va la viser et donner son avis.</p>
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
            Notez ce numéro et ce code (ou faites une capture d’écran) : ils sont nécessaires pour suivre votre demande.
          </p>
        </div>
        <Link href={`/portail/suivi?numero=${fini.numero}&code=${fini.code}`} className="block rounded-2xl bg-nuit px-5 py-4 text-center text-[15px] font-semibold text-white">
          Suivre ma demande
        </Link>
        <Link href="/portail" className="block text-center text-[14px] text-marque-700 underline">
          Retour à l’accueil
        </Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <Link href="/portail" className="text-[13px] text-marque-700">
          ← Accueil
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold">Demande de mutation</h1>
      </div>
      {/* Avancement : 5 étapes courtes */}
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
            <h2 className="text-[16px] font-semibold">Quelle est votre demande ?</h2>
            <div className="space-y-2" id="champ-type">
              {refs.types.filter((t) => t.mutation).map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => maj("typePrestation", t.code)}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-[15px] ring-1 transition ${f.typePrestation === t.code ? "bg-marque-50 font-semibold ring-2 ring-marque-500" : "ring-zinc-200"}`}
                >
                  {t.libelle}
                  {t.decision === "DDEPPSA" && <span className="block text-[12px] font-normal text-zinc-500">Décidée par votre directeur départemental</span>}
                </button>
              ))}
            </div>
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
            <Bloc champ="nom" libelle="Nom et prénoms *">
              <input className={GRANDS} value={f.nomComplet} onChange={(e) => maj("nomComplet", e.target.value)} autoComplete="name" placeholder="Ex. MOUANDA Jean Paul" />
            </Bloc>
            <Bloc libelle="Vous êtes">
              <Choix valeur={f.genre} changer={(v) => maj("genre", v)} options={[["M", "Un homme"], ["F", "Une femme"]]} />
            </Bloc>
            <div className="grid grid-cols-2 gap-3">
              <Bloc libelle="Grade">
                <input className={GRANDS} value={f.grade} onChange={(e) => maj("grade", e.target.value)} placeholder="Ex. PCEG" />
              </Bloc>
              <Bloc libelle="Échelon">
                <input className={GRANDS} inputMode="numeric" value={f.echelon} onChange={(e) => maj("echelon", e.target.value.replace(/\D/g, "").slice(0, 2))} />
              </Bloc>
            </div>
            <Bloc libelle="Matricule solde" aide="Sur votre bulletin de solde ; vide si vous n’en avez pas encore">
              <input className={GRANDS} value={f.matricule} onChange={(e) => maj("matricule", e.target.value)} />
            </Bloc>
            <Bloc libelle="Vous êtes">
              <Choix valeur={f.typeAgent} changer={(v) => maj("typeAgent", v)} options={[["FONCTIONNAIRE", "Fonctionnaire"], ["FINALISTE", "Finaliste"]]} />
            </Bloc>
            <Bloc libelle="Fonction">
              <Choix valeur={f.statutAgent} changer={(v) => maj("statutAgent", v)} options={[["ENSEIGNANT", "Enseignant"], ["PERSONNEL_ADMINISTRATIF", "Personnel administratif"]]} />
            </Bloc>
            <Bloc champ="telephone" libelle="Téléphone *" aide="Pour vous joindre si une pièce manque">
              <input className={GRANDS} type="tel" inputMode="tel" autoComplete="tel" value={f.telephone} onChange={(e) => maj("telephone", e.target.value)} placeholder="Ex. 06 000 00 00" />
            </Bloc>
          </>
        )}

        {etape === 2 && (
          <>
            <h2 className="text-[16px] font-semibold">Votre poste et votre demande</h2>
            <Bloc libelle="Vous travaillez">
              <Choix
                valeur={f.lieuTravail}
                changer={(v) => setF((x) => ({ ...x, lieuTravail: v, structureOrigineId: "", structureOrigineTexte: "" }))}
                options={[
                  ["DEPARTEMENT", "Dans un établissement"],
                  ["CENTRALE", "À l’administration centrale"],
                ]}
              />
            </Bloc>
            {f.lieuTravail === "DEPARTEMENT" ? (
              <>
                <Bloc champ="departementOrigine" libelle="Département actuel *">
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
                  <Bloc champ="etablissement" libelle="Votre établissement *" aide="Votre demande lui arrive d’abord, puis à l’inspection et à la direction départementale">
                    <select className={GRANDS} value={f.structureOrigineId} onChange={(e) => maj("structureOrigineId", e.target.value)}>
                      <option value="">{structuresDep.length ? "— Choisir —" : "Aucun établissement enregistré"}</option>
                      {structuresDep.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                    {!f.structureOrigineId && (
                      <input
                        className={`${GRANDS} mt-2`}
                        value={f.structureOrigineTexte}
                        onChange={(e) => maj("structureOrigineTexte", e.target.value)}
                        placeholder="Pas dans la liste ? Écrivez son nom"
                      />
                    )}
                  </Bloc>
                )}
              </>
            ) : (
              <Bloc champ="service" libelle="Votre service *">
                <select className={GRANDS} value={f.structureOrigineId} onChange={(e) => maj("structureOrigineId", e.target.value)}>
                  <option value="">{services.length ? "— Choisir —" : "Aucun service enregistré"}</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sigle} – {s.nom}
                    </option>
                  ))}
                </select>
              </Bloc>
            )}
            <Bloc libelle="Lieu de service actuel" aide="École, collège, lycée ou bureau où vous travaillez">
              <SaisieReferentiel liste="ETABLISSEMENT" valeur={f.lieuService} changer={(v) => maj("lieuService", v)} placeholder="Tapez le nom de votre école ou de votre bureau" />
            </Bloc>
            <div className="grid grid-cols-2 gap-3">
              <Bloc champ="cycle" libelle="Cycle *">
                <select className={GRANDS} value={f.cycle} onChange={(e) => maj("cycle", e.target.value)}>
                  <option value="">—</option>
                  {refs.cycles.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.libelle}
                    </option>
                  ))}
                </select>
              </Bloc>
              <Bloc libelle="Spécialité">
                <SaisieReferentiel liste="MATIERE" valeur={f.specialite} changer={(v) => maj("specialite", v)} placeholder="Ex. Français" />
              </Bloc>
            </div>
            <Bloc libelle="Date de prise de service au poste actuel">
              <input className={GRANDS} type="date" value={f.datePriseService} onChange={(e) => maj("datePriseService", e.target.value)} />
            </Bloc>
            <div className="h-px bg-zinc-100" />
            <Bloc champ="departementSollicite" libelle="Département demandé *">
              <select className={GRANDS} value={f.departementSolliciteId} onChange={(e) => maj("departementSolliciteId", e.target.value)}>
                <option value="">— Choisir —</option>
                {refs.departements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </Bloc>
            <Bloc libelle="Lieu demandé (si vous le savez)">
              <SaisieReferentiel liste="ETABLISSEMENT" valeur={f.lieuSollicite} changer={(v) => maj("lieuSollicite", v)} departementId={f.departementSolliciteId} placeholder="Ex. Lycée de Ouesso" />
            </Bloc>
            {!type?.motif && (
              <Bloc champ="motif" libelle="Motif *">
                <select className={GRANDS} value={f.motif} onChange={(e) => maj("motif", e.target.value)}>
                  <option value="">— Choisir —</option>
                  {refs.motifs.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.libelle}
                    </option>
                  ))}
                </select>
              </Bloc>
            )}
            <Bloc libelle="Pourquoi demandez-vous cette mutation ?" aide="Quelques mots, en plus de votre demande manuscrite">
              <textarea className={`${GRANDS} min-h-24`} value={f.observation} onChange={(e) => maj("observation", e.target.value)} />
            </Bloc>
          </>
        )}

        {etape === 3 && (
          <>
            <h2 className="text-[16px] font-semibold" id="champ-pieces">Vos pièces</h2>
            <p className="text-[13px] text-zinc-500">
              Prenez une photo nette de chaque pièce, ou joignez le fichier (PDF, JPG ou PNG, 10 Mo au plus). La première, votre demande manuscrite signée, est
              obligatoire.
            </p>
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
            {manquantes.length > 1 && (
              <p className="text-[12px] text-or-700">Vous pouvez envoyer sans toutes les pièces, mais une pièce manquante peut retarder ou faire rejeter votre demande.</p>
            )}
          </>
        )}

        {etape === 4 && (
          <>
            <h2 className="text-[16px] font-semibold">Vérifiez avant d’envoyer</h2>
            <dl className="space-y-2 text-[14px]">
              <Ligne l="Demande">{type?.libelle}</Ligne>
              <Ligne l="Nom">{f.nomComplet}</Ligne>
              <Ligne l="Téléphone">{f.telephone}</Ligne>
              <Ligne l="Poste actuel">
                {refs.structures.find((s) => String(s.id) === f.structureOrigineId)?.nom ?? f.structureOrigineTexte ?? "—"}
                {f.departementOrigineId && ` (${refs.departements.find((d) => String(d.id) === f.departementOrigineId)?.nom})`}
              </Ligne>
              <Ligne l="Département demandé">{refs.departements.find((d) => String(d.id) === f.departementSolliciteId)?.nom}</Ligne>
              <Ligne l="Pièces jointes">{pieces.length} fichier(s)</Ligne>
            </dl>
            {/* Champ invisible : seuls les robots le remplissent */}
            <input type="text" name="site" value={piege} onChange={(e) => setPiege(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
            <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-[12px] text-zinc-600">
              En envoyant, vous certifiez que les informations sont exactes. Votre demande suivra la voie hiérarchique ; chaque niveau donnera un avis motivé.
            </p>
            {erreur && (
              <Message ton="rouge">
                {erreur}
                {champDe(erreur) && (
                  <button type="button" onClick={() => corriger(erreur)} className="ml-2 font-semibold underline">
                    Corriger
                  </button>
                )}
              </Message>
            )}
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
      {bloquant && etape < ETAPES.length - 1 && (
        <button type="button" onClick={() => corriger(bloquant)} className="block w-full text-center text-[13px] font-medium text-rouge-700 underline decoration-dotted underline-offset-2">
          {bloquant} {champDe(bloquant) && "(cliquez pour y aller)"}
        </button>
      )}
    </div>
  );
}

function Bloc({ libelle, aide, champ, children }: { libelle: string; aide?: string; champ?: string; children: React.ReactNode }) {
  return (
    <label className="block transition" id={champ ? `champ-${champ}` : undefined}>
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

function Message({ ton, children }: { ton: "rouge" | "vert"; children: React.ReactNode }) {
  return <div className={`rounded-2xl px-4 py-3 text-[14px] ${ton === "rouge" ? "bg-rouge-100 text-rouge-600" : "bg-marque-50 text-marque-700"}`}>{children}</div>;
}
