"use client";

import { useState } from "react";
import { FicheDossier } from "@/components/fiche-dossier";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Chargement, Modale, Saisie, Tableau, Vide, ZoneFichier } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte, peut } from "@/lib/libelles";

interface Resume {
  personnes: number;
  doubles: number;
  notes: { numero: string; date: string | null; personnes: number }[];
  sources: { source: string; references: number; le: string; par: string | null }[];
}

interface Double {
  agentId: string;
  nomComplet: string;
  quota: number | string | null;
  numeroTexte: string | null;
  departement: string | null;
  genre: "DEUX_NOTES" | "MEME_NOTE";
  horsSysteme: { brut: string; lieuAffectation: string | null; source: string }[];
  systeme: { noteId: string; numero: string | null; statut: string }[];
}

interface Rapport {
  feuilles: string[];
  lignes: number;
  avecReference: number;
  retrouvees: number;
  introuvables: { ligne: number; feuille: string; nom: string; numeroTexte: string | null }[];
  references: number;
  notes: number;
  doubles: number;
  retirees?: number;
  remisesATraiter?: number;
}

const nf = new Intl.NumberFormat("fr-FR");

/**
 * Contrôle des affectations : les notes déjà signées hors du système (fichier de contrôle)
 * sont reportées sur chaque personne, pour ne jamais l'affecter deux fois.
 */
