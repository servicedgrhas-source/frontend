(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/session.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Coquille",
    ()=>Coquille,
    "useSession",
    ()=>useSession
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.mjs [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/inbox.mjs [app-client] (ecmascript) <export default as Inbox>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key-round.mjs [app-client] (ecmascript) <export default as KeyRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.mjs [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.mjs [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.mjs [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$round$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-round.mjs [app-client] (ecmascript) <export default as UserRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-client] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/espaces.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/libelles.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
const Contexte = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function useSession() {
    _s();
    const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(Contexte);
    if (!s) throw new Error("useSession hors de la session");
    return s;
}
_s(useSession, "NcaH+8mKJ+9JAQWtl1EQlqI+Ikk=");
function Coquille({ children }) {
    _s1();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const chemin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [erreur, setErreur] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [confirmerSortie, setConfirmerSortie] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Menu en accordéon : un seul domaine ouvert, celui de la page affichée par défaut
    const [compteurs, setCompteurs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Circuit des demandes : dossiers à traiter et alertes non lues
    const [circuit, setCircuit] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [alertesOuvertes, setAlertesOuvertes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Session expirée pendant le travail : message du serveur, reconnexion sur place
    const [expiree, setExpiree] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>{
            const { jeton, profil } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lireSession"])();
            if (!jeton || !profil) {
                router.replace("/connexion");
                return;
            }
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get("/auth/moi"),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get("/referentiels"),
                // Noms et ordre du menu réglés par l'administrateur ou le DG (sinon le menu d'origine)
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get("/menu/configuration").catch({
                    "Coquille.useEffect": ()=>null
                }["Coquille.useEffect"])
            ]).then({
                "Coquille.useEffect": ([p, refs, menu])=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["appliquerMenu"])(menu);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memoriserProfil"])(p);
                    setSession({
                        profil: p,
                        refs
                    });
                }
            }["Coquille.useEffect"]).catch({
                "Coquille.useEffect": (e)=>setErreur(e.message)
            }["Coquille.useEffect"]);
        }
    }["Coquille.useEffect"], [
        router
    ]);
    // Menu renommé dans Administration › Menu : tout l'écran prend les nouveaux noms
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>{
            const apres = {
                "Coquille.useEffect.apres": ()=>setSession({
                        "Coquille.useEffect.apres": (s)=>s ? {
                                ...s
                            } : s
                    }["Coquille.useEffect.apres"])
            }["Coquille.useEffect.apres"];
            window.addEventListener(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MENU_MODIFIE"], apres);
            return ({
                "Coquille.useEffect": ()=>window.removeEventListener(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MENU_MODIFIE"], apres)
            })["Coquille.useEffect"];
        }
    }["Coquille.useEffect"], []);
    // Une fois la session ouverte, une session expirée se rouvre dans une fenêtre (la page reste)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>session ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["surSessionExpiree"])({
                "Coquille.useEffect": (m)=>setExpiree(m)
            }["Coquille.useEffect"]) : undefined
    }["Coquille.useEffect"], [
        session
    ]);
    // Profil relu au retour sur l'onglet : un rôle ou un nom changé par l'administrateur s'applique
    const derniereLecture = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const ouvert = !!session;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>{
            if (!ouvert) return;
            const relire = {
                "Coquille.useEffect.relire": ()=>{
                    if (document.visibilityState !== "visible" || Date.now() - derniereLecture.current < 30_000) return;
                    derniereLecture.current = Date.now();
                    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get("/auth/moi").then({
                        "Coquille.useEffect.relire": (p)=>{
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memoriserProfil"])(p);
                            setSession({
                                "Coquille.useEffect.relire": (s)=>s && JSON.stringify(s.profil) !== JSON.stringify(p) ? {
                                        ...s,
                                        profil: p
                                    } : s
                            }["Coquille.useEffect.relire"]);
                        }
                    }["Coquille.useEffect.relire"]).catch({
                        "Coquille.useEffect.relire": ()=>undefined
                    }["Coquille.useEffect.relire"]);
                }
            }["Coquille.useEffect.relire"];
            derniereLecture.current = Date.now();
            window.addEventListener("focus", relire);
            document.addEventListener("visibilitychange", relire);
            return ({
                "Coquille.useEffect": ()=>{
                    window.removeEventListener("focus", relire);
                    document.removeEventListener("visibilitychange", relire);
                }
            })["Coquille.useEffect"];
        }
    }["Coquille.useEffect"], [
        ouvert
    ]);
    // Autres onglets : déconnexion → tous les onglets ; autre compte connecté → rechargement ;
    // même compte reconnecté ailleurs → cet onglet reprend sans rien demander
    const idProfil = session?.profil.id;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>{
            if (!idProfil) return;
            const f = {
                "Coquille.useEffect.f": (e)=>{
                    if (e.key !== __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CLE_JETON"] && e.key !== null) return;
                    const { jeton, profil } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lireSession"])();
                    if (!jeton) return window.location.replace("/connexion");
                    if (profil && profil.id !== idProfil) return window.location.replace("/");
                    // Jeton renouvelé dans un autre onglet (reconnexion, code changé) : on reprend
                    setExpiree(null);
                    window.dispatchEvent(new Event(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SESSION_ROUVERTE"]));
                }
            }["Coquille.useEffect.f"];
            window.addEventListener("storage", f);
            return ({
                "Coquille.useEffect": ()=>window.removeEventListener("storage", f)
            })["Coquille.useEffect"];
        }
    }["Coquille.useEffect"], [
        idProfil
    ]);
    // Travail en attente (compteurs du menu). Relu : après chaque enregistrement, au retour sur
    // l'onglet, chaque minute (nouvelles alertes), et en changeant de page s'il date de plus de
    // 15 s. Plus à chaque clic : en ligne, chaque lecture coûte un aller-retour au serveur.
    const role = session?.profil.role;
    const derniersCompteurs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const lireCompteurs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Coquille.useCallback[lireCompteurs]": ()=>{
            if (!role) return;
            derniersCompteurs.current = Date.now();
            if (role !== "STRUCTURE") __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get("/menu/compteurs").then(setCompteurs).catch({
                "Coquille.useCallback[lireCompteurs]": ()=>undefined
            }["Coquille.useCallback[lireCompteurs]"]);
            // Dossiers du circuit + notes à lire, à imprimer ou à clôturer
            Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get("/circuit/compteur"),
                role === "STRUCTURE" ? Promise.resolve({
                    total: 0
                }) : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get("/notes/a-faire").catch({
                    "Coquille.useCallback[lireCompteurs]": ()=>({
                            total: 0
                        })
                }["Coquille.useCallback[lireCompteurs]"])
            ]).then({
                "Coquille.useCallback[lireCompteurs]": ([c, n])=>setCircuit({
                        ...c,
                        aTraiter: c.aTraiter + n.total
                    })
            }["Coquille.useCallback[lireCompteurs]"]).catch({
                "Coquille.useCallback[lireCompteurs]": ()=>undefined
            }["Coquille.useCallback[lireCompteurs]"]);
        }
    }["Coquille.useCallback[lireCompteurs]"], [
        role
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>{
            if (Date.now() - derniersCompteurs.current > 15_000) lireCompteurs();
        }
    }["Coquille.useEffect"], [
        chemin,
        lireCompteurs
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>{
            if (!role) return;
            let attente;
            const apresEcriture = {
                "Coquille.useEffect.apresEcriture": ()=>{
                    clearTimeout(attente);
                    attente = setTimeout(lireCompteurs, 800);
                }
            }["Coquille.useEffect.apresEcriture"];
            const auRetour = {
                "Coquille.useEffect.auRetour": ()=>{
                    if (document.visibilityState === "visible" && Date.now() - derniersCompteurs.current > 15_000) lireCompteurs();
                }
            }["Coquille.useEffect.auRetour"];
            const minute = setInterval({
                "Coquille.useEffect.minute": ()=>document.visibilityState === "visible" && lireCompteurs()
            }["Coquille.useEffect.minute"], 60_000);
            window.addEventListener(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRAVAIL_MODIFIE"], apresEcriture);
            window.addEventListener("focus", auRetour);
            document.addEventListener("visibilitychange", auRetour);
            return ({
                "Coquille.useEffect": ()=>{
                    clearTimeout(attente);
                    clearInterval(minute);
                    window.removeEventListener(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRAVAIL_MODIFIE"], apresEcriture);
                    window.removeEventListener("focus", auRetour);
                    document.removeEventListener("visibilitychange", auRetour);
                }
            })["Coquille.useEffect"];
        }
    }["Coquille.useEffect"], [
        role,
        lireCompteurs
    ]);
    // Les comptes des structures (écoles, inspections…) n'ont que leurs dossiers, leur personnel et leur école
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Coquille.useEffect": ()=>{
            if (session?.profil.role === "STRUCTURE" && !chemin.startsWith("/a-traiter") && !chemin.startsWith("/mutation/") && !chemin.startsWith("/personnel") && !chemin.startsWith("/recensement") && !(chemin === "/ecoles" || /^\/ecoles\/\d+$/.test(chemin)) && chemin !== "/demandes/nouvelle" && ![
                "/espace/personnel",
                "/espace/rh",
                "/espace/demandes",
                "/espace/structures"
            ].includes(chemin) && chemin !== "/compte") router.replace("/a-traiter");
        }
    }["Coquille.useEffect"], [
        session,
        chemin,
        router
    ]);
    if (erreur) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-8 text-rouge-600",
        children: erreur
    }, void 0, false, {
        fileName: "[project]/components/session.tsx",
        lineNumber: 177,
        columnNumber: 22
    }, this);
    if (!session) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Chargement"], {
        texte: "Ouverture de la session…"
    }, void 0, false, {
        fileName: "[project]/components/session.tsx",
        lineNumber: 178,
        columnNumber: 24
    }, this);
    const deconnexion = ()=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fermerSession"])();
        setConfirmerSortie(false);
        // Rechargement complet : Next garde les pages visitées en mémoire (fenêtre ouverte,
        // profil, données) ; rien de la session précédente ne doit rester pour le suivant.
        window.location.replace("/connexion");
    };
    const p = session.profil;
    const espaceCourant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["espaceDe"])(chemin);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Contexte.Provider, {
        value: session,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-h-screen gap-0 p-0 lg:p-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        className: "no-print sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-nuit text-white lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-[28px]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-6 pt-7 pb-6",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/20",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                                src: "/armoiries.png",
                                                alt: "Armoiries de la République du Congo",
                                                width: 56,
                                                height: 56,
                                                className: "h-full w-full object-contain",
                                                priority: true
                                            }, void 0, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 197,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/session.tsx",
                                            lineNumber: 196,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0 leading-tight",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[10.5px] font-semibold whitespace-nowrap uppercase text-white",
                                                    children: "République du Congo"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/session.tsx",
                                                    lineNumber: 200,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-1 text-[10px] whitespace-nowrap text-white/45",
                                                    children: "Unité · Travail · Progrès"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/session.tsx",
                                                    lineNumber: 201,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/session.tsx",
                                            lineNumber: 199,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/session.tsx",
                                    lineNumber: 195,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 194,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                className: "flex-1 overflow-y-auto px-3 pb-4",
                                children: [
                                    p.role !== "STRUCTURE" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LienMenu, {
                                        href: "/",
                                        libelle: "Tableau de bord",
                                        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"],
                                        actif: chemin === "/",
                                        principal: true
                                    }, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 207,
                                        columnNumber: 40
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LienMenu, {
                                        href: "/a-traiter",
                                        libelle: "Dossiers à traiter",
                                        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__["Inbox"],
                                        actif: chemin === "/a-traiter",
                                        principal: true,
                                        nombre: circuit?.aTraiter,
                                        titre: "Demandes qui attendent votre visa et votre avis"
                                    }, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 208,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>setAlertesOuvertes(true),
                                        className: "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                                className: "size-[18px] shrink-0 text-white/40 group-hover:text-white/70"
                                            }, void 0, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 214,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "flex-1 text-left",
                                                children: "Alertes"
                                            }, void 0, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 215,
                                                columnNumber: 15
                                            }, this),
                                            !!circuit?.alertes && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "rounded-full bg-or-400 px-1.5 py-px text-[10px] font-bold text-zinc-900 tabular-nums",
                                                children: circuit.alertes > 99 ? "99+" : circuit.alertes
                                            }, void 0, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 216,
                                                columnNumber: 38
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 209,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "my-2"
                                    }, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 218,
                                        columnNumber: 13
                                    }, this),
                                    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MENU"].map((m)=>{
                                        if (m.pole) {
                                            const pole = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["POLES"].find((x)=>x.cle === m.pole);
                                            if (!pole) return null;
                                            const espaces = pole.espaces.map((c)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ESPACES"].find((e)=>e.cle === c)).filter((e)=>!!e && (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rubriquesVisibles"])(e, p).length > 0);
                                            if (!espaces.length) return null;
                                            const travail = espaces.reduce((n, e)=>n + (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["travailEspace"])(e, p, compteurs), 0);
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LienMenu, {
                                                href: `/espace/${pole.cle}`,
                                                libelle: pole.titre,
                                                icone: pole.icone,
                                                actif: chemin === `/espace/${pole.cle}` || (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["poleDe"])(espaceCourant?.cle)?.cle === pole.cle,
                                                principal: true,
                                                nombre: travail
                                            }, pole.cle, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 231,
                                                columnNumber: 19
                                            }, this);
                                        }
                                        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ESPACES"].find((x)=>x.cle === m.espace);
                                        // Comptes des écoles, inspections… : seulement les rubriques de leur personnel et de leurs demandes
                                        if (!e || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rubriquesVisibles"])(e, p).length) return null;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LienMenu, {
                                            href: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lienEspace"])(e, p),
                                            libelle: e.titre,
                                            icone: e.icone,
                                            actif: espaceCourant?.cle === e.cle,
                                            principal: true,
                                            nombre: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["travailEspace"])(e, p, compteurs)
                                        }, e.cle, false, {
                                            fileName: "[project]/components/session.tsx",
                                            lineNumber: 245,
                                            columnNumber: 22
                                        }, this);
                                    })
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 206,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-t border-white/10 px-6 pt-4 pb-5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "truncate text-[14px] font-semibold",
                                        children: p.nom
                                    }, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 250,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "truncate text-xs text-white/45",
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLES"][p.role]
                                    }, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 251,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-3 flex items-center gap-3 text-xs whitespace-nowrap",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/compte",
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("inline-flex items-center gap-1.5 hover:text-white", chemin === "/compte" ? "text-white" : "text-white/55"),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$round$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserRound$3e$__["UserRound"], {
                                                        className: "size-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/session.tsx",
                                                        lineNumber: 254,
                                                        columnNumber: 17
                                                    }, this),
                                                    " Mon compte"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 253,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setConfirmerSortie(true),
                                                className: "inline-flex cursor-pointer items-center gap-1.5 text-white/55 hover:text-white",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                                        className: "size-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/session.tsx",
                                                        lineNumber: 257,
                                                        columnNumber: 17
                                                    }, this),
                                                    " Se déconnecter"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 256,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 252,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bandeau-national mt-4 h-1 w-16 rounded-full",
                                        "aria-hidden": true
                                    }, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 260,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 249,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 193,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "min-w-0 flex-1 px-5 py-6 lg:px-10 lg:py-8",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "animate-apparition",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FilAriane, {
                                    chemin: chemin,
                                    profil: p
                                }, void 0, false, {
                                    fileName: "[project]/components/session.tsx",
                                    lineNumber: 266,
                                    columnNumber: 13
                                }, this),
                                !p.aCode && (p.role === "ADMIN" || p.role === "DG") && chemin !== "/administration" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "no-print mb-5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alerte"], {
                                        ton: "jaune",
                                        children: [
                                            "Votre compte n’a pas encore de ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "code personnel"
                                            }, void 0, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 270,
                                                columnNumber: 50
                                            }, this),
                                            " : il ne tient qu’à votre mot de passe.",
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/administration",
                                                className: "font-semibold underline",
                                                children: "Créez-le dans Administration › Utilisateurs"
                                            }, void 0, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 271,
                                                columnNumber: 19
                                            }, this),
                                            " ",
                                            "(bouton « Créer le code » sur votre ligne), puis gardez-le en lieu sûr."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 269,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/session.tsx",
                                    lineNumber: 268,
                                    columnNumber: 15
                                }, this),
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["niveauPage"])(chemin, p) === "LECTURE" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "no-print mb-5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alerte"], {
                                        ton: "bleu",
                                        children: [
                                            "Cette rubrique vous est ouverte en ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "lecture seule"
                                            }, void 0, false, {
                                                fileName: "[project]/components/session.tsx",
                                                lineNumber: 281,
                                                columnNumber: 54
                                            }, this),
                                            " : vous pouvez la consulter, pas la modifier."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 280,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/session.tsx",
                                    lineNumber: 279,
                                    columnNumber: 15
                                }, this),
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["niveauPage"])(chemin, p) === "MASQUE" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alerte"], {
                                    ton: "jaune",
                                    children: "Cette rubrique ne vous est pas ouverte. Demandez au DG ou à l’administrateur si vous en avez besoin."
                                }, void 0, false, {
                                    fileName: "[project]/components/session.tsx",
                                    lineNumber: 286,
                                    columnNumber: 15
                                }, this) : children
                            ]
                        }, chemin, true, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 265,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 263,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 192,
                columnNumber: 7
            }, this),
            expiree !== null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Reconnexion, {
                profil: p,
                message: expiree,
                fermer: ()=>setExpiree(null),
                reussie: (nouveau)=>{
                    if (nouveau.id !== p.id) return window.location.replace("/");
                    setSession((s)=>s ? {
                            ...s,
                            profil: nouveau
                        } : s);
                    setExpiree(null);
                    window.dispatchEvent(new Event(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SESSION_ROUVERTE"]));
                },
                changerDeCompte: deconnexion
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 294,
                columnNumber: 9
            }, this),
            alertesOuvertes && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PanneauAlertes, {
                fermer: ()=>setAlertesOuvertes(false),
                aller: (href)=>router.push(href)
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 307,
                columnNumber: 27
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Modale"], {
                titre: "Se déconnecter ?",
                ouverte: confirmerSortie,
                fermer: ()=>setConfirmerSortie(false),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[13px] leading-relaxed text-zinc-500",
                        children: "Vous allez quitter votre session. Les modifications déjà enregistrées sont conservées ; une saisie en cours non enregistrée sera perdue."
                    }, void 0, false, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 309,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-6 flex justify-end gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bouton"], {
                                onClick: ()=>setConfirmerSortie(false),
                                children: "Annuler"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 313,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bouton"], {
                                variante: "sombre",
                                onClick: deconnexion,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {}, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 315,
                                        columnNumber: 13
                                    }, this),
                                    " Se déconnecter"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 314,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 312,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 308,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/session.tsx",
        lineNumber: 191,
        columnNumber: 5
    }, this);
}
_s1(Coquille, "nMWtvt+WCSoa2reXr5AS3vaHSfI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = Coquille;
/** Une ligne du menu (rubrique, ou lien principal comme le tableau de bord). */ function LienMenu({ href, libelle, icone: Icone, actif, principal, nombre, titre, cache }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        title: titre,
        tabIndex: cache ? -1 : undefined,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("group relative flex items-center gap-3 rounded-xl px-3 transition-colors duration-200", principal ? "py-2.5 text-[14px] font-semibold" : "py-1.5 text-[13px]", actif ? "bg-white/[0.07] font-semibold text-white" : principal ? "text-white/80 hover:bg-white/[0.05] hover:text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"),
        children: [
            actif && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-or-400",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 356,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icone, {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("shrink-0 transition-all duration-200 group-hover:translate-x-0.5", principal ? "size-[18px]" : "size-4", actif ? "text-marque-300" : "text-white/40 group-hover:text-white/70")
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 357,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "flex-1",
                children: libelle
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 364,
                columnNumber: 7
            }, this),
            !!nombre && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "rounded-full bg-white/10 px-1.5 py-px text-[10px] font-semibold text-white/80 tabular-nums",
                children: nombre > 999 ? "999+" : nombre
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 365,
                columnNumber: 20
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/session.tsx",
        lineNumber: 346,
        columnNumber: 5
    }, this);
}
_c1 = LienMenu;
const TYPE_ALERTE = {
    NOUVELLE: "Nouvelle demande",
    A_TRAITER: "À traiter",
    INSTRUCTION: "Instruction",
    DECISION: "Décision",
    CLOTURE: "Dossier clos : réponse à remettre"
};
const deuxSemaines = (a)=>a.alertes.some((x)=>x.code === "DEUX_SEMAINES");
const PERIODES = [
    {
        k: "semaine",
        libelle: "Cette semaine"
    },
    {
        k: "deuxSemaines",
        libelle: "2 dernières semaines"
    },
    {
        k: "mois",
        libelle: "Ce mois"
    },
    {
        k: "tout",
        libelle: "Tout"
    },
    {
        k: "dates",
        libelle: "Choisir les dates"
    }
];
const isoLocal = (d)=>`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Du lundi de cette semaine (ou d'il y a une semaine, ou du 1er du mois) à aujourd'hui. */ function bornes(choix, dates) {
    const auj = new Date();
    const lundi = new Date(auj);
    lundi.setDate(auj.getDate() - (auj.getDay() + 6) % 7);
    if (choix === "semaine") return {
        du: isoLocal(lundi),
        au: isoLocal(auj)
    };
    if (choix === "deuxSemaines") {
        lundi.setDate(lundi.getDate() - 7);
        return {
            du: isoLocal(lundi),
            au: isoLocal(auj)
        };
    }
    if (choix === "mois") return {
        du: isoLocal(new Date(auj.getFullYear(), auj.getMonth(), 1)),
        au: isoLocal(auj)
    };
    if (choix === "dates") return {
        du: dates.du || undefined,
        au: dates.au || undefined
    };
    return {};
}
/**
 * Les alertes, par onglets (DG, 26/10/2026) : tout, les demandes (nouvelle demande, dossier arrivé
 * chez soi, instruction, décision) et la présence (deux semaines sans venir en tête).
 */ function PanneauAlertes({ fermer, aller }) {
    _s2();
    const [liste, setListe] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [presence, setPresence] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [onglet, setOnglet] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("tout");
    const [choix, setChoix] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("tout");
    const [dates, setDates] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        du: "",
        au: isoLocal(new Date())
    });
    const periode = bornes(choix, dates);
    const filtre = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["qs"])(periode);
    // Période dont les résultats sont affichés : tant qu'elle diffère, on montre le chargement
    const [chargeePour, setChargeePour] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [nonLues, setNonLues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [suite, setSuite] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [chargement, setChargement] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [erreur, setErreur] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const recevoir = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "PanneauAlertes.useCallback[recevoir]": (r, ajouter)=>{
            setListe({
                "PanneauAlertes.useCallback[recevoir]": (l)=>ajouter && l ? [
                        ...l,
                        ...r.alertes
                    ] : r.alertes
            }["PanneauAlertes.useCallback[recevoir]"]);
            setNonLues(r.nonLues);
            setSuite(r.suite);
            setErreur(null);
        }
    }["PanneauAlertes.useCallback[recevoir]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PanneauAlertes.useEffect": ()=>{
            let actif = true;
            void Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get(`/circuit/alertes${filtre}`).catch({
                    "PanneauAlertes.useEffect": (e)=>{
                        if (actif) setErreur(e.message);
                        return {
                            alertes: [],
                            nonLues: 0,
                            suite: false
                        };
                    }
                }["PanneauAlertes.useEffect"]),
                // Présence : seulement les comptes qui suivent la présence (sinon, aucune)
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get(`/presence/alertes${filtre}`).catch({
                    "PanneauAlertes.useEffect": ()=>[]
                }["PanneauAlertes.useEffect"])
            ]).then({
                "PanneauAlertes.useEffect": ([r, p])=>{
                    if (!actif) return;
                    recevoir(r, false);
                    setPresence(p);
                    setChargeePour(filtre);
                }
            }["PanneauAlertes.useEffect"]);
            return ({
                "PanneauAlertes.useEffect": ()=>{
                    actif = false;
                }
            })["PanneauAlertes.useEffect"];
        }
    }["PanneauAlertes.useEffect"], [
        recevoir,
        filtre
    ]);
    const plusAnciennes = async (avant)=>{
        setChargement(true);
        try {
            recevoir(await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].get(`/circuit/alertes${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["qs"])({
                ...periode,
                avant
            })}`), true);
        } catch (e) {
            setErreur(e.message);
        } finally{
            setChargement(false);
        }
    };
    const lire = async (ids)=>{
        if (!ids.length) return;
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].post("/circuit/alertes/lues", {
            ids
        }).catch(()=>undefined);
        setListe((l)=>l?.map((a)=>ids.includes(a.id) ? {
                    ...a,
                    lue: true
                } : a) ?? null);
        setNonLues((n)=>Math.max(0, n - ids.length));
    };
    // Toutes, y compris celles des pages pas encore affichées
    const toutLire = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].post("/circuit/alertes/lues", {
            tout: true
        }).catch(()=>undefined);
        setListe((l)=>l?.map((a)=>({
                    ...a,
                    lue: true
                })) ?? null);
        setNonLues(0);
    };
    const urgentes = (presence ?? []).filter(deuxSemaines);
    const autresPresence = (presence ?? []).filter((a)=>!deuxSemaines(a));
    const ligneDemande = (a)=>{
        // Demande supprimée depuis : l'alerte reste lisible, mais ne mène plus nulle part
        const introuvable = a.aujourdhui === "Demande supprimée";
        const contenu = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "flex items-center gap-2 text-[11px] text-zinc-500",
                    children: [
                        !a.lue && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "size-2 rounded-full bg-or-400"
                        }, void 0, false, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 502,
                            columnNumber: 22
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                            className: "text-zinc-700",
                            children: TYPE_ALERTE[a.type] ?? a.type
                        }, void 0, false, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 503,
                            columnNumber: 11
                        }, this),
                        " ·",
                        " ",
                        new Date(a.creeLe).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short"
                        })
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 501,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "block text-zinc-800",
                    children: a.texte
                }, void 0, false, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 506,
                    columnNumber: 9
                }, this),
                a.aujourdhui && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("mt-0.5 block text-[12px] font-medium", introuvable ? "text-zinc-400" : "text-marque-700"),
                    children: [
                        "Aujourd’hui : ",
                        a.aujourdhui
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 507,
                    columnNumber: 26
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/session.tsx",
            lineNumber: 500,
            columnNumber: 7
        }, this);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
            children: introuvable ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>lire([
                        a.id
                    ]),
                title: "Cette demande n’existe plus",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("w-full cursor-default rounded-2xl px-3 py-2 text-left text-[13px] opacity-70", !a.lue && "bg-or-100/50"),
                children: contenu
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 513,
                columnNumber: 11
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: async ()=>{
                    await lire([
                        a.id
                    ]);
                    fermer();
                    aller(`/mutation/${a.demandeId}`);
                },
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("w-full rounded-2xl px-3 py-2 text-left text-[13px] transition hover:bg-zinc-50", !a.lue && "bg-or-100/50"),
                children: contenu
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 522,
                columnNumber: 11
            }, this)
        }, `d${a.id}`, false, {
            fileName: "[project]/components/session.tsx",
            lineNumber: 511,
            columnNumber: 7
        }, this);
    };
    const lignePresence = (a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>{
                    fermer();
                    aller(`/personnel/presence?structure=${a.structureId}&date=${a.lundi}`);
                },
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("w-full rounded-2xl px-3 py-2 text-left text-[13px] transition hover:bg-zinc-50", deuxSemaines(a) ? "bg-rouge-100/60" : "bg-or-100/40"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex items-center gap-2 text-[11px] text-zinc-500",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                className: deuxSemaines(a) ? "text-rouge-600" : "text-zinc-700",
                                children: deuxSemaines(a) ? "Deux semaines sans venir" : "Présence"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 548,
                                columnNumber: 11
                            }, this),
                            " · semaine du",
                            " ",
                            a.lundi.split("-").reverse().join("/")
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 547,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "block font-medium text-zinc-800",
                        children: [
                            a.nomComplet,
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-normal text-zinc-500",
                                children: [
                                    "· ",
                                    a.structure
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 552,
                                columnNumber: 26
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 551,
                        columnNumber: 9
                    }, this),
                    a.alertes.map((x)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "block text-[12px] text-zinc-600",
                            children: x.texte
                        }, x.code, false, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 555,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mt-0.5 block text-[12px] font-medium text-marque-700",
                        children: "Ouvrir le pointage de cette semaine →"
                    }, void 0, false, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 559,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 539,
                columnNumber: 7
            }, this)
        }, `p${a.agentId}-${a.lundi}`, false, {
            fileName: "[project]/components/session.tsx",
            lineNumber: 538,
            columnNumber: 5
        }, this);
    const nbDemandes = liste?.length ?? 0;
    const nbPresence = presence?.length ?? 0;
    const vide = (t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "py-2 text-[13px] text-zinc-500",
            children: t
        }, void 0, false, {
            fileName: "[project]/components/session.tsx",
            lineNumber: 565,
            columnNumber: 31
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Modale"], {
        titre: "Alertes",
        ouverte: true,
        fermer: fermer,
        children: [
            erreur && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alerte"], {
                children: erreur
            }, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 568,
                columnNumber: 18
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-3 space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-1.5",
                        children: PERIODES.map((x)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setChoix(x.k),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("cursor-pointer rounded-lg border px-2.5 py-1 text-[12px]", choix === x.k ? "border-marque-600 bg-marque-50 font-semibold text-marque-700" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"),
                                children: x.libelle
                            }, x.k, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 572,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 570,
                        columnNumber: 9
                    }, this),
                    choix === "dates" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2 text-[12px] text-zinc-600",
                        children: [
                            "Du",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "date",
                                "aria-label": "Du",
                                value: dates.du,
                                max: dates.au || undefined,
                                onChange: (e)=>setDates({
                                        ...dates,
                                        du: e.target.value
                                    }),
                                className: "rounded-lg border border-zinc-200 px-2 py-1"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 588,
                                columnNumber: 13
                            }, this),
                            "au",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "date",
                                "aria-label": "Au",
                                value: dates.au,
                                min: dates.du || undefined,
                                onChange: (e)=>setDates({
                                        ...dates,
                                        au: e.target.value
                                    }),
                                className: "rounded-lg border border-zinc-200 px-2 py-1"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 590,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 586,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[11px] text-zinc-500",
                        children: [
                            periode.du || periode.au ? `Du ${periode.du ? periode.du.split("-").reverse().join("/") : "début"} au ${periode.au ? periode.au.split("-").reverse().join("/") : "aujourd’hui"}.` : "Toutes les alertes de demandes ; présence : les 4 dernières semaines.",
                            " ",
                            "La présence compte les semaines validées par les chefs."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 593,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 569,
                columnNumber: 7
            }, this),
            !liste || !presence || chargeePour !== filtre ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Chargement"], {}, void 0, false, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 601,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-1.5",
                        children: [
                            [
                                "tout",
                                `Tout (${nbDemandes + nbPresence})`
                            ],
                            [
                                "demandes",
                                `Demandes (${nbDemandes})`
                            ],
                            [
                                "presence",
                                `Présence (${nbPresence})`
                            ]
                        ].map(([k, t])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>setOnglet(k),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-medium", onglet === k ? "border-encre bg-encre text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"),
                                children: [
                                    t,
                                    k === "presence" && urgentes.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "ml-1.5 rounded-full bg-rouge-600 px-1.5 text-[10px] text-white",
                                        children: urgentes.length
                                    }, void 0, false, {
                                        fileName: "[project]/components/session.tsx",
                                        lineNumber: 622,
                                        columnNumber: 61
                                    }, this)
                                ]
                            }, k, true, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 612,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 604,
                        columnNumber: 11
                    }, this),
                    onglet !== "presence" && nonLues > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "text-[12px] font-medium text-marque-700 hover:underline",
                        onClick: toutLire,
                        children: [
                            "Tout marquer comme lu (",
                            nonLues,
                            ")"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 627,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "max-h-[60vh] space-y-1.5 overflow-y-auto",
                        children: [
                            onglet === "tout" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    urgentes.map(lignePresence),
                                    liste.map(ligneDemande),
                                    autresPresence.map(lignePresence),
                                    !nbDemandes && !nbPresence && vide("Aucune alerte sur cette période.")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 633,
                                columnNumber: 15
                            }, this),
                            onglet === "demandes" && (nbDemandes ? liste.map(ligneDemande) : vide("Aucune alerte sur les demandes pour cette période.")),
                            onglet === "presence" && (nbPresence ? [
                                ...urgentes,
                                ...autresPresence
                            ].map(lignePresence) : vide("Aucune alerte de présence sur cette période (semaines validées par les chefs)."))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 631,
                        columnNumber: 11
                    }, this),
                    onglet !== "presence" && suite && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bouton"], {
                            chargement: chargement,
                            disabled: chargement,
                            onClick: ()=>plusAnciennes(liste[liste.length - 1].id),
                            children: "Alertes plus anciennes"
                        }, void 0, false, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 646,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 645,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/session.tsx",
                lineNumber: 603,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/session.tsx",
        lineNumber: 567,
        columnNumber: 5
    }, this);
}
_s2(PanneauAlertes, "OEe1IDR3nsZaZ80Wv7elHT44B9Y=");
_c2 = PanneauAlertes;
/**
 * Session expirée ou fermée pendant le travail : on se reconnecte sans quitter la page,
 * la saisie en cours reste à l'écran ; il suffit ensuite de refaire la dernière action.
 */ function Reconnexion({ profil, message, fermer, reussie, changerDeCompte }) {
    _s3();
    const [motDePasse, setMotDePasse] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [code, setCode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [erreur, setErreur] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [envoi, setEnvoi] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const valider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Reconnexion.useCallback[valider]": async (e)=>{
            e.preventDefault();
            setEnvoi(true);
            setErreur(null);
            try {
                const r = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].post("/auth/connexion", {
                    email: profil.email,
                    motDePasse,
                    code
                });
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ouvrirSession"])(r.jeton, r.utilisateur);
                reussie(r.utilisateur);
            } catch (err) {
                setErreur(err.message);
            } finally{
                setEnvoi(false);
            }
        }
    }["Reconnexion.useCallback[valider]"], [
        profil.email,
        motDePasse,
        code,
        reussie
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Modale"], {
        titre: "Reconnectez-vous pour continuer",
        ouverte: true,
        fermer: fermer,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: valider,
            className: "space-y-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[13px] leading-relaxed text-zinc-600",
                    children: [
                        message,
                        " Votre page reste ouverte : après la reconnexion, refaites simplement votre dernière action (par exemple « Enregistrer »)."
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 698,
                    columnNumber: 9
                }, this),
                erreur && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alerte"], {
                    children: erreur
                }, void 0, false, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 701,
                    columnNumber: 20
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-xl bg-zinc-50 px-3 py-2 text-[13px] text-zinc-600",
                    children: [
                        profil.nom,
                        " · ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-zinc-500",
                            children: profil.email
                        }, void 0, false, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 703,
                            columnNumber: 26
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 702,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Champ"], {
                    libelle: "Mot de passe",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 707,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Saisie"], {
                                type: "password",
                                autoComplete: "current-password",
                                required: true,
                                autoFocus: true,
                                value: motDePasse,
                                onChange: (e)=>setMotDePasse(e.target.value),
                                className: "w-full pl-9"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 708,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 706,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 705,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Champ"], {
                    libelle: "Code personnel",
                    aide: "Laissez vide si vous n’en avez pas reçu.",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__["KeyRound"], {
                                className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 713,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Saisie"], {
                                autoComplete: "one-time-code",
                                spellCheck: false,
                                value: code,
                                onChange: (e)=>{
                                    const brut = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
                                    setCode(brut.match(/.{1,4}/g)?.join("-") ?? "");
                                },
                                placeholder: "XXXX-XXXX-XXXX",
                                className: "w-full pl-9 font-mono tracking-wider"
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 714,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 712,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 711,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-center justify-between gap-2 pt-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: changerDeCompte,
                            className: "text-[12px] text-zinc-500 hover:text-encre hover:underline",
                            children: "Changer de compte"
                        }, void 0, false, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 728,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bouton"], {
                                    type: "button",
                                    onClick: fermer,
                                    children: "Plus tard"
                                }, void 0, false, {
                                    fileName: "[project]/components/session.tsx",
                                    lineNumber: 732,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bouton"], {
                                    variante: "principal",
                                    type: "submit",
                                    disabled: envoi,
                                    children: envoi ? "Connexion…" : "Se reconnecter"
                                }, void 0, false, {
                                    fileName: "[project]/components/session.tsx",
                                    lineNumber: 735,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 731,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 727,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/session.tsx",
            lineNumber: 697,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/session.tsx",
        lineNumber: 696,
        columnNumber: 5
    }, this);
}
_s3(Reconnexion, "gv6/paXAmroykvNp1ec/sg9a5bc=");
_c3 = Reconnexion;
/**
 * Où l'on est (DG, 25/10/2026) : le menu ne se déroule pas, le chemin en haut de la page le dit —
 * Personnel › Base du personnel › Présence ; chaque étape se clique pour remonter.
 */ function FilAriane({ chemin, profil }) {
    const etapes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$espaces$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cheminDe"])(chemin, profil);
    if (!etapes.length) return null;
    // Une petite frise : l'accueil, puis chaque étape numérotée, reliées par un trait ; on est sur la dernière
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        "aria-label": "Où vous êtes",
        className: "no-print mb-5 overflow-x-auto",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
            className: "inline-flex min-w-max items-center rounded-2xl bg-white px-3 py-2 shadow-doux ring-1 ring-zinc-100",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                    className: "flex items-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        title: "Tableau de bord",
                        className: "flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-marque-50 hover:text-marque-700",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"], {
                            className: "size-3.5"
                        }, void 0, false, {
                            fileName: "[project]/components/session.tsx",
                            lineNumber: 758,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 757,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/session.tsx",
                    lineNumber: 756,
                    columnNumber: 9
                }, this),
                etapes.map((x, i)=>{
                    const derniere = i === etapes.length - 1;
                    const contenu = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition", derniere ? "bg-marque-600 text-white shadow-sm shadow-marque-600/30" : "bg-marque-50 text-marque-700 ring-1 ring-marque-200 group-hover:bg-marque-100"),
                                children: i + 1
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 765,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("text-[13px] whitespace-nowrap", derniere ? "font-semibold text-encre" : "font-medium text-zinc-600 group-hover:text-marque-700"),
                                children: x.libelle
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 773,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 764,
                        columnNumber: 13
                    }, this);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "flex items-center",
                        "aria-current": derniere ? "page" : undefined,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cx"])("mx-2 h-0.5 w-6 rounded-full", derniere ? "bg-marque-300" : "bg-zinc-200"),
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 778,
                                columnNumber: 15
                            }, this),
                            x.href && !derniere ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: x.href,
                                className: "group flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 transition hover:bg-marque-50/60",
                                children: contenu
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 780,
                                columnNumber: 17
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "flex items-center gap-2 rounded-full bg-marque-50/70 py-0.5 pr-3 pl-0.5",
                                children: contenu
                            }, void 0, false, {
                                fileName: "[project]/components/session.tsx",
                                lineNumber: 784,
                                columnNumber: 17
                            }, this)
                        ]
                    }, `${x.libelle}-${i}`, true, {
                        fileName: "[project]/components/session.tsx",
                        lineNumber: 777,
                        columnNumber: 13
                    }, this);
                })
            ]
        }, void 0, true, {
            fileName: "[project]/components/session.tsx",
            lineNumber: 755,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/session.tsx",
        lineNumber: 754,
        columnNumber: 5
    }, this);
}
_c4 = FilAriane;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "Coquille");
__turbopack_context__.k.register(_c1, "LienMenu");
__turbopack_context__.k.register(_c2, "PanneauAlertes");
__turbopack_context__.k.register(_c3, "Reconnexion");
__turbopack_context__.k.register(_c4, "FilAriane");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Aide",
    ()=>Aide,
    "Alerte",
    ()=>Alerte,
    "Annonce",
    ()=>Annonce,
    "Badge",
    ()=>Badge,
    "Bouton",
    ()=>Bouton,
    "BoutonIcone",
    ()=>BoutonIcone,
    "Carte",
    ()=>Carte,
    "Champ",
    ()=>Champ,
    "Chargement",
    ()=>Chargement,
    "Chiffre",
    ()=>Chiffre,
    "ChoixMois",
    ()=>ChoixMois,
    "EnTete",
    ()=>EnTete,
    "Jauge",
    ()=>Jauge,
    "Liste",
    ()=>Liste,
    "Modale",
    ()=>Modale,
    "Pastille",
    ()=>Pastille,
    "Progression",
    ()=>Progression,
    "Saisie",
    ()=>Saisie,
    "Segments",
    ()=>Segments,
    "Tableau",
    ()=>Tableau,
    "Vide",
    ()=>Vide,
    "Zone",
    ()=>Zone,
    "ZoneFichier",
    ()=>ZoneFichier,
    "cx",
    ()=>cx,
    "useConfirmation",
    ()=>useConfirmation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.mjs [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.mjs [app-client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-spreadsheet.mjs [app-client] (ecmascript) <export default as FileSpreadsheet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.mjs [app-client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.mjs [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.mjs [app-client] (ecmascript) <export default as TriangleAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.mjs [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.mjs [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.mjs [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function cx(...c) {
    return c.filter(Boolean).join(" ");
}
const TONS = {
    gris: "bg-zinc-100 text-zinc-600",
    vert: "bg-marque-50 text-marque-700",
    jaune: "bg-or-100 text-or-700",
    rouge: "bg-rouge-100 text-rouge-600",
    bleu: "bg-sky-50 text-sky-700"
};
/** Couleur pleine des pastilles d'icônes, par ton. */ const PASTILLES = {
    gris: "bg-zinc-100 text-zinc-600",
    vert: "bg-marque-500 text-white",
    jaune: "bg-or-400 text-zinc-900",
    rouge: "bg-rouge-600 text-white",
    bleu: "bg-sky-500 text-white"
};
function Badge({ ton = "gris", children, titre }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        title: titre,
        className: cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap", TONS[ton]),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_c = Badge;
function Pastille({ ton = "vert", children, taille = "md" }) {
    const t = {
        sm: "size-7 [&_svg]:size-3.5",
        md: "size-9 [&_svg]:size-4",
        lg: "size-11 [&_svg]:size-5"
    }[taille];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: cx("inline-flex shrink-0 items-center justify-center rounded-full", t, PASTILLES[ton]),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 78,
        columnNumber: 5
    }, this);
}
_c1 = Pastille;
function Bouton({ variante = "secondaire", className, chargement, onClick, disabled, children, ...props }) {
    _s();
    // Une action longue (calcul, fichier Excel…) grise le bouton jusqu'à la fin :
    // on ne peut pas cliquer deux fois, et l'on voit que le système travaille.
    const [occupe, setOccupe] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const enCours = chargement || occupe;
    const v = {
        principal: "bg-marque-500 text-white shadow-sm shadow-marque-500/20 hover:bg-marque-600 hover:shadow-md hover:shadow-marque-500/25 disabled:bg-marque-200 disabled:shadow-none",
        secondaire: "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300 disabled:text-zinc-400",
        danger: "bg-rouge-100 text-rouge-600 hover:bg-rouge-600 hover:text-white disabled:opacity-50",
        discret: "px-2! text-marque-700 hover:bg-marque-50 disabled:text-zinc-400",
        sombre: "bg-nuit text-white hover:bg-black disabled:opacity-50"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        ...props,
        disabled: disabled || enCours,
        "aria-busy": enCours || undefined,
        onClick: (e)=>{
            const r = onClick?.(e);
            if (r && typeof r.then === "function") {
                setOccupe(true);
                r.finally(()=>setOccupe(false)).catch(()=>undefined);
            }
        },
        className: cx("inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:translate-y-0 [&_svg]:size-4 [&_svg]:transition-transform", enCours && "cursor-wait! [&>svg:not(.roue)]:hidden", v[variante], className),
        children: [
            enCours && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                className: "roue animate-spin",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 138,
                columnNumber: 19
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 120,
        columnNumber: 5
    }, this);
}
_s(Bouton, "EU5hk7+i30sNNBLeC+EW/IlcVVk=");
_c2 = Bouton;
const ANNONCE = {
    vert: {
        titre: "C’est fait",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"],
        couleur: "bg-marque-50 text-marque-600"
    },
    rouge: {
        titre: "L’opération n’a pas abouti",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"],
        couleur: "bg-rouge-100 text-rouge-600"
    },
    jaune: {
        titre: "À noter",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlert$3e$__["TriangleAlert"],
        couleur: "bg-or-100 text-or-700"
    },
    bleu: {
        titre: "Information",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"],
        couleur: "bg-zinc-100 text-zinc-600"
    }
};
function Annonce({ ton = "vert", fermer, children }) {
    _s1();
    const ouverte = children !== null && children !== undefined && children !== false && children !== "";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Annonce.useEffect": ()=>{
            if (!ouverte) return;
            const f = {
                "Annonce.useEffect.f": (e)=>(e.key === "Escape" || e.key === "Enter") && fermer()
            }["Annonce.useEffect.f"];
            window.addEventListener("keydown", f);
            return ({
                "Annonce.useEffect": ()=>window.removeEventListener("keydown", f)
            })["Annonce.useEffect"];
        }
    }["Annonce.useEffect"], [
        ouverte,
        fermer
    ]);
    if (!ouverte) return null;
    const a = ANNONCE[ton] ?? ANNONCE.bleu;
    const Icone = a.icone;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-[60] animate-voile overflow-y-auto bg-nuit/40 backdrop-blur-sm",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-full items-center justify-center p-4 sm:p-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full max-w-md animate-fenetre rounded-3xl bg-white p-6 text-center shadow-2xl",
                role: "alertdialog",
                "aria-modal": "true",
                "aria-label": a.titre,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: cx("mx-auto mb-4 flex size-12 items-center justify-center rounded-full", a.couleur),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icone, {
                            className: "size-6"
                        }, void 0, false, {
                            fileName: "[project]/components/ui.tsx",
                            lineNumber: 171,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 170,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "mb-2 text-lg font-semibold text-encre",
                        children: a.titre
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-[13px] leading-relaxed text-zinc-600",
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 174,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-6 flex justify-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
                            variante: ton === "rouge" ? "sombre" : "principal",
                            autoFocus: true,
                            onClick: fermer,
                            className: "min-w-28",
                            children: "OK"
                        }, void 0, false, {
                            fileName: "[project]/components/ui.tsx",
                            lineNumber: 176,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 175,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 169,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/ui.tsx",
            lineNumber: 168,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 167,
        columnNumber: 5
    }, this), document.body);
}
_s1(Annonce, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c3 = Annonce;
function Jauge({ valeur, max, className }) {
    const pct = max > 0 ? Math.min(100, Math.round(valeur / max * 100)) : valeur > 0 ? 100 : 0;
    const couleur = valeur >= max ? "bg-rouge-600" : pct >= 80 ? "bg-or-400" : "bg-marque-500";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("h-2 overflow-hidden rounded-full bg-zinc-200", className),
        role: "progressbar",
        "aria-valuenow": valeur,
        "aria-valuemax": max,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: cx("h-full rounded-full transition-all", couleur),
            style: {
                width: `${pct}%`
            }
        }, void 0, false, {
            fileName: "[project]/components/ui.tsx",
            lineNumber: 193,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 192,
        columnNumber: 5
    }, this);
}
_c4 = Jauge;
function Champ({ libelle, aide, bulle, erreur, children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: cx("flex flex-col gap-1.5 text-sm", erreur && "[&_input]:border-rouge-600 [&_input]:bg-rouge-100/50 [&_select]:border-rouge-600 [&_select]:bg-rouge-100/50", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: cx("flex items-center gap-1.5 text-xs font-medium", erreur ? "text-rouge-600" : "text-zinc-500"),
                children: [
                    libelle,
                    bulle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Aide, {
                        children: bulle
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 225,
                        columnNumber: 19
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 223,
                columnNumber: 7
            }, this),
            children,
            erreur ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-[11px] font-medium text-rouge-600",
                children: erreur
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 228,
                columnNumber: 17
            }, this) : aide && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-[11px] text-zinc-400",
                children: aide
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 228,
                columnNumber: 100
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 216,
        columnNumber: 5
    }, this);
}
_c5 = Champ;
const NOMS_MOIS = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
];
function ChoixMois({ value, onChange, annees = 6, className }) {
    _s2();
    // Choix incomplet (mois sans année, ou l'inverse) : gardé ici tant que la valeur est vide
    const [partiel, setPartiel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        a: "",
        m: ""
    });
    const a = value ? value.slice(0, 4) : partiel.a;
    const m = value ? value.slice(5, 7) : partiel.m;
    const actuelle = new Date().getFullYear();
    const liste = Array.from({
        length: annees + 2
    }, (_, i)=>String(actuelle + 1 - i));
    if (a && !liste.includes(a)) liste.push(a);
    const changer = (na, nm)=>{
        setPartiel({
            a: na,
            m: nm
        });
        onChange(na && nm ? `${na}-${nm}` : "");
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("flex gap-2", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                value: m,
                onChange: (e)=>changer(a, e.target.value),
                className: cx(styleSaisie, "min-w-0 flex-1 cursor-pointer pr-8"),
                "aria-label": "Mois",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: "— Mois —"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 265,
                        columnNumber: 9
                    }, this),
                    NOMS_MOIS.map((n, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            value: String(i + 1).padStart(2, "0"),
                            children: n
                        }, n, false, {
                            fileName: "[project]/components/ui.tsx",
                            lineNumber: 267,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 264,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                value: a,
                onChange: (e)=>changer(e.target.value, m),
                className: cx(styleSaisie, "w-36 shrink-0 cursor-pointer pr-8"),
                "aria-label": "Année",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: "— Année —"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 273,
                        columnNumber: 9
                    }, this),
                    liste.map((x)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            children: x
                        }, x, false, {
                            fileName: "[project]/components/ui.tsx",
                            lineNumber: 275,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 272,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 263,
        columnNumber: 5
    }, this);
}
_s2(ChoixMois, "sGJur36o7t2wJThT3KXOlNMoRbI=");
_c6 = ChoixMois;
const styleSaisie = "rounded-xl border border-transparent bg-zinc-100/80 px-3 py-2 text-[13px] text-encre outline-none transition placeholder:text-zinc-400 hover:bg-zinc-100 focus:border-marque-300 focus:bg-white focus:ring-4 focus:ring-marque-100 disabled:opacity-60";
function Saisie(props) {
    // Une date : un clic n'importe où sur le champ ouvre le calendrier (sous Firefox, un clic sur le
    // texte ne fait que choisir le jour ou le mois, et l'on croit le champ bloqué : DG, 28/10/2026)
    const calendrier = props.type === "date" || props.type === "month" ? (e)=>{
        props.onClick?.(e);
        try {
            if (!props.disabled && !props.readOnly) e.currentTarget.showPicker?.();
        } catch  {
        // Calendrier déjà ouvert, ou navigateur qui ne le permet pas : la saisie au clavier reste possible
        }
    } : props.onClick;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
        ...props,
        onClick: calendrier,
        className: cx(styleSaisie, props.className)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 299,
        columnNumber: 10
    }, this);
}
_c7 = Saisie;
function Zone(props) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
        ...props,
        className: cx(styleSaisie, "min-h-20", props.className)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 304,
        columnNumber: 5
    }, this);
}
_c8 = Zone;
function Liste({ options, vide, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
        ...props,
        className: cx(styleSaisie, "cursor-pointer pr-8", props.className),
        children: [
            vide !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                value: "",
                children: vide
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 324,
                columnNumber: 30
            }, this),
            options.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                    value: o.valeur,
                    children: o.libelle
                }, o.valeur, false, {
                    fileName: "[project]/components/ui.tsx",
                    lineNumber: 326,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 320,
        columnNumber: 5
    }, this);
}
_c9 = Liste;
function Carte({ titre, actions, children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: cx("rounded-3xl bg-white p-5 shadow-doux", className),
        children: [
            (titre || actions) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "mb-4 flex flex-wrap items-center justify-between gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-[15px] font-semibold text-encre",
                        children: titre
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 349,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2",
                        children: actions
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 350,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 348,
                columnNumber: 9
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 346,
        columnNumber: 5
    }, this);
}
_c10 = Carte;
function EnTete({ titre, sousTitre, actions }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-6 flex flex-wrap items-end justify-between gap-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-3xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-[26px] font-semibold tracking-tight text-encre",
                        children: titre
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 370,
                        columnNumber: 9
                    }, this),
                    sousTitre && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-[13px] leading-relaxed text-zinc-500",
                        children: sousTitre
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 374,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 369,
                columnNumber: 7
            }, this),
            actions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-2",
                children: actions
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 379,
                columnNumber: 19
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 368,
        columnNumber: 5
    }, this);
}
_c11 = EnTete;
function Alerte({ ton = "rouge", children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-relaxed", TONS[ton]),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                className: "mt-0.5 size-4 shrink-0",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 398,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0",
                children: children
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 399,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 392,
        columnNumber: 5
    }, this);
}
_c12 = Alerte;
function Chiffre({ libelle, valeur, ton, detail, icone, href }) {
    const contenu = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            icone && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pastille, {
                ton: ton ?? "vert",
                taille: "lg",
                children: icone
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 423,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0 flex-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-xs text-zinc-500",
                        children: libelle
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 428,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-0.5 text-2xl font-semibold tabular-nums text-encre",
                        children: valeur
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 429,
                        columnNumber: 9
                    }, this),
                    detail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-1 text-[11px] text-zinc-400",
                        children: detail
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 433,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 427,
                columnNumber: 7
            }, this),
            href && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                className: "mt-1 size-4 shrink-0 text-zinc-300 transition-colors group-hover:text-marque-600",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 437,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 421,
        columnNumber: 5
    }, this);
    const classe = "flex items-start gap-3 rounded-3xl bg-white p-5 shadow-doux";
    if (!href) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: classe,
        children: contenu
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 445,
        columnNumber: 21
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        className: cx(classe, "group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-1 hover:ring-marque-200"),
        children: contenu
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 447,
        columnNumber: 5
    }, this);
}
_c13 = Chiffre;
function Progression({ valeur, ton = "vert" }) {
    const c = {
        vert: "bg-marque-500",
        jaune: "bg-or-400",
        rouge: "bg-rouge-600",
        bleu: "bg-sky-500",
        gris: "bg-zinc-400"
    }[ton];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-1.5 w-full overflow-hidden rounded-full bg-zinc-100",
        role: "progressbar",
        "aria-valuenow": Math.round(valeur),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: cx("h-full rounded-full transition-all duration-700", c),
            style: {
                width: `${Math.min(100, Math.max(0, valeur))}%`
            }
        }, void 0, false, {
            fileName: "[project]/components/ui.tsx",
            lineNumber: 482,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 475,
        columnNumber: 5
    }, this);
}
_c14 = Progression;
function Modale({ titre, ouverte, fermer, children, large }) {
    _s3();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Modale.useEffect": ()=>{
            if (!ouverte) return;
            const f = {
                "Modale.useEffect.f": (e)=>e.key === "Escape" && fermer()
            }["Modale.useEffect.f"];
            window.addEventListener("keydown", f);
            return ({
                "Modale.useEffect": ()=>window.removeEventListener("keydown", f)
            })["Modale.useEffect"];
        }
    }["Modale.useEffect"], [
        ouverte,
        fermer
    ]);
    if (!ouverte) return null;
    return(// Un clic à côté de la fenêtre ne la ferme pas (on ne perd pas une saisie par erreur) :
    // seuls la croix, un bouton « Annuler » ou la touche Échap la ferment.
    // Rendue directement dans <body> : centrée sur tout l'écran, voile flou sur toute la fenêtre,
    // quelle que soit la page qui l'ouvre (l'animation des pages ne la décale plus).
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 animate-voile overflow-y-auto bg-nuit/40 backdrop-blur-sm",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-full items-center justify-center p-4 sm:p-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: cx("w-full animate-fenetre rounded-3xl bg-white p-6 shadow-2xl", large ? "max-w-3xl" : "max-w-lg"),
                role: "dialog",
                "aria-modal": "true",
                "aria-label": titre,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-5 flex items-start justify-between gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-lg font-semibold text-encre",
                                children: titre
                            }, void 0, false, {
                                fileName: "[project]/components/ui.tsx",
                                lineNumber: 528,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: fermer,
                                className: "rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
                                "aria-label": "Fermer",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui.tsx",
                                    lineNumber: 534,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/ui.tsx",
                                lineNumber: 529,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 527,
                        columnNumber: 13
                    }, this),
                    children
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 518,
                columnNumber: 11
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/ui.tsx",
            lineNumber: 517,
            columnNumber: 9
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 516,
        columnNumber: 7
    }, this), document.body));
}
_s3(Modale, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c15 = Modale;
function Chargement({ texte = "Chargement…" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-center gap-2 py-12 text-sm text-zinc-400",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                className: "size-4 animate-spin",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 549,
                columnNumber: 7
            }, this),
            " ",
            texte
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 548,
        columnNumber: 5
    }, this);
}
_c16 = Chargement;
function Vide({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "py-12 text-center text-sm text-zinc-400",
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 556,
        columnNumber: 5
    }, this);
}
_c17 = Vide;
function Tableau({ children, className, fixe }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("-mx-1 overflow-x-auto", className),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            className: cx("w-full border-separate border-spacing-0 text-left text-[13px] [&_td]:border-b [&_td]:border-zinc-100 [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:pb-3 [&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-zinc-400 [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200 [&_tbody_tr:hover]:bg-zinc-50/80 [&_tbody_tr:last-child_td]:border-b-0", fixe && "table-fixed"),
            children: children
        }, void 0, false, {
            fileName: "[project]/components/ui.tsx",
            lineNumber: 572,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 571,
        columnNumber: 5
    }, this);
}
_c18 = Tableau;
function Segments({ valeur, options, changer }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-doux",
        children: options.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                "aria-pressed": o.valeur === valeur,
                onClick: ()=>changer(o.valeur),
                className: cx("rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200", o.valeur === valeur ? "bg-nuit text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-encre"),
                children: o.libelle
            }, String(o.valeur), false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 597,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 595,
        columnNumber: 5
    }, this);
}
_c19 = Segments;
function Aide({ children, cote = "bas" }) {
    _s4();
    // La bulle s'affiche au-dessus de toute la page (portail) : elle n'est ni coupée
    // par un tableau, ni cachée par les boutons voisins, et reste dans l'écran.
    const [pos, setPos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const largeur = 288;
    function ouvrir(e) {
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.min(Math.max(r.left + r.width / 2 - largeur / 2, 8), window.innerWidth - largeur - 8);
        const haut = cote === "haut" || r.bottom + 180 > window.innerHeight;
        setPos({
            x,
            y: haut ? r.top - 8 : r.bottom + 8,
            haut
        });
        requestAnimationFrame(()=>setVisible(true));
    }
    function fermer() {
        setVisible(false);
        setPos(null);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        tabIndex: 0,
        role: "note",
        "aria-label": "Aide",
        onMouseEnter: ouvrir,
        onMouseLeave: fermer,
        onFocus: ouvrir,
        onBlur: fermer,
        onClick: (e)=>{
            e.preventDefault();
            e.stopPropagation();
        },
        className: "relative inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 outline-none transition-colors hover:bg-marque-500 hover:text-white focus:bg-marque-500 focus:text-white",
        children: [
            "?",
            pos && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                role: "tooltip",
                style: {
                    left: pos.x,
                    top: pos.y,
                    width: largeur
                },
                className: cx("pointer-events-none fixed z-[100] rounded-2xl bg-nuit px-4 py-3 text-left text-[12px] leading-relaxed font-normal whitespace-normal text-white shadow-xl transition-all duration-200 ease-out", pos.haut ? "-translate-y-full origin-bottom" : "origin-top", visible ? "scale-100 opacity-100" : "scale-95 opacity-0"),
                children: children
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 657,
                columnNumber: 11
            }, this), document.body)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 640,
        columnNumber: 5
    }, this);
}
_s4(Aide, "JqBNanBxk0Z8+ISj/yhREWjwNJI=");
_c20 = Aide;
function BoutonIcone({ libelle, ton = "gris", children, ...props }) {
    const c = {
        gris: "text-zinc-500 hover:bg-zinc-100 hover:text-encre",
        vert: "text-marque-600 hover:bg-marque-50",
        rouge: "text-zinc-400 hover:bg-rouge-100 hover:text-rouge-600"
    }[ton];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        ...props,
        title: libelle,
        "aria-label": libelle,
        className: cx("inline-flex size-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4", c, props.className),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 690,
        columnNumber: 5
    }, this);
}
_c21 = BoutonIcone;
function ZoneFichier({ accept, envoi, envoyer, libelleBouton = "Importer", aide }) {
    _s5();
    const [fichier, setFichier] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [survol, setSurvol] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-wrap items-center gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                onDragOver: (e)=>{
                    e.preventDefault();
                    setSurvol(true);
                },
                onDragLeave: ()=>setSurvol(false),
                onDrop: (e)=>{
                    e.preventDefault();
                    setSurvol(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFichier(f);
                },
                className: cx("flex min-w-72 flex-1 cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 transition-colors", survol ? "border-marque-500 bg-marque-50" : "border-zinc-200 hover:border-marque-300 hover:bg-zinc-50"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pastille, {
                        ton: fichier ? "vert" : "gris",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__["FileSpreadsheet"], {}, void 0, false, {
                            fileName: "[project]/components/ui.tsx",
                            lineNumber: 743,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 742,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block truncate text-[13px] font-medium",
                                children: fichier ? fichier.name : "Déposez le fichier ici ou cliquez pour le choisir"
                            }, void 0, false, {
                                fileName: "[project]/components/ui.tsx",
                                lineNumber: 746,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block text-[11px] text-zinc-400",
                                children: fichier ? `${(fichier.size / 1024 / 1024).toFixed(1)} Mo` : aide ?? "Fichier Excel (.xlsx)"
                            }, void 0, false, {
                                fileName: "[project]/components/ui.tsx",
                                lineNumber: 751,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 745,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "file",
                        accept: accept,
                        className: "sr-only",
                        onChange: (e)=>setFichier(e.target.files?.[0] ?? null)
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 757,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 723,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
                variante: "principal",
                disabled: !fichier || envoi,
                onClick: ()=>fichier && envoyer(fichier),
                children: [
                    envoi ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "animate-spin"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 769,
                        columnNumber: 18
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {}, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 769,
                        columnNumber: 57
                    }, this),
                    envoi ? "Import en cours…" : libelleBouton
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 764,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 722,
        columnNumber: 5
    }, this);
}
_s5(ZoneFichier, "Cm6gUjZ++MOAxO4vtE8sovHTOhk=");
_c22 = ZoneFichier;
function useConfirmation() {
    _s6();
    const [q, setQ] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const demander = (question, libelle = "Oui, retirer")=>new Promise((repondre)=>setQ({
                question,
                libelle,
                repondre
            }));
    const repondre = (oui)=>{
        q?.repondre(oui);
        setQ(null);
    };
    const fenetre = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Modale, {
        titre: "Confirmer",
        ouverte: !!q,
        fermer: ()=>repondre(false),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[13px] leading-relaxed text-zinc-600",
                children: q?.question
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 792,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-6 flex justify-end gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
                        onClick: ()=>repondre(false),
                        children: "Annuler"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 794,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
                        variante: "danger",
                        onClick: ()=>repondre(true),
                        children: q?.libelle
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 795,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 793,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 791,
        columnNumber: 5
    }, this);
    return [
        fenetre,
        demander
    ];
}
_s6(useConfirmation, "+3ZRVk2/ma44VokFAvfD2MSU6NU=");
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12, _c13, _c14, _c15, _c16, _c17, _c18, _c19, _c20, _c21, _c22;
__turbopack_context__.k.register(_c, "Badge");
__turbopack_context__.k.register(_c1, "Pastille");
__turbopack_context__.k.register(_c2, "Bouton");
__turbopack_context__.k.register(_c3, "Annonce");
__turbopack_context__.k.register(_c4, "Jauge");
__turbopack_context__.k.register(_c5, "Champ");
__turbopack_context__.k.register(_c6, "ChoixMois");
__turbopack_context__.k.register(_c7, "Saisie");
__turbopack_context__.k.register(_c8, "Zone");
__turbopack_context__.k.register(_c9, "Liste");
__turbopack_context__.k.register(_c10, "Carte");
__turbopack_context__.k.register(_c11, "EnTete");
__turbopack_context__.k.register(_c12, "Alerte");
__turbopack_context__.k.register(_c13, "Chiffre");
__turbopack_context__.k.register(_c14, "Progression");
__turbopack_context__.k.register(_c15, "Modale");
__turbopack_context__.k.register(_c16, "Chargement");
__turbopack_context__.k.register(_c17, "Vide");
__turbopack_context__.k.register(_c18, "Tableau");
__turbopack_context__.k.register(_c19, "Segments");
__turbopack_context__.k.register(_c20, "Aide");
__turbopack_context__.k.register(_c21, "BoutonIcone");
__turbopack_context__.k.register(_c22, "ZoneFichier");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "API_URL",
    ()=>API_URL,
    "CLE_JETON",
    ()=>CLE_JETON,
    "CLE_PROFIL",
    ()=>CLE_PROFIL,
    "ErreurApi",
    ()=>ErreurApi,
    "SESSION_ROUVERTE",
    ()=>SESSION_ROUVERTE,
    "TRAVAIL_MODIFIE",
    ()=>TRAVAIL_MODIFIE,
    "api",
    ()=>api,
    "fermerSession",
    ()=>fermerSession,
    "lireSession",
    ()=>lireSession,
    "memoriserProfil",
    ()=>memoriserProfil,
    "nomDeFichier",
    ()=>nomDeFichier,
    "ouvrirSession",
    ()=>ouvrirSession,
    "qs",
    ()=>qs,
    "surSessionExpiree",
    ()=>surSessionExpiree,
    "useApi",
    ()=>useApi,
    "viderMemoire",
    ()=>viderMemoire
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
const API_URL = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_API_URL ?? "/api";
const CLE_JETON = "dgrhas.jeton";
const CLE_PROFIL = "dgrhas.profil";
function lireSession() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const jeton = localStorage.getItem(CLE_JETON);
        const p = localStorage.getItem(CLE_PROFIL);
        return {
            jeton,
            profil: p ? JSON.parse(p) : null
        };
    } catch  {
        return {
            jeton: null,
            profil: null
        };
    }
}
function ouvrirSession(jeton, profil) {
    viderMemoire();
    localStorage.setItem(CLE_JETON, jeton);
    localStorage.setItem(CLE_PROFIL, JSON.stringify(profil));
}
function memoriserProfil(profil) {
    try {
        localStorage.setItem(CLE_PROFIL, JSON.stringify(profil));
    } catch  {
    /* stockage indisponible */ }
}
let gestionnaireExpiration = null;
function surSessionExpiree(g) {
    gestionnaireExpiration = g;
    return ()=>{
        if (gestionnaireExpiration === g) gestionnaireExpiration = null;
    };
}
const SESSION_ROUVERTE = "dgrhas:session-rouverte";
const TRAVAIL_MODIFIE = "dgrhas:travail-modifie";
function sessionExpiree(message) {
    if (gestionnaireExpiration) return gestionnaireExpiration(message);
    fermerSession();
    if ("TURBOPACK compile-time truthy", 1) window.location.href = "/connexion";
}
/** Réponse du serveur : nouveau jeton (son propre code ou mot de passe vient de changer). */ function prendreNouveauJeton(rep) {
    const jeton = rep.headers.get("X-Jeton");
    if (jeton) try {
        localStorage.setItem(CLE_JETON, jeton);
    } catch  {
    /* stockage indisponible */ }
}
function fermerSession() {
    viderMemoire();
    try {
        localStorage.removeItem(CLE_JETON);
        localStorage.removeItem(CLE_PROFIL);
    } catch  {
    /* stockage indisponible */ }
}
/** Message affiché quand le serveur ne répond pas (réseau coupé, serveur arrêté ou en panne). */ const SERVEUR_INJOIGNABLE = "Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez. Si le problème persiste, contactez le support de la Direction Générale des Ressources Humaines et de l’Administration Scolaire.";
class ErreurApi extends Error {
    statut;
    constructor(message, statut){
        super(message), this.statut = statut;
    }
}
/**
 * Écritures en cours (enregistrement d'un paramètre, d'une fiche…). Une lecture attend
 * qu'elles soient terminées : la page ouverte juste après une modification la voit toujours.
 */ const ecritures = new Set();
async function requete(chemin, options = {}) {
    const lecture = !options.method || options.method === "GET";
    if (lecture && ecritures.size) await Promise.allSettled([
        ...ecritures
    ]);
    if (lecture) return envoyer(chemin, options);
    const p = envoyer(chemin, options);
    ecritures.add(p);
    return p.then((r)=>{
        // Ce qui a été lu avant l'enregistrement sera relu à son prochain affichage
        perimerMemoire();
        if (("TURBOPACK compile-time value", "object") !== "undefined" && !chemin.startsWith("/auth/")) window.dispatchEvent(new Event(TRAVAIL_MODIFIE));
        return r;
    }).finally(()=>ecritures.delete(p));
}
async function envoyer(chemin, options = {}) {
    const { jeton } = lireSession();
    const entetes = {
        ...options.headers
    };
    if (jeton) entetes.Authorization = `Bearer ${jeton}`;
    if (options.body && !(options.body instanceof FormData)) entetes["Content-Type"] = "application/json";
    const injoignable = new ErreurApi(SERVEUR_INJOIGNABLE, 0);
    let rep;
    try {
        rep = await fetch(`${API_URL}${chemin}`, {
            ...options,
            headers: entetes
        });
    } catch  {
        throw injoignable;
    }
    prendreNouveauJeton(rep);
    const texte = await rep.text();
    let corps = null;
    try {
        corps = texte ? JSON.parse(texte) : null;
    } catch  {
        // Réponse non JSON : le relais Next n'a pas pu joindre le backend, ou a abandonné (trop long)
        if (rep.status === 504 || rep.status === 408) throw new ErreurApi("Le traitement a pris trop de temps et a été interrompu. Réessayez avec moins de fichiers, ou des fichiers plus petits.", rep.status);
        if (rep.status >= 500) throw injoignable;
        throw new ErreurApi(`Erreur ${rep.status}`, rep.status);
    }
    if (!rep.ok) {
        const m = corps?.message;
        const message = Array.isArray(m) ? m.join(" ; ") : m ?? `Erreur ${rep.status}`;
        if (rep.status === 401 && !chemin.startsWith("/auth/connexion")) sessionExpiree(message);
        throw new ErreurApi(message, rep.status);
    }
    return corps;
}
/** Fichier téléchargé avec la session (mêmes règles que les autres appels : 401, nouveau jeton). */ async function fichier(chemin, init = {}) {
    const { jeton } = lireSession();
    let rep;
    try {
        rep = await fetch(`${API_URL}${chemin}`, {
            ...init,
            headers: {
                ...init.headers,
                ...jeton ? {
                    Authorization: `Bearer ${jeton}`
                } : {}
            }
        });
    } catch  {
        throw new ErreurApi(SERVEUR_INJOIGNABLE, 0);
    }
    prendreNouveauJeton(rep);
    if (!rep.ok) {
        let message = rep.status === 404 ? "Fichier introuvable" : `Téléchargement impossible (erreur ${rep.status})`;
        try {
            const corps = await rep.json();
            if (corps?.message) message = Array.isArray(corps.message) ? corps.message.join(" ; ") : corps.message;
        } catch  {
        /* réponse non JSON */ }
        if (rep.status === 401) sessionExpiree(message);
        throw new ErreurApi(message, rep.status);
    }
    return rep.blob();
}
function nomDeFichier(nom) {
    return nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2013\u2014]/g, "-").replace(/[’']/g, " ").replace(/°/g, "").replace(/[\\/:*?"<>|]/g, "-").replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
}
function enregistrerSous(blob, nom) {
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = nomDeFichier(nom);
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 60_000);
}
/* ------------------------- Fichiers Excel envoyés une fois ------------------------- */ /** Fichiers Excel déjà reçus par le serveur (empreinte → dernier envoi) : il les garde 10 min. */ const excelEnvoyes = new Map();
const EXCEL_GARDE_MS = 9 * 60_000;
async function empreinteDe(f) {
    const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
    return Array.from(new Uint8Array(h), (o)=>o.toString(16).padStart(2, "0")).join("");
}
/**
 * Envoi d'un formulaire avec fichier. Un classeur Excel seul (« Lire le fichier », « Essai »,
 * « Importer ») ne part qu'une fois : les envois suivants ne joignent que son empreinte, et le
 * serveur reprend le fichier qu'il a gardé. S'il ne l'a plus (412), le fichier est renvoyé.
 */ async function envoyerFichier(c, fd) {
    const f = fd.get("fichier");
    const seul = [
        ...fd.keys()
    ].length === 1;
    if (!seul || !(f instanceof File) || !/\.xlsx$/i.test(f.name) || typeof crypto === "undefined" || !crypto.subtle) return requete(c, {
        method: "POST",
        body: fd
    });
    const empreinte = await empreinteDe(f);
    const dernier = excelEnvoyes.get(empreinte);
    if (dernier && Date.now() - dernier < EXCEL_GARDE_MS) {
        try {
            const r = await requete(c, {
                method: "POST",
                headers: {
                    "X-Fichier": empreinte
                }
            });
            excelEnvoyes.set(empreinte, Date.now());
            return r;
        } catch (e) {
            if (!(e instanceof ErreurApi && e.statut === 412)) throw e;
        }
    }
    const r = await requete(c, {
        method: "POST",
        body: fd,
        headers: {
            "X-Fichier": empreinte
        }
    });
    excelEnvoyes.set(empreinte, Date.now());
    return r;
}
const api = {
    get: (c)=>requete(c),
    post: (c, corps)=>corps instanceof FormData ? envoyerFichier(c, corps) : requete(c, {
            method: "POST",
            body: JSON.stringify(corps ?? {})
        }),
    put: (c, corps)=>requete(c, {
            method: "PUT",
            body: JSON.stringify(corps)
        }),
    patch: (c, corps)=>requete(c, {
            method: "PATCH",
            body: JSON.stringify(corps)
        }),
    delete: (c)=>requete(c, {
            method: "DELETE"
        }),
    /** Téléchargement authentifié d'un fichier (ouvert dans un nouvel onglet). */ async ouvrirFichier (c) {
        const url = URL.createObjectURL(await fichier(c));
        window.open(url, "_blank", "noopener");
        setTimeout(()=>URL.revokeObjectURL(url), 60_000);
    },
    /** Téléchargement authentifié d'un fichier enregistré sous `nom`. */ async telecharger (c, nom) {
        enregistrerSous(await fichier(c), nom);
    },
    /** Fichier produit par le serveur à partir de données envoyées (POST), enregistré sous `nom`. */ async telechargerPost (c, corps, nom) {
        enregistrerSous(await fichier(c, {
            method: "POST",
            body: corps
        }), nom);
    }
};
/** En deçà, une donnée revue n'est pas relue (navigation d'une page à l'autre). */ const FRAICHEUR_MS = 15_000;
/** Nombre de lectures gardées (les plus anciennes sont oubliées d'abord). */ const MEMOIRE_MAX = 150;
const memoire = new Map();
const abonnes = new Map();
let appels = 0;
function prevenir(chemin) {
    abonnes.get(chemin)?.forEach((f)=>f());
}
function garder(chemin, e) {
    memoire.delete(chemin);
    memoire.set(chemin, e);
    if (memoire.size > MEMOIRE_MAX) {
        // Oublie la plus ancienne qu'aucune page affichée n'utilise
        for (const k of memoire.keys())if (!abonnes.get(k)?.size) {
            memoire.delete(k);
            break;
        }
    }
}
function viderMemoire() {
    memoire.clear();
}
/** Après un enregistrement : chaque donnée sera relue à son prochain affichage. */ function perimerMemoire() {
    for (const e of memoire.values())e.perimee = true;
}
/** Lecture partagée : réutilise l'appel en cours, sauf si `forcer` (rechargement demandé). */ function lire(chemin, forcer = false) {
    const e = memoire.get(chemin);
    if (e?.enCours && !forcer) return e.enCours;
    if (!forcer && e?.lue && !e.perimee && !e.erreur && Date.now() - e.lueLe < FRAICHEUR_MS) return Promise.resolve();
    const n = ++appels;
    const base = e ?? {
        donnees: null,
        lue: false,
        erreur: null,
        lueLe: 0,
        perimee: false,
        appel: n,
        enCours: null
    };
    const p = requete(chemin).then((d)=>{
        const x = memoire.get(chemin) ?? base;
        if (x.appel !== n) return;
        garder(chemin, {
            ...x,
            donnees: d,
            lue: true,
            erreur: null,
            lueLe: Date.now(),
            perimee: false,
            enCours: null
        });
    }, (err)=>{
        const x = memoire.get(chemin) ?? base;
        if (x.appel !== n) return;
        garder(chemin, {
            ...x,
            erreur: err.message,
            enCours: null
        });
    }).finally(()=>prevenir(chemin));
    garder(chemin, {
        ...base,
        appel: n,
        enCours: p
    });
    prevenir(chemin);
    return p;
}
function useApi(chemin) {
    _s();
    const [, rafraichir] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducer"])({
        "useApi.useReducer": (x)=>x + 1
    }["useApi.useReducer"], 0);
    // Dernières données affichées : gardées à l'écran pendant qu'une autre ressource se charge
    const [precedentes, setPrecedentes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useApi.useEffect": ()=>{
            if (!chemin) return;
            const liste = abonnes.get(chemin) ?? new Set();
            liste.add(rafraichir);
            abonnes.set(chemin, liste);
            void lire(chemin);
            // Retour sur l'onglet : relu en silence s'il date, pour voir ce qui a été modifié ailleurs
            const auRetour = {
                "useApi.useEffect.auRetour": ()=>{
                    if (document.visibilityState === "visible") void lire(chemin);
                }
            }["useApi.useEffect.auRetour"];
            // Après une reconnexion (session expirée), la donnée restée en erreur est relue
            const apresReconnexion = {
                "useApi.useEffect.apresReconnexion": ()=>void lire(chemin, true)
            }["useApi.useEffect.apresReconnexion"];
            window.addEventListener("focus", auRetour);
            document.addEventListener("visibilitychange", auRetour);
            window.addEventListener(SESSION_ROUVERTE, apresReconnexion);
            return ({
                "useApi.useEffect": ()=>{
                    liste.delete(rafraichir);
                    window.removeEventListener("focus", auRetour);
                    document.removeEventListener("visibilitychange", auRetour);
                    window.removeEventListener(SESSION_ROUVERTE, apresReconnexion);
                }
            })["useApi.useEffect"];
        }
    }["useApi.useEffect"], [
        chemin
    ]);
    const recharger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useApi.useCallback[recharger]": ()=>{
            if (chemin) void lire(chemin, true);
        }
    }["useApi.useCallback[recharger]"], [
        chemin
    ]);
    const setDonnees = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useApi.useCallback[setDonnees]": (d)=>{
            if (!chemin) return;
            const e = memoire.get(chemin);
            garder(chemin, {
                ...e ?? {
                    lue: true,
                    erreur: null,
                    lueLe: Date.now(),
                    perimee: false,
                    appel: ++appels,
                    enCours: null
                },
                donnees: d,
                lue: true
            });
            prevenir(chemin);
        }
    }["useApi.useCallback[setDonnees]"], [
        chemin
    ]);
    const e = chemin ? memoire.get(chemin) : undefined;
    const lue = !!e?.lue;
    if (lue && precedentes !== e.donnees) setPrecedentes(e.donnees);
    return {
        donnees: lue ? e.donnees : chemin ? precedentes : null,
        erreur: e?.erreur ?? null,
        chargement: !!chemin && !lue && !e?.erreur,
        recharger,
        setDonnees
    };
}
_s(useApi, "1wIgh9i/hnDPdYtDqGvdotRCPoU=");
function qs(params) {
    const p = Object.entries(params).filter(([, v])=>v !== undefined && v !== null && v !== "" && v !== false);
    return p.length ? "?" + p.map(([k, v])=>`${k}=${encodeURIComponent(String(v === true ? 1 : v))}`).join("&") : "";
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/espaces.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ESPACES",
    ()=>ESPACES,
    "ICONES_MENU",
    ()=>ICONES_MENU,
    "ICONES_ORIGINE",
    ()=>ICONES_ORIGINE,
    "MENU",
    ()=>MENU,
    "MENU_MODIFIE",
    ()=>MENU_MODIFIE,
    "ORIGINE_MENU",
    ()=>ORIGINE_MENU,
    "POLES",
    ()=>POLES,
    "accesDonne",
    ()=>accesDonne,
    "appliquerMenu",
    ()=>appliquerMenu,
    "cheminDe",
    ()=>cheminDe,
    "espaceDe",
    ()=>espaceDe,
    "lienEspace",
    ()=>lienEspace,
    "niveauPage",
    ()=>niveauPage,
    "niveauRubrique",
    ()=>niveauRubrique,
    "poleDe",
    ()=>poleDe,
    "rubriqueDe",
    ()=>rubriqueDe,
    "rubriquesVisibles",
    ()=>rubriquesVisibles,
    "travailEspace",
    ()=>travailEspace
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2d$right$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeftRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left-right.mjs [app-client] (ecmascript) <export default as ArrowLeftRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$award$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Award$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/award.mjs [app-client] (ecmascript) <export default as Award>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$briefcase$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Briefcase$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/briefcase.mjs [app-client] (ecmascript) <export default as Briefcase>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/book-open.mjs [app-client] (ecmascript) <export default as BookOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Folder$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/folder.mjs [app-client] (ecmascript) <export default as Folder>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/landmark.mjs [app-client] (ecmascript) <export default as Landmark>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$repeat$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Repeat$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/repeat.mjs [app-client] (ecmascript) <export default as Repeat>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.mjs [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$complex$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/building-complex.mjs [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/banknote.mjs [app-client] (ecmascript) <export default as Banknote>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.mjs [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-check.mjs [app-client] (ecmascript) <export default as CalendarCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/scale.mjs [app-client] (ecmascript) <export default as Scale>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/star.mjs [app-client] (ecmascript) <export default as Star>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$school$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__School$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/school.mjs [app-client] (ecmascript) <export default as School>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clipboard-check.mjs [app-client] (ecmascript) <export default as ClipboardCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clipboard-list.mjs [app-client] (ecmascript) <export default as ClipboardList>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CopyCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy-check.mjs [app-client] (ecmascript) <export default as CopyCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$plus$2d$corner$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FilePlus2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-plus-corner.mjs [app-client] (ecmascript) <export default as FilePlus2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-spreadsheet.mjs [app-client] (ecmascript) <export default as FileSpreadsheet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.mjs [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$gauge$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Gauge$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/gauge.mjs [app-client] (ecmascript) <export default as Gauge>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$graduation$2d$cap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GraduationCap$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/graduation-cap.mjs [app-client] (ecmascript) <export default as GraduationCap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hand$2d$heart$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__HandHeart$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/hand-heart.mjs [app-client] (ecmascript) <export default as HandHeart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2d$clock$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rotate-ccw-clock.mjs [app-client] (ecmascript) <export default as History>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/inbox.mjs [app-client] (ecmascript) <export default as Inbox>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layers$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Layers$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layers.mjs [app-client] (ecmascript) <export default as Layers>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$checks$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListChecks$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-checks.mjs [app-client] (ecmascript) <export default as ListChecks>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.mjs [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.mjs [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-check.mjs [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$stamp$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stamp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/stamp.mjs [app-client] (ecmascript) <export default as Stamp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$network$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Network$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/network.mjs [app-client] (ecmascript) <export default as Network>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-check.mjs [app-client] (ecmascript) <export default as UserCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user-plus.mjs [app-client] (ecmascript) <export default as UserPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.mjs [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/libelles.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$menu$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/menu-config.ts [app-client] (ecmascript)");
;
;
;
/** « 3 à contrôler · 1 en contentieux » : seulement les nombres non nuls. */ const parties = (...p)=>p.filter(([n])=>n > 0).map(([n, t])=>`${n} ${t}`).join(" · ");
const traiter = (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].traiter(p.role);
const parametrer = (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].parametrer(p.role);
/** Personnel : DGRHAS, DDEPPSA (leur département), comptes d’établissement (leurs agents). */ const recenser = (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].traiter(p.role) || p.role === "DDEPPSA" || p.role === "STRUCTURE";
const ESPACES = [
    {
        cle: "recrutement",
        titre: "Recrutement FP",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"],
        description: "Le recrutement à la Fonction Publique : des candidats retenus par la commission jusqu’au retour des textes, avec la gestion du quota.",
        circuit: "Saisie → contrôle → validation du DG → envoi à la FP → réception des textes",
        rubriques: [
            {
                href: "/candidats",
                libelle: "Saisie des candidats",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"],
                visible: traiter,
                explication: "Saisir ou importer les candidats retenus par la commission, puis les contrôler et les faire valider par le DG.",
                compteur: (c)=>({
                        n: c.aControler + c.aValider + c.contentieux,
                        texte: parties([
                            c.aControler,
                            "à contrôler"
                        ], [
                            c.aValider,
                            "à valider par le DG"
                        ], [
                            c.contentieux,
                            "en contentieux d’âge"
                        ])
                    })
            },
            {
                href: "/transmission",
                libelle: "Envoi à la FP",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"],
                visible: traiter,
                explication: "Regrouper les fiches validées en transmission, quota par quota, et produire le fichier Excel et les listes par lot.",
                compteur: (c)=>({
                        n: c.pretesFP,
                        texte: `${c.pretesFP} fiche(s) validée(s), prête(s) à partir`
                    })
            },
            {
                href: "/reception",
                libelle: "Réception des textes",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__["Inbox"],
                visible: traiter,
                explication: "Enregistrer les arrêtés et décrets renvoyés par la FP (un par un ou par fichier Excel), et les personnes du quota « Autres ».",
                info: (c)=>({
                        n: c.textesAttendus,
                        texte: `${c.textesAttendus} dossier(s) envoyé(s) attendent leur texte`
                    })
            },
            {
                href: "/recrutement",
                libelle: "Base des recrutés",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
                explication: "Toutes les personnes recrutées et leur texte de la FP ; reprise de la fiche de suivi Excel (travail fait hors du système)."
            },
            {
                href: "/commission",
                libelle: "Membres de la commission",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"],
                visible: traiter,
                explication: "Les membres de la commission de chaque quota et leurs places : dossiers apportés, validés et envoyés à la FP."
            },
            {
                href: "/pilotage",
                libelle: "Gestion du quota",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$gauge$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Gauge$3e$__["Gauge"],
                visible: parametrer,
                explication: "Le quota de recrutement et sa répartition (par département, par cycle, par membre de la commission), l’avancement de la campagne."
            }
        ]
    },
    {
        cle: "affectations",
        titre: "Affectations",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardCheck$3e$__["ClipboardCheck"],
        description: "Des textes reçus de la FP jusqu’aux notes d’affectation.",
        circuit: "Dates de signature du lot → compléter chaque personne → préparer les notes",
        rubriques: [
            {
                href: "/lots",
                libelle: "Lots de textes",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layers$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Layers$3e$__["Layers"],
                explication: "Les paquets de textes reçus de la FP : dates de signature et avancement des affectations, lot par lot.",
                compteur: (c)=>({
                        n: c.lotsSansDate,
                        texte: `${c.lotsSansDate} lot(s) sans date de signature`
                    })
            },
            {
                href: "/affectations",
                libelle: "Traitement des affectations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardCheck$3e$__["ClipboardCheck"],
                explication: "Vérifier et compléter chaque personne, régler les problèmes en rouge, puis préparer les notes du lot.",
                info: (c)=>({
                        n: c.pasAffectes,
                        texte: `${c.pasAffectes} personne(s) pas encore affectée(s)`
                    })
            },
            {
                href: "/recommandations",
                libelle: "Recommandations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$stamp$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stamp$3e$__["Stamp"],
                explication: "Les changements à la règle (autre département, établissement, note) pour une affectation, une mutation ou un enrôlement : proposés par le chef de service, avis du directeur, décision du DG.",
                compteur: (c)=>({
                        n: c.recommandations,
                        texte: `${c.recommandations} en attente (avis du directeur ou décision du DG)`
                    })
            },
            {
                href: "/statistiques",
                libelle: "Statistiques de suivi",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
                explication: "Par quota : dossiers envoyés, textes reçus, affectés et restes ; textes reçus par cycle et par département."
            }
        ]
    },
    {
        cle: "enrolement",
        titre: "Volontaires et communautaires",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hand$2d$heart$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__HandHeart$3e$__["HandHeart"],
        description: "La gestion des volontaires et des communautaires : chaque année on enrôle les volontaires (campagne, dossiers, notes de service), chaque mois on paie leur bourse. Les communautaires ont aussi leur liste de paiement mensuelle (sans note ni vague). Le guide ci-dessous dit, étape par étape, quoi faire, qui le fait et où.",
        rubriques: [
            {
                groupe: "Chaque année : enrôler",
                href: "/enrolement/campagne",
                libelle: "Campagne, quota et commission",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
                visible: traiter,
                explication: "Ouvrir l’enrôlement de l’année, fixer le quota (DG) et les places des membres de la commission."
            },
            {
                groupe: "Chaque année : enrôler",
                href: "/enrolement/saisie",
                libelle: "Saisie des enrôlements",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"],
                visible: traiter,
                explication: "Saisir ou importer les dossiers déposés, les contrôler, puis la DGRHAS retient ou non."
            },
            {
                groupe: "Chaque année : enrôler",
                href: "/enrolement/base",
                libelle: "Base des enrôlés",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"],
                visible: traiter,
                explication: "Les volontaires retenus : département et établissement, export Excel."
            },
            {
                groupe: "Chaque année : enrôler",
                href: "/notes/enrolement",
                libelle: "Notes d’enrôlement",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                explication: "Préparer les notes de service des volontaires retenus (on choisit l’année), puis validation et signature."
            },
            {
                groupe: "Chaque mois : payer",
                href: "/enrolement/volontaires",
                libelle: "Volontaires et communautaires",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
                visible: traiter,
                explication: "Les deux listes payées chaque mois : volontaires (bourse, par vague) et communautaires (par département et cycle). Sorties, réintégrations, reprise des listes existantes."
            },
            {
                groupe: "Chaque mois : payer",
                href: "/enrolement/bottin",
                libelle: "Pointage du bottin",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CopyCheck$3e$__["CopyCheck"],
                visible: traiter,
                explication: "Le bottin de la solde du mois comparé aux volontaires encore payés : ceux qui ont reçu leur premier salaire sortent du registre (la bourse s’arrête au premier salaire, pas au texte de la FP)."
            },
            {
                groupe: "Chaque mois : payer",
                href: "/enrolement/bourse",
                libelle: "Paiement mensuel",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$banknote$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Banknote$3e$__["Banknote"],
                visible: traiter,
                explication: "Chaque mois, l’état des volontaires (bourse) et celui des communautaires : contrôles (doublons, sur les deux listes, salariés au bottin), validation par le DG, Excel par département."
            },
            {
                groupe: "Chaque mois : payer",
                href: "/enrolement/mise-en-route",
                libelle: "Mise en route",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"],
                visible: traiter,
                explication: "Fiche de paiement de l’équipement et du transport, par note de service ; reprise des fiches déjà payées ; contrôle des doubles paiements."
            },
            {
                groupe: "Chaque mois : payer",
                href: "/enrolement/regularisations",
                libelle: "Régularisations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__["Scale"],
                visible: traiter,
                explication: "Trop-perçus détectés, compléments et retenues imputés sur la bourse, sommes à recouvrer des sortants."
            },
            {
                groupe: "Suivi et réglages",
                href: "/enrolement/tableau",
                libelle: "Tableau de bord",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
                visible: traiter,
                explication: "Volontaires en poste, coût mensuel, bourses des derniers mois, sorties, régularisations et mises en route."
            },
            {
                groupe: "Suivi et réglages",
                href: "/enrolement/configuration",
                libelle: "Configuration",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
                visible: traiter,
                explication: "Barèmes (bourse, mise d’équipement, transport), début et fin de la bourse, motifs de sortie, contrôles."
            }
        ]
    },
    {
        cle: "personnel",
        titre: "Base du personnel",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__["ClipboardList"],
        description: "La base générale du personnel : une seule fiche par personne (fonctionnaire, contractuel, volontaire, communautaire), avec ses pièces et son historique. Les autres modules l’alimentent : chaque volontaire du registre y a sa fiche, et le recensement la complète et la met à jour.",
        circuit: "Recensement (saisie, import, scans) → Contrôles → Fiches complètes",
        rubriques: [
            {
                groupe: "La base du personnel",
                href: "/recensement",
                libelle: "Recensement",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardCheck$3e$__["ClipboardCheck"],
                visible: recenser,
                explication: "Rechercher un agent et compléter ce qui lui manque, ajouter un agent absent de la base (contrôle, puis décision du DG), importer le fichier d’un recensement."
            },
            {
                groupe: "La base du personnel",
                href: "/personnel",
                libelle: "Tableau de bord",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
                visible: recenser,
                explication: "Où en est la base : fiches complètes, rubriques et pièces qui manquent, incohérences à corriger (dont les volontaires payés qui sont aussi fonctionnaires)."
            },
            {
                groupe: "La base du personnel",
                href: "/personnel/agents",
                libelle: "Base du personnel",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
                visible: recenser,
                explication: "Une fiche par personne : la créer, la corriger, déposer ses pièces scannées. Les volontaires du registre y sont déjà."
            },
            {
                groupe: "Suivi des agents",
                href: "/personnel/presence",
                libelle: "Présence",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarCheck$3e$__["CalendarCheck"],
                visible: recenser,
                explication: "Le chef de structure pointe ses agents (chaque jour ou en fin de semaine) et valide sa semaine ; le rapport montre les absences et les chefs qui n’ont pas pointé."
            },
            {
                groupe: "Suivi des agents",
                href: "/personnel/evaluations",
                libelle: "Évaluations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"],
                visible: recenser,
                explication: "L’évaluation annuelle par le chef immédiat : compétence professionnelle et compétence sociale sur 5, la globale et ce que dit leur écart."
            },
            {
                groupe: "Suivi des agents",
                href: "/personnel/retards-echelons",
                libelle: "Échelons en retard",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$award$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Award$3e$__["Award"],
                visible: (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].traiter(p.role) || p.role === "DDEPPSA",
                explication: "Les agents qui ont des échelons en retard (promotions ou avancements dus), avec des filtres et l’export Excel, Word, PDF : préparer la commission administrative paritaire sans demander de dossier."
            },
            {
                groupe: "Recensement",
                href: "/personnel/import",
                libelle: "Modèle Excel, import et scans",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__["FileSpreadsheet"],
                visible: recenser,
                explication: "Le modèle Excel à envoyer aux établissements, l’import d’une liste (nouveaux agents ou corrections), les scans en masse."
            },
            {
                groupe: "Réglages",
                href: "/personnel/configuration",
                libelle: "Configuration",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
                visible: traiter,
                explication: "Les rubriques de la fiche, ce qui est obligatoire pour chaque type d’agent, les pièces à joindre et les contrôles. Réglée par le DG."
            }
        ]
    },
    {
        cle: "mutations",
        titre: "Mutations",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2d$right$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeftRight$3e$__["ArrowLeftRight"],
        description: "Les demandes de mutation, de leur enregistrement à la décision du ministre.",
        circuit: "Nouvelle demande → avis → décision du ministre → note de mutation",
        rubriques: [
            {
                href: "/mutations/nouvelle",
                libelle: "Nouvelle demande",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$plus$2d$corner$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FilePlus2$3e$__["FilePlus2"],
                visible: traiter,
                explication: "Enregistrer une demande de mutation reçue."
            },
            {
                href: "/mutations",
                libelle: "Demandes",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2d$right$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeftRight$3e$__["ArrowLeftRight"],
                explication: "Suivre chaque demande : avis, décision du ministre.",
                compteur: (c)=>({
                        n: c.mutationsEnCours,
                        texte: `${c.mutationsEnCours} demande(s) en cours`
                    })
            },
            {
                href: "/mutations/statistiques",
                libelle: "Statistiques",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
                explication: "Les chiffres des mutations par motif et par département."
            }
        ]
    },
    {
        cle: "nominations",
        titre: "Nominations",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$award$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Award$3e$__["Award"],
        description: "Les nominations des cadres de gestion des établissements et des inspections : directeurs, directeurs des études, surveillants généraux, économes, proviseurs, intendants, inspecteurs, conseillers pédagogiques… Chaque année, la DDEPPSA propose (reconduire, muter, promouvoir, permuter, relever), la DGRHAS décide, puis les notes de service.",
        circuit: "Reprise de l’année précédente → propositions des DDEPPSA → décision DGRHAS → notes de nomination → signature",
        rubriques: [
            {
                href: "/nominations",
                libelle: "Nominations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$award$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Award$3e$__["Award"],
                visible: (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].traiter(p.role) || p.role === "DDEPPSA",
                explication: "La base des nominations de l’année, par département : les propositions des DDEPPSA, les nouveaux, les décisions de la DGRHAS."
            },
            {
                href: "/notes/nomination",
                libelle: "Notes de nomination",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                visible: traiter,
                explication: "Une note de service par fonction avec les nominations validées, jusqu’à la signature du ministre."
            }
        ]
    },
    {
        cle: "demandes",
        titre: "Demandes de prestations",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$plus$2d$corner$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FilePlus2$3e$__["FilePlus2"],
        description: "Les demandes des agents autres que les mutations : congés, autorisations d’absence, attestations, primes… de leur dépôt à l’acte signé.",
        circuit: "Dépôt par la structure ou sur le portail → avis → décision → acte",
        rubriques: [
            {
                href: "/demandes/nouvelle",
                libelle: "Déposer une demande de prestation",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$plus$2d$corner$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FilePlus2$3e$__["FilePlus2"],
                visible: recenser,
                explication: "Congé, autorisation d’absence, attestation, prime, mutation… pour un de vos agents : la demande part de votre structure, l’agent la suit sur le portail et y imprime son acte."
            },
            {
                href: "/mutations?motif=PRESTATION",
                libelle: "Suivi des prestations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$checks$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListChecks$3e$__["ListChecks"],
                visible: traiter,
                explication: "Les demandes de prestations en cours et accordées : où en est chacune, qui doit donner son avis."
            }
        ]
    },
    {
        cle: "structures",
        titre: "Structures et besoins",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$network$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Network$3e$__["Network"],
        description: "Les structures du ministère, du cabinet jusqu’à l’école : les structures administratives (directions, services) et les structures scolaires (écoles, avec leurs classes et leurs salles), le personnel de chacune, et les besoins en personnel qui s’en déduisent.",
        circuit: "Structures → classes ouvertes → heures de cours → besoin en enseignants",
        rubriques: [
            {
                groupe: "Les structures",
                href: "/structures",
                libelle: "Structures administratives",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$complex$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"],
                visible: traiter,
                explication: "Du cabinet aux services : directions générales, directions centrales et départementales, inspections. Pour chacune, son personnel."
            },
            {
                groupe: "Les structures",
                href: "/ecoles",
                libelle: "Structures scolaires",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$school$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__School$3e$__["School"],
                visible: recenser,
                explication: "Pour chaque école : bâtiments, salles, classes ouvertes de l’année, agents rattachés, et le besoin en enseignants qui s’en déduit."
            },
            {
                groupe: "Besoins en personnel",
                href: "/ecoles/besoins",
                libelle: "Besoins en enseignants",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__["Scale"],
                visible: (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].traiter(p.role) || p.role === "DDEPPSA",
                explication: "Déficit ou pléthore d’enseignants par école, par cycle, par département et par matière : les heures des classes ouvertes divisées par les heures d’un enseignant."
            },
            {
                groupe: "Besoins en personnel",
                href: "/structures/besoins-administratifs",
                libelle: "Besoins des administrations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$briefcase$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Briefcase$3e$__["Briefcase"],
                // Les écoles ont leurs besoins en enseignants : seuls les responsables des structures administratives
                visible: (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].traiter(p.role) || p.role === "DDEPPSA" || p.role === "STRUCTURE" && !!p.structureType && p.structureType !== "ETABLISSEMENT",
                explication: "Chaque structure administrative fixe l’effectif normal de ses postes (directeur, chef de service, collaborateurs…) et exprime ses besoins ; la DGRHAS les compare à l’effectif normal et répond."
            },
            {
                groupe: "Besoins en personnel",
                href: "/enrolement/besoins",
                libelle: "Besoins par établissement",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$school$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__School$3e$__["School"],
                visible: (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].traiter(p.role) || p.role === "DDEPPSA",
                explication: "Les besoins en volontaires exprimés par les DDEPPSA, comparés aux volontaires en poste."
            }
        ]
    },
    {
        cle: "notes",
        titre: "Notes de service",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
        description: "Les notes d’affectation, de mutation, d’enrôlement et de nomination, jusqu’à la signature du ministre.",
        circuit: "À soumettre au DG → soumise au DG → validée par le DG → signée",
        rubriques: [
            {
                href: "/notes/affectation",
                libelle: "Notes d’affectation",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                explication: "Relire les notes préparées, les soumettre au DG, puis reporter le numéro et la date de signature.",
                compteur: (c)=>({
                        n: c.notesAffASoumettre + c.notesAffSoumises,
                        texte: parties([
                            c.notesAffASoumettre,
                            "à soumettre au DG"
                        ], [
                            c.notesAffSoumises,
                            "en attente de validation"
                        ])
                    })
            },
            {
                href: "/notes/mutation",
                libelle: "Notes de mutation",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                explication: "Les notes des mutations accordées, préparées automatiquement.",
                compteur: (c)=>({
                        n: c.notesMutASoumettre + c.notesMutSoumises,
                        texte: parties([
                            c.notesMutASoumettre,
                            "à soumettre au DG"
                        ], [
                            c.notesMutSoumises,
                            "en attente de validation"
                        ])
                    })
            },
            {
                href: "/notes/enrolement",
                libelle: "Notes d’enrôlement",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                explication: "Les notes de service des volontaires retenus à l’enrôlement."
            },
            {
                href: "/notes/nomination",
                libelle: "Notes de nomination",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
                visible: traiter,
                explication: "Une note par fonction (directeurs, directeurs des études, surveillants généraux, économes, proviseurs, inspecteurs…) avec les nominations validées."
            }
        ]
    },
    {
        cle: "controle",
        titre: "Contrôle et vérification",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"],
        description: "Retrouver les mêmes personnes d’une liste à l’autre : ne pas recruter deux fois, ne pas enrôler un volontaire déjà payé, ne pas affecter deux fois.",
        circuit: "Comparer des fichiers → listes des années passées → notes déjà signées",
        rubriques: [
            {
                href: "/rapprochement",
                libelle: "Rapprochement de fichiers",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CopyCheck$3e$__["CopyCheck"],
                visible: traiter,
                explication: "Jusqu’à 4 fichiers Excel comparés entre eux et avec la base : doublons, mêmes personnes, homonymes. Une vérification : rien n’est enregistré."
            },
            {
                href: "/rapprochement?onglet=annees",
                libelle: "Listes des années passées",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2d$clock$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__["History"],
                visible: traiter,
                explication: "Les recrutés des années précédentes, gardés dans le système : la saisie bloque un candidat déjà recruté."
            },
            {
                href: "/rapprochement?onglet=notes",
                libelle: "Notes déjà signées",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardCheck$3e$__["ClipboardCheck"],
                visible: traiter,
                explication: "Les notes signées hors du système, reportées sur chaque personne : personne n’est affecté deux fois ; liste des doubles affectations."
            }
        ]
    },
    {
        cle: "administration",
        titre: "Administration",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
        description: "Les utilisateurs, les paramètres, les règles des diplômes, le menu et le journal des actions.",
        rubriques: [
            {
                href: "/administration",
                libelle: "Utilisateurs",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
                visible: (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].administrer(p.role),
                explication: "Créer les comptes, choisir leur rôle et leur structure, gérer les codes personnels, débloquer ou déconnecter un compte."
            },
            {
                href: "/administration/parametres",
                libelle: "Paramètres",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
                visible: parametrer,
                explication: "Régler les notes de service (année scolaire, signataire…), le statut contractuel, les âges et calculs, l’envoi à la FP et la fiche de mutation."
            },
            {
                href: "/administration/regles",
                libelle: "Règles et grades",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$graduation$2d$cap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GraduationCap$3e$__["GraduationCap"],
                visible: parametrer,
                explication: "Pour chaque diplôme : cycle, grade, catégorie, échelle et indice. Réservé au DG."
            },
            {
                href: "/administration/organigramme",
                libelle: "Organigramme",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$complex$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"],
                visible: traiter,
                explication: "Écoles, inspections, DDEPPSA, services et directions : le chemin que suivent les demandes, et qui les vise."
            },
            {
                href: "/administration/referentiels",
                libelle: "Référentiels",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layers$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Layers$3e$__["Layers"],
                visible: traiter,
                explication: "Les listes où l’on choisit une valeur avec une recherche (localités, matières, postes…) et la carte scolaire : cycles, niveaux, matières et programmes (heures par semaine, coefficient). Reprise de l’ancien système."
            },
            {
                href: "/administration/prestations",
                libelle: "Catalogue des prestations",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$checks$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListChecks$3e$__["ListChecks"],
                visible: traiter,
                explication: "Pour chaque type de demande : pièces exigées, circuit d’approbation et décideur final."
            },
            {
                href: "/administration/origines",
                libelle: "Origines des dossiers",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$checks$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListChecks$3e$__["ListChecks"],
                visible: parametrer,
                explication: "La liste des origines proposées à la saisie d’un candidat (Cabinet du Ministre, Primature, DDEPPSA…)."
            },
            {
                href: "/administration/droits",
                libelle: "Droits par rubrique",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"],
                visible: parametrer,
                explication: "Qui voit quoi, qui fait quoi : pour chaque rôle, ou pour une personne, choisir les rubriques masquées, en lecture seule ou ouvertes."
            },
            {
                href: "/administration/menu",
                libelle: "Menu",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$checks$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListChecks$3e$__["ListChecks"],
                visible: parametrer,
                explication: "Renommer et ranger les rubriques du menu, les domaines et leurs volets : les noms choisis valent pour tout le monde."
            },
            {
                href: "/journal",
                libelle: "Journal",
                icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2d$clock$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__["History"],
                visible: (p)=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$libelles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["peut"].journal(p.role),
                explication: "Qui a fait quoi, et quand : toutes les actions enregistrées dans le système."
            }
        ]
    }
];
const POLES = [
    {
        cle: "rh",
        titre: "Personnel",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
        description: "Tout ce qui touche aux agents du ministère : leur base et leur recensement, leur recrutement à la Fonction Publique, leurs affectations et mutations, les volontaires et communautaires, et leurs demandes.",
        espaces: [
            "personnel",
            "recrutement",
            "affectations",
            "mutations",
            "nominations",
            "enrolement",
            "demandes"
        ]
    }
];
const MENU = [
    {
        pole: "rh"
    },
    {
        espace: "structures"
    },
    {
        espace: "notes"
    },
    {
        espace: "controle"
    },
    {
        espace: "administration"
    }
];
const poleDe = (cleEspace)=>cleEspace ? POLES.find((p)=>p.espaces.includes(cleEspace)) ?? null : null;
/** Domaines ouverts aux comptes des écoles, inspections… : leur personnel, leurs demandes, leur école. */ const ORIGINES_STRUCTURE = [
    "personnel",
    "demandes",
    "structures"
];
/**
 * Rubriques d'un espace que ce profil peut voir. Les droits suivent la rubrique (et son domaine
 * d'origine pour les comptes des écoles), pas l'endroit où le menu l'a rangée.
 */ /** Rubriques que l'on peut fermer, jamais ouvrir au-delà du rôle (comme sur le serveur). */ const NON_OUVRABLES = [
    "/administration"
];
const niveauRubrique = (href, p)=>p.droits?.[href.split("?")[0]];
const rubriquesVisibles = (e, p)=>e.rubriques.filter((r)=>{
        if (p.role === "STRUCTURE" && !ORIGINES_STRUCTURE.includes(r.origine ?? e.cle)) return false;
        const n = niveauRubrique(r.href, p);
        if (n === "MASQUE") return false;
        if (n && p.role !== "STRUCTURE" && !NON_OUVRABLES.includes(r.href)) return true;
        return !r.visible || r.visible(p);
    });
/** Rubrique d'une page : celle dont l'adresse est la plus précise. */ function rubriquePage(chemin) {
    let meilleur = null;
    for (const e of ESPACES)for (const r of e.rubriques){
        const h = r.href.split("?")[0];
        if ((chemin === h || chemin.startsWith(`${h}/`)) && (!meilleur || h.length > meilleur.length)) meilleur = h;
    }
    return meilleur;
}
function niveauPage(chemin, p) {
    const h = p.droits ? rubriquePage(chemin) : null;
    return h ? p.droits?.[h] : undefined;
}
function accesDonne(p) {
    if (("TURBOPACK compile-time value", "object") === "undefined" || !p.droits || p.role === "STRUCTURE") return false;
    const h = rubriquePage(window.location.pathname);
    return !!h && !NON_OUVRABLES.includes(h) && (p.droits[h] === "LECTURE" || p.droits[h] === "MODIFICATION");
}
function lienEspace(e, p) {
    const r = rubriquesVisibles(e, p);
    return r.length === 1 ? r[0].href : `/espace/${e.cle}`;
}
/** Le domaine où se trouvent aujourd'hui les rubriques d'un domaine d'origine (pages de détail). */ const espaceAvecOrigine = (origine)=>ESPACES.find((e)=>e.rubriques.some((r)=>r.origine === origine)) ?? null;
function espaceDe(chemin) {
    if (chemin.startsWith("/espace/")) return ESPACES.find((e)=>chemin === `/espace/${e.cle}`) ?? null;
    let meilleur = null;
    for (const e of ESPACES)for (const r of e.rubriques)if ((chemin === r.href || chemin.startsWith(`${r.href}/`)) && (!meilleur || r.href.length > meilleur.long)) meilleur = {
        e,
        long: r.href.length
    };
    // Pages de détail rattachées à un domaine
    if (!meilleur) {
        if (chemin === "/pilotage") return espaceAvecOrigine("recrutement");
        if (chemin.startsWith("/structures")) return espaceAvecOrigine("structures");
        if (chemin.startsWith("/note/")) return espaceAvecOrigine("notes");
        if (chemin.startsWith("/mutation/")) return espaceAvecOrigine("mutations");
    }
    return meilleur?.e ?? null;
}
function travailEspace(e, p, c) {
    if (!c) return 0;
    return rubriquesVisibles(e, p).reduce((n, r)=>n + (r.compteur?.(c).n ?? 0), 0);
}
/** Pages de détail : ce qui s'affiche au bout du chemin (après la rubrique). */ const DETAILS = [
    [
        /^\/personnel\/agents\/nouveau$/,
        "Nouvelle fiche"
    ],
    [
        /^\/personnel\/agents\/\d+$/,
        "Fiche de l’agent"
    ],
    [
        /^\/ecoles\/\d+$/,
        "Fiche de l’école"
    ],
    [
        /^\/structures\/\d+$/,
        "Fiche de la structure"
    ],
    [
        /^\/mutations\/nouvelle$/,
        "Nouvelle demande"
    ],
    [
        /^\/mutation\//,
        "Demande"
    ],
    [
        /^\/note\//,
        "Note de service"
    ]
];
function cheminDe(chemin, p) {
    const poleDirect = POLES.find((x)=>chemin === `/espace/${x.cle}`);
    if (poleDirect) return [
        {
            libelle: poleDirect.titre,
            href: `/espace/${poleDirect.cle}`
        }
    ];
    const e = espaceDe(chemin);
    if (!e) return [];
    const etapes = [];
    const pole = poleDe(e.cle);
    if (pole) etapes.push({
        libelle: pole.titre,
        href: `/espace/${pole.cle}`
    });
    etapes.push({
        libelle: e.titre,
        href: `/espace/${e.cle}`
    });
    if (chemin === `/espace/${e.cle}`) return etapes;
    // La rubrique dont l'adresse correspond le mieux à la page
    const r = rubriquesVisibles(e, p).filter((x)=>{
        const base = x.href.split("?")[0];
        return chemin === base || chemin.startsWith(`${base}/`);
    }).sort((a, b)=>b.href.length - a.href.length)[0];
    // Même nom que le domaine (« Base du personnel ») : une seule étape
    if (r && r.libelle !== e.titre) etapes.push({
        libelle: r.libelle,
        href: r.href
    });
    const detail = DETAILS.find(([re])=>re.test(chemin));
    if (detail && (!r || chemin !== r.href.split("?")[0])) etapes.push({
        libelle: detail[1]
    });
    return etapes;
}
const MENU_MODIFIE = "dgrhas:menu-modifie";
const ICONES_MENU = {
    Folder: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Folder$3e$__["Folder"],
    Users: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
    Briefcase: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$briefcase$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Briefcase$3e$__["Briefcase"],
    ClipboardList: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clipboard$2d$list$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ClipboardList$3e$__["ClipboardList"],
    FileText: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
    BookOpen: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__["BookOpen"],
    Building2: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$complex$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"],
    School: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$school$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__School$3e$__["School"],
    Landmark: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$landmark$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Landmark$3e$__["Landmark"],
    Repeat: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$repeat$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Repeat$3e$__["Repeat"],
    Search: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"],
    Settings: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"]
};
// Le menu d'origine (celui du programme), gardé tel quel : chaque réglage repart de lui
for (const e of ESPACES)for (const r of e.rubriques)r.origine = e.cle;
const ESPACES_ORIGINE = new Map(ESPACES.map((e)=>[
        e.cle,
        {
            ...e,
            rubriques: [
                ...e.rubriques
            ]
        }
    ]));
const POLES_ORIGINE = new Map(POLES.map((x)=>[
        x.cle,
        {
            ...x,
            espaces: [
                ...x.espaces
            ]
        }
    ]));
const RUBRIQUES_ORIGINE = new Map(ESPACES.flatMap((e)=>e.rubriques.map((r)=>[
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$menu$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["idRubrique"])(e.cle, r.href),
            {
                ...r
            }
        ])));
const RUBRIQUES = new Map(ESPACES.flatMap((e)=>e.rubriques.map((r)=>[
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$menu$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["idRubrique"])(e.cle, r.href),
            r
        ])));
const ORIGINE_MENU = {
    menu: MENU.map((m)=>m.pole ? `pole:${m.pole}` : `espace:${m.espace}`),
    poles: POLES.map((x)=>({
            cle: x.cle,
            titre: x.titre,
            description: x.description,
            espaces: [
                ...x.espaces
            ]
        })),
    espaces: ESPACES.map((e)=>({
            cle: e.cle,
            titre: e.titre,
            description: e.description,
            rubriques: e.rubriques.map((r)=>({
                    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$menu$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["idRubrique"])(e.cle, r.href),
                    href: r.href,
                    libelle: r.libelle,
                    ...r.groupe ? {
                        groupe: r.groupe
                    } : {}
                }))
        }))
};
const ICONES_ORIGINE = Object.fromEntries([
    ...[
        ...ESPACES_ORIGINE.values()
    ].map((e)=>[
            `espace:${e.cle}`,
            e.icone
        ]),
    ...[
        ...POLES_ORIGINE.values()
    ].map((x)=>[
            `pole:${x.cle}`,
            x.icone
        ])
]);
const rubriqueDe = (id)=>RUBRIQUES_ORIGINE.get(id) ?? null;
function appliquerMenu(c) {
    const m = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$menu$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["construireMenu"])(ORIGINE_MENU, c);
    const espaces = m.espaces.map((x)=>{
        const o = ESPACES_ORIGINE.get(x.cle);
        const rubriques = x.rubriques.map((y)=>{
            const r = RUBRIQUES.get(y.id);
            r.libelle = y.libelle;
            r.groupe = y.groupe;
            return r;
        });
        return o ? {
            ...o,
            titre: x.titre,
            description: x.description,
            rubriques
        } : {
            cle: x.cle,
            titre: x.titre,
            description: x.description,
            icone: ICONES_MENU[x.icone ?? ""] ?? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Folder$3e$__["Folder"],
            rubriques
        };
    });
    const poles = m.poles.map((x)=>{
        const o = POLES_ORIGINE.get(x.cle);
        return o ? {
            ...o,
            titre: x.titre,
            description: x.description,
            espaces: x.espaces
        } : {
            cle: x.cle,
            titre: x.titre,
            description: x.description,
            icone: ICONES_MENU[x.icone ?? ""] ?? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Folder$3e$__["Folder"],
            espaces: x.espaces
        };
    });
    ESPACES.splice(0, ESPACES.length, ...espaces);
    POLES.splice(0, POLES.length, ...poles);
    MENU.splice(0, MENU.length, ...m.menu.map((k)=>k.startsWith("pole:") ? {
            pole: k.slice(5)
        } : {
            espace: k.slice(7)
        }));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/libelles.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CYCLES",
    ()=>CYCLES,
    "ETAT_MUTATION",
    ()=>ETAT_MUTATION,
    "GROUPES_MUTATION",
    ()=>GROUPES_MUTATION,
    "ROLES",
    ()=>ROLES,
    "STATUT_AFFECTATION",
    ()=>STATUT_AFFECTATION,
    "STATUT_NOTE",
    ()=>STATUT_NOTE,
    "TYPE_LOT",
    ()=>TYPE_LOT,
    "dateCourte",
    ()=>dateCourte,
    "dateLongue",
    ()=>dateLongue,
    "duree",
    ()=>duree,
    "libelleAnomalie",
    ()=>libelleAnomalie,
    "libelleLot",
    ()=>libelleLot,
    "nombreEnLettres",
    ()=>nombreEnLettres,
    "peut",
    ()=>peut
]);
const ROLES = {
    ADMIN: "Administrateur",
    AGENT: "Chef de bureau (préparation de la base)",
    CHEF_SERVICE: "Chef de service (vérification et traitement)",
    DIRECTEUR: "DRSC (contrôle du traitement)",
    BUREAU_ETUDES: "Chef du bureau d’études (contrôle du traitement)",
    DG: "DGRHAS (validation)",
    DDEPPSA: "Directeur départemental",
    CABINET: "Cabinet du Ministre",
    SECRETARIAT: "Chef du secrétariat du DG (impression des dossiers et des notes)",
    STRUCTURE: "Responsable de structure (école, inspection, service…)"
};
const STATUT_NOTE = {
    BROUILLON: {
        libelle: "À soumettre au DG",
        ton: "gris",
        aide: "La note est préparée et contient les personnes prêtes, mais elle n’est pas encore partie chez le DG. Relisez-la (aperçu imprimable), puis cliquez sur « Soumettre au DG ». Tant qu’elle n’est pas soumise, elle se met à jour toute seule : une personne complétée y entre automatiquement."
    },
    SOUMISE: {
        libelle: "Soumise au DG",
        ton: "jaune",
        aide: "La note est chez le DG. Il la valide, ou la renvoie avec un commentaire : elle redevient alors « à soumettre au DG » pour correction."
    },
    VALIDEE: {
        libelle: "Validée par le DG",
        ton: "bleu",
        aide: "Le contenu est figé et les personnes comptent comme « affectées ». Le chef de bureau, le chef de service et le directeur la lisent et donnent leur avis de conformité ; le DG ordonne ensuite l’impression. Il peut encore la rouvrir tant que le ministre n’a pas signé."
    },
    SIGNEE: {
        libelle: "Signée",
        ton: "vert",
        aide: "Le ministre a signé : le numéro et la date de la note sont reportés. Plus aucune modification n’est possible. L’opération n’est clôturée que lorsque le scan PDF de la note signée est joint (archives)."
    }
};
const STATUT_AFFECTATION = {
    A_TRAITER: {
        libelle: "À traiter",
        ton: "gris"
    },
    EXCLU: {
        libelle: "Exclu",
        ton: "rouge"
    },
    AFFECTE: {
        libelle: "Affecté",
        ton: "vert"
    }
};
const ETAT_MUTATION = {
    EN_CIRCUIT: {
        libelle: "En circuit d’approbation",
        ton: "bleu"
    },
    EN_INSTANCE: {
        libelle: "En instance",
        ton: "jaune"
    },
    EN_ATTENTE_DDEPPSA: {
        libelle: "Chez le DDEPPSA",
        ton: "gris"
    },
    EN_ATTENTE_DGRHAS: {
        libelle: "Chez la DGRHAS",
        ton: "jaune"
    },
    EN_ATTENTE_MINISTRE: {
        libelle: "Chez le Ministre",
        ton: "bleu"
    },
    ACCORDEE: {
        libelle: "Accordée",
        ton: "vert"
    },
    REFUSEE: {
        libelle: "Refusée",
        ton: "rouge"
    },
    RETIREE: {
        libelle: "Retirée",
        ton: "rouge"
    }
};
const CYCLES = {
    PRESCOLAIRE: "Préscolaire",
    PRIMAIRE: "Primaire",
    COLLEGE: "Collège",
    LYCEE: "Lycée",
    ADMINISTRATION: "Administration"
};
const GROUPES_MUTATION = {
    PRESCO_PRIMAIRE: "Préscolaire et primaire",
    COLLEGE_LYCEE_ADMIN: "Collège, lycée et administration"
};
function dateCourte(iso) {
    if (!iso) return "—";
    const [a, m, j] = iso.slice(0, 10).split("-");
    return `${j}/${m}/${a}`;
}
const MOIS = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
];
function dateLongue(iso) {
    if (!iso) return null;
    const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
    return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
}
function duree(mois) {
    if (mois === null || mois === undefined) return "—";
    const a = Math.floor(mois / 12);
    const m = mois % 12;
    if (!a) return `${m} mois`;
    return m ? `${a} an${a > 1 ? "s" : ""} ${m} mois` : `${a} an${a > 1 ? "s" : ""}`;
}
const peut = {
    traiter: (r)=>!!r && [
            "ADMIN",
            "AGENT",
            "CHEF_SERVICE",
            "DIRECTEUR",
            "BUREAU_ETUDES",
            "DG"
        ].includes(r),
    decider: (r)=>r === "ADMIN" || r === "DG",
    avisDdeppsa: (r)=>r === "ADMIN" || r === "DDEPPSA",
    avisDgrhas: (r)=>!!r && [
            "ADMIN",
            "DG",
            "DIRECTEUR"
        ].includes(r),
    instruction: (r)=>!!r && [
            "ADMIN",
            "DG",
            "CABINET"
        ].includes(r),
    administrer: (r)=>r === "ADMIN" || r === "DG",
    /** Contrôle des fiches saisies et envoi à la Fonction Publique. */ controler: (r)=>!!r && [
            "ADMIN",
            "CHEF_SERVICE",
            "DIRECTEUR",
            "BUREAU_ETUDES",
            "DG"
        ].includes(r),
    /** Validation finale des fiches et décisions réservées au DG. */ valider: (r)=>r === "ADMIN" || r === "DG",
    /** Paramètres, règles des diplômes et grades. */ parametrer: (r)=>r === "ADMIN" || r === "DG",
    /** Budget (salaires, incidence financière) et informations internes DGRHAS. */ voirBudget: (r)=>r === "ADMIN" || r === "DG",
    /** Import de la base des recrutés : seule entrée sans le circuit. */ importerBase: (r)=>!!r && [
            "ADMIN",
            "CHEF_SERVICE",
            "DG"
        ].includes(r),
    journal: (r)=>!!r && [
            "ADMIN",
            "DG",
            "DIRECTEUR",
            "BUREAU_ETUDES"
        ].includes(r)
};
const TYPE_LOT = {
    ARRETE: {
        pluriel: "Arrêtés",
        aide: "Signés par le ministre de la Fonction Publique (catégories II et III)"
    },
    DECRET_PM: {
        pluriel: "Décrets PM",
        aide: "Signés par le Premier ministre : diplômes de niveau licence"
    },
    DECRET_PR: {
        pluriel: "Décrets PR",
        aide: "Signés par le Président de la République : diplômes de niveau master"
    }
};
function libelleLot(l) {
    if (!l) return "—";
    if (!l.typeTexte || !l.rang) return `Lot ${l.numero}`;
    const q = l.autres ? "quota « Autres »" : l.quota ? `quota ${l.quota}` : "sans quota";
    return `${TYPE_LOT[l.typeTexte]?.pluriel ?? l.typeTexte} ${q} — lot ${l.rang}`;
}
const UNITES = [
    "zéro",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize"
];
const DIZAINES = [
    "",
    "dix",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante"
];
function nombreEnLettres(n) {
    n = Math.floor(Math.abs(n));
    if (n <= 16) return UNITES[n];
    if (n < 20) return `dix-${UNITES[n - 10]}`;
    if (n < 70) {
        const d = Math.floor(n / 10), u = n % 10;
        return u === 0 ? DIZAINES[d] : u === 1 ? `${DIZAINES[d]} et un` : `${DIZAINES[d]}-${UNITES[u]}`;
    }
    if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${nombreEnLettres(n - 60)}`;
    if (n < 100) return n === 80 ? "quatre-vingts" : `quatre-vingt-${nombreEnLettres(n - 80)}`;
    if (n < 1000) {
        const c = Math.floor(n / 100), r = n % 100;
        const cent = c === 1 ? "cent" : `${UNITES[c]} cent${r === 0 ? "s" : ""}`;
        return r ? `${cent} ${nombreEnLettres(r)}` : cent;
    }
    if (n < 1000000) {
        const m = Math.floor(n / 1000), r = n % 1000;
        const mille = m === 1 ? "mille" : `${nombreEnLettres(m).replace(/cents$/, "cent").replace(/quatre-vingts$/, "quatre-vingt")} mille`;
        return r ? `${mille} ${nombreEnLettres(r)}` : mille;
    }
    return String(n);
}
function libelleAnomalie(a, ctx = {}) {
    const ligne = ctx.feuille || ctx.numeroOrdre ? ` (liste ${ctx.feuille ?? "?"}${ctx.numeroOrdre ? `, n° d’ordre ${ctx.numeroOrdre}` : ""})` : "";
    switch(a){
        case "Département absent":
            return {
                titre: "Département d’affectation : case vide dans le fichier Excel",
                detail: `Dans le fichier importé${ligne}, la colonne « Département » de cette personne était vide. On ne sait donc pas dans lequel des 15 départements scolaires elle doit être affectée. Choisissez-le d’après son dossier ou son texte de la Fonction Publique.`
            };
        case "Département non reconnu":
            return {
                titre: `Département d’affectation non reconnu${ctx.departementBrut ? ` : « ${ctx.departementBrut} »` : ""}`,
                detail: `Dans le fichier importé${ligne}, la colonne « Département » contient ${ctx.departementBrut ? `« ${ctx.departementBrut} »` : "un texte"}, qui ne correspond à aucun des 15 départements scolaires (faute de frappe, nom d’une ville, d’un district ou d’une école…). Choisissez le bon département dans la liste.`
            };
        case "Département retenu manquant":
            return {
                titre: "Département d’affectation pas encore choisi",
                detail: ctx.quotaAutres ? "Personne du quota « Autres » : aucun département ne lui est encore attribué. Donnez-lui un département ici, ou faites la répartition automatique dans Pilotage → Répartition du quota « Autres ». Sans département, elle n’entre dans aucune note de service." : "Aucun département d’affectation n’est choisi pour cette personne (le fichier n’en donnait pas, ou il n’a pas été reconnu). Sans département, elle n’entre dans aucune note de service."
            };
        case "Colonnes Département/Source inversées (corrigé)":
            return {
                titre: "Département et source inversés dans le fichier (déjà corrigé)",
                detail: "Dans le fichier, le département et la source étaient l’un à la place de l’autre. Le système les a remis dans l’ordre : vérifiez simplement le département d’affectation."
            };
        default:
            if (a.startsWith("Date de naissance improbable")) return {
                titre: a,
                detail: "Avec cette date, la personne aurait moins de 18 ans ou plus de 65 ans : c’est sans doute une faute de frappe (« 2018 » pour « 1988 »). Le statut contractuel calculé serait faux. Corrigez la date d’après le dossier, ou indiquez le statut écrit sur le texte de la FP."
            };
            return {
                titre: a,
                detail: ""
            };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/menu-config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Le menu tel que l'administrateur ou le DG le veut (Administration › Menu) : où se trouve chaque
 * rubrique, ses sous-sections, ses domaines et ses grandes rubriques, avec leurs noms. Ce module ne
 * dépend de rien (ni React ni icônes) : il prend le menu d'origine (celui du programme) et le réglage
 * enregistré, et rend le menu à afficher.
 *
 * Il ne peut rien perdre : une rubrique absente du réglage (page ajoutée depuis, réglage abîmé)
 * revient à sa place d'origine ; une rubrique n'apparaît qu'une fois ; ce qui est inconnu est ignoré.
 */ /** Rubrique : son domaine d'origine suivi de son adresse (« personnel/personnel/presence »). */ __turbopack_context__.s([
    "CLE_PERSO",
    ()=>CLE_PERSO,
    "construireMenu",
    ()=>construireMenu,
    "idRubrique",
    ()=>idRubrique,
    "ranger",
    ()=>ranger,
    "structureOrigine",
    ()=>structureOrigine
]);
const idRubrique = (origine, href)=>`${origine}${href}`;
const CLE_PERSO = /^perso-[a-z0-9-]{1,40}$/;
const nom = (t)=>typeof t === "string" ? t.replace(/\s+/g, " ").trim() : "";
function ranger(liste, cle, ordre) {
    if (!ordre?.length) return liste;
    const rang = new Map(ordre.map((k, i)=>[
            k,
            i
        ]));
    const rangees = liste.filter((x)=>rang.has(cle(x))).sort((a, b)=>rang.get(cle(a)) - rang.get(cle(b)));
    liste.forEach((x, i)=>{
        if (rang.has(cle(x))) return;
        const avant = i > 0 ? rangees.indexOf(liste[i - 1]) : -1;
        rangees.splice(avant + 1, 0, x);
    });
    return rangees;
}
/** Ancien réglage (noms et ordres) traduit en placement complet. */ function depuisOrdres(o, ordres) {
    // Des copies : modifier le placement ne touche jamais au menu d'origine
    return {
        menu: [
            ...ranger(o.menu, (x)=>x, ordres.menu)
        ],
        poles: Object.fromEntries(o.poles.map((p)=>[
                p.cle,
                [
                    ...ranger(p.espaces, (x)=>x, ordres[`pole:${p.cle}`])
                ]
            ])),
        espaces: Object.fromEntries(o.espaces.map((e)=>[
                e.cle,
                ranger(e.rubriques, (r)=>r.href, ordres[`espace:${e.cle}`]).map((r)=>({
                        r: r.id,
                        ...r.groupe ? {
                            g: r.groupe
                        } : {}
                    }))
            ]))
    };
}
function structureOrigine(o) {
    return depuisOrdres(o, {});
}
/** Insère `x` dans `liste` juste après le premier de `avant` (le plus proche) qui y est ; sinon en tête. */ function insererApres(liste, x, avant) {
    for(let i = avant.length - 1; i >= 0; i--){
        const k = liste.indexOf(avant[i]);
        if (k >= 0) {
            liste.splice(k + 1, 0, x);
            return;
        }
    }
    liste.unshift(x);
}
function construireMenu(o, c) {
    const noms = c?.noms ?? {};
    const desc = c?.descriptions ?? {};
    const icones = c?.icones ?? {};
    const s = c?.structure ?? depuisOrdres(o, c?.ordres ?? {});
    const persoEspaces = [
        ...new Set((c?.nouveaux?.espaces ?? []).filter((k)=>CLE_PERSO.test(k)))
    ];
    const persoPoles = [
        ...new Set((c?.nouveaux?.poles ?? []).filter((k)=>CLE_PERSO.test(k)))
    ];
    // Rubriques connues : leur domaine d'origine, leur place et leur sous-section d'origine
    const rubriques = new Map();
    for (const e of o.espaces)e.rubriques.forEach((r, i)=>rubriques.set(r.id, {
            origine: e.cle,
            libelle: r.libelle,
            href: r.href,
            groupe: r.groupe,
            rang: i
        }));
    // 1. Les rubriques de chaque domaine, chacune une seule fois
    const cles = [
        ...o.espaces.map((e)=>e.cle),
        ...persoEspaces
    ];
    const placees = new Set();
    const contenu = new Map();
    for (const k of cles){
        const l = [];
        for (const x of s.espaces?.[k] ?? []){
            if (!x || typeof x.r !== "string" || !rubriques.has(x.r) || placees.has(x.r)) continue;
            placees.add(x.r);
            const g = nom(x.g).slice(0, 60);
            l.push({
                id: x.r,
                ...g ? {
                    groupe: g
                } : {}
            });
        }
        contenu.set(k, l);
    }
    // Rubrique absente du réglage : à sa place d'origine, avec sa sous-section d'origine
    for (const e of o.espaces)e.rubriques.forEach((r, i)=>{
        if (placees.has(r.id)) return;
        placees.add(r.id);
        const l = contenu.get(e.cle);
        const ids = l.map((x)=>x.id);
        const avant = e.rubriques.slice(0, i).map((x)=>x.id);
        let pos = 0;
        for(let j = avant.length - 1; j >= 0; j--){
            const k = ids.indexOf(avant[j]);
            if (k >= 0) {
                pos = k + 1;
                break;
            }
        }
        l.splice(pos, 0, {
            id: r.id,
            ...r.groupe ? {
                groupe: r.groupe
            } : {}
        });
    });
    // 2. Les domaines de chaque grande rubrique, et le menu, chacun une seule fois
    const espacesConnus = new Set(cles);
    const polesConnus = [
        ...o.poles.map((p)=>p.cle),
        ...persoPoles
    ];
    const espacesPlaces = new Set();
    const polesDe = new Map();
    for (const p of polesConnus){
        const l = [];
        for (const e of s.poles?.[p] ?? []){
            if (!espacesConnus.has(e) || espacesPlaces.has(e)) continue;
            espacesPlaces.add(e);
            l.push(e);
        }
        polesDe.set(p, l);
    }
    const menu = [];
    const polesPlaces = new Set();
    for (const m of s.menu ?? []){
        if (typeof m !== "string") continue;
        if (m.startsWith("pole:") && polesDe.has(m.slice(5)) && !polesPlaces.has(m.slice(5))) {
            polesPlaces.add(m.slice(5));
            menu.push(m);
        } else if (m.startsWith("espace:") && espacesConnus.has(m.slice(7)) && !espacesPlaces.has(m.slice(7))) {
            espacesPlaces.add(m.slice(7));
            menu.push(m);
        }
    }
    // Domaine d'origine non placé : dans sa grande rubrique d'origine, sinon dans le menu, à sa place
    for (const p of o.poles)p.espaces.forEach((e, i)=>{
        if (espacesPlaces.has(e)) return;
        espacesPlaces.add(e);
        insererApres(polesDe.get(p.cle), e, p.espaces.slice(0, i));
    });
    o.menu.forEach((m, i)=>{
        const avant = o.menu.slice(0, i);
        if (m.startsWith("espace:") && !espacesPlaces.has(m.slice(7))) {
            espacesPlaces.add(m.slice(7));
            insererApres(menu, m, avant);
        } else if (m.startsWith("pole:") && !polesPlaces.has(m.slice(5))) {
            polesPlaces.add(m.slice(5));
            insererApres(menu, m, avant);
        }
    });
    // Créés ici mais non placés : à la fin du menu
    for (const p of persoPoles)if (!polesPlaces.has(p)) menu.push(`pole:${p}`);
    for (const e of persoEspaces)if (!espacesPlaces.has(e)) menu.push(`espace:${e}`);
    const origineEspace = new Map(o.espaces.map((e)=>[
            e.cle,
            e
        ]));
    const originePole = new Map(o.poles.map((p)=>[
            p.cle,
            p
        ]));
    return {
        menu,
        poles: polesConnus.map((k)=>{
            const p = originePole.get(k);
            return {
                cle: k,
                titre: nom(noms[`pole:${k}`]) || p?.titre || "Nouvelle rubrique",
                description: nom(desc[`pole:${k}`]) || p?.description || "",
                nouveau: !p,
                ...icones[`pole:${k}`] ? {
                    icone: icones[`pole:${k}`]
                } : {},
                espaces: polesDe.get(k)
            };
        }),
        espaces: cles.map((k)=>{
            const e = origineEspace.get(k);
            return {
                cle: k,
                titre: nom(noms[`espace:${k}`]) || e?.titre || "Nouveau domaine",
                description: nom(desc[`espace:${k}`]) || e?.description || "",
                nouveau: !e,
                ...icones[`espace:${k}`] ? {
                    icone: icones[`espace:${k}`]
                } : {},
                rubriques: contenu.get(k).map((x)=>{
                    const r = rubriques.get(x.id);
                    // Ancien format : le nom était rangé par adresse
                    const libelle = nom(noms[`rubrique:${x.id}`]) || nom(noms[`rubrique:${r.href}`]) || r.libelle;
                    return {
                        id: x.id,
                        libelle,
                        ...x.groupe ? {
                            groupe: x.groupe
                        } : {}
                    };
                })
            };
        })
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=_0esumu-o7w5tq._.js.map