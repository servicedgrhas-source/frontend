"use client";

import { CheckCircle2, Copy, UserCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChampsPrestation, champsManquants, PiecesAJoindre, PresentationPrestation, type PieceChoisie } from "@/components/prestations";
import type { DefinitionPrestation } from "@/lib/prestations";
import { appelPublic, type ReferencesPortail } from "@/lib/portail";

const CHAMP = "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[16px] outline-none focus:border-marque-300 focus:ring-4 focus:ring-marque-100";
const BOUTON = "w-full rounded-2xl bg-nuit px-5 py-4 text-[15px] font-semibold text-white disabled:opacity-40";

interface Reconnu {
  jeton: string;
  agent: { nomComplet: string; grade: string | null; lieuService: string | null; departement: string | null };
}

/**
 * Demande de prestation sur le portail, en trois étapes : l'agent se fait reconnaître dans la base du
 * personnel (matricule, ou nom, et date de naissance), remplit sa demande, joint ses pièces.
 */
export default function PrestationPortail() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-zinc-400">Chargement…</p>}>
      <Formulaire />
    </Suspense>
  );
}

function Etape({ n, titre, fait, children }: { n: number; titre: string; fait?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl bg-white p-5 shadow-doux">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold">
        <span className={`inline-flex size-7 items-center justify-center rounded-full text-[13px] ${fait ? "bg-marque-500 text-white" : "bg-or-400 text-encre"}`}>{fait ? "✓" : n}</span>
        {titre}
      </h2>
      {children}
    </section>
  );
}

