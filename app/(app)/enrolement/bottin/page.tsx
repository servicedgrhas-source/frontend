"use client";

import { Download, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fcfa, moisFr, nf, peutGerer } from "@/components/enrolement/volontaires";
import { useSession } from "@/components/session";
import { Alerte, Annonce, Badge, Bouton, Carte, Champ, Chargement, Chiffre, ChoixMois, EnTete, Modale, Segments, Tableau, Vide, Zone, ZoneFichier, useConfirmation } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface MoisBottin {
  mois: string;
  n: number;
  sources: string[];
  le: string;
}
interface Rapport {
  essai: boolean;
  mois: string;
  lues: number;
  enDoubleDansLeFichier: number;
  nouvelles: number;
  remplacees: number;
  dejaCeMois: number;
  colonnes: string[];
  sansMatricule: number;
  ignorees: string[];
}
interface Resultat {
  volontaire: { id: string; nomComplet: string; dateNaissance: string | null; departement: string | null; etablissement: string | null; categorie: string | null; vague: string | null; population: string };
  ligne: { id: number; mois: string; matricule: string | null; nomComplet: string; dateNaissance: string | null; departement: string | null; grade: string | null; indice: number | null; brut: number | null };
  certitude: "PROBABLE" | "POSSIBLE";
  memeDepartement: boolean;
  memeNaissance: boolean;
  autres: number;
}

const COLONNES: Record<string, string> = {
  nom: "Nom",
  prenom: "Prénom",
  matricule: "Matricule",
  naissance: "Date de naissance",
  departement: "Département",
  grade: "Grade",
  indice: "Indice",
  brut: "Salaire brut",
  banque: "Banque",
};
const dateFr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const moisPrecedent = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

/**
 * Pointage du bottin de la solde : la bourse d'un volontaire s'arrête à son premier salaire (et non au
 * texte de la Fonction Publique). On importe le bottin du mois, le système retrouve les volontaires
 * encore payés qui y figurent, et on les sort du registre à la date de leur premier salaire.
 */
