"use client";

import { AlertTriangle, Check, CheckCircle2, MapPinned, School, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { peutControlerAjout } from "@/components/recensement/commun";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Modale, Zone } from "@/components/ui";
import { api } from "@/lib/api";
import { CYCLES } from "@/lib/ecoles";

/**
 * Tout ce qui se fait pendant le recensement passe au contrôle, écoles comme personnes (DG,
 * 23/11/2026). Ici : ce que les équipes disent des écoles (la base se trompe de localité, de
 * département, d'inspection, de cycle, de nom ; école fermée ; école absente de la liste), et les
 * agents qu'elles signalent (absent, parti, inconnu, décédé).
 */

interface EcoleVue {
  id: number;
  structureId: number | null;
  ecole: string | null;
  etat: string | null;
  etatLibelle: string | null;
  nomSurPlace: string | null;
  responsable: string | null;
  telephone: string | null;
  observation: string | null;
  proposition: { nom?: string; cycle?: string | null; localite?: string | null; agentsSurPlace?: number | null; latitude?: number | null; longitude?: number | null } | null;
  corrections: { code: string; libelle: string; avant: string; apres: string }[];
  distanceKm: number | null;
  positionEquipe: { latitude: number; longitude: number } | null;
  par: string | null;
  le: string;
  campagne: string | null;
}

const quand = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" ", " à ");
const meme = (a?: string | null, b?: string | null) => (a ?? "").trim().toUpperCase() === (b ?? "").trim().toUpperCase();

