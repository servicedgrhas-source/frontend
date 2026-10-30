"use client";

import { ArrowRight, CheckCircle2, Inbox, Layers } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, Champ, Chargement, EnTete, Pastille, Progression, SaisieDate } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { dateCourte, dateLongue, peut, STATUT_NOTE, TYPE_LOT } from "@/lib/libelles";
import type { Lot } from "@/lib/types";

const nf = new Intl.NumberFormat("fr-FR");

/** Champ de la date de signature selon le type du lot. */
const champSignature = (l: Lot) => (l.typeTexte === "ARRETE" || (!l.typeTexte && !l.decrets) ? "dateSignatureArretes" : "dateSignatureDecrets");

export default function Lots() {
  const { profil } = useSession();
  const { donnees, erreur, recharger } = useApi<Lot[]>("/lots");
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  const modifiable = peut.traiter(profil.role);

  async function modifier(lot: Lot, champ: "dateSignatureArretes" | "dateSignatureDecrets", valeur: string) {
    try {
      await api.patch(`/lots/${lot.id}`, { [champ]: valeur || null });
      setMessage({ ton: "vert", texte: `${lot.libelle} : date de signature enregistrée.` });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  }

  const aCompleter = donnees?.filter((l) => !l.archive && !l[champSignature(l)]).length ?? 0;
  // Regroupement par paquet : le dernier importé en haut, mis en évidence (DG, 28/10/2026 : un paquet
  // importé aujourd'hui avec une date ancienne se perdait plus bas), puis les autres par date
  const paquets = new Map<string, { numero: number; libelle: string; date: string | null; lots: Lot[] }>();
  for (const l of donnees ?? []) {
    // Lots de publication écrits dans la base (« Arrêtés — lot VIII », DG 30/10/2026) : ensemble, en tête
    const fichier = !!l.numeroFichier;
    const cle = fichier ? "fichier" : l.paquet ? String(l.paquet.numero) : "aucun";
    const p = paquets.get(cle) ?? {
      numero: fichier ? Number.MAX_SAFE_INTEGER : (l.paquet?.numero ?? 0),
      libelle: fichier ? "Lots de publication de la base (arrêtés et décrets)" : (l.paquet?.libelle ?? "Sans paquet"),
      date: l.paquet?.dateReception ?? null,
      lots: [],
    };
    p.lots.push(l);
    paquets.set(cle, p);
  }
  const dernier = Math.max(0, ...[...paquets.values()].map((p) => p.numero));
  const ordre = [...paquets.values()].sort((a, b) => Number(b.numero === dernier) - Number(a.numero === dernier) || (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="space-y-6">
      <EnTete
        titre="Lots de textes"
        sousTitre="Chaque paquet reçu de la Fonction Publique est rangé en lots : un lot par quota et par type de texte (Arrêtés, Décrets PM, Décrets PR). Les lots se créent tout seuls à la réception."
      />
      <div className="flex items-start gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-600">
        <Inbox className="mt-0.5 size-4 shrink-0 text-zinc-400" />
        <span>
          Exemple : le paquet du 04/03/2026 contient des arrêtés du quota 2024 et du quota 2025, et des décrets. Il donne « Arrêtés quota 2024 — lot 4 »,
          « Arrêtés quota 2025 — lot 2 », « Décrets PM quota 2024 — lot 1 »… Chaque quota et chaque type a sa propre numérotation.
          <Aide>
            <strong>Arrêtés</strong> : {TYPE_LOT.ARRETE.aide}. <strong>Décrets PM</strong> : {TYPE_LOT.DECRET_PM.aide}. <strong>Décrets PR</strong> :{" "}
            {TYPE_LOT.DECRET_PR.aide}. Le type d’un décret se déduit du diplôme de la personne. Les lots de réception n’ont rien à voir avec les lots de la commission.
          </Aide>
        </span>
      </div>
      {aCompleter > 0 && (
        <Alerte ton="jaune">
          <strong>{aCompleter} lot(s)</strong> sans date de signature. La note cite chaque texte avec sa date (ex. « 6758 du 31 Décembre 2025 ») : tant qu’elle
          manque, les personnes du lot ne peuvent pas entrer dans une note.
        </Alerte>
      )}
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>
      {erreur && <Alerte>{erreur}</Alerte>}

      {!donnees ? (
        <Chargement />
      ) : (
        ordre.map((p) => (
          <section key={p.libelle} className={p.numero === dernier && dernier > 0 ? "space-y-3 rounded-3xl bg-marque-50/60 p-4 ring-1 ring-marque-200" : "space-y-3"}>
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-[15px] font-semibold text-encre">
              {p.libelle}
              {p.numero === dernier && dernier > 0 && <Badge ton="vert">Dernier paquet importé</Badge>}
              <span className="text-[12px] font-normal text-zinc-400">
                {nf.format(p.lots.reduce((n, l) => n + l.arretes + l.decrets, 0))} texte(s) · {p.lots.length} lot(s)
              </span>
            </h2>
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {p.lots.map((l) => (
                <CarteLot key={l.id} l={l} modifiable={modifiable} modifier={modifier} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CarteLot({ l, modifiable, modifier }: { l: Lot; modifiable: boolean; modifier: (l: Lot, champ: "dateSignatureArretes" | "dateSignatureDecrets", v: string) => void }) {
  const total = l.aTraiter + l.affectes + l.exclus;
  const p = total ? (100 * l.affectes) / total : 0;
  const champ = champSignature(l);
  const complet = !!l[champ];
  const textes = l.arretes + l.decrets;
  return (
    <section className="flex flex-col rounded-3xl bg-white p-5 shadow-doux">
      <div className="flex items-start gap-3">
        <Pastille ton={p >= 100 ? "vert" : complet ? "jaune" : "gris"} taille="lg">
          {p >= 100 ? <CheckCircle2 /> : <Layers />}
        </Pastille>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] leading-snug font-semibold">{l.libelle}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {complet ? <Badge ton="vert">Date de signature saisie</Badge> : <Badge ton="jaune">Date de signature à saisir</Badge>}
            {l.typeTexte && <span className="text-[11px] text-zinc-400">{TYPE_LOT[l.typeTexte]?.aide}</span>}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-zinc-50 py-2.5">
          <div className="text-lg font-semibold tabular-nums">{nf.format(textes)}</div>
          <div className="text-[11px] text-zinc-400">Personnes</div>
        </div>
        <div className="rounded-2xl bg-zinc-50 py-2.5">
          <div className="text-lg font-semibold tabular-nums">{nf.format(l.aTraiter)}</div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400">
            Pas encore affectés
            <Aide>
              Personnes de ce lot qui ont leur texte mais <strong>ne sont pas encore dans une note validée par le DG</strong> : pas encore mises dans une note,
              dans une note à soumettre au DG ou en attente de sa validation, ou bloquées par un problème (date de signature, diplôme, département…).
            </Aide>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-zinc-500">
            {nf.format(l.affectes)} affectés · {l.exclus} exclus
          </span>
          <span className="font-medium tabular-nums">{Math.round(p)} %</span>
        </div>
        <Progression valeur={p} ton={p >= 100 ? "vert" : "jaune"} />
      </div>

      {l.aTraiter > 0 && <DetailATraiter lot={l} />}

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <Champ libelle={`Date de signature des ${l.typeTexte ? (TYPE_LOT[l.typeTexte]?.pluriel.toLowerCase() ?? "textes") : "textes"} de ce lot`} aide={dateLongue(l[champ]) ?? "à renseigner"}>
          {modifiable ? (
            // Au clavier (« 31/12/2025 ») ou au calendrier : DG, 28/10/2026
            <SaisieDate value={l[champ] ?? ""} className={!l[champ] ? "rounded-xl ring-2 ring-or-400" : ""} onChange={(v) => modifier(l, champ, v)} aria-label="Date de signature" />
          ) : (
            <span className="text-[13px]">{dateCourte(l[champ])}</span>
          )}
        </Champ>
      </div>

      <div className="mt-auto flex justify-end pt-5">
        <Link href={`/affectations?lot=${l.numero}`}>
          <Bouton variante="sombre">
            Traiter <ArrowRight />
          </Bouton>
        </Link>
      </div>
    </section>
  );
}

/** Les « pas encore affectés » d'un lot, par étape, avec le lien pour agir. */
function DetailATraiter({ lot }: { lot: Lot }) {
  const d = lot.detailATraiter;
  const raisons = Object.entries(d.raisons).sort((a, b) => b[1] - a[1]);
  const lignes: { n: number; texte: string; action: string; lien: string; ton: string; raisons?: [string, number][]; aide?: string }[] = [
    {
      n: d.aCompleter,
      texte: "à compléter (information manquante)",
      action: "Compléter",
      lien: `/affectations?lot=${lot.numero}&probleme=bloquant`,
      ton: "bg-rouge-600",
      raisons,
    },
    { n: d.sansNote, texte: "prêts, notes pas encore préparées", action: "Préparer", lien: `/affectations?lot=${lot.numero}`, ton: "bg-or-400" },
    { n: d.enBrouillon, texte: "dans une note à soumettre au DG", action: "Voir les notes", lien: "/notes/affectation", ton: "bg-zinc-400", aide: STATUT_NOTE.BROUILLON.aide },
    { n: d.enValidation, texte: "dans une note en attente de validation du DG", action: "Voir les notes", lien: "/notes/affectation", ton: "bg-sky-500", aide: STATUT_NOTE.SOUMISE.aide },
  ].filter((x) => x.n > 0);
  return (
    <div className="mt-4 space-y-2 rounded-2xl bg-zinc-50 p-3">
      <div className="text-[11px] font-medium text-zinc-500">Les {nf.format(lot.aTraiter)} pas encore affectés :</div>
      {lignes.map((x) => (
        <div key={x.texte} className="text-[12px]">
          <div className="flex items-center gap-2">
            <span className={`size-2 shrink-0 rounded-full ${x.ton}`} />
            <strong className="tabular-nums">{nf.format(x.n)}</strong>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-zinc-600">
              {x.texte}
              {x.aide && <Aide>{x.aide}</Aide>}
            </span>
            <Link href={x.lien} className="inline-flex shrink-0 items-center gap-0.5 font-medium text-marque-700 hover:underline">
              {x.action} <ArrowRight className="size-3" />
            </Link>
          </div>
          {!!x.raisons?.length && (
            <ul className="mt-1 space-y-0.5 pl-4 text-[11px] text-rouge-600">
              {x.raisons.map(([r, n]) => (
                <li key={r} className="flex gap-1.5">
                  <strong className="w-8 shrink-0 text-right tabular-nums">{nf.format(n)}</strong>
                  {/* « Date de naissance illisible : statut contractuel à préciser » → le motif seul */}
                  <span>{r.split(" : ")[0]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
