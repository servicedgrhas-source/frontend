"use client";

import { AlertTriangle, ChevronDown, ChevronRight, Cloud, CloudUpload, Database, Download, HardDrive, History, LifeBuoy, ShieldAlert } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Chargement, EnTete, Tableau, Vide } from "@/components/ui";
import { api, useApi } from "@/lib/api";

/*
 * Page réservée (08/11/2026) : le serveur ne l'ouvre qu'aux comptes autorisés et envoie tous ses
 * textes avec les données ; rien n'est écrit ici.
 */

type Textes = Record<string, Record<string, string | string[]>> & { titre: string; sousTitre: string; avertissement: string; rappelJamais: string; rappelVieille: string };

interface Apercu {
  tables: { table: string; lignes: number }[];
  totalLignes: number;
  tailleOctets: number;
  dernieres: { date: string; par: string | null; action: string; details: { fichier?: string; tables?: number; lignes?: number } | null }[];
  textes: Textes;
  noms: Record<string, string>;
}

interface EtatCloudinary {
  configure: boolean;
  cloud: string | null;
  erreur: string | null;
  fichiers: { publicId: string; nom: string; octets: number; creeLe: string }[];
}

const nf = new Intl.NumberFormat("fr-FR");
const petiteTaille = (o: number) => (o >= 1024 ** 2 ? `${(o / 1024 ** 2).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
const taille = (o: number) => (o >= 1024 ** 3 ? `${(o / 1024 ** 3).toFixed(1)} Go` : `${Math.max(1, Math.round(o / 1024 ** 2))} Mo`);
const quand = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

/** Remplace {n}, {jours}… et met en forme **gras** et `code` dans un texte du serveur. */
function Texte({ t, v = {} }: { t: string | string[] | undefined; v?: Record<string, string | number> }) {
  const s = (Array.isArray(t) ? t.join(" ") : (t ?? "")).replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
  const morceaux: ReactNode[] = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((m, i) =>
    m.startsWith("**") ? (
      <strong key={i}>{m.slice(2, -2)}</strong>
    ) : m.startsWith("`") ? (
      <code key={i} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px]">
        {m.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{m}</Fragment>
    ),
  );
  return <>{morceaux}</>;
}
const brut = (t: string | string[] | undefined, v: Record<string, string | number> = {}) => (Array.isArray(t) ? t.join(" ") : (t ?? "")).replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

