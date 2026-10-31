"use client";

import { libelleAnomalie } from "@/lib/libelles";
import { CheckCircle2, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { ChoixGrade } from "./choix-grade";
import { useSession } from "./session";
import { Alerte, Bouton, Champ, Liste, Modale, Saisie, SaisieDate } from "./ui";
import { api } from "@/lib/api";

const CYCLES = ["Préscolaire", "Primaire", "Collège", "Lycée", "Administration"];

interface FicheResumee {
  id: string;
  nomComplet: string;
  dateNaissance: string | null;
  liste: string;
  diplome: string | null;
  departement: string | null;
  texte: string | null;
  lot: string | null;
}

interface Verification {
  existante: FicheResumee | null;
  doutes: FicheResumee[];
  anomalies: string[];
  cycle: string | null;
  note: string | null;
  grade: string | null;
  lot: string | null;
}

const VIDE = {
  nomComplet: "",
  dateNaissance: "",
  lieuNaissance: "",
  diplomeCode: "",
  departement: "",
  source: "",
  cycle: "",
  specialite: "",
  qualification: "",
  statut: "",
  typeTexte: "ARRETE",
  numeroTexte: "",
  lot: "",
  dateSignatureTexte: "",
  quota: "",
  numeroOrdre: "",
  observation: "",
  gradeCode: "",
};

const dateCourte = (d: string | null) => (d ? d.split("-").reverse().join("/") : "date inconnue");

/**
 * Ajout d'une personne dans la base des recrutés sans fichier Excel (DG, 31/10/2026) : les mêmes
 * colonnes que le fichier, les mêmes contrôles (anomalies, doublons, lot, note de son diplôme).
 */
export function AjoutManuel({ apres }: { apres: (texte: string) => void }) {
  const { refs } = useSession();
  const [ouverte, setOuverte] = useState(false);
  const [groupe, setGroupe] = useState<"MEPPSA" | "AUTRES">("MEPPSA");
  const [v, setV] = useState(VIDE);
  const [verif, setVerif] = useState<Verification | null>(null);
  // Doute tranché : id de la fiche « même personne », ou « autre » (nouvelle fiche)
  const [choix, setChoix] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const diplomes = [...refs.regles].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));

  // Toute modification oblige à vérifier de nouveau
  const changer = (k: keyof typeof VIDE, val: string) => {
    setV((x) => ({ ...x, [k]: val }));
    setVerif(null);
    setChoix(null);
  };
  const fermer = () => {
    setOuverte(false);
    setV(VIDE);
    setVerif(null);
    setChoix(null);
    setErreur(null);
  };
  const manque = !v.nomComplet.trim() ? "les noms et prénoms" : !v.dateNaissance ? "la date de naissance" : !v.diplomeCode ? "le diplôme" : null;

  function corps() {
    const t = (x: string) => x.trim() || null;
    return {
      groupe,
      nomComplet: v.nomComplet.trim(),
      dateNaissance: v.dateNaissance,
      lieuNaissance: t(v.lieuNaissance),
      diplomeCode: v.diplomeCode,
      departement: t(v.departement),
      source: t(v.source),
      cycle: t(v.cycle),
      specialite: t(v.specialite),
      qualification: t(v.qualification),
      statut: t(v.statut),
      typeTexte: v.typeTexte,
      numeroTexte: t(v.numeroTexte),
      lot: t(v.lot),
      dateSignatureTexte: v.dateSignatureTexte || null,
      quota: groupe === "MEPPSA" && v.quota ? Number(v.quota) : null,
      numeroOrdre: groupe === "MEPPSA" && v.numeroOrdre ? Number(v.numeroOrdre) : null,
      observation: t(v.observation),
      gradeCode: v.gradeCode || null,
    };
  }

  async function verifier() {
    if (manque) {
      setErreur(`Remplissez ${manque}.`);
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      setVerif(await api.post<Verification>("/recrutes/manuel/verifier", corps()));
      setChoix(null);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ nomComplet: string; cree: boolean; lot: string | null; affectation: { typeNote: string } | null }>("/recrutes/manuel", {
        ...corps(),
        meme: choix && choix !== "autre" ? choix : null,
        autrePersonne: choix === "autre",
      });
      fermer();
      apres(
        r.cree
          ? `${r.nomComplet} : ajouté(e) à la base, dans « Oubliés à contrôler » : à déclarer déjà affecté(e) ou pas encore affecté(e) avant d’entrer dans une note${r.lot ? ` (${r.lot})` : ""}.`
          : `${r.nomComplet} : fiche existante mise à jour${r.lot ? ` (${r.lot})` : ""}.`,
      );
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const doutesATrancher = !!verif?.doutes.length && !choix;
  const gradeChoisi = refs.grades?.find((g) => g.code === v.gradeCode);

  return (
    <>
      <Bouton onClick={() => setOuverte(true)}>
        <UserPlus /> Ajouter une personne
      </Bouton>
      <Modale titre="Ajouter une personne à la base des recrutés" ouverte={ouverte} fermer={fermer} large>
        <p className="mb-4 text-[13px] text-zinc-500">
          Sans fichier Excel : remplissez les mêmes colonnes que la base. Le système fait les mêmes contrôles qu’à l’importation (date, département,
          diplôme, cycle, doublons, n° de texte) et range la personne dans son lot et dans la note de son diplôme.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["MEPPSA", "Quota MEPPSA"],
              ["AUTRES", "Quota « Autres »"],
            ] as const
          ).map(([g, libelle]) => (
            <label
              key={g}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[13px] ${groupe === g ? "border-marque-500 bg-marque-50" : "border-zinc-200"}`}
            >
              <input
                type="radio"
                checked={groupe === g}
                onChange={() => {
                  setGroupe(g);
                  setVerif(null);
                  setChoix(null);
                }}
              />
              {libelle}
            </label>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Champ libelle="Noms et prénoms *" className="sm:col-span-2">
            <Saisie value={v.nomComplet} onChange={(e) => changer("nomComplet", e.target.value)} />
          </Champ>
          <Champ libelle="Date de naissance *">
            <SaisieDate value={v.dateNaissance} onChange={(iso) => changer("dateNaissance", iso)} aria-label="Date de naissance" />
          </Champ>
          <Champ libelle="Lieu de naissance">
            <Saisie value={v.lieuNaissance} onChange={(e) => changer("lieuNaissance", e.target.value)} />
          </Champ>
          <Champ libelle="Diplôme *" aide="La règle du diplôme donne le cycle, le grade et la note">
            <Liste
              value={v.diplomeCode}
              onChange={(e) => {
                changer("diplomeCode", e.target.value);
                changer("gradeCode", "");
              }}
              vide="— Choisir —"
              options={diplomes.map((r) => ({ valeur: r.code, libelle: r.libelle }))}
            />
          </Champ>
          {v.diplomeCode && (
            <ChoixGrade diplomeCode={v.diplomeCode} valeur={v.gradeCode} changer={(c) => changer("gradeCode", c)} />
          )}
          <Champ libelle="Département" aide={groupe === "AUTRES" ? "Vide : donné plus tard par la répartition" : undefined}>
            <Liste value={v.departement} onChange={(e) => changer("departement", e.target.value)} vide="—" options={refs.departements.map((d) => ({ valeur: d.nom, libelle: d.nom }))} />
          </Champ>
          <Champ libelle="Cycle (comme dans la base)" aide="Vide : celui du diplôme">
            <Liste value={v.cycle} onChange={(e) => changer("cycle", e.target.value)} vide="—" options={CYCLES.map((c) => ({ valeur: c, libelle: c }))} />
          </Champ>
          <Champ libelle="Spécialité">
            <Saisie value={v.specialite} onChange={(e) => changer("specialite", e.target.value)} />
          </Champ>
          <Champ libelle="Qualification">
            <Saisie value={v.qualification} onChange={(e) => changer("qualification", e.target.value)} />
          </Champ>
          <Champ libelle="Source">
            <Saisie value={v.source} onChange={(e) => changer("source", e.target.value)} placeholder="Ex. MEPPSA, FP" />
          </Champ>
          <Champ libelle="Statut">
            <Saisie value={v.statut} onChange={(e) => changer("statut", e.target.value)} placeholder="Ex. Volontaire" />
          </Champ>
          {groupe === "MEPPSA" && (
            <>
              <Champ libelle="Quota">
                <Saisie type="number" value={v.quota} onChange={(e) => changer("quota", e.target.value)} />
              </Champ>
              <Champ libelle="N° d’ordre">
                <Saisie type="number" value={v.numeroOrdre} onChange={(e) => changer("numeroOrdre", e.target.value)} />
              </Champ>
            </>
          )}
        </div>

        <h3 className="mt-5 mb-2 text-[13px] font-semibold text-encre">Texte de la Fonction Publique</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Champ libelle="Type de texte">
            <Liste
              value={v.typeTexte}
              onChange={(e) => changer("typeTexte", e.target.value)}
              options={[
                { valeur: "ARRETE", libelle: "Arrêté" },
                { valeur: "DECRET", libelle: "Décret" },
              ]}
            />
          </Champ>
          <Champ libelle="N° du texte">
            <Saisie value={v.numeroTexte} onChange={(e) => changer("numeroTexte", e.target.value)} />
          </Champ>
          <Champ libelle="Date de signature">
            <SaisieDate value={v.dateSignatureTexte} onChange={(iso) => changer("dateSignatureTexte", iso)} aria-label="Date de signature" />
          </Champ>
          <Champ libelle="Lot de publication" aide="Ex. VIII. Vide : en attente du texte">
            <Saisie value={v.lot} onChange={(e) => changer("lot", e.target.value.toUpperCase())} placeholder="VIII" />
          </Champ>
        </div>
        <Champ libelle="Observation" className="mt-3">
          <Saisie value={v.observation} onChange={(e) => changer("observation", e.target.value)} />
        </Champ>

        {verif && (
          <div className="mt-5 space-y-3 rounded-2xl bg-zinc-50 p-4 text-[13px]">
            <div className="font-semibold text-encre">Ce que le système va faire</div>
            <ul className="list-disc space-y-1 pl-5 text-zinc-700">
              <li>
                Diplôme : cycle <strong>{verif.cycle ?? "?"}</strong>
                {gradeChoisi ? `, grade ${gradeChoisi.abreviation} (choisi)` : verif.grade ? `, grade ${verif.grade}` : ", grade à choisir"}.
              </li>
              <li>
                {verif.lot ? (
                  <>
                    Rangée dans <strong>{verif.lot}</strong>, pour la note <strong>{verif.note ?? "à définir"}</strong> de ce lot
                    {verif.existante ? "." : " — après le contrôle des oubliés (déjà affecté ou pas encore affecté)."}
                  </>
                ) : (
                  <>Sans lot de publication : en attente du texte de la FP, dans aucune note pour l’instant.</>
                )}
              </li>
              {verif.existante && (
                <li className="text-marque-700">
                  Déjà dans la base ({verif.existante.liste}
                  {verif.existante.lot ? `, ${verif.existante.lot}` : ""}) : sa fiche sera complétée et mise à jour, aucun doublon créé.
                </li>
              )}
            </ul>
            {verif.anomalies.length > 0 && (
              <Alerte ton="jaune">
                <strong>Anomalies (la fiche est enregistrée, à corriger ensuite) :</strong>{" "}
                {verif.anomalies.map((a) => libelleAnomalie(a, { quotaAutres: groupe === "AUTRES" }).titre).join(" · ")}
              </Alerte>
            )}
            {verif.doutes.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-or-400/60 bg-or-100/30 p-3">
                <strong className="text-encre">Ressemble à une fiche déjà enregistrée : de qui s’agit-il ?</strong>
                {verif.doutes.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200">
                    <input type="radio" className="mt-0.5" checked={choix === d.id} onChange={() => setChoix(d.id)} />
                    <span>
                      Même personne que <strong>{d.nomComplet}</strong>
                      <span className="text-zinc-500">
                        {" "}
                        · né(e) le {dateCourte(d.dateNaissance)} · {d.liste}
                        {d.diplome ? ` · ${d.diplome}` : ""}
                        {d.departement ? ` · ${d.departement}` : ""}
                        {d.lot ? ` · ${d.lot}` : ""}
                        {d.texte ? ` · texte ${d.texte}` : ""}
                      </span>
                      <span className="block text-[11px] text-zinc-500">Sa fiche est mise à jour (rien n’est effacé).</span>
                    </span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200">
                  <input type="radio" className="mt-0.5" checked={choix === "autre"} onChange={() => setChoix("autre")} />
                  <span>
                    <strong>Une autre personne</strong> : créer une nouvelle fiche
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {erreur && (
          <div className="mt-3">
            <Alerte>{erreur}</Alerte>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Bouton onClick={fermer}>Annuler</Bouton>
          {verif ? (
            <Bouton variante="principal" disabled={envoi || doutesATrancher} onClick={enregistrer}>
              <CheckCircle2 /> {verif.existante || (choix && choix !== "autre") ? "Mettre à jour la fiche" : "Ajouter à la base"}
            </Bouton>
          ) : (
            <Bouton variante="principal" disabled={envoi} onClick={verifier}>
              <Search /> Vérifier
            </Bouton>
          )}
        </div>
      </Modale>
    </>
  );
}
