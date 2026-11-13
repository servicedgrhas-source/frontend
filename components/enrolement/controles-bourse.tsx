"use client";

import { CheckCircle2, Download, LogOut, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { categoriesDe, fcfa, nf, type ConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Chargement, ChoixMois, Liste, Saisie, Tableau } from "@/components/ui";
import { api } from "@/lib/api";

/**
 * Décisions sur les contrôles d'un état de paiement (DG, 13/11/2026 : « des boutons adéquats, une
 * panoplie de décisions réalistes, et toujours la possibilité de cocher pour un travail de masse »).
 * Une décision vise une fiche (ou deux pour les doublons) ; elle part au serveur, puis l'état est
 * recalculé.
 */
export interface Decision {
  action: "SORTIR" | "VERIFIER" | "DEUX_PERSONNES" | "GARDER" | "COMPLETER";
  id: string;
  autreId?: string;
  controle?: string;
  motif?: string;
  date?: string;
  note?: string;
  departementId?: number;
  categorie?: string;
  premierMois?: string;
}
export interface ResultatDecisions {
  faites: number;
  nbErreurs: number;
  erreurs: string[];
}
export const envoyerDecisions = (decisions: Decision[]) => api.post<ResultatDecisions>("/enrolement/volontaires/decisions-controles", { decisions });

interface Anomalie {
  code: string;
  gravite: "BLOQUANT" | "SIGNALE";
  volontaireId: string;
  nomComplet: string;
  message: string;
  autreId?: string;
}

/** Ce que l'on peut décider, contrôle par contrôle (en plus de « sortir avec un motif » et « vérifié »). */
const AIDE: Record<string, string> = {
  RECRUTE_FP: "Vérifiez le matricule : s’il est bien recruté, sortez-le (« Recruté à la Fonction Publique ») ; sinon, ce n’est pas la même personne.",
  TEXTE_FP: "La bourse continue jusqu’au premier salaire. Premier salaire reçu : sortez-le ; sinon, laissez-le, ou notez « vu » pour ne plus le voir.",
  EN_RECRUTEMENT: "Présent dans la base des recrutés : vérifiez, puis sortez-le s’il est recruté, ou notez « vérifié ».",
  AGE: "Corrigez la date de naissance dans la fiche (« Régler »), ou notez « âge vérifié » si les pièces le confirment.",
  TELEPHONE: "Un même numéro pour plusieurs personnes : numéro de l’école, d’un parent… Notez « vérifié », ou corrigez le numéro dans la fiche.",
  CATEGORIE: "Choisissez la catégorie (le cycle) des cochés : elle fixe le montant.",
  DEPARTEMENT: "Choisissez le département des cochés.",
  DEBUT: "Choisissez le premier mois payé des cochés.",
  MONTANT: "Le montant de cette catégorie n’est pas fixé : réglez-le dans Enrôlement › Configuration, puis recalculez.",
  RAPPEL: "Plusieurs mois payés d’un coup : vérifiez qu’ils sont dus, puis notez « vérifié ».",
  DUREE: "Durée du volontariat dépassée : sortez-le (fin de volontariat), ou notez « vérifié ».",
};
/** Le motif de sortie proposé d'abord, selon le contrôle. */
const MOTIF_PROPOSE: Record<string, string> = {
  RECRUTE_FP: "RECRUTE_FP",
  TEXTE_FP: "RECRUTE_FP",
  EN_RECRUTEMENT: "RECRUTE_FP",
  DUREE: "FIN_VOLONTARIAT",
};

/**
 * La barre des décisions en masse pour un contrôle choisi : cocher tout, puis sortir, noter
 * « vérifié », ou compléter (catégorie, département, premier mois).
 */
export function BarreDecisions({
  code,
  libelle,
  anomalies,
  coches,
  setCoches,
  config,
  population,
  mois,
  apres,
  demander,
}: {
  code: string;
  libelle: string;
  anomalies: Anomalie[];
  coches: Set<string>;
  setCoches: (s: Set<string>) => void;
  config: ConfigEnrolement | undefined;
  population: string;
  mois: string;
  apres: (texte: string, erreur?: boolean) => Promise<void>;
  demander: (texte: string, bouton: string) => Promise<boolean>;
}) {
  const { refs } = useSession();
  const motifs = (config?.motifsSortie ?? []).filter((m) => m.actif);
  const [motif, setMotif] = useState(MOTIF_PROPOSE[code] ?? "");
  const [date, setDate] = useState(`${mois}-01`);
  const [note, setNote] = useState("");
  const [departementId, setDepartementId] = useState("");
  const [categorie, setCategorie] = useState("");
  const [premierMois, setPremierMois] = useState(mois);
  const [envoi, setEnvoi] = useState(false);
  const ids = [...new Set(anomalies.map((a) => a.volontaireId))];
  const cochees = ids.filter((x) => coches.has(x));
  const n = cochees.length;
  const nomMotif = motifs.find((m) => m.code === motif)?.libelle ?? motif;
  const parId = new Map(anomalies.map((a) => [a.volontaireId, a]));

  async function lancer(decisions: Decision[], texte: string, bouton: string) {
    if (!(await demander(texte, bouton))) return;
    setEnvoi(true);
    try {
      const r = await envoyerDecisions(decisions);
      setCoches(new Set());
      await apres(
        `${nf.format(r.faites)} décision(s) enregistrée(s) (${libelle}).${r.nbErreurs ? ` ${r.nbErreurs} refusée(s) : ${r.erreurs.slice(0, 3).join(" ; ")}` : ""} La bourse est recalculée.`,
        r.nbErreurs > 0 && !r.faites,
      );
    } catch (x) {
      await apres((x as Error).message, true);
    } finally {
      setEnvoi(false);
    }
  }
  const sortir = () =>
    lancer(
      cochees.map((id) => ({ action: "SORTIR", id, motif, date, note: note || parId.get(id)?.message.replace(/ S’il est recruté.*$/, "").slice(0, 300) })),
      `${n} personne(s) sortiront du registre : motif « ${nomMotif} », date ${date.split("-").reverse().join("/")}. Elles ne seront plus payées à partir de ce mois (selon la règle du motif). On peut réintégrer en cas d’erreur.`,
      "Sortir du registre",
    );
  const verifier = () =>
    lancer(
      cochees.map((id) => ({ action: "VERIFIER", id, controle: code, note })),
      `${n} contrôle(s) « ${libelle} » seront notés vérifiés (« ${note} ») : ils ne reviendront plus pour ces personnes.`,
      "Noter vérifié",
    );
  const completer = (champs: Partial<Decision>, quoi: string) =>
    lancer(cochees.map((id) => ({ action: "COMPLETER", id, ...champs })), `${n} fiche(s) recevront ${quoi}.`, "Compléter");

  const peutSortir = !["CATEGORIE", "DEPARTEMENT", "DEBUT", "MONTANT"].includes(code);
  const peutVerifier = !["CATEGORIE", "DEPARTEMENT", "DEBUT", "MONTANT"].includes(code);
  return (
    <div className="mb-4 space-y-3 rounded-2xl bg-zinc-50 p-3 text-[13px] ring-1 ring-zinc-200">
      {AIDE[code] && <p className="text-zinc-600">{AIDE[code]}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            className="size-4 accent-marque-600"
            checked={ids.length > 0 && n === ids.length}
            onChange={(x) => setCoches(x.target.checked ? new Set(ids) : new Set())}
          />
          Tout cocher ({nf.format(ids.length)})
        </label>
        <span className="text-zinc-500">{n ? `${nf.format(n)} coché(s)` : "Cochez des lignes (ou tout), puis décidez."}</span>
      </div>
      {peutSortir && (
        <div className="flex flex-wrap items-end gap-2">
          <Liste className="w-64" value={motif} onChange={(x) => setMotif(x.target.value)} vide="Motif de sortie…" options={motifs.map((m) => ({ valeur: m.code, libelle: m.libelle }))} />
          <Saisie type="date" className="w-40" value={date} onChange={(x) => setDate(x.target.value)} title="Date de sortie (le 1er du mois : pas payé ce mois-ci)" />
          <Bouton variante="danger" disabled={!n || !motif || !date || envoi} onClick={sortir}>
            <LogOut /> Sortir du registre ({nf.format(n)})
          </Bouton>
        </div>
      )}
      {peutVerifier && (
        <div className="flex flex-wrap items-end gap-2">
          <Saisie className="w-80" value={note} onChange={(x) => setNote(x.target.value)} placeholder={code === "AGE" ? "Ex. âge vérifié sur l’acte de naissance" : code === "TELEPHONE" ? "Ex. numéro de l’école" : "Ce qui a été vérifié (5 caractères au moins)"} />
          <Bouton disabled={!n || note.trim().length < 5 || envoi} onClick={verifier}>
            <CheckCircle2 /> {code === "RECRUTE_FP" || code === "EN_RECRUTEMENT" ? "Pas la même personne / vérifié" : code === "TEXTE_FP" ? "Vu : ne plus signaler" : "Noter vérifié"} ({nf.format(n)})
          </Bouton>
        </div>
      )}
      {code === "DEPARTEMENT" && (
        <div className="flex flex-wrap items-end gap-2">
          <Liste className="w-56" value={departementId} onChange={(x) => setDepartementId(x.target.value)} vide="Département…" options={refs.departements.map((d) => ({ valeur: d.id, libelle: d.nom }))} />
          <Bouton variante="principal" disabled={!n || !departementId || envoi} onClick={() => completer({ departementId: Number(departementId) }, `le département « ${refs.departements.find((d) => d.id === Number(departementId))?.nom} »`)}>
            Mettre ce département ({nf.format(n)})
          </Bouton>
        </div>
      )}
      {code === "CATEGORIE" && (
        <div className="flex flex-wrap items-end gap-2">
          <Liste className="w-64" value={categorie} onChange={(x) => setCategorie(x.target.value)} vide="Catégorie (cycle)…" options={categoriesDe(config, population).filter((x) => x.actif).map((x) => ({ valeur: x.code, libelle: `${x.libelle} (${fcfa(x.bourse)})` }))} />
          <Bouton variante="principal" disabled={!n || !categorie || envoi} onClick={() => completer({ categorie }, `la catégorie « ${categoriesDe(config, population).find((x) => x.code === categorie)?.libelle} »`)}>
            Mettre cette catégorie ({nf.format(n)})
          </Bouton>
        </div>
      )}
      {code === "DEBUT" && (
        <div className="flex flex-wrap items-end gap-2">
          <ChoixMois value={premierMois} onChange={setPremierMois} />
          <Bouton variante="principal" disabled={!n || !premierMois || envoi} onClick={() => completer({ premierMois }, `le premier mois payé ${premierMois}`)}>
            Mettre ce premier mois ({nf.format(n)})
          </Bouton>
        </div>
      )}
    </div>
  );
}

/** Une personne d'une paire « payés deux fois ». */
export interface PersonneDeuxFois {
  id: string;
  nomComplet: string;
  liste: string;
  etablissement: string | null;
  departement: string | null;
  categorie: string | null;
  paye: number | null;
  /** Où et combien elle est payée ce mois, en clair (cette liste, l'autre liste, ou pas du tout). */
  paiement?: string;
  population: string;
  statut: string | null;
  entree: string | null;
  naissance: string | null;
  telephone: string | null;
}
export interface DeuxFois {
  personnes: number;
  paires: { code: string; controle: string; a: PersonneDeuxFois; b: PersonneDeuxFois | null }[];
}
const jour = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "?");

/**
 * Payés deux fois (DG, 28/10/2026 puis 13/11/2026) : une ligne par cas, les deux fiches côte à côte,
 * et pour chacun (ou pour tous les cochés) : garder l'une et sortir l'autre (ce que l'autre savait
 * passe à la fiche gardée), ou dire que ce sont deux personnes.
 */
export function DecisionsDeuxFois({
  r,
  erreur,
  population,
  mois,
  gerer,
  ouvrir,
  exporter,
  apres,
  demander,
}: {
  r: DeuxFois | null;
  erreur: string | null;
  population: string;
  mois: string;
  gerer: boolean;
  ouvrir: (p: PersonneDeuxFois) => void;
  exporter: () => void;
  apres: (texte: string, erreur?: boolean) => Promise<void>;
  demander: (texte: string, bouton: string) => Promise<boolean>;
}) {
  const [coches, setCoches] = useState<Set<number>>(new Set());
  const [date, setDate] = useState(`${mois}-01`);
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  if (erreur) return <Alerte>{erreur}</Alerte>;
  if (!r) return <Chargement />;
  const paires = r.paires.filter((x) => x.b);
  const choisies = paires.filter((_, i) => coches.has(i));
  const ici = (p: PersonneDeuxFois) => p.population === population;
  /** Ce qu'une fiche sait : date de naissance, téléphone, établissement, département, cycle ; payée ce mois. */
  const complete = (p: PersonneDeuxFois) => [p.naissance, p.telephone, p.etablissement, p.departement, p.categorie].filter(Boolean).length + (p.paye !== null ? 2 : 0) + (p.statut === "EN_POSTE" ? 3 : 0);
  /** La fiche à garder selon une règle : la plus complète (à égalité, la plus ancienne), celle de cette liste, celle de l'autre. */
  const regle = {
    COMPLETE: (a: PersonneDeuxFois, b: PersonneDeuxFois) => {
      const d = complete(a) - complete(b);
      return d > 0 || (d === 0 && (a.entree ?? "9") <= (b.entree ?? "9")) ? [a, b] : [b, a];
    },
    ICI: (a: PersonneDeuxFois, b: PersonneDeuxFois) => (ici(a) ? [a, b] : [b, a]),
    AUTRE: (a: PersonneDeuxFois, b: PersonneDeuxFois) => (ici(a) ? [b, a] : [a, b]),
  } as const;

  async function lancer(decisions: Decision[], texte: string, bouton: string) {
    if (!decisions.length || !(await demander(texte, bouton))) return;
    setEnvoi(true);
    try {
      const res = await envoyerDecisions(decisions);
      setCoches(new Set());
      await apres(`${nf.format(res.faites)} cas réglé(s).${res.nbErreurs ? ` ${res.nbErreurs} refusé(s) : ${res.erreurs.slice(0, 3).join(" ; ")}` : ""} La bourse est recalculée.`, res.nbErreurs > 0 && !res.faites);
    } catch (x) {
      await apres((x as Error).message, true);
    } finally {
      setEnvoi(false);
    }
  }
  const garder = (liste: typeof paires, choix: keyof typeof regle) =>
    liste.map((x) => {
      const [g, s] = regle[choix](x.a, x.b!);
      return { action: "GARDER" as const, id: g.id, autreId: s.id, motif: "DOUBLON", date, note };
    });
  const deuxPersonnes = (liste: typeof paires) =>
    liste.map((x) => ({ action: "DEUX_PERSONNES" as const, id: x.a.id, autreId: x.b!.id, controle: x.code, note: note || "Deux personnes différentes (vérifié)" }));
  const dateFr = date.split("-").reverse().join("/");
  const effet = `La fiche sortie (motif « Doublon », le ${dateFr}) n’est plus payée ; ce qu’elle savait et que la fiche gardée ignorait (téléphone, date de naissance…) passe à la fiche gardée.`;
  const autreListes = paires.some((x) => x.code === "AUTRE_LISTE");

  const cote = (p: PersonneDeuxFois | null) =>
    p ? (
      <div className="text-[12px]">
        <button type="button" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => ouvrir(p)}>
          {p.nomComplet}
        </button>
        <div className="text-[11px] text-zinc-500">{[p.liste, p.etablissement, p.departement, p.categorie].filter(Boolean).join(" · ")}</div>
        <div className="text-[11px] text-zinc-500">
          né(e) le {jour(p.naissance)}{p.telephone ? ` · tél. …${p.telephone.replace(/\D/g, "").slice(-4)}` : ""} · dans le registre depuis le {jour(p.entree)}
          {p.statut === "SORTI" ? " · sorti(e)" : ""}
        </div>
        <div className={`text-[11px] ${/^payé/.test(p.paiement ?? "") ? "font-semibold text-rouge-700" : p.paye === null ? "text-zinc-500" : "font-medium"}`}>
          {p.paiement ?? (p.paye === null ? "pas payé dans cet état" : `payé ${fcfa(p.paye)}`)}
        </div>
      </div>
    ) : (
      <span className="text-zinc-400">—</span>
    );
  return (
    <>
      <div className="mb-3 space-y-3 rounded-2xl bg-rouge-50 p-3 text-[13px] ring-1 ring-rouge-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-zinc-700">
            <strong>{nf.format(r.paires.length)} cas</strong>, {nf.format(r.personnes)} personne(s). Pour chaque cas : <strong>garder</strong> la bonne fiche et sortir l’autre
            (motif « Doublon »), ou dire que ce sont <strong>deux personnes</strong>. Un par un avec les boutons de la ligne, ou cochez et décidez pour tous.
          </span>
          <Bouton onClick={exporter}>
            <Download /> Liste Excel
          </Bouton>
        </div>
        {gerer && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" className="size-4 accent-marque-600" checked={paires.length > 0 && coches.size === paires.length} onChange={(x) => setCoches(x.target.checked ? new Set(paires.map((_, i) => i)) : new Set())} />
                Tout cocher ({nf.format(paires.length)})
              </label>
              <Saisie type="date" className="w-40" value={date} onChange={(x) => setDate(x.target.value)} title="Date de sortie de la fiche en double (le 1er du mois : pas payée ce mois-ci)" />
              <Saisie className="w-72" value={note} onChange={(x) => setNote(x.target.value)} placeholder="Observation (facultatif) : pièces vues…" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Bouton disabled={!choisies.length || envoi} onClick={() => lancer(garder(choisies, "COMPLETE"), `${choisies.length} cas : la fiche la plus complète (date de naissance, téléphone, établissement…, payée ce mois) est gardée, l’autre sort. ${effet}`, "Garder et sortir")}>
                <UserCheck /> Garder la fiche la plus complète, sortir l’autre ({choisies.length})
              </Bouton>
              {autreListes && (
                <>
                  <Bouton disabled={!choisies.length || envoi} onClick={() => lancer(garder(choisies, "ICI"), `${choisies.length} cas : la fiche de cette liste est gardée, celle de l’autre liste sort. ${effet}`, "Garder et sortir")}>
                    <UserCheck /> Garder sur cette liste, sortir de l’autre ({choisies.length})
                  </Bouton>
                  <Bouton disabled={!choisies.length || envoi} onClick={() => lancer(garder(choisies, "AUTRE"), `${choisies.length} cas : la fiche de l’autre liste est gardée, celle de cette liste sort. ${effet}`, "Garder et sortir")}>
                    <UserCheck /> Garder sur l’autre liste, sortir de celle-ci ({choisies.length})
                  </Bouton>
                </>
              )}
              <Bouton disabled={!choisies.length || envoi} onClick={() => lancer(deuxPersonnes(choisies), `${choisies.length} cas : ce sont deux personnes différentes. Les deux fiches restent payées, et le contrôle ne revient plus pour elles.`, "Deux personnes")}>
                <Users /> Deux personnes différentes ({choisies.length})
              </Bouton>
            </div>
          </>
        )}
      </div>
      <Tableau>
        <thead>
          <tr>
            {gerer && <th className="w-8" aria-label="Cocher" />}
            <th>N°</th>
            <th>Contrôle</th>
            <th>Personne</th>
            <th>Même personne probable</th>
            {gerer && <th className="w-56">Décision</th>}
          </tr>
        </thead>
        <tbody>
          {paires.map((x, i) => (
            <tr key={`${x.code}-${x.a.id}-${x.b?.id ?? ""}`} className={coches.has(i) ? "bg-marque-50/50" : ""}>
              {gerer && (
                <td>
                  <input
                    type="checkbox"
                    className="size-4 accent-marque-600"
                    aria-label={`Cocher le cas ${i + 1}`}
                    checked={coches.has(i)}
                    onChange={() => {
                      const n = new Set(coches);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      setCoches(n);
                    }}
                  />
                </td>
              )}
              <td className="tabular-nums text-zinc-500">{i + 1}</td>
              <td>
                <Badge ton="rouge">{x.controle}</Badge>
              </td>
              <td>{cote(x.a)}</td>
              <td>{cote(x.b)}</td>
              {gerer && (
                <td>
                  <div className="flex flex-col gap-1">
                    <Bouton variante="discret" className="justify-start px-2! py-1! text-[12px]!" disabled={envoi} onClick={() => lancer([{ action: "GARDER", id: x.a.id, autreId: x.b!.id, motif: "DOUBLON", date, note }], `Garder « ${x.a.nomComplet} » (${x.a.liste}) et sortir « ${x.b!.nomComplet} » (${x.b!.liste}). ${effet}`, "Garder et sortir")}>
                      ← Garder celle-ci, sortir l’autre
                    </Bouton>
                    <Bouton variante="discret" className="justify-start px-2! py-1! text-[12px]!" disabled={envoi} onClick={() => lancer([{ action: "GARDER", id: x.b!.id, autreId: x.a.id, motif: "DOUBLON", date, note }], `Garder « ${x.b!.nomComplet} » (${x.b!.liste}) et sortir « ${x.a.nomComplet} » (${x.a.liste}). ${effet}`, "Garder et sortir")}>
                      Garder celle-là, sortir l’autre →
                    </Bouton>
                    <Bouton variante="discret" className="justify-start px-2! py-1! text-[12px]!" disabled={envoi} onClick={() => lancer(deuxPersonnes([x]), `« ${x.a.nomComplet} » et « ${x.b!.nomComplet} » sont deux personnes différentes : les deux restent payées, le contrôle ne revient plus.`, "Deux personnes")}>
                      Deux personnes différentes
                    </Bouton>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Tableau>
    </>
  );
}
