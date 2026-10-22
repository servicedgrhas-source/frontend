"use client";

import { PencilLine } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Aide, Alerte, Annonce, Badge, Bouton, BoutonIcone, Carte, Champ, Chargement, EnTete, Liste, Modale, Saisie, Tableau, Zone } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { peut } from "@/lib/libelles";

interface Type {
  code: string;
  numero: number;
  libelle: string;
  acte: string | null;
  pieces: string[];
  circuitExterne: boolean;
  etapesInternes: string[];
  decision: string;
  decisionTexte: string | null;
  motifMutation: string | null;
  actif: boolean;
}

const DECISION: Record<string, string> = {
  LIEU_SERVICE: "Lieu de service",
  DDEPPSA: "Directeur départemental (DDEPPSA)",
  DGRHAS: "DGRHAS",
};

const mutation = (t: Type) => t.code.startsWith("MUTATION") || t.code === "PERMUTATION";

/** Catalogue des prestations : pour chaque demande, les pièces exigées, le circuit et le décideur final. */
export default function Prestations() {
  const { profil } = useSession();
  const types = useApi<Type[]>("/prestations");
  const [edition, setEdition] = useState<Type | null>(null);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge"; texte: string } | null>(null);
  if (!peut.traiter(profil.role)) return <Alerte>Accès réservé à la DGRHAS.</Alerte>;
  const dg = peut.parametrer(profil.role);

  return (
    <div className="space-y-5">
      <EnTete
        titre="Catalogue des prestations"
        sousTitre="Toutes les demandes que les agents peuvent faire (document « Circuits d’approbation des demandes de prestation »). Pour l’instant, seules les demandes de mutation sont ouvertes sur le portail."
      />
      <Annonce ton={message?.ton} fermer={() => setMessage(null)}>
        {message?.texte}
      </Annonce>
      <Carte titre="Types de demandes">
        {!types.donnees ? (
          <Chargement />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th className="w-10">N°</th>
                <th>Prestation · acte délivré</th>
                <th>Circuit</th>
                <th>
                  <span className="inline-flex items-center gap-1">
                    Décision <Aide>Là où le document dit « DGRHAS-Ministre », le circuit s’arrête au DGRHAS : la décision du Ministre est sa signature.</Aide>
                  </span>
                </th>
                <th>Ouverte</th>
                {dg && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {types.donnees.map((t) => (
                <tr key={t.code}>
                  <td className="tabular-nums text-zinc-400">{t.numero || "—"}</td>
                  <td>
                    <div className="font-medium">{t.libelle}</div>
                    <div className="text-[11px] text-zinc-400">
                      {t.acte} · {t.pieces.length} pièce(s)
                    </div>
                  </td>
                  <td className="text-[12px]">
                    {t.circuitExterne ? "Voie hiérarchique" : "—"}
                    {t.etapesInternes.length > 0 && <div className="text-zinc-500">DGRHAS : {t.etapesInternes.join(" → ")}</div>}
                  </td>
                  <td className="text-[12px]">{t.decisionTexte ?? DECISION[t.decision]}</td>
                  <td>{t.actif ? <Badge ton="vert">ouverte</Badge> : <Badge>plus tard</Badge>}</td>
                  {dg && (
                    <td>
                      <BoutonIcone libelle="Modifier" onClick={() => setEdition(t)}>
                        <PencilLine />
                      </BoutonIcone>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Carte>
      {edition && (
        <EditionType
          t={edition}
          fermer={() => setEdition(null)}
          apres={() => {
            setEdition(null);
            setMessage({ ton: "vert", texte: "Prestation enregistrée." });
            types.recharger();
          }}
        />
      )}
    </div>
  );
}

function EditionType({ t, fermer, apres }: { t: Type; fermer: () => void; apres: () => void }) {
  const [f, setF] = useState({
    libelle: t.libelle,
    pieces: t.pieces.join("\n"),
    circuitExterne: t.circuitExterne,
    etapesInternes: t.etapesInternes.join(", "),
    decision: t.decision,
    actif: t.actif,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <Modale titre={`Modifier : ${t.libelle}`} ouverte large fermer={fermer}>
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Champ libelle="Intitulé">
          <Saisie value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} />
        </Champ>
        <Champ libelle="Pièces exigées (une par ligne)" aide="Elles s’affichent comme une liste à cocher dans le formulaire de demande.">
          <Zone rows={7} value={f.pieces} onChange={(e) => setF({ ...f, pieces: e.target.value })} />
        </Champ>
        <div className="grid gap-3 md:grid-cols-2">
          <Champ libelle="Décideur final">
            <Liste value={f.decision} onChange={(e) => setF({ ...f, decision: e.target.value })} options={Object.entries(DECISION).map(([k, v]) => ({ valeur: k, libelle: v }))} />
          </Champ>
          <Champ libelle="Étapes à la DGRHAS (sigles, dans l’ordre)" aide="Ex. BMP, SR, DRSC, DGRHAS (le dernier décide)">
            <Saisie value={f.etapesInternes} disabled={f.decision !== "DGRHAS"} onChange={(e) => setF({ ...f, etapesInternes: e.target.value })} />
          </Champ>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={f.circuitExterne} onChange={(e) => setF({ ...f, circuitExterne: e.target.checked })} /> Passe par la voie hiérarchique (établissement, inspection,
          DDEPPSA…)
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" disabled={!mutation(t)} checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Ouverte aux demandes
          {!mutation(t) && <span className="text-zinc-400">(seules les mutations pour l’instant)</span>}
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Bouton onClick={fermer}>Annuler</Bouton>
        <Bouton
          variante="principal"
          onClick={async () => {
            try {
              await api.put(`/prestations/${t.code}`, {
                libelle: f.libelle,
                pieces: f.pieces.split("\n").map((x) => x.trim()).filter(Boolean),
                circuitExterne: f.circuitExterne,
                etapesInternes: f.etapesInternes.split(/[,→>]/).map((x) => x.trim()).filter(Boolean),
                decision: f.decision,
                actif: f.actif,
              });
              apres();
            } catch (e) {
              setErreur((e as Error).message);
            }
          }}
        >
          Enregistrer
        </Bouton>
      </div>
    </Modale>
  );
}
