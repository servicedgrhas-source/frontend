"use client";

import { useEffect } from "react";
import { api } from "./api";
import { ecrire, lire } from "./coffre-terrain";

/*
 * Suivi des recenseurs depuis Brazzaville (DG, 22/11/2026). Tant que le formulaire du terrain est
 * ouvert, la tablette relève sa position toutes les 5 minutes. Si le recenseur retire l'autorisation
 * ou si le GPS ne répond plus, elle le note (« COUPEE », « INDISPONIBLE »). Les relevés sont gardés,
 * chiffrés, dans le coffre de l'appareil et partent dès qu'il y a du réseau.
 *
 * Limite : une page web ne donne sa position que lorsqu'elle est ouverte à l'écran (écran éteint
 * ou application fermée : plus de relevé ; le tableau de bord le montre par « sans signal depuis… »).
 */

export interface Releve {
  latitude?: number;
  longitude?: number;
  precision?: number;
  etat: "OK" | "COUPEE" | "INDISPONIBLE";
  le: string;
}

const FILE = "positions:file";
const INTERVALLE = 5 * 60_000;

/** La toute dernière position donnée par le GPS (en mémoire : à chaque mouvement, sans écriture). */
let enMemoire: Releve | null = null;
/** La dernière position sûre de l'appareil (gardée même après l'envoi : « êtes-vous dans la bonne école ? »). */
export const dernierePosition = (): Releve | null => {
  const gardee = lire<Releve>("positions:derniere");
  if (!enMemoire) return gardee;
  return !gardee || enMemoire.le > gardee.le ? enMemoire : gardee;
};

function garder(r: Releve) {
  if (r.etat === "OK") ecrire("positions:derniere", r);
  const f = lire<Releve[]>(FILE) ?? [];
  // 2 000 relevés au plus (une semaine sans réseau, un relevé toutes les 5 minutes)
  ecrire(FILE, [...f, r].slice(-2000));
  if (navigator.onLine) void envoyerPositions().catch(() => undefined);
}

let envoiEnCours: Promise<number> | null = null;
/** Envoyer les relevés gardés (avec la synchronisation, ou dès qu'un relevé arrive avec le réseau). */
export function envoyerPositions(): Promise<number> {
  envoiEnCours ??= (async () => {
    const f = lire<Releve[]>(FILE) ?? [];
    if (!f.length) return 0;
    await api.post("/recensement/terrain/positions", { positions: f });
    // (des relevés arrivés pendant l'envoi restent dans la file)
    ecrire(FILE, (lire<Releve[]>(FILE) ?? []).slice(f.length));
    return f.length;
  })().finally(() => {
    envoiEnCours = null;
  });
  return envoiEnCours;
}

/** Relever la position du recenseur tant que la page est ouverte (actif : compte recenseur). */
export function useSuiviPosition(actif: boolean) {
  useEffect(() => {
    if (!actif || typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    let dernier = 0;
    let dernierEtat = "";
    const ok = (p: GeolocationPosition) => {
      // (gardée en mémoire à chaque fois : « Prélever la localisation » la prend sans attendre)
      enMemoire = { latitude: p.coords.latitude, longitude: p.coords.longitude, precision: Math.round(p.coords.accuracy), etat: "OK", le: new Date().toISOString() };
      const maintenant = Date.now();
      // Un relevé toutes les 5 minutes (et tout de suite quand le signal revient)
      if (dernierEtat === "OK" && maintenant - dernier < INTERVALLE - 5_000) return;
      dernier = maintenant;
      dernierEtat = "OK";
      garder({ latitude: p.coords.latitude, longitude: p.coords.longitude, precision: Math.round(p.coords.accuracy), etat: "OK", le: new Date().toISOString() });
    };
    const ko = (e: { code: number }) => {
      // 1 : autorisation refusée ou retirée ; sinon : pas de signal (intérieur, GPS éteint)
      const etat = e.code === 1 ? "COUPEE" : "INDISPONIBLE";
      if (etat === dernierEtat) return;
      dernierEtat = etat;
      garder({ etat, le: new Date().toISOString() });
    };
    const options: PositionOptions = { enableHighAccuracy: true, maximumAge: 60_000, timeout: 60_000 };
    const suivi = navigator.geolocation.watchPosition(ok, ko, options);
    // Immobile, la tablette peut ne rien signaler : un relevé demandé toutes les 5 minutes
    const regulier = setInterval(() => navigator.geolocation.getCurrentPosition(ok, ko, options), INTERVALLE);
    // Autorisation retirée pendant le travail : noté tout de suite
    let statut: PermissionStatus | null = null;
    const change = () => {
      if (statut?.state === "denied") ko({ code: 1 });
      else navigator.geolocation.getCurrentPosition(ok, ko, options);
    };
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((s) => {
        statut = s;
        s.addEventListener("change", change);
      })
      .catch(() => undefined);
    return () => {
      navigator.geolocation.clearWatch(suivi);
      clearInterval(regulier);
      statut?.removeEventListener("change", change);
    };
  }, [actif]);
}
