"use client";

import { Crosshair, ExternalLink, MapPin, PencilLine } from "lucide-react";
import { useState } from "react";
import { Bouton, Modale, Saisie } from "@/components/ui";
import { dernierePosition } from "@/lib/suivi-position";

/** Position GPS d'une école ou d'un bâtiment (mission de terrain, DG 21/11/2026). */
export interface Position {
  latitude: number | null;
  longitude: number | null;
  precisionGps?: number | null;
  localiseLe?: string | null;
  localisePar?: string | null;
}

export const carte = (p: Position) => `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=18/${p.latitude}/${p.longitude}`;

/**
 * Prélever la position, TOUT DE SUITE (le recenseur n'attend pas) :
 * 1. la position que l’appareil vient de relever (suivi de la mission, moins de 30 secondes, précise
 *    à 50 m) : immédiate ;
 * 2. sinon le GPS : on garde la meilleure position reçue ; dès qu'elle est précise à 30 m, c'est
 *    fini ; au bout de 4 secondes, on prend la meilleure si elle est précise à 150 m ; au bout de
 *    8 secondes au plus, on prend ce qu'on a (à 500 m près), sinon on dit clairement qu'il n'y a pas
 *    de signal ici. La précision (en mètres) est gardée avec la position.
 */
export function preleverPosition(): Promise<{ latitude: number; longitude: number; precision: number }> {
  return new Promise((ok, ko) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return ko(new Error("Cet appareil ne donne pas sa position (GPS)."));
    const recente = dernierePosition();
    if (recente?.latitude !== undefined && recente.longitude !== undefined && Date.now() - new Date(recente.le).getTime() < 30_000 && (recente.precision ?? 999) <= 50)
      return ok({ latitude: recente.latitude, longitude: recente.longitude, precision: recente.precision ?? 0 });
    let meilleure: GeolocationPosition | null = null;
    let fini = false;
    const finir = (p: GeolocationPosition | null, erreur?: string) => {
      if (fini) return;
      fini = true;
      navigator.geolocation.clearWatch(suivi);
      clearTimeout(a);
      clearTimeout(b);
      if (p) ok({ latitude: p.coords.latitude, longitude: p.coords.longitude, precision: p.coords.accuracy });
      else ko(new Error(erreur ?? "Pas de signal GPS ici : faites quelques pas dehors, loin des toits, et réessayez. Vous pouvez aussi continuer : la position se reprend plus tard."));
    };
    const suivi = navigator.geolocation.watchPosition(
      (p) => {
        if (!meilleure || p.coords.accuracy < meilleure.coords.accuracy) meilleure = p;
        if (p.coords.accuracy <= 30) finir(p);
      },
      (e) => {
        if (e.code === 1) finir(null, "La position est refusée : autorisez la localisation pour ce site (icône du cadenas dans la barre d’adresse).");
      },
      { enableHighAccuracy: true, maximumAge: 30_000 },
    );
    const a = setTimeout(() => {
      if (meilleure && meilleure.coords.accuracy <= 150) finir(meilleure);
    }, 4_000);
    const b = setTimeout(() => finir(meilleure && meilleure.coords.accuracy <= 500 ? meilleure : null), 8_000);
  });
}

/**
 * La position et ses boutons : « Prélever la localisation » (GPS de l'appareil, sur place) et
 * « Saisir » (latitude et longitude à la main). `enregistrer` reçoit la position choisie.
 */
export function BlocLocalisation({
  position,
  enregistrer,
  peutModifier = true,
  compact,
}: {
  position: Position;
  enregistrer: (p: { latitude: number | null; longitude: number | null; precision?: number | null }) => Promise<void>;
  peutModifier?: boolean;
  compact?: boolean;
}) {
  const [encours, setEncours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<{ lat: string; lng: string } | null>(null);
  const connue = position.latitude !== null && position.longitude !== null;

  const prelever = async () => {
    setErreur(null);
    setEncours(true);
    try {
      const p = await preleverPosition();
      await enregistrer({ latitude: p.latitude, longitude: p.longitude, precision: p.precision });
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEncours(false);
    }
  };
  const valider = async () => {
    if (!saisie) return;
    const lat = Number(saisie.lat.replace(",", "."));
    const lng = Number(saisie.lng.replace(",", "."));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setErreur("Écrivez la latitude et la longitude en chiffres (ex. -4.2634 et 15.2429).");
    setErreur(null);
    setEncours(true);
    try {
      await enregistrer({ latitude: lat, longitude: lng, precision: null });
      setSaisie(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEncours(false);
    }
  };

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2 text-[12px]" : "space-y-2 text-[13px]"}>
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className={`size-4 ${connue ? "text-marque-600" : "text-zinc-400"}`} />
        {connue ? (
          <>
            <span className="tabular-nums">
              {position.latitude!.toFixed(5)}, {position.longitude!.toFixed(5)}
            </span>
            {position.precisionGps ? <span className="text-zinc-500">à {Math.round(position.precisionGps)} m près</span> : null}
            <a href={carte(position)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-marque-700 hover:underline">
              Voir sur la carte <ExternalLink className="size-3" />
            </a>
            {!compact && position.localiseLe && (
              <span className="text-[12px] text-zinc-500">
                · prélevée le {new Date(position.localiseLe).toLocaleDateString("fr-FR")}
                {position.localisePar ? ` par ${position.localisePar}` : ""}
              </span>
            )}
          </>
        ) : (
          <span className="text-zinc-500">Pas encore localisé</span>
        )}
      </div>
      {peutModifier && (
        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante={connue ? "secondaire" : "principal"} chargement={encours} onClick={prelever} title="Sur place : la tablette ou le téléphone donne sa position (GPS)">
            <Crosshair /> {connue ? "Reprendre la position" : "Prélever la localisation"}
          </Bouton>
          <Bouton variante="discret" onClick={() => setSaisie({ lat: connue ? String(position.latitude) : "", lng: connue ? String(position.longitude) : "" })}>
            <PencilLine /> Saisir
          </Bouton>
        </div>
      )}
      {encours && !saisie && <p className="text-[12px] text-marque-700">Recherche de la position…</p>}
      {erreur && <p className="text-[12px] text-rouge-600">{erreur}</p>}
      <Modale titre="Saisir la position" ouverte={!!saisie} fermer={() => setSaisie(null)}>
        <div className="space-y-3 text-[13px]">
          <p className="text-zinc-600">Latitude puis longitude, en degrés décimaux (comme dans Google Maps : un clic droit sur le lieu donne ces deux nombres).</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-zinc-600">
              Latitude
              <Saisie inputMode="decimal" value={saisie?.lat ?? ""} onChange={(e) => setSaisie((s) => (s ? { ...s, lat: e.target.value } : s))} placeholder="-4.2634" />
            </label>
            <label className="text-[12px] text-zinc-600">
              Longitude
              <Saisie inputMode="decimal" value={saisie?.lng ?? ""} onChange={(e) => setSaisie((s) => (s ? { ...s, lng: e.target.value } : s))} placeholder="15.2429" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            {connue && (
              <Bouton variante="discret" disabled={encours} onClick={() => void enregistrer({ latitude: null, longitude: null }).then(() => setSaisie(null))}>
                Effacer la position
              </Bouton>
            )}
            <Bouton variante="principal" chargement={encours} onClick={valider}>
              Enregistrer
            </Bouton>
          </div>
        </div>
      </Modale>
    </div>
  );
}
