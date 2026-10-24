"use client";

import { Check, Clock3, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { appelPublic } from "@/lib/portail";

interface Suivi {
  numero: number;
  date: string | null;
  objet: string | null;
  decision: "ACCORDEE" | "REJETEE" | "EN_INSTANCE" | null;
  decisionMotivation: string | null;
  /** Prestation accordée : l'acte s'imprime depuis le portail. */
  acteDisponible?: boolean;
  etapes: { sigle: string; nom: string; etat: "FAIT" | "EN_COURS" | "A_VENIR"; date: string | null }[];
}

const DECISION = {
  ACCORDEE: { texte: "Votre demande est accordée", fond: "bg-marque-50 text-marque-700" },
  REJETEE: { texte: "Votre demande est rejetée", fond: "bg-rouge-100 text-rouge-600" },
  EN_INSTANCE: { texte: "Votre demande est en instance", fond: "bg-or-100 text-or-700" },
};

const CHAMP = "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[16px] outline-none focus:border-marque-300 focus:ring-4 focus:ring-marque-100";

/** Suivi d'une demande avec son numéro et son code. */
export default function SuiviPortail() {
  // useSearchParams demande une frontière de chargement
  return (
    <Suspense fallback={<p className="py-10 text-center text-zinc-400">Chargement…</p>}>
      <Suivi />
    </Suspense>
  );
}

function Suivi() {
  // Lien reçu à l'envoi : numéro et code déjà dans l'adresse
  const params = useSearchParams();
  const depart = { numero: params.get("numero") ?? "", code: params.get("code") ?? "" };
  const [numero, setNumero] = useState(depart.numero);
  const [code, setCode] = useState(depart.code);
  const [suivi, setSuivi] = useState<Suivi | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function chercher(n = numero, c = code) {
    try {
      const r = await appelPublic<Suivi>(`/suivi?numero=${encodeURIComponent(n)}&code=${encodeURIComponent(c)}`);
      setErreur(null);
      setSuivi(r);
    } catch (e) {
      setSuivi(null);
      setErreur((e as Error).message);
    }
  }

  useEffect(() => {
    // chercher() ne change l'état qu'après la réponse du serveur (pas de rendu en cascade)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (depart.numero && depart.code) void chercher(depart.numero, depart.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depart.numero, depart.code]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/portail" className="text-[13px] text-marque-700">
          ← Accueil
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold">Suivre ma demande</h1>
      </div>
      <form
        className="space-y-3 rounded-3xl bg-white p-5 shadow-doux"
        onSubmit={(e) => {
          e.preventDefault();
          void chercher();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">Numéro</span>
            <input className={CHAMP} inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">Code</span>
            <input className={`${CHAMP} uppercase tracking-widest`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} autoCapitalize="characters" />
          </label>
        </div>
        <button disabled={!numero || code.length < 6} className="w-full rounded-2xl bg-nuit px-5 py-4 text-[15px] font-semibold text-white disabled:opacity-40">
          Voir où en est ma demande
        </button>
        {erreur && <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-[14px] text-rouge-600">{erreur}</div>}
      </form>

      {suivi && (
        <section className="space-y-4 rounded-3xl bg-white p-5 shadow-doux">
          <div>
            <div className="text-[13px] text-zinc-500">
              Demande n° {suivi.numero}
              {suivi.date ? ` du ${suivi.date.split("-").reverse().join("/")}` : ""}
            </div>
            <div className="text-[16px] font-semibold">{suivi.objet ?? "Demande de mutation"}</div>
          </div>
          {suivi.decision && (
            <div className={`rounded-2xl px-4 py-3 text-[14px] font-semibold ${DECISION[suivi.decision].fond}`}>
              {DECISION[suivi.decision].texte}
              {suivi.decisionMotivation && <p className="mt-1 text-[13px] font-normal">{suivi.decisionMotivation}</p>}
            </div>
          )}
          {suivi.acteDisponible && (
            <Link href={`/portail/acte?numero=${suivi.numero}&code=${encodeURIComponent(code)}`} className="flex items-center justify-center gap-2 rounded-2xl bg-marque-500 px-5 py-4 text-[15px] font-semibold text-white">
              <FileText className="size-4" /> Voir et imprimer mon acte
            </Link>
          )}
          <ol className="space-y-3">
            {suivi.etapes.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                    e.etat === "FAIT" ? "bg-marque-500 text-white" : e.etat === "EN_COURS" ? "bg-or-400 text-zinc-900" : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {e.etat === "FAIT" ? <Check className="size-4" /> : e.etat === "EN_COURS" ? <Clock3 className="size-4" /> : <span className="text-[12px]">{i + 1}</span>}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{e.sigle}</span>
                  <span className="block text-[12px] text-zinc-500">
                    {e.etat === "FAIT"
                      ? `Visé le ${e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "—"}`
                      : e.etat === "EN_COURS"
                        ? `Votre dossier est ici${e.date ? ` depuis le ${new Date(e.date).toLocaleDateString("fr-FR")}` : ""}`
                        : "À venir"}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
