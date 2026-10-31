"use client";

import { AlertTriangle, ChevronDown, ChevronRight, Cloud, CloudUpload, Database, Download, HardDrive, History, LifeBuoy, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Apercu {
  tables: { table: string; lignes: number }[];
  totalLignes: number;
  tailleOctets: number;
  dernieres: { date: string; par: string | null; action: string; details: { fichier?: string; tables?: number; lignes?: number } | null }[];
}

interface EtatCloudinary {
  configure: boolean;
  cloud: string | null;
  erreur: string | null;
  fichiers: { publicId: string; nom: string; octets: number; creeLe: string }[];
}

/** Ce que contient chaque table, en mots de la DGRHAS. */
const NOMS: Record<string, string> = {
  agent: "Base des recrutés",
  affectation: "Affectations",
  note_service: "Notes de service",
  lot_publication: "Lots de publication",
  paquet_reception: "Paquets de textes reçus",
  recommandation: "Recommandations",
  reference_note: "Notes signées hors du système",
  agent_recense: "Personnel (recensement)",
  modification_recensement: "Modifications du recensement",
  piece_recensement: "Pièces du recensement",
  demande_mutation: "Demandes de mutation",
  nomination: "Nominations",
  volontaire: "Registre des volontaires",
  mouvement_volontaire: "Mouvements des volontaires",
  enrole: "Enrôlés",
  campagne_enrolement: "Campagnes d’enrôlement",
  membre_enrolement: "Commission d’enrôlement",
  ancien_recrute: "Recrutés des années passées",
  structure: "Structures (écoles, directions…)",
  besoin_personnel: "Besoins en personnel",
  besoin_etablissement: "Besoins des établissements",
  cadre_organique: "Cadre organique",
  emploi_du_temps: "Emplois du temps",
  presence: "Présences",
  semaine_presence: "Semaines de présence",
  journal: "Journal des actions",
  utilisateur: "Comptes des utilisateurs",
  parametre: "Paramètres",
  regle_diplome: "Règles des diplômes",
  grade: "Grades",
  departement: "Départements",
  referentiel: "Listes de référence",
  piece_jointe: "Pièces jointes (références)",
  doublon_distinct: "Doublons tranchés",
  repartition: "Répartitions du quota « Autres »",
  enveloppe: "Enveloppes budgétaires",
  beneficiaire: "Bénéficiaires du quota",
  evenement_carriere: "Carrière (événements)",
  evaluation_agent: "Évaluations",
  alerte: "Alertes",
};

const nf = new Intl.NumberFormat("fr-FR");
const petiteTaille = (o: number) => (o >= 1024 ** 2 ? `${(o / 1024 ** 2).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
const taille = (o: number) => (o >= 1024 ** 3 ? `${(o / 1024 ** 3).toFixed(1)} Go` : `${Math.max(1, Math.round(o / 1024 ** 2))} Mo`);
const quand = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

/**
 * Sauvegarde de la base (DG, 31/10/2026) : un fichier avec toutes les données, à télécharger et à
 * garder en lieu sûr ; de quoi tout remettre en place si la base en ligne est perdue ou abîmée.
 */
export default function Sauvegarde() {
  const { profil } = useSession();
  const apercu = useApi<Apercu>(peut.administrer(profil.role) ? "/sauvegarde/apercu" : null);
  // Copie chez Cloudinary (DG, 31/10/2026) : fichier privé, récupéré par un lien signé qui expire
  const cloudinary = useApi<EtatCloudinary>(peut.administrer(profil.role) ? "/sauvegarde/cloudinary" : null);
  const [envoiCloud, setEnvoiCloud] = useState(false);
  const [engage, setEngage] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [voirTables, setVoirTables] = useState(false);
  const [voirRestauration, setVoirRestauration] = useState(false);
  // Heure d'ouverture de la page : « il y a N jours »
  const [maintenant] = useState(() => Date.now());
  // Sauvegarde : le DG et l'administrateur seulement (jamais ouverte par les droits par rubrique)
  if (!peut.administrer(profil.role)) return <Alerte>La sauvegarde de la base est réservée au DG et à l’administrateur.</Alerte>;

  const a = apercu.donnees;
  const derniere = a?.dernieres[0];
  const jours = derniere ? Math.floor((maintenant - new Date(derniere.date).getTime()) / 86_400_000) : null;

  async function envoyerCloudinary() {
    setEnvoiCloud(true);
    setMessage(null);
    try {
      const r = await api.post<{ fichier: string; octets: number; lignes: number }>("/sauvegarde/cloudinary", {});
      setMessage({ ton: "vert", texte: `Sauvegarde envoyée chez Cloudinary : ${r.fichier} (${petiteTaille(r.octets)}, ${nf.format(r.lignes)} lignes), en fichier privé.` });
      setEngage(false);
      apercu.recharger();
      cloudinary.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoiCloud(false);
    }
  }

  /** Lien signé (5 minutes) vers une sauvegarde gardée chez Cloudinary. */
  async function recuperer(publicId: string) {
    try {
      const { url } = await api.get<{ url: string }>(`/sauvegarde/cloudinary/lien?publicId=${encodeURIComponent(publicId)}`);
      window.location.assign(url);
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  async function telecharger() {
    setEnvoi(true);
    setMessage(null);
    const d = new Date();
    const deux = (n: number) => String(n).padStart(2, "0");
    try {
      await api.telecharger("/sauvegarde/telecharger", `sauvegarde-sigrhas-${d.getFullYear()}${deux(d.getMonth() + 1)}${deux(d.getDate())}-${deux(d.getHours())}${deux(d.getMinutes())}.sql.gz`);
      setMessage({ ton: "vert", texte: "Sauvegarde téléchargée. Rangez le fichier en lieu sûr (voir les conseils ci-dessous)." });
      setEngage(false);
      apercu.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-5">
      <EnTete
        titre="Sauvegarde de la base"
        sousTitre="Un fichier avec toutes les données du système (recrutés, affectations, notes, personnel, mutations, enrôlement, comptes, paramètres…) : de quoi tout remettre en place si la base en ligne est perdue ou abîmée."
      />

      <Alerte ton="rouge">
        <span className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Le fichier contient toutes les données personnelles</strong> (noms, dates de naissance, textes, comptes). Gardez-le sur un support à
            vous (clé USB rangée, disque du service), jamais sur un ordinateur partagé. Ne l’envoyez <strong>jamais</strong> par e-mail, WhatsApp ou une
            messagerie. Chaque téléchargement est inscrit au journal, avec votre nom.
          </span>
        </span>
      </Alerte>

      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      {!a ? (
        <Chargement />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              [<Database key="i" className="size-5" />, "Données enregistrées", `${nf.format(a.totalLignes)} lignes`, `${a.tables.length} tables`],
              [<HardDrive key="i" className="size-5" />, "Taille de la base", taille(a.tailleOctets), "Le fichier est compressé : bien plus petit"],
              [
                <History key="i" className="size-5" />,
                "Dernière sauvegarde",
                derniere ? (jours === 0 ? "Aujourd’hui" : jours === 1 ? "Hier" : `Il y a ${jours} jours`) : "Jamais",
                derniere ? `${quand(derniere.date)}${derniere.par ? ` · ${derniere.par}` : ""}` : "Aucune sauvegarde téléchargée",
              ],
              [
                <AlertTriangle key="i" className="size-5" />,
                "Conseil",
                "Une par semaine",
                "Et toujours avant un import important, un vidage ou une grosse correction",
              ],
            ].map(([icone, titre, valeur, detail], i) => (
              <div key={i} className={`rounded-3xl p-4 shadow-doux ${i === 2 && (jours === null || jours > 7) ? "bg-or-100/60" : "bg-white"}`}>
                <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                  {icone}
                  {titre}
                </div>
                <div className="mt-1 text-xl font-semibold text-encre">{valeur}</div>
                <div className="text-[12px] text-zinc-500">{detail}</div>
              </div>
            ))}
          </div>
          {(jours === null || jours > 7) && (
            <Alerte ton="jaune">{jours === null ? "Aucune sauvegarde n’a encore été téléchargée." : `La dernière sauvegarde date de ${jours} jours.`} Faites-en une maintenant.</Alerte>
          )}

          <Carte titre="Télécharger une sauvegarde">
            <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-zinc-600">
              <li>
                Le serveur prépare un fichier <strong>« sauvegarde-sigrhas-AAAAMMJJ-HHMM.sql.gz »</strong> avec toutes les données, telles qu’elles sont à
                l’instant du clic. Cela prend quelques secondes à une minute.
              </li>
              <li>Le navigateur l’enregistre (dossier Téléchargements, ou celui que vous choisissez).</li>
              <li>Copiez-le sur votre support de sauvegarde, puis supprimez-le de l’ordinateur s’il n’est pas à vous.</li>
            </ol>
            <label className="mt-4 flex items-start gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
              <input type="checkbox" className="mt-0.5" checked={engage} onChange={(e) => setEngage(e.target.checked)} />
              <span>
                Je garderai ce fichier en lieu sûr et je ne l’enverrai par aucune messagerie. Je sais qu’il contient les données personnelles de tous les
                agents.
              </span>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Bouton variante="principal" disabled={!engage || envoi} onClick={telecharger}>
                <Download /> {envoi ? "Préparation de la sauvegarde…" : "Télécharger la sauvegarde"}
              </Bouton>
              <Bouton
                disabled={!engage || envoiCloud || !cloudinary.donnees?.configure}
                onClick={envoyerCloudinary}
                title={cloudinary.donnees?.configure ? undefined : "Cloudinary n’est pas réglé sur le serveur"}
              >
                <CloudUpload /> {envoiCloud ? "Envoi chez Cloudinary…" : "Envoyer chez Cloudinary"}
              </Bouton>
              <span className="text-[12px] text-zinc-500">Les fichiers joints (scans des textes, pièces) ne sont pas dans ce fichier : ils restent dans le stockage des fichiers.</span>
            </div>
          </Carte>

          <Carte titre="Copie chez Cloudinary">
            {!cloudinary.donnees ? (
              <Chargement />
            ) : !cloudinary.donnees.configure ? (
              <div className="space-y-2 text-[13px] leading-relaxed text-zinc-600">
                <p>
                  <strong>Cloudinary n’est pas encore réglé.</strong> Une copie chez Cloudinary garde la sauvegarde hors du bureau : si l’ordinateur ou la clé
                  est perdu, elle reste récupérable.
                </p>
                <p>
                  Pour l’activer, l’informaticien ajoute sur le serveur (Render › Environment) le réglage{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px]">CLOUDINARY_URL</code>, copié depuis le tableau de bord Cloudinary (« API
                  environment variable », de la forme <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px]">{"cloudinary://clé:secret@nom"}</code>),
                  puis redémarre le serveur.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-600">
                  <Cloud className="mt-0.5 size-4 shrink-0 text-marque-600" />
                  <span>
                    Compte Cloudinary <strong>{cloudinary.donnees.cloud}</strong>, dossier « sauvegardes-sigrhas ». Les fichiers y sont <strong>privés</strong> :
                    aucune adresse publique ; « Récupérer » donne un lien valable 5 minutes. Gardez l’accès à ce compte Cloudinary pour vous seuls.
                  </span>
                </p>
                {cloudinary.donnees.erreur && <Alerte>{cloudinary.donnees.erreur}</Alerte>}
                {!cloudinary.donnees.fichiers.length ? (
                  <Vide>Aucune sauvegarde chez Cloudinary pour l’instant.</Vide>
                ) : (
                  <Tableau>
                    <thead>
                      <tr>
                        <th>Envoyée le</th>
                        <th>Fichier</th>
                        <th className="text-right">Taille</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {cloudinary.donnees.fichiers.map((f) => (
                        <tr key={f.publicId}>
                          <td className="whitespace-nowrap">{quand(f.creeLe)}</td>
                          <td className="text-[12px] text-zinc-600">{f.nom}</td>
                          <td className="text-right tabular-nums">{petiteTaille(f.octets)}</td>
                          <td className="text-right">
                            <Bouton variante="discret" onClick={() => recuperer(f.publicId)}>
                              <Download /> Récupérer
                            </Bouton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                )}
              </div>
            )}
          </Carte>

          <Carte titre="Dernières sauvegardes">
            {!a.dernieres.length ? (
              <Vide>Aucune sauvegarde téléchargée pour l’instant.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Où</th>
                    <th>Par</th>
                    <th>Fichier</th>
                    <th className="text-right">Lignes</th>
                  </tr>
                </thead>
                <tbody>
                  {a.dernieres.map((s) => (
                    <tr key={`${s.date}-${s.action}`}>
                      <td className="whitespace-nowrap">{quand(s.date)}</td>
                      <td>{s.action === "SAUVEGARDE_CLOUDINARY" ? <Badge ton="bleu">Cloudinary</Badge> : <Badge>Téléchargée</Badge>}</td>
                      <td>{s.par ?? "—"}</td>
                      <td className="text-[12px] text-zinc-600">{s.details?.fichier ?? "—"}</td>
                      <td className="text-right tabular-nums">{s.details?.lignes ? nf.format(s.details.lignes) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Carte>

          <Carte titre="Ce que contient la sauvegarde">
            <div className="flex flex-wrap gap-2">
              {a.tables.slice(0, 12).map((t) => (
                <Badge key={t.table}>
                  {NOMS[t.table] ?? t.table} : {nf.format(t.lignes)}
                </Badge>
              ))}
            </div>
            <button type="button" className="mt-3 flex items-center gap-1 text-[13px] font-medium text-zinc-600 hover:text-marque-700" onClick={() => setVoirTables(!voirTables)}>
              {voirTables ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} Toutes les tables ({a.tables.length})
            </button>
            {voirTables && (
              <div className="mt-2 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
                {a.tables.map((t) => (
                  <div key={t.table} className="flex justify-between border-b border-zinc-100 py-1">
                    <span>
                      {NOMS[t.table] ?? t.table}
                      {NOMS[t.table] && <span className="text-zinc-400"> · {t.table}</span>}
                    </span>
                    <span className="tabular-nums text-zinc-500">{nf.format(t.lignes)}</span>
                  </div>
                ))}
              </div>
            )}
          </Carte>

          <Carte>
            <button type="button" className="flex w-full items-center gap-2 text-left text-[15px] font-semibold text-encre" onClick={() => setVoirRestauration(!voirRestauration)}>
              <LifeBuoy className="size-5 text-marque-600" /> En cas de problème : remettre une sauvegarde en place
              {voirRestauration ? <ChevronDown className="ml-auto size-4" /> : <ChevronRight className="ml-auto size-4" />}
            </button>
            {voirRestauration && (
              <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-zinc-600">
                <p>
                  La remise en place se fait par la personne qui s’occupe du serveur (informaticien), pas depuis cette page : elle <strong>remplace toutes
                  les données</strong> par celles du fichier.
                </p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Créer une base PostgreSQL vide (ou vider l’ancienne).</li>
                  <li>Démarrer une fois le serveur SIGRHAS branché sur cette base : il crée toutes les tables.</li>
                  <li>
                    Décompresser le fichier (.gz), puis l’exécuter sur la base, par exemple :{" "}
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px]">{'psql "adresse de la base" -f sauvegarde-sigrhas-….sql'}</code>
                  </li>
                  <li>Vérifier sur cette page que les nombres de lignes sont revenus.</li>
                </ol>
                <p className="text-[12px] text-zinc-500">
                  Le fichier est complet ou rien : s’il a été coupé pendant le téléchargement, il ne restaure rien (il faut en télécharger un autre).
                </p>
              </div>
            )}
          </Carte>
        </>
      )}
    </div>
  );
}
