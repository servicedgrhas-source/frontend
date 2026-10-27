"use client";

import { CheckCircle2, Download, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { FicheVolontaire, dateFr, fcfa, nf, peutGerer, useConfigEnrolement } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Chiffre, EnTete, Liste, Modale, Saisie, Tableau, Vide, Zone, ZoneFichier, useConfirmation } from "@/components/ui";
import { api, qs, useApi } from "@/lib/api";
import { accesDonne } from "@/lib/espaces";
import { peut } from "@/lib/libelles";

interface Mer {
  id: number;
  libelle: string;
  noteReference: string | null;
  statut: "BROUILLON" | "VALIDE";
  source: "CALCUL" | "REPRISE";
  effectif: number;
  total: string;
  anomalies: { code: string; gravite: "BLOQUANT" | "SIGNALE"; volontaireId: string | null; nomComplet: string; message: string }[];
  preparePar: string | null;
  validePar: string | null;
}

interface LigneMer {
  id: number;
  volontaireId: string | null;
  nomComplet: string;
  categorie: string | null;
  specialite: string | null;
  departementId: number | null;
  etablissement: string | null;
  equipement: number;
  billet: number;
  bagages: number;
  total: number;
  observation: string | null;
}

interface NoteRegistre {
  noteReference: string;
  dateNote: string | null;
  enPoste: number;
  total: number;
  miseEnRoute: string | null;
}

interface L30 {
  n: number;
  exemples: string[];
}

