"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { NoteImprimable } from "@/components/note-imprimable";
import { StyleImpressionA4 } from "@/components/pages-a4";
import { Alerte, Bouton, Chargement } from "@/components/ui";
import { lireSession, useApi } from "@/lib/api";
import type { NoteDetail } from "@/lib/types";

export function Impression() {
  const { id } = useParams<{ id: string }>();
  const { donnees: note, erreur } = useApi<NoteDetail>(`/notes/${id}`);

  useEffect(() => {
    if (!lireSession().jeton) window.location.href = "/connexion";
  }, []);

  useEffect(() => {
    if (note) document.title = note.libelle;
  }, [note]);

  if (erreur) return <div className="p-6"><Alerte>{erreur}</Alerte></div>;
  if (!note) return <Chargement />;

  return (
    <div className="min-h-screen bg-zinc-200 py-6 print:bg-white print:py-0">
      <StyleImpressionA4 />
      <div className="no-print mx-auto mb-4 flex w-[210mm] items-center justify-between">
        <span className="text-sm text-zinc-700">
          {note.statut === "BROUILLON" || note.statut === "SOUMISE" ? "Projet de note (non validé par le DG)" : "Note validée"} — {note.contenu.total} agent(s)
        </span>
        <Bouton variante="principal" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </Bouton>
      </div>
      <p className="no-print mx-auto mb-4 w-[210mm] text-[12px] text-zinc-600">
        Les pages, le bas de page (objet de la note, « Page x sur y », MEPPSA) et les marges sont préparés par le système : imprimez tel quel, au format A4.
      </p>
      <NoteImprimable note={note} />
    </div>
  );
}
