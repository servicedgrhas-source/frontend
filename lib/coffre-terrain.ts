/*
 * Coffre de l'appareil pour le recensement sur le terrain (DG, 22/11/2026).
 *
 * Tout ce que la mission garde sur la tablette ou le téléphone (écoles, agents, enfants, liste
 * nationale) est CHIFFRÉ (AES-GCM 256) dans la grande mémoire du navigateur (IndexedDB) :
 *
 * - une clé des données, tirée au hasard, chiffre chaque enregistrement ;
 * - cette clé est elle-même enfermée avec le CODE de l'appareil choisi par le recenseur : la clé
 *   qui l'ouvre est tirée du code et d'un SEL (16 octets au hasard, propre à cet appareil) par
 *   PBKDF2-SHA256 (310 000 tours). Sans le code, ce qui est gardé est illisible ;
 * - si l'appareil a un lecteur d'empreinte qui sait donner un secret (WebAuthn, extension PRF),
 *   la même clé est aussi enfermée avec ce secret : le doigt ouvre le coffre. L'empreinte ne
 *   quitte jamais l'appareil et le serveur ne la voit jamais. Sinon, le code suffit.
 * - 10 codes faux d'affilée : tout est effacé.
 * - CODE OUBLIÉ : la même clé est enfermée une troisième fois avec une clé de secours que le
 *   serveur garde pour cet appareil ; il ne la rend qu'avec le MOT DE PASSE du compte (pas avec la
 *   seule session). Le recenseur rouvre ainsi ses données, puis choisit un nouveau code.
 * - Fin de mission : l'appareil ne s'efface jamais tout seul tant que des lignes attendent l'envoi
 *   (sauf 30 jours après la fin) ; et pas si sa date semble fausse.
 *
 * Une fois ouvert, le coffre est lu en mémoire : `lire` et `ecrire` sont immédiats ; l'écriture
 * chiffrée suit en arrière-plan.
 */

const BASE = "dgrhas-terrain";
const DONNEES = "donnees";
const META = "meta";
const TOURS = 310_000;
export const ESSAIS_MAX = 10;
/** Anciennes données en clair (avant le coffre), reprises puis retirées. */
const ANCIEN_PREFIXE = "dgrhas:terrain:";

interface Chiffre {
  iv: Uint8Array;
  data: ArrayBuffer;
}
export interface MetaCoffre {
  sel: Uint8Array;
  tours: number;
  /** La clé des données, enfermée avec la clé tirée du code. */
  parCode: Chiffre;
  /**
   * La même, ouverte par l'empreinte (si activée). Deux façons, selon le téléphone :
   * - « secret » : le lecteur donne un secret tiré du doigt (WebAuthn PRF), qui l'enferme ;
   * - « verrou » : le lecteur ne sait pas donner de secret (beaucoup d'Android) : une clé propre à
   *   l'appareil, impossible à extraire, l'enferme, et ne sert qu'après que le téléphone a vérifié
   *   le doigt.
   */
  parEmpreinte?: Chiffre & { credential: Uint8Array; selPrf: Uint8Array; mode?: "secret" | "verrou"; cleAppareil?: CryptoKey };
  essais: number;
  /** Compte à qui appartient ce coffre (un autre compte ne l'ouvre pas). */
  utilisateur: string;
  /** Identifiant affiché (RG-001-BZ, ou l'adresse). */
  identifiant: string;
  /** Jour (AAAA-MM-JJ) après lequel l'appareil efface tout (fin de mission + 2 jours). */
  effacerApres?: string | null;
  /**
   * La DGRHAS a arrêté la mission alors que le coffre était fermé : à l'ouverture par le code (ou
   * le doigt), ce qui attend est envoyé, puis tout est effacé.
   */
  effacementDemande?: boolean;
  /** Identifiant de cet appareil (pour sa clé de secours). */
  appareil?: string;
  /** La clé des données, enfermée avec la clé de secours (gardée par le serveur). */
  parSecours?: Chiffre;
  /** Lignes qui attendent l'envoi (lu sans ouvrir le coffre : pas d'effacement qui les perdrait). */
  enAttente?: number;
  /** Dernier jour donné par le serveur (une date d'appareil très loin de lui est fausse). */
  dernierServeur?: string;
}

