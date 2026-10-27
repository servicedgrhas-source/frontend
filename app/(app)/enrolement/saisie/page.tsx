"use client";

import { CheckCircle2, PencilLine, Stamp, Trash2, Undo2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ChampOrigine } from "@/components/champ-origine";
import { type Enrole, FicheEnrole, SelecteurCampagne, useCampagne } from "@/components/enrolement/commun";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, Zone, ZoneFichier } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

type Etat = Enrole["etat"];
interface Diplome {
  code: string;
  libelle: string;
  cycle: string;
}
interface Doublon {
  source: string;
  nom: string;
  naissance: string | null;
  detail: string;
  probable: boolean;
}

const vide = {
  nomComplet: "",
  dateNaissance: "",
  lieuNaissance: "",
  diplome: "",
  diplomePrecision: "",
  promotion: "",
  cycle: "",
  specialite: "",
  d1: "",
  d2: "",
  d3: "",
  departementRetenuId: "",
  etablissement: "",
  telephone: "",
  origineBrute: "",
  membreId: "",
  observation: "",
};
type Valeurs = typeof vide;

const valeursDe = (e?: Enrole): Valeurs =>
  e
    ? {
        nomComplet: e.nomComplet,
        dateNaissance: e.dateNaissance ?? "",
        lieuNaissance: e.lieuNaissance ?? "",
        diplome: e.diplome,
        diplomePrecision: e.diplomePrecision ?? "",
        promotion: e.promotion ?? "",
        cycle: e.cycle ?? "",
        specialite: e.specialite ?? "",
        d1: String(e.departementsSouhaites[0] ?? ""),
        d2: String(e.departementsSouhaites[1] ?? ""),
        d3: String(e.departementsSouhaites[2] ?? ""),
        departementRetenuId: String(e.departementRetenuId ?? ""),
        etablissement: e.etablissement ?? "",
        telephone: e.telephone ?? "",
        origineBrute: e.origineBrute ?? "",
        membreId: e.membreId ?? "",
        observation: e.observation ?? "",
      }
    : vide;

