"use client";

import { CheckCircle2, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SaisieReferentiel } from "@/components/saisie-referentiel";
import { useSession } from "@/components/session";
import { Alerte, Bouton, Carte, Champ, Chargement, EnTete, Liste, Saisie, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";

interface Type {
  code: string;
  libelle: string;
  acte: string | null;
  pieces: string[];
  decision: string;
  mutation: boolean;
}
interface AgentListe {
  id: number;
  nomComplet: string;
  numeroFiche: string;
  structureNom: string | null;
  lieuService: string | null;
}

/** Le chef de structure dépose la demande d'un de ses agents ; elle part de sa structure et suit la voie hiérarchique. */
export default function NouvelleDemande() {
  return (
    <Suspense fallback={<Chargement />}>
      <Formulaire />
    </Suspense>
  );
}

function Formulaire() {
  const { refs } = useSession();
  const params = useSearchParams();
  const types = useApi<Type[]>("/demandes/types");
  const [agent, setAgent] = useState<{ id: number; nom: string } | null>(null);
  // Agent venu de sa fiche (?agent=) : « changer » revient à la recherche
  const [ignorerFiche, setIgnorerFiche] = useState(false);
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [code, setCode] = useState("");
  const [objet, setObjet] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [observation, setObservation] = useState("");
  const [departement, setDepartement] = useState("");
  const [lieu, setLieu] = useState("");
  const [pieces, setPieces] = useState<{ libelle: string; fichier: File }[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState<{ id: string; numero: number; code: string; etape: string } | null>(null);
  const agents = useApi<{ lignes: AgentListe[] }>(recherche.length >= 2 ? `/recensement/agents?recherche=${encodeURIComponent(recherche)}` : null);
  const depuisFiche = useApi<{ agent: { id: number; nomComplet: string } }>(params.get("agent") && !agent ? `/recensement/agents/${params.get("agent")}` : null);
  useEffect(() => {
    const t = setTimeout(() => setRecherche(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const choisi = agent ?? (!ignorerFiche && depuisFiche.donnees ? { id: depuisFiche.donnees.agent.id, nom: depuisFiche.donnees.agent.nomComplet } : null);
  const type = types.donnees?.find((t) => t.code === code);

  async function envoyer() {
    if (!choisi || !type) return;
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData();
    fd.append(
      "donnees",
      JSON.stringify({
        typePrestation: type.code,
        objet: objet || type.libelle,
        dateDebut: du || null,
        dateFin: au || null,
        observation: observation || null,
        departementSolliciteId: departement ? Number(departement) : null,
        lieuSollicite: lieu || null,
      }),
    );
    for (const p of pieces) {
      fd.append("fichiers", p.fichier);
      fd.append("libelles", p.libelle);
    }
    try {
      setFait(await api.post<{ id: string; numero: number; code: string; etape: string }>(`/demandes/agents/${choisi.id}`, fd));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (fait)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Carte titre="Demande déposée">
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center gap-2 text-marque-700">
              <CheckCircle2 className="size-5" /> Elle est chez <strong>{fait.etape}</strong> : c’est à vous de la viser en premier (Dossiers à traiter).
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="text-[11px] text-zinc-500">Numéro</div>
                <div className="text-[22px] font-bold tabular-nums">{fait.numero}</div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="text-[11px] text-zinc-500">Code de suivi</div>
                <div className="text-[22px] font-bold tracking-widest">{fait.code}</div>
              </div>
            </div>
            <p className="text-zinc-600">Remettez le numéro et le code à l’agent : il suit son dossier sur le portail et, une fois la demande accordée, y imprime son acte.</p>
            <div className="flex gap-2">
              <Link href={`/mutation/${fait.id}`} className="font-medium text-marque-700 underline">
                Ouvrir la demande
              </Link>
              <button type="button" className="text-zinc-500 underline" onClick={() => window.location.reload()}>
                Déposer une autre demande
              </button>
            </div>
          </div>
        </Carte>
      </div>
    );

  return (
    <div className="space-y-5">
      <EnTete
        titre="Déposer la demande d’un agent"
        sousTitre="Congé, autorisation d’absence, attestation, prime, mutation… La demande part de votre structure : vous la visez en premier, puis elle suit la voie hiérarchique jusqu’à la décision. L’agent la suit sur le portail avec son numéro et son code."
      />
      <Carte titre="1. L’agent">
        {choisi ? (
          <div className="flex items-center gap-3 text-[13px]">
            <strong>{choisi.nom}</strong>
            <button
              type="button"
              className="text-[12px] text-zinc-500 underline"
              onClick={() => {
                setAgent(null);
                setIgnorerFiche(true);
              }}
            >
              changer
            </button>
          </div>
        ) : (
          <>
            <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom de l’agent (base du personnel, 2 lettres au moins)…" />
            <ul className="mt-2 max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-xl ring-1 ring-zinc-200">
              {(agents.donnees?.lignes ?? []).map((a) => (
                <li key={a.id}>
                  <button type="button" className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-zinc-50" onClick={() => setAgent({ id: a.id, nom: a.nomComplet })}>
                    <span className="font-medium">{a.nomComplet}</span>
                    <span className="ml-2 text-[11px] text-zinc-400">{[a.numeroFiche, a.structureNom ?? a.lieuService].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
              {recherche.length >= 2 && agents.donnees && !agents.donnees.lignes.length && <li className="px-3 py-2 text-[12px] text-zinc-500">Aucun agent trouvé dans votre périmètre.</li>}
            </ul>
          </>
        )}
      </Carte>

      <Carte titre="2. La demande">
        {!types.donnees ? (
          <Chargement />
        ) : !types.donnees.length ? (
          <Alerte ton="jaune">Aucune démarche n’est ouverte. Le DG les ouvre dans Administration › Catalogue des prestations.</Alerte>
        ) : (
          <div className="space-y-3">
            <Champ libelle="Démarche *">
              <Liste
                value={code}
                vide="— Choisir —"
                onChange={(e) => {
                  setCode(e.target.value);
                  setObjet(types.donnees!.find((t) => t.code === e.target.value)?.libelle ?? "");
                }}
                options={types.donnees.map((t) => ({ valeur: t.code, libelle: `${t.libelle}${t.mutation ? " (mutation)" : ""}` }))}
              />
            </Champ>
            {type && (
              <p className="text-[12px] text-zinc-500">
                Décision : {type.decision}
                {type.acte ? ` · acte délivré : ${type.acte.toLowerCase()}` : ""}
              </p>
            )}
            <Champ libelle="Objet *">
              <Saisie value={objet} onChange={(e) => setObjet(e.target.value)} />
            </Champ>
            {type && !type.mutation && (
              <div className="grid grid-cols-2 gap-3">
                <Champ libelle="Du">
                  <Saisie type="date" value={du} onChange={(e) => setDu(e.target.value)} />
                </Champ>
                <Champ libelle="Au">
                  <Saisie type="date" value={au} onChange={(e) => setAu(e.target.value)} />
                </Champ>
              </div>
            )}
            {type?.mutation && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ libelle="Département demandé *">
                  <Liste value={departement} vide="— Choisir —" onChange={(e) => setDepartement(e.target.value)} options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
                </Champ>
                <Champ libelle="Lieu demandé">
                  <SaisieReferentiel liste="ETABLISSEMENT" valeur={lieu} changer={setLieu} departementId={departement} />
                </Champ>
              </div>
            )}
            <Champ libelle="Précisions">
              <Zone className="w-full" value={observation} onChange={(e) => setObservation(e.target.value)} />
            </Champ>
          </div>
        )}
      </Carte>

      {type && (
        <Carte titre="3. Les pièces (scans ou photos)">
          <div className="space-y-2">
            {[...type.pieces, "Autre pièce"].map((lib, i) => {
              const choisis = pieces.filter((x) => x.libelle === lib);
              return (
                <div key={lib} className={`rounded-xl px-3 py-2 ring-1 ${choisis.length ? "bg-marque-50 ring-marque-200" : "ring-zinc-200"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-medium">
                      {choisis.length ? "✓ " : ""}
                      {lib}
                      {i === 0 ? " *" : ""}
                    </span>
                    <label className="ml-auto cursor-pointer text-[12px] font-medium text-marque-700 underline">
                      Joindre
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const tous = Array.from(e.target.files ?? []);
                          const l = tous.filter((x) => x.size <= 10 * 1024 * 1024);
                          setErreur(l.length < tous.length ? `Trop lourd (10 Mo au plus), non joint : ${tous.filter((x) => !l.includes(x)).map((x) => x.name).join(", ")}.` : null);
                          setPieces((p) => [...p, ...l.map((fichier) => ({ libelle: lib, fichier }))].slice(0, 12));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {choisis.map((x) => (
                    <div key={x.fichier.name + x.fichier.size} className="mt-1 flex items-center gap-2 text-[12px] text-zinc-600">
                      <Paperclip className="size-3.5" />
                      <span className="min-w-0 flex-1 truncate">{x.fichier.name}</span>
                      <button type="button" aria-label="Retirer" onClick={() => setPieces((l) => l.filter((y) => y !== x))}>
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Carte>
      )}
      {erreur && <Alerte>{erreur}</Alerte>}
      <div className="flex justify-end">
        <Bouton variante="principal" disabled={!choisi || !type || envoi || !pieces.length} onClick={envoyer}>
          Déposer la demande
        </Bouton>
      </div>
    </div>
  );
}
