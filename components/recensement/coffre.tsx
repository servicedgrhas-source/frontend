"use client";

import { Fingerprint, KeyRound, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Alerte, Bouton, Carte, Saisie } from "@/components/ui";
import { api, APPAREIL_A_EFFACER, APPAREIL_EFFACE, effacerAppareilMaintenant, fermerSession } from "@/lib/api";
import * as coffre from "@/lib/coffre-terrain";

/*
 * Protection des données gardées sur la tablette ou le téléphone (DG, 22/11/2026) : au premier
 * usage, le recenseur choisit un code ; ensuite il ouvre avec ce code, ou avec son doigt si
 * l'appareil a un lecteur d'empreinte. Sans l'un ou l'autre, ce qui est gardé reste illisible.
 */

type Etat =
  | { e: "chargement" }
  | { e: "nouveau" }
  | { e: "verrouille"; empreinte: boolean; identifiant: string; essais: number; aEffacer: boolean; finie: boolean; enAttente: number }
  | { e: "oubli"; identifiant: string; secours: boolean }
  | { e: "nouveauCode" }
  | { e: "autre"; identifiant: string }
  | { e: "efface"; pourquoi: string; fermer: boolean }
  | { e: "ouvert" };

/** La clé de secours de l'appareil (code oublié) : demandée au serveur une fois, avec le réseau. */
async function assurerSecours() {
  try {
    if (!navigator.onLine || (await coffre.aSecours())) return;
    const appareil = await coffre.identifiantAppareil();
    if (!appareil) return;
    const r = await api.post<{ cle: string }>("/recensement/terrain/cle-secours", { appareil });
    await coffre.enfermerSecours(r.cle);
  } catch {
    /* pas de réseau : redemandée à la prochaine ouverture */
  }
}

const EFFACE_DGRHAS =
  "À la demande de la DGRHAS, les données de cet appareil ont été effacées (ce qui attendait l’envoi est parti d’abord, s’il y avait du réseau).";