/** Formulaire d'un dossier d'enrôlement (création ou correction). */
function FormulaireEnrole({ campagneId, dossier, apres, annuler }: { campagneId: number; dossier?: Enrole; apres: (texte: string) => void; annuler?: () => void }) {
  const { refs } = useSession();
  const diplomes = useApi<Diplome[]>("/enrolement/diplomes");
  const referentiel = useApi<{ cycles: string[]; specialites: string[] }>("/enrolement/referentiel");
  const membres = useApi<{ id: string; nom: string; places: number; saisis: number }[]>(`/enrolement/membres?campagne=${campagneId}`);
  const [v, setV] = useState<Valeurs>(() => valeursDe(dossier));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirmer, setConfirmer] = useState<string | null>(null);
  const [doublons, setDoublons] = useState<Doublon[]>([]);
  const maj = (k: keyof Valeurs, x: string) => setV((s) => ({ ...s, [k]: x }));
  const deps = refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }));

  // Même personne déjà enregistrée ? (enrôlement, recrutement, années passées)
  useEffect(() => {
    if (v.nomComplet.trim().split(/\s+/).length < 2) return;
    let actif = true;
    const t = setTimeout(() => {
      api
        .get<Doublon[]>(`/enrolement/doublons${qs({ nom: v.nomComplet, naissance: v.dateNaissance, exclure: dossier?.id })}`)
        .then((d) => actif && setDoublons(d))
        .catch(() => undefined);
    }, 500);
    return () => {
      actif = false;
      clearTimeout(t);
    };
  }, [v.nomComplet, v.dateNaissance, dossier?.id]);

  async function enregistrer(forcer = false) {
    setErreur(null);
    setEnvoi(true);
    const corps = {
      campagneId,
      nomComplet: v.nomComplet,
      dateNaissance: v.dateNaissance || null,
      lieuNaissance: v.lieuNaissance || null,
      diplome: v.diplome,
      diplomePrecision: v.diplomePrecision || null,
      promotion: v.promotion || null,
      cycle: v.cycle || null,
      specialite: v.specialite || null,
      departementsSouhaites: [v.d1, v.d2, v.d3].filter(Boolean).map(Number),
      // Le département retenu et l'établissement se choisissent au traitement (Base des enrôlés), pas à la saisie
      departementRetenuId: v.departementRetenuId ? Number(v.departementRetenuId) : null,
      etablissement: v.etablissement || null,
      telephone: v.telephone || null,
      origineBrute: v.origineBrute || null,
      membreId: v.membreId || null,
      observation: v.observation || null,
      forcerDoublon: forcer,
    };
    try {
      if (dossier) await api.put(`/enrolement/dossiers/${dossier.id}`, corps);
      else await api.post("/enrolement/dossiers", corps);
      apres(dossier ? `Dossier de ${v.nomComplet.trim()} corrigé.` : `Dossier de ${v.nomComplet.trim()} enregistré : il est « à contrôler ».`);
      if (!dossier) {
        setV(vide);
        setDoublons([]);
      }
    } catch (e) {
      const m = (e as Error).message;
      if (/déjà enregistré/.test(m) && !forcer) setConfirmer(m);
      else setErreur(m);
    } finally {
      setEnvoi(false);
    }
  }

  const membre = membres.donnees?.find((m) => m.id === v.membreId);
  const diplomeChoisi = diplomes.donnees?.find((d) => d.code === v.diplome);
  // Une licence, un master ou un autre diplôme : le cycle est à choisir ; les autres l'imposent
  const cycleFixe = !!diplomeChoisi && !["LICENCE", "MASTER", "AUTRE"].includes(diplomeChoisi.code) && !!diplomeChoisi.cycle;
  const avecSpecialite = v.cycle === "Collège" || v.cycle === "Lycée";
  const anneeCourante = new Date().getFullYear();
  const annees = Array.from({ length: 26 }, (_, i) => String(anneeCourante - i));
  if (v.promotion && !annees.includes(v.promotion)) annees.push(v.promotion);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void enregistrer();
      }}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Champ libelle="Nom et prénoms *" aide="Le nom de famille en MAJUSCULES, puis les prénoms" className="md:col-span-2">
          <Saisie value={v.nomComplet} onChange={(e) => maj("nomComplet", e.target.value)} placeholder="Ex. MOUANDA Jean Paul" />
        </Champ>
        <Champ libelle="Date de naissance">
          <Saisie type="date" value={v.dateNaissance} onChange={(e) => maj("dateNaissance", e.target.value)} />
        </Champ>
        <Champ libelle="Lieu de naissance">
          <Saisie value={v.lieuNaissance} onChange={(e) => maj("lieuNaissance", e.target.value)} />
        </Champ>
        <Champ libelle="Diplôme *">
          <Liste
            value={v.diplome}
            onChange={(e) => {
              const d = (diplomes.donnees ?? []).find((x) => x.code === e.target.value);
              // Le cycle découle du diplôme (CFEEN → primaire) ; pour une licence ou un master, c'est à choisir
              setV((s) => ({ ...s, diplome: e.target.value, cycle: d?.cycle ?? "" }));
            }}
            vide="— Choisir —"
            options={(diplomes.donnees ?? []).map((d) => ({ valeur: d.code, libelle: d.libelle }))}
          />
        </Champ>
        <Champ libelle="Précision du diplôme" aide="Ex. Licence d’enseignement ENS, ou le pays d’obtention (Cameroun, RDC…)">
          <Saisie value={v.diplomePrecision} onChange={(e) => maj("diplomePrecision", e.target.value)} />
        </Champ>
        <Champ libelle="Promotion" aide="L’année de sortie de l’école">
          <Liste value={v.promotion} onChange={(e) => maj("promotion", e.target.value)} vide="— Année —" options={annees.map((a) => ({ valeur: a, libelle: a }))} />
        </Champ>
        <Champ
          libelle="Cycle *"
          aide={cycleFixe ? "Imposé par le diplôme" : "Choisissez-le avant la spécialité : l’anglais du collège n’est pas celui du lycée"}
        >
          <Liste value={v.cycle} onChange={(e) => setV((s) => ({ ...s, cycle: e.target.value, specialite: "" }))} disabled={cycleFixe} vide="— Choisir —" options={(referentiel.donnees?.cycles ?? []).map((c) => ({ valeur: c, libelle: c }))} />
        </Champ>
        <Champ libelle="Spécialité" aide={avecSpecialite ? "Choisissez dans la liste (ou écrivez-en une autre)" : "Sans objet pour ce cycle"}>
          <Saisie list="specialites-enrolement" value={v.specialite} onChange={(e) => maj("specialite", e.target.value)} disabled={!avecSpecialite} placeholder={avecSpecialite ? "Ex. Anglais" : ""} />
          <datalist id="specialites-enrolement">
            {(referentiel.donnees?.specialites ?? []).map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </Champ>
        {(["d1", "d2", "d3"] as const).map((k, i) => (
          <Champ key={k} libelle={`Département souhaité ${i + 1}`}>
            <Liste value={v[k]} onChange={(e) => maj(k, e.target.value)} vide="—" options={deps} />
          </Champ>
        ))}
        <Champ libelle="Téléphone">
          <Saisie value={v.telephone} onChange={(e) => maj("telephone", e.target.value)} />
        </Champ>
        <Champ libelle="Apporté par un membre de la commission ?" className="md:col-span-2" aide={membre ? `${membre.saisis} / ${membre.places} place(s) déjà utilisée(s)` : undefined}>
          <Liste
            value={v.membreId}
            onChange={(e) => maj("membreId", e.target.value)}
            vide="— Non —"
            disabled={!membres.donnees?.length}
            options={(membres.donnees ?? []).map((m) => ({ valeur: m.id, libelle: `${m.nom} — ${m.saisis} / ${m.places} places${m.saisis >= m.places ? " · COMPLET" : ""}` }))}
          />
        </Champ>
        <ChampOrigine valeur={v.origineBrute} changer={(x) => maj("origineBrute", x)} membre={membre?.nom ?? null} departement={null} />
        <Champ libelle="Observation" className="md:col-span-2 xl:col-span-4">
          <Zone className="min-h-10!" rows={1} value={v.observation} onChange={(e) => maj("observation", e.target.value)} />
        </Champ>
      </div>
      {doublons.length > 0 && (
        <Alerte ton={doublons.some((d) => d.probable) ? "rouge" : "jaune"}>
          <div className="font-semibold">{doublons.some((d) => d.probable) ? "Cette personne semble déjà enregistrée :" : "Personnes qui ressemblent :"}</div>
          <ul className="mt-1 text-[12px]">
            {doublons.map((d, i) => (
              <li key={i}>
                {d.nom} · {d.naissance ? d.naissance.split("-").reverse().join("/") : "date ?"} — {d.source} ({d.detail})
              </li>
            ))}
          </ul>
        </Alerte>
      )}
      {erreur && <Alerte>{erreur}</Alerte>}
      <div className="flex justify-end gap-2">
        {annuler ? (
          <Bouton type="button" onClick={annuler}>
            Annuler
          </Bouton>
        ) : (
          <Bouton type="button" onClick={() => setV(vide)}>
            Effacer
          </Bouton>
        )}
        <Bouton variante="principal" type="submit" disabled={envoi || !v.nomComplet.trim() || !v.diplome || !v.cycle}>
          {dossier ? "Enregistrer les modifications" : "Enregistrer le dossier"}
        </Bouton>
      </div>
      <Modale titre="Enregistrer malgré tout ?" ouverte={!!confirmer} fermer={() => setConfirmer(null)}>
        <p className="text-[13px] leading-relaxed text-zinc-600">{confirmer}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setConfirmer(null)}>Annuler</Bouton>
          <Bouton
            variante="danger"
            onClick={() => {
              setConfirmer(null);
              void enregistrer(true);
            }}
          >
            C’est une autre personne : enregistrer
          </Bouton>
        </div>
      </Modale>
    </form>
  );
}

