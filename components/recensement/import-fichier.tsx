"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useConfigRecensement } from "@/components/recensement/commun";
import { Aide, Alerte, Bouton, Carte, Champ, Liste, ZoneFichier, cx } from "@/components/ui";
import { api, qs } from "@/lib/api";

interface FeuilleAnalysee {
  nom: string;
  lignes: number;
  colonnesReconnues: number;
  colonnesIgnorees: string[];
  aStatut: boolean;
}
interface Rapport {
  essai: boolean;
  feuille: string;
  lues: number;
  crees: number;
  misAJour: number;
  ignorees: number;
  raisons: { raison: string; n: number; exemples: string[] }[];
  valeursRejetees: { champ: string; n: number; exemples: string[] }[];
  colonnes: { entete: string; rubrique: string }[];
  colonnesIgnorees: string[];
  incomplets: number;
  exemples: string[];
  memesProbables?: { n: number; exemples: string[] };
  contentieux?: number;
  recensement?: boolean;
  valeursAjoutees?: number;
  inchanges?: number;
  differences?: { champ: string; n: number; exemples: string[] }[];
}

const nf = new Intl.NumberFormat("fr-FR");

export function Details({ titre, lignes, ton = "jaune" }: { titre: string; lignes: string[]; ton?: "jaune" | "rouge" | "gris" | "vert" }) {
  return (
    <details className="rounded-2xl bg-zinc-50 px-4 py-2.5 text-[12px]">
      <summary className={cx("cursor-pointer font-medium", ton === "rouge" ? "text-rouge-600" : ton === "jaune" ? "text-or-700" : ton === "vert" ? "text-marque-700" : "text-zinc-600")}>{titre}</summary>
      {lignes.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-zinc-600">
          {lignes.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

/**
 * Import d'un fichier Excel d'agents, en deux temps (essai, puis pour de bon).
 * - Base (`recensement` faux) : un agent déjà dans la base est mis à jour (les cases remplies remplacent ce qui est connu).
 * - Recensement : un agent déjà dans la base est seulement complété (cases vides), une valeur différente est signalée sans être
 *   remplacée ; un agent absent de la base est ajouté et part au contrôle, puis à la décision du DG.
 */
export function ImportFichier({ titre, recensement = false, apres }: { titre: ReactNode; recensement?: boolean; apres?: () => void }) {
  const config = useConfigRecensement();
  const c = config.donnees?.configuration;
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuilles, setFeuilles] = useState<FeuilleAnalysee[] | null>(null);
  const [feuille, setFeuille] = useState("");
  const [statut, setStatut] = useState("");
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [verifier, setVerifier] = useState(false);

  const choisie = feuilles?.find((x) => x.nom === feuille);
  const manqueStatut = !!choisie && !choisie.aStatut && !statut;

  async function analyser(f: File) {
    setErreur(null);
    setEnvoi(true);
    setRapport(null);
    setVerifier(false);
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = await api.post<FeuilleAnalysee[]>("/recensement/analyse", fd);
      setFichier(f);
      setFeuilles(r);
      // La feuille la plus fournie est proposée d'abord
      setFeuille([...r].sort((a, b) => b.colonnesReconnues - a.colonnesReconnues || b.lignes - a.lignes)[0]?.nom ?? "");
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function importer(essai: boolean) {
    if (!fichier) return;
    setErreur(null);
    if (!feuille || manqueStatut) {
      setVerifier(true);
      setErreur("Remplissez d’abord les champs en rouge.");
      return;
    }
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      const r = await api.post<Rapport>(`/recensement/import${qs({ feuille, statut: statut || undefined, essai: essai ? 1 : 0, mode: recensement ? "recensement" : undefined })}`, fd);
      setRapport(r);
      if (!essai) apres?.();
    } catch (x) {
      setErreur((x as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const s = (n: number, un: string, plusieurs: string) => `${nf.format(n)} ${n > 1 ? plusieurs : un}`;

  return (
    <Carte
      titre={
        <span className="inline-flex items-center gap-2">
          {titre}
          <Aide>
            {recensement
              ? "Le fichier d’un recensement (le modèle du système, ou une liste d’établissement) : les colonnes sont reconnues par leur titre. Chaque agent déjà dans la base (même n° de fiche, même matricule, ou même nom et même date de naissance) est complété : seules ses cases vides sont remplies, rien de ce qui est connu n’est remplacé. Les agents absents de la base sont ajoutés et partent au contrôle, puis au DG."
              : "Le fichier peut être le modèle du système ou une liste existante (extraction de la solde, liste d’un établissement…) : les colonnes sont reconnues par leur titre (« Sexe » pour « Genre », « Nom » et « Prénom » séparés…). Un agent déjà recensé (même n° de fiche, même matricule, ou même nom et même date de naissance) est mis à jour, jamais recréé."}
          </Aide>
        </span>
      }
    >
      {recensement && (
        <ol className="-mt-1 mb-4 grid gap-2 text-[12px] leading-relaxed text-zinc-600 md:grid-cols-3">
          <li className="rounded-2xl bg-zinc-50 px-3 py-2">
            <strong className="text-encre">Agent déjà dans la base</strong> : le système le retrouve et remplit seulement ce qui lui manque.
          </li>
          <li className="rounded-2xl bg-zinc-50 px-3 py-2">
            <strong className="text-encre">Valeur différente de la base</strong> : elle est signalée, jamais remplacée. On corrige la fiche après vérification.
          </li>
          <li className="rounded-2xl bg-zinc-50 px-3 py-2">
            <strong className="text-encre">Agent absent de la base</strong> : il est ajouté, puis contrôlé par le bureau du contrôle et accepté ou rejeté par le DG.
          </li>
        </ol>
      )}
      <ZoneFichier accept=".xlsx" envoi={envoi && !feuilles} envoyer={analyser} libelleBouton="Lire le fichier" aide="Classeur Excel (.xlsx)" />
      {erreur && (
        <div className="mt-4">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {feuilles && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Champ libelle="Feuille à importer" erreur={verifier && !feuille ? "Choisissez la feuille." : null}>
              <Liste
                value={feuille}
                onChange={(e) => {
                  setFeuille(e.target.value);
                  setRapport(null);
                }}
                vide="— Choisir la feuille —"
                options={feuilles.map((f) => ({ valeur: f.nom, libelle: `${f.nom} — ${nf.format(f.lignes)} lignes, ${f.colonnesReconnues} colonnes reconnues` }))}
              />
            </Champ>
            <Champ
              libelle={choisie?.aStatut ? "Type d’agent si la colonne est vide (facultatif)" : "Type d’agent de toute la liste"}
              aide={choisie?.aStatut ? "Le fichier a une colonne « Type d’agent » : elle est utilisée ligne par ligne." : "Le fichier n’a pas de colonne « Type d’agent »."}
              erreur={verifier && manqueStatut ? "Choisissez le type d’agent de cette liste." : null}
            >
              <Liste
                value={statut}
                onChange={(e) => {
                  setStatut(e.target.value);
                  setRapport(null);
                }}
                vide="— Choisir —"
                options={(c?.statuts ?? []).filter((x) => x.actif).map((x) => ({ valeur: x.code, libelle: x.libelle }))}
              />
            </Champ>
          </div>
          {!!choisie?.colonnesIgnorees.length && <p className="text-[12px] text-zinc-500">Colonnes non reconnues (ignorées) : {choisie.colonnesIgnorees.join(", ")}.</p>}
          <div className="flex flex-wrap gap-2">
            <Bouton disabled={envoi} onClick={() => importer(true)}>
              {envoi ? "Lecture…" : "Faire un essai"}
            </Bouton>
            <Bouton variante="principal" disabled={envoi || !rapport?.essai || rapport.feuille !== feuille} onClick={() => importer(false)}>
              Importer pour de bon
            </Bouton>
            {!rapport?.essai && <span className="self-center text-[12px] text-zinc-500">Faites d’abord un essai : il montre ce qui sera fait, sans rien enregistrer.</span>}
          </div>
          {rapport &&
            (rapport.recensement ? (
              <div className="space-y-2">
                <Alerte ton={rapport.essai ? "bleu" : "vert"}>
                  {rapport.essai ? "Essai : rien n’est enregistré. " : "Import terminé. "}
                  <strong>{nf.format(rapport.lues)}</strong> lignes lues.
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                    <li>
                      <strong>{s(rapport.misAJour, "agent", "agents")}</strong> de la base {rapport.essai ? "seraient complétés" : "complétés"} ({s(rapport.valeursAjoutees ?? 0, "rubrique remplie", "rubriques remplies")})
                    </li>
                    <li>{s(rapport.inchanges ?? 0, "agent retrouvé", "agents retrouvés")} à qui le fichier n’apporte rien de nouveau</li>
                    <li>
                      <strong>{s(rapport.crees, "agent absent de la base", "agents absents de la base")}</strong> {rapport.essai ? "seraient ajoutés" : "ajoutés"} et envoyés au contrôle, puis au DG
                    </li>
                    {!!rapport.ignorees && <li>{s(rapport.ignorees, "ligne ignorée", "lignes ignorées")} (détail ci-dessous)</li>}
                  </ul>
                  {!rapport.essai && rapport.crees > 0 && <div className="mt-1.5">Les agents ajoutés sont dans l’onglet « À contrôler » plus bas.</div>}
                </Alerte>
                {(rapport.differences ?? []).map((r) => (
                  <Details key={r.champ} titre={`${nf.format(r.n)} valeur(s) différente(s) de la base pour « ${r.champ} » : gardées sans les remplacer, à vérifier sur la fiche`} lignes={r.exemples} />
                ))}
                {!!rapport.memesProbables?.n && (
                  <Details
                    ton="rouge"
                    titre={`${nf.format(rapport.memesProbables.n)} agent(s) ajouté(s) ressemblent à une fiche déjà dans la base (même personne écrite autrement ?) : le contrôle le vérifiera`}
                    lignes={rapport.memesProbables.exemples}
                  />
                )}
                {rapport.raisons.map((r) => (
                  <Details key={r.raison} ton="rouge" titre={`${nf.format(r.n)} ligne(s) ignorée(s) : ${r.raison}`} lignes={r.exemples} />
                ))}
                {rapport.valeursRejetees.map((r) => (
                  <Details key={r.champ} titre={`${nf.format(r.n)} valeur(s) refusée(s) dans « ${r.champ} » (la case reste vide)`} lignes={r.exemples} />
                ))}
                <Details ton="gris" titre={`${rapport.colonnes.length} colonne(s) reconnue(s)`} lignes={rapport.colonnes.map((x) => `${x.entete} → ${x.rubrique}`)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Alerte ton={rapport.essai ? "bleu" : "vert"}>
                  {rapport.essai ? "Essai : rien n’est enregistré. " : "Import terminé. "}
                  <strong>{nf.format(rapport.lues)}</strong> lignes lues : <strong>{nf.format(rapport.crees)}</strong> {rapport.essai ? "nouveaux agents seraient créés" : "nouveaux agents créés"},{" "}
                  <strong>{nf.format(rapport.misAJour)}</strong> {rapport.essai ? "seraient mis à jour" : "mis à jour"}
                  {rapport.ignorees ? `, ${nf.format(rapport.ignorees)} lignes ignorées` : ""}. {nf.format(rapport.incomplets)} fiche(s) resteront à compléter (rubriques ou pièces).
                  {!rapport.essai && (
                    <>
                      {" "}
                      <Link href="/personnel" className="font-semibold underline">
                        Voir le tableau de bord
                      </Link>
                    </>
                  )}
                </Alerte>
                {rapport.raisons.map((r) => (
                  <Details key={r.raison} ton="rouge" titre={`${nf.format(r.n)} ligne(s) ignorée(s) : ${r.raison}`} lignes={r.exemples} />
                ))}
                {!!rapport.memesProbables?.n && (
                  <Details
                    ton="rouge"
                    titre={`${nf.format(rapport.memesProbables.n)} nouvelle(s) fiche(s) ressemblent à une fiche déjà dans la base (même personne venue d’une autre base ?) : à fusionner ou à déclarer différentes après l’import (Tableau de bord › contrôles)`}
                    lignes={rapport.memesProbables.exemples}
                  />
                )}
                {!!rapport.contentieux && <Details ton="gris" titre={`${nf.format(rapport.contentieux)} nouvelle(s) fiche(s) envoyée(s) au contrôle puis au DG (absentes de la base de la DGRHAS)`} lignes={[]} />}
                {rapport.valeursRejetees.map((r) => (
                  <Details key={r.champ} titre={`${nf.format(r.n)} valeur(s) refusée(s) dans « ${r.champ} » (la case reste vide)`} lignes={r.exemples} />
                ))}
                <Details ton="gris" titre={`${rapport.colonnes.length} colonne(s) reconnue(s)`} lignes={rapport.colonnes.map((x) => `${x.entete} → ${x.rubrique}`)} />
              </div>
            ))}
        </div>
      )}
    </Carte>
  );
}
