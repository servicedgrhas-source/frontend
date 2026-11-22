"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

/*
 * L'application installable (DG, 22/11/2026 : « comme une vraie app ; que le navigateur propose de
 * l'installer, et que ça insiste jusqu'à ce que ce soit fait »).
 *
 * - Le service hors ligne (/sw.js) est enregistré sur toutes les pages : l'application s'ouvre
 *   ensuite depuis l'écran d'accueil, même sans réseau.
 * - Android, ordinateur (Chrome, Edge, Samsung…) : le navigateur annonce qu'on peut installer ; un
 *   bandeau « Installer » le propose en un toucher (la fenêtre du navigateur s'ouvre).
 * - iPhone et iPad : pas de bouton possible (Safari ne le permet pas) : le bandeau montre les deux
 *   gestes (Partager, puis « Sur l'écran d'accueil »).
 * - « Plus tard » : le bandeau revient 10 minutes après, et à chaque ouverture, tant que
 *   l'application n'est pas installée. Ouverte en application, il ne s'affiche jamais.
 */

interface InvitationNavigateur extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PLUS_TARD = "dgrhas.installation.plusTard";
const PAUSE = 10 * 60_000;

/** Ouverte comme une application (écran d'accueil), et non dans un onglet du navigateur. */
const enApplication = () =>
  typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: minimal-ui)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** iPhone ou iPad, dans Safari (le seul navigateur d'Apple qui installe). */
const surApple = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

const lirePlusTard = () => {
  try {
    return Number(sessionStorage.getItem(PLUS_TARD)) || 0;
  } catch {
    return 0;
  }
};

export function ApplicationInstallable() {
  const [invitation, setInvitation] = useState<InvitationNavigateur | null>(null);
  const [apple, setApple] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installee, setInstallee] = useState(false);

  useEffect(() => {
    // Le service hors ligne, partout
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    // (ni en application, ni sur une page imprimée)
    if (enApplication() || location.pathname.startsWith("/impression")) return;
    // (le bandeau revient après la pause de « Plus tard »)
    let relance: ReturnType<typeof setTimeout> | undefined;
    const montrer = () => {
      const reste = lirePlusTard() + PAUSE - Date.now();
      clearTimeout(relance);
      if (reste > 0) relance = setTimeout(() => setVisible(true), reste);
      else setVisible(true);
    };
    const annonce = (e: Event) => {
      // Le navigateur peut installer : on garde son invitation, et notre bandeau la propose
      e.preventDefault();
      setInvitation(e as InvitationNavigateur);
      montrer();
    };
    const faite = () => {
      setInstallee(true);
      setVisible(false);
      setInvitation(null);
    };
    window.addEventListener("beforeinstallprompt", annonce);
    window.addEventListener("appinstalled", faite);
    // iPhone, iPad : pas d'annonce du navigateur, on montre les gestes
    const t = setTimeout(() => {
      if (surApple()) {
        setApple(true);
        montrer();
      }
    }, 1500);
    return () => {
      window.removeEventListener("beforeinstallprompt", annonce);
      window.removeEventListener("appinstalled", faite);
      clearTimeout(t);
      clearTimeout(relance);
    };
  }, []);

  const plusTard = () => {
    try {
      sessionStorage.setItem(PLUS_TARD, String(Date.now()));
    } catch {
      /* stockage indisponible : le bandeau revient au prochain chargement */
    }
    setVisible(false);
    setTimeout(() => setVisible(true), PAUSE);
  };

  const installer = async () => {
    if (!invitation) return;
    await invitation.prompt();
    const { outcome } = await invitation.userChoice;
    // (une invitation ne sert qu'une fois ; le navigateur en annoncera une autre)
    setInvitation(null);
    if (outcome === "accepted") faiteInstallation();
    else plusTard();
  };
  const faiteInstallation = () => {
    setInstallee(true);
    setVisible(false);
  };

  if (installee)
    return (
      <div className="no-print fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl bg-marque-600 px-4 py-3 text-[14px] text-white shadow-lg sm:inset-x-auto sm:right-4">
        Application installée : ouvrez-la désormais depuis l’écran d’accueil (icône SIGRHAS).
        <button type="button" className="ml-2 cursor-pointer underline" onClick={() => setInstallee(false)}>
          OK
        </button>
      </div>
    );
  if (!visible || (!invitation && !apple)) return null;

  return (
    <div role="dialog" aria-label="Installer l’application" className="no-print fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl bg-nuit p-4 text-white shadow-2xl ring-1 ring-white/10 sm:inset-x-auto sm:right-4 sm:bottom-4">
      <div className="flex items-start gap-3">
        <Image src="/icones/icone-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl bg-white object-contain p-1" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Installer SIGRHAS sur cet appareil</div>
          <p className="mt-0.5 text-[13px] leading-snug text-white/75">Elle s’ouvrira comme une application, depuis l’écran d’accueil, en plein écran, même sans réseau.</p>
        </div>
        <button type="button" onClick={plusTard} title="Plus tard" aria-label="Plus tard" className="-mt-1 -mr-1 cursor-pointer rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
          <X className="size-5" />
        </button>
      </div>
      {invitation ? (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => void installer()} className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-marque-500 text-[15px] font-semibold text-white hover:bg-marque-600">
            <Download className="size-5" /> Installer
          </button>
          <button type="button" onClick={plusTard} className="h-11 cursor-pointer rounded-xl px-4 text-[14px] text-white/80 ring-1 ring-white/20 hover:bg-white/10">
            Plus tard
          </button>
        </div>
      ) : (
        <ol className="mt-3 space-y-1.5 text-[14px]">
          <li className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold">1</span>
            Touchez <Share className="inline size-5 text-sky-300" /> (Partager), en bas de Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold">2</span>
            Puis <SquarePlus className="inline size-5" /> « Sur l’écran d’accueil », et « Ajouter »
          </li>
        </ol>
      )}
    </div>
  );
}