export function CoffreTerrain({ utilisateur, identifiant, children }: { utilisateur: string; identifiant: string; children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>({ e: "chargement" });
  const [code, setCode] = useState("");
  const [code2, setCode2] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [proposerEmpreinte, setProposerEmpreinte] = useState(false);

  // Coffre ouvert : si la DGRHAS a arrêté la mission entre-temps, ce qui attend part, puis tout s'efface
  const apresOuverture = async () => {
    if ((await coffre.lireMeta())?.effacementDemande) {
      await effacerAppareilMaintenant();
      return setEtat({ e: "efface", pourquoi: EFFACE_DGRHAS, fermer: false });
    }
    void assurerSecours();
    setEtat({ e: "ouvert" });
  };

  const relire = async () => {
    const fin = await coffre.effacerSiMissionFinie();
    if (fin === true) return setEtat({ e: "efface", pourquoi: "La mission est terminée et tout avait été envoyé : les données gardées sur cet appareil ont été effacées.", fermer: true });
    if (coffre.estOuvert()) return setEtat({ e: "ouvert" });
    // Revenu en moins de 5 minutes (page actualisée, application quittée un instant) : pas de code
    if (await coffre.reprendre(utilisateur)) return apresOuverture();
    const m = await coffre.lireMeta();
    if (!m) return setEtat({ e: "nouveau" });
    if (m.utilisateur !== utilisateur) return setEtat({ e: "autre", identifiant: m.identifiant });
    setEtat({ e: "verrouille", empreinte: !!m.parEmpreinte, identifiant: m.identifiant, essais: m.essais, aEffacer: !!m.effacementDemande, finie: fin === "a_envoyer", enAttente: m.enAttente ?? 0 });
  };
  // La mémoire de l'appareil est pleine : on le dit, tant que ce n'est pas réglé
  const [pleine, setPleine] = useState(false);
  useEffect(() => {
    const f = () => setPleine(true);
    window.addEventListener(coffre.MEMOIRE_PLEINE, f);
    return () => window.removeEventListener(coffre.MEMOIRE_PLEINE, f);
  }, []);
  useEffect(() => {
    // (lecture asynchrone de la mémoire de l'appareil : l'état change après, pas pendant l'effet)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void relire();
    // Effacement demandé par la DGRHAS : le compte continue ; fin de mission : le compte se ferme
    const efface = (e: Event) => {
      const d = (e as CustomEvent<{ message?: string; fermer?: boolean } | undefined>).detail;
      setEtat({ e: "efface", pourquoi: d?.message || EFFACE_DGRHAS, fermer: !!d?.fermer });
    };
    window.addEventListener(APPAREIL_EFFACE, efface);
    // Mission arrêtée pendant que le coffre est fermé : l'écran le dit
    const aEffacer = () => void relire();
    window.addEventListener(APPAREIL_A_EFFACER, aEffacer);
    // Verrouillé après 5 minutes sans être regardé (appareil posé, oublié, pris) ; moins : rien à retaper
    let cache = 0;
    const vu = () => {
      if (document.visibilityState === "hidden") {
        cache = Date.now();
        void coffre.noterVu();
      } else if (cache && Date.now() - cache > coffre.REPRISE_MS && coffre.estOuvert()) void coffre.verrouiller().then(relire);
      else void coffre.noterVu();
    };
    document.addEventListener("visibilitychange", vu);
    const regarde = setInterval(() => {
      if (document.visibilityState === "visible") void coffre.noterVu();
    }, 30_000);
    const auRevoir = () => {
      void coffre.noterVu();
      void coffre.vider();
    };
    window.addEventListener("pagehide", auRevoir);
    return () => {
      window.removeEventListener(APPAREIL_EFFACE, efface);
      window.removeEventListener(APPAREIL_A_EFFACER, aEffacer);
      document.removeEventListener("visibilitychange", vu);
      clearInterval(regarde);
      window.removeEventListener("pagehide", auRevoir);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur]);

  const agir = async (f: () => Promise<void>) => {
    setOccupe(true);
    setErreur(null);
    try {
      await f();
    } catch (e) {
      setErreur((e as Error).message || "Opération impossible.");
    } finally {
      setOccupe(false);
    }
  };

  const cadre = (titre: string, contenu: ReactNode) => (
    <div className="mx-auto max-w-md space-y-3 pt-4">
      <Carte titre={titre}>
        <div className="space-y-3 text-[14px]">
          {erreur && <Alerte>{erreur}</Alerte>}
          {contenu}
        </div>
      </Carte>
    </div>
  );

  if (etat.e === "chargement") return <p className="p-4 text-[14px] text-zinc-500">Ouverture des données de l’appareil…</p>;
  if (etat.e === "ouvert")
    return (
      <>
        {pleine && (
          <div className="mb-3">
            <Alerte>
              <strong>La mémoire de cet appareil est pleine.</strong> Ce que vous saisissez maintenant n’est plus gardé si l’application se ferme. Avec le réseau, appuyez sur « Envoyer » tout de suite ; puis libérez de la place (photos, vidéos, applications inutiles) et rouvrez cette page.
            </Alerte>
          </div>
        )}
        {proposerEmpreinte && <ProposerEmpreinte fermer={() => setProposerEmpreinte(false)} />}
        {children}
      </>
    );

  // Code oublié : le mot de passe du compte (avec le réseau) rouvre les données
  if (etat.e === "oubli")
    return cadre(
      "Code oublié",
      etat.secours ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!navigator.onLine) return setErreur("Il faut du réseau : le mot de passe est vérifié par la DGRHAS. Vos données restent gardées, chiffrées.");
            void agir(async () => {
              const appareil = await coffre.identifiantAppareil();
              const r = await api.post<{ cle: string }>("/recensement/terrain/cle-secours/recuperer", { appareil, motDePasse: code });
              setCode("");
              await coffre.ouvrirAvecSecours(r.cle);
              setEtat({ e: "nouveauCode" });
            });
          }}
        >
          <p>
            Tapez le <strong>mot de passe de votre compte</strong> (celui de la connexion, remis par la DGRHAS), pas le code de l’appareil. Vos données s’ouvrent, puis vous choisissez un nouveau code.
          </p>
          <Saisie type="password" autoComplete="current-password" autoFocus placeholder="Mot de passe du compte" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 w-full text-[16px]" />
          <div className="flex flex-wrap gap-2">
            <Bouton type="submit" variante="principal" chargement={occupe} disabled={!code}>
              <KeyRound /> Rouvrir mes données
            </Bouton>
            <Bouton type="button" onClick={() => (setErreur(null), setCode(""), void relire())}>
              Retour
            </Bouton>
          </div>
          <p className="text-[12px] text-zinc-500">Mot de passe oublié aussi ? La DGRHAS vous en donne un nouveau (page des recenseurs), puis revenez ici.</p>
        </form>
      ) : (
        <>
          <p>
            Cet appareil n’a pas de clé de secours (il n’avait pas de réseau à son premier usage). Sans le code, les données gardées ici ne peuvent pas être rouvertes.
          </p>
          <p className="text-[13px] text-zinc-600">Essayez encore de vous souvenir du code. Si tout avait déjà été envoyé, vous pouvez effacer et recommencer : la base se retélécharge avec le réseau.</p>
          <div className="flex flex-wrap gap-2">
            <Bouton onClick={() => (setErreur(null), void relire())}>Retour</Bouton>
            <Bouton
              variante="danger"
              chargement={occupe}
              onClick={() =>
                confirm("Effacer les données de cet appareil et recommencer ? Ce qui n’a pas été envoyé sera perdu.") &&
                void agir(async () => {
                  await coffre.effacerTout();
                  await relire();
                })
              }
            >
              <Trash2 /> Effacer et recommencer
            </Bouton>
          </div>
        </>
      ),
    );

  // Après « code oublié » : le nouveau code, tout de suite
  if (etat.e === "nouveauCode")
    return cadre(
      "Choisissez un nouveau code",
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code !== code2) return setErreur("Les deux codes ne sont pas pareils.");
          void agir(async () => {
            await coffre.changerCode(code);
            setCode("");
            setCode2("");
            await apresOuverture();
          });
        }}
      >
        <p className="text-marque-700">Vos données sont rouvertes. Choisissez un nouveau code (6 chiffres au moins) et retenez-le.</p>
        <Saisie type="password" inputMode="numeric" autoComplete="new-password" autoFocus placeholder="Nouveau code" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 w-full text-[18px] tracking-widest" />
        <Saisie type="password" inputMode="numeric" autoComplete="new-password" placeholder="Le même code, encore une fois" value={code2} onChange={(e) => setCode2(e.target.value)} className="h-12 w-full text-[18px] tracking-widest" />
        <Bouton type="submit" variante="principal" chargement={occupe} disabled={!coffre.codeAcceptable(code)}>
          <KeyRound /> Enregistrer ce code
        </Bouton>
      </form>,
    );

  if (etat.e === "efface" && !etat.fermer)
    return cadre(
      "Données effacées",
      <>
        <p>{etat.pourquoi}</p>
        <p className="text-zinc-500">Votre compte continue, avec le même code. En continuant, la base de votre mission se télécharge de nouveau (gardez le réseau).</p>
        <Bouton
          variante="principal"
          // La page repart de zéro (rien de l'ancienne mémoire de la page ne survit) : l'appareil se
          // rouvre (ou demande le code), puis la base se télécharge de nouveau
          onClick={() => window.location.reload()}
        >
          Continuer
        </Bouton>
      </>,
    );
  if (etat.e === "efface")
    return cadre(
      "Données effacées",
      <>
        <p>{etat.pourquoi}</p>
        <p className="text-zinc-500">Le compte est fermé sur cet appareil : il peut servir à un autre recenseur, qui se connecte avec son identifiant.</p>
        <Bouton
          onClick={() => {
            // Plus rien du recenseur ne reste : ni ses données, ni sa session (jeton, profil)
            fermerSession();
            window.location.replace("/connexion");
          }}
        >
          Continuer
        </Bouton>
      </>,
    );

  if (etat.e === "autre")
    return cadre(
      "Appareil d’un autre recenseur",
      <>
        <p>
          Cet appareil garde les données de <strong>{etat.identifiant}</strong>. Il doit d’abord se connecter et tout envoyer. Si ce n’est plus possible, la DGRHAS peut effacer ces données ici (ce qui n’est pas envoyé sera perdu).
        </p>
        <Bouton
          variante="danger"
          chargement={occupe}
          onClick={() =>
            confirm(`Effacer toutes les données de ${etat.identifiant} sur cet appareil ? Ce qui n’a pas été envoyé sera perdu.`) &&
            void agir(async () => {
              await coffre.effacerTout();
              await relire();
            })
          }
        >
          <Trash2 /> Effacer ces données
        </Bouton>
      </>,
    );

  if (etat.e === "nouveau")
    return cadre(
      "Protéger les données de cet appareil",
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code !== code2) return setErreur("Les deux codes ne sont pas pareils.");
          void agir(async () => {
            await coffre.creer(code, utilisateur, identifiant);
            setCode("");
            setCode2("");
            setProposerEmpreinte(await coffre.lecteurDisponible());
            void assurerSecours();
            setEtat({ e: "ouvert" });
          });
        }}
      >
        <p>
          <ShieldCheck className="mr-1 inline size-4 text-marque-600" />
          Les écoles et les agents seront gardés sur cet appareil, <strong>chiffrés</strong>. Choisissez un code d’au moins 6 chiffres : il sera demandé pour les ouvrir. Ne le donnez à personne.
        </p>
        <p className="text-[12px] text-zinc-500">Évitez 123456 ou votre date de naissance. Code oublié un jour ? Le mot de passe de votre compte permettra de rouvrir vos données (avec le réseau).</p>
        <Saisie type="password" inputMode="numeric" autoComplete="new-password" autoFocus placeholder="Code (6 chiffres au moins)" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 w-full text-[18px] tracking-widest" />
        <Saisie type="password" inputMode="numeric" autoComplete="new-password" placeholder="Le même code, encore une fois" value={code2} onChange={(e) => setCode2(e.target.value)} className="h-12 w-full text-[18px] tracking-widest" />
        <Bouton type="submit" variante="principal" chargement={occupe} disabled={!coffre.codeAcceptable(code)}>
          <KeyRound /> Créer mon code
        </Bouton>
      </form>,
    );

  // Verrouillé
  return cadre(
    "Ouvrir les données de l’appareil",
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void agir(async () => {
          const r = await coffre.ouvrirAvecCode(code);
          setCode("");
          if (r.ok) return apresOuverture();
          if (!r.restants) return setEtat({ e: "efface", pourquoi: `${coffre.ESSAIS_MAX} codes faux d’affilée : par sécurité, les données gardées sur cet appareil ont été effacées. Choisissez un nouveau code : la base se retéléchargera.`, fermer: false });
          setErreur(`Code faux. Encore ${r.restants} essai(s) ; ensuite, tout ce qui est gardé ici sera effacé.${r.restants <= 5 ? " Vous ne vous en souvenez pas ? « J’ai oublié mon code » ci-dessous, au lieu de deviner." : ""}`);
          setEtat({ ...etat, essais: coffre.ESSAIS_MAX - r.restants });
        });
      }}
    >
      <p className="text-zinc-600">
        <Lock className="mr-1 inline size-4" />
        Données de <strong>{etat.identifiant}</strong>, chiffrées sur cet appareil.
      </p>
      {etat.aEffacer && (
        <Alerte>
          La DGRHAS a arrêté la mission de ce compte. Ouvrez avec votre code : ce qui attend sera envoyé, puis tout ce qui est gardé ici sera effacé.
        </Alerte>
      )}
      {!etat.aEffacer && etat.finie && (
        <Alerte>
          Votre mission est terminée, mais {etat.enAttente} ligne(s) n’ont pas encore été envoyées. Ouvrez avec votre code et connectez-vous au réseau : elles partiront, puis l’appareil s’effacera. Si la connexion est refusée (accès terminé), appelez la DGRHAS pour prolonger votre accès.
        </Alerte>
      )}
      {etat.empreinte && (
        <Bouton
          type="button"
          variante="principal"
          chargement={occupe}
          className="h-14 w-full text-[16px]"
          onClick={() =>
            void agir(async () => {
              await coffre.ouvrirAvecEmpreinte();
              await apresOuverture();
            })
          }
        >
          <Fingerprint className="size-6" /> Ouvrir avec mon empreinte
        </Bouton>
      )}
      <Saisie type="password" inputMode="numeric" autoComplete="current-password" autoFocus={!etat.empreinte} placeholder={etat.empreinte ? "… ou tapez votre code" : "Votre code"} value={code} onChange={(e) => setCode(e.target.value)} className="h-12 w-full text-[18px] tracking-widest" />
      <Bouton type="submit" variante={etat.empreinte ? "secondaire" : "principal"} chargement={occupe} disabled={!code}>
        <KeyRound /> Ouvrir avec le code
      </Bouton>
      {etat.essais > 0 && <p className="text-[12px] text-rouge-700">{etat.essais} code(s) faux déjà ; au {coffre.ESSAIS_MAX}e, tout est effacé.</p>}
      <button
        type="button"
        className="cursor-pointer text-[13px] font-medium text-marque-700 hover:underline"
        onClick={() =>
          void coffre.aSecours().then((secours) => {
            setErreur(null);
            setCode("");
            setEtat({ e: "oubli", identifiant: etat.identifiant, secours });
          })
        }
      >
        J’ai oublié mon code
      </button>
      {etat.aEffacer && (
        <Bouton
          type="button"
          variante="danger"
          chargement={occupe}
          onClick={() =>
            confirm("Effacer tout de suite, sans envoyer ce qui attend ? Ce qui n’a pas été envoyé sera perdu.") &&
            void agir(async () => {
              await coffre.effacerDonnees();
              await api.post("/recensement/terrain/mission/efface", {}).catch(() => undefined);
              setEtat({ e: "efface", pourquoi: "Les données de cet appareil ont été effacées, à la demande de la DGRHAS.", fermer: false });
            })
          }
        >
          <Trash2 /> Effacer sans envoyer
        </Bouton>
      )}
    </form>,
  );
}

