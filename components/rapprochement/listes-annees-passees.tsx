"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Bouton, BoutonIcone, Carte, Champ, Chargement, Modale, Saisie, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte, peut } from "@/lib/libelles";

interface Source {
  source: string;
  annee: number | null;
  n: number;
  importePar: string | null;
  le: string;
}

const nf = new Intl.NumberFormat("fr-FR");

/** Personnes recrutées les années précédentes : la saisie prévient si un candidat y figure déjà. */
export function ListesAnneesPassees() {
  const { profil } = useSession();
  const sources = useApi<Source[]>("/anciens");
  const [annee, setAnnee] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  const [suppression, setSuppression] = useState<Source | null>(null);
  const responsable = profil.role === "CHEF_SERVICE" || peut.valider(profil.role);

  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  async function importer(f: File) {
    const fd = new FormData();
    fd.append("fichier", f);
    if (annee) fd.append("annee", annee);
    setEnvoi(true);
    try {
      const r = await api.post<{ lignes: number; feuilles: string[]; sansAnnee: number }>("/anciens/import", fd);
      setMessage({
        ton: r.sansAnnee ? "jaune" : "vert",
        texte: `${nf.format(r.lignes)} personne(s) lue(s) dans ${r.feuilles.length} feuille(s).${r.sansAnnee ? ` ${r.sansAnnee} sans année : indiquez l’année avant d’importer, puis réimportez le fichier.` : ""} La saisie des candidats les vérifie désormais.`,
      });
      sources.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  const total = (sources.donnees ?? []).reduce((n, s) => n + s.n, 0);
  const parAnnee = new Map<string, number>();
  for (const s of sources.donnees ?? []) parAnnee.set(s.annee ? String(s.annee) : "sans année", (parAnnee.get(s.annee ? String(s.annee) : "sans année") ?? 0) + s.n);

  return (
    <div className="space-y-6">
      <Carte titre="À quoi sert cette page ?">
        <div className="grid gap-4 text-[13px] leading-relaxed text-zinc-600 md:grid-cols-3">
          <div>
            <div className="mb-1 font-semibold text-encre">1. On importe les anciennes listes</div>
            Les listes Excel des recrutements passés (par exemple la compilation 2019-2023, les listes de volontaires) qui ne sont pas dans la base actuelle. On les
            importe une seule fois, plus bas sur cette page.
          </div>
          <div>
            <div className="mb-1 font-semibold text-encre">2. La saisie vérifie toute seule</div>
            Quand un agent saisit ou importe un nouveau candidat (« Saisie des candidats »), le système cherche son nom dans ces listes. S’il le trouve avec la même
            date de naissance, il <strong>bloque l’enregistrement</strong> et affiche par exemple : « MOUANDA Jean, né(e) le même jour, a déjà été recruté(e) en
            2021 ». Un nom seulement ressemblant est signalé en jaune.
          </div>
          <div>
            <div className="mb-1 font-semibold text-encre">3. L’agent vérifie le dossier</div>
            Si c’est bien la même personne, le dossier est écarté : elle a déjà été recrutée. Si c’est un homonyme (autre personne, même nom), l’agent peut enregistrer
            quand même, après vérification.
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-[12px] text-zinc-500">
          Ce que cette page <strong>ne fait pas</strong> : les personnes de ces listes ne sont pas ajoutées à la « Base des recrutés », n’entrent dans aucune note et ne
          comptent dans aucun quota. Elles servent uniquement au contrôle des doublons d’une année à l’autre. (Les doublons à l’intérieur de la base actuelle sont
          contrôlés de la même façon, sans rien importer.)
        </p>
      </Carte>

      <VerifierNom />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-4 shadow-doux">
          <div className="text-2xl font-semibold tabular-nums">{nf.format(total)}</div>
          <div className="text-[12px] text-zinc-500">personnes des années précédentes</div>
        </div>
        {[...parAnnee].map(([a, n]) => (
          <div key={a} className="rounded-3xl bg-white p-4 shadow-doux">
            <div className="text-2xl font-semibold tabular-nums">{nf.format(n)}</div>
            <div className="text-[12px] text-zinc-500">{a === "sans année" ? "sans année" : `recrutement ${a}`}</div>
          </div>
        ))}
      </div>

      {responsable && (
        <Carte titre="Importer une liste d’une année précédente">
          <div className="space-y-4">
            <p className="flex items-center gap-1.5 text-[13px] text-zinc-600">
              Le système lit toutes les feuilles qui ont une colonne « Noms et prénoms » (et si possible « Date de naissance »), même les feuilles masquées.
              <Aide>
                L’année se lit dans la colonne « Quota » ou « Année », sinon dans le nom de la feuille ou du fichier (par exemple « Liste générale R.2021 »), sinon
                dans le champ ci-dessous. Réimporter le même fichier remplace ses lignes : il n’y a pas de doublon. Ces personnes ne sont pas ajoutées à la base des
                recrutés : elles servent seulement à vérifier.
              </Aide>
            </p>
            <Champ libelle="Année de recrutement (si le fichier ne la donne pas)" className="max-w-xs">
              <Saisie inputMode="numeric" value={annee} onChange={(e) => setAnnee(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Ex. 2021" />
            </Champ>
            <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={importer} libelleBouton="Importer la liste" aide="Fichier Excel (.xlsx)" />
          </div>
        </Carte>
      )}

      <Carte titre="Listes importées">
        {!sources.donnees ? (
          <Chargement />
        ) : !sources.donnees.length ? (
          <Vide>Aucune liste importée pour l’instant.</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Fichier › feuille</th>
                <th>Année</th>
                <th className="text-right">Personnes</th>
                <th>Importé</th>
                {responsable && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {sources.donnees.map((s) => (
                <tr key={`${s.source}|${s.annee}`}>
                  <td>{s.source}</td>
                  <td>{s.annee ?? "—"}</td>
                  <td className="text-right tabular-nums">{nf.format(s.n)}</td>
                  <td className="text-[12px] text-zinc-500">
                    {dateCourte(s.le)} · {s.importePar ?? "—"}
                  </td>
                  {responsable && (
                    <td>
                      <BoutonIcone libelle="Retirer cette liste" ton="rouge" onClick={() => setSuppression(s)}>
                        <Trash2 />
                      </BoutonIcone>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>

      <Modale titre="Retirer cette liste ?" ouverte={!!suppression} fermer={() => setSuppression(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          Les <strong>{suppression?.n}</strong> personne(s) de « {suppression?.source} » ne serviront plus à vérifier les doublons. Rien d’autre n’est touché : la base
          des recrutés reste la même. Vous pourrez réimporter le fichier.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setSuppression(null)}>Annuler</Bouton>
          <Bouton
            variante="danger"
            onClick={async () => {
              const s = suppression!;
              setSuppression(null);
              try {
                await api.delete(`/anciens?source=${encodeURIComponent(s.source)}`);
                setMessage({ ton: "vert", texte: `Liste « ${s.source} » retirée.` });
                sources.recharger();
              } catch (e) {
                setMessage({ ton: "rouge", texte: (e as Error).message });
              }
            }}
          >
            Retirer
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}

/** Recherche d'un nom dans les listes des années passées, pour vérifier un dossier à la main. */
function VerifierNom() {
  const [nom, setNom] = useState("");
  const [cherche, setCherche] = useState("");
  const res = useApi<{ nomComplet: string; dateNaissance: string | null; annee: number | null; source: string; diplome: string | null }[]>(
    cherche.trim().length >= 3 ? `/anciens/chercher?nom=${encodeURIComponent(cherche.trim())}` : null,
  );
  return (
    <Carte titre="Vérifier un nom">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setCherche(nom);
        }}
      >
        <Champ libelle="Nom et prénoms (dans n’importe quel ordre)" className="min-w-72 flex-1">
          <Saisie value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. MOUANDA Jean" />
        </Champ>
        <Bouton variante="principal" type="submit" disabled={nom.trim().length < 3}>
          Chercher dans les années passées
        </Bouton>
      </form>
      {cherche.trim().length >= 3 &&
        (!res.donnees ? (
          <div className="mt-4">
            <Chargement />
          </div>
        ) : !res.donnees.length ? (
          <p className="mt-4 text-[13px] text-marque-700">Aucune personne de ce nom dans les listes des années passées.</p>
        ) : (
          <div className="mt-4">
            <Tableau>
              <thead>
                <tr>
                  <th>Nom et prénoms</th>
                  <th>Né(e) le</th>
                  <th>Recruté(e) en</th>
                  <th>Liste d’origine</th>
                </tr>
              </thead>
              <tbody>
                {res.donnees.map((x, i) => (
                  <tr key={i}>
                    <td className="font-medium">{x.nomComplet}</td>
                    <td>{x.dateNaissance ? dateCourte(x.dateNaissance) : "—"}</td>
                    <td>{x.annee ?? "année inconnue"}</td>
                    <td className="text-[12px] text-zinc-500">{x.source}</td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            {res.donnees.length >= 20 && <p className="mt-2 text-[12px] text-zinc-500">20 résultats au plus : précisez le nom pour affiner.</p>}
          </div>
        ))}
    </Carte>
  );
}
