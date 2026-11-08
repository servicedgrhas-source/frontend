"use client";

import { Eye, ShieldAlert, ShieldCheck, ShieldQuestion, Undo2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Annonce, Badge, Bouton, Carte, Champ, Chargement, Chiffre, EnTete, Modale, Saisie, Segments, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { ROLES } from "@/lib/libelles";

/*
 * Page réservée au DG et à l'administrateur (08/11/2026). Tous ses textes viennent du serveur, qui ne
 * les envoie qu'à eux : rien dans le code de l'interface ne dit ce que fait cette page.
 */

type Textes = Record<string, Record<string, string>> & { titre: string; sousTitre: string; annuler: string };
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
  score: number;
  scoreMax: number;
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
  textes: Textes;
  exemptes: string[];
  reglages: Reglages;
  regles: Record<string, { libelle: string; points: number; immediate: boolean }>;
  comptes: Compte[];
}

const quand = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
/** Remplace {n}, {nom}, {seuil} dans un texte du serveur. */
const remplir = (t: string | undefined, v: Record<string, string | number> = {}) => (t ?? "").replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

export default function PageSecurite() {
  const { profil } = useSession();
  const permis = profil.role === "DG" || profil.role === "ADMIN";
  const { donnees: e, erreur, recharger } = useApi<Etat>(permis ? "/securite/comptes" : null);
  const [detail, setDetail] = useState<Compte | null>(null);
  const [decision, setDecision] = useState<{ compte: Compte; action: "retablir" | "suspendre" } | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);

  if (!permis || erreur) return <Vide>Page introuvable.</Vide>;
  if (!e) return <Chargement />;

  const t = e.textes;
  const r = e.reglages;
  const suspendus = e.comptes.filter((c) => c.suspenduLe);
  const surveilles = e.comptes.filter((c) => !c.suspenduLe && c.score >= r.surveillance);
  const etat = (c: Compte) =>
    c.suspenduLe ? (
      <Badge ton="rouge">{t.etats.suspendu}</Badge>
    ) : c.score >= r.alerte ? (
      <Badge ton="rouge">{t.etats.alerte}</Badge>
    ) : c.score >= r.surveillance ? (
      <Badge ton="jaune">{t.etats.surveille}</Badge>
    ) : (
      <Badge ton="gris">{t.etats.observe}</Badge>
    );

  return (
    <div className="space-y-5">
      <EnTete titre={t.titre} sousTitre={t.sousTitre} />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>{message?.texte}</Annonce>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Chiffre icone={<ShieldAlert />} ton={suspendus.length ? "rouge" : "gris"} libelle={t.chiffres.suspendus} valeur={suspendus.length} detail={t.chiffres.suspendusDetail} />
        <Chiffre icone={<ShieldQuestion />} ton={surveilles.length ? "jaune" : "gris"} libelle={t.chiffres.surveilles} valeur={surveilles.length} detail={remplir(t.chiffres.surveillesDetail, { seuil: r.surveillance })} />
        <Chiffre
          icone={<ShieldCheck />}
          ton={r.mode === "ACTIF" ? "vert" : "bleu"}
          libelle={t.chiffres.mode}
          valeur={r.mode === "ACTIF" ? t.chiffres.actif : t.chiffres.observation}
          detail={r.mode === "ACTIF" ? remplir(t.chiffres.actifDetail, { seuil: r.suspension }) : t.chiffres.observationDetail}
        />
      </div>

      <Carte titre={t.liste.titre}>
        {!e.comptes.length ? (
          <Vide>{t.liste.vide}</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>{t.liste.compte}</th>
                <th>{t.liste.etat}</th>
                <th className="text-right">{t.liste.score}</th>
                <th>{t.liste.regles}</th>
                <th>{t.liste.dernier}</th>
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
                    <div className="text-[11px] text-zinc-400">{remplir(t.liste.max, { n: c.scoreMax })}</div>
                  </td>
                  <td className="max-w-md text-[12px] text-zinc-600">
                    {c.suspensionMotif && <div className="mb-1 font-medium text-rouge-600">{c.suspensionMotif}</div>}
                    {c.regles.map((x) => e.regles[x]?.libelle ?? x).join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap text-[12px] text-zinc-500">{c.dernier ? quand(c.dernier) : "—"}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Bouton variante="discret" onClick={() => setDetail(c)}>
                        <Eye /> {t.liste.voir}
                      </Bouton>
                      {c.suspenduLe ? (
                        <Bouton variante="principal" onClick={() => setDecision({ compte: c, action: "retablir" })}>
                          <Undo2 /> {t.liste.retablir}
                        </Bouton>
                      ) : (
                        c.id !== profil.id && (
                          <Bouton variante="danger" onClick={() => setDecision({ compte: c, action: "suspendre" })}>
                            {t.liste.suspendre}
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
        t={t}
        r={r}
        apres={(texte) => {
          setMessage({ ton: "vert", texte });
          recharger();
        }}
        echec={(texte) => setMessage({ ton: "rouge", texte })}
      />

      {e.exemptes.length > 0 && (
        <Carte titre={t.exemptes.titre}>
          <p className="text-[13px] text-zinc-600">{t.exemptes.texte}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {e.exemptes.map((x) => (
              <Badge key={x} ton="bleu">
                {x}
              </Badge>
            ))}
          </div>
        </Carte>
      )}

      <Carte titre={t.regles.titre}>
        <Tableau>
          <thead>
            <tr>
              <th>{t.regles.regle}</th>
              <th className="text-right">{t.regles.points}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(e.regles).map(([code, x]) => (
              <tr key={code}>
                <td className="text-[13px]">{x.libelle}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{x.immediate ? <Badge ton="rouge">{t.regles.immediate}</Badge> : `+${x.points}`}</td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      </Carte>

      {detail && <Chronologie t={t} compte={detail} regles={e.regles} fermer={() => setDetail(null)} />}
      {decision && (
        <Decision
          t={t}
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

/** Tout ce qui a été noté pour un compte, du plus récent au plus ancien. */
function Chronologie({ t, compte, regles, fermer }: { t: Textes; compte: Compte; regles: Etat["regles"]; fermer: () => void }) {
  const { donnees } = useApi<Evenement[]>(`/securite/comptes/${compte.id}`);
  return (
    <Modale titre={remplir(t.chronologie.titre, { nom: compte.nom })} ouverte fermer={fermer} large>
      {!donnees ? (
        <Chargement />
      ) : !donnees.length ? (
        <Vide>{t.chronologie.vide}</Vide>
      ) : (
        <ol className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {donnees.map((x) => {
            const palier = t.paliers[x.regle];
            const recentes = (x.details?.recentes as { t: number; m: string; chemin: string }[] | undefined) ?? null;
            const autres = Object.entries(x.details ?? {}).filter(([k]) => k !== "recentes");
            return (
              <li key={x.id} className="rounded-xl bg-zinc-50 px-3 py-2 text-[13px] ring-1 ring-zinc-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] tabular-nums text-zinc-500">{quand(x.creeLe)}</span>
                  {palier ? <Badge ton={(t.tons[x.regle] as "jaune" | "rouge" | "vert" | undefined) ?? "gris"}>{palier}</Badge> : <span className="font-medium">{regles[x.regle]?.libelle ?? x.regle}</span>}
                  {x.points > 0 && <span className="font-semibold text-or-700">+{x.points}</span>}
                  <span className="ml-auto text-[12px] text-zinc-500">{remplir(t.chronologie.score, { n: x.score })}</span>
                </div>
                {(x.chemin || x.ip) && (
                  <div className="mt-1 font-mono text-[11px] text-zinc-500">
                    {x.chemin} {x.ip ? `· ${x.ip}` : ""}
                  </div>
                )}
                {x.navigateur && (
                  <div className="truncate text-[11px] text-zinc-400" title={x.navigateur}>
                    {x.navigateur}
                  </div>
                )}
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
                    <summary className="cursor-pointer text-[12px] text-marque-700">{remplir(t.chronologie.requetes, { n: recentes.length })}</summary>
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
function Decision({ t, compte, action, fermer, apres }: { t: Textes; compte: Compte; action: "retablir" | "suspendre"; fermer: () => void; apres: (x: string) => void }) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const x = t[action];
  return (
    <Modale titre={remplir(x.titre, { nom: compte.nom })} ouverte fermer={fermer}>
      <p className="text-[13px] text-zinc-600">{x.texte}</p>
      {erreur && <p className="mt-2 text-[13px] text-rouge-600">{erreur}</p>}
      <Champ libelle={x.champ} className="mt-3">
        <Saisie value={motif} onChange={(ev) => setMotif(ev.target.value)} autoFocus placeholder={x.exemple} />
      </Champ>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>{t.annuler}</Bouton>
        <Bouton
          variante={action === "retablir" ? "principal" : "danger"}
          disabled={motif.trim().length < 5}
          onClick={async () => {
            try {
              await api.post(`/securite/comptes/${compte.id}/${action}`, { motif });
              apres(remplir(x.fait, { nom: compte.nom }));
            } catch (err) {
              setErreur((err as Error).message);
            }
          }}
        >
          {x.bouton}
        </Bouton>
      </div>
    </Modale>
  );
}

/** Mode et seuils. */
function ReglagesOutil({ t, r, apres, echec }: { t: Textes; r: Reglages; apres: (x: string) => void; echec: (x: string) => void }) {
  const [f, setF] = useState(r);
  const modifie = JSON.stringify(f) !== JSON.stringify(r);
  const nombre = (k: keyof Omit<Reglages, "mode">) => <Saisie type="number" min={5} value={f[k]} onChange={(ev) => setF({ ...f, [k]: Number(ev.target.value) })} />;
  return (
    <Carte titre={t.reglages.titre}>
      <div className="space-y-4">
        <div>
          <Segments
            valeur={f.mode}
            changer={(mode) => setF({ ...f, mode })}
            options={[
              { valeur: "OBSERVATION", libelle: t.reglages.observation },
              { valeur: "ACTIF", libelle: t.reglages.actif },
            ]}
          />
          <p className="mt-2 text-[12px] text-zinc-500">{f.mode === "ACTIF" ? t.reglages.explicationActif : t.reglages.explicationObservation}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Champ libelle={t.reglages.surveillance}>{nombre("surveillance")}</Champ>
          <Champ libelle={t.reglages.alerte}>{nombre("alerte")}</Champ>
          <Champ libelle={t.reglages.suspension}>{nombre("suspension")}</Champ>
          <Champ libelle={t.reglages.demiVie}>{nombre("demiVie")}</Champ>
        </div>
        <div className="flex justify-end gap-2">
          <Bouton disabled={!modifie} onClick={() => setF(r)}>
            {t.annuler}
          </Bouton>
          <Bouton
            variante="principal"
            disabled={!modifie}
            onClick={async () => {
              try {
                await api.put("/securite/reglages", f);
                apres(t.reglages.fait);
              } catch (err) {
                echec((err as Error).message);
              }
            }}
          >
            {t.reglages.enregistrer}
          </Bouton>
        </div>
      </div>
    </Carte>
  );
}