/** Événement : la mémoire de l'appareil est pleine, ce qui est saisi n'est plus gardé. */
export const MEMOIRE_PLEINE = "dgrhas:memoire-pleine";

const enc = new TextEncoder();
const dec = new TextDecoder();

function ouvrirBase(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore(DONNEES);
      r.result.createObjectStore(META);
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error ?? new Error("Mémoire de l’appareil indisponible."));
  });
}

let base: Promise<IDBDatabase> | null = null;
const db = () => (base ??= ouvrirBase());

function requete<T>(magasin: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((ok, ko) => {
        const t = d.transaction(magasin, mode);
        const r = f(t.objectStore(magasin));
        t.oncomplete = () => ok(r.result as T);
        t.onerror = () => ko(t.error ?? new Error("Écriture impossible sur l’appareil (mémoire pleine ?)."));
      }),
  );
}

export const lireMeta = () => requete<MetaCoffre | undefined>(META, "readonly", (s) => s.get("coffre")).catch(() => undefined);
const ecrireMeta = (m: MetaCoffre) => requete(META, "readwrite", (s) => s.put(m, "coffre"));

/* ------------------------------ Chiffrement ------------------------------ */

const aleatoire = (n: number) => crypto.getRandomValues(new Uint8Array(n));
/** Un identifiant au hasard (randomUUID manque sur les navigateurs Android anciens). */
const nouvelIdentifiant = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Array.from(aleatoire(16), (b) => b.toString(16).padStart(2, "0")).join(""));

async function cleDuCode(code: string, sel: Uint8Array, tours: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sel as BufferSource, iterations: tours, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const cleBrute = (octets: ArrayBuffer | Uint8Array, usages: KeyUsage[] = ["encrypt", "decrypt"]) => crypto.subtle.importKey("raw", octets as BufferSource, { name: "AES-GCM" }, false, usages);

async function chiffrer(cle: CryptoKey, octets: Uint8Array | ArrayBuffer): Promise<Chiffre> {
  const iv = aleatoire(12);
  return { iv, data: await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, cle, octets as BufferSource) };
}
const dechiffrer = (cle: CryptoKey, c: Chiffre) => crypto.subtle.decrypt({ name: "AES-GCM", iv: c.iv as BufferSource }, cle, c.data);

/* ------------------------------ État en mémoire ------------------------------ */

let cleDonnees: CryptoKey | null = null;
let brute: Uint8Array | null = null;
const memoire = new Map<string, unknown>();
const enAttente = new Map<string, ReturnType<typeof setTimeout>>();
const ecouteurs = new Set<() => void>();

export const estOuvert = () => !!cleDonnees;
export const surChangement = (f: () => void) => {
  ecouteurs.add(f);
  return () => void ecouteurs.delete(f);
};
const prevenir = () => ecouteurs.forEach((f) => f());

/** Lire une valeur du coffre ouvert (immédiat). */
export function lire<T>(cle: string): T | null {
  return (memoire.get(cle) as T | undefined) ?? null;
}

/** Les clés du coffre qui commencent ainsi (« ecole: »…). */
export const cles = (prefixe: string) => [...memoire.keys()].filter((k) => k.startsWith(prefixe));

/** Écrire (null efface) : la mémoire tout de suite, l'appareil (chiffré) peu après. */
export function ecrire(cle: string, v: unknown) {
  if (!cleDonnees) return;
  if (v === null || v === undefined) memoire.delete(cle);
  else memoire.set(cle, v);
  clearTimeout(enAttente.get(cle));
  enAttente.set(
    cle,
    setTimeout(() => void enregistrer(cle), 250),
  );
}