/** Saisie des enrôlements : formulaire, import, puis contrôle et décision de la DGRHAS. */
export default function SaisieEnrolement() {
  const { profil } = useSession();
  const controleur = peut.controler(profil.role);
  const dg = peut.valider(profil.role);
  const { campagnes, liste, campagne, choisir } = useCampagne();
  const [etat, setEtat] = useState<Etat>("A_CONTROLER");
  const [recherche, setRecherche] = useState("");
  const dossiers = useApi<Enrole[]>(campagne ? `/enrolement/dossiers${qs({ campagne: campagne.id, etat, recherche })}` : null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  const [fiche, setFiche] = useState<Enrole | null>(null);
  const [correction, setCorrection] = useState<Enrole | null>(null);
  const [renvoi, setRenvoi] = useState<string[] | null>(null);
  const [nonRetenu, setNonRetenu] = useState<string[] | null>(null);
  const [texte, setTexte] = useState("");
  const [envoiImport, setEnvoiImport] = useState(false);
  const [apercu, setApercu] = useState<{ fichier: File; rapport: { feuilles: string[]; lues: number; ajoutes: number; dejaLa: number; sansDiplome: number } } | null>(null);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;

  const recharger = () => {
    dossiers.recharger();
    campagnes.recharger();
    setCoches(new Set());
  };
  const agir = async (fn: () => Promise<unknown>, texteOk: string) => {
    try {
      await fn();
      setMessage({ ton: "vert", texte: texteOk });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  };
  const lignes = dossiers.donnees ?? [];
  const basculer = (id: string) =>
    setCoches((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const tousCoches = lignes.length > 0 && lignes.every((l) => coches.has(l.id));
  const choisis = [...coches];

  async function importer(f: File, essai: boolean) {
    if (!campagne) return;
    const fd = new FormData();
    fd.append("fichier", f);
    setEnvoiImport(true);
    try {
      const r = await api.post<{ feuilles: string[]; lues: number; ajoutes: number; dejaLa: number; sansDiplome: number }>(`/enrolement/import${qs({ campagne: campagne.id, essai: essai ? 1 : 0 })}`, fd);
      if (essai) setApercu({ fichier: f, rapport: r });
      else {
        setApercu(null);
        setMessage({ ton: "vert", texte: `${r.ajoutes} dossier(s) ajouté(s) « à contrôler »${r.dejaLa ? ` ; ${r.dejaLa} déjà dans la campagne (ignorés)` : ""}.` });
        recharger();
      }
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    } finally {
      setEnvoiImport(false);
    }
  }

  return (
    <div className="space-y-6">
      <EnTete
        titre="Saisie des enrôlements"
        sousTitre="Chaque dossier déposé est saisi (ou importé) ; le contrôleur le compare au dossier papier ; la DGRHAS décide : retenu ou non. Les retenus forment la base des enrôlés et entrent dans la note de service des volontaires."
      />
      {!campagnes.donnees ? <Chargement /> : <SelecteurCampagne liste={liste} campagne={campagne} choisir={choisir} />}
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>

      {campagne && (
        <>
          {campagne.ouverte ? (
            <Carte titre="Nouveau dossier">
              <FormulaireEnrole campagneId={campagne.id} apres={(t) => { setMessage({ ton: "vert", texte: t }); recharger(); }} />
            </Carte>
          ) : (
            <Alerte ton="jaune">La campagne {campagne.annee} est fermée : on ne saisit plus de nouveaux dossiers (le DG peut la rouvrir).</Alerte>
          )}

          {(profil.role === "CHEF_SERVICE" || dg) && campagne.ouverte && (
            <Carte titre="Importer une liste Excel des dossiers déposés">
              <p className="mb-3 text-[13px] text-zinc-600">
                Une liste avec au moins les colonnes « Noms et prénoms » et « Diplôme » (comme la compilation générale). Chaque ligne devient un dossier « à
                contrôler ». Les personnes déjà dans la campagne (même nom et même date de naissance) sont ignorées.
              </p>
              <ZoneFichier accept=".xlsx" envoi={envoiImport} envoyer={(f) => importer(f, true)} libelleBouton="Lire le fichier" aide="Fichier Excel (.xlsx)" />
            </Carte>
          )}

          <Carte titre="Dossiers" actions={<Saisie className="w-64" placeholder="Rechercher un nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <Segments
                valeur={etat}
                changer={(x) => {
                  setEtat(x);
                  setCoches(new Set());
                }}
                options={[
                  { valeur: "A_CONTROLER" as Etat, libelle: `1. À contrôler (${campagne.aControler})` },
                  { valeur: "CONTROLE" as Etat, libelle: `2. À décider par la DGRHAS (${campagne.aDecider})` },
                  { valeur: "RETENU" as Etat, libelle: `3. Retenus (${campagne.retenus})` },
                  { valeur: "NON_RETENU" as Etat, libelle: `Non retenus (${campagne.nonRetenus})` },
                ]}
              />
              <span className="text-[12px] text-zinc-500">{coches.size ? `${coches.size} coché(s)` : ""}</span>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px]">
              <span className="text-zinc-600">
                {
                  {
                    A_CONTROLER: "Comparez chaque dossier au dossier papier : conforme, il passe à la DGRHAS ; sinon, renvoyez-le avec ce qu’il faut corriger.",
                    CONTROLE: "La DGRHAS retient ou non chaque dossier — un par un, les dossiers cochés, ou tous — dans la limite du quota.",
                    RETENU: "Les volontaires retenus : ils entrent dans la note de service (Notes d’enrôlement › « Préparer les notes »).",
                    NON_RETENU: "Dossiers non retenus par la DGRHAS (la décision peut être annulée).",
                  }[etat]
                }
              </span>
              <span className="flex flex-wrap gap-2">
                {etat === "A_CONTROLER" && controleur && (
                  <>
                    <Bouton disabled={!choisis.length} onClick={() => agir(() => api.post("/enrolement/controler", { ids: choisis, conforme: true }), `${choisis.length} dossier(s) contrôlé(s) : ils passent à la DGRHAS.`)}>
                      <CheckCircle2 /> Conformes ({choisis.length})
                    </Bouton>
                    <Bouton variante="principal" disabled={!lignes.length} onClick={() => agir(() => api.post("/enrolement/controler", { ids: lignes.map((l) => l.id), conforme: true }), `${lignes.length} dossier(s) contrôlé(s).`)}>
                      Tout déclarer conforme ({lignes.length})
                    </Bouton>
                  </>
                )}
                {etat === "CONTROLE" && dg && (
                  <>
                    <Bouton variante="danger" disabled={!choisis.length} onClick={() => { setTexte(""); setNonRetenu(choisis); }}>
                      <XCircle /> Ne pas retenir ({choisis.length})
                    </Bouton>
                    <Bouton disabled={!choisis.length} onClick={() => agir(() => api.post("/enrolement/decider", { ids: choisis, decision: "RETENU" }), `${choisis.length} volontaire(s) retenu(s).`)}>
                      <Stamp /> Retenir les cochés ({choisis.length})
                    </Bouton>
                    <Bouton variante="principal" disabled={!lignes.length} onClick={() => agir(() => api.post("/enrolement/decider", { ids: lignes.map((l) => l.id), decision: "RETENU" }), `${lignes.length} volontaire(s) retenu(s).`)}>
                      Tout retenir ({lignes.length})
                    </Bouton>
                  </>
                )}
                {etat === "RETENU" && (
                  <Bouton onClick={() => api.telecharger(`/enrolement/dossiers/excel${qs({ campagne: campagne.id, etat: "RETENU" })}`, `Enrolement ${campagne.annee} - retenus.xlsx`)}>Excel des retenus</Bouton>
                )}
              </span>
            </div>
            {dossiers.erreur && <Alerte>{dossiers.erreur}</Alerte>}
            {!dossiers.donnees ? (
              <Chargement />
            ) : !lignes.length ? (
              <Vide>Aucun dossier à cette étape.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th className="w-10">
                      <input type="checkbox" className="size-4 accent-marque-600" aria-label="Tout cocher" checked={tousCoches} onChange={() => setCoches(tousCoches ? new Set() : new Set(lignes.map((l) => l.id)))} />
                    </th>
                    <th>Nom et prénoms</th>
                    <th>Diplôme</th>
                    <th>Départements souhaités → retenu</th>
                    <th>Origine</th>
                    <th className="w-44" />
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((e) => (
                    <tr key={e.id} className={coches.has(e.id) ? "bg-marque-50/50" : ""}>
                      <td>
                        <input type="checkbox" className="size-4 accent-marque-600" checked={coches.has(e.id)} onChange={() => basculer(e.id)} aria-label={`Cocher ${e.nomComplet}`} />
                      </td>
                      <td>
                        <button type="button" title="Voir tout le dossier" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => setFiche(e)}>
                          {e.nomComplet}
                        </button>
                        <div className="text-[11px] text-zinc-400">
                          {e.dateNaissance ? e.dateNaissance.split("-").reverse().join("/") : "date ?"} {e.lieuNaissance ? `· ${e.lieuNaissance}` : ""}
                        </div>
                        {e.remarqueControle && <div className="text-[11px] font-medium text-rouge-600">À corriger : {e.remarqueControle}</div>}
                        {e.motifDecision && <div className="text-[11px] text-zinc-500">Motif : {e.motifDecision}</div>}
                      </td>
                      <td className="text-[12px]">
                        {e.diplomeLibelle}
                        <div className="text-zinc-400">{[e.promotion, e.specialite].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="text-[12px]">
                        {e.departementsSouhaitesNoms.join(", ") || "—"}
                        <div className={e.departementRetenu ? "font-medium text-marque-700" : "text-zinc-400"}>→ {e.departementRetenu ?? "pas encore choisi"}</div>
                      </td>
                      <td className="text-[12px]">
                        {e.membre ? `Membre : ${e.membre}` : (e.origineBrute ?? "—")}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          {etat === "A_CONTROLER" && controleur && (
                            <>
                              <Bouton className="px-3! py-1.5!" variante="principal" onClick={() => agir(() => api.post("/enrolement/controler", { ids: [e.id], conforme: true }), `Dossier de ${e.nomComplet} contrôlé.`)}>
                                Conforme
                              </Bouton>
                              <BoutonIcone libelle="Renvoyer pour correction" onClick={() => { setTexte(""); setRenvoi([e.id]); }}>
                                <Undo2 />
                              </BoutonIcone>
                            </>
                          )}
                          {etat === "CONTROLE" && dg && (
                            <>
                              <Bouton className="px-3! py-1.5!" variante="principal" onClick={() => agir(() => api.post("/enrolement/decider", { ids: [e.id], decision: "RETENU" }), `${e.nomComplet} retenu(e).`)}>
                                Retenir
                              </Bouton>
                              <BoutonIcone libelle="Ne pas retenir" ton="rouge" onClick={() => { setTexte(""); setNonRetenu([e.id]); }}>
                                <XCircle />
                              </BoutonIcone>
                            </>
                          )}
                          {(etat === "RETENU" || etat === "NON_RETENU") && dg && !e.noteId && (
                            <BoutonIcone libelle="Annuler la décision (retour « à décider »)" onClick={() => agir(() => api.post(`/enrolement/dossiers/${e.id}/annuler-decision`), `Décision annulée pour ${e.nomComplet}.`)}>
                              <Undo2 />
                            </BoutonIcone>
                          )}
                          {!e.noteId && (
                            <BoutonIcone libelle="Corriger le dossier" onClick={() => setCorrection(e)}>
                              <PencilLine />
                            </BoutonIcone>
                          )}
                          {etat !== "RETENU" && (
                            <BoutonIcone libelle="Supprimer le dossier" ton="rouge" onClick={() => agir(() => api.delete(`/enrolement/dossiers/${e.id}`), `Dossier de ${e.nomComplet} supprimé.`)}>
                              <Trash2 />
                            </BoutonIcone>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Carte>
        </>
      )}

      {fiche && <FicheEnrole e={fiche} fermer={() => setFiche(null)} />}
      {correction && campagne && (
        <Modale titre={`Corriger le dossier – ${correction.nomComplet}`} ouverte large fermer={() => setCorrection(null)}>
          <FormulaireEnrole
            campagneId={campagne.id}
            dossier={correction}
            annuler={() => setCorrection(null)}
            apres={(t) => {
              setCorrection(null);
              setMessage({ ton: "vert", texte: t });
              recharger();
            }}
          />
        </Modale>
      )}
      <Modale titre="Renvoyer pour correction" ouverte={!!renvoi} fermer={() => setRenvoi(null)}>
        <Champ libelle="Ce qu’il faut corriger *">
          <Zone autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. la date de naissance ne correspond pas à l’acte" />
        </Champ>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setRenvoi(null)}>Annuler</Bouton>
          <Bouton variante="danger" disabled={!texte.trim()} onClick={() => { const ids = renvoi!; setRenvoi(null); void agir(() => api.post("/enrolement/controler", { ids, conforme: false, remarque: texte }), "Dossier renvoyé pour correction."); }}>
            Renvoyer pour correction
          </Bouton>
        </div>
      </Modale>
      <Modale titre={`Ne pas retenir ${nonRetenu?.length ?? 0} dossier(s) ?`} ouverte={!!nonRetenu} fermer={() => setNonRetenu(null)}>
        <Champ libelle="Motif (facultatif)">
          <Zone autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. déjà volontaire (bourse), quota atteint, dossier incomplet" />
        </Champ>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setNonRetenu(null)}>Annuler</Bouton>
          <Bouton variante="danger" onClick={() => { const ids = nonRetenu!; setNonRetenu(null); void agir(() => api.post("/enrolement/decider", { ids, decision: "NON_RETENU", motif: texte }), `${ids.length} dossier(s) non retenu(s).`); }}>
            Ne pas retenir
          </Bouton>
        </div>
      </Modale>
      <Modale titre="Importer ces dossiers ?" ouverte={!!apercu} fermer={() => setApercu(null)}>
        {apercu && (
          <div className="space-y-2 text-[13px]">
            <p>
              Feuilles lues : {apercu.rapport.feuilles.join(", ")} — <strong>{apercu.rapport.lues}</strong> dossier(s).
            </p>
            <ul className="list-disc pl-5">
              <li>
                <strong>{apercu.rapport.ajoutes}</strong> seront ajoutés « à contrôler » dans la campagne {campagne?.annee}.
              </li>
              {apercu.rapport.dejaLa > 0 && <li>{apercu.rapport.dejaLa} déjà dans la campagne : ignorés.</li>}
              {apercu.rapport.sansDiplome > 0 && <li className="text-or-700">{apercu.rapport.sansDiplome} sans diplôme lisible : à corriger au contrôle.</li>}
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setApercu(null)}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!apercu?.rapport.ajoutes || envoiImport} onClick={() => apercu && importer(apercu.fichier, false)}>
            Importer {apercu?.rapport.ajoutes ?? 0} dossier(s)
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