export default function Sauvegarde() {
  const { profil } = useSession();
  const permis = !!profil.sauvegarde;
  const apercu = useApi<Apercu>(permis ? "/sauvegarde/apercu" : null);
  const cloudinary = useApi<EtatCloudinary>(permis ? "/sauvegarde/cloudinary" : null);
  const [envoiCloud, setEnvoiCloud] = useState(false);
  const [engage, setEngage] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const [voirTables, setVoirTables] = useState(false);
  const [voirRestauration, setVoirRestauration] = useState(false);
  const [maintenant] = useState(() => Date.now());
  if (!permis || apercu.erreur) return <Vide>Page introuvable.</Vide>;

  const a = apercu.donnees;
  if (!a) return <Chargement />;
  const t = a.textes;
  const derniere = a.dernieres[0];
  const jours = derniere ? Math.floor((maintenant - new Date(derniere.date).getTime()) / 86_400_000) : null;

  async function envoyerCloudinary() {
    setEnvoiCloud(true);
    setMessage(null);
    try {
      const r = await api.post<{ fichier: string; octets: number; lignes: number }>("/sauvegarde/cloudinary", {});
      setMessage({ ton: "vert", texte: brut(t.telecharger.faitCloudinary, { fichier: r.fichier, taille: petiteTaille(r.octets), lignes: nf.format(r.lignes) }) });
      setEngage(false);
      apercu.recharger();
      cloudinary.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoiCloud(false);
    }
  }

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
      setMessage({ ton: "vert", texte: brut(t.telecharger.fait) });
      setEngage(false);
      apercu.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  const c = t.chiffres;
  const cl = cloudinary.donnees;
  return (
    <div className="space-y-5">
      <EnTete titre={t.titre} sousTitre={t.sousTitre} />

      <Alerte ton="rouge">
        <span className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            <Texte t={t.avertissement} />
          </span>
        </span>
      </Alerte>

      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          [<Database key="i" className="size-5" />, c.donnees, brut(c.lignes, { n: nf.format(a.totalLignes) }), brut(c.tables, { n: a.tables.length })],
          [<HardDrive key="i" className="size-5" />, c.taille, taille(a.tailleOctets), c.tailleDetail],
          [
            <History key="i" className="size-5" />,
            c.derniere,
            derniere ? (jours === 0 ? c.aujourdhui : jours === 1 ? c.hier : brut(c.ilYa, { jours: jours ?? 0 })) : c.jamais,
            derniere ? `${quand(derniere.date)}${derniere.par ? ` · ${derniere.par}` : ""}` : c.aucune,
          ],
          [<AlertTriangle key="i" className="size-5" />, c.conseil, c.conseilValeur, c.conseilDetail],
        ].map(([icone, titre, valeur, detail], i) => (
          <div key={i} className={`rounded-3xl p-4 shadow-doux ${i === 2 && (jours === null || jours > 7) ? "bg-or-100/60" : "bg-white"}`}>
            <div className="flex items-center gap-2 text-[12px] text-zinc-500">
              {icone as ReactNode}
              {titre as string}
            </div>
            <div className="mt-1 text-xl font-semibold text-encre">{valeur as string}</div>
            <div className="text-[12px] text-zinc-500">{detail as string}</div>
          </div>
        ))}
      </div>
      {(jours === null || jours > 7) && <Alerte ton="jaune">{jours === null ? t.rappelJamais : brut(t.rappelVieille, { jours })}</Alerte>}

      <Carte titre={brut(t.telecharger.titre)}>
        <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-zinc-600">
          {(t.telecharger.etapes as string[]).map((x, i) => (
            <li key={i}>
              <Texte t={x} />
            </li>
          ))}
        </ol>
        <label className="mt-4 flex items-start gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
          <input type="checkbox" className="mt-0.5" checked={engage} onChange={(e) => setEngage(e.target.checked)} />
          <span>{brut(t.telecharger.engagement)}</span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Bouton variante="principal" disabled={!engage || envoi} onClick={telecharger}>
            <Download /> {brut(envoi ? t.telecharger.enCours : t.telecharger.bouton)}
          </Bouton>
          <Bouton disabled={!engage || envoiCloud || !cl?.configure} onClick={envoyerCloudinary} title={cl?.configure ? undefined : brut(t.telecharger.cloudinaryNonRegle)}>
            <CloudUpload /> {brut(envoiCloud ? t.telecharger.cloudinaryEnCours : t.telecharger.cloudinary)}
          </Bouton>
          <span className="text-[12px] text-zinc-500">{brut(t.telecharger.pieces)}</span>
        </div>
      </Carte>

      <Carte titre={brut(t.cloudinary.titre)}>
        {!cl ? (
          <Chargement />
        ) : !cl.configure ? (
          <div className="space-y-2 text-[13px] leading-relaxed text-zinc-600">
            {(t.cloudinary.nonRegle as string[]).map((x, i) => (
              <p key={i}>
                <Texte t={x} />
              </p>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-600">
              <Cloud className="mt-0.5 size-4 shrink-0 text-marque-600" />
              <span>
                <Texte t={t.cloudinary.regle} v={{ cloud: cl.cloud ?? "" }} />
              </span>
            </p>
            {cl.erreur && <Alerte>{cl.erreur}</Alerte>}
            {!cl.fichiers.length ? (
              <Vide>{brut(t.cloudinary.vide)}</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>{brut(t.cloudinary.envoyeeLe)}</th>
                    <th>{brut(t.cloudinary.fichier)}</th>
                    <th className="text-right">{brut(t.cloudinary.taille)}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cl.fichiers.map((f) => (
                    <tr key={f.publicId}>
                      <td className="whitespace-nowrap">{quand(f.creeLe)}</td>
                      <td className="text-[12px] text-zinc-600">{f.nom}</td>
                      <td className="text-right tabular-nums">{petiteTaille(f.octets)}</td>
                      <td className="text-right">
                        <Bouton variante="discret" onClick={() => recuperer(f.publicId)}>
                          <Download /> {brut(t.cloudinary.recuperer)}
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

      <Carte titre={brut(t.dernieres.titre)}>
        {!a.dernieres.length ? (
          <Vide>{brut(t.dernieres.vide)}</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>{brut(t.dernieres.date)}</th>
                <th>{brut(t.dernieres.ou)}</th>
                <th>{brut(t.dernieres.par)}</th>
                <th>{brut(t.dernieres.fichier)}</th>
                <th className="text-right">{brut(t.dernieres.lignes)}</th>
              </tr>
            </thead>
            <tbody>
              {a.dernieres.map((s) => (
                <tr key={`${s.date}-${s.action}`}>
                  <td className="whitespace-nowrap">{quand(s.date)}</td>
                  <td>{s.action.endsWith("CLOUDINARY") ? <Badge ton="bleu">{brut(t.dernieres.cloudinary)}</Badge> : <Badge>{brut(t.dernieres.telechargee)}</Badge>}</td>
                  <td>{s.par ?? "—"}</td>
                  <td className="text-[12px] text-zinc-600">{s.details?.fichier ?? "—"}</td>
                  <td className="text-right tabular-nums">{s.details?.lignes ? nf.format(s.details.lignes) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>

      <Carte titre={brut(t.contenu.titre)}>
        <div className="flex flex-wrap gap-2">
          {a.tables.slice(0, 12).map((x) => (
            <Badge key={x.table}>
              {a.noms[x.table] ?? x.table} : {nf.format(x.lignes)}
            </Badge>
          ))}
        </div>
        <button type="button" className="mt-3 flex items-center gap-1 text-[13px] font-medium text-zinc-600 hover:text-marque-700" onClick={() => setVoirTables(!voirTables)}>
          {voirTables ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} {brut(t.contenu.toutes, { n: a.tables.length })}
        </button>
        {voirTables && (
          <div className="mt-2 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {a.tables.map((x) => (
              <div key={x.table} className="flex justify-between border-b border-zinc-100 py-1">
                <span>
                  {a.noms[x.table] ?? x.table}
                  {a.noms[x.table] && <span className="text-zinc-400"> · {x.table}</span>}
                </span>
                <span className="tabular-nums text-zinc-500">{nf.format(x.lignes)}</span>
              </div>
            ))}
          </div>
        )}
      </Carte>

      <Carte>
        <button type="button" className="flex w-full items-center gap-2 text-left text-[15px] font-semibold text-encre" onClick={() => setVoirRestauration(!voirRestauration)}>
          <LifeBuoy className="size-5 text-marque-600" /> {brut(t.restauration.titre)}
          {voirRestauration ? <ChevronDown className="ml-auto size-4" /> : <ChevronRight className="ml-auto size-4" />}
        </button>
        {voirRestauration && (
          <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-zinc-600">
            <p>
              <Texte t={t.restauration.intro} />
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              {(t.restauration.etapes as string[]).map((x, i) => (
                <li key={i}>
                  <Texte t={x} />
                </li>
              ))}
            </ol>
            <p className="text-[12px] text-zinc-500">{brut(t.restauration.note)}</p>
          </div>
        )}
      </Carte>
    </div>
  );
}
