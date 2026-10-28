"use client";

import { KeyRound, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alerte, Bouton, Champ, Saisie } from "@/components/ui";
import { api, lireSession, ouvrirSession, type Profil } from "@/lib/api";

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Déjà connecté : directement à l'application (un jeton périmé y ramène ici)
  useEffect(() => {
    if (lireSession().jeton) router.replace("/");
  }, [router]);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ jeton: string; utilisateur: Profil }>("/auth/connexion", { email, motDePasse, code });
      ouvrirSession(r.jeton, r.utilisateur);
      router.replace("/");
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-doux md:grid-cols-[1.25fr_1fr]">
        <div className="relative hidden flex-col justify-start gap-12 overflow-hidden bg-nuit p-10 pt-12 text-white md:flex">
          <div>
            <div className="bandeau-national h-1.5 w-20 rounded-full" aria-hidden />
            {/* En-tête officiel : armoiries | République du Congo | ministère */}
            <div className="mt-7 flex items-center gap-3">
              <div className="relative size-14 shrink-0">
                {/* Halo clair : les éléphants noirs restent lisibles sur le fond sombre */}
                <div className="absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,rgba(251,222,74,0.15)_50%,transparent_72%)]" aria-hidden />
                <Image src="/armoiries-transparent.png" alt="Armoiries de la République du Congo" width={474} height={464} priority className="relative h-full w-full object-contain" />
              </div>
              <div className="shrink-0 leading-tight">
                <div className="text-[13px] font-semibold uppercase tracking-wide">République du Congo</div>
                <div className="mt-0.5 text-[11px] text-white/50">Unité · Travail · Progrès</div>
              </div>
              <div className="h-11 w-0.5 shrink-0 rounded-full bg-white/70" aria-hidden />
              <div className="text-[10px] leading-snug font-medium uppercase text-white/70">
                Ministère de l’Enseignement Préscolaire, Primaire, Secondaire et de l’Alphabétisation
              </div>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-[26px] leading-tight font-semibold">
              Système d’Information de Gestion des Ressources Humaines et de l’Administration Scolaire du MEPPSA (SIGRHAS-MEPPSA)
            </h1>
            <p className="mx-auto mt-12 max-w-72 text-sm leading-relaxed text-white/55">
              Direction générale des ressources humaines et de l’administration scolaire — MEPPSA —
            </p>
          </div>
          <div className="pointer-events-none absolute -right-16 -bottom-16 size-64 rounded-full bg-marque-500/20 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -top-10 right-10 size-32 rounded-full bg-or-400/10 blur-2xl" aria-hidden />
        </div>

        <form onSubmit={valider} className="space-y-5 p-8 sm:p-12">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
            <p className="mt-1 text-sm text-zinc-400">Accès réservé au personnel habilité.</p>
          </div>
          {erreur && <Alerte>{erreur}</Alerte>}
          <Champ libelle="Adresse e-mail">
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Saisie type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9" />
            </div>
          </Champ>
          <Champ libelle="Mot de passe">
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Saisie type="password" autoComplete="current-password" required maxLength={128} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="w-full pl-9" />
            </div>
          </Champ>
          <Champ libelle="Code personnel" aide="Les 12 caractères remis par l’administrateur (ex. T3G8-GH6J-FG3U). Laissez vide si vous n’en avez pas reçu.">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <Saisie
                autoComplete="one-time-code"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  // Majuscules et tirets ajoutés tout seuls : T3G8-GH6J-FG3U
                  const brut = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
                  setCode(brut.match(/.{1,4}/g)?.join("-") ?? "");
                }}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full pl-9 font-mono tracking-wider"
              />
            </div>
          </Champ>
          <Bouton variante="principal" type="submit" disabled={envoi} className="w-full py-2.5">
            {envoi ? "Connexion…" : "Se connecter"}
          </Bouton>
          <p className="text-center text-[11px] text-zinc-400">Les actions effectuées sont enregistrées dans le journal.</p>
        </form>
      </div>
    </div>
  );
}
