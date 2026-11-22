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
  /** La même, enfermée avec le secret de l'empreinte (si activée). */
  parEmpreinte?: Chiffre & { credential: Uint8Array; selPrf: Uint8Array };
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
}

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
    /* mémoire pleine : la valeur reste en mémoire tant que la page est ouverte */
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
  await ecrireMeta({ sel, tours: TOURS, parCode: await chiffrer(cleCode, brute), essais: 0, utilisateur, identifiant });
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
  prevenir();
  return { ok: true };
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

/** La date d'effacement est passée : on efface (à appeler à l'ouverture de la page). */
export async function effacerSiMissionFinie(): Promise<boolean> {
  const m = await lireMeta();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (m?.effacerApres && aujourdhui > m.effacerApres) {
    await effacerTout();
    return true;
  }
  return false;
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

async function secretEmpreinte(credential: Uint8Array, selPrf: Uint8Array): Promise<ArrayBuffer> {
  const a = (await navigator.credentials.get({
    publicKey: {
      challenge: aleatoire(32),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: credential as BufferSource }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: selPrf as BufferSource } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const r = a?.getClientExtensionResults() as ResultatPrf | undefined;
  const s = r?.prf?.results?.first;
  if (!s) throw new Error("Ce lecteur d’empreinte ne sait pas ouvrir les données chiffrées : le code reste demandé.");
  return s;
}

/**
 * Activer l'empreinte (coffre ouvert) : l'appareil crée une clé d'accès liée au doigt, puis en
 * tire un secret qui enferme la clé des données. Rien ne part au serveur.
 */
export async function activerEmpreinte() {
  const m = await lireMeta();
  if (!m || !brute) throw new Error("Ouvrez d’abord les données de l’appareil.");
  if (!(await lecteurDisponible())) throw new Error("Cet appareil n’a pas de lecteur d’empreinte utilisable : le code suffit.");
  const c = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatoire(32),
      rp: { name: "SIGRHAS-MEPPSA — recensement", id: location.hostname },
      user: { id: aleatoire(16) as BufferSource, name: m.identifiant, displayName: m.identifiant },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60_000,
      extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!c) throw new Error("Empreinte non enregistrée.");
  const r = c.getClientExtensionResults() as ResultatPrf;
  if (r.prf && r.prf.enabled === false) throw new Error("Ce lecteur d’empreinte ne sait pas ouvrir les données chiffrées : le code reste demandé.");
  const credential = new Uint8Array(c.rawId);
  const selPrf = aleatoire(32);
  const secret = await secretEmpreinte(credential, selPrf);
  const k = await cleBrute(secret);
  await ecrireMeta({ ...m, parEmpreinte: { ...(await chiffrer(k, brute)), credential, selPrf } });
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
  const secret = await secretEmpreinte(m.parEmpreinte.credential, m.parEmpreinte.selPrf);
  brute = new Uint8Array(await dechiffrer(await cleBrute(secret), m.parEmpreinte));
  if (m.essais) await ecrireMeta({ ...m, essais: 0 });
  cleDonnees = await cleBrute(brute);
  await chargerTout(cleDonnees);
  reprendreAnciennes();
  prevenir();
}