export function NotesSignees() {
  const { profil } = useSession();
  const responsable = profil.role === "CHEF_SERVICE" || peut.valider(profil.role);
  const resume = useApi<Resume>(peut.traiter(profil.role) ? "/controle-affectations" : null);
  const doubles = useApi<Double[]>(peut.traiter(profil.role) ? "/controle-affectations/doubles" : null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [analyse, setAnalyse] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  async function analyser(f: File) {
    const fd = new FormData();
    fd.append("fichier", f);
    setEnvoi(true);
    try {
      setFichier(f);
      setAnalyse(await api.post<Rapport>("/controle-affectations/analyse", fd));
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  async function enregistrer() {
    if (!fichier) return;
    const fd = new FormData();
    fd.append("fichier", fichier);
    setEnvoi(true);
    try {
      const r = await api.post<Rapport>("/controle-affectations/import", fd);
      setAnalyse(null);
      setFichier(null);
      setMessage({
        ton: r.introuvables.length ? "jaune" : "vert",
        texte: `${nf.format(r.references)} référence(s) de notes enregistrée(s) pour ${nf.format(r.retrouvees)} personne(s). ${nf.format(r.retirees ?? 0)} personne(s) retirée(s) des notes à préparer (déjà affectées).${r.introuvables.length ? ` ${r.introuvables.length} ligne(s) du fichier introuvable(s) dans la base : à vérifier.` : ""}`,
      });
      resume.recharger();
      doubles.recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  const r = recherche.trim().toUpperCase();
  const liste = (doubles.donnees ?? []).filter((d) => !r || d.nomComplet.toUpperCase().includes(r) || d.numeroTexte?.includes(r));

  return (
    <div className="space-y-6">      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>

      <Carte titre="Comment ça marche">
        <div className="grid gap-4 text-[13px] leading-relaxed text-zinc-600 md:grid-cols-3">
          <div>
            <div className="mb-1 font-semibold text-encre">1. On importe le fichier de contrôle</div>
            Le fichier Excel où l’on a reporté, pour chaque personne, la note où elle figure (colonnes « Ref affectation » et « Ref affectation 2 », par exemple
            « 270 du 08/04/2026 »). Réimporter le même fichier remplace ses références.
          </div>
          <div>
            <div className="mb-1 font-semibold text-encre">2. Le système retrouve chaque personne</div>
            Par son n° de texte, sinon par son nom et sa date de naissance. Une personne déjà dans une note signée est <strong>retirée des notes à préparer</strong>
            (motif « Déjà affecté hors système ») : elle ne peut plus être mise dans une nouvelle note.
          </div>
          <div>
            <div className="mb-1 font-semibold text-encre">3. Les doubles affectations sont listées</div>
            Une personne dans deux notes différentes, ou deux fois dans la même note, ou dans une note signée et dans une note du système : elle apparaît
            ci-dessous, pour décider quelle note fait foi.
          </div>
        </div>
      </Carte>

      {resume.donnees && (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["personnes affectées hors système", resume.donnees.personnes, "text-encre"],
            ["notes signées connues", resume.donnees.notes.length, "text-encre"],
            ["doubles affectations", resume.donnees.doubles, resume.donnees.doubles ? "text-rouge-600" : "text-marque-700"],
          ].map(([l, v, c]) => (
            <div key={l as string} className="rounded-3xl bg-white p-4 shadow-doux">
              <div className={`text-2xl font-semibold tabular-nums ${c}`}>{nf.format(v as number)}</div>
              <div className="text-[12px] text-zinc-500">{l as string}</div>
            </div>
          ))}
        </div>
      )}

      {responsable && (
        <Carte titre="Importer le fichier de contrôle des affectations">
          <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={analyser} libelleBouton="Lire le fichier" aide="Fichier Excel (.xlsx) avec la colonne « Ref affectation »" />
        </Carte>
      )}

      <Modale titre="Enregistrer ces références ?" ouverte={!!analyse} fermer={() => setAnalyse(null)} large>
        {analyse && (
          <div className="space-y-3 text-[13px]">
            <p>
              Fichier lu ({analyse.feuilles.join(", ")}) : <strong>{nf.format(analyse.lignes)}</strong> personne(s), dont <strong>{nf.format(analyse.avecReference)}</strong>{" "}
              avec une note d’affectation ({nf.format(analyse.references)} référence(s), {nf.format(analyse.notes)} note(s) différente(s)).
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>{nf.format(analyse.retrouvees)}</strong> retrouvée(s) dans la base : elles seront marquées « affectées hors système » et retirées des notes à
                préparer.
              </li>
              <li>
                <strong>{nf.format(analyse.doubles)}</strong> personne(s) avec deux références dans le fichier.
              </li>
              {analyse.introuvables.length > 0 && (
                <li className="text-or-700">
                  <strong>{analyse.introuvables.length}</strong> introuvable(s) dans la base (n° de texte et nom différents) : elles ne seront pas enregistrées.
                </li>
              )}
            </ul>
            {analyse.introuvables.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-2xl bg-zinc-50 px-4 py-2 text-[12px]">
                {analyse.introuvables.slice(0, 200).map((x) => (
                  <div key={`${x.feuille}-${x.ligne}`}>
                    Ligne {x.ligne} : {x.nom}
                    {x.numeroTexte ? ` (texte ${x.numeroTexte})` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setAnalyse(null)}>Annuler</Bouton>
          <Bouton variante="principal" disabled={envoi || !analyse?.retrouvees} onClick={enregistrer}>
            Enregistrer les références
          </Bouton>
        </div>
      </Modale>

      <Carte
        titre={`Doubles affectations${doubles.donnees ? ` (${doubles.donnees.length})` : ""}`}
        actions={<Saisie className="w-64" placeholder="Rechercher un nom ou n° de texte…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />}
      >
        {!doubles.donnees ? (
          <Chargement />
        ) : !liste.length ? (
          <Vide>{doubles.donnees.length ? "Aucun résultat." : "Aucune double affectation connue."}</Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Personne</th>
                <th>Quota · texte</th>
                <th>Notes</th>
                <th>Problème</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((d) => (
                <tr key={d.agentId} className="cursor-pointer" onClick={() => setOuvert(d.agentId)}>
                  <td className="font-medium">
                    {d.nomComplet}
                    <div className="text-[11px] text-zinc-400">{d.departement ?? "—"}</div>
                  </td>
                  <td className="text-[12px]">
                    {d.quota === "Autres" ? "Quota « Autres »" : `Quota ${d.quota ?? "?"}`}
                    <div className="text-zinc-400">{d.numeroTexte ? `Texte n° ${d.numeroTexte}` : "—"}</div>
                  </td>
                  <td className="text-[12px]">
                    {d.horsSysteme.map((h) => (
                      <div key={h.brut}>
                        Note n° {h.brut}
                        {h.lieuAffectation ? ` · ${h.lieuAffectation}` : ""} <span className="text-zinc-400">(signée hors système)</span>
                      </div>
                    ))}
                    {d.systeme.map((s) => (
                      <div key={s.noteId} className="text-marque-700">
                        Note du système {s.numero ? `n° ${s.numero}` : "(pas encore numérotée)"} · {s.statut === "SIGNEE" ? "signée" : "validée"}
                      </div>
                    ))}
                  </td>
                  <td>
                    <Badge ton="rouge">{d.genre === "MEME_NOTE" ? "Deux fois dans la même note" : "Affectée dans deux notes"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>

      {resume.donnees && resume.donnees.notes.length > 0 && (
        <Carte titre="Notes signées hors du système">
          <div className="flex flex-wrap gap-2 text-[12px]">
            {resume.donnees.notes.map((x) => (
              <span key={x.numero} className="rounded-xl bg-zinc-100 px-3 py-1.5">
                N° {x.numero}
                {x.date ? ` du ${dateCourte(x.date)}` : ""} · <strong className="tabular-nums">{nf.format(x.personnes)}</strong> pers.
              </span>
            ))}
          </div>
          <div className="mt-4 text-[12px] text-zinc-500">
            Fichiers importés :{" "}
            {resume.donnees.sources.map((x) => `${x.source} (${nf.format(x.references)} réf., ${dateCourte(x.le)}${x.par ? `, ${x.par}` : ""})`).join(" · ")}
          </div>
        </Carte>
      )}

      {ouvert && <FicheDossier id={ouvert} fermer={() => setOuvert(null)} />}
    </div>
  );
}
