"use client";

import { RecommandationsVue } from "@/components/recommandations-vue";

/** Rubrique « Recommandations » des mutations (06/11/2026) : les mêmes, limitées aux mutations. */
export default function RecommandationsMutations() {
  return <RecommandationsVue operationFixe="MUTATION" />;
}
