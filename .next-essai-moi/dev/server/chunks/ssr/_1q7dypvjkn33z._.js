(()=>{"use strict";module.exports = [
"[project]/app/connexion/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Connexion
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key-round.mjs [app-ssr] (ecmascript) <export default as KeyRound>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.mjs [app-ssr] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.mjs [app-ssr] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-ssr] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
function Connexion() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [motDePasse, setMotDePasse] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [code, setCode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [erreur, setErreur] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [envoi, setEnvoi] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Déjà connecté : directement à l'application (un jeton périmé y ramène ici)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["lireSession"])().jeton) router.replace("/");
    }, [
        router
    ]);
    async function valider(e) {
        e.preventDefault();
        setEnvoi(true);
        setErreur(null);
        try {
            const r = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].post("/auth/connexion", {
                email,
                motDePasse,
                code
            });
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ouvrirSession"])(r.jeton, r.utilisateur);
            router.replace("/");
        } catch (err) {
            setErreur(err.message);
        } finally{
            setEnvoi(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-screen items-center justify-center p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-doux md:grid-cols-[1.25fr_1fr]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative hidden flex-col justify-start gap-12 overflow-hidden bg-nuit p-10 pt-12 text-white md:flex",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bandeau-national h-1.5 w-20 rounded-full",
                                    "aria-hidden": true
                                }, void 0, false, {
                                    fileName: "[project]/app/connexion/page.tsx",
                                    lineNumber: 43,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-7 flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "relative size-14 shrink-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,rgba(251,222,74,0.15)_50%,transparent_72%)]",
                                                    "aria-hidden": true
                                                }, void 0, false, {
                                                    fileName: "[project]/app/connexion/page.tsx",
                                                    lineNumber: 48,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                                    src: "/armoiries-transparent.png",
                                                    alt: "Armoiries de la République du Congo",
                                                    width: 474,
                                                    height: 464,
                                                    priority: true,
                                                    className: "relative h-full w-full object-contain"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/connexion/page.tsx",
                                                    lineNumber: 49,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/connexion/page.tsx",
                                            lineNumber: 46,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "shrink-0 text-center leading-tight",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[13px] font-semibold uppercase tracking-wide",
                                                    children: "République du Congo"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/connexion/page.tsx",
                                                    lineNumber: 52,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-0.5 text-[11px] text-white/50",
                                                    children: [
                                                        "Unité",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "relative",
                                                            children: [
                                                                " · Travail · ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "absolute inset-x-0 -bottom-1 border-t border-dashed border-white/50",
                                                                    "aria-hidden": true
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/connexion/page.tsx",
                                                                    lineNumber: 58,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/connexion/page.tsx",
                                                            lineNumber: 56,
                                                            columnNumber: 19
                                                        }, this),
                                                        "Progrès"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/connexion/page.tsx",
                                                    lineNumber: 54,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/connexion/page.tsx",
                                            lineNumber: 51,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-11 w-0.5 shrink-0 rounded-full bg-white/70",
                                            "aria-hidden": true
                                        }, void 0, false, {
                                            fileName: "[project]/app/connexion/page.tsx",
                                            lineNumber: 63,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-center text-[10px] leading-snug font-medium uppercase text-white/70",
                                            children: "Ministère de l’Enseignement Préscolaire, Primaire, Secondaire et de l’Alphabétisation"
                                        }, void 0, false, {
                                            fileName: "[project]/app/connexion/page.tsx",
                                            lineNumber: 64,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/connexion/page.tsx",
                                    lineNumber: 45,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 42,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-[26px] leading-tight font-semibold",
                                    children: "Système d’Information de Gestion des Ressources Humaines et de l’Administration Scolaire du MEPPSA (SIGRHAS-MEPPSA)"
                                }, void 0, false, {
                                    fileName: "[project]/app/connexion/page.tsx",
                                    lineNumber: 70,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mx-auto mt-12 max-w-72 text-sm leading-relaxed text-white/55",
                                    children: "Direction générale des ressources humaines et de l’administration scolaire — MEPPSA —"
                                }, void 0, false, {
                                    fileName: "[project]/app/connexion/page.tsx",
                                    lineNumber: 73,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 69,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "pointer-events-none absolute -right-16 -bottom-16 size-64 rounded-full bg-marque-500/20 blur-2xl",
                            "aria-hidden": true
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 77,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "pointer-events-none absolute -top-10 right-10 size-32 rounded-full bg-or-400/10 blur-2xl",
                            "aria-hidden": true
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 78,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/connexion/page.tsx",
                    lineNumber: 41,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: valider,
                    className: "space-y-5 p-8 sm:p-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-2xl font-semibold tracking-tight",
                                    children: "Connexion"
                                }, void 0, false, {
                                    fileName: "[project]/app/connexion/page.tsx",
                                    lineNumber: 83,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-zinc-400",
                                    children: "Accès réservé au personnel habilité."
                                }, void 0, false, {
                                    fileName: "[project]/app/connexion/page.tsx",
                                    lineNumber: 84,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 82,
                            columnNumber: 11
                        }, this),
                        erreur && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Alerte"], {
                            children: erreur
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 86,
                            columnNumber: 22
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Champ"], {
                            libelle: "Adresse e-mail",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                        className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                                    }, void 0, false, {
                                        fileName: "[project]/app/connexion/page.tsx",
                                        lineNumber: 89,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Saisie"], {
                                        type: "email",
                                        autoComplete: "username",
                                        required: true,
                                        maxLength: 254,
                                        value: email,
                                        onChange: (e)=>setEmail(e.target.value),
                                        className: "w-full pl-9"
                                    }, void 0, false, {
                                        fileName: "[project]/app/connexion/page.tsx",
                                        lineNumber: 90,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/connexion/page.tsx",
                                lineNumber: 88,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 87,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Champ"], {
                            libelle: "Mot de passe",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                        className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                                    }, void 0, false, {
                                        fileName: "[project]/app/connexion/page.tsx",
                                        lineNumber: 95,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Saisie"], {
                                        type: "password",
                                        autoComplete: "current-password",
                                        required: true,
                                        maxLength: 128,
                                        value: motDePasse,
                                        onChange: (e)=>setMotDePasse(e.target.value),
                                        className: "w-full pl-9"
                                    }, void 0, false, {
                                        fileName: "[project]/app/connexion/page.tsx",
                                        lineNumber: 96,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/connexion/page.tsx",
                                lineNumber: 94,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 93,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Champ"], {
                            libelle: "Code personnel",
                            aide: "Les 12 caractères remis par l’administrateur (ex. T3G8-GH6J-FG3U). Laissez vide si vous n’en avez pas reçu.",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2d$round$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__KeyRound$3e$__["KeyRound"], {
                                        className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                                    }, void 0, false, {
                                        fileName: "[project]/app/connexion/page.tsx",
                                        lineNumber: 101,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Saisie"], {
                                        autoComplete: "one-time-code",
                                        spellCheck: false,
                                        value: code,
                                        onChange: (e)=>{
                                            // Majuscules et tirets ajoutés tout seuls : T3G8-GH6J-FG3U
                                            const brut = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
                                            setCode(brut.match(/.{1,4}/g)?.join("-") ?? "");
                                        },
                                        placeholder: "XXXX-XXXX-XXXX",
                                        className: "w-full pl-9 font-mono tracking-wider"
                                    }, void 0, false, {
                                        fileName: "[project]/app/connexion/page.tsx",
                                        lineNumber: 102,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/connexion/page.tsx",
                                lineNumber: 100,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 99,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Bouton"], {
                            variante: "principal",
                            type: "submit",
                            disabled: envoi,
                            className: "w-full py-2.5",
                            children: envoi ? "Connexion…" : "Se connecter"
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 116,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-center text-[11px] text-zinc-400",
                            children: "Les actions effectuées sont enregistrées dans le journal."
                        }, void 0, false, {
                            fileName: "[project]/app/connexion/page.tsx",
                            lineNumber: 119,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/connexion/page.tsx",
                    lineNumber: 81,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/connexion/page.tsx",
            lineNumber: 40,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/connexion/page.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/ui.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.mjs [app-ssr] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.mjs [app-ssr] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-spreadsheet.mjs [app-ssr] (ecmascript) <export default as FileSpreadsheet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/info.mjs [app-ssr] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.mjs [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.mjs [app-ssr] (ecmascript) <export default as TriangleAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.mjs [app-ssr] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.mjs [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.mjs [app-ssr] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
"use client";
;
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        title: titre,
        className: cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap", TONS[ton]),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
function Pastille({ ton = "vert", children, taille = "md" }) {
    const t = {
        sm: "size-7 [&_svg]:size-3.5",
        md: "size-9 [&_svg]:size-4",
        lg: "size-11 [&_svg]:size-5"
    }[taille];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: cx("inline-flex shrink-0 items-center justify-center rounded-full", t, PASTILLES[ton]),
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 78,
        columnNumber: 5
    }, this);
}
function Bouton({ variante = "secondaire", className, chargement, onClick, disabled, children, ...props }) {
    // Une action longue (calcul, fichier Excel…) grise le bouton jusqu'à la fin :
    // on ne peut pas cliquer deux fois, et l'on voit que le système travaille.
    const [occupe, setOccupe] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const enCours = chargement || occupe;
    const v = {
        principal: "bg-marque-500 text-white shadow-sm shadow-marque-500/20 hover:bg-marque-600 hover:shadow-md hover:shadow-marque-500/25 disabled:bg-marque-200 disabled:shadow-none",
        secondaire: "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300 disabled:text-zinc-400",
        danger: "bg-rouge-100 text-rouge-600 hover:bg-rouge-600 hover:text-white disabled:opacity-50",
        discret: "px-2! text-marque-700 hover:bg-marque-50 disabled:text-zinc-400",
        sombre: "bg-nuit text-white hover:bg-black disabled:opacity-50"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
            enCours && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
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
const ANNONCE = {
    vert: {
        titre: "C’est fait",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"],
        couleur: "bg-marque-50 text-marque-600"
    },
    rouge: {
        titre: "L’opération n’a pas abouti",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"],
        couleur: "bg-rouge-100 text-rouge-600"
    },
    jaune: {
        titre: "À noter",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlert$3e$__["TriangleAlert"],
        couleur: "bg-or-100 text-or-700"
    },
    bleu: {
        titre: "Information",
        icone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"],
        couleur: "bg-zinc-100 text-zinc-600"
    }
};
function Annonce({ ton = "vert", fermer, children }) {
    const ouverte = children !== null && children !== undefined && children !== false && children !== "";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!ouverte) return;
        const f = (e)=>(e.key === "Escape" || e.key === "Enter") && fermer();
        window.addEventListener("keydown", f);
        return ()=>window.removeEventListener("keydown", f);
    }, [
        ouverte,
        fermer
    ]);
    if (!ouverte) return null;
    const a = ANNONCE[ton] ?? ANNONCE.bleu;
    const Icone = a.icone;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-[60] animate-voile overflow-y-auto bg-nuit/40 backdrop-blur-sm",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-full items-center justify-center p-4 sm:p-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full max-w-md animate-fenetre rounded-3xl bg-white p-6 text-center shadow-2xl",
                role: "alertdialog",
                "aria-modal": "true",
                "aria-label": a.titre,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: cx("mx-auto mb-4 flex size-12 items-center justify-center rounded-full", a.couleur),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icone, {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "mb-2 text-lg font-semibold text-encre",
                        children: a.titre
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-[13px] leading-relaxed text-zinc-600",
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 174,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-6 flex justify-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
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
function Jauge({ valeur, max, className }) {
    const pct = max > 0 ? Math.min(100, Math.round(valeur / max * 100)) : valeur > 0 ? 100 : 0;
    const couleur = valeur >= max ? "bg-rouge-600" : pct >= 80 ? "bg-or-400" : "bg-marque-500";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("h-2 overflow-hidden rounded-full bg-zinc-200", className),
        role: "progressbar",
        "aria-valuenow": valeur,
        "aria-valuemax": max,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function Champ({ libelle, aide, bulle, erreur, children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: cx("flex flex-col gap-1.5 text-sm", erreur && "[&_input]:border-rouge-600 [&_input]:bg-rouge-100/50 [&_select]:border-rouge-600 [&_select]:bg-rouge-100/50", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: cx("flex items-center gap-1.5 text-xs font-medium", erreur ? "text-rouge-600" : "text-zinc-500"),
                children: [
                    libelle,
                    bulle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Aide, {
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
            erreur ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-[11px] font-medium text-rouge-600",
                children: erreur
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 228,
                columnNumber: 17
            }, this) : aide && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
    // Choix incomplet (mois sans année, ou l'inverse) : gardé ici tant que la valeur est vide
    const [partiel, setPartiel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("flex gap-2", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                value: m,
                onChange: (e)=>changer(a, e.target.value),
                className: cx(styleSaisie, "min-w-0 flex-1 cursor-pointer pr-8"),
                "aria-label": "Mois",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: "— Mois —"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 265,
                        columnNumber: 9
                    }, this),
                    NOMS_MOIS.map((n, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                value: a,
                onChange: (e)=>changer(e.target.value, m),
                className: cx(styleSaisie, "w-36 shrink-0 cursor-pointer pr-8"),
                "aria-label": "Année",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: "— Année —"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 273,
                        columnNumber: 9
                    }, this),
                    liste.map((x)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
        ...props,
        onClick: calendrier,
        className: cx(styleSaisie, props.className)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 299,
        columnNumber: 10
    }, this);
}
function Zone(props) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
        ...props,
        className: cx(styleSaisie, "min-h-20", props.className)
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 304,
        columnNumber: 5
    }, this);
}
function Liste({ options, vide, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
        ...props,
        className: cx(styleSaisie, "cursor-pointer pr-8", props.className),
        children: [
            vide !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                value: "",
                children: vide
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 324,
                columnNumber: 30
            }, this),
            options.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
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
function Carte({ titre, actions, children, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: cx("rounded-3xl bg-white p-5 shadow-doux", className),
        children: [
            (titre || actions) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "mb-4 flex flex-wrap items-center justify-between gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-[15px] font-semibold text-encre",
                        children: titre
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 349,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function EnTete({ titre, sousTitre, actions }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-6 flex flex-wrap items-end justify-between gap-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-3xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-[26px] font-semibold tracking-tight text-encre",
                        children: titre
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 370,
                        columnNumber: 9
                    }, this),
                    sousTitre && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
            actions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function Alerte({ ton = "rouge", children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-relaxed", TONS[ton]),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                className: "mt-0.5 size-4 shrink-0",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 398,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function Chiffre({ libelle, valeur, ton, detail, icone, href }) {
    const contenu = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            icone && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pastille, {
                ton: ton ?? "vert",
                taille: "lg",
                children: icone
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 423,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-w-0 flex-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-xs text-zinc-500",
                        children: libelle
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 428,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-0.5 text-2xl font-semibold tabular-nums text-encre",
                        children: valeur
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 429,
                        columnNumber: 9
                    }, this),
                    detail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
            href && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
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
    if (!href) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: classe,
        children: contenu
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 445,
        columnNumber: 21
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        className: cx(classe, "group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-1 hover:ring-marque-200"),
        children: contenu
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 447,
        columnNumber: 5
    }, this);
}
function Progression({ valeur, ton = "vert" }) {
    const c = {
        vert: "bg-marque-500",
        jaune: "bg-or-400",
        rouge: "bg-rouge-600",
        bleu: "bg-sky-500",
        gris: "bg-zinc-400"
    }[ton];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-1.5 w-full overflow-hidden rounded-full bg-zinc-100",
        role: "progressbar",
        "aria-valuenow": Math.round(valeur),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function Modale({ titre, ouverte, fermer, children, large }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!ouverte) return;
        const f = (e)=>e.key === "Escape" && fermer();
        window.addEventListener("keydown", f);
        return ()=>window.removeEventListener("keydown", f);
    }, [
        ouverte,
        fermer
    ]);
    if (!ouverte) return null;
    return(// Un clic à côté de la fenêtre ne la ferme pas (on ne perd pas une saisie par erreur) :
    // seuls la croix, un bouton « Annuler » ou la touche Échap la ferment.
    // Rendue directement dans <body> : centrée sur tout l'écran, voile flou sur toute la fenêtre,
    // quelle que soit la page qui l'ouvre (l'animation des pages ne la décale plus).
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 animate-voile overflow-y-auto bg-nuit/40 backdrop-blur-sm",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-full items-center justify-center p-4 sm:p-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: cx("w-full animate-fenetre rounded-3xl bg-white p-6 shadow-2xl", large ? "max-w-3xl" : "max-w-lg"),
                role: "dialog",
                "aria-modal": "true",
                "aria-label": titre,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-5 flex items-start justify-between gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-lg font-semibold text-encre",
                                children: titre
                            }, void 0, false, {
                                fileName: "[project]/components/ui.tsx",
                                lineNumber: 528,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: fermer,
                                className: "rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
                                "aria-label": "Fermer",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
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
function Chargement({ texte = "Chargement…" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center justify-center gap-2 py-12 text-sm text-zinc-400",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
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
function Vide({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "py-12 text-center text-sm text-zinc-400",
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui.tsx",
        lineNumber: 556,
        columnNumber: 5
    }, this);
}
function Tableau({ children, className, fixe }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: cx("-mx-1 overflow-x-auto", className),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
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
function Segments({ valeur, options, changer }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-doux",
        children: options.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
function Aide({ children, cote = "bas" }) {
    // La bulle s'affiche au-dessus de toute la page (portail) : elle n'est ni coupée
    // par un tableau, ni cachée par les boutons voisins, et reste dans l'écran.
    const [pos, setPos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
            pos && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
function BoutonIcone({ libelle, ton = "gris", children, ...props }) {
    const c = {
        gris: "text-zinc-500 hover:bg-zinc-100 hover:text-encre",
        vert: "text-marque-600 hover:bg-marque-50",
        rouge: "text-zinc-400 hover:bg-rouge-100 hover:text-rouge-600"
    }[ton];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
function ZoneFichier({ accept, envoi, envoyer, libelleBouton = "Importer", aide }) {
    const [fichier, setFichier] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [survol, setSurvol] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-wrap items-center gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pastille, {
                        ton: fichier ? "vert" : "gris",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__["FileSpreadsheet"], {}, void 0, false, {
                            fileName: "[project]/components/ui.tsx",
                            lineNumber: 743,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 742,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block truncate text-[13px] font-medium",
                                children: fichier ? fichier.name : "Déposez le fichier ici ou cliquez pour le choisir"
                            }, void 0, false, {
                                fileName: "[project]/components/ui.tsx",
                                lineNumber: 746,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
                variante: "principal",
                disabled: !fichier || envoi,
                onClick: ()=>fichier && envoyer(fichier),
                children: [
                    envoi ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "animate-spin"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 769,
                        columnNumber: 18
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {}, void 0, false, {
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
function useConfirmation() {
    const [q, setQ] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const demander = (question, libelle = "Oui, retirer")=>new Promise((repondre)=>setQ({
                question,
                libelle,
                repondre
            }));
    const repondre = (oui)=>{
        q?.repondre(oui);
        setQ(null);
    };
    const fenetre = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Modale, {
        titre: "Confirmer",
        ouverte: !!q,
        fermer: ()=>repondre(false),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[13px] leading-relaxed text-zinc-600",
                children: q?.question
            }, void 0, false, {
                fileName: "[project]/components/ui.tsx",
                lineNumber: 792,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-6 flex justify-end gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
                        onClick: ()=>repondre(false),
                        children: "Annuler"
                    }, void 0, false, {
                        fileName: "[project]/components/ui.tsx",
                        lineNumber: 794,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Bouton, {
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
}),
"[project]/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const CLE_JETON = "dgrhas.jeton";
const CLE_PROFIL = "dgrhas.profil";
function lireSession() {
    if ("TURBOPACK compile-time truthy", 1) return {
        jeton: null,
        profil: null
    };
    //TURBOPACK unreachable
    ;
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
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
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
        if (("TURBOPACK compile-time value", "undefined") !== "undefined" && !chemin.startsWith("/auth/")) //TURBOPACK unreachable
        ;
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
    const [, rafraichir] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducer"])((x)=>x + 1, 0);
    // Dernières données affichées : gardées à l'écran pendant qu'une autre ressource se charge
    const [precedentes, setPrecedentes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!chemin) return;
        const liste = abonnes.get(chemin) ?? new Set();
        liste.add(rafraichir);
        abonnes.set(chemin, liste);
        void lire(chemin);
        // Retour sur l'onglet : relu en silence s'il date, pour voir ce qui a été modifié ailleurs
        const auRetour = ()=>{
            if (document.visibilityState === "visible") void lire(chemin);
        };
        // Après une reconnexion (session expirée), la donnée restée en erreur est relue
        const apresReconnexion = ()=>void lire(chemin, true);
        window.addEventListener("focus", auRetour);
        document.addEventListener("visibilitychange", auRetour);
        window.addEventListener(SESSION_ROUVERTE, apresReconnexion);
        return ()=>{
            liste.delete(rafraichir);
            window.removeEventListener("focus", auRetour);
            document.removeEventListener("visibilitychange", auRetour);
            window.removeEventListener(SESSION_ROUVERTE, apresReconnexion);
        };
    }, [
        chemin
    ]);
    const recharger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (chemin) void lire(chemin, true);
    }, [
        chemin
    ]);
    const setDonnees = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((d)=>{
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
    }, [
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
function qs(params) {
    const p = Object.entries(params).filter(([, v])=>v !== undefined && v !== null && v !== "" && v !== false);
    return p.length ? "?" + p.map(([k, v])=>`${k}=${encodeURIComponent(String(v === true ? 1 : v))}`).join("&") : "";
}
}),
];})()

//# sourceMappingURL=_1q7dypvjkn33z._.js.map