"use client";

import { Eye, ShieldAlert, ShieldCheck, ShieldQuestion, Undo2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Chiffre, EnTete, Modale, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { ROLES } from "@/lib/libelles";

interface Reglages {
  mode: "OBSERVATION" | "ACTIF";
  surveillance: number;
  alerte: number;
  suspension: number;
  demiVie: number;
}
interface Compte {
  id: string;
  nom: string;
  email: string;
  role: keyof typeof ROLES;
  actif: boolean;
  score: number;
  scoreMax: number;
  evenements: number;
  dernier: string | null;
  regles: string[];
  suspenduLe: string | null;
  suspensionMotif: string | null;
}
interface Evenement {
  id: number;
  regle: string;
  points: number;
  score: number;
  chemin: string | null;
  ip: string | null;
  navigateur: string | null;
  details: Record<string, unknown> | null;
  creeLe: string;
}
interface Etat {
  reglages: Reglages;
  regles: Record<string, { libelle: string; points: number; immediate: boolean }>;
  comptes: Compte[];
}

/** Les paliers et décisions, en clair. */
const PALIERS: Record<string, { libelle: string; ton: "gris" | "jaune" | "rouge" | "vert" | "bleu" }> = {
  SURVEILLANCE: { libelle: "Surveillance commencée", ton: "jaune" },
  ALERTE: { libelle: "Alerte au DG et à l’administrateur", ton: "rouge" },
  SUSPENSION: { libelle: "Compte suspendu", ton: "rouge" },
  SUSPENSION_SIMULEE: { libelle: "Aurait été suspendu (mode observation)", ton: "jaune" },
  RETABLI: { libelle: "Compte rétabli", ton: "vert" },
};

const quand = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });

/**
 * Sécurité › Comptes signalés (08/11/2026) : réservé au DG et à l'administrateur. L'outil de
 * détection note les comportements qui ne sont pas ceux d'un humain qui suit l'interface.
 */
export default function ComptesSignales() {
  const { profil } = useSession();
  const { donnees: e, erreur, recharger } = useApi<Etat>(profil.role === "DG" || profil.role === "ADMIN" ? "/securite/comptes" : null);
  const [detail, setDetail] = useState<Compte | null>(null);
  const [decision, setDecision] = useState<{ compte: Compte; action: "retablir" | "suspendre" } | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);

  if (profil.role !== "DG" && profil.role !== "ADMIN") return <Alerte>Page réservée au DG et à l’administrateur.</Alerte>;
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!e) return <Chargement />;

  const r = e.reglages;
  const suspendus = e.comptes.filter((c) => c.suspenduLe);
  const surveilles = e.comptes.filter((c) => !c.suspenduLe && c.score >= r.surveillance);
  const etat = (c: Compte) =>
    c.suspenduLe ? (
      <Badge ton="rouge">Suspendu</Badge>
    ) : c.score >= r.alerte ? (
      <Badge ton="rouge">Alerte</Badge>
    ) : c.score >= r.surveillance ? (
      <Badge ton="jaune">Surveillé</Badge>
    ) : (
      <Badge ton="gris">Observé</Badge>
    );

  return (
    <div className="space-y-5">
      <EnTete
        titre="Comptes signalés"
        sousTitre="L’outil de détection note ce qui n’est pas le comportement d’un humain qui suit l’interface : appels directs au serveur, adresses inventées, lectures trop rapides ou à la chaîne… Chaque règle franchie ajoute des points ; le score redescend de lui-même avec le temps. Les comptes concernés n’en sont jamais informés, sauf s’ils sont suspendus."
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Chiffre icone={<ShieldAlert />} ton={suspendus.length ? "rouge" : "gris"} libelle="Comptes suspendus" valeur={suspendus.length} detail="en attente de vérification" />
        <Chiffre icone={<ShieldQuestion />} ton={surveilles.length ? "jaune" : "gris"} libelle="Comptes surveillés" valeur={surveilles.length} detail={`score de ${r.surveillance} ou plus`} />
        <Chiffre
          icone={<ShieldCheck />}
          ton={r.mode === "ACTIF" ? "vert" : "bleu"}
          libelle="Mode de l’outil"
          valeur={r.mode === "ACTIF" ? "Actif" : "Observation"}
          detail={r.mode === "ACTIF" ? `suspension à ${r.suspension} points` : "note et alerte, suspend seulement les signes certains"}
        />
      </div>

      <Carte titre="Comptes signalés (7 derniers jours)">
        {!e.comptes.length ? (
          <Vide>Aucun compte signalé : rien d’anormal ces 7 derniers jours.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Compte</th>
                <th>État</th>
                <th className="text-right">Score</th>
                <th>Règles franchies</th>
                <th>Dernier signal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {e.comptes.map((c) => (
                <tr key={c.id} className={c.suspenduLe ? "bg-rouge-100/40" : undefined}>
                  <td>
                    <div className="font-medium">{c.nom}</div>
                    <div className="text-[12px] text-zinc-500">
                      {c.email} · {ROLES[c.role] ?? c.role}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">{etat(c)}</td>
                  <td className="text-right tabular-nums">
                    <div className="font-semibold">{c.score}</div>
                    <div className="text-[11px] text-zinc-400">max {c.scoreMax}</div>
                  </td>
                  <td className="max-w-md text-[12px] text-zinc-600">
                    {c.suspensionMotif && <div className="mb-1 font-medium text-rouge-600">{c.suspensionMotif}</div>}
                    {c.regles.map((x) => e.regles[x]?.libelle ?? x).join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap text-[12px] text-zinc-500">{c.dernier ? quand(c.dernier) : "—"}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Bouton variante="discret" onClick={() => setDetail(c)}>
                        <Eye /> Ce qu’il a fait
                      </Bouton>
                      {c.suspenduLe ? (
                        <Bouton variante="principal" onClick={() => setDecision({ compte: c, action: "retablir" })}>
                          <Undo2 /> Rétablir
                        </Bouton>
                      ) : (
                        c.id !== profil.id && (
                          <Bouton variante="danger" onClick={() => setDecision({ compte: c, action: "suspendre" })}>
                            Suspendre
                          </Bouton>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>

      <ReglagesOutil
        r={r}
        apres={(texte) => {
          setMessage({ ton: "vert", texte });
          recharger();
        }}
        echec={(texte) => setMessage({ ton: "rouge", texte })}
      />

      <Carte titre="Les règles de l’outil">
        <Tableau>
          <thead>
            <tr>
              <th>Règle</th>
              <th className="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(e.regles).map(([code, x]) => (
              <tr key={code}>
                <td className="text-[13px]">{x.libelle}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{x.immediate ? <Badge ton="rouge">Suspension immédiate</Badge> : `+${x.points}`}</td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      </Carte>

      {detail && <Chronologie compte={detail} regles={e.regles} fermer={() => setDetail(null)} />}
      {decision && (
        <Decision
          {...decision}
          fermer={() => setDecision(null)}
          apres={(texte) => {
            setDecision(null);
            setMessage({ ton: "vert", texte });
            recharger();
          }}
        />
      )}
    </div>
  );
}

/** Tout ce que l'outil a noté pour un compte, du plus récent au plus ancien. */
function Chronologie({ compte, regles, fermer }: { compte: Compte; regles: Etat["regles"]; fermer: () => void }) {
  const { donnees } = useApi<Evenement[]>(`/securite/comptes/${compte.id}`);
  return (
    <Modale titre={`Ce qu’a fait ${compte.nom}`} ouverte fermer={fermer} large>
      {!donnees ? (
        <Chargement />
      ) : !donnees.length ? (
        <Vide>Rien de noté.</Vide>
      ) : (
        <ol className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {donnees.map((x) => {
            const palier = PALIERS[x.regle];
            const recentes = (x.details?.recentes as { t: number; m: string; chemin: string }[] | undefined) ?? null;
            const autres = Object.entries(x.details ?? {}).filter(([k]) => k !== "recentes");
            return (
              <li key={x.id} className="rounded-xl bg-zinc-50 px-3 py-2 text-[13px] ring-1 ring-zinc-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] tabular-nums text-zinc-500">{quand(x.creeLe)}</span>
                  {palier ? <Badge ton={palier.ton}>{palier.libelle}</Badge> : <span className="font-medium">{regles[x.regle]?.libelle ?? x.regle}</span>}
                  {x.points > 0 && <span className="font-semibold text-or-700">+{x.points}</span>}
                  <span className="ml-auto text-[12px] text-zinc-500">score {x.score}</span>
                </div>
                {(x.chemin || x.ip) && (
                  <div className="mt-1 font-mono text-[11px] text-zinc-500">
                    {x.chemin} {x.ip ? `· ${x.ip}` : ""}
                  </div>
                )}
                {x.navigateur && <div className="truncate text-[11px] text-zinc-400" title={x.navigateur}>{x.navigateur}</div>}
                {autres.length > 0 && (
                  <div className="mt-1 text-[12px] text-zinc-600">
                    {autres.map(([k, v]) => (
                      <span key={k} className="mr-3">
                        {k} : <strong>{typeof v === "object" ? JSON.stringify(v).slice(0, 160) : String(v)}</strong>
                      </span>
                    ))}
                  </div>
                )}
                {recentes && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[12px] text-marque-700">Ses {recentes.length} dernières requêtes</summary>
                    <div className="mt-1 max-h-48 overflow-y-auto font-mono text-[11px] text-zinc-600">
                      {recentes.map((q, i) => (
                        <div key={i}>
                          {new Date(q.t).toLocaleTimeString("fr-FR")} {q.m} {q.chemin}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Modale>
  );
}

/** Rétablir après vérification, ou suspendre à la main : toujours avec un motif. */
function Decision({ compte, action, fermer, apres }: { compte: Compte; action: "retablir" | "suspendre"; fermer: () => void; apres: (t: string) => void }) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const retablir = action === "retablir";
  return (
    <Modale titre={retablir ? `Rétablir le compte de ${compte.nom} ?` : `Suspendre le compte de ${compte.nom} ?`} ouverte fermer={fermer}>
      <p className="text-[13px] text-zinc-600">
        {retablir
          ? "Après vérification : la personne retrouve son accès, son score repart de zéro. Dites ce qui a été vérifié (avec qui, et ce qui s’est passé)."
          : "La personne voit aussitôt l’écran « compte signalé » et ne peut plus rien faire jusqu’à ce qu’on la rétablisse."}
      </p>
      {erreur && <Alerte>{erreur}</Alerte>}
      <Champ libelle={retablir ? "Ce qui a été vérifié" : "Motif"} className="mt-3">
        <Saisie value={motif} onChange={(x) => setMotif(x.target.value)} autoFocus placeholder={retablir ? "Ex. Entretien avec l’agent : travail normal sur les imports" : "Ex. Lectures massives à vérifier"} />
      </Champ>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante={retablir ? "principal" : "danger"}
          disabled={motif.trim().length < 5}
          onClick={async () => {
            try {
              await api.post(`/securite/comptes/${compte.id}/${action}`, { motif });
              apres(retablir ? `${compte.nom} est rétabli.` : `${compte.nom} est suspendu.`);
            } catch (x) {
              setErreur((x as Error).message);
            }
          }}
        >
          {retablir ? "Rétablir" : "Suspendre"}
        </Bouton>
      </div>
    </Modale>
  );
}

/** Mode et seuils de l'outil. */
function ReglagesOutil({ r, apres, echec }: { r: Reglages; apres: (t: string) => void; echec: (t: string) => void }) {
  const [f, setF] = useState(r);
  const modifie = JSON.stringify(f) !== JSON.stringify(r);
  const nombre = (k: keyof Omit<Reglages, "mode">) => (
    <Saisie type="number" min={5} value={f[k]} onChange={(x) => setF({ ...f, [k]: Number(x.target.value) })} />
  );
  return (
    <Carte titre="Réglages de l’outil">
      <div className="space-y-4">
        <div>
          <Segments
            valeur={f.mode}
            changer={(mode) => setF({ ...f, mode })}
            options={[
              { valeur: "OBSERVATION", libelle: "Observation" },
              { valeur: "ACTIF", libelle: "Actif" },
            ]}
          />
          <p className="mt-2 text-[12px] text-zinc-500">
            {f.mode === "ACTIF"
              ? "Actif : un compte qui atteint le seuil de suspension est suspendu."
              : "Observation : l’outil note, surveille et alerte, et montre « aurait été suspendu » sans suspendre. Les signes certains (appel hors navigateur, adresse piège) suspendent toujours. À utiliser les premières semaines pour régler les seuils."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Champ libelle="Surveillance à">{nombre("surveillance")}</Champ>
          <Champ libelle="Alerte à">{nombre("alerte")}</Champ>
          <Champ libelle="Suspension à">{nombre("suspension")}</Champ>
          <Champ libelle="Score divisé par deux en (minutes)">{nombre("demiVie")}</Champ>
        </div>
        <div className="flex justify-end gap-2">
          <Bouton disabled={!modifie} onClick={() => setF(r)}>
            Annuler
          </Bouton>
          <Bouton
            variante="principal"
            disabled={!modifie}
            onClick={async () => {
              try {
                await api.put("/securite/reglages", f);
                apres("Réglages de l’outil enregistrés.");
              } catch (x) {
                echec((x as Error).message);
              }
            }}
          >
            Enregistrer
          </Bouton>
        </div>
      </div>
    </Carte>
  );
}
