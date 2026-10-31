"use client";

import { Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Chargement, Modale, Saisie, cx } from "@/components/ui";
import { api, useApi } from "@/lib/api";

/**
 * Doublons probables, la même politique partout (DG, 31/10/2026) : deux fiches côte à côte, ce qui
 * diffère en couleur, puis « même personne » (on garde une fiche, l'autre est supprimée
 * définitivement après avoir complété celle gardée) ou « deux personnes différentes ».
 */

export type BaseDoublons = "RECRUTES" | "PERSONNEL" | "VOLONTAIRES" | "ENROLES";

export const BASES: { code: BaseDoublons; libelle: string; aide: string }[] = [
  { code: "RECRUTES", libelle: "Recrutés", aide: "Base des recrutés (commission, textes de la FP, affectations)." },
  { code: "PERSONNEL", libelle: "Base du personnel", aide: "Fiches du recensement : fonctionnaires, contractuels, volontaires et communautaires." },
  { code: "VOLONTAIRES", libelle: "Registre des volontaires", aide: "Registre de la bourse : volontaires et communautaires en poste." },
  { code: "ENROLES", libelle: "Enrôlés", aide: "Candidats à l’enrôlement d’une même campagne." },
];

export interface FicheDoublon {
  id: string;
  nom: string;
  repere: string;
  lignes: { libelle: string; valeur: string | null }[];
  supprimable: boolean;
  raison: string | null;
}

/** Supprimer définitivement une fiche : réservé au contrôle (même règle que le serveur). */
const peutSupprimer = (role: string) => ["ADMIN", "CHEF_SERVICE", "DIRECTEUR", "BUREAU_ETUDES", "DG"].includes(role);