/** Ce que les équipes disent des écoles : appliquer, refuser (avec un motif), ou « vu ». */
export function EcolesAuControle() {
  const { profil } = useSession();
  const controleur = peutControlerAjout(profil.role) || profil.role === "DG";
  const [liste, setListe] = useState<EcoleVue[] | null>(null);
  const [relire, setRelire] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [encours, setEncours] = useState<number | null>(null);
  const [refus, setRefus] = useState<EcoleVue | null>(null);
  const [motif, setMotif] = useState("");
  useEffect(() => {
    api
      .get<EcoleVue[]>("/recensement/terrain/constats-ecoles")
      .then(setListe)
      .catch(() => setListe([]));
  }, [relire]);
  // (la dernière décision reste lisible, même quand la liste se vide)
  if (!liste?.length && !message) return null;
  if (!liste) return null;

  const decider = async (g: EcoleVue, decision: "APPLIQUER" | "REFUSER" | "VU", m?: string) => {
    setEncours(g.id);
    setErreur(null);
    setMessage(null);
    try {
      const r = await api.post<{ ok: boolean; fiches: number }>(`/recensement/terrain/constats-ecoles/${g.id}/decision`, { decision, motif: m });
      setMessage(
        decision === "APPLIQUER"
          ? `« ${g.ecole} » corrigée dans l’organigramme${r.fiches ? ` ; ${r.fiches} fiche(s) de ses agents ont suivi` : ""}.`
          : decision === "REFUSER"
            ? `Refusé : rien n’a changé pour « ${g.ecole ?? g.proposition?.nom} ». L’équipe lira le motif.`
            : "Noté comme vu.",
      );
      setRefus(null);
      setMotif("");
      setRelire((n) => n + 1);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEncours(null);
    }
  };

  return (
    <Carte titre={`Écoles vues par les équipes : contrôle (${liste.length})`}>
      <p className="mb-3 text-[13px] text-zinc-500">
        Ce que les équipes ont vu sur place et qui diffère de la base. <strong>Appliquer</strong> corrige l’école dans l’organigramme, et les fiches de ses agents suivent. <strong>Refuser</strong> ne change rien.
      </p>
      {erreur && <Alerte>{erreur}</Alerte>}
      {message && <Alerte ton="vert">{message}</Alerte>}
      {!liste.length && <p className="text-[13px] text-zinc-500">Plus rien à contrôler pour les écoles.</p>}
      <ul className="divide-y divide-zinc-100">
        {liste.map((g) => {
          const nomChange = !!g.structureId && !!g.nomSurPlace && !meme(g.nomSurPlace, g.ecole);
          const aAppliquer = !!g.structureId && (g.corrections.length > 0 || nomChange);
          return (
            <li key={g.id} className="flex flex-col gap-2 py-3 text-[13px] sm:flex-row sm:items-start">
              <School className="mt-0.5 hidden size-4 shrink-0 text-marque-600 sm:block" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {g.structureId ? (
                    <Link href={`/ecoles/${g.structureId}`} target="_blank" className="font-medium text-marque-700 hover:underline">
                      {g.ecole}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      Absente de la liste : {g.proposition?.nom}
                      {g.proposition?.cycle ? ` (${CYCLES[g.proposition.cycle as keyof typeof CYCLES] ?? g.proposition.cycle})` : ""}
                    </span>
                  )}
                  {g.etatLibelle && <Badge ton={g.etat === "FONCTIONNE" ? "vert" : "rouge"}>{g.etatLibelle}</Badge>}
                </div>
                {(g.corrections.length > 0 || nomChange) && (
                  <table className="w-full max-w-xl text-[12px]">
                    <thead>
                      <tr className="text-left text-zinc-500">
                        <th className="py-0.5 pr-3 font-medium" />
                        <th className="py-0.5 pr-3 font-medium">Dans la base</th>
                        <th className="py-0.5 font-medium">Vu sur place</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nomChange && (
                        <tr>
                          <td className="py-0.5 pr-3 text-zinc-500">Nom</td>
                          <td className="py-0.5 pr-3 text-zinc-500 line-through">{g.ecole}</td>
                          <td className="py-0.5 font-medium">{g.nomSurPlace}</td>
                        </tr>
                      )}
                      {g.corrections.map((x) => (
                        <tr key={x.code}>
                          <td className="py-0.5 pr-3 text-zinc-500">{x.libelle}</td>
                          <td className="py-0.5 pr-3 text-zinc-500 line-through">{x.avant || "—"}</td>
                          <td className="py-0.5 font-medium">{x.apres}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="text-zinc-600">
                  {[
                    g.proposition?.localite ? `à ${g.proposition.localite}` : null,
                    g.proposition?.agentsSurPlace ? `${g.proposition.agentsSurPlace} agent(s) sur place` : null,
                    g.responsable ? `responsable : ${g.responsable}` : null,
                    g.telephone ? `tél. ${g.telephone}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {g.observation && <div className="text-zinc-600">« {g.observation} »</div>}
                {(g.distanceKm !== null || g.positionEquipe || g.proposition?.latitude) && (
                  <div className="flex items-center gap-1 text-[12px] text-zinc-500">
                    <MapPinned className="size-3.5" />
                    {g.distanceKm !== null
                      ? `Équipe à ${g.distanceKm < 1 ? `${Math.round(g.distanceKm * 1000)} m` : `${g.distanceKm.toLocaleString("fr-FR")} km`} de la position connue de l’école`
                      : g.positionEquipe
                        ? `Position de l’équipe : ${g.positionEquipe.latitude.toFixed(5)}, ${g.positionEquipe.longitude.toFixed(5)}`
                        : `Position : ${g.proposition?.latitude?.toFixed(5)}, ${g.proposition?.longitude?.toFixed(5)}`}
                  </div>
                )}
                <div className="text-[12px] text-zinc-400">
                  {g.par}, le {quand(g.le)}
                  {g.campagne ? ` · ${g.campagne}` : ""}
                </div>
              </div>
              {controleur && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {aAppliquer ? (
                    <>
                      <Bouton variante="principal" chargement={encours === g.id} onClick={() => void decider(g, "APPLIQUER")}>
                        <Check /> Appliquer
                      </Bouton>
                      <Bouton disabled={encours === g.id} onClick={() => (setRefus(g), setMotif(""))}>
                        <X /> Refuser
                      </Bouton>
                    </>
                  ) : (
                    <Bouton chargement={encours === g.id} onClick={() => void decider(g, "VU")} title={g.structureId ? "Rien à changer dans l’organigramme" : "Créez l’école dans Structures › Écoles, puis marquez-la vue"}>
                      <CheckCircle2 /> Vu
                    </Bouton>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Modale titre={`Refuser : ${refus?.ecole ?? ""}`} ouverte={!!refus} fermer={() => setRefus(null)}>
        <div className="space-y-3 text-[14px]">
          <p className="text-zinc-600">Rien ne changera dans l’organigramme. Dites pourquoi : l’équipe le lira.</p>
          <Zone value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : l’école est bien à Boko, l’équipe était dans l’annexe" className="w-full" />
          <div className="flex justify-end gap-2">
            <Bouton onClick={() => setRefus(null)}>Annuler</Bouton>
            <Bouton variante="principal" disabled={!motif.trim()} chargement={encours === refus?.id} onClick={() => refus && void decider(refus, "REFUSER", motif.trim())}>
              Refuser
            </Bouton>
          </div>
        </div>
      </Modale>
    </Carte>
  );
}

const LIBELLES_PRESENCE: Record<string, string> = {
  ABSENT: "Absent ce jour",
  PARTI: "Parti",
  INCONNU: "Inconnu ici",
  DECEDE: "Décédé",
  DOUBLON: "En double",
  AUSSI_ICI: "Travaille aussi ici",
};

/** Les agents que les équipes signalent (absent, parti, inconnu ici, décédé) : à vérifier, puis « traité ». */
export function AgentsSignales() {
  const { profil } = useSession();
  const controleur = peutControlerAjout(profil.role) || profil.role === "DG";
  const [liste, setListe] = useState<{ id: number; agentId: number; nomComplet: string; ecole: string; etat: string; observation: string | null; par: string | null; le: string }[] | null>(null);
  const [relire, setRelire] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<NonNullable<typeof liste>>("/recensement/terrain/signalements")
      .then(setListe)
      .catch(() => setListe([]));
  }, [relire]);
  if (!liste?.length) return null;
  return (
    <Carte titre={`Agents signalés par les équipes : contrôle (${liste.length})`}>
      <p className="mb-3 text-[13px] text-zinc-500">Rien n’est effacé. Vérifiez, corrigez la fiche si besoin (mutation, sortie, école), puis « Traité ».</p>
      {erreur && <Alerte>{erreur}</Alerte>}
      <ul className="divide-y divide-zinc-100">
        {liste.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
            <AlertTriangle className="size-4 text-or-600" />
            <Link href={`/personnel/agents/${g.agentId}`} target="_blank" className="font-medium text-marque-700 hover:underline">
              {g.nomComplet}
            </Link>
            <Badge ton={g.etat === "ABSENT" ? "jaune" : "rouge"}>{LIBELLES_PRESENCE[g.etat] ?? g.etat}</Badge>
            <span className="min-w-0 flex-1 text-zinc-500">
              {g.ecole} · {g.par ?? ""}, le {quand(g.le)}
              {g.observation ? ` · « ${g.observation} »` : ""}
            </span>
            {controleur && (
              <Bouton
                variante="discret"
                onClick={() =>
                  void api
                    .post(`/recensement/terrain/signalements/${g.id}/traite`, {})
                    .then(() => setRelire((n) => n + 1))
                    .catch((e) => setErreur((e as Error).message))
                }
              >
                <CheckCircle2 /> Traité
              </Bouton>
            )}
          </li>
        ))}
      </ul>
    </Carte>
  );
}