export default function PointageBottin() {
  const { profil } = useSession();
  const mois = useApi<MoisBottin[]>("/enrolement/bottin");
  const pointage = useApi<{ resultats: Resultat[]; enPoste: number; lignes: number }>("/enrolement/bottin/pointage");
  const [moisImport, setMoisImport] = useState(moisPrecedent());
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [filtre, setFiltre] = useState<"PROBABLE" | "POSSIBLE" | "TOUS">("PROBABLE");
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [ecart, setEcart] = useState<Resultat | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, demander] = useConfirmation();
  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS.</Alerte>;
  const gerer = peutGerer(profil.role);

  async function importer(f: File, essai: boolean) {
    setErreur(null);
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = await api.post<Rapport>(`/enrolement/bottin/import?mois=${moisImport}&essai=${essai ? 1 : 0}`, fd);
      setRapport(r);
      setFichier(essai ? f : null);
      if (!essai) {
        setMessage(`Bottin de ${moisFr(r.mois)} enregistré : ${nf.format(r.nouvelles)} nouvelle(s) ligne(s), ${nf.format(r.remplacees)} remplacée(s). Le pointage est recalculé.`);
        setRapport(null);
        mois.recharger();
        pointage.recharger();
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const resultats = pointage.donnees?.resultats ?? [];
  const visibles = resultats.filter((r) => filtre === "TOUS" || r.certitude === filtre);
  const probables = resultats.filter((r) => r.certitude === "PROBABLE").length;

  return (
    <div className="space-y-6">
      <EnTete
        titre="Pointage du bottin de la solde"
        sousTitre="La bourse d’un volontaire continue jusqu’à son premier salaire, même après son texte de la Fonction Publique. Chaque mois, importez le bottin : le système retrouve les volontaires encore payés qui y figurent déjà, et vous les sortez du registre à la date de leur premier salaire."
      />
      <Annonce fermer={() => setMessage(null)}>{message}</Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Chiffre libelle="Volontaires en poste" valeur={nf.format(pointage.donnees?.enPoste ?? 0)} />
        <Chiffre libelle="Personnes dans les bottins importés" valeur={nf.format(pointage.donnees?.lignes ?? 0)} />
        <Chiffre libelle="Retrouvés dans le bottin (probables)" valeur={nf.format(probables)} />
      </div>

      <Carte titre="1. Importer le bottin du mois">
        <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
          Un fichier Excel avec au moins le nom (ou « Noms et prénoms ») et le matricule ou la date de naissance. Les colonnes département, indice, salaire brut et banque sont reprises si elles existent. Un bottin
          en PDF doit d’abord être converti en Excel. Plusieurs fichiers peuvent compléter le même mois (un par département).
        </p>
        <div className="mb-4 max-w-xs">
          <Champ libelle="Mois payé par ce bottin">
            <ChoixMois value={moisImport} onChange={setMoisImport} />
          </Champ>
        </div>
        <ZoneFichier accept=".xlsx" envoi={envoi} envoyer={(f) => importer(f, true)} libelleBouton="Vérifier le fichier" />
        {rapport && (
          <div className="mt-4 space-y-3 rounded-2xl bg-zinc-50 p-4 text-[13px]">
            <div>
              <strong>{nf.format(rapport.lues)}</strong> personne(s) lue(s) pour {moisFr(rapport.mois)} : {nf.format(rapport.nouvelles)} nouvelle(s)
              {rapport.remplacees ? `, ${nf.format(rapport.remplacees)} déjà importée(s) ce mois (remplacée(s))` : ""}
              {rapport.enDoubleDansLeFichier ? `, ${nf.format(rapport.enDoubleDansLeFichier)} en double dans le fichier` : ""}
              {rapport.sansMatricule ? `, ${nf.format(rapport.sansMatricule)} sans matricule` : ""}.
            </div>
            <div className="text-[12px] text-zinc-600">Colonnes reconnues : {rapport.colonnes.map((c) => COLONNES[c] ?? c).join(", ")}.</div>
            {!!rapport.ignorees.length && <div className="text-[12px] text-zinc-500">Lignes ignorées (titres, totaux) : {rapport.ignorees.join(" · ")}</div>}
            <Bouton variante="principal" disabled={!fichier || envoi} onClick={() => fichier && importer(fichier, false)}>
              <Download /> Enregistrer ce bottin
            </Bouton>
          </div>
        )}
        {!!mois.donnees?.length && (
          <div className="mt-5">
            <div className="mb-2 text-xs font-medium text-zinc-500">Bottins déjà importés</div>
            <ul className="divide-y divide-zinc-100 text-[13px]">
              {mois.donnees.map((m) => (
                <li key={m.mois} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-36 font-medium">{moisFr(m.mois)}</span>
                  <span className="text-zinc-600">{nf.format(m.n)} personne(s)</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-400">{m.sources.join(", ")}</span>
                  {gerer && (
                    <Bouton
                      variante="discret"
                      onClick={async () => {
                        if (!(await demander(`Retirer le bottin de ${moisFr(m.mois)} (${nf.format(m.n)} personnes) ? Les sorties déjà faites restent.`, "Retirer"))) return;
                        await api.delete(`/enrolement/bottin/${m.mois}`);
                        mois.recharger();
                        pointage.recharger();
                      }}
                    >
                      <Trash2 /> Retirer
                    </Bouton>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Carte>

      <Carte
        titre="2. Volontaires encore payés retrouvés dans le bottin"
        actions={
          <Segments
            valeur={filtre}
            changer={(v) => {
              setFiltre(v);
              setCoches(new Set());
            }}
            options={[
              { valeur: "PROBABLE", libelle: `Probables (${probables})` },
              { valeur: "POSSIBLE", libelle: `À regarder (${resultats.length - probables})` },
              { valeur: "TOUS", libelle: "Tous" },
            ]}
          />
        }
      >
        <p className="-mt-2 mb-4 text-[12px] text-zinc-500">
          « Probable » : même nom, et même date de naissance ou même département. « À regarder » : nom proche seulement (homonyme possible). Le mois indiqué est le premier où la personne apparaît dans un bottin : c’est son
          premier salaire, sa bourse s’arrête au mois précédent. Cochez puis « Sortir du registre » : motif « Recruté à la Fonction Publique », et sa fiche du personnel passe fonctionnaire avec son matricule.
        </p>
        {pointage.chargement && !pointage.donnees ? (
          <Chargement />
        ) : !visibles.length ? (
          <Vide>{mois.donnees?.length ? "Aucun volontaire en poste n’est retrouvé dans les bottins importés." : "Importez d’abord un bottin."}</Vide>
        ) : (
          <>
            <Tableau>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="size-4 accent-marque-600"
                      checked={visibles.every((r) => coches.has(r.volontaire.id))}
                      onChange={(e) => setCoches(new Set(e.target.checked ? visibles.map((r) => r.volontaire.id) : []))}
                    />
                  </th>
                  <th>Volontaire (registre)</th>
                  <th>Dans le bottin</th>
                  <th>Premier salaire</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.volontaire.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="size-4 accent-marque-600"
                        checked={coches.has(r.volontaire.id)}
                        onChange={(e) => {
                          const n = new Set(coches);
                          if (e.target.checked) n.add(r.volontaire.id);
                          else n.delete(r.volontaire.id);
                          setCoches(n);
                        }}
                      />
                    </td>
                    <td>
                      <div className="font-medium">
                        {r.volontaire.nomComplet}
                        {r.volontaire.population === "COMMUNAUTAIRE" && <span className="ml-1.5 text-[11px] font-normal text-or-700">communautaire</span>}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {dateFr(r.volontaire.dateNaissance)} · {r.volontaire.departement ?? "—"}
                        {r.volontaire.etablissement && ` · ${r.volontaire.etablissement}`}
                        {r.volontaire.vague && ` · ${r.volontaire.vague}`}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{r.ligne.nomComplet}</span>
                        <Badge ton={r.certitude === "PROBABLE" ? "vert" : "jaune"}>{r.certitude === "PROBABLE" ? "probable" : "à regarder"}</Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {r.ligne.matricule ? `Matricule ${r.ligne.matricule}` : "Sans matricule"} · {dateFr(r.ligne.dateNaissance)}
                        {r.memeNaissance && " (même date)"} · {r.ligne.departement ?? "—"}
                        {r.memeDepartement && " (même département)"}
                        {r.ligne.indice && ` · indice ${r.ligne.indice}`}
                        {r.ligne.brut && ` · ${fcfa(r.ligne.brut)}`}
                        {r.autres > 0 && ` · ${r.autres} autre(s) homonyme(s) dans le bottin`}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{moisFr(r.ligne.mois)}</td>
                    <td>
                      <Bouton variante="discret" onClick={() => setEcart(r)}>
                        Pas la même personne
                      </Bouton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            {gerer ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Bouton
                  variante="principal"
                  disabled={!coches.size}
                  onClick={async () => {
                    const choix = visibles.filter((r) => coches.has(r.volontaire.id)).map((r) => ({ volontaireId: r.volontaire.id, ligneId: r.ligne.id }));
                    if (!(await demander(`Sortir ${choix.length} volontaire(s) du registre (recrutés à la Fonction Publique, à la date de leur premier salaire) ?`, "Sortir du registre"))) return;
                    setErreur(null);
                    try {
                      const res = await api.post<{ sortis: number; erreurs: string[] }>("/enrolement/bottin/sortie", { choix });
                      setMessage(`${res.sortis} volontaire(s) sorti(s) du registre.${res.erreurs.length ? ` Problèmes : ${res.erreurs.join(" · ")}` : ""}`);
                      setCoches(new Set());
                      pointage.recharger();
                    } catch (e) {
                      setErreur((e as Error).message);
                    }
                  }}
                >
                  <LogOut /> Sortir du registre ({coches.size})
                </Bouton>
                <span className="text-[12px] text-zinc-500">
                  Ensuite, préparez la bourse du mois (
                  <Link href="/enrolement/bourse" className="font-medium text-marque-700 hover:underline">
                    Bourse mensuelle
                  </Link>
                  ).
                </span>
              </div>
            ) : (
              <p className="mt-4 text-[12px] text-zinc-500">La sortie du registre est faite par le chef de service, le directeur ou le DG.</p>
            )}
          </>
        )}
      </Carte>

      <Modale titre="Pas la même personne" ouverte={!!ecart} fermer={() => setEcart(null)}>
        <p className="mb-3 text-[13px] text-zinc-600">
          {ecart?.volontaire.nomComplet} ne sera plus proposé, sauf s’il est retrouvé dans un bottin importé plus tard. Dites ce que vous avez vérifié.
        </p>
        <Zone value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. dates de naissance différentes, homonyme d’un autre département" />
        <div className="mt-5 flex justify-end gap-2">
          <Bouton onClick={() => setEcart(null)}>Annuler</Bouton>
          <Bouton
            variante="principal"
            onClick={async () => {
              setErreur(null);
              try {
                await api.post(`/enrolement/bottin/ecart/${ecart!.volontaire.id}`, { note });
                setEcart(null);
                setNote("");
                pointage.recharger();
              } catch (e) {
                setErreur((e as Error).message);
                setEcart(null);
              }
            }}
          >
            Confirmer
          </Bouton>
        </div>
      </Modale>
      {confirmation}
    </div>
  );
}
