"use client";

import { ChevronRight, CornerDownRight, FilePen, FileSignature, Layers, Lock, Send, Unlink, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useCampagne } from "./enrolement/commun";
import { useSession } from "./session";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, EnTete, Liste, Modale, Pastille, Saisie, Tableau, Vide } from "./ui";
import { api, qs, useApi } from "@/lib/api";
import { dateCourte, peut, STATUT_NOTE } from "@/lib/libelles";
import type { NoteResume, StatutNote } from "@/lib/types";
import type { Ton } from "@/lib/libelles";

/** « aujourd’hui à 10:42 », « hier à 16:05 », « le 29/10/2026 à 09:12 ». */
function quand(d: string) {
  const t = new Date(d);
  const heure = t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const jour = (x: Date) => x.toDateString();
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  if (jour(t) === jour(new Date())) return `aujourd’hui à ${heure}`;
  if (jour(t) === jour(hier)) return `hier à ${heure}`;
  return `le ${t.toLocaleDateString("fr-FR")} à ${heure}`;
}

const ETAPES: { statut: StatutNote; texte: string; icone: LucideIcon; ton: Ton }[] = [
  { statut: "BROUILLON", texte: "Préparée, à relire puis à envoyer au DG ; se met à jour toute seule", icone: FilePen, ton: "gris" },
  { statut: "SOUMISE", texte: "Transmise pour validation", icone: Send, ton: "jaune" },
  { statut: "VALIDEE", texte: "Contenu figé, agents marqués comme traités", icone: Lock, ton: "bleu" },
  { statut: "SIGNEE", texte: "Numéro et date de signature reportés", icone: FileSignature, ton: "vert" },
];

const TITRES = {
  AFFECTATION: {
    titre: "Notes d’affectation",
    aide: "Une note par type (préscolaire, primaire, DEMA, établissements, personnel administratif, décrets) et par lot (un lot = un quota et un type de texte dans un paquet). Les notes se préparent depuis l’écran « Traitement des affectations ».",
  },
  MUTATION: { titre: "Notes de mutation", aide: "Une note par motif et par groupe de cycles, avec les demandes accordées par le Ministre." },
  NOMINATION: {
    titre: "Notes de nomination",
    aide: "Une note par fonction (directeurs d’école, directeurs des études, surveillants généraux, économes, proviseurs, inspecteurs…), avec les nominations validées dans « Nominations », par département puis par circonscription. Les personnes relevées n’y figurent pas.",
  },
  ENROLEMENT: {
    titre: "Notes d’enrôlement",
    aide: "Une note par diplôme avec les volontaires retenus par la DGRHAS, classés par département puis par établissement. On choisit la campagne et l’année scolaire. Une note trop longue peut être découpée en plusieurs notes (lots) depuis la note elle-même.",
  },
};

/** Préparer les notes d'enrôlement : choix de la campagne et de l'année scolaire. */
function PreparerEnrolement({ fermer, apres }: { fermer: () => void; apres: (texte: string) => void }) {
  const { liste, campagne, choisir } = useCampagne();
  const [annee, setAnnee] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const valeur = annee || campagne?.anneeScolaire || "";
  async function preparer() {
    if (!campagne) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const n = await api.post<NoteResume[]>("/notes/preparer/enrolement", { campagneId: campagne.id, anneeScolaire: valeur });
      apres(
        n.length
          ? `${n.length} note(s) d’enrôlement préparée(s) pour ${valeur}.`
          : `Les notes déjà en préparation ont été mises à jour (année ${valeur}) : ouvrez-les ci-dessous.`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }
  return (
    <Modale titre="Préparer les notes d’enrôlement" ouverte fermer={fermer}>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">
          Les volontaires <strong>retenus</strong> par la DGRHAS et pas encore dans une note sont mis dans une note par diplôme (licence, master, BET…).
        </p>
        <Champ libelle="Campagne">
          <Liste value={String(campagne?.id ?? "")} onChange={(e) => choisir(Number(e.target.value))} options={liste.map((c) => ({ valeur: c.id, libelle: `Enrôlement ${c.annee} — ${c.retenus} retenu(s)` }))} />
        </Champ>
        <Champ libelle="Année scolaire de la note" aide="Format 2026-2027">
          <Saisie value={valeur} onChange={(e) => setAnnee(e.target.value)} placeholder="2026-2027" />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!campagne || !valeur || envoi} onClick={preparer}>
          Préparer les notes
        </Bouton>
      </div>
    </Modale>
  );
}

