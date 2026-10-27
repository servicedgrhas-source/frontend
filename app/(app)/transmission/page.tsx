"use client";

import { EnvoiTransmission } from "@/components/envoi-transmission";
import { ArrowRight, Download, FileSpreadsheet, Layers, Printer, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BaseEnvoyes } from "@/components/base-envoyes";
import { useSession } from "@/components/session";
import { accesDonne } from "@/lib/espaces";
import { useParametreUrl } from "@/lib/url";
import { Aide, Alerte, Annonce, Badge, Bouton, Carte, Chargement, EnTete, Modale, Pastille, Segments, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte, peut } from "@/lib/libelles";

interface Transmission {
  quota: number;
  numero: number;
  libelle: string;
  n: number;
  lots: number;
  saisies: number;
  rectifiees: number;
  textes: number;
  misesDeCote: number;
  date: string | null;
}

interface Quota {
  quota: number;
  pretes: number;
  prochaine: number;
  libelleProchaine: string;
  liste: Transmission[];
}

interface Etat {
  aControler: number;
  aValider: number;
  pretes: number;
  contentieux: number;
  quotas: Quota[];
}

/** Deux onglets : les transmissions (fichiers, listes) et la base des dossiers envoyés. */
export default function EnvoiFP() {
  // Onglet demandé dans l'adresse (« ?onglet=base »), puis celui choisi par clic
  const ongletUrl = useParametreUrl("onglet");
  const [choisi, setOnglet] = useState<"transmissions" | "base" | null>(null);
  const onglet = choisi ?? (ongletUrl === "base" ? "base" : "transmissions");
  return (
    <div className="space-y-5">
      <Segments
        valeur={onglet}
        changer={(o) => {
          setOnglet(o);
          window.history.replaceState(null, "", o === "base" ? "?onglet=base" : window.location.pathname);
        }}
        options={[
          { valeur: "transmissions", libelle: "Transmissions, fichiers et listes" },
          { valeur: "base", libelle: "Base des envoyés à la FP" },
        ]}
      />
      {onglet === "transmissions" ? (
        <Transmissions />
      ) : (
        <>
          <EnTete
            titre="Base des envoyés à la FP"
            sousTitre="Tous les dossiers partis à la Fonction Publique. Par défaut : ceux dont l’arrêté ou le décret n’est pas encore revenu. Cliquez sur un nom pour voir tout le dossier."
          />
          <BaseEnvoyes />
        </>
      )}
    </div>
  );
}

