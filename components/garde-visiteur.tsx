"use client";

import { useEffect } from "react";
import { CLE_PROFIL, lireSession, MESSAGE_VISITEUR, PROFIL_CHANGE } from "@/lib/api";

/** Boutons et liens qui impriment ou téléchargent : retirés pour un visiteur. */
const IMPRIMER_OU_TELECHARGER = /\b(imprimer|word|excel|pdf|télécharger|telecharger|exporter|export)\b/i;
/** Boutons qui enregistrent (le serveur les refuse) : retirés aussi, pour ne pas inviter à cliquer. */
const ENREGISTRER = /^\+?\s*(importer|nouvelle|nouveau|ajouter|enregistrer|supprimer|modifier|corriger|valider|créer|soumettre|signer|sortir|réintégrer|envoyer|déposer|lire le fichier|faire un essai|marquer|régularisation)/i;

/**
 * Compte visiteur (DG, 04/11/2026) : il voit les pages, même celles faites pour l'impression, mais
 * n'imprime rien et ne télécharge rien. Les boutons sont retirés, l'impression du navigateur
 * (Ctrl+P) sort une page vide, et le serveur refuse les fichiers de toute façon.
 */
export function GardeVisiteur() {
  useEffect(() => {
    let observateur: MutationObserver | null = null;
    const printOrigine = window.print;
    const appliquer = () => {
      const visiteur = lireSession().profil?.role === "VISITEUR";
      document.documentElement.classList.toggle("visiteur", visiteur);
      observateur?.disconnect();
      observateur = null;
      if (!visiteur) {
        window.print = printOrigine;
        return;
      }
      window.print = () => window.alert(MESSAGE_VISITEUR);
      const retirer = () =>
        document.querySelectorAll<HTMLElement>("button, a").forEach((b) => {
          // Revu seulement si son texte a changé (« … » puis « Imprimer »)
          const texte = `${b.textContent ?? ""}|${b.title ?? ""}`;
          if (b.dataset.visiteurVu === texte) return;
          b.dataset.visiteurVu = texte;
          const t = (b.textContent ?? "").trim();
          // Le menu reste entier
          if (b.closest("aside")) return;
          // Sur « Mon compte », il change son propre mot de passe
          const ecriture = !window.location.pathname.startsWith("/compte") && ENREGISTRER.test(t);
          if (IMPRIMER_OU_TELECHARGER.test(t) || IMPRIMER_OU_TELECHARGER.test(b.title ?? "") || ecriture) b.style.display = "none";
        });
      retirer();
      observateur = new MutationObserver(retirer);
      observateur.observe(document.body, { childList: true, subtree: true });
    };
    appliquer();
    // Connexion ou déconnexion dans un autre onglet
    const auChangement = (e: StorageEvent) => e.key === CLE_PROFIL && appliquer();
    window.addEventListener("storage", auChangement);
    // Connexion, déconnexion ou profil relu dans cet onglet
    window.addEventListener(PROFIL_CHANGE, appliquer);
    return () => {
      observateur?.disconnect();
      window.removeEventListener("storage", auChangement);
      window.removeEventListener(PROFIL_CHANGE, appliquer);
      window.print = printOrigine;
    };
  }, []);
  return null;
}
