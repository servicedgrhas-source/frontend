"use client";

import { AlertTriangle, Ban, LockOpen, MapPinned, Phone, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FondAntenne } from "@/components/recensement/captage-signal";
import { CarteOsm, type PointCarte } from "@/components/recensement/carte-osm";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Chargement, EnTete, Saisie, Tableau, Vide, cx, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";

/*
 * Suivi des recenseurs depuis Brazzaville (DG, 22/11/2026), réservé au DG et à l'administrateur :
 * la dernière position de chacun sur la carte, le trajet du jour, le signal (récent, ancien, coupé),
 * ses téléphones, ses envois du jour ; bloquer, débloquer ou effacer son appareil.
 */

type Signal = "AUCUN" | "COUPEE" | "ANCIEN" | "TRES_ANCIEN" | "RECENT";

interface LigneSuivi {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
  departementsNoms: string[];
  plusieursDepartements: boolean;
  telephones: string[];
  effacerLe: string | null;
  effaceLe: string | null;
  bloqueLe: string | null;
  signal: Signal;
  minutesDepuis: number | null;
  dernierSignal: string | null;
  position: { latitude: number; longitude: number; precision: number | null; le: string } | null;
  trajet: [number, number, string][];
  envoisJour: number;
  lignesJour: number;
}

interface Suivi {
  jour: string;
  le: string;
  lignes: LigneSuivi[];
  alertes: { id: string; code: string; nom: string; signal: Signal; depuis: string | null; telephones: string[] }[];
}