async function enregistrer(cle: string) {
  enAttente.delete(cle);
  const k = cleDonnees;
  if (!k) return;
  const v = memoire.get(cle);
  try {
    if (v === undefined) await requete(DONNEES, "readwrite", (s) => s.delete(cle));
    else {
      const c = await chiffrer(k, enc.encode(JSON.stringify(v)));
      await requete(DONNEES, "readwrite", (s) => s.put(c, cle));
    }
  } catch {
    // Mémoire pleine : la valeur reste en mémoire tant que la page est ouverte. On le DIT tout de
    // suite (sinon, l'application fermée, la saisie serait perdue sans que personne le sache)
    if (typeof window !== "undefined") window.dispatchEvent(new Event(MEMOIRE_PLEINE));
  }
}

/** Demander au navigateur de ne jamais effacer ces données pour faire de la place (Android). */
async function garderDurablement() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* non disponible */
  }
}
/** Tout écrire maintenant (avant de fermer, d'effacer ou de verrouiller). */
export async function vider() {
  const liste = [...enAttente.keys()];
  liste.forEach((k) => clearTimeout(enAttente.get(k)));
  await Promise.all(liste.map(enregistrer));
}

async function chargerTout(k: CryptoKey) {
  const d = await db();
  const paires = await new Promise<[string, Chiffre][]>((ok, ko) => {
    const t = d.transaction(DONNEES, "readonly");
    const s = t.objectStore(DONNEES);
    const ks = s.getAllKeys();
    const vs = s.getAll();
    t.oncomplete = () => ok((ks.result as string[]).map((x, i) => [x, vs.result[i] as Chiffre]));
    t.onerror = () => ko(t.error);
  });
  memoire.clear();
  for (const [cle, c] of paires) {
    try {
      memoire.set(cle, JSON.parse(dec.decode(await dechiffrer(k, c))));
    } catch {
      /* enregistrement abîmé : ignoré */
    }
  }
}

/** Reprendre les données gardées en clair avant le coffre, puis les retirer du navigateur. */
function reprendreAnciennes() {
  try {
    const anciennes: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith(ANCIEN_PREFIXE)) anciennes.push(k);
    }
    for (const k of anciennes) {
      try {
        ecrire(k.slice(ANCIEN_PREFIXE.length), JSON.parse(localStorage.getItem(k) ?? "null"));
      } catch {
        /* valeur illisible */
      }
      localStorage.removeItem(k);
    }
  } catch {
    /* stockage indisponible */
  }
}

/* ------------------------------ Créer, ouvrir, fermer ------------------------------ */

/** Code de l'appareil : 6 chiffres au moins (ou un mot de 6 caractères). */
export const codeAcceptable = (c: string) => c.trim().length >= 6;

/** Premier usage : le recenseur choisit son code ; le coffre est créé et ouvert. */
export async function creer(code: string, utilisateur: string, identifiant: string) {
  if (!codeAcceptable(code)) throw new Error("Le code doit avoir au moins 6 chiffres.");
  const sel = aleatoire(16);
  brute = aleatoire(32);
  const cleCode = await cleDuCode(code.trim(), sel, TOURS);
  await requete(DONNEES, "readwrite", (s) => s.clear());
  await ecrireMeta({ sel, tours: TOURS, parCode: await chiffrer(cleCode, brute), essais: 0, utilisateur, identifiant, appareil: nouvelIdentifiant() });
  void garderDurablement();
  cleDonnees = await cleBrute(brute);
  memoire.clear();
  reprendreAnciennes();
  prevenir();
}

/** Ouvrir avec le code. Un code faux compte un essai ; au 10e, tout est effacé. */
export async function ouvrirAvecCode(code: string): Promise<{ ok: true } | { ok: false; restants: number }> {
  const m = await lireMeta();
  if (!m) throw new Error("Rien n’est gardé sur cet appareil.");
  try {
    const k = await cleDuCode(code.trim(), m.sel, m.tours);
    brute = new Uint8Array(await dechiffrer(k, m.parCode));
  } catch {
    const essais = m.essais + 1;
    if (essais >= ESSAIS_MAX) {
      await effacerTout();
      return { ok: false, restants: 0 };
    }
    await ecrireMeta({ ...m, essais });
    return { ok: false, restants: ESSAIS_MAX - essais };
  }
  if (m.essais) await ecrireMeta({ ...m, essais: 0 });
  cleDonnees = await cleBrute(brute);
  await chargerTout(cleDonnees);
  reprendreAnciennes();
  void garderDurablement();
  prevenir();
  return { ok: true };
}

