"use client";

import { FileUp } from "lucide-react";
import { useState } from "react";
import { GuideImports } from "./guide-imports";
import { Alerte, Annonce, Badge, Bouton, Carte, Modale, Pastille, Tableau, ZoneFichier } from "./ui";
import { api } from "@/lib/api";
import { dateCourte } from "@/lib/libelles";

type Categorie = "TROUVEE" | "A_VERIFIER" | "DEJA_POINTEE" | "CONFLIT" | "NON_ENVOYEE" | "INCONNUE" | "INCOMPLETE" | "DOUBLON";
type Decision = "POINTER" | "AUTRES" | "IGNORER";

interface Ligne {
  ligne: number;
  feuille: string;
  nomComplet: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  typeTexte: "ARRETE" | "DECRET";
  numeroTexte: string | null;
  dateSignature: string | null;
  statutTexte: "AGE" | "FONCTIONNAIRE" | "CONTRACTUEL";
  diplomeBrut: string | null;
  diplomeCode: string | null;
  departementId: number | null;
  categorie: Categorie;
  agentId: string | null;
  agentNom: string | null;
  detail: string | null;
}

interface Analyse {
  lues: number;
  compteurs: Record<Categorie, number>;
  lignes: Ligne[];
}

interface Resultat {
  /** « Paquet du 04/03/2026 ». */
  paquet: string | null;
  /** Lots remplis (quota + type) et nombre de personnes rangées dans chacun. */
  lots: { libelle: string; numero: number; n: number }[];
  textes: number;
  personnes: number;
  ajoutees: number;
  refusees: { nom: string; raison: string }[];
  aAffecter: number;
}

/** Ce que l'on montre pour chaque groupe, dans l'ordre d'affichage. */
const GROUPES: { cle: Categorie; titre: string; ton: "vert" | "jaune" | "rouge" | "bleu" | "gris"; explication: string }[] = [
  { cle: "TROUVEE", titre: "Trouvées", ton: "vert", explication: "Personnes envoyées à la FP, reconnues par leur nom et leur date de naissance. Leur texte sera enregistré." },
  { cle: "A_VERIFIER", titre: "À vérifier", ton: "jaune", explication: "Le nom ressemble à une personne de la base. Dites pour chacune si c’est bien elle." },
  { cle: "INCONNUE", titre: "Pas dans la base", ton: "rouge", explication: "Ces personnes n’ont jamais été saisies. Elles seront ajoutées au quota « Autres »." },
  { cle: "NON_ENVOYEE", titre: "Jamais envoyées", ton: "rouge", explication: "Leur fiche est saisie mais n’est pas partie à la FP : terminez d’abord le circuit (contrôle, validation, envoi). Ignorées." },
  { cle: "CONFLIT", titre: "Autre texte déjà enregistré", ton: "rouge", explication: "Ces personnes ont déjà un autre arrêté ou décret dans le système. Vérifiez sur papier. Ignorées." },
  { cle: "DEJA_POINTEE", titre: "Déjà enregistrées", ton: "gris", explication: "Ce texte est déjà enregistré pour ces personnes. Rien à faire." },
  { cle: "INCOMPLETE", titre: "Lignes incomplètes", ton: "gris", explication: "Le n° du texte manque sur la ligne. Ignorées." },
  { cle: "DOUBLON", titre: "En double dans le fichier", ton: "gris", explication: "La même personne apparaît deux fois. Seule la première ligne compte." },
];

const decisionParDefaut = (l: Ligne): Decision => (l.categorie === "TROUVEE" ? "POINTER" : l.categorie === "INCONNUE" ? "AUTRES" : "IGNORER");

