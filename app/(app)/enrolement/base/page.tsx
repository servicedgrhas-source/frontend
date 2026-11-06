"use client";

import { ArrowRightLeft, MapPin, Stamp } from "lucide-react";
import { useState } from "react";
import { ChoixEtablissement } from "@/components/choix-etablissement";
import { ChangerNote, EcrireSpecialite, PastilleSpecialite, SpecialitesACompleter } from "@/components/enrolement/changer-note";
import { type Enrole, FicheEnrole, SelecteurCampagne, useCampagne } from "@/components/enrolement/commun";
import { useSession } from "@/components/session";
import { ProposerRecommandation } from "@/components/recommandation";
import { Aide, Alerte, Annonce, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Tableau, Vide } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

/** Placer un volontaire : département retenu et établissement. */
function Placement({ e, fermer, apres }: { e: Enrole; fermer: () => void; apres: (texte: string) => void }) {
  const { refs } = useSession();
  const [dep, setDep] = useState(String(e.departementRetenuId ?? ""));
  const [etab, setEtab] = useState(e.etablissement ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  async function enregistrer() {
    try {
      await api.put(`/enrolement/dossiers/${e.id}/placement`, { departementRetenuId: dep ? Number(dep) : null, etablissement: etab || null });
      apres(`${e.nomComplet} : ${dep ? (refs.departements.find((d) => d.id === Number(dep))?.nom ?? "") : "département retiré"}${etab ? ` · ${etab}` : ""}.`);
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  return (
    <Modale titre={`Placer ${e.nomComplet}`} ouverte fermer={fermer}>
      <div className="space-y-4">
        <p className="text-[13px] text-zinc-600">Souhaits du volontaire : {e.departementsSouhaitesNoms.join(", ") || "aucun indiqué"}.</p>
        <Champ libelle="Département retenu">
          <Liste
            value={dep}
            onChange={(x) => {
              setDep(x.target.value);
              setEtab("");
            }}
            vide="— Pas encore choisi —"
            options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))}
          />
        </Champ>
        <Champ libelle="Établissement" aide="Vide : « à la disposition de la DDEPPSA »">
          <ChoixEtablissement departementId={dep ? Number(dep) : null} valeur={etab} changer={setEtab} />
        </Champ>
        {erreur && <Alerte>{erreur}</Alerte>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" onClick={enregistrer}>
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}

/** Base des enrôlés : les volontaires retenus par la DGRHAS. */
export default function BaseEnroles() {
  const { profil, refs } = useSession();
  const { campagnes, liste, campagne, choisir } = useCampagne();
  const diplomes = useApi<{ code: string; libelle: string }[]>("/enrolement/diplomes");
  const [recherche, setRecherche] = useState("");
  const [diplome, setDiplome] = useState("");
  const [departement, setDepartement] = useState("");
  const dossiers = useApi<Enrole[]>(campagne ? `/enrolement/dossiers${qs({ campagne: campagne.id, etat: "RETENU", recherche, diplome, departement })}` : null);
  const [fiche, setFiche] = useState<Enrole | null>(null);
  const [placer, setPlacer] = useState<Enrole | null>(null);
  const [recommander, setRecommander] = useState<Enrole | null>(null);
  const [changerNote, setChangerNote] = useState<Enrole[] | null>(null);
  const [specialite, setSpecialite] = useState<Enrole[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const lignes = dossiers.donnees ?? [];
  const appliquerRegle = async (e: Enrole) => {
    try {
      await api.post("/enrolement/dossiers/specialite", { ids: [e.id], specialite: null });
      setMessage(`Spécialité de ${e.nomComplet} : « ${e.specialiteEtat?.etat === "regle" ? e.specialiteEtat.valeur : ""} ».`);
      dossiers.recharger();
    } catch (x) {
      setMessage((x as Error).message);
    }
  };
  const sansDepartement = lignes.filter((e) => !e.departementRetenuId).length;
  const enNote = lignes.filter((e) => e.noteId).length;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Base des enrôlés"
        sousTitre="Les volontaires retenus par la DGRHAS. Choisissez ici leur département et leur établissement avant de préparer la note de service (Notes d’enrôlement)."
      />
      {!campagnes.donnees ? <Chargement /> : <SelecteurCampagne liste={liste} campagne={campagne} choisir={choisir} />}
      <Annonce ton="vert" fermer={() => setMessage(null)}>
        {message}
      </Annonce>
      {campagne && (
        <Carte
          titre={`Volontaires retenus — enrôlement ${campagne.annee}`}
          actions={
            <span className="flex flex-wrap gap-2">
            <Bouton
              disabled={!lignes.some((e) => !e.noteId && e.notesPossibles?.length)}
              onClick={() => setChangerNote(lignes.filter((e) => !e.noteId && e.notesPossibles?.length))}
            >
              <ArrowRightLeft className="size-4" aria-hidden />
              Changer la note de la liste affichée
              <Aide>Filtrez d’abord (par diplôme, par nom…), puis envoyez tous les volontaires affichés dans une autre note, ou remettez-les à la règle automatique.</Aide>
            </Bouton>
            <Bouton onClick={() => api.telecharger(`/enrolement/dossiers/excel${qs({ campagne: campagne.id, etat: "RETENU" })}`, `Enrolement ${campagne.annee} - base des enroles.xlsx`)}>
              Télécharger en Excel
            </Bouton>
            </span>
          }
        >
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Saisie placeholder="Rechercher un nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            <Liste value={diplome} onChange={(e) => setDiplome(e.target.value)} vide="Tous les diplômes" options={(diplomes.donnees ?? []).map((d) => ({ valeur: d.code, libelle: d.libelle }))} />
            <Liste value={departement} onChange={(e) => setDepartement(e.target.value)} vide="Tous les départements" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          </div>
          {dossiers.donnees && lignes.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-zinc-600">
              <span>
                <strong>{lignes.length}</strong> volontaire(s)
              </span>
              {sansDepartement > 0 && <span className="font-medium text-or-700">{sansDepartement} sans département retenu (iront « à la disposition » ou à placer)</span>}
              <span>{enNote} déjà dans une note validée</span>
            </div>
          )}
          {dossiers.erreur && <Alerte>{dossiers.erreur}</Alerte>}
          <SpecialitesACompleter dossiers={lignes} apres={(t) => { setMessage(t); dossiers.recharger(); }} />
          {!dossiers.donnees ? (
            <Chargement />
          ) : !lignes.length ? (
            <Vide>Aucun volontaire retenu {recherche || diplome || departement ? "avec ces filtres" : "pour le moment : la DGRHAS retient les dossiers dans « Saisie des enrôlements »"}.</Vide>
          ) : (
            <Tableau>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nom et prénoms</th>
                  <th>Diplôme</th>
                  <th>Département retenu</th>
                  <th>Établissement</th>
                  <th>Note</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lignes.map((e, i) => (
                  <tr key={e.id}>
                    <td className="tabular-nums text-zinc-400">{i + 1}</td>
                    <td>
                      <button type="button" title="Voir tout le dossier" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => setFiche(e)}>
                        {e.nomComplet}
                      </button>
                      <div className="text-[11px] text-zinc-400">{e.dateNaissance ? e.dateNaissance.split("-").reverse().join("/") : "date ?"}</div>
                    </td>
                    <td className="text-[12px]">
                      {e.diplomeLibelle}
                      <div className="text-zinc-400">{[e.promotion, e.specialite].filter(Boolean).join(" · ")}</div>
                      {e.noteAutre && <div className="mt-0.5 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200" title={e.noteAutre}>→ {e.noteAutre.split(" (")[0]}</div>}
                      {!e.noteId && (
                        <button type="button" className="ml-1 mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-marque-700 ring-1 ring-marque-200 hover:bg-marque-50" onClick={() => setChangerNote([e])}>
                          <ArrowRightLeft className="size-3" aria-hidden /> Changer de note
                        </button>
                      )}
                        <PastilleSpecialite e={e} ouvrir={(regle) => (regle ? appliquerRegle(e) : setSpecialite([e]))} />
                    </td>
                    <td className={e.departementRetenu ? "" : "text-or-700"}>{e.departementRetenu ?? "pas encore choisi"}</td>
                    <td className="text-[12px]">{e.etablissement ?? (e.departementRetenu ? "à la disposition de la DDEPPSA" : "—")}</td>
                    <td className="text-[12px]">{e.noteId ? "validée" : "pas encore"}</td>
                    <td className="text-right">
                      {!e.noteId && (
                        <BoutonIcone libelle="Choisir le département et l’établissement" onClick={() => setPlacer(e)}>
                          <MapPin />
                        </BoutonIcone>
                      )}
                      {!e.noteId && (
                        <BoutonIcone
                          libelle={e.recommandationEnAttente ? "Recommandation en attente (directeur, puis DG)" : "Recommandation (autre département ou établissement, décision du DG)"}
                          ton="vert"
                          disabled={e.recommandationEnAttente}
                          onClick={() => setRecommander(e)}
                        >
                          <Stamp />
                        </BoutonIcone>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}
      {specialite && <EcrireSpecialite dossiers={specialite} fermer={() => setSpecialite(null)} apres={(t) => { setSpecialite(null); setMessage(t); dossiers.recharger(); }} />}
      {changerNote && <ChangerNote dossiers={changerNote} fermer={() => setChangerNote(null)} apres={(t) => { setChangerNote(null); setMessage(t); dossiers.recharger(); }} />}
      {fiche && <FicheEnrole e={fiche} fermer={() => setFiche(null)} />}
      {recommander && (
        <ProposerRecommandation
          url={`/enrolement/enroles/${recommander.id}/recommandations`}
          personne={recommander.nomComplet}
          enrole={recommander}
          avant={[recommander.departementRetenu, recommander.etablissement].filter(Boolean).join(" · ")}
          fermer={() => setRecommander(null)}
          apres={() => {
            setRecommander(null);
            setMessage("Recommandation proposée : avis du directeur, puis décision du DG (page Recommandations).");
          }}
        />
      )}
      {placer && (
        <Placement
          e={placer}
          fermer={() => setPlacer(null)}
          apres={(t) => {
            setPlacer(null);
            setMessage(t);
            dossiers.recharger();
          }}
        />
      )}
    </div>
  );
}