/* ------------------------------ Clé de secours (code oublié) ------------------------------ */

const versOctets = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** L'identifiant de l'appareil (créé avec le coffre ; ajouté aux coffres plus anciens). */
export async function identifiantAppareil(): Promise<string | null> {
  const m = await lireMeta();
  if (!m) return null;
  if (m.appareil) return m.appareil;
  const appareil = nouvelIdentifiant();
  await ecrireMeta({ ...m, appareil });
  return appareil;
}

/** Le coffre a-t-il sa clé de secours ? (sinon : la demander au serveur, avec le réseau) */
export const aSecours = async () => !!(await lireMeta())?.parSecours;

/** Enfermer aussi la clé des données avec la clé de secours donnée par le serveur (coffre ouvert). */
export async function enfermerSecours(cleB64: string) {
  const m = await lireMeta();
  if (!m || !brute) return;
  await ecrireMeta({ ...m, parSecours: await chiffrer(await cleBrute(versOctets(cleB64)), brute) });
}

/** Code oublié : ouvrir avec la clé de secours (rendue par le serveur contre le mot de passe). */
export async function ouvrirAvecSecours(cleB64: string) {
  const m = await lireMeta();
  if (!m?.parSecours) throw new Error("Cet appareil n’a pas de clé de secours.");
  try {
    brute = new Uint8Array(await dechiffrer(await cleBrute(versOctets(cleB64)), m.parSecours));
  } catch {
    throw new Error("La clé de secours ne correspond pas à cet appareil : appelez la DGRHAS.");
  }
  await ecrireMeta({ ...m, essais: 0 });
  cleDonnees = await cleBrute(brute);
  await chargerTout(cleDonnees);
  void garderDurablement();
  prevenir();
}

/** Le nombre de lignes qui attendent l'envoi (gardé à part : lu même coffre fermé). */
export async function noterEnAttente(n: number) {
  const m = await lireMeta();
  if (m && m.enAttente !== n) await ecrireMeta({ ...m, enAttente: n });
}

/** Le jour donné par le serveur (pour reconnaître une date d'appareil fausse). */
export async function noterServeur(jour: string) {
  const m = await lireMeta();
  if (m && m.dernierServeur !== jour) await ecrireMeta({ ...m, dernierServeur: jour });
}

/** Changer le code (le coffre doit être ouvert) : l'empreinte reste valable. */
export async function changerCode(code: string) {
  const m = await lireMeta();
  if (!m || !brute) throw new Error("Ouvrez d’abord les données de l’appareil.");
  if (!codeAcceptable(code)) throw new Error("Le code doit avoir au moins 6 chiffres.");
  const sel = aleatoire(16);
  await ecrireMeta({ ...m, sel, tours: TOURS, parCode: await chiffrer(await cleDuCode(code.trim(), sel, TOURS), brute), essais: 0 });
}

/** Fermer (verrouiller) : la mémoire est vidée, il faudra le code ou le doigt. */
export async function verrouiller() {
  await vider();
  cleDonnees = null;
  brute = null;
  memoire.clear();
  prevenir();
}

/** Tout effacer de l'appareil (fin de mission, effacement à distance, 10 codes faux). */
export async function effacerTout() {
  enAttente.forEach((t) => clearTimeout(t));
  enAttente.clear();
  cleDonnees = null;
  brute = null;
  memoire.clear();
  try {
    await requete(DONNEES, "readwrite", (s) => s.clear());
    await requete(META, "readwrite", (s) => s.clear());
  } catch {
    /* base indisponible */
  }
  try {
    const anciennes: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith(ANCIEN_PREFIXE)) anciennes.push(k);
    }
    anciennes.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* stockage indisponible */
  }
  prevenir();
}

