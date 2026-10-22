"use client";

import { KeyRound, Printer } from "lucide-react";
import { useState } from "react";
import { Alerte, Bouton, Champ, Modale, Saisie, Tableau } from "@/components/ui";
import { api } from "@/lib/api";

interface CodeCompte {
  id: string;
  nom: string;
  email: string;
  code: string | null;
}

type Demande = { action: "voir" | "regenerer"; ids?: string[]; libelle: string };

/**
 * Codes personnels (12 caractères) : voir ou régénérer le code d'un compte, ou de tous sauf le sien.
 * L'administrateur ou le DG confirme d'abord avec son mot de passe et son propre code.
 */
export function useCodesPersonnels(apres: () => void) {
  const [demande, setDemande] = useState<Demande | null>(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<{ action: Demande["action"]; liste: CodeCompte[] } | null>(null);

  function fermer() {
    setDemande(null);
    setMotDePasse("");
    setCode("");
    setErreur(null);
  }

  async function confirmer() {
    if (!demande) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const liste = await api.post<CodeCompte[]>("/utilisateurs/codes", { action: demande.action, ids: demande.ids, motDePasse, code });
      setResultat({ action: demande.action, liste });
      fermer();
      if (demande.action === "regenerer") apres();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  function imprimer() {
    if (!resultat) return;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const lignes = resultat.liste
      .map((c) => `<tr><td>${echapper(c.nom)}</td><td>${echapper(c.email)}</td><td class="code">${c.code ?? "—"}</td></tr>`)
      .join("");
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Codes personnels</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111} h1{font-size:18px} p{font-size:12px;color:#555}
      table{border-collapse:collapse;width:100%;font-size:13px} td,th{border:1px solid #999;padding:6px 8px;text-align:left}
      .code{font-family:Consolas,monospace;font-size:15px;letter-spacing:1px}
    </style></head><body><h1>Codes personnels de connexion</h1>
    <p>Document confidentiel. Remettez à chaque personne son code, en main propre, puis détruisez cette feuille.</p>
    <table><thead><tr><th>Nom</th><th>E-mail</th><th>Code</th></tr></thead><tbody>${lignes}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  const modales = (
    <>
      <Modale titre={demande?.action === "regenerer" ? "Régénérer des codes personnels" : "Voir des codes personnels"} ouverte={!!demande} fermer={fermer}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void confirmer();
          }}
        >
          <p className="text-[13px] leading-relaxed text-zinc-600">
            {demande?.libelle}
            {demande?.action === "regenerer" && (
              <>
                {" "}
                <strong>Les anciens codes ne marcheront plus</strong> : il faudra remettre le nouveau code à chaque personne concernée.
              </>
            )}
          </p>
          <p className="text-[13px] text-zinc-600">Pour continuer, confirmez que c’est bien vous :</p>
          <Champ libelle="Votre mot de passe">
            <Saisie type="password" autoComplete="current-password" autoFocus value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </Champ>
          <Champ libelle="Votre code personnel" aide="Laissez vide si votre compte n’a pas encore de code">
            <Saisie value={code} onChange={(e) => setCode(formater(e.target.value))} placeholder="XXXX-XXXX-XXXX" className="font-mono tracking-wider" />
          </Champ>
          {erreur && <Alerte>{erreur}</Alerte>}
          <div className="flex justify-end gap-2">
            <Bouton type="button" onClick={fermer}>
              Annuler
            </Bouton>
            <Bouton variante={demande?.action === "regenerer" ? "danger" : "principal"} type="submit" chargement={envoi} disabled={!motDePasse}>
              <KeyRound /> {demande?.action === "regenerer" ? "Régénérer" : "Afficher"}
            </Bouton>
          </div>
        </form>
      </Modale>
      <Modale titre={resultat?.action === "regenerer" ? "Nouveaux codes personnels" : "Codes personnels"} ouverte={!!resultat} fermer={() => setResultat(null)} large>
        {resultat && (
          <>
            <Alerte ton="jaune">
              Confidentiel : remettez à chaque personne <strong>son</strong> code en main propre. Il lui faudra son e-mail, son mot de passe et ce code pour se connecter.
            </Alerte>
            <div className="mt-3 max-h-[55vh] overflow-y-auto">
              <Tableau>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>E-mail</th>
                    <th>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {resultat.liste.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.nom}</td>
                      <td>{c.email}</td>
                      <td className="font-mono text-[15px] tracking-wider">{c.code ?? <span className="font-sans text-[12px] text-or-700">pas encore de code</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Bouton onClick={imprimer}>
                <Printer /> Imprimer
              </Bouton>
              <Bouton variante="principal" onClick={() => setResultat(null)}>
                Fermer
              </Bouton>
            </div>
          </>
        )}
      </Modale>
    </>
  );

  return { demander: setDemande, modales };
}

const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Majuscules et tirets ajoutés tout seuls : T3G8-GH6J-FG3U. */
export const formater = (v: string) =>
  v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12)
    .match(/.{1,4}/g)
    ?.join("-") ?? "";