/** Juste après le code : proposer l'empreinte si l'appareil a un lecteur. */
function ProposerEmpreinte({ fermer }: { fermer: () => void }) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <div className="mb-3 space-y-2 rounded-xl border border-marque-200 bg-marque-50/60 p-3 text-[14px]">
      <div className="flex items-center gap-2 font-medium">
        <Fingerprint className="size-5 text-marque-600" /> Cet appareil a un lecteur d’empreinte
      </div>
      <p className="text-zinc-600">Ouvrir aussi avec le doigt, plus vite que le code ? L’empreinte reste dans l’appareil : elle n’est jamais envoyée.</p>
      {erreur && <Alerte ton="jaune">{erreur}</Alerte>}
      <div className="flex flex-wrap gap-2">
        <Bouton
          variante="principal"
          chargement={occupe}
          onClick={async () => {
            setOccupe(true);
            setErreur(null);
            try {
              await coffre.activerEmpreinte();
              fermer();
            } catch (e) {
              setErreur((e as Error).message);
            } finally {
              setOccupe(false);
            }
          }}
        >
          <Fingerprint /> Oui, avec mon empreinte
        </Bouton>
        <Bouton variante="discret" onClick={fermer}>
          Plus tard (le code suffit)
        </Bouton>
      </div>
    </div>
  );
}

