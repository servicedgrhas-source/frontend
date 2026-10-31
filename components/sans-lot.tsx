"use client";

import { FolderInput, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { Alerte, Bouton, Champ, Modale, Saisie, Segments } from "./ui";
import { api, TRAVAIL_MODIFIE, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface PersonneSansLot {
  id: string;
  nomComplet: string;
  dateNaissance: string | null;
  liste: string;
  diplome: string | null;
  departement: string | null;
  typeTexte: string | null;
  numeroTexte: string | null;
  lotIllisible: string | null;
  oubli: string | null;
}

interface SansLot {
  total: number;
  meppsa: number;
  autres: number;
  illisibles: number;
  personnes: PersonneSansLot[];
}

const ROMAINS: [number, string][] = [
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
const VALEURS: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

/** « VIII » ou « 8 » → 8 ; null si illisible. */
function lireLot(t: string): number | null {
  const s = t.trim().toUpperCase();
  if (/^\d+$/.test(s)) return Number(s) || null;
  if (!/^[IVXLC]+$/.test(s)) return null;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const v = VALEURS[s[i]];
    n += v < (VALEURS[s[i + 1]] ?? 0) ? -v : v;
  }
  return n > 0 ? n : null;
}
const romain = (n: number) => {
  let r = "";
  for (const [v, l] of ROMAINS)
    while (n >= v) {
      r += l;
      n -= v;
    }
  return r;
};

/** Texte sans accents ni majuscules, pour la recherche. */
const plat = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Personnes sans lot de publication (DG, 31/10/2026) : elles n'ont pas d'affectation et
 * n'apparaissent nulle part ailleurs dans le traitement des affectations. À la demande, on les
 * range dans le lot choisi (« Arrêtés — lot VIII ») : elles entrent alors dans les notes de ce lot.
 */
export function BandeauSansLot({ apres }: { apres: () => void }) {
  const { profil } = useSession();
  const donnees = useApi<SansLot>("/recrutes/sans-lot");
  const { recharger } = donnees;
  // Relu après chaque enregistrement sur les recrutés (import, ajout, fiche corrigée…)
  useEffect(() => {
    const apresEcriture = (e: Event) => {
      const chemin = (e as CustomEvent<string>).detail ?? "";
      if (/^\/(recrutes|agents|import|reception)/.test(chemin)) recharger();
    };
    window.addEventListener(TRAVAIL_MODIFIE, apresEcriture);
    return () => window.removeEventListener(TRAVAIL_MODIFIE, apresEcriture);
  }, [recharger]);
  const [ouverte, setOuverte] = useState(false);
  const d = donnees.donnees;
  if (!d?.total) return null;
  return (
    <>
      <Alerte ton="jaune">
        <strong>{d.total} personne(s) sans lot de publication</strong> (texte de la FP pas encore reçu, ou lot illisible dans le fichier) : elles
        n’entrent dans aucune note.{" "}
        <span className="text-[12px]">
          {[d.meppsa && `${d.meppsa} quota MEPPSA`, d.autres && `${d.autres} quota « Autres »`, d.illisibles && `${d.illisibles} lot(s) illisible(s)`]
            .filter(Boolean)
            .join(" · ")}
          .
        </span>{" "}
        {peut.importerBase(profil.role) && (
          <button type="button" className="font-semibold underline" onClick={() => setOuverte(true)}>
            Les ranger dans un lot
          </button>
        )}
        {" · "}
        <Link href="/recrutement?texte=attente" className="underline">
          Voir dans la Base des recrutés
        </Link>
      </Alerte>
      {ouverte && (
        <RangerDansLot
          personnes={d.personnes}
          fermer={() => setOuverte(false)}
          apres={() => {
            setOuverte(false);
            recharger();
            apres();
          }}
        />
      )}
    </>
  );
}

function RangerDansLot({ personnes, fermer, apres }: { personnes: PersonneSansLot[]; fermer: () => void; apres: () => void }) {
  const lots = useApi<{ numero: number; numeroFichier: number | null; typeTexte: string | null; libelle: string; arretes: number; decrets: number }[]>("/lots");
  const [famille, setFamille] = useState<"ARRETE" | "DECRET">("ARRETE");
  const [numero, setNumero] = useState("");
  const [cochees, setCochees] = useState<string[]>([]);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [bilan, setBilan] = useState<string | null>(null);
  const n = lireLot(numero);
  // Lots du fichier déjà connus pour ce type de texte
  const existants = (lots.donnees ?? []).filter((l) => l.numeroFichier && l.typeTexte === famille).sort((a, b) => a.numeroFichier! - b.numeroFichier!);
  const existant = n ? existants.find((l) => l.numeroFichier === n) : undefined;
  const mots = plat(recherche).split(/\s+/).filter(Boolean);
  const visibles = mots.length
    ? personnes.filter((p) => {
        const t = plat([p.nomComplet, p.liste, p.diplome, p.departement, p.numeroTexte, p.lotIllisible].filter(Boolean).join(" "));
        return mots.every((m) => t.includes(m));
      })
    : personnes;
  const basculer = (id: string) => setCochees((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  async function ranger() {
    if (!n) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<{ ranges: number; lot: string; affectationsCreees: number }>("/recrutes/sans-lot/ranger", { ids: cochees, famille, numero: n });
      setBilan(`${r.ranges} personne(s) rangée(s) dans ${r.lot} : ${r.affectationsCreees} affectation(s) créée(s), visibles dans ce lot.`);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  if (bilan)
    return (
      <Modale titre="Personnes rangées" ouverte fermer={apres}>
        <Alerte ton="vert">{bilan}</Alerte>
        <p className="mt-3 text-[12px] text-zinc-500">
          Les personnes ajoutées à la main restent « à contrôler » dans la Base des recrutés tant qu’on n’a pas dit si elles sont déjà affectées.
        </p>
        <div className="mt-6 flex justify-end">
          <Bouton variante="principal" onClick={apres}>
            Fermer
          </Bouton>
        </div>
      </Modale>
    );

  return (
    <Modale titre="Ranger des personnes sans lot dans un lot" ouverte fermer={fermer} large>
      <p className="text-[13px] leading-relaxed text-zinc-600">
        Cochez les personnes, puis choisissez le lot de publication où les ranger. Elles entrent alors dans les notes de ce lot, selon leur diplôme. À faire
        quand vous connaissez le lot de leur texte de la FP.
      </p>
      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Segments
          valeur={famille}
          changer={setFamille}
          options={[
            { valeur: "ARRETE", libelle: "Arrêtés" },
            { valeur: "DECRET", libelle: "Décrets" },
          ]}
        />
        <Champ libelle="N° du lot" aide="Ex. VIII ou 8">
          <Saisie className="w-32" value={numero} onChange={(e) => setNumero(e.target.value)} list="lots-existants" placeholder="VIII" />
          <datalist id="lots-existants">
            {existants.map((l) => (
              <option key={l.numero} value={romain(l.numeroFichier!)}>
                {l.libelle}
              </option>
            ))}
          </datalist>
        </Champ>
        <span className="pb-2 text-[13px]">
          {numero.trim() && !n ? (
            <span className="text-rouge-600">Numéro illisible (ex. VIII ou 8)</span>
          ) : n ? (
            <>
              → <strong>{`${famille === "DECRET" ? "Décrets" : "Arrêtés"} — lot ${romain(n)}`}</strong>{" "}
              <span className="text-zinc-500">
                {existant ? `(déjà ${famille === "DECRET" ? existant.decrets : existant.arretes} personne(s))` : "(nouveau lot, créé à l’enregistrement)"}
              </span>
            </>
          ) : null}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Saisie className="max-w-sm" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher : nom, diplôme, département, n° de texte…" />
        <Bouton variante="secondaire" onClick={() => setCochees([...new Set([...cochees, ...visibles.map((p) => p.id)])])}>
          Tout cocher{mots.length ? " (résultats)" : ""}
        </Bouton>
        <Bouton variante="discret" onClick={() => setCochees([])}>
          Tout décocher
        </Bouton>
        <span className="ml-auto text-[12px] text-zinc-500">
          {cochees.length} cochée(s) sur {personnes.length}
        </span>
      </div>
      <div className="mt-2 max-h-96 space-y-1 overflow-auto">
        {visibles.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-start gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-[13px]">
            <input type="checkbox" className="mt-0.5" checked={cochees.includes(p.id)} onChange={() => basculer(p.id)} />
            <span>
              <strong>{p.nomComplet}</strong>
              <span className="text-zinc-500">
                {" "}
                · {p.liste} · {p.diplome ?? "—"}
                {p.departement ? ` · ${p.departement}` : ""}
                {p.numeroTexte ? ` · texte ${p.numeroTexte}` : " · sans n° de texte"}
                {p.lotIllisible ? ` · lot écrit « ${p.lotIllisible} » (illisible)` : ""}
                {p.oubli === "A_CONTROLER" ? " · oublié à contrôler" : ""}
              </span>
            </span>
          </label>
        ))}
        {!visibles.length && <p className="py-6 text-center text-[13px] text-zinc-400">Aucune personne ne correspond.</p>}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] text-zinc-400">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>Sans n° de texte, la personne est rangée mais reste bloquée dans les notes (« Numéro du texte manquant ») jusqu’à ce qu’on le saisisse.</span>
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton variante="principal" disabled={!cochees.length || !n || envoi} onClick={ranger}>
          <FolderInput /> Ranger {cochees.length || ""} personne(s) dans ce lot
        </Bouton>
      </div>
    </Modale>
  );
}