function Colonne({ f, autre, titre }: { f: FicheDoublon; autre: FicheDoublon; titre: string }) {
  const valeurAutre = new Map(autre.lignes.map((l) => [l.libelle, l.valeur]));
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{titre}</div>
      <div className="mt-0.5 text-[14px] font-semibold text-encre">{f.nom}</div>
      <div className="text-[11px] text-zinc-500">{f.repere}</div>
      <dl className="mt-2 space-y-0.5 text-[12px]">
        {f.lignes.map((l) => {
          const differe = !!l.valeur && !!valeurAutre.get(l.libelle) && valeurAutre.get(l.libelle) !== l.valeur;
          const seule = !!l.valeur && !valeurAutre.get(l.libelle);
          return (
            <div key={l.libelle} className="flex gap-2">
              <dt className="w-32 shrink-0 text-zinc-400">{l.libelle}</dt>
              <dd
                className={cx(
                  "min-w-0 break-words",
                  !l.valeur ? "text-zinc-300" : differe ? "rounded bg-or-100 px-1 font-medium text-or-700" : seule ? "font-medium text-marque-700" : "text-encre",
                )}
                title={differe ? "Différent sur l’autre fiche" : seule ? "Absent de l’autre fiche : la complétera si l’on garde l’autre" : undefined}
              >
                {l.valeur ?? "—"}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Une paire : les deux fiches et les trois décisions. `apres` reçoit le message à afficher. */
export function PaireDoublon({
  base,
  a,
  b,
  apres,
  titres = ["Fiche A", "Fiche B"],
}: {
  base: BaseDoublons;
  a: FicheDoublon;
  b: FicheDoublon;
  apres: (message: string, ton?: "vert" | "rouge") => void;
  titres?: [string, string];
}) {
  const { profil } = useSession();
  const controle = peutSupprimer(profil.role);
  // Fiche à supprimer (l'autre est gardée), en attente du second clic
  const [confirmer, setConfirmer] = useState<FicheDoublon | null>(null);
  const [differentes, setDifferentes] = useState(false);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const garder = (supprimee: FicheDoublon) => (supprimee.id === a.id ? b : a);

  async function trancher(supprimee: FicheDoublon, decision: "SUPPRIMER" | "DIFFERENTES") {
    setEnvoi(true);
    try {
      const r = await api.post<{ completes?: string[] }>(`/doublons/${base}/${supprimee.id}`, {
        autreId: garder(supprimee).id,
        decision,
        motif: motif.trim() || undefined,
      });
      apres(
        decision === "DIFFERENTES"
          ? `${a.nom} et ${b.nom} : deux personnes différentes. Elles ne sont plus proposées comme doublon.`
          : `Fiche « ${supprimee.nom} » supprimée définitivement ; « ${garder(supprimee).nom} » est gardée${r.completes?.length ? ` et complétée (${r.completes.length} information(s) qui lui manquaient)` : ""}.`,
      );
    } catch (e) {
      apres((e as Error).message, "rouge");
      setConfirmer(null);
    } finally {
      setEnvoi(false);
    }
  }

  const boutonGarder = (supprimee: FicheDoublon, cote: string) => (
    <Bouton
      variante="secondaire"
      disabled={envoi || !controle || !supprimee.supprimable}
      title={!controle ? "Réservé au chef de service, au directeur, au bureau d’études et au DG" : (supprimee.raison ?? undefined)}
      onClick={() => {
        setDifferentes(false);
        setConfirmer(supprimee);
      }}
    >
      <Trash2 className="size-4" /> Même personne : garder {cote}
    </Bouton>
  );

  return (
    <div className="space-y-3 rounded-3xl bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Colonne f={a} autre={b} titre={titres[0]} />
        <Colonne f={b} autre={a} titre={titres[1]} />
      </div>
      {confirmer ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rouge-100/60 px-3 py-2 text-[13px]">
          <span className="text-rouge-600">
            Garder « {garder(confirmer).nom} » et supprimer <strong>définitivement</strong> « {confirmer.nom} » ({confirmer.repere}) ? Ce qui manque à la
            fiche gardée y est recopié ; la fiche supprimée ne pourra pas être récupérée.
          </span>
          <Bouton variante="danger" disabled={envoi} onClick={() => trancher(confirmer, "SUPPRIMER")}>
            Oui, supprimer
          </Bouton>
          <Bouton variante="discret" onClick={() => setConfirmer(null)}>
            Non
          </Bouton>
        </div>
      ) : differentes ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[13px] ring-1 ring-zinc-200">
          <Saisie value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ce que vous avez constaté (facultatif) : pas la même date, pièces vues…" className="min-w-64 flex-1" />
          <Bouton disabled={envoi} onClick={() => trancher(a, "DIFFERENTES")}>
            <Users className="size-4" /> Confirmer : deux personnes différentes
          </Bouton>
          <Bouton variante="discret" onClick={() => setDifferentes(false)}>
            Retour
          </Bouton>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {boutonGarder(b, `« ${titres[0].toLowerCase()} »`)}
          {boutonGarder(a, `« ${titres[1].toLowerCase()} »`)}
          <Bouton disabled={envoi} onClick={() => setDifferentes(true)}>
            <Users className="size-4" /> Deux personnes différentes
          </Bouton>
          {[a, b].filter((x) => !x.supprimable).map((x) => (
            <Badge key={x.id}>
              {x.id === a.id ? titres[0] : titres[1]} : {x.raison}
            </Badge>
          ))}
          {!controle && <span className="text-[11px] text-zinc-500">Supprimer une fiche est réservé au contrôle (chef de service, directeur, DG).</span>}
        </div>
      )}
    </div>
  );
}

/** Depuis la ligne d'un module : la fiche et celles qui lui ressemblent, à trancher. */
export function ModaleDoublons({
  base,
  id,
  fermer,
  apres,
}: {
  base: BaseDoublons;
  id: string;
  fermer: () => void;
  apres: (message: string, ton?: "vert" | "rouge") => void;
}) {
  const { donnees: d, erreur } = useApi<{ fiche: FicheDoublon; candidats: FicheDoublon[] }>(`/doublons/${base}/${id}`);
  const [echec, setEchec] = useState<string | null>(null);
  return (
    <Modale titre="Doublon probable : comparer les fiches" ouverte fermer={fermer} large>
      {erreur && <Alerte>{erreur}</Alerte>}
      {echec && <Alerte>{echec}</Alerte>}
      {!d ? (
        !erreur && <Chargement />
      ) : !d.candidats.length ? (
        <p className="text-[13px] text-zinc-500">Aucune autre fiche ne ressemble à celle-ci (déjà supprimée, ou déclarée différente).</p>
      ) : (
        <div className="space-y-4 text-[13px]">
          <Explication />
          {d.candidats.map((c) => (
            <PaireDoublon
              key={c.id}
              base={base}
              a={d.fiche}
              b={c}
              titres={["Cette fiche", "L’autre fiche"]}
              apres={(m, ton) => (ton === "rouge" ? setEchec(m) : apres(m))}
            />
          ))}
        </div>
      )}
    </Modale>
  );
}

export function Explication() {
  return (
    <p className="leading-relaxed text-zinc-600">
      <span className="rounded bg-or-100 px-1 font-medium text-or-700">En jaune</span> : ce qui diffère d’une fiche à l’autre ;{" "}
      <span className="font-medium text-marque-700">en vert</span> : ce qu’une seule fiche a. Si c’est <strong>la même personne</strong>, gardez la meilleure
      fiche : l’autre est supprimée définitivement, et ce qu’elle avait en plus (date, téléphone, pièces, historique…) passe sur celle gardée. Si ce sont{" "}
      <strong>deux personnes</strong>, dites-le : elles ne seront plus proposées.
    </p>
  );
}