/** Réglages de l'appareil, coffre ouvert : empreinte, changer le code, verrouiller. */
export function ReglagesAppareil() {
  const [empreinte, setEmpreinte] = useState<boolean | null>(null);
  const [lecteur, setLecteur] = useState(false);
  const [message, setMessage] = useState<{ ton: "vert" | "rouge" | "jaune"; texte: string } | null>(null);
  const [nouveau, setNouveau] = useState("");
  useEffect(() => {
    void coffre.lireMeta().then((m) => setEmpreinte(!!m?.parEmpreinte));
    void coffre.lecteurDisponible().then(setLecteur);
  }, []);
  const faire = async (f: () => Promise<void>, ok: string) => {
    setMessage(null);
    try {
      await f();
      setMessage({ ton: "vert", texte: ok });
      setEmpreinte(!!(await coffre.lireMeta())?.parEmpreinte);
    } catch (e) {
      setMessage({ ton: "rouge", texte: (e as Error).message });
    }
  };
  return (
    <Carte titre="Cet appareil">
      <div className="space-y-3 text-[13px]">
        <p className="text-zinc-600">
          <ShieldCheck className="mr-1 inline size-4 text-marque-600" />
          Tout ce qui est gardé ici est chiffré : il faut votre code{empreinte ? " ou votre empreinte" : ""} pour l’ouvrir. Page actualisée ou application quittée moins de 5 minutes : rien à retaper. Au-delà, il se verrouille.
        </p>
        {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}
        <div className="flex flex-wrap gap-2">
          {lecteur && !empreinte && (
            <Bouton onClick={() => void faire(coffre.activerEmpreinte, "Empreinte activée : la prochaine fois, posez le doigt.")}>
              <Fingerprint /> Ouvrir aussi avec mon empreinte
            </Bouton>
          )}
          {empreinte && (
            <Bouton variante="discret" onClick={() => void faire(coffre.retirerEmpreinte, "Empreinte retirée : seul le code ouvre les données.")}>
              <Fingerprint /> Ne plus ouvrir avec l’empreinte
            </Bouton>
          )}
          {!lecteur && <span className="text-zinc-500">Pas de lecteur d’empreinte utilisable sur cet appareil : le code suffit.</span>}
          <Bouton variante="discret" onClick={() => void coffre.verrouiller().then(() => window.location.reload())}>
            <Lock /> Verrouiller maintenant
          </Bouton>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void faire(() => coffre.changerCode(nouveau), "Nouveau code enregistré.").then(() => setNouveau(""));
          }}
        >
          <Saisie type="password" inputMode="numeric" autoComplete="new-password" placeholder="Nouveau code (6 chiffres au moins)" value={nouveau} onChange={(e) => setNouveau(e.target.value)} className="w-56" />
          <Bouton type="submit" disabled={!coffre.codeAcceptable(nouveau)}>
            <KeyRound /> Changer le code
          </Bouton>
        </form>
      </div>
    </Carte>
  );
}