export function ImportRetourFP({
  actif,
  dateReception,
  apres,
}: {
  actif: boolean;
  dateReception: string;
  apres: (r: Resultat) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<{ nom: string; donnees: Analyse } | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [attention, setAttention] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  async function analyser(f: File) {
    const fd = new FormData();
    fd.append("fichier", f);
    setEnvoi(true);
    setErreur(null);
    setResultat(null);
    try {
      const d = await api.post<Analyse>("/reception/import/analyse", fd);
      setAnalyse({ nom: f.name, donnees: d });
      setDecisions(Object.fromEntries(d.lignes.map((l, i) => [i, decisionParDefaut(l)])));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const lignes = analyse?.donnees.lignes ?? [];
  const choisies = lignes.map((l, i) => ({ ...l, decision: decisions[i] ?? "IGNORER" }));
  const aPointer = choisies.filter((l) => l.decision === "POINTER").length;
  const aAjouter = choisies.filter((l) => l.decision === "AUTRES").length;

  async function enregistrer() {
    setEnvoi(true);
    try {
      const r = await api.post<Resultat>("/reception/import", { dateReception, nomFichier: analyse?.nom, lignes: choisies });
      setResultat(r);
      setAnalyse(null);
      setAttention(false);
      apres(r);
    } catch (e) {
      setErreur((e as Error).message);
      setAttention(false);
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert)
    return (
      <button
        type="button"
        disabled={!actif}
        onClick={() => setOuvert(true)}
        className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-doux transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
      >
        <Pastille ton="gris">
          <FileUp />
        </Pastille>
        <div>
          <div className="text-[14px] font-semibold">Ou bien : importer le fichier Excel renvoyé par la FP</div>
          <div className="text-[12px] text-zinc-500">
            {actif ? "Si la FP envoie la liste en Excel : le système retrouve chaque personne et enregistre son texte, comme la saisie texte par texte." : "Indiquez d’abord la date de réception du paquet à l’étape 1."}
          </div>
        </div>
      </button>
    );

  return (
    <Carte titre="Importer le fichier Excel renvoyé par la FP" actions={<Bouton variante="discret" onClick={() => setOuvert(false)}>Fermer</Bouton>}>
      <div className="space-y-4">
        <GuideImports ici="reception" />
        <p className="text-[13px] leading-relaxed text-zinc-500">
          Colonnes lues : « Noms et prénoms », « Date de nais. », « Type de texte », « N° du texte », « Date de signature », et si elles existent « Statut », « Diplôme »,
          « Département ». Les textes vont dans le <strong>paquet du {dateCourte(dateReception)}</strong>, puis chaque personne est rangée dans le lot de son quota
          et de son type de texte (arrêté, décret PM ou PR).{" "}
          <strong>Rien n’est enregistré avant votre confirmation.</strong>
        </p>
        <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={analyser} libelleBouton="Analyser le fichier" aide="Fichier Excel de la FP (.xlsx)" />
        <Annonce ton="rouge" fermer={() => setErreur(null)}>
          {erreur}
        </Annonce>
        <Annonce ton={resultat?.refusees.length ? "jaune" : "vert"} fermer={() => setResultat(null)}>
          {resultat && (
            <span>
            {resultat.textes} texte(s) enregistré(s){resultat.paquet ? ` (${resultat.paquet})` : ""} : <strong>{resultat.personnes} personne(s) pointée(s)</strong>
            {resultat.ajoutees ? `, dont ${resultat.ajoutees} ajoutée(s) au quota « Autres »` : ""}, {resultat.aAffecter} prête(s) pour l’affectation.
            {resultat.lots.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-left">
                {resultat.lots.map((l) => (
                  <li key={l.libelle}>
                    {l.libelle} : {l.n} personne(s)
                  </li>
                ))}
              </ul>
            )}
            {resultat.refusees.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-rouge-600">
                {resultat.refusees.map((x, i) => (
                  <li key={i}>
                    {x.nom} : {x.raison}
                  </li>
                ))}
              </ul>
            )}
            </span>
          )}
        </Annonce>
      </div>

      {analyse && (
        <Modale titre={`Ce que contient « ${analyse.nom} »`} ouverte={!attention} large fermer={() => setAnalyse(null)}>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{analyse.donnees.lues} ligne(s) lue(s)</Badge>
              {GROUPES.filter((g) => analyse.donnees.compteurs[g.cle]).map((g) => (
                <Badge key={g.cle} ton={g.ton === "gris" ? undefined : g.ton}>
                  {g.titre} : {analyse.donnees.compteurs[g.cle]}
                </Badge>
              ))}
            </div>

            {analyse.donnees.compteurs.INCONNUE > 0 && (
              <Alerte ton="jaune">
                <strong>{analyse.donnees.compteurs.INCONNUE} personne(s) ne sont pas dans la base.</strong> Si vous continuez, elles seront ajoutées au quota
                « Autres ». C’est normal si la FP les a ajoutées elle-même. Mais si elles étaient sur la liste du MEPPSA, c’est que <strong>la saisie a été sautée</strong> :
                nous recommandons d’annuler et de suivre le circuit (« Saisie des candidats » → contrôle → validation → envoi). S’il s’agit d’un travail déjà fait avec
                les textes sortis, importez plutôt la fiche de suivi complète dans « Base des recrutés ».
              </Alerte>
            )}

            {GROUPES.filter((g) => analyse.donnees.compteurs[g.cle]).map((g) => (
              <section key={g.cle}>
                <div className="mb-1 text-[13px] font-semibold">
                  {g.titre} ({analyse.donnees.compteurs[g.cle]})
                </div>
                <p className="mb-2 text-[12px] text-zinc-500">{g.explication}</p>
                <Tableau>
                  <thead>
                    <tr>
                      <th>Nom dans le fichier</th>
                      <th>Né(e) le</th>
                      <th>Texte</th>
                      {(g.cle === "A_VERIFIER" || g.cle === "CONFLIT" || g.cle === "DEJA_POINTEE" || g.cle === "NON_ENVOYEE") && <th>Dans la base</th>}
                      {(g.cle === "TROUVEE" || g.cle === "A_VERIFIER" || g.cle === "INCONNUE") && <th>Que faire ?</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, i) =>
                      l.categorie !== g.cle ? null : (
                        <tr key={i}>
                          <td className="font-medium">{l.nomComplet}</td>
                          <td>{l.dateNaissance ? dateCourte(l.dateNaissance) : "—"}</td>
                          <td className="whitespace-nowrap">
                            {l.numeroTexte ? `${l.typeTexte === "DECRET" ? "Décret" : "Arrêté"} n° ${l.numeroTexte}` : "—"}
                            {l.dateSignature ? ` du ${dateCourte(l.dateSignature)}` : ""}
                          </td>
                          {(g.cle === "A_VERIFIER" || g.cle === "CONFLIT" || g.cle === "DEJA_POINTEE" || g.cle === "NON_ENVOYEE") && (
                            <td className="text-[12px]">
                              {l.agentNom}
                              {l.detail && <div className="text-zinc-400">{l.detail}</div>}
                            </td>
                          )}
                          {(g.cle === "TROUVEE" || g.cle === "INCONNUE") && (
                            <td>
                              <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={decisions[i] !== "IGNORER"}
                                  onChange={(e) => setDecisions({ ...decisions, [i]: e.target.checked ? decisionParDefaut(l) : "IGNORER" })}
                                />
                                {g.cle === "TROUVEE" ? "Enregistrer le texte" : "Ajouter au quota « Autres »"}
                              </label>
                            </td>
                          )}
                          {g.cle === "A_VERIFIER" && (
                            <td>
                              <select
                                className="rounded-lg bg-zinc-100 px-2 py-1 text-[12px]"
                                value={decisions[i]}
                                onChange={(e) => setDecisions({ ...decisions, [i]: e.target.value as Decision })}
                              >
                                <option value="IGNORER">Je ne sais pas : laisser de côté</option>
                                <option value="POINTER">C’est la même personne</option>
                                <option value="AUTRES">Personne différente : quota « Autres »</option>
                              </select>
                            </td>
                          )}
                        </tr>
                      ),
                    )}
                  </tbody>
                </Tableau>
              </section>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-[12px] text-zinc-500">
              {aPointer + aAjouter} personne(s) recevront leur texte{aAjouter ? `, dont ${aAjouter} à ajouter au quota « Autres »` : ""}
            </span>
            <Bouton onClick={() => setAnalyse(null)}>Annuler</Bouton>
            <Bouton variante="principal" disabled={envoi || !(aPointer + aAjouter)} onClick={() => (aAjouter ? setAttention(true) : enregistrer())}>
              {envoi ? "Enregistrement…" : `Enregistrer (${aPointer + aAjouter})`}
            </Bouton>
          </div>
        </Modale>
      )}

      <Modale titre="ATTENTION : des personnes vont être ajoutées" ouverte={!!analyse && attention} fermer={() => setAttention(false)}>
        <div className="space-y-3 text-[13px] leading-relaxed text-zinc-600">
          <p>
            <strong>{aAjouter} personne(s)</strong> absentes de la base vont être créées dans le <strong>quota « Autres »</strong>, avec leur texte. Conséquences :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>elles n’auront pas eu de contrôle ni de validation du DG dans le système ;</li>
            <li>si elles étaient sur la liste du MEPPSA, elles seront comptées à tort dans le quota « Autres » ;</li>
            <li>elles seront prêtes pour l’affectation dès maintenant.</li>
          </ul>
          <p className="text-[12px] text-zinc-500">En cas de doute, revenez en arrière et décochez-les : vous pourrez les saisir en suivant le circuit.</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setAttention(false)}>Revenir</Bouton>
          <Bouton variante="danger" disabled={envoi} onClick={enregistrer}>
            Je comprends : enregistrer
          </Bouton>
        </div>
      </Modale>
    </Carte>
  );
}
