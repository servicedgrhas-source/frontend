"use client";

import { ArrowRight, CheckCircle2, FileSignature, Paperclip, Scale, Users, X } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Aide, Alerte, Bouton, Champ, Liste, Modale, Saisie, SaisieDate, Zone, cx } from "@/components/ui";
import { GENERE_PAR, type ActeModule, type ChampPrestation, type DefinitionPrestation, type LettreTransmission } from "@/lib/prestations";

/**
 * Éléments communs des demandes de prestations (application et portail) : ce qu'est la démarche
 * (pour qui, acte délivré, qui décide, par où elle passe), ses renseignements propres, les pièces
 * à joindre, et l'acte proposé une fois la demande accordée.
 */

/** Carte d'identité de la démarche, d'après le document de la DGRHAS. */
export function PresentationPrestation({ def, portail, sansCircuit }: { def: DefinitionPrestation; portail?: boolean; sansCircuit?: boolean }) {
  const externes = def.circuit.filter((e) => e.phase === "EXTERNE");
  const internes = def.circuit.filter((e) => e.phase === "INTERNE");
  return (
    <div className={cx("space-y-3 rounded-2xl bg-marque-50/60 p-4 ring-1 ring-marque-100", portail ? "text-[14px]" : "text-[13px]")}>
      <p className="flex gap-2 text-zinc-700">
        <Users className="mt-0.5 size-4 shrink-0 text-marque-700" />
        <span>
          <strong>Pour qui ?</strong> {def.pourQui}
        </span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex gap-2 rounded-xl bg-white px-3 py-2">
          <FileSignature className="mt-0.5 size-4 shrink-0 text-marque-700" />
          <span>
            <span className="block text-[11px] text-zinc-500">Acte délivré</span>
            <strong>{def.acte}</strong>
            <span className="block text-[11px] text-zinc-500">signé par {def.signataire.replace(/^Le /, "le ")}</span>
          </span>
        </div>
        <div className="flex gap-2 rounded-xl bg-white px-3 py-2">
          <Scale className="mt-0.5 size-4 shrink-0 text-marque-700" />
          <span>
            <span className="block text-[11px] text-zinc-500">Niveau de décision</span>
            <strong>{def.niveauDecision}</strong>
          </span>
        </div>
      </div>
      {!sansCircuit && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
            Par où passe la demande
            {!portail && (
              <Aide>
                <strong>Voie hiérarchique</strong> : chaque niveau vise le dossier et donne un avis favorable ou un rejet, toujours motivé. Favorable ou non, le dossier
                monte au niveau suivant (la rétention est interdite). Puis le <strong>circuit interne</strong> de la DGRHAS (bureau, service, direction, DG). Le
                dernier niveau décide : accordée, rejetée ou en instance.
              </Aide>
            )}
          </div>
          <ol className="flex flex-wrap items-center gap-1.5">
            {[...externes, ...internes].map((e, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="size-3.5 text-zinc-300" />}
                <span
                  title={e.nom ?? undefined}
                  className={cx("rounded-full px-2.5 py-0.5 text-[12px] ring-1", e.phase === "EXTERNE" ? "bg-white ring-zinc-200" : "bg-nuit text-white ring-nuit")}
                >
                  {e.libelle}
                  {e.nom && !portail && <span className="ml-1 text-[11px] text-white/60">· {e.nom}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const CHAMP_PORTAIL = "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[16px] outline-none focus:border-marque-300 focus:ring-4 focus:ring-marque-100";

/** Renseignements propres à la prestation (département souhaité, poste sollicité…). */
export function ChampsPrestation({
  def,
  valeurs,
  changer,
  departements,
  portail,
}: {
  def: DefinitionPrestation;
  valeurs: Record<string, string>;
  changer: (cle: string, v: string) => void;
  departements: { id: number; nom: string }[];
  portail?: boolean;
}) {
  if (!def.champs.length) return null;
  return (
    <div className={cx("grid gap-3", !portail && "sm:grid-cols-2")}>
      {def.champs.map((c) => (
        <div key={c.cle} className={cx(c.type === "zone" && "sm:col-span-2")}>
          {portail ? <ChampPortail c={c} v={valeurs[c.cle] ?? ""} changer={(v) => changer(c.cle, v)} departements={departements} /> : <ChampAppli c={c} v={valeurs[c.cle] ?? ""} changer={(v) => changer(c.cle, v)} departements={departements} />}
        </div>
      ))}
    </div>
  );
}

const optionsDe = (c: ChampPrestation, departements: { id: number; nom: string }[]) =>
  c.type === "departement" ? departements.map((d) => ({ valeur: String(d.id), libelle: d.nom })) : (c.options ?? []);

function ChampAppli({ c, v, changer, departements }: { c: ChampPrestation; v: string; changer: (v: string) => void; departements: { id: number; nom: string }[] }) {
  const libelle = `${c.libelle}${c.obligatoire ? " *" : ""}`;
  return (
    <Champ libelle={libelle} aide={c.aide}>
      {c.type === "departement" || c.type === "liste" ? (
        <Liste value={v} vide="— Choisir —" onChange={(e) => changer(e.target.value)} options={optionsDe(c, departements)} />
      ) : c.type === "zone" ? (
        <Zone value={v} rows={2} placeholder={c.exemple} onChange={(e) => changer(e.target.value)} />
      ) : c.type === "date" ? (
        // Date tapée (jj/mm/aaaa) ou choisie au calendrier
        <SaisieDate value={v} onChange={changer} aria-label={c.libelle} />
      ) : (
        <Saisie value={v} placeholder={c.exemple} onChange={(e) => changer(e.target.value)} />
      )}
    </Champ>
  );
}

function ChampPortail({ c, v, changer, departements }: { c: ChampPrestation; v: string; changer: (v: string) => void; departements: { id: number; nom: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium">
        {c.libelle}
        {c.obligatoire && <span className="text-rouge-600"> *</span>}
      </span>
      {c.type === "departement" || c.type === "liste" ? (
        <select className={CHAMP_PORTAIL} value={v} onChange={(e) => changer(e.target.value)}>
          <option value="">— Choisir —</option>
          {optionsDe(c, departements).map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      ) : c.type === "zone" ? (
        <textarea className={CHAMP_PORTAIL} rows={3} value={v} placeholder={c.exemple} onChange={(e) => changer(e.target.value)} />
      ) : (
        <input className={CHAMP_PORTAIL} type={c.type === "date" ? "date" : "text"} value={v} placeholder={c.exemple} onChange={(e) => changer(e.target.value)} />
      )}
      {c.aide && <span className="mt-1 block text-[12px] text-zinc-500">{c.aide}</span>}
    </label>
  );
}

/** Champs obligatoires encore vides (pour griser l'envoi et le dire). */
export function champsManquants(def: DefinitionPrestation, valeurs: Record<string, string>) {
  return def.champs.filter((c) => c.obligatoire && !valeurs[c.cle]?.trim()).map((c) => c.libelle);
}

export interface PieceChoisie {
  libelle: string;
  fichier: File;
}

/**
 * Pièces exigées par le document de la DGRHAS, chacune avec son bouton « Joindre ». Seule la
 * demande manuscrite est indispensable à l'envoi ; les autres manquantes restent signalées dans
 * le dossier, pour être ajoutées ensuite.
 */
export function PiecesAJoindre({
  def,
  pieces,
  changer,
  erreur,
  portail,
}: {
  def: DefinitionPrestation;
  pieces: PieceChoisie[];
  changer: (p: PieceChoisie[]) => void;
  erreur: (t: string | null) => void;
  portail?: boolean;
}) {
  const liste = [...def.pieces, { libelle: "Autre pièce", obligatoire: false, aide: undefined }];
  return (
    <div className="space-y-2">
      {liste.map((p, i) => {
        const choisis = pieces.filter((x) => x.libelle === p.libelle);
        const indispensable = i === 0;
        return (
          <div key={p.libelle} className={cx("rounded-2xl px-3 py-2.5 ring-1", choisis.length ? "bg-marque-50 ring-marque-200" : indispensable ? "ring-or-400/60" : "ring-zinc-200", portail ? "text-[14px]" : "text-[13px]")}>
            <div className="flex flex-wrap items-center gap-2">
              {choisis.length ? <CheckCircle2 className="size-4 shrink-0 text-marque-600" /> : <span className={cx("size-4 shrink-0 rounded-full ring-2", indispensable ? "ring-or-400" : "ring-zinc-300")} />}
              <span className="min-w-0 flex-1">
                <span className="font-medium">{p.libelle}</span>
                {indispensable ? <span className="ml-1.5 rounded-full bg-or-100 px-2 py-0.5 text-[11px] text-or-700">indispensable</span> : p.obligatoire ? <span className="ml-1.5 text-[11px] text-zinc-400">exigée</span> : null}
                {p.aide && <span className="block text-[11px] text-zinc-500">{p.aide}</span>}
              </span>
              <label className={cx("cursor-pointer rounded-full font-medium", portail ? "bg-nuit px-4 py-2 text-[13px] text-white" : "px-2 text-[12px] text-marque-700 underline")}>
                {choisis.length ? "Ajouter" : "Joindre"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const tous = Array.from(e.target.files ?? []);
                    const ok = tous.filter((x) => x.size <= 10 * 1024 * 1024);
                    erreur(ok.length < tous.length ? `Trop lourd (10 Mo au plus), non joint : ${tous.filter((x) => !ok.includes(x)).map((x) => x.name).join(", ")}.` : null);
                    changer([...pieces, ...ok.map((fichier) => ({ libelle: p.libelle, fichier }))].slice(0, 15));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {choisis.map((x) => (
              <div key={x.fichier.name + x.fichier.size} className="mt-1.5 flex items-center gap-2 pl-6 text-[12px] text-zinc-600">
                <Paperclip className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{x.fichier.name}</span>
                <button type="button" aria-label="Retirer ce fichier" className="rounded-full p-1 hover:bg-white" onClick={() => changer(pieces.filter((y) => y !== x))}>
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        );
      })}
      {(() => {
        const manque = def.pieces.filter((p) => p.obligatoire && !pieces.some((x) => x.libelle === p.libelle)).length;
        return manque > 0 && pieces.some((x) => x.libelle === def.pieces[0].libelle) ? (
          <p className="text-[12px] text-zinc-500">
            {manque === 1
              ? "1 pièce exigée n’est pas encore jointe : la demande peut partir, elle sera signalée « à fournir » dans le dossier."
              : `${manque} pièces exigées ne sont pas encore jointes : la demande peut partir, elles seront signalées « à fournir » dans le dossier.`}
          </p>
        ) : null;
      })()}
    </div>
  );
}

/* ------------------------------ Acte proposé ------------------------------ */

const SEP = <div className="leading-none">-------------------</div>;
const dateLongue = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

/**
 * Acte proposé pour une demande accordée (modèle provisoire en attendant les modèles officiels) :
 * en-tête du ministère, titre, articles, signataire, ampliations. Le n° est donné à la signature.
 */
export function ActeModuleImprime({ a, a4 = true }: { a: ActeModule; a4?: boolean }) {
  const classe = a4 ? "page-a4" : "rounded-2xl bg-white p-5 text-[13px] shadow-doux print:shadow-none";
  const decret = a.entete === "PRIMATURE";
  if (a.transmission) return <LettreTransmissionImprimee l={a.transmission} a4={a4} />;
  if (a.officiel) return <ActeOfficielImprime a={a} a4={a4} />;
  if (a.forme === "LETTRE" && a.lettre) return <LettreImprimee a={a} classe={classe} a4={a4} />;
  return (
    <div className={classe} style={a4 ? ({ "--marge-haut": "14mm", "--marge-cote": "18mm" } as CSSProperties) : undefined}>
      <div className="flex justify-between gap-4 text-[8.5pt]">
        <div className="w-[58%] text-center font-bold leading-tight">
          {decret ? (
            <>
              <div>PRIMATURE</div>
              {SEP}
            </>
          ) : (
            <>
              <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
              <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
              {SEP}
              {a.entete === "STRUCTURE" ? (
                <>
                  <div className="uppercase">{a.structure ?? "Lieu de service"}</div>
                  {SEP}
                </>
              ) : a.entete === "DDEPPSA" ? (
                <>
                  <div>DIRECTION DEPARTEMENTALE</div>
                  {SEP}
                </>
              ) : (
                <>
                  <div>CABINET</div>
                  {SEP}
                  <div>DIRECTION GENERALE DES RESSOURCES HUMAINES ET DE L’ADMINISTRATION SCOLAIRE</div>
                  {SEP}
                </>
              )}
            </>
          )}
          <div>N° ……………… {decret || a.entete === "STRUCTURE" ? "" : a.entete === "DDEPPSA" ? "/MEPPSA/DDEPPSA" : "/MEPPSA/CAB/DGRHAS"}</div>
        </div>
        <div className="w-[36%] text-center leading-tight">
          <div className="font-bold">REPUBLIQUE DU CONGO</div>
          <div className="font-semibold">Unité-Travail-Progrès</div>
          {SEP}
        </div>
      </div>

      <div className="mt-10 mb-8 text-center">
        <div className="text-[14pt] font-bold uppercase tracking-wide">{a.titre}</div>
        <div className="mt-1 text-[10pt]">
          <span className="font-semibold">Référence :</span> DEMANDE DE PRESTATION n° {a.reference} du {dateLongue(a.demande.date)}
        </div>
      </div>

      <div className="space-y-4 text-justify text-[11pt] leading-relaxed">
        {a.preambule.map((t) => (
          <p key={t} className="italic">
            {t}
          </p>
        ))}
        {a.formule && <p className="text-center font-bold">{a.formule} :</p>}
        {a.articles.map((t, i) =>
          a.forme === "TEXTE" ? (
            <p key={i} className="indent-8">
              {t}
            </p>
          ) : (
            <p key={i}>
              <strong>Article {i === 0 ? "1er" : i + 1} :</strong> {t}
            </p>
          ),
        )}
      </div>

      <div className="mt-12 flex justify-end text-[11pt]">
        <div className="w-[50%] text-center">
          <div>
            Fait à {a.lieu}, le {decret ? "………………" : dateLongue(a.decisionLe)}
          </div>
          <div className="mt-3 font-bold">{a.signataire},</div>
          <div className="mt-20" />
        </div>
      </div>
      <div className="mt-6 text-[9pt]">
        <div className="font-bold underline">Ampliations :</div>
        {a.ampliations.map((x) => (
          <div key={x}>- {x}</div>
        ))}
      </div>
      {a4 && <MentionGenere />}
    </div>
  );
}

/**
 * Acte d'après un modèle officiel de la DGRHAS (photo de l'autorisation de tutelle, 04/11/2026) :
 * l'en-tête jusqu'au service, le n° et son suffixe, le titre et son sous-titre, le texte, « Fait à
 * Brazzaville, le » et le nom du Directeur général, les ampliations comptées, « PJ : … » et
 * l'adresse en pied de page.
 */
function ActeOfficielImprime({ a, a4 }: { a: ActeModule; a4: boolean }) {
  const o = a.officiel!;
  const ampl = a.ampliationsComptees ?? a.ampliations.map((libelle) => ({ libelle, nombre: 1 }));
  const total = ampl.reduce((n, x) => n + x.nombre, 0);
  return (
    <div className={a4 ? "page-a4 text-black" : "rounded-2xl bg-white p-5 text-[13px] shadow-doux print:shadow-none"} style={a4 ? ({ "--marge-haut": "14mm", "--marge-cote": "18mm" } as CSSProperties) : undefined}>
      <div className="flex justify-between gap-4 text-[9.5pt]">
        <div className="w-[60%] text-center font-semibold leading-tight">
          <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE,</div>
          <div>PRIMAIRE, SECONDAIRE ET DE L’ALPHABETISATION</div>
          <div className="leading-none">*******************</div>
          <div>CABINET</div>
          <div className="leading-none">*******************</div>
          <div>DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
          <div>ET DE L’ADMINISTRATION SCOLAIRE</div>
          <div className="leading-none">*******************</div>
          {o.services.map((x) => (
            <div key={x}>
              <div>{x}</div>
              <div className="leading-none">*******************</div>
            </div>
          ))}
          <div className="mt-1 whitespace-nowrap">N°______________/{o.suffixeNumero}</div>
        </div>
        <div className="w-[34%] text-center leading-tight">
          <div className="font-semibold">REPUBLIQUE DU CONGO</div>
          <div>Unité-Travail-Progrès</div>
          <div className="leading-none">**********</div>
        </div>
      </div>

      <div className="mt-10 mb-6 text-center">
        <div className="text-[15pt] font-bold uppercase tracking-wide">{a.titre}</div>
        {o.sousTitre && <div className="text-[9pt] italic">{o.sousTitre}</div>}
      </div>

      <div className="space-y-4 text-justify text-[12pt] leading-relaxed">
        {a.articles.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>

      <div className="mt-8 flex justify-end text-[12pt]" style={{ breakInside: "avoid" }}>
        <div className="w-[48%] text-center">
          <div>Fait à {a.lieu}, le</div>
          <div className="h-[24mm]" />
          <div className="font-bold">{o.signataireNom ?? ""}</div>
        </div>
      </div>

      <div className="mt-4 w-[55mm] text-[10pt]">
        <div className="font-bold underline">Ampliations</div>
        {ampl.map((x, i) => (
          <div key={x.libelle} className="flex items-end gap-1">
            <span>{x.libelle}</span>
            <span className="mb-[3px] flex-1 border-b border-dotted border-black" />
            <span>
              {x.nombre}
              {i === ampl.length - 1 ? `/${String(total).padStart(2, "0")}` : ""}
            </span>
          </div>
        ))}
      </div>

      {a4 && (
        <div className="absolute right-[18mm] bottom-[8mm] left-[18mm] text-[8pt]">
          {o.pj && (
            <div>
              <strong>PJ :</strong> {o.pj}
            </div>
          )}
          <div className="mt-1 border-t border-black pt-0.5 font-semibold">{o.adresse}</div>
          <div className="mt-1 text-center text-[7pt] italic text-zinc-600">{GENERE_PAR}</div>
        </div>
      )}
    </div>
  );
}

/** En bas de page, à la place du lien du portail (DG, 03/11/2026). */
export function MentionGenere({ fixe = true }: { fixe?: boolean }) {
  return (
    <div className={cx("text-center text-[7.5pt] italic text-zinc-600", fixe ? "absolute right-[18mm] bottom-[8mm] left-[18mm]" : "mt-10")}>
      {GENERE_PAR}
    </div>
  );
}

/**
 * Barre sous une ligne de l'en-tête : des « _ », courte et centrée (remarque du 05/11/2026), qui ne
 * prend pas toute la largeur du bloc.
 */
const Barre = ({ n = 8 }: { n?: number }) => <div className="-mt-[0.35em] leading-none">{"_".repeat(n)}</div>;

/**
 * Le paragraphe avec ce qui ressort : la demande (« une (01) demande de … ») en gras et soulignée,
 * le nom de l'intéressé en gras — aussi dans un texte modifié à la main, là où ces mots y sont.
 */
function TexteMisEnValeur({ texte, m }: { texte: string; m: LettreTransmission["miseEnValeur"] }) {
  const marques = [...m.grasSouligne.map((t) => ({ t, souligne: true })), ...m.gras.map((t) => ({ t, souligne: false }))].filter((x) => x.t);
  const morceaux: { t: string; style: "" | "gras" | "souligne" }[] = [];
  let reste = texte;
  while (reste) {
    let premier: { i: number; t: string; souligne: boolean } | null = null;
    for (const x of marques) {
      const i = reste.indexOf(x.t);
      if (i >= 0 && (!premier || i < premier.i)) premier = { i, ...x };
    }
    if (!premier) {
      morceaux.push({ t: reste, style: "" });
      break;
    }
    if (premier.i > 0) morceaux.push({ t: reste.slice(0, premier.i), style: "" });
    morceaux.push({ t: premier.t, style: premier.souligne ? "souligne" : "gras" });
    reste = reste.slice(premier.i + premier.t.length);
  }
  return (
    <>
      {morceaux.map((x, i) =>
        x.style === "souligne" ? (
          <strong key={i} className="underline">
            {x.t}
          </strong>
        ) : x.style === "gras" ? (
          <strong key={i}>{x.t}</strong>
        ) : (
          <span key={i}>{x.t}</span>
        ),
      )}
    </>
  );
}

/**
 * Soit-transmis comme les modèles Word de la DGRHAS (dossier « word ») : en-tête du ministère au
 * service du suivi des carrières (pas en gras, barres courtes) et le n° ; à droite la République,
 * « Brazzaville, le », l'expéditeur et le destinataire en gras, « - Brazzaville - » ; « Objet »
 * souligné ; l'appel, le paragraphe (14 pt, la demande soulignée et le nom en gras) ou le tableau
 * des agents ; la formule de politesse et le nom du signataire. La feuille s'allonge avec le tableau.
 */
export function LettreTransmissionImprimee({ l, a4 = true, corps }: { l: LettreTransmission; a4?: boolean; corps?: string }) {
  const cellule = "border border-black px-1.5 py-1 align-top";
  const retrait = "indent-[1.25cm]";
  return (
    <div
      className={a4 ? "relative mx-auto mb-[8mm] box-border w-[210mm] bg-white px-[18mm] pt-[12mm] pb-[20mm] text-black shadow-doux print:mb-0 print:shadow-none" : "rounded-2xl bg-white p-5 text-[13px] shadow-doux print:shadow-none"}
      style={a4 ? { minHeight: "296mm", fontFamily: "'Agency FB', 'Arial Narrow', 'Roboto Condensed', Arial, sans-serif" } : undefined}
    >
      <div className="flex items-start justify-between gap-6 text-[12pt]">
        <div className="w-[56%] text-center leading-tight">
          <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
          <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
          <Barre n={12} />
          <div className="mt-1">CABINET</div>
          <Barre />
          <div className="mt-1">DIRECTION GENERALE DES RESSOURCES HUMAINES</div>
          <div>ET DE L’ADMINISTRATION SCOLAIRE</div>
          <Barre n={12} />
          <div className="mt-1">DIRECTION DES RECRUTEMENTS ET DU SUIVI</div>
          <div>DES CARRIERES</div>
          <Barre n={10} />
          <div className="mt-1">SERVICE DU SUIVI DES CARRIERES</div>
          <Barre n={10} />
          <div className="mt-2 whitespace-nowrap text-left">N°______________/{l.suffixeNumero}</div>
        </div>
        <div className="w-[40%] text-center leading-tight">
          <div>REPUBLIQUE DU CONGO</div>
          <div className="text-[10pt]">Unité-Travail-Progrès</div>
          <Barre n={7} />
          <div className="mt-6 text-[14pt]">{l.lieu}, le</div>
          <div className="mt-4 space-y-0.5 text-[14pt] font-bold">
            <div>{l.expediteur}</div>
            <div>à</div>
            <div>{l.destinataire}</div>
            <div>- {l.lieu} -</div>
          </div>
        </div>
      </div>

      <div className="mt-8 pl-[2.5mm] text-[14pt] leading-snug">
        <div>
          <strong className="underline">Objet</strong> : {l.objet[0]}
        </div>
        <div className="pl-[4.1em]">{l.objet[1]}</div>
      </div>

      <div className="mt-6 space-y-4 text-justify text-[14pt] leading-relaxed">
        <p className={retrait}>{l.appel}</p>
        <p className={retrait}>
          <TexteMisEnValeur texte={corps ?? l.corps} m={l.miseEnValeur} />
        </p>
      </div>

      {l.collective && (
        <table className="mt-3 w-full border-collapse text-[10pt]">
          <thead>
            <tr className="font-bold">
              <th className={`${cellule} w-[6%] text-center`}>N°</th>
              <th className={`${cellule} text-left`}>Noms et Prénoms</th>
              {l.colonnes.map((c) => (
                <th key={c.cle} className={`${cellule} text-center`}>
                  {c.libelle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {l.lignes.map((x) => (
              <tr key={x.reference} style={{ breakInside: "avoid" }}>
                <td className={`${cellule} text-center`}>{x.numero}</td>
                <td className={cellule}>{x.nomComplet}</td>
                {x.valeurs.map((v, i) => (
                  <td key={i} className={`${cellule} text-center`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className={`mt-5 text-justify text-[14pt] leading-relaxed ${retrait}`}>{l.politesse}</p>

      <div className="mt-6 flex justify-end text-[14pt]" style={{ breakInside: "avoid" }}>
        <div className="w-[45%] text-center">
          <div className="h-[22mm]" />
          <div className="font-bold">{l.signataireNom ?? ""}</div>
        </div>
      </div>
      {a4 && <MentionGenere />}
    </div>
  );
}

/** Soit-transmis ou lettre de transmission : à qui, objet, appel, texte, tableau des pièces du dossier. */
function LettreImprimee({ a, classe, a4 }: { a: ActeModule; classe: string; a4: boolean }) {
  const l = a.lettre!;
  const cellule = "border border-black px-2 py-1";
  return (
    <div className={classe} style={a4 ? ({ "--marge-haut": "14mm", "--marge-cote": "18mm" } as CSSProperties) : undefined}>
      <div className="flex justify-between gap-4 text-[8.5pt]">
        <div className="w-[58%] text-center font-bold leading-tight">
          <div>MINISTERE DE L’ENSEIGNEMENT PRESCOLAIRE, PRIMAIRE,</div>
          <div>SECONDAIRE ET DE L’ALPHABETISATION</div>
          {SEP}
          <div>CABINET</div>
          {SEP}
          <div>DIRECTION GENERALE DES RESSOURCES HUMAINES ET DE L’ADMINISTRATION SCOLAIRE</div>
          {SEP}
          <div className="font-normal">N° ……………… /MEPPSA/CAB/DGRHAS</div>
        </div>
        <div className="w-[36%] text-center leading-tight">
          <div className="font-bold">REPUBLIQUE DU CONGO</div>
          <div className="font-semibold">Unité-Travail-Progrès</div>
          {SEP}
        </div>
      </div>
      <div className="mt-6 text-right text-[11pt]">
        {a.lieu}, le {dateLongue(a.decisionLe)}
      </div>
      <div className="mt-5 ml-[45%] space-y-2 text-[11pt]">
        <div className="font-bold">{a.signataire}</div>
        <div>À</div>
        <div className="font-bold">{l.destinataire}</div>
        <div className="font-bold underline">{a.lieu.toUpperCase()}.</div>
      </div>
      <div className="mt-6 text-[11pt]">
        <span className="font-bold underline">Objet</span> : {a.titre} — {l.objet}.
        <div className="text-[9.5pt] text-zinc-600">Réf. : demande de prestation n° {a.reference} du {dateLongue(a.demande.date)}</div>
      </div>
      <div className="mt-5 space-y-3 text-justify text-[11pt] leading-relaxed">
        <p>{l.appel}</p>
        {a.articles.map((t, i) => (
          <p key={i} className="indent-8">
            {t}
          </p>
        ))}
      </div>
      {a.piecesJointes.length > 0 && (
        <table className="mt-4 w-full border-collapse text-[10pt]">
          <thead>
            <tr>
              <th className={`${cellule} w-10`}>N°</th>
              <th className={`${cellule} text-left`}>Désignation des pièces</th>
              <th className={`${cellule} w-20`}>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {a.piecesJointes.map((p, i) => (
              <tr key={p.libelle}>
                <td className={`${cellule} text-center`}>{i + 1}</td>
                <td className={cellule}>{p.libelle}</td>
                <td className={`${cellule} text-center`}>{String(p.nombre).padStart(2, "0")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-12 flex justify-end text-[11pt]">
        <div className="w-[50%] text-center">
          <div className="font-bold">{a.signataire},</div>
          <div className="mt-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * « Modifier l'introduction » du soit-transmis (comme pour les notes) : le paragraphe s'écrit à la
 * main ; la demande et le nom de l'intéressé restent mis en valeur là où ils sont encore écrits.
 */
export function ModifierIntroduction({
  texte,
  modifie,
  fermer,
  enregistrer,
  memoire,
}: {
  texte: string;
  modifie: boolean;
  fermer: () => void;
  /** Texte vide : le paragraphe du modèle revient. */
  enregistrer: (texte: string) => Promise<void> | void;
  /** Gardé avec la demande (une demande) ou seulement pour cette impression (plusieurs). */
  memoire: "demande" | "impression";
}) {
  const [t, setT] = useState(texte);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const faire = async (v: string) => {
    setEnCours(true);
    setErreur(null);
    try {
      await enregistrer(v);
      fermer();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  };
  return (
    <Modale titre="Modifier l’introduction" ouverte fermer={fermer} large>
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <p className="text-[13px] text-zinc-600">
          Le paragraphe du soit-transmis.{" "}
          {memoire === "demande" ? "Il est gardé avec la demande : on le retrouve à la prochaine impression." : "Il vaut pour cette impression (plusieurs demandes)."} La demande
          et le nom de l’intéressé restent en gras là où ils sont écrits.
        </p>
        {/* Toute la largeur de la fenêtre, assez haut pour lire le paragraphe entier (retour du 05/11/2026) */}
        <Zone rows={10} className="block min-h-[45vh] w-full text-[15px] leading-relaxed" value={t} onChange={(e) => setT(e.target.value)} />
        <div className="flex flex-wrap justify-end gap-2">
          {modifie && (
            <Bouton disabled={enCours} onClick={() => faire("")}>
              Revenir au texte du modèle
            </Bouton>
          )}
          <Bouton onClick={fermer}>Annuler</Bouton>
          <Bouton variante="principal" disabled={enCours || !t.trim()} onClick={() => faire(t)}>
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Modale>
  );
}
