"use client";

import { Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { Alerte, Badge, Bouton, Carte, Champ, Liste, Modale, Saisie, Zone } from "./ui";
import { api, useApi } from "@/lib/api";
import { CYCLES, dateCourte, ETAT_MUTATION } from "@/lib/libelles";
import type { DemandeMutation } from "@/lib/types";
import { SaisieReferentiel } from "@/components/saisie-referentiel";

const JUSTIFICATIFS: Record<string, string> = {
  RAPPROCHEMENT_CONJOINT: "Acte de mariage (référence)",
  RAISONS_SOCIALES: "Justificatif social",
  RAISONS_SANTE: "Certificat médical / diagnostic",
  PERMUTATION: "Accord de permutation",
  ANCIENNETE: "Note de prise de service",
};

type Formulaire = Record<string, string>;

function versFormulaire(d?: DemandeMutation): Formulaire {
  return {
    nomComplet: d?.nomComplet ?? "",
    genre: d?.genre ?? "M",
    grade: d?.grade ?? "",
    echelon: d?.echelon?.toString() ?? "",
    matricule: d?.matricule ?? "",
    typeAgent: d?.typeAgent ?? "FONCTIONNAIRE",
    statutAgent: d?.statutAgent ?? "ENSEIGNANT",
    departementOrigineId: d?.departementOrigineId?.toString() ?? "",
    lieuService: d?.lieuService ?? "",
    cycle: d?.cycle ?? "",
    specialite: d?.specialite ?? "",
    datePriseService: d?.datePriseService ?? "",
    departementSolliciteId: d?.departementSolliciteId?.toString() ?? "",
    lieuSollicite: d?.lieuSollicite ?? "",
    motif: d?.motif ?? "",
    typePrestation: d?.typePrestation ?? "",
    objet: d?.objet ?? "",
    justificatif: d?.justificatif ?? "",
    permutationAvecId: d?.permutationAvecId ?? "",
    origine: d?.origine ?? "",
    observation: d?.observation ?? "",
    dateEnregistrement: d?.dateEnregistrement ?? new Date().toISOString().slice(0, 10),
  };
}

export function FormulaireMutation({ demande, apres }: { demande?: DemandeMutation; apres: (d: DemandeMutation) => void }) {
  const { refs } = useSession();
  const [f, setF] = useState<Formulaire>(versFormulaire(demande));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const types = useApi<{ code: string; libelle: string; pieces: string[]; motifMutation: string | null; decision: string }[]>("/prestations?actifs=1");
  // Pièces choisies avant l'enregistrement (envoyées juste après la création de la demande)
  const [pieces, setPieces] = useState<{ libelle: string; fichier: File }[]>([]);
  const type = types.donnees?.find((t) => t.code === f.typePrestation);
  const permutants = useApi<DemandeMutation[]>(f.motif === "PERMUTATION" ? "/mutations?motif=PERMUTATION" : null);
  const maj = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const deps = refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }));
  const [doublons, setDoublons] = useState<(DemandeMutation & { memeMatricule: boolean })[]>([]);
  const [confirmerDoublon, setConfirmerDoublon] = useState(false);
  /** Demande déjà créée dont seules les pièces ont échoué : réessayer ne renvoie que les pièces. */
  const [sansPieces, setSansPieces] = useState<DemandeMutation | null>(null);
  const libMotif = (c: string) => refs.motifs.find((m) => m.code === c)?.libelle ?? c;

  // Recherche des demandes déjà enregistrées pour la même personne (pendant la saisie)
  useEffect(() => {
    const minuterie = setTimeout(() => {
      const p = new URLSearchParams({ nom: f.nomComplet, matricule: f.matricule });
      if (demande) p.set("exclure", demande.id);
      api
        .get<(DemandeMutation & { memeMatricule: boolean })[]>(`/mutations/doublons?${p.toString()}`)
        .then(setDoublons)
        .catch(() => setDoublons([]));
    }, 450);
    return () => clearTimeout(minuterie);
  }, [f.nomComplet, f.matricule, demande]);

  async function enregistrer(e: React.FormEvent, forcer = false) {
    e.preventDefault();
    // Après une demande déjà créée, la « ressemblante » trouvée est elle-même
    if (doublons.length && !forcer && !sansPieces) {
      setConfirmerDoublon(true);
      return;
    }
    setConfirmerDoublon(false);
    setEnvoi(true);
    setErreur(null);
    const n = (v: string) => (v ? Number(v) : null);
    const corps = {
      ...f,
      echelon: n(f.echelon),
      departementOrigineId: n(f.departementOrigineId),
      departementSolliciteId: n(f.departementSolliciteId),
      datePriseService: f.datePriseService || null,
      dateEnregistrement: f.dateEnregistrement || null,
      permutationAvecId: f.permutationAvecId || null,
      typePrestation: f.typePrestation || null,
      objet: f.objet || (f.departementSolliciteId ? `Mutation à ${refs.departements.find((d) => String(d.id) === f.departementSolliciteId)?.nom ?? ""}` : null),
    };
    try {
      const d = sansPieces ?? (demande ? await api.put<DemandeMutation>(`/mutations/${demande.id}`, corps) : await api.post<DemandeMutation>("/mutations", corps));
      if (!demande && pieces.length) {
        const fd = new FormData();
        for (const x of pieces) {
          fd.append("fichiers", x.fichier);
          fd.append("libelles", x.libelle);
        }
        try {
          await api.post(`/mutations/${d.id}/pieces`, fd);
        } catch (x) {
          setSansPieces(d);
          throw new Error(`La demande est enregistrée, mais pas ses pièces : ${(x as Error).message} « Réessayer l’envoi des pièces » ne recrée pas la demande ; vous pouvez aussi continuer et les joindre depuis le dossier.`);
        }
      }
      apres(d);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={enregistrer} className="space-y-4">
      {erreur && <Alerte>{erreur}</Alerte>}
      {doublons.length > 0 && (
        <Alerte ton="jaune">
          <div className="font-semibold">
            Attention : {doublons.length === 1 ? "une demande existe" : `${doublons.length} demandes existent`} peut-être déjà pour cette personne.
          </div>
          <ul className="mt-2 space-y-1">
            {doublons.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/mutation/${d.id}`} target="_blank" className="font-medium underline">
                  {d.nomComplet}
                </Link>
                <span className="text-[12px]">
                  n° {d.numeroEnregistrement} du {dateCourte(d.dateEnregistrement)} · {libMotif(d.motif)} · {d.departementOrigine?.nom ?? "?"} → {d.departementSollicite?.nom ?? "?"}
                </span>
                <Badge ton={ETAT_MUTATION[d.etat].ton}>{ETAT_MUTATION[d.etat].libelle}</Badge>
                {d.memeMatricule && <Badge ton="rouge">Même matricule</Badge>}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-[12px]">Vérifiez avant d’enregistrer : s’il s’agit de la même personne, modifiez plutôt la demande existante.</div>
        </Alerte>
      )}
      <Carte titre="Agent">
        <div className="grid gap-3 md:grid-cols-3">
          <Champ libelle="Noms et prénoms *" className="md:col-span-2">
            <Saisie required value={f.nomComplet} onChange={maj("nomComplet")} />
          </Champ>
          <Champ libelle="Genre">
            <Liste value={f.genre} onChange={maj("genre")} options={[{ valeur: "M", libelle: "Masculin" }, { valeur: "F", libelle: "Féminin" }]} />
          </Champ>
          <Champ libelle="Grade">
            <Saisie value={f.grade} onChange={maj("grade")} placeholder="Inst, Inst.A, PCEG, PCL…" list="grades" />
            <datalist id="grades">
              {["Inst", "Inst.A", "Inst.C", "PTA", "PTACET", "PCEG", "PCL", "PCES", "SPA", "SA", "Econ", "Com. des SAF", "Chauffeur"].map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </Champ>
          <Champ libelle="Échelon">
            <Saisie type="number" min={0} max={20} value={f.echelon} onChange={maj("echelon")} />
          </Champ>
          <Champ libelle="Matricule solde" aide="Vide si non communiqué ou finaliste">
            <Saisie value={f.matricule} onChange={maj("matricule")} placeholder="Ex. 224664 N" />
          </Champ>
          <Champ libelle="Type">
            <Liste value={f.typeAgent} onChange={maj("typeAgent")} options={[{ valeur: "FONCTIONNAIRE", libelle: "Fonctionnaire" }, { valeur: "FINALISTE", libelle: "Finaliste" }]} />
          </Champ>
          <Champ libelle="Statut">
            <Liste
              value={f.statutAgent}
              onChange={maj("statutAgent")}
              options={[{ valeur: "ENSEIGNANT", libelle: "Enseignant actif" }, { valeur: "PERSONNEL_ADMINISTRATIF", libelle: "Personnel administratif" }]}
            />
          </Champ>
          <Champ libelle="Date de prise de service" aide="Sert au calcul de l’ancienneté">
            <Saisie type="date" value={f.datePriseService} onChange={maj("datePriseService")} />
          </Champ>
        </div>
      </Carte>

      <Carte titre="Poste actuel et demande">
        <div className="grid gap-3 md:grid-cols-3">
          <Champ
            libelle="Type de demande *"
            aide={type?.decision === "DDEPPSA" ? "Décidée par le directeur départemental" : "Le circuit et les pièces exigées en dépendent"}
            className="md:col-span-2"
          >
            <Liste
              required
              value={f.typePrestation}
              onChange={(e) => {
                const t = types.donnees?.find((x) => x.code === e.target.value);
                setF({ ...f, typePrestation: e.target.value, motif: t?.motifMutation ?? f.motif });
              }}
              vide="— Choisir —"
              options={(types.donnees ?? []).map((t) => ({ valeur: t.code, libelle: t.libelle }))}
            />
          </Champ>
          <Champ libelle="Objet" aide="Laissé vide : « Mutation à » + le département demandé">
            <Saisie value={f.objet} onChange={maj("objet")} placeholder="Ex. Mutation à Brazzaville" />
          </Champ>
          <Champ libelle="Département d’origine *">
            <Liste required value={f.departementOrigineId} onChange={maj("departementOrigineId")} vide="—" options={deps} />
          </Champ>
          <Champ libelle="Lieu de service (ancien poste)" className="md:col-span-2">
            <SaisieReferentiel liste="ETABLISSEMENT" valeur={f.lieuService} changer={(v) => setF({ ...f, lieuService: v })} departementId={f.departementOrigineId} placeholder="Ex. CEG de Kinkala" />
          </Champ>
          <Champ libelle="Cycle *">
            <Liste required value={f.cycle} onChange={maj("cycle")} vide="—" options={Object.entries(CYCLES).map(([k, v]) => ({ valeur: k, libelle: v }))} />
          </Champ>
          <Champ libelle="Spécialité" aide="Collège / lycée : Français, HG, SVT…">
            <SaisieReferentiel liste="MATIERE" valeur={f.specialite} changer={(v) => setF({ ...f, specialite: v })} />
          </Champ>
          <Champ libelle="Date d’enregistrement">
            <Saisie type="date" value={f.dateEnregistrement} onChange={maj("dateEnregistrement")} />
          </Champ>
          <Champ libelle="Département sollicité *">
            <Liste required value={f.departementSolliciteId} onChange={maj("departementSolliciteId")} vide="—" options={deps} />
          </Champ>
          <Champ libelle="Lieu sollicité" className="md:col-span-2">
            <SaisieReferentiel liste="ETABLISSEMENT" valeur={f.lieuSollicite} changer={(v) => setF({ ...f, lieuSollicite: v })} departementId={f.departementSolliciteId} />
          </Champ>
          <Champ libelle="Motif *">
            <Liste required value={f.motif} onChange={maj("motif")} vide="—" options={refs.motifs.map((m) => ({ valeur: m.code, libelle: m.libelle }))} />
          </Champ>
          <Champ libelle={JUSTIFICATIFS[f.motif] ?? "Justificatif"} className="md:col-span-2">
            <Saisie value={f.justificatif} onChange={maj("justificatif")} placeholder={f.motif === "RAPPROCHEMENT_CONJOINT" ? "Acte de mariage n° …" : ""} />
          </Champ>
          {f.motif === "PERMUTATION" && (
            <Champ libelle="Permute avec" className="md:col-span-3">
              <Liste
                value={f.permutationAvecId}
                onChange={maj("permutationAvecId")}
                vide="— Agent permutant —"
                options={(permutants.donnees ?? []).filter((p) => p.id !== demande?.id).map((p) => ({ valeur: p.id, libelle: `${p.nomComplet} (${p.departementOrigine?.nom ?? "?"} → ${p.departementSollicite?.nom ?? "?"})` }))}
              />
            </Champ>
          )}
          <Champ libelle="Origine (recommandation)" aide="Ex. S/C DAAF" >
            <Saisie value={f.origine} onChange={maj("origine")} />
          </Champ>
          <Champ libelle="Observation" className="md:col-span-2">
            <Zone value={f.observation} onChange={maj("observation")} className="min-h-10" />
          </Champ>
        </div>
      </Carte>
      {!demande && (
        <Carte titre="Pièces jointes">
          <p className="mb-3 text-[12px] text-zinc-500">
            La demande manuscrite scannée et les justificatifs. Vous pouvez joindre plusieurs fichiers par pièce (PDF, JPG ou PNG, 10 Mo au plus chacun).
          </p>
          <div className="space-y-2">
            {[...(type?.pieces ?? []), "Autre pièce"].map((lib) => {
              const choisis = pieces.filter((x) => x.libelle === lib);
              return (
                <div key={lib} className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-[13px]">
                  <span className={`min-w-0 flex-1 ${choisis.length ? "font-medium text-marque-700" : ""}`}>
                    {choisis.length ? "✓ " : ""}
                    {lib}
                  </span>
                  {choisis.map((x) => (
                    <span key={x.fichier.name} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] ring-1 ring-zinc-200">
                      <Paperclip className="size-3" /> {x.fichier.name}
                      <button type="button" title="Retirer" onClick={() => setPieces((l) => l.filter((y) => y !== x))}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <label className="cursor-pointer rounded-xl bg-white px-2.5 py-1 text-[12px] font-medium ring-1 ring-zinc-200 hover:bg-zinc-100">
                    Joindre
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const tous = Array.from(e.target.files ?? []);
                        const liste = tous.filter((x) => x.size <= 10 * 1024 * 1024);
                        setErreur(liste.length < tous.length ? `Trop lourd (10 Mo au plus), non joint : ${tous.filter((x) => !liste.includes(x)).map((x) => x.name).join(", ")}.` : null);
                        setPieces((l) => [...l, ...liste.map((fichier) => ({ libelle: lib, fichier }))]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
          {!type && <p className="mt-2 text-[12px] text-zinc-400">Choisissez le type de demande : la liste des pièces exigées s’affiche.</p>}
        </Carte>
      )}
      {f.motif === "ANCIENNETE" && <Alerte ton="jaune">Une mutation pour ancienneté exige au moins 5 ans dans le poste actuel.</Alerte>}
      <div className="flex justify-end gap-2">
        {sansPieces && (
          <Bouton type="button" onClick={() => apres(sansPieces)}>
            Continuer sans les pièces
          </Bouton>
        )}
        <Bouton variante="principal" type="submit" disabled={envoi}>
          {envoi ? "Enregistrement…" : sansPieces ? "Réessayer l’envoi des pièces" : demande ? "Enregistrer les modifications" : "Enregistrer la demande"}
        </Bouton>
      </div>
      <Modale titre="Enregistrer malgré le doublon possible ?" ouverte={confirmerDoublon} fermer={() => setConfirmerDoublon(false)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">
          {doublons.length === 1 ? "Une demande ressemblante existe déjà" : `${doublons.length} demandes ressemblantes existent déjà`} (même nom ou même
          matricule). Enregistrez quand même uniquement s’il s’agit d’une autre personne ou d’une nouvelle demande voulue.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton type="button" onClick={() => setConfirmerDoublon(false)}>
            Annuler
          </Bouton>
          <Bouton type="button" variante="principal" onClick={(e) => enregistrer(e as unknown as React.FormEvent, true)}>
            Enregistrer quand même
          </Bouton>
        </div>
      </Modale>
    </form>
  );
}