export function NotesListe({ module }: { module: "AFFECTATION" | "MUTATION" | "ENROLEMENT" | "NOMINATION" }) {
  const { profil, refs } = useSession();
  const { donnees: toutes, erreur, recharger } = useApi<NoteResume[]>(`/notes${qs({ module })}`);
  // Notes de mutation : trier par motif (rapprochement de conjoints, raisons de santé…), 07/11/2026
  const [motif, setMotif] = useState("");
  const motifs = useMemo(() => {
    const compte = new Map<string, number>();
    if (module === "MUTATION") for (const n of toutes ?? []) if (n.motif) compte.set(n.motif, (compte.get(n.motif) ?? 0) + 1);
    const ordre = refs.motifs.map((m) => m.code);
    return [...compte.entries()]
      .sort((a, b) => (ordre.indexOf(a[0]) + 1 || 99) - (ordre.indexOf(b[0]) + 1 || 99))
      .map(([code, n]) => ({ code, n, libelle: refs.motifs.find((m) => m.code === code)?.libelle ?? code }));
  }, [toutes, module, refs]);
  // Un motif qui n'a plus de note n'est plus filtré
  const motifActif = motifs.some((m) => m.code === motif) ? motif : "";
  const donnees = useMemo(() => (motifActif && toutes ? toutes.filter((n) => n.motif === motifActif) : toutes), [toutes, motifActif]);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [enrolement, setEnrolement] = useState(false);
  // Notes réunies dont le menu déroulant est ouvert, et note à séparer (confirmation)
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const [aSeparer, setASeparer] = useState<NoteResume | null>(null);
  // Enrôlement : chaque note suivie de ses lots, additifs et rectificatifs (06/11/2026)
  const rangees = useMemo<Rangee[]>(
    () => (module === "ENROLEMENT" || module === "MUTATION" ? familles(donnees ?? []) : (donnees ?? []).map((n) => ({ n, niveau: 0, lien: null, enfants: { ADDITIF: 0, RECTIFICATIF: 0, LOT: 0 } }))),
    [donnees, module],
  );
  const avecFamilles = rangees.some((r) => r.lien);
  const basculer = (id: string) =>
    setOuvertes((x) => {
      const y = new Set(x);
      if (y.has(id)) y.delete(id);
      else y.add(id);
      return y;
    });

  async function separer(n: NoteResume) {
    try {
      await api.post(`/notes/${n.id}/separer`);
      setMessage({ ton: "vert", texte: "Lots séparés : chaque lot a retrouvé sa note, comme avant la réunion." });
      setASeparer(null);
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function preparerNominations() {
    try {
      const n = await api.post<NoteResume[]>("/notes/preparer/nomination", {});
      setMessage({
        ton: "vert",
        texte: n.length ? `${n.length} note(s) de nomination préparée(s).` : "Aucune nouvelle nomination validée à mettre en note (ou leurs notes sont déjà en préparation).",
      });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function preparerMutations() {
    try {
      const n = await api.post<NoteResume[]>("/notes/preparer/mutation");
      setMessage({
        ton: "vert",
        texte: n.length ? `${n.length} note(s) de mutation préparée(s).` : "Aucune nouvelle demande accordée à mettre en note.",
      });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <EnTete
        titre={TITRES[module].titre}
        sousTitre={TITRES[module].aide}
        actions={
          peut.traiter(profil.role) &&
          (module === "MUTATION" ? (
            <Bouton variante="principal" onClick={preparerMutations}>
              Préparer les notes de mutation
            </Bouton>
          ) : module === "NOMINATION" ? (
            <Bouton variante="principal" onClick={preparerNominations}>
              Préparer les notes de nomination
            </Bouton>
          ) : module === "ENROLEMENT" ? (
            <Bouton variante="principal" onClick={() => setEnrolement(true)}>
              Préparer les notes de service
            </Bouton>
          ) : null)
        }
      />
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ETAPES.map((e, i) => (
          <li key={e.statut} className="flex items-start gap-3 rounded-3xl bg-white p-4 shadow-doux">
            <Pastille ton={e.ton}>
              <e.icone />
            </Pastille>
            <div className="min-w-0">
              <div className="text-[11px] text-zinc-400">Étape {i + 1}</div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                {STATUT_NOTE[e.statut].libelle}
                <Aide>{STATUT_NOTE[e.statut].aide}</Aide>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-zinc-500">{e.texte}</div>
            </div>
          </li>
        ))}
      </ol>
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>
      {enrolement && (
        <PreparerEnrolement
          fermer={() => setEnrolement(false)}
          apres={(texte) => {
            setEnrolement(false);
            setMessage({ ton: "vert", texte });
            recharger();
          }}
        />
      )}
      {erreur && <Alerte>{erreur}</Alerte>}
      <Modale titre="Séparer les lots ?" ouverte={!!aSeparer} fermer={() => setASeparer(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          <strong>« {aSeparer?.libelle} »</strong> ne gardera que <strong>{aSeparer?.reunion?.depart}</strong>. Les autres (<strong>{aSeparer?.reunion?.resume}</strong>){" "}
          retrouvent chacun leur note « à soumettre au DG », comme avant la réunion. Vous pourrez les réunir de nouveau.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setASeparer(null)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={() => aSeparer && separer(aSeparer)}>
            Séparer les lots
          </Bouton>
        </div>
      </Modale>
      <Carte>
        {!donnees ? (
          <Chargement />
        ) : !donnees.length ? (
          <Vide>Aucune note pour le moment.</Vide>
        ) : (
          <>
          {motifs.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] font-medium text-zinc-500">Motif :</span>
              {[{ code: "", libelle: "Tous", n: toutes?.length ?? 0 }, ...motifs].map((m) => (
                <button
                  key={m.code || "tous"}
                  type="button"
                  aria-pressed={motifActif === m.code}
                  onClick={() => setMotif(m.code)}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition ${
                    motifActif === m.code ? "bg-marque-600 text-white ring-marque-600" : "bg-white text-zinc-700 ring-zinc-200 hover:ring-marque-300"
                  }`}
                >
                  {m.libelle} · {m.n}
                </button>
              ))}
            </div>
          )}
          {avecFamilles && <LegendeFamilles />}
          <Tableau>
            <thead>
              <tr>
                <th>Note</th>
                <th className="text-right">Agents</th>
                {/* Le cycle de la note, sans avoir à le chercher dans son nom (DG, 01/11/2026) */}
                <th>Cycle</th>
                <th>Statut</th>
                <th>N° / date de signature</th>
                <th>Suivi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rangees.map(({ n, niveau, lien, enfants, trait }) => (
                <Fragment key={n.id}>
                <tr className={ouvertes.has(n.id) ? "bg-sky-50/60" : lien ? "bg-zinc-50/70" : undefined}>
                  <td className="relative font-medium">
                    {trait && <TraitFamille trait={trait} niveau={niveau} />}
                    <div style={lien ? { marginLeft: 12 + (niveau - 1) * 18 } : trait ? { paddingLeft: 12 } : undefined}>
                    {lien && (
                      <div className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RELATIONS[lien.type].pastille}`}>
                        <CornerDownRight className="size-3" aria-hidden />
                        {lien.texte}
                      </div>
                    )}
                    <div>{n.libelle}</div>
                    <ResumeFamille enfants={enfants} />
                    {/* Mutation signée : la base du personnel attend le bouton de la note (06/11/2026) */}
                    {n.module === "MUTATION" && n.statut === "SIGNEE" && (
                      <div className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${n.reportePersonnelLe ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>
                        {n.reportePersonnelLe ? "Reportée dans la base du personnel" : "À importer dans la base du personnel"}
                      </div>
                    )}
                    {/* Notes réunies : un menu déroulant les montre une à une (DG, 01/11/2026) */}
                    {n.reunion && (
                      <button
                        type="button"
                        onClick={() => basculer(n.id)}
                        aria-expanded={ouvertes.has(n.id)}
                        className="mt-1.5 flex items-center gap-1.5 rounded-full bg-sky-100 py-1 pl-2 pr-3 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-200"
                        title={ouvertes.has(n.id) ? "Masquer les notes réunies" : "Voir les notes réunies"}
                      >
                        <ChevronRight className={`size-3.5 transition-transform ${ouvertes.has(n.id) ? "rotate-90" : ""}`} aria-hidden />
                        <Layers className="size-3.5" aria-hidden />
                        {n.reunion.lots.length} notes réunies
                      </button>
                    )}
                    <div className="text-xs font-normal text-zinc-500">Année scolaire {n.anneeScolaire}</div>
                    {/* Date de préparation, pour s'y retrouver (DG, 01/11/2026) */}
                    <div className="text-xs font-normal text-zinc-400">
                      Préparée {quand(n.creeLe)}
                      {n.valideeLe && ` · validée ${quand(n.valideeLe)}`}
                    </div>
                    {n.commentaire && n.statut === "BROUILLON" && <div className="text-xs font-normal text-rouge-600">Renvoyée par le DG : {n.commentaire}</div>}
                    </div>
                  </td>
                  <td className="text-right tabular-nums">
                    {n.total}
                    {!!n.enAttente && ["BROUILLON", "SOUMISE"].includes(n.statut) && (
                      <div className="text-[11px] font-medium text-or-700">
                        {n.module === "MUTATION" ? `+ ${n.enAttente} accordée(s) hors de la note : points à vérifier` : `+ ${n.enAttente} retenu(s) sans département retenu : à placer`}
                      </div>
                    )}
                    {n.total === 0 && !n.enAttente && ["BROUILLON", "SOUMISE"].includes(n.statut) && <div className="text-[11px] font-medium text-or-700">vide : à supprimer</div>}
                  </td>
                  <td className="whitespace-nowrap">{n.cycle ? <Badge ton="bleu">{n.cycle}</Badge> : <span className="text-zinc-400">—</span>}</td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      <Badge ton={STATUT_NOTE[n.statut].ton}>{STATUT_NOTE[n.statut].libelle}</Badge>
                      <Aide>{STATUT_NOTE[n.statut].aide}</Aide>
                    </span>
                  </td>
                  <td className="text-xs">{n.numero ? `N° ${n.numero} du ${dateCourte(n.dateSignature)}` : "—"}</td>
                  <td className="text-xs text-zinc-600">
                    Préparée par {n.creePar ?? "—"}
                    {n.soumisePar && <div>Soumise par {n.soumisePar}</div>}
                    {n.valideePar && <div>Validée par {n.valideePar} le {dateCourte(n.valideeLe)}</div>}
                  </td>
                  <td>
                    <Link href={`/note/${n.id}`}>
                      <Bouton variante="discret">Ouvrir</Bouton>
                    </Link>
                  </td>
                </tr>
                {n.reunion && ouvertes.has(n.id) && (
                  <>
                    {n.reunion.lots.map((l, i) => (
                      <tr key={l.id} className="bg-sky-50/60 text-[13px]">
                        <td className="!py-2">
                          <div className="flex items-center gap-2 border-l-2 border-sky-300 pl-3">
                            <CornerDownRight className="size-3.5 shrink-0 text-sky-500" aria-hidden />
                            <span className="whitespace-nowrap font-medium text-encre">{l.libelle}</span>
                            {l.depart ? <Badge ton="bleu">note de départ</Badge> : <span className="whitespace-nowrap text-[11px] text-zinc-500">réunie ({i})</span>}
                          </div>
                        </td>
                        <td className="!py-2 text-right tabular-nums text-zinc-600">{l.total ?? "—"}</td>
                        <td className="!py-2" />
                        <td className="!py-2 text-[11px] text-zinc-500" colSpan={4}>
                          {l.depart ? "Les autres lots ont rejoint cette note" : "Dans la note ci-dessus"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-sky-50/60">
                      <td colSpan={7} className="!pt-1 !pb-3">
                        <div className="flex flex-wrap items-center gap-3 border-l-2 border-sky-300 pl-3 text-xs text-zinc-600">
                          <span>
                            {n.reunion.lots.length} lots, {n.total} agent(s) en une seule note.
                            {n.reunion.lots.some((l) => l.total === null) && " Note figée : le détail par lot n’est plus recalculé."}
                          </span>
                          {n.statut === "BROUILLON" && peut.traiter(profil.role) && (
                            <Bouton variante="discret" onClick={() => setASeparer(n)}>
                              <Unlink className="size-3.5" aria-hidden />
                              Séparer les lots
                            </Bouton>
                          )}
                        </div>
                      </td>
                    </tr>
                  </>
                )}
                </Fragment>
              ))}
            </tbody>
          </Tableau>
          </>
        )}
      </Carte>
    </div>
  );
}

/* ---------------- Notes d’enrôlement : familles (note, additifs, rectificatifs, lots) ---------------- */

type Relation = "ADDITIF" | "RECTIFICATIF" | "LOT";

/** Couleur et mot de chaque relation, les mêmes dans la liste et dans la légende (06/11/2026). */
const RELATIONS: Record<Relation, { mot: string; pastille: string; trait: string; aide: string }> = {
  ADDITIF: {
    mot: "Additif",
    pastille: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    trait: "border-emerald-300",
    aide: "ajoute des volontaires oubliés à une note déjà signée.",
  },
  RECTIFICATIF: {
    mot: "Rectificatif",
    pastille: "bg-amber-50 text-amber-800 ring-amber-200",
    trait: "border-amber-300",
    aide: "corrige une note signée (« au lieu de … lire … ») ou remplace une personne.",
  },
  LOT: {
    mot: "Lot",
    pastille: "bg-violet-50 text-violet-800 ring-violet-200",
    trait: "border-violet-300",
    aide: "une partie d’une note trop longue, découpée en notes plus petites.",
  },
};

interface Rangee {
  n: NoteResume;
  niveau: number;
  lien: { type: Relation; texte: string } | null;
  enfants: Record<Relation, number>;
  /** Place dans le trait de la famille : la mère, une fille, la dernière fille ; couleur de la famille. */
  trait?: { position: "mere" | "milieu" | "derniere"; couleur: number };
}

/** Une couleur par famille, pour distinguer deux familles qui se suivent. */
const COULEURS_FAMILLE = [
  { fond: "bg-violet-400", bord: "border-violet-400" },
  { fond: "bg-sky-400", bord: "border-sky-400" },
  { fond: "bg-emerald-400", bord: "border-emerald-400" },
  { fond: "bg-amber-400", bord: "border-amber-400" },
  { fond: "bg-rose-400", bord: "border-rose-400" },
];

/** Le trait de la famille dans la première cellule : il part de la mère et descend jusqu'à la dernière fille. */
function TraitFamille({ trait, niveau }: { trait: NonNullable<Rangee["trait"]>; niveau: number }) {
  const c = COULEURS_FAMILLE[trait.couleur % COULEURS_FAMILLE.length];
  const coude = 14 + (niveau - 1) * 18;
  if (trait.position === "mere")
    return (
      <>
        <span className={`absolute left-[3px] top-[1.05rem] size-2.5 rounded-full ring-2 ring-white ${c.fond}`} aria-hidden />
        <span className={`absolute -bottom-px left-[7px] top-[1.6rem] w-0.5 rounded-t-full ${c.fond}`} aria-hidden />
      </>
    );
  return (
    <>
      {trait.position === "milieu" && <span className={`absolute -bottom-px -top-px left-[7px] w-0.5 ${c.fond}`} aria-hidden />}
      <span className={`absolute -top-px left-[7px] h-[1.55rem] rounded-bl-lg border-b-2 border-l-2 ${c.bord}`} style={{ width: coude }} aria-hidden />
    </>
  );
}

function nomDeLaNote(p: NoteResume) {
  return p.numero ? `la note n° ${p.numero} du ${dateCourte(p.dateSignature)}` : `« ${p.libelle} »`;
}

/** Range chaque note sous celle dont elle dépend : additif, rectificatif, lot de rangement. */
function familles(notes: NoteResume[]): Rangee[] {
  const parId = new Map(notes.map((n) => [n.id, n]));
  const parent = new Map<string, { id: string; type: Relation }>();
  for (const n of notes) {
    if (n.additifDe && parId.has(n.additifDe)) parent.set(n.id, { id: n.additifDe, type: "ADDITIF" });
    else if (n.rectificatifDe && parId.has(n.rectificatifDe)) parent.set(n.id, { id: n.rectificatifDe, type: "RECTIFICATIF" });
    else if (n.lotRangement != null) {
      const p = notes.find(
        (x) =>
          x.id !== n.id &&
          x.lotRangement == null &&
          !x.additifDe &&
          !x.rectificatifDe &&
          x.typeNote === n.typeNote &&
          (n.module === "MUTATION" ? x.motif === n.motif : x.campagneId === n.campagneId),
      );
      if (p) parent.set(n.id, { id: p.id, type: "LOT" });
    }
  }
  const enfantsDe = new Map<string, NoteResume[]>();
  for (const n of notes) {
    const p = parent.get(n.id);
    if (p) enfantsDe.set(p.id, [...(enfantsDe.get(p.id) ?? []), n]);
  }
  const ordre: Relation[] = ["LOT", "ADDITIF", "RECTIFICATIF"];
  const res: Rangee[] = [];
  const vus = new Set<string>();
  const poser = (n: NoteResume, niveau: number) => {
    if (vus.has(n.id)) return;
    vus.add(n.id);
    const p = parent.get(n.id);
    const enfants = (enfantsDe.get(n.id) ?? []).sort(
      (a, b) => ordre.indexOf(parent.get(a.id)!.type) - ordre.indexOf(parent.get(b.id)!.type) || (a.lotRangement ?? 0) - (b.lotRangement ?? 0),
    );
    const compte = { ADDITIF: 0, RECTIFICATIF: 0, LOT: 0 };
    for (const e of enfants) compte[parent.get(e.id)!.type]++;
    res.push({
      n,
      niveau,
      lien: p
        ? {
            type: p.type,
            texte:
              p.type === "LOT"
                ? `Lot ${n.lotRangement} : une partie de la note ci-dessus`
                : `${RELATIONS[p.type].mot} ${p.type === "ADDITIF" ? "à" : "de"} ${nomDeLaNote(parId.get(p.id)!)}`,
          }
        : null,
      enfants: compte,
    });
    for (const e of enfants) poser(e, niveau + 1);
  };
  for (const n of notes) if (!parent.has(n.id)) poser(n, 0);
  for (const n of notes) poser(n, 0); // filet : une boucle de parents ne fait rien disparaître
  // Le trait de chaque famille : de la mère jusqu'à la dernière note faite à partir d'elle
  let couleur = 0;
  for (let i = 0; i < res.length; i++) {
    if (res[i].niveau !== 0) continue;
    let fin = i;
    while (fin + 1 < res.length && res[fin + 1].niveau > 0) fin++;
    if (fin === i) continue;
    res[i].trait = { position: "mere", couleur };
    for (let k = i + 1; k <= fin; k++) res[k].trait = { position: k === fin ? "derniere" : "milieu", couleur };
    couleur++;
  }
  return res;
}

/** Les pastilles « 2 lots », « 1 additif »… d’une note principale. */
function ResumeFamille({ enfants }: { enfants: Record<Relation, number> }) {
  const mots: [Relation, string][] = [
    ["LOT", "lot"],
    ["ADDITIF", "additif"],
    ["RECTIFICATIF", "rectificatif"],
  ];
  const presents = mots.filter(([r]) => enfants[r] > 0);
  if (!presents.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {presents.map(([r, mot]) => (
        <span key={r} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RELATIONS[r].pastille}`}>
          {enfants[r]} {mot}
          {enfants[r] > 1 ? "s" : ""} ci-dessous
        </span>
      ))}
    </div>
  );
}

/** Légende : ce que veut dire chaque couleur. */
function LegendeFamilles() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[12px] text-zinc-600">
      <span className="font-semibold text-encre">Comment lire la liste : chaque note est suivie, en retrait, des notes faites à partir d’elle ; un trait de couleur les relie, de la note mère à la dernière.</span>
      {(Object.keys(RELATIONS) as Relation[]).map((r) => (
        <span key={r} className="inline-flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RELATIONS[r].pastille}`}>↳ {RELATIONS[r].mot}</span>
          {RELATIONS[r].aide}
        </span>
      ))}
    </div>
  );
}