const COULEUR: Record<Signal, string> = { RECENT: "#16a34a", ANCIEN: "#f59e0b", TRES_ANCIEN: "#dc2626", COUPEE: "#7f1d1d", AUCUN: "#a1a1aa" };
const heure = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const duree = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${Math.floor(m / 1440)} j`);

function texteSignal(l: LigneSuivi) {
  if (l.signal === "AUCUN") return "Aucune position reçue";
  if (l.signal === "COUPEE") return `Position coupée à ${heure(l.dernierSignal!)}${l.minutesDepuis! >= 1440 ? ` (il y a ${duree(l.minutesDepuis!)})` : ""}`;
  if (l.signal === "RECENT") return `Signal il y a ${duree(l.minutesDepuis ?? 0)}`;
  return `Sans signal depuis ${duree(l.minutesDepuis ?? 0)}`;
}
const tonSignal = (s: Signal) => (s === "RECENT" ? "vert" : s === "ANCIEN" ? "jaune" : s === "AUCUN" ? "gris" : "rouge");

export default function PageSuivi() {
  const { profil } = useSession();
  const aujourdhui = new Date().toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" });
  const [jour, setJour] = useState(aujourdhui);
  const r = useApi<Suivi>(`/recensement/recenseurs/suivi?jour=${jour}`);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const recharger = r.recharger;

  // Rafraîchi toutes les minutes (positions, signal, envois)
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && recharger(), 60_000);
    return () => clearInterval(t);
  }, [recharger]);

  const lignes = useMemo(() => r.donnees?.lignes ?? [], [r.donnees]);
  const points: PointCarte[] = useMemo(
    () =>
      lignes
        .filter((l) => l.position && (!choisi || l.id === choisi))
        .map((l) => ({ id: l.id, lat: l.position!.latitude, lng: l.position!.longitude, couleur: COULEUR[l.signal], libelle: `${l.code} · ${l.nom}`, choisi: l.id === choisi })),
    [lignes, choisi],
  );
  const trajet = useMemo<[number, number][]>(() => (choisi ? (lignes.find((l) => l.id === choisi)?.trajet ?? []).map((p) => [p[0], p[1]]) : []), [lignes, choisi]);

  if (profil.role !== "DG" && profil.role !== "ADMIN") return <Alerte>Le suivi des recenseurs est réservé au DG et à l’administrateur.</Alerte>;

  const agir = async (question: string, oui: string, chemin: string, fait: string) => {
    if (!(await demander(question, oui))) return;
    setErreur(null);
    try {
      await api.post(chemin, {});
      setMessage(fait);
      recharger();
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  const enMission = lignes.filter((l) => l.actif && !l.effacerLe);
  const compte = (s: Signal) => enMission.filter((l) => l.signal === s).length;

  return (
    <FondAntenne>
    <div className="space-y-5">
      <EnTete
        titre="Suivi des recenseurs"
        sousTitre="La position de chaque recenseur, relevée par sa tablette toutes les 5 minutes tant que le formulaire est ouvert (sans réseau, elle arrive à la synchronisation). « Position coupée » : il a retiré l’autorisation ou éteint le GPS. Écran éteint ou application fermée : plus de signal."
        actions={
          <>
            <Saisie type="date" value={jour} max={aujourdhui} onChange={(e) => e.target.value && setJour(e.target.value)} aria-label="Jour" />
            <Bouton onClick={recharger}>
              <RefreshCw /> Actualiser
            </Bouton>
            <Link href="/recensement/recenseurs">
              <Bouton variante="discret">Les comptes des recenseurs</Bouton>
            </Link>
          </>
        }
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}
      {r.donnees && r.donnees.alertes.length > 0 && (
        <Alerte>
          <div className="space-y-1">
            <strong>
              <AlertTriangle className="mr-1 inline size-4" />
              {r.donnees.alertes.length} recenseur(s) à joindre
            </strong>
            {r.donnees.alertes.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3">
                <button type="button" className="cursor-pointer font-mono font-semibold underline" onClick={() => setChoisi(a.id)}>
                  {a.code}
                </button>
                <span>
                  {a.nom} : {a.signal === "COUPEE" ? `a coupé sa position${a.depuis ? ` à ${heure(a.depuis)}` : ""}` : `sans signal depuis ${duree(lignes.find((l) => l.id === a.id)?.minutesDepuis ?? 0)}`}
                </span>
                {a.telephones.map((t) => (
                  <a key={t} href={`tel:${t.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 font-medium underline">
                    <Phone className="size-3" /> {t}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </Alerte>
      )}
      {r.erreur ? (
        <Alerte>{r.erreur}</Alerte>
      ) : !r.donnees ? (
        <Chargement />
      ) : !lignes.length ? (
        <Vide>Aucun recenseur. Créez-les dans « Agents recenseurs ».</Vide>
      ) : (
        <>
          <Carte
            titre={
              <span className="flex flex-wrap items-center gap-2">
                <MapPinned className="size-4" /> {choisi ? `Trajet du ${jour.split("-").reverse().join("/")} : ${lignes.find((l) => l.id === choisi)?.code}` : "Dernière position de chacun"}
              </span>
            }
            actions={
              <>
                <Badge ton="vert">{compte("RECENT")} signal récent</Badge>
                <Badge ton="jaune">{compte("ANCIEN")} plus d’une heure</Badge>
                <Badge ton="rouge">{compte("TRES_ANCIEN") + compte("COUPEE")} coupé ou plus de 3 h</Badge>
                <Badge ton="gris">{compte("AUCUN")} jamais reçu</Badge>
                {choisi && (
                  <Bouton variante="discret" onClick={() => setChoisi(null)}>
                    Voir tout le monde
                  </Bouton>
                )}
              </>
            }
          >
            <CarteOsm points={points} trajet={trajet} choisir={(id) => setChoisi(id === choisi ? null : id)} />
            {choisi && !trajet.length && <p className="mt-2 text-[12px] text-zinc-500">Aucune position ce jour-là pour ce recenseur.</p>}
          </Carte>
          <Carte titre={`Recenseurs (${lignes.length})`}>
            <Tableau>
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>Nom</th>
                  <th>Départements</th>
                  <th>Téléphones</th>
                  <th>Signal</th>
                  <th>Envois du jour</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id} className={cx(l.id === choisi && "bg-marque-50")}>
                    <td>
                      <button type="button" className="cursor-pointer font-mono font-semibold text-marque-700 hover:underline" onClick={() => setChoisi(l.id === choisi ? null : l.id)} title="Voir son trajet du jour">
                        {l.code}
                      </button>
                    </td>
                    <td>{l.nom}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {l.departementsNoms.map((n) => (
                          <Badge key={n} ton={l.plusieursDepartements ? "rouge" : "gris"}>
                            {n}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      {l.telephones.length
                        ? l.telephones.map((t) => (
                            <a key={t} href={`tel:${t.replace(/\s/g, "")}`} className="mr-2 inline-flex items-center gap-1 whitespace-nowrap text-marque-700 hover:underline">
                              <Phone className="size-3" /> {t}
                            </a>
                          ))
                        : "—"}
                    </td>
                    <td>
                      {l.effaceLe ? (
                        <Badge ton="gris">Appareil effacé</Badge>
                      ) : l.effacerLe ? (
                        <Badge ton="rouge">Effacement demandé</Badge>
                      ) : l.bloqueLe ? (
                        <Badge ton="rouge">Bloqué</Badge>
                      ) : (
                        <Badge ton={tonSignal(l.signal)}>{texteSignal(l)}</Badge>
                      )}
                      {l.position && <div className="mt-0.5 text-[11px] text-zinc-400">Dernière position à {heure(l.position.le)}{l.position.precision ? ` (± ${l.position.precision} m)` : ""}</div>}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{l.envoisJour ? `${l.envoisJour} envoi(s), ${l.lignesJour} ligne(s)` : "—"}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        {l.bloqueLe && !l.effacerLe ? (
                          <Bouton variante="discret" onClick={() => void agir(`Débloquer ${l.code} (${l.nom}) ?`, "Oui, débloquer", `/recensement/recenseurs/${l.id}/debloquer`, `${l.code} : débloqué.`)}>
                            <LockOpen /> Débloquer
                          </Bouton>
                        ) : (
                          !l.effacerLe &&
                          l.actif && (
                            <Bouton variante="discret" onClick={() => void agir(`Bloquer ${l.code} (${l.nom}) ? Il ne peut plus se connecter ni envoyer ; les données de sa tablette restent gardées.`, "Oui, bloquer", `/recensement/recenseurs/${l.id}/bloquer`, `${l.code} : bloqué.`)}>
                              <Ban /> Bloquer
                            </Bouton>
                          )
                        )}
                        {!l.effacerLe && !l.effaceLe && (
                          <Bouton
                            variante="danger"
                            onClick={() =>
                              void agir(
                                `Arrêter la mission de ${l.code} (${l.nom}) et effacer sa tablette ? À sa prochaine connexion, elle envoie d’abord ce qui attend, puis efface tout.`,
                                "Oui, effacer sa tablette",
                                `/recensement/recenseurs/${l.id}/effacer`,
                                `${l.code} : effacement demandé.`,
                              )
                            }
                          >
                            <Trash2 /> Effacer
                          </Bouton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </Carte>
        </>
      )}
      {confirmation}
    </div>
    </FondAntenne>
  );
}
