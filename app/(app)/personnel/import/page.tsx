"use client";

import { Download, FileStack } from "lucide-react";
import { useRef, useState } from "react";
import { peutRecenser, useConfigRecensement } from "@/components/recensement/commun";
import { ImportFichier } from "@/components/recensement/import-fichier";
import { useSession } from "@/components/session";
import { Alerte, Badge, Bouton, Carte, Champ, EnTete, Liste, Tableau } from "@/components/ui";
import { api, qs } from "@/lib/api";

interface ResultatPieces {
  resultats: { fichier: string; ok: boolean; message: string }[];
  deposees: number;
  refusees: number;
}

const nf = new Intl.NumberFormat("fr-FR");

/** Modèle Excel, import (création et réactualisation), export pour corriger et dépôt de pièces en masse. */
export default function ImportRecensement() {
  const { profil } = useSession();
  const config = useConfigRecensement();
  const c = config.donnees?.configuration;
  const [statutModele, setStatutModele] = useState("");
  const scans = useRef<HTMLInputElement>(null);
  const [pieces, setPieces] = useState<ResultatPieces | null>(null);
  const [envoiPieces, setEnvoiPieces] = useState<string | null>(null);
  if (!peutRecenser(profil.role)) return <Alerte>Accès réservé aux agents de la DGRHAS, aux DDEPPSA et aux chefs d’établissement.</Alerte>;


  async function deposerPieces(liste: File[]) {
    setPieces(null);
    const total: ResultatPieces = { resultats: [], deposees: 0, refusees: 0 };
    // Par paquets de 20 : de gros dossiers de scans passent sans dépasser les limites d'envoi
    for (let i = 0; i < liste.length; i += 20) {
      setEnvoiPieces(`Envoi ${Math.min(i + 20, liste.length)} / ${liste.length}…`);
      const fd = new FormData();
      for (const f of liste.slice(i, i + 20)) fd.append("fichiers", f);
      try {
        const r = await api.post<ResultatPieces>("/recensement/pieces", fd);
        total.resultats.push(...r.resultats);
        total.deposees += r.deposees;
        total.refusees += r.refusees;
      } catch (x) {
        for (const f of liste.slice(i, i + 20)) total.resultats.push({ fichier: f.name, ok: false, message: (x as Error).message });
        total.refusees += Math.min(20, liste.length - i);
      }
    }
    setEnvoiPieces(null);
    setPieces(total);
  }

  return (
    <div className="space-y-6">
      <EnTete
        titre="Recensement : modèle Excel, import et scans"
        sousTitre="Le modèle Excel de la fiche de renseignements, l’import d’une liste (nouveaux agents ou corrections), et le dépôt des scans en masse."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Carte titre="1. Le modèle Excel à remplir">
          <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
            Envoyez ce modèle aux établissements : une ligne par agent, les mêmes colonnes que la fiche, des listes déroulantes pour les choix, les titres en rouge pour les rubriques obligatoires, et une feuille « Consignes » (format, exemple, pièces à joindre).
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Champ libelle="Pour quel type d’agent ?" aide="Les titres en rouge changent selon le type choisi." className="min-w-56">
              <Liste value={statutModele} onChange={(e) => setStatutModele(e.target.value)} vide="Tous les types" options={(c?.statuts ?? []).filter((s) => s.actif).map((s) => ({ valeur: s.code, libelle: s.libelle }))} />
            </Champ>
            <Bouton
              variante="principal"
              onClick={() =>
                api.telecharger(`/recensement/modele${qs({ statut: statutModele || undefined })}`, `Fiche de renseignements${statutModele ? ` - ${c?.statuts.find((s) => s.code === statutModele)?.libelle}` : ""}.xlsx`)
              }
            >
              <Download /> Télécharger le modèle
            </Bouton>
          </div>
        </Carte>
        <Carte titre="2. Les agents déjà recensés, pour les corriger">
          <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
            Le même modèle, déjà rempli avec les agents{profil.role === "STRUCTURE" ? " de votre établissement" : profil.role === "DDEPPSA" ? " de votre département" : ""} (avec leur n° de fiche). On corrige ou on complète, puis on l’importe ici : seules les cases remplies remplacent ce qui est connu. Pour n’exporter qu’une partie, filtrez la liste des agents puis « Excel ».
          </p>
          <div className="flex flex-wrap gap-2">
            <Bouton onClick={() => api.telecharger("/recensement/export", "Base du personnel.xlsx")}>
              <Download /> Tous les agents
            </Bouton>
            <Bouton onClick={() => api.telecharger("/recensement/export?complet=non", "Agents à compléter.xlsx")}>
              <Download /> Les fiches à compléter
            </Bouton>
          </div>
        </Carte>
      </div>

      <ImportFichier titre="3. Importer un fichier" />

      <Carte titre="4. Déposer beaucoup de scans d’un coup (facultatif)">
        <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-zinc-600">
          Pour <strong>un</strong> agent, le plus simple est d’ouvrir sa fiche et de cliquer « Déposer un scan » devant chaque pièce. Cette rubrique sert quand un établissement apporte
          <strong> les scans de beaucoup d’agents</strong> (une clé USB, un dossier) : au lieu de les déposer un par un, on les envoie tous ensemble, et le système range chaque
          scan dans la bonne fiche. Pour cela, il lit le <strong>nom du fichier</strong>.
        </p>
        <ol className="mb-5 space-y-4 text-[13px]">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marque-100 text-[12px] font-semibold text-marque-700">1</span>
            <div className="min-w-0 flex-1">
              <strong>Renommez chaque scan</strong> ainsi : <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px]">N° de fiche de l’agent</span> +{" "}
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px]">_</span> (tiret du bas) +{" "}
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px]">code de la pièce</span>. Le n° de fiche se trouve dans la liste des agents (colonne « N° fiche ») ou dans l’Excel exporté ; le matricule solde marche aussi.
              <div className="mt-3 overflow-x-auto">
                <Tableau>
                  <thead>
                    <tr>
                      <th>Nom du fichier</th>
                      <th>Ce que fait le système</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["REC-000123_CNI.pdf", "range la CNI dans la fiche REC-000123"],
                      ["REC-000123_ACTE_NAISSANCE.jpg", "range l’acte de naissance de l’agent REC-000123"],
                      ["REC-000123_ACTE_NAISSANCE_ENFANT_1.pdf", "acte de naissance de son 1er enfant"],
                      ["REC-000123_ACTE_NAISSANCE_ENFANT_2.pdf", "acte de naissance de son 2e enfant"],
                      ["179407Z_BULLETIN_SOLDE.pdf", "bulletin de solde de l’agent au matricule 179407Z"],
                    ].map(([n, x]) => (
                      <tr key={n}>
                        <td className="font-mono text-[12px] whitespace-nowrap">{n}</td>
                        <td className="text-[12px]">{x}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marque-100 text-[12px] font-semibold text-marque-700">2</span>
            <div className="min-w-0 flex-1">
              <strong>Le code de chaque pièce</strong> (à écrire après le tiret du bas) :
              {c && (
                <div className="mt-3 overflow-x-auto">
                  <Tableau>
                    <thead>
                      <tr>
                        <th>Pièce</th>
                        <th>Code à écrire dans le nom du fichier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.pieces
                        .filter((p) => p.actif)
                        .map((p) => (
                          <tr key={p.code}>
                            <td className="text-[12px]">{p.libelle}</td>
                            <td className="font-mono text-[12px] font-semibold">{p.code}</td>
                          </tr>
                        ))}
                    </tbody>
                  </Tableau>
                </div>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marque-100 text-[12px] font-semibold text-marque-700">3</span>
            <div className="min-w-0 flex-1">
              <strong>Cliquez « Choisir les scans »</strong>, ouvrez le dossier, sélectionnez tous les fichiers (Ctrl + A), puis « Ouvrir ». Le résultat s’affiche fichier par fichier : « rangée », ou « refusée » avec la raison (nom mal écrit, n° de fiche inconnu…). Un fichier refusé se renomme puis se redépose.
            </div>
          </li>
        </ol>
        <input
          ref={scans}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const l = [...(e.target.files ?? [])];
            e.target.value = "";
            if (l.length) void deposerPieces(l);
          }}
        />
        <Bouton variante="principal" disabled={!!envoiPieces} onClick={() => scans.current?.click()}>
          <FileStack /> {envoiPieces ?? "Choisir les scans"}
        </Bouton>
        {pieces && (
          <div className="mt-4 space-y-3">
            <Alerte ton={pieces.refusees ? "jaune" : "vert"}>
              {nf.format(pieces.deposees)} pièce(s) rangée(s){pieces.refusees ? `, ${nf.format(pieces.refusees)} refusée(s) : voir ci-dessous` : ""}.
            </Alerte>
            <Tableau>
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {pieces.resultats.map((r, i) => (
                  <tr key={i}>
                    <td className="text-[12px]">{r.fichier}</td>
                    <td className="text-[12px]">
                      <Badge ton={r.ok ? "vert" : "rouge"}>{r.ok ? "rangée" : "refusée"}</Badge> {r.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </div>
        )}
      </Carte>
    </div>
  );
}
