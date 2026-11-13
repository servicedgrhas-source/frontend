"use client";

import { ArrowRightLeft, CheckCircle2, PencilLine, Stamp, Trash2, Undo2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ChampOrigine } from "@/components/champ-origine";
import { Pagination } from "@/components/pagination";
import { ImportEnrolement } from "@/components/enrolement/import-enrolement";
import { ChangerNote, EcrireSpecialite, PastilleSpecialite, SpecialitesACompleter } from "@/components/enrolement/changer-note";
import { CelluleAge, type Enrole, FicheEnrole, SelecteurCampagne, useCampagne } from "@/components/enrolement/commun";
import { useConfigEnrolement } from "@/components/enrolement/volontaires";
import { BarreExport } from "@/components/export-liste";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Segments, Tableau, Vide, Zone } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { ATrancher } from "@/components/enrolement/a-trancher";
import { ProposerRecommandation } from "@/components/recommandation";
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
  /** Dossier d'enrôlement trouvé : on peut l'ouvrir à sa bonne étape. */
  dossier?: { id: string; campagneId: number; etat: Etat };
}

const ETAPES: Record<Etat, string> = {
  A_CONTROLER: "1. À contrôler",
  CONTROLE: "2. À décider par la DGRHAS",
  RETENU: "3. Retenus",
  NON_RETENU: "Non retenus",
};

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
function FormulaireEnrole({ campagneId, dossier, apres, annuler, voir }: { campagneId: number; dossier?: Enrole; apres: (texte: string) => void; annuler?: () => void; voir?: (d: Doublon) => void }) {
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
          <p className="mt-0.5 text-[12px] font-normal opacity-80">
            {doublons.some((d) => d.probable)
              ? "Mêmes noms (ou noms très proches) et même date de naissance : c’est sans doute la même personne."
              : "Un nom en commun, ou la même date de naissance : ce n’est peut-être pas la même personne. Vérifiez avant d’enregistrer."}
          </p>
          <ul className="mt-1 space-y-1 text-[12px]">
            {doublons.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  {d.nom} · {d.naissance ? d.naissance.split("-").reverse().join("/") : "date ?"} — {d.source} ({d.detail})
                </span>
                {voir && d.dossier && d.dossier.campagneId === campagneId && (
                  <button type="button" className="rounded-full bg-white/70 px-2 py-0.5 font-medium underline-offset-2 ring-1 ring-current/30 hover:bg-white" onClick={() => voir(d)}>
                    Voir ce dossier ({ETAPES[d.dossier.etat]})
                  </button>
                )}
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

/** Rapport de l'import (essai puis réel) : ce qui sera ajouté, et les vérifications faites (06/11/2026). */
/** Saisie des enrôlements : formulaire, import, puis contrôle et décision de la DGRHAS. */
export default function SaisieEnrolement() {
  const { profil } = useSession();
  const controleur = peut.controler(profil.role);
  const dg = peut.valider(profil.role);
  const { campagnes, liste, campagne, choisir } = useCampagne();
  const conf = useConfigEnrolement().donnees?.configuration;
  const limites = conf ? { min: conf.ageMinimum, max: conf.ageMaximum } : null;
  const [etat, setEtat] = useState<Etat>("A_CONTROLER");
  const [recherche, setRecherche] = useState("");
  const dossiers = useApi<Enrole[]>(campagne ? `/enrolement/dossiers${qs({ campagne: campagne.id, etat, recherche })}` : null);
  // La recherche ne regarde que l'étape ouverte : on dit aussi combien sont trouvés dans les autres étapes
  const rechercheAilleurs = recherche.trim().length >= 2;
  const ailleurs = useApi<Enrole[]>(campagne && rechercheAilleurs ? `/enrolement/dossiers${qs({ campagne: campagne.id, recherche })}` : null);
  const autresEtapes = (Object.keys(ETAPES) as Etat[])
    .filter((x) => x !== etat)
    .map((x) => ({ etat: x, n: (ailleurs.donnees ?? []).filter((d) => d.etat === x).length }))
    .filter((x) => x.n > 0);
  /** Ouvrir un dossier signalé par la saisie : sa bonne étape, son nom dans la recherche. */
  const voirDossier = (d: Doublon) => {
    if (!d.dossier) return;
    setEtat(d.dossier.etat);
    setRecherche(d.nom);
    setTimeout(() => document.getElementById("liste-dossiers")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const [coches, setCoches] = useState<Set<string>>(new Set());
  // 100 dossiers par page : avec 5 000 lignes d'un coup, le navigateur ne dessinait plus le bas de la page
  // La page revient à 1 quand l'étape, la recherche ou la campagne change
  const cleListe = `${etat}|${recherche}|${campagne?.id ?? ""}`;
  const [pageEtat, setPageEtat] = useState({ cle: "", n: 1 });
  const page = pageEtat.cle === cleListe ? pageEtat.n : 1;
  const setPage = (n: number) => setPageEtat({ cle: cleListe, n });
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  const [fiche, setFiche] = useState<Enrole | null>(null);
  const [correction, setCorrection] = useState<Enrole | null>(null);
  const [renvoi, setRenvoi] = useState<string[] | null>(null);
  // Recommandation (cabinet, chef de service…) : comme aux affectations, avis du directeur puis DG
  const [recommander, setRecommander] = useState<Enrole | null>(null);
  const [nonRetenu, setNonRetenu] = useState<string[] | null>(null);
  // Envoyer dans une autre note (lycée, préscolaire…) ou remettre à la règle (06/11/2026)
  const [changerNote, setChangerNote] = useState<Enrole[] | null>(null);
  const [specialite, setSpecialite] = useState<Enrole[] | null>(null);
  const [texte, setTexte] = useState("");
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
  // Préscolaire ou primaire sans spécialité : la règle la donne d'un clic (06/11/2026)
  const appliquerRegle = (e: Enrole) =>
    agir(() => api.post("/enrolement/dossiers/specialite", { ids: [e.id], specialite: null }), `Spécialité de ${e.nomComplet} : « ${e.specialiteEtat?.etat === "regle" ? e.specialiteEtat.valeur : ""} ».`);
  const basculer = (id: string) =>
    setCoches((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const PAR_PAGE = 100;
  const pages = Math.max(1, Math.ceil(lignes.length / PAR_PAGE));
  const pageVue = Math.min(page, pages);
  const visibles = lignes.slice((pageVue - 1) * PAR_PAGE, pageVue * PAR_PAGE);
  const tousCoches = visibles.length > 0 && visibles.every((l) => coches.has(l.id));
  const toutLeMondeCoche = lignes.length > 0 && lignes.every((l) => coches.has(l.id));
  const choisis = [...coches];

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
              <FormulaireEnrole campagneId={campagne.id} voir={voirDossier} apres={(t) => { setMessage({ ton: "vert", texte: t }); recharger(); }} />
            </Carte>
          ) : (
            <Alerte ton="jaune">La campagne {campagne.annee} est fermée : on ne saisit plus de nouveaux dossiers (le DG peut la rouvrir).</Alerte>
          )}

          {(profil.role === "CHEF_SERVICE" || dg) && campagne.ouverte && (
            <Carte titre="Importer une liste Excel des dossiers déposés">
              <p className="mb-3 text-[13px] text-zinc-600">
                Une liste avec au moins les colonnes « Noms et prénoms » et « Diplôme » (comme la compilation générale). Vous choisissez la feuille, le système compare chaque ligne à la campagne, au fichier lui-même, aux recrutés, à la base du personnel et aux volontaires ; vous décidez (mettre à jour, fusionner, ajouter, écarter) une ligne ou tout un groupe d’un clic, puis vous importez.
              </p>
              <ImportEnrolement campagne={campagne} apres={(t) => { setMessage({ ton: "vert", texte: t }); recharger(); }} />
            </Carte>
          )}

          {/* Doublons probables et déjà connus : à trancher par la DGRHAS (06/11/2026) */}
          <ATrancher campagneId={campagne.id} apres={(t, ton = "vert") => { setMessage({ ton, texte: t }); recharger(); }} />

          <div id="liste-dossiers" className="scroll-mt-4" />
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
            {rechercheAilleurs && autresEtapes.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2.5 text-[13px] text-sky-800 ring-1 ring-sky-200">
                <span>
                  La recherche ne regarde que l’étape ouverte. « {recherche.trim()} » est aussi trouvé dans :
                </span>
                {autresEtapes.map((x) => (
                  <button key={x.etat} type="button" className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-sky-200 hover:bg-sky-100" onClick={() => setEtat(x.etat)}>
                    {ETAPES[x.etat]} ({x.n})
                  </button>
                ))}
              </div>
            )}
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
                    <Bouton variante="danger" disabled={!choisis.length} onClick={() => { setTexte(""); setRenvoi(choisis); }}>
                      <XCircle /> Pas conformes ({choisis.length})
                    </Bouton>
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
                {etat !== "NON_RETENU" && (
                  <Bouton disabled={!choisis.length} onClick={() => setChangerNote(lignes.filter((l) => coches.has(l.id)))}>
                    <ArrowRightLeft /> Changer de note ({choisis.length})
                  </Bouton>
                )}
                {etat === "RETENU" && (
                  <BarreExport chemin="/enrolement/listes/retenus" impression="/impression/enrolement-retenus" nom={`Liste des retenus ${campagne.annee}`} filtres={{ campagne: campagne.id }} erreur={(m) => setMessage({ ton: "rouge", texte: m })} />
                )}
              </span>
            </div>
            {dossiers.erreur && <Alerte>{dossiers.erreur}</Alerte>}
            <SpecialitesACompleter dossiers={lignes} apres={(t, ton = "vert") => { setMessage({ ton, texte: t }); recharger(); }} />
            {!dossiers.donnees ? (
              <Chargement />
            ) : !lignes.length ? (
              <Vide>Aucun dossier à cette étape.</Vide>
            ) : (
              <>
              {tousCoches && lignes.length > visibles.length && (
                <div className="mb-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-marque-50 px-4 py-2.5 text-[13px] text-marque-800 ring-1 ring-marque-200">
                  {toutLeMondeCoche ? (
                    <>
                      Les <strong>{lignes.length.toLocaleString("fr-FR")}</strong> dossiers de cette étape sont cochés.
                      <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setCoches(new Set())}>Tout décocher</button>
                    </>
                  ) : (
                    <>
                      Les {visibles.length} dossiers de cette page sont cochés.
                      <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setCoches(new Set(lignes.map((l) => l.id)))}>
                        Cocher les {lignes.length.toLocaleString("fr-FR")} dossiers de cette étape
                      </button>
                    </>
                  )}
                </div>
              )}
              <Tableau>
                <thead>
                  <tr>
                    <th className="w-10">
                      <input type="checkbox" className="size-4 accent-marque-600" aria-label="Tout cocher" checked={tousCoches} onChange={() => setCoches((c) => { const n = new Set(c); for (const l of visibles) { if (tousCoches) n.delete(l.id); else n.add(l.id); } return n; })} />
                    </th>
                    <th>Nom et prénoms</th>
                    <th title="Âge au 31 décembre de l’année de la campagne ; en rouge : hors des limites d’âge">Âge</th>
                    <th>Diplôme</th>
                    <th>Départements souhaités → retenu</th>
                    <th>Origine</th>
                    <th className="w-44" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((e) => (
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
                        {e.recommandationEnAttente && <div className="mt-0.5 inline-flex rounded-full bg-or-100 px-2 py-0.5 text-[11px] font-medium text-or-700">Recommandation en attente</div>}
                      </td>
                      <td className="whitespace-nowrap text-[12px]">
                        <CelluleAge naissance={e.dateNaissance} annee={campagne.annee} limites={limites} />
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
                              <Bouton className="px-3! py-1.5!" variante="danger" title="Pas conforme au dossier papier : renvoyé avec ce qu’il faut corriger" onClick={() => { setTexte(""); setRenvoi([e.id]); }}>
                                Pas conforme
                              </Bouton>
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
                          {!e.noteId && etat !== "NON_RETENU" && (
                            <BoutonIcone
                              libelle={e.recommandationEnAttente ? "Recommandation en attente (directeur, puis DG)" : "Proposer une recommandation (retenir, département, établissement)"}
                              ton="vert"
                              disabled={e.recommandationEnAttente}
                              onClick={() => setRecommander(e)}
                            >
                              <Stamp />
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-zinc-500">
                <span>
                  {lignes.length.toLocaleString("fr-FR")} dossier(s) · lignes {((pageVue - 1) * PAR_PAGE + 1).toLocaleString("fr-FR")} à {Math.min(pageVue * PAR_PAGE, lignes.length).toLocaleString("fr-FR")}
                </span>
                <Pagination page={pageVue} pages={pages} aller={setPage} />
              </div>
              </>
            )}
          </Carte>
        </>
      )}

      {specialite && <EcrireSpecialite dossiers={specialite} fermer={() => setSpecialite(null)} apres={(t) => { setSpecialite(null); setMessage({ ton: "vert", texte: t }); recharger(); }} />}
      {changerNote && <ChangerNote dossiers={changerNote} fermer={() => setChangerNote(null)} apres={(t, ton = "vert") => { setChangerNote(null); setMessage({ ton, texte: t }); recharger(); }} />}
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
      {recommander && (
        <ProposerRecommandation
          url={`/enrolement/enroles/${recommander.id}/recommandations`}
          personne={recommander.nomComplet}
          enrole={recommander}
          avant={[recommander.departementRetenu ?? "pas encore de département", recommander.etablissement].filter(Boolean).join(" · ")}
          fermer={() => setRecommander(null)}
          apres={() => {
            setRecommander(null);
            setMessage({ ton: "vert", texte: "Recommandation proposée : avis du directeur, puis décision du DG (page Recommandations). Validée, elle fait retenir le volontaire." });
            recharger();
          }}
        />
      )}
    </div>
  );
}