/* ------------------------------ Effacement demandé par la DGRHAS ------------------------------ */

let avantEffacement: (() => Promise<void>) | null = null;
/** La page du terrain dit comment envoyer ce qui attend, avant que tout soit effacé. */
export const surAvantEffacement = (f: () => Promise<void>) => {
  avantEffacement = f;
};
/** Envoyer ce qui attend (seulement si le coffre est ouvert : sinon rien n'est lisible). */
export async function envoyerAvantEffacement() {
  if (!avantEffacement || !estOuvert()) return;
  try {
    await avantEffacement();
  } catch {
    /* ce qui ne part pas est perdu */
  }
}
/** Coffre fermé : la demande est gardée ; elle s'exécutera à l'ouverture. */
export async function marquerEffacement() {
  const m = await lireMeta();
  if (m && !m.effacementDemande) await ecrireMeta({ ...m, effacementDemande: true });
}

/** Garder le jour de l'effacement automatique (lu sans ouvrir le coffre). */
export async function fixerEffacement(jour: string | null) {
  const m = await lireMeta();
  if (m && m.effacerApres !== jour) await ecrireMeta({ ...m, effacerApres: jour });
}

const plusJours = (jour: string, n: number) => {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * La mission est finie (date d'effacement passée) : on efface, SAUF
 * - si des lignes attendent encore l'envoi (elles partiront d'abord ; au-delà de 30 jours après la
 *   fin, on efface quand même : l'appareil est sans doute perdu) ;
 * - si la date de l'appareil semble fausse (plus de 45 jours après le dernier jour donné par le
 *   serveur : une horloge mal réglée ne doit pas tout effacer).
 */
export async function effacerSiMissionFinie(): Promise<boolean | "a_envoyer"> {
  const m = await lireMeta();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (!m?.effacerApres || aujourdhui <= m.effacerApres) return false;
  if (m.dernierServeur && aujourdhui > plusJours(m.dernierServeur, 45)) return false;
  if ((m.enAttente ?? 0) > 0 && aujourdhui <= plusJours(m.effacerApres, 30)) return "a_envoyer";
  await effacerTout();
  return true;
}

/** La mission est-elle finie (date d'effacement passée) ? */
export async function missionFinie() {
  const m = await lireMeta();
  return !!m?.effacerApres && new Date().toISOString().slice(0, 10) > m.effacerApres;
}

/* ------------------------------ Empreinte digitale ------------------------------ */

/** L'appareil a-t-il un lecteur (empreinte, visage, code de l'écran) utilisable ici ? */
export async function lecteurDisponible(): Promise<boolean> {
  try {
    return typeof PublicKeyCredential !== "undefined" && !!window.isSecureContext && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

interface ResultatPrf {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
}

/** Les refus du lecteur (doigt annulé, délai dépassé…) : en français, jamais le message du navigateur. */
function enFrancais(e: unknown): Error {
  const nom = (e as DOMException)?.name;
  if (nom === "NotAllowedError" || nom === "AbortError") return new Error("Empreinte annulée ou non reconnue : réessayez, ou tapez votre code.");
  if (nom === "InvalidStateError") return new Error("Cette empreinte est déjà enregistrée pour ce site : retirez-la, puis réactivez-la.");
  if (nom === "NotSupportedError" || nom === "SecurityError") return new Error("Ce téléphone ne permet pas l’empreinte pour ce site : le code suffit.");
  return e instanceof Error && /[éèàù’]/.test(e.message) ? e : new Error("L’empreinte n’a pas fonctionné : tapez votre code.");
}

/** Le téléphone vérifie le doigt (et donne le secret, s'il sait). */
async function verifierDoigt(credential: Uint8Array, selPrf: Uint8Array): Promise<ArrayBuffer | null> {
  const a = (await navigator.credentials.get({
    publicKey: {
      challenge: aleatoire(32),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: credential as BufferSource }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: selPrf as BufferSource } } } as AuthenticationExtensionsClientInputs,
    },
  }).catch((e: unknown) => {
    throw enFrancais(e);
  })) as PublicKeyCredential | null;
  if (!a) throw new Error("Empreinte non reconnue : réessayez, ou tapez votre code.");
  const r = a.getClientExtensionResults() as ResultatPrf | undefined;
  return r?.prf?.results?.first ?? null;
}