function Formulaire() {
  const code = useSearchParams().get("type") ?? "";
  const [def, setDef] = useState<DefinitionPrestation | null>(null);
  const [departements, setDepartements] = useState<{ id: number; nom: string }[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  // Étape 1
  // Un seul champ : le matricule solde ou les nom et prénoms (le système reconnaît lequel)
  const [identifiant, setIdentifiant] = useState("");
  const [naissance, setNaissance] = useState("");
  const [reconnu, setReconnu] = useState<Reconnu | null>(null);
  const [cherche, setCherche] = useState(false);
  // Étapes 2 et 3
  const [objet, setObjet] = useState("");
  const [precisions, setPrecisions] = useState("");
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [pieces, setPieces] = useState<PieceChoisie[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [fini, setFini] = useState<{ numero: string; code: string; etape: string } | null>(null);

  useEffect(() => {
    appelPublic<DefinitionPrestation[]>("/prestations/catalogue")
      .then((l) => {
        const d = l.find((p) => p.code === code) ?? null;
        setDef(d);
        setObjet(d?.objet ?? "");
        if (!d) setErreur("Démarche inconnue : revenez à la liste des démarches.");
      })
      .catch((e: Error) => setErreur(e.message));
    appelPublic<ReferencesPortail>("/references")
      .then((r) => setDepartements(r.departements))
      .catch(() => undefined);
  }, [code]);

  async function identifier() {
    setErreur(null);
    setCherche(true);
    try {
      setReconnu(
        await appelPublic<Reconnu>("/prestations/identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifiant, dateNaissance: naissance }),
        }),
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setCherche(false);
    }
  }

  async function envoyer() {
    if (!def || !reconnu) return;
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData();
    fd.append("jeton", reconnu.jeton);
    fd.append("donnees", JSON.stringify({ type: def.code, objet, precisions: precisions || null, details: valeurs }));
    for (const p of pieces) {
      fd.append("fichiers", p.fichier);
      fd.append("libelles", p.libelle);
    }
    try {
      setFini(await appelPublic<{ numero: string; code: string; etape: string }>("/prestations", { method: "POST", body: fd }));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (fini)
    return (
      <div className="space-y-4">
        <section className="space-y-4 rounded-3xl bg-white p-5 shadow-doux">
          <div className="flex items-center gap-2 text-[16px] font-semibold text-marque-700">
            <CheckCircle2 className="size-6" /> Votre demande est envoyée
          </div>
          <p className="text-[14px] text-zinc-600">
            Elle est maintenant chez <strong>{fini.etape}</strong>. Notez ces deux informations : elles vous permettent de suivre votre dossier.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-[12px] text-zinc-500">Numéro</div>
              <div className="text-[24px] font-bold tabular-nums">{fini.numero}</div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-[12px] text-zinc-500">Code</div>
              <div className="text-[24px] font-bold tracking-widest">{fini.code}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(`Demande ${fini.numero} — code ${fini.code}`)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-medium text-marque-700 ring-1 ring-marque-200"
          >
            <Copy className="size-4" /> Copier le numéro et le code
          </button>
          <Link href={`/portail/suivi?numero=${encodeURIComponent(fini.numero)}&code=${fini.code}`} className={`${BOUTON} block text-center`}>
            Suivre ma demande
          </Link>
        </section>
      </div>
    );

  const manquants = def ? champsManquants(def, valeurs) : [];
  const demandeJointe = !!def && pieces.some((x) => x.libelle === def.pieces[0].libelle);
  return (
    <div className="space-y-5">
      <div>
        <Link href="/portail/demarches" className="text-[13px] text-marque-700">
          ← Les démarches
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold">{def?.libelle ?? "Demande"}</h1>
      </div>
      {def && <PresentationPrestation def={def} portail />}

      <Etape n={1} titre="Qui êtes-vous ?" fait={!!reconnu}>
        {reconnu ? (
          <div className="flex items-start gap-3 rounded-2xl bg-marque-50 p-4 text-[14px]">
            <UserCheck className="mt-0.5 size-5 shrink-0 text-marque-700" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{reconnu.agent.nomComplet}</div>
              <div className="text-[13px] text-zinc-600">{[reconnu.agent.grade, reconnu.agent.lieuService, reconnu.agent.departement].filter(Boolean).join(" · ")}</div>
              <button type="button" className="mt-1 text-[13px] text-zinc-500 underline" onClick={() => setReconnu(null)}>
                Ce n’est pas moi
              </button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void identifier();
            }}
          >
            <p className="text-[13px] text-zinc-500">Le système retrouve votre fiche dans la base du personnel : votre identité, votre grade et votre poste sont repris de là.</p>
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium">Votre matricule solde, ou vos nom et prénoms</span>
              <input
                className={`${CHAMP} uppercase`}
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                autoCapitalize="characters"
                placeholder="Ex. 123456X, ou NOM Prénom"
              />
              <span className="mt-1 block text-[12px] text-zinc-500">Le nom peut s’écrire dans n’importe quel ordre, avec ou sans accents.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium">Date de naissance</span>
              <input className={CHAMP} type="date" value={naissance} onChange={(e) => setNaissance(e.target.value)} />
            </label>
            <button disabled={cherche || !naissance || identifiant.trim().length < 3} className={BOUTON}>
              {cherche ? "Recherche…" : "Retrouver ma fiche"}
            </button>
          </form>
        )}
      </Etape>

      {reconnu && def && (
        <>
          <Etape n={2} titre="Votre demande" fait={manquants.length === 0}>
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium">Objet</span>
              <input className={CHAMP} value={objet} onChange={(e) => setObjet(e.target.value)} />
            </label>
            <ChampsPrestation def={def} valeurs={valeurs} changer={(k, v) => setValeurs((x) => ({ ...x, [k]: v }))} departements={departements} portail />
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium">Précisions (facultatif)</span>
              <textarea className={CHAMP} rows={3} value={precisions} onChange={(e) => setPrecisions(e.target.value)} />
            </label>
          </Etape>

          <Etape n={3} titre="Vos pièces (photos ou scans)" fait={demandeJointe}>
            <PiecesAJoindre def={def} pieces={pieces} changer={setPieces} erreur={setErreur} portail />
          </Etape>

          {(manquants.length > 0 || !demandeJointe) && (
            <p className="text-center text-[13px] text-zinc-500">
              Il manque : {[...manquants.map((m) => m.toLowerCase()), !demandeJointe && `la photo ou le scan de « ${def.pieces[0].libelle.toLowerCase()} »`].filter(Boolean).join(", ")}.
            </p>
          )}
          {/* Champ invisible : rempli seulement par les robots */}
          <input type="text" name="site" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
          <button type="button" disabled={envoi || manquants.length > 0 || !demandeJointe} onClick={envoyer} className={BOUTON.replace("bg-nuit", "bg-marque-600")}>
            {envoi ? "Envoi en cours…" : "Envoyer ma demande"}
          </button>
        </>
      )}
      {erreur && <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">{erreur}</div>}
    </div>
  );
}