function Transmissions() {
  const { profil } = useSession();
  const { donnees, erreur, recharger } = useApi<Etat>("/transmissions");
  const [confirmer, setConfirmer] = useState<Quota | null>(null);
  const [annulation, setAnnulation] = useState<Transmission | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Base compilée : un quota (toutes ses transmissions ou une plage), ou tous les quotas
  const [compilation, setCompilation] = useState<"fp" | "dgrhas" | null>(null);
  const [plage, setPlage] = useState<{ quota: string; toutes: boolean; de: string; a: string }>({ quota: "", toutes: true, de: "", a: "" });
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const responsable = peut.controler(profil.role);
  // Chef de service, DRSC, bureau d'études : fichiers sans incidence financière ni bloc DGRHAS
  const budget = peut.voirBudget(profil.role);

  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  async function telecharger(chemin: string, nom: string) {
    try {
      await api.telecharger(chemin, nom);
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }
  const fichier = (t: { quota: number; numero: number }, modele: "fp" | "dgrhas") =>
    telecharger(
      `/transmissions/${t.quota}/${t.numero}/fichier?modele=${modele}`,
      `Quota ${t.quota} - Transmission ${t.numero} - ${modele === "fp" ? "Fonction Publique" : "DGRHAS"}.xlsx`,
    );

  async function transmettre(q: Quota, ids?: string[]) {
    setEnvoi(true);
    try {
      const r = await api.post<{ quota: number; numero: number; fiches: number }>("/transmissions", { quota: q.quota, ids });
      setConfirmer(null);
      setMessage({
        ton: "vert",
        texte: `${q.libelleProchaine} du quota ${r.quota} préparée : ${r.fiches} fiche(s). Le fichier pour la Fonction Publique se télécharge ; imprimez ensuite les listes par lot.`,
      });
      recharger();
      await fichier(r, "fp");
    } catch (e) {
      setConfirmer(null);
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  async function annuler(t: Transmission) {
    try {
      await api.post(`/transmissions/${t.quota}/${t.numero}/annuler`);
      setAnnulation(null);
      setMessage({ ton: "vert", texte: "Transmission annulée : les fiches sont de nouveau « validées », prêtes à partir." });
      recharger();
    } catch (e) {
      setAnnulation(null);
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  const quotaChoisi = donnees?.quotas.find((q) => String(q.quota) === plage.quota);
  const plageOk = plage.toutes || !plage.quota || (!!plage.de && !!plage.a && Number(plage.de) <= Number(plage.a));
  const aucune = !!donnees && !donnees.quotas.length;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Envoi à la Fonction Publique"
        sousTitre="Chaque quota (année de recrutement) a ses propres transmissions : 1ère, 2ème, 3ème… Une transmission est un envoi de plusieurs lots de la commission. Le système produit le fichier Excel pour la FP et les listes imprimées, une par lot."
        actions={
          donnees?.quotas.some((q) => q.liste.length) && responsable ? (
            <>
              <Bouton onClick={() => setCompilation("fp")}>
                <Layers /> Base compilée (FP)
                <Aide>
                  <strong>Pour le suivi interne de la DGRHAS</strong> (il ne s’envoie pas) : un seul fichier Excel qui réunit plusieurs transmissions, avec les mêmes
                  colonnes que le fichier FP. Pour les envois déjà revenus, on y voit les arrêtés et décrets reçus. Vous choisissez le quota, puis toutes ses
                  transmissions ou seulement certaines.
                  {!budget && " L’incidence financière n’y figure pas : elle est réservée au DG."}
                </Aide>
              </Bouton>
              {budget && (
                <Bouton onClick={() => setCompilation("dgrhas")}>
                  <Layers /> Base compilée (DGRHAS)
                  <Aide>
                    La même base compilée, avec en plus les informations <strong>internes</strong> : origine du dossier, observations, fiches corrigées après
                    l’envoi. Pour les archives de la DGRHAS.
                  </Aide>
                </Bouton>
              )}
            </>
          ) : undefined
        }
      />
      {erreur && <Alerte>{erreur}</Alerte>}
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>

      {!donnees ? (
        <Chargement />
      ) : (
        <>
          {(donnees.aControler > 0 || donnees.aValider > 0 || donnees.contentieux > 0) && (
            <Alerte ton="bleu">
              Pas encore prêtes à partir :{" "}
              <Link href="/candidats" className="font-semibold underline">
                {donnees.aControler} à contrôler, {donnees.aValider} à valider par le DG
              </Link>
              {donnees.contentieux > 0 && `, ${donnees.contentieux} en contentieux (âge)`}.
            </Alerte>
          )}

          {budget ? (
            <Alerte ton="bleu">
              <strong>Fichier pour la FP</strong> : tous les champs (commission, retour FP à remplir, catégorie, indice, salaire brut et incidence annuelle).
              <strong> Fichier DGRHAS</strong> : en plus, l’origine des dossiers et les observations, qui restent internes. Le chef de service, la DRSC et le
              bureau d’études reçoivent ces fichiers sans l’incidence financière : le fichier complet pour la FP se télécharge ici par le DG.
            </Alerte>
          ) : (
            <Alerte ton="bleu">
              Vos fichiers Excel contiennent la commission et le retour FP, <strong>sans l’incidence financière</strong> (salaires, montants) ni les informations
              internes : elles sont réservées au DG. Le fichier complet à remettre à la FP est téléchargé par le DG.
            </Alerte>
          )}

          {aucune && <Vide>Aucune fiche validée ni transmission pour le moment.</Vide>}

          {donnees.quotas.map((q) => {
            const derniere = q.liste[0];
            return (
              <Carte key={q.quota} titre={`Quota ${q.quota}`}>
                {/* Prochain envoi de ce quota */}
                <section className="mb-5 flex flex-wrap items-center gap-5 rounded-2xl bg-zinc-50 p-5">
                  <Pastille ton={q.pretes ? "vert" : "gris"} taille="lg">
                    <Send />
                  </Pastille>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-zinc-400">Prochain envoi du quota {q.quota}</div>
                    <div className="text-xl font-semibold">{q.libelleProchaine}</div>
                    <div className="mt-1 text-[13px] text-zinc-500">
                      <strong className="text-encre">{q.pretes}</strong> fiche(s) validée(s) par le DG, prête(s) à partir
                    </div>
                  </div>
                  {responsable ? (
                    <Bouton variante="principal" disabled={!q.pretes} onClick={() => setConfirmer(q)}>
                      Préparer la {q.libelleProchaine} ({q.pretes}) <ArrowRight />
                    </Bouton>
                  ) : (
                    <span className="max-w-56 text-[12px] text-zinc-400">L’envoi est préparé par le chef de service, la DRSC, le bureau d’études ou le DG.</span>
                  )}
                </section>

                {!q.liste.length ? (
                  <Vide>Aucune transmission pour ce quota.</Vide>
                ) : (
                  <Tableau>
                    <thead>
                      <tr>
                        <th>Transmission</th>
                        <th>Date d’envoi</th>
                        <th>Dossiers</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {q.liste.map((t) => (
                        <tr key={t.numero}>
                          <td>
                            <div className="flex items-center gap-3">
                              <Pastille ton="vert" taille="sm">
                                <FileSpreadsheet />
                              </Pastille>
                              <div>
                                <div className="font-medium">{t.libelle}</div>
                                {t.lots > 0 && <div className="text-[11px] text-zinc-400">{t.lots} lot(s) de la commission</div>}
                              </div>
                            </div>
                          </td>
                          <td>{t.date ? dateCourte(t.date) : <span className="text-zinc-400">avant le système</span>}</td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1">
                              {t.n}
                              {t.saisies === t.n ? <Badge ton="vert">saisis dans le système</Badge> : t.saisies ? <Badge>dont {t.saisies} saisis ici</Badge> : <Badge>fichier Excel</Badge>}
                              {t.textes > 0 && <Badge ton="bleu">{t.textes} texte(s) reçu(s)</Badge>}
                              {t.rectifiees > 0 && <Badge ton="jaune">{t.rectifiees} corrigé(s) après envoi</Badge>}
                              {t.misesDeCote > 0 && (
                                <Link href="/candidats">
                                  <Badge ton="rouge">{t.misesDeCote} mis de côté →</Badge>
                                </Link>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2 whitespace-nowrap">
                              {responsable && derniere?.numero === t.numero && t.saisies === t.n && !t.textes && (
                                <Bouton variante="discret" onClick={() => setAnnulation(t)}>
                                  <RotateCcw /> Annuler
                                </Bouton>
                              )}
                              <Link href={`/impression/soit-transmis/${t.numero}?quota=${t.quota}`} target="_blank">
                                <Bouton>
                                  <Printer /> Soit-transmis
                                  <Aide>
                                    La <strong>lettre du Cabinet</strong> qui accompagne cette transmission : le tableau (type de dossiers, cycle, catégorie, nombre de lots
                                    et de dossiers) est rempli automatiquement. Vous complétez le n° et la date, puis vous imprimez.
                                  </Aide>
                                </Bouton>
                              </Link>
                              <Link href={`/impression/listes/${t.numero}?quota=${t.quota}`} target="_blank">
                                <Bouton>
                                  <Printer /> Listes par lot
                                  <Aide>
                                    Les listes <strong>à imprimer et faire signer</strong>, une par lot de la commission (même quota, même statut, même diplôme).
                                    Elles accompagnent les dossiers papier envoyés à la Fonction Publique.
                                  </Aide>
                                </Bouton>
                              </Link>
                              {responsable && (
                                <>
                                  <Bouton onClick={() => fichier(t, "fp")}>
                                    <Download /> Fichier FP
                                    <Aide>
                                      {budget ? (
                                        <>
                                          Le fichier Excel <strong>à envoyer à la Fonction Publique</strong> pour cette transmission : commission, catégorie, indice,
                                          salaire, incidence, et les colonnes « Retour F.P » que la FP remplit.
                                        </>
                                      ) : (
                                        <>
                                          Le fichier Excel de cette transmission : commission et colonnes « Retour F.P ». <strong>Sans l’incidence financière</strong>,
                                          réservée au DG : c’est lui qui télécharge le fichier complet à remettre à la FP.
                                        </>
                                      )}
                                    </Aide>
                                  </Bouton>
                                  {budget && (
                                    <Bouton onClick={() => fichier(t, "dgrhas")}>
                                      <Download /> DGRHAS
                                      <Aide>
                                        Le même fichier, avec en plus l’origine des dossiers et les observations. <strong>Il reste à la DGRHAS</strong> : ne pas l’envoyer.
                                      </Aide>
                                    </Bouton>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                )}
                <p className="mt-3 text-[12px] text-zinc-400">
                  Un dossier que la FP dit incomplet se <strong>met de côté</strong> dans « Saisie des candidats », onglet « 4. Envoyées à la FP » : il revient à
                  contrôler, puis repart dans sa transmission d’origine ou dans la suivante.
                </p>
              </Carte>
            );
          })}

          <Modale titre={`Préparer la ${confirmer?.libelleProchaine ?? ""} du quota ${confirmer?.quota ?? ""}`} ouverte={!!confirmer} fermer={() => setConfirmer(null)} large>
            <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
              <p>
                <strong>{confirmer?.pretes} fiche(s) validée(s)</strong> du quota {confirmer?.quota} sont prêtes : envoyez-les toutes, ou cochez celles qui partent dans la{" "}
                {confirmer?.libelleProchaine}. Ensuite :
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>le fichier Excel pour la Fonction Publique se télécharge ;</li>
                <li>
                  imprimez les <strong>listes par lot</strong> à joindre aux dossiers papier, pour signature ;
                </li>
                <li>si la FP dit un dossier incomplet, mettez-le de côté pour le corriger ;</li>
                <li>quand les arrêtés reviendront, enregistrez-les dans « Réception des textes ».</li>
              </ul>
            </div>
            {confirmer && (
              <div className="mt-5">
                <EnvoiTransmission
                  quota={confirmer.quota}
                  pretes={confirmer.pretes}
                  libelleProchaine={confirmer.libelleProchaine}
                  chargement={envoi}
                  envoyer={(ids) => transmettre(confirmer, ids)}
                />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Bouton onClick={() => setConfirmer(null)}>Annuler</Bouton>
            </div>
          </Modale>

          <Modale titre="Annuler cette transmission ?" ouverte={!!annulation} fermer={() => setAnnulation(null)}>
            <p className="text-[13px] leading-relaxed text-zinc-600">
              À faire seulement si le fichier <strong>n’a pas encore été envoyé</strong> à la Fonction Publique. Les {annulation?.n} fiche(s) de la {annulation?.libelle}{" "}
              du quota {annulation?.quota} redeviendront « validées » et pourront partir dans un prochain envoi.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Bouton onClick={() => setAnnulation(null)}>Ne rien faire</Bouton>
              <Bouton variante="danger" onClick={() => annulation && annuler(annulation)}>
                Annuler la transmission
              </Bouton>
            </div>
          </Modale>

          <Modale titre={`Base compilée (${compilation === "dgrhas" ? "DGRHAS" : "FP"})`} ouverte={!!compilation} fermer={() => setCompilation(null)}>
            <div className="space-y-4 text-[13px]">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-500">Quel quota ?</span>
                <select
                  className="rounded-lg bg-zinc-100 px-3 py-2"
                  value={plage.quota}
                  onChange={(e) => setPlage({ quota: e.target.value, toutes: true, de: "", a: "" })}
                >
                  <option value="">Tous les quotas</option>
                  {donnees.quotas
                    .filter((q) => q.liste.length)
                    .map((q) => (
                      <option key={q.quota} value={q.quota}>
                        Quota {q.quota} ({q.liste.length} transmission(s))
                      </option>
                    ))}
                </select>
              </label>
              {quotaChoisi && (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" checked={plage.toutes} onChange={() => setPlage({ ...plage, toutes: true })} />
                    Toutes les transmissions du quota {quotaChoisi.quota}
                  </label>
                  <label className="flex cursor-pointer flex-wrap items-center gap-2">
                    <input type="radio" checked={!plage.toutes} onChange={() => setPlage({ ...plage, toutes: false })} />
                    De la
                    <select className="rounded-lg bg-zinc-100 px-2 py-1" value={plage.de} onChange={(e) => setPlage({ ...plage, toutes: false, de: e.target.value })}>
                      <option value="">—</option>
                      {[...quotaChoisi.liste].reverse().map((t) => (
                        <option key={t.numero} value={t.numero}>
                          {t.libelle}
                        </option>
                      ))}
                    </select>
                    à la
                    <select className="rounded-lg bg-zinc-100 px-2 py-1" value={plage.a} onChange={(e) => setPlage({ ...plage, toutes: false, a: e.target.value })}>
                      <option value="">—</option>
                      {[...quotaChoisi.liste].reverse().map((t) => (
                        <option key={t.numero} value={t.numero}>
                          {t.libelle}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!plageOk && plage.de && plage.a && <Alerte>La première transmission doit venir avant la dernière.</Alerte>}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Bouton onClick={() => setCompilation(null)}>Annuler</Bouton>
              <Bouton
                variante="principal"
                disabled={!plageOk}
                onClick={async () => {
                  const m = compilation ?? "fp";
                  const q = plage.quota ? `&quota=${plage.quota}` : "";
                  const filtre = plage.quota && !plage.toutes ? `&de=${plage.de}&a=${plage.a}` : "";
                  const nom = plage.quota ? `quota ${plage.quota}${filtre ? ` - transmissions ${plage.de} a ${plage.a}` : ""}` : "tous les quotas";
                  // La fenêtre reste ouverte, bouton grisé, pendant que le fichier se prépare
                  await telecharger(`/transmissions/compilation/fichier?modele=${m}${q}${filtre}`, `Base compilee - ${nom}${m === "dgrhas" ? " - DGRHAS" : ""}.xlsx`);
                  setCompilation(null);
                }}
              >
                <Download /> Télécharger
              </Bouton>
            </div>
          </Modale>
        </>
      )}
    </div>
  );
}
