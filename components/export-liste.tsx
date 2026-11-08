"use client";

import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Bouton } from "@/components/ui";
import { api, qs } from "@/lib/api";

/**
 * Exporter une liste avec les filtres choisis à l'écran (DG, 08/11/2026) : en Excel, en Word, ou
 * la page imprimable (« Enregistrer en PDF » depuis l'impression). Le compte visiteur ne voit pas
 * ces boutons (il consulte sans imprimer ni télécharger).
 */
export function BarreExport({
  chemin,
  impression,
  filtres,
  nom,
  erreur,
}: {
  /** Adresse du serveur, sans le format (ex. « /etablissements/export »). */
  chemin: string;
  /** Page imprimable (ex. « /impression/ecoles »). */
  impression: string;
  filtres: Record<string, string | number | undefined | null>;
  /** Nom du fichier, sans la date ni l'extension. */
  nom: string;
  erreur: (message: string) => void;
}) {
  const { profil } = useSession();
  const [envoi, setEnvoi] = useState<"excel" | "word" | null>(null);
  if (profil.role === "VISITEUR") return null;
  const le = new Date().toLocaleDateString("fr-FR").replaceAll("/", "-");
  const telecharger = async (format: "excel" | "word") => {
    setEnvoi(format);
    try {
      await api.telecharger(`${chemin}/${format}${qs(filtres)}`, `${nom} ${le}.${format === "excel" ? "xlsx" : "docx"}`);
    } catch (e) {
      erreur((e as Error).message);
    } finally {
      setEnvoi(null);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bouton variante="discret" chargement={envoi === "excel"} disabled={!!envoi} onClick={() => telecharger("excel")} title="La liste en Excel, avec les filtres choisis">
        <FileSpreadsheet /> Excel
      </Bouton>
      <Bouton variante="discret" chargement={envoi === "word"} disabled={!!envoi} onClick={() => telecharger("word")} title="La liste en Word (modifiable), avec les filtres choisis">
        <FileText /> Word
      </Bouton>
      <Bouton
        variante="discret"
        onClick={() => window.open(`${impression}${qs(filtres)}`, "_blank")}
        title="Liste imprimable : en-tête du ministère, pages numérotées ; « Enregistrer en PDF » depuis l’impression"
      >
        <Printer /> Imprimer / PDF
      </Bouton>
    </div>
  );
}