/**
 * Activer l'empreinte (coffre ouvert). L'appareil crée une clé d'accès liée au doigt. S'il sait en
 * tirer un secret, ce secret enferme la clé des données ; sinon, une clé propre à l'appareil
 * (impossible à extraire) l'enferme, et ne sert qu'après la vérification du doigt. Rien ne part
 * au serveur.
 */
export async function activerEmpreinte() {
  const m = await lireMeta();
  if (!m || !brute) throw new Error("Ouvrez d’abord les données de l’appareil.");
  if (!(await lecteurDisponible())) throw new Error("Cet appareil n’a pas de lecteur d’empreinte utilisable : le code suffit.");
  const selPrf = aleatoire(32);
  const c = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatoire(32),
      rp: { name: "SIGRHAS-MEPPSA", id: location.hostname },
      user: { id: aleatoire(16) as BufferSource, name: m.identifiant, displayName: m.identifiant },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      // (une « clé d'accès » : c'est elle qui sait donner un secret sur la plupart des téléphones)
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60_000,
      extensions: { prf: { eval: { first: selPrf as BufferSource } } } as AuthenticationExtensionsClientInputs,
    },
  }).catch((e: unknown) => {
    throw enFrancais(e);
  })) as PublicKeyCredential | null;
  if (!c) throw new Error("Empreinte non enregistrée.");
  const credential = new Uint8Array(c.rawId);
  const r = c.getClientExtensionResults() as ResultatPrf;
  // Le secret tout de suite (certains téléphones), sinon en demandant le doigt une fois
  let secret: ArrayBuffer | null = r.prf?.results?.first ?? null;
  if (!secret && r.prf?.enabled !== false) {
    try {
      secret = await verifierDoigt(credential, selPrf);
    } catch {
      secret = null;
    }
  }
  if (secret) {
    await ecrireMeta({ ...m, parEmpreinte: { ...(await chiffrer(await cleBrute(secret), brute)), credential, selPrf, mode: "secret" } });
    return;
  }
  // Pas de secret : le verrou de l'appareil
  const cleAppareil = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await ecrireMeta({ ...m, parEmpreinte: { ...(await chiffrer(cleAppareil, brute)), credential, selPrf, mode: "verrou", cleAppareil } });
}

export async function retirerEmpreinte() {
  const m = await lireMeta();
  if (m?.parEmpreinte) {
    const { parEmpreinte: _, ...reste } = m;
    void _;
    await ecrireMeta(reste);
  }
}

/** Ouvrir avec le doigt. */
export async function ouvrirAvecEmpreinte() {
  const m = await lireMeta();
  if (!m?.parEmpreinte) throw new Error("L’empreinte n’est pas activée sur cet appareil.");
  const e = m.parEmpreinte;
  const secret = await verifierDoigt(e.credential, e.selPrf);
  if (e.mode === "verrou") {
    if (!e.cleAppareil) throw new Error("L’empreinte doit être activée de nouveau : tapez votre code.");
    brute = new Uint8Array(await dechiffrer(e.cleAppareil, e));
  } else {
    if (!secret) throw new Error("Ce téléphone n’a pas donné le secret de l’empreinte : tapez votre code, puis réactivez l’empreinte.");
    brute = new Uint8Array(await dechiffrer(await cleBrute(secret), e));
  }
  if (m.essais) await ecrireMeta({ ...m, essais: 0 });
  cleDonnees = await cleBrute(brute);
  await chargerTout(cleDonnees);
  reprendreAnciennes();
  prevenir();
}