/** Reprise d'une fiche de mise en route déjà payée (sert au contrôle des doubles paiements). */
function Reprise({ apres }: { apres: (id: number) => void }) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [feuilles, setFeuilles] = useState<{ nom: string; personnes: number; total: number }[] | null>(null);
  const [feuille, setFeuille] = useState("");
  const [libelle, setLibelle] = useState("");
  const [note, setNote] = useState("");
  const [rapport, setRapport] = useState<{ id: number | null; essai: boolean; feuille: string; lues: number; relies: number; total: number; nonTrouves: L30; dejaPayes: L30; ecartsTotal: L30 } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const bloc = (titre: string, l: L30, ton: "rouge" | "jaune" = "jaune") =>
    l.n > 0 && (
      <details className="rounded-2xl bg-zinc-50 px-4 py-2.5 text-[12px]">
        <summary className="cursor-pointer">
          <Badge ton={ton}>{nf.format(l.n)}</Badge> {titre}
        </summary>
        <ul className="mt-2 space-y-0.5 text-zinc-600">
          {l.exemples.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </details>
    );
  async function importer(essai: boolean) {
    if (!fichier) return;
    setErreur(null);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      const r = await api.post<NonNullable<typeof rapport>>(`/enrolement/mises-en-route/import${qs({ feuille, libelle, note, essai: essai ? 1 : 0 })}`, fd);
      setRapport(r);
      if (!essai && r.id) apres(r.id);
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  return (
    <Carte titre="Reprendre une fiche déjà payée">
      <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
        Enregistrez les fiches de mise en route payées avant l’application (notes n° 1006, 1038…). Chaque personne est reliée à sa fiche du registre : une personne payée dans deux fiches est signalée, et le trop-perçu apparaît dans Régularisations.
      </p>
      <ZoneFichier
        accept=".xlsx"
        envoi={envoi}
        libelleBouton="Lire le fichier"
        envoyer={async (f) => {
          setEnvoi(true);
          setErreur(null);
          setRapport(null);
          try {
            const fd = new FormData();
            fd.append("fichier", f);
            setFeuilles(await api.post("/enrolement/mises-en-route/analyse", fd));
            setFichier(f);
          } catch (x) {
            setErreur((x as Error).message);
          } finally {
            setEnvoi(false);
          }
        }}
      />
      {erreur && (
        <div className="mt-4">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {feuilles && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Champ libelle="Feuille">
              <Liste
                value={feuille}
                onChange={(e) => {
                  setFeuille(e.target.value);
                  setRapport(null);
                }}
                vide="— Choisir —"
                options={feuilles.map((f) => ({ valeur: f.nom, libelle: `${f.nom} — ${nf.format(f.personnes)} personnes · ${fcfa(f.total)}` }))}
              />
            </Champ>
            <Champ libelle="Nom de la fiche">
              <Saisie value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Mise en route — note n° 1006" />
            </Champ>
            <Champ libelle="Note de service (n°)">
              <Saisie value={note} onChange={(e) => setNote(e.target.value)} placeholder="1006" />
            </Champ>
          </div>
          <div className="flex gap-2">
            <Bouton disabled={!feuille || !libelle} onClick={() => importer(true)}>
              Faire un essai
            </Bouton>
            <Bouton variante="principal" disabled={!rapport?.essai || rapport.feuille !== feuille} onClick={() => importer(false)}>
              Enregistrer la fiche
            </Bouton>
          </div>
          {rapport && (
            <div className="space-y-2">
              <Alerte ton={rapport.essai ? "bleu" : "vert"}>
                {rapport.essai ? "Essai : rien n’est enregistré. " : "Fiche enregistrée comme payée. "}
                {nf.format(rapport.lues)} personnes, {fcfa(rapport.total)} ; {nf.format(rapport.relies)} reliées au registre.
              </Alerte>
              {bloc("déjà payées dans une autre fiche (double paiement)", rapport.dejaPayes, "rouge")}
              {bloc("pas retrouvées dans le registre (importez d’abord leur note de service)", rapport.nonTrouves)}
              {bloc("total de la ligne différent de la somme des colonnes", rapport.ecartsTotal)}
            </div>
          )}
        </div>
      )}
    </Carte>
  );
}

/** Mise en route : équipement et transport versés une fois, par note de service. */
export default function MiseEnRoutePage() {
  const { profil, refs } = useSession();
  const config = useConfigEnrolement();
  const mers = useApi<Mer[]>("/enrolement/mises-en-route");
  const notes = useApi<NoteRegistre[]>("/enrolement/mises-en-route/notes");
  const [choisi, setChoisi] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [fiche, setFiche] = useState<string | null>(null);
  const [rouvrir, setRouvrir] = useState(false);
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  const id = choisi ?? mers.donnees?.[0]?.id ?? null;
  const detail = useApi<{ mer: Mer; lignes: LigneMer[]; controles: Record<string, { libelle: string }> }>(id ? `/enrolement/mises-en-route/${id}` : null);
  if (!peut.traiter(profil.role) && !accesDonne(profil)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  const gerer = peutGerer(profil.role);
  const dg = peut.valider(profil.role);
  const m = detail.donnees?.mer;
  const bloquants = (m?.anomalies ?? []).filter((a) => a.gravite === "BLOQUANT");
  const nomCat = (k: string | null) => config.donnees?.configuration.categories.find((x) => x.code === k)?.libelle ?? k ?? "—";
  const nomDep = (d: number | null) => refs.departements.find((x) => x.id === d)?.nom ?? "—";

  async function agir(f: () => Promise<unknown>, ok: string) {
    setErreur(null);
    try {
      await f();
      setMessage(ok);
      mers.recharger();
      notes.recharger();
      detail.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  async function preparer(n: string, idMer?: number, silencieux = false) {
    setErreur(null);
    try {
      const r = await api.post<Mer>("/enrolement/mises-en-route", { noteReference: n, id: idMer });
      setChoisi(r.id);
      if (!silencieux) setMessage(`${r.libelle} : ${nf.format(r.effectif)} volontaire(s), ${fcfa(r.total)}.`);
      mers.recharger();
      notes.recharger();
      detail.recharger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <EnTete
        titre="Mise en route"
        sousTitre="La mise en route (mise d’équipement de la catégorie, billet et bagages vers le département) est versée une fois, à l’affectation. Elle se prépare par note de service, avec les barèmes de la configuration ; une personne déjà mise en route n’est pas reprise. Le DG valide, puis la fiche de paiement s’édite en Excel."
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      <Carte titre="États de mise en route">
        {gerer && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Champ libelle="Note de service">
              <Liste
                value={note}
                onChange={(e) => setNote(e.target.value)}
                vide="— Choisir la note —"
                options={(notes.donnees ?? []).map((n) => ({
                  valeur: n.noteReference,
                  libelle: `N° ${n.noteReference}${n.dateNote ? ` du ${dateFr(n.dateNote)}` : ""} — ${nf.format(n.enPoste)} en poste${n.miseEnRoute ? ` · déjà : ${n.miseEnRoute}` : ""}`,
                }))}
                className="min-w-96"
              />
            </Champ>
            <Bouton variante="principal" disabled={!note} onClick={() => preparer(note)}>
              Préparer la mise en route
            </Bouton>
          </div>
        )}
        {!mers.donnees ? (
          <Chargement />
        ) : !mers.donnees.length ? (
          <Vide>Aucun état. Les volontaires doivent d’abord être dans le registre avec leur note de service (Volontaires en poste › Reprendre une liste › Note de service).</Vide>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mers.donnees.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setChoisi(x.id)}
                className={`rounded-2xl px-4 py-2.5 text-left text-[13px] ring-1 transition ${x.id === id ? "bg-nuit text-white ring-nuit" : "bg-white ring-zinc-200 hover:ring-zinc-300"}`}
              >
                <div className="font-medium">{x.libelle}</div>
                <div className={`text-[11px] ${x.id === id ? "text-zinc-300" : "text-zinc-400"}`}>
                  {x.source === "REPRISE" ? "fiche reprise" : x.statut === "VALIDE" ? "validé" : "projet"} · {nf.format(x.effectif)} · {fcfa(x.total)}
                </div>
              </button>
            ))}
          </div>
        )}
      </Carte>

      {m && detail.donnees && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Chiffre ton={m.statut === "VALIDE" ? "vert" : "jaune"} libelle="État" valeur={m.source === "REPRISE" ? "Reprise" : m.statut === "VALIDE" ? "Validé" : "Projet"} detail={m.validePar ? `par ${m.validePar}` : `préparé par ${m.preparePar ?? "—"}`} />
            <Chiffre ton="bleu" libelle="Volontaires" valeur={nf.format(m.effectif)} detail={m.noteReference ? `note n° ${m.noteReference}` : ""} />
            <Chiffre ton="vert" libelle="Montant" valeur={fcfa(m.total)} detail="équipement et transport" />
            <Chiffre ton={bloquants.length ? "rouge" : "gris"} libelle="Contrôles bloquants" valeur={nf.format(bloquants.length)} detail={`${nf.format(m.anomalies.length - bloquants.length)} signalés`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Bouton onClick={() => api.telecharger(`/enrolement/mises-en-route/${m.id}/excel`, `${m.libelle.replace(/[\\/:*?"<>|]/g, "-")}${m.statut === "VALIDE" ? "" : " (projet)"}.xlsx`)}>
              <Download /> Fiche de paiement Excel
            </Bouton>
            {gerer && m.statut === "BROUILLON" && (
              <Bouton onClick={() => preparer(m.noteReference ?? "", m.id)}>
                <RefreshCw /> Recalculer
              </Bouton>
            )}
            {dg && m.statut === "BROUILLON" && (
              <Bouton variante="principal" disabled={bloquants.length > 0 || !m.effectif} onClick={() => agir(() => api.post(`/enrolement/mises-en-route/${m.id}/validation`), `${m.libelle} validée.`)}>
                <CheckCircle2 /> Valider
              </Bouton>
            )}
            {dg && m.statut === "VALIDE" && m.source === "CALCUL" && (
              <Bouton onClick={() => setRouvrir(true)}>
                <RotateCcw /> Rouvrir
              </Bouton>
            )}
            {gerer && m.statut === "BROUILLON" && (
              <Bouton
                variante="danger"
                onClick={async () => {
                  if (await demander(`Supprimer le projet « ${m.libelle} » ?`, "Supprimer"))
                    await agir(async () => {
                      await api.delete(`/enrolement/mises-en-route/${m.id}`);
                      setChoisi(null);
                    }, "Projet supprimé.");
                }}
              >
                <Trash2 /> Supprimer
              </Bouton>
            )}
          </div>
          {m.anomalies.length > 0 && (
            <Carte titre="Contrôles">
              <ul className="space-y-1.5 text-[12px]">
                {m.anomalies.slice(0, 200).map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <Badge ton={a.gravite === "BLOQUANT" ? "rouge" : "jaune"}>{detail.donnees!.controles[a.code]?.libelle ?? a.code}</Badge>
                    {a.volontaireId ? (
                      <button type="button" className="font-medium underline decoration-dotted" onClick={() => setFiche(a.volontaireId)}>
                        {a.nomComplet}
                      </button>
                    ) : (
                      a.nomComplet
                    )}
                    <span className="text-zinc-500">{a.message}</span>
                  </li>
                ))}
              </ul>
            </Carte>
          )}
          <Carte titre="Fiche">
            {!detail.donnees.lignes.length ? (
              <Vide>Personne à mettre en route.</Vide>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Nom et prénoms</th>
                    <th>Catégorie</th>
                    <th>Département</th>
                    <th>Établissement</th>
                    <th className="text-right">Équipement</th>
                    <th className="text-right">Billet</th>
                    <th className="text-right">Bagages</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.donnees.lignes.map((l, i) => (
                    <tr key={l.id}>
                      <td className="text-zinc-400 tabular-nums">{i + 1}</td>
                      <td>
                        {l.volontaireId ? (
                          <button type="button" className="text-left font-medium underline decoration-zinc-300 decoration-dotted underline-offset-2 hover:text-marque-700" onClick={() => setFiche(l.volontaireId)}>
                            {l.nomComplet}
                          </button>
                        ) : (
                          l.nomComplet
                        )}
                        {l.observation && <div className="text-[11px] text-or-700">{l.observation}</div>}
                      </td>
                      <td className="text-[12px]">
                        {nomCat(l.categorie)}
                        {l.specialite && <div className="text-zinc-400">{l.specialite}</div>}
                      </td>
                      <td>{nomDep(l.departementId)}</td>
                      <td className="text-[12px]">{l.etablissement ?? "À la disposition de la DDEPPSA"}</td>
                      <td className="text-right tabular-nums">{nf.format(l.equipement)}</td>
                      <td className="text-right tabular-nums">{nf.format(l.billet)}</td>
                      <td className="text-right tabular-nums">{nf.format(l.bagages)}</td>
                      <td className="text-right font-medium tabular-nums whitespace-nowrap">{fcfa(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            )}
          </Carte>
        </>
      )}

      {gerer && (
        <Reprise
          apres={(nouvel) => {
            setChoisi(nouvel);
            mers.recharger();
            notes.recharger();
          }}
        />
      )}
      {fiche && (
        <FicheVolontaire
          id={fiche}
          fermer={() => {
            setFiche(null);
            if (m?.statut === "BROUILLON" && m.source === "CALCUL" && gerer) void preparer(m.noteReference ?? "", m.id, true);
          }}
        />
      )}
      <Modale titre="Rouvrir la mise en route" ouverte={rouvrir} fermer={() => setRouvrir(false)}>
        <Champ libelle="Pourquoi la rouvrir ?">
          <Zone value={motif} onChange={(e) => setMotif(e.target.value)} />
        </Champ>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton onClick={() => setRouvrir(false)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={async () => {
              await agir(() => api.post(`/enrolement/mises-en-route/${m!.id}/reouverture`, { motif }), "Mise en route rouverte.");
              setRouvrir(false);
              setMotif("");
            }}
          >
            Rouvrir
          </Bouton>
        </div>
      </Modale>
      {confirmation}
    </div>
  );
}
