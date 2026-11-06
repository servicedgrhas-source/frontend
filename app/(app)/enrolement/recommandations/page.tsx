"use client";

import { RecommandationsVue } from "@/components/recommandations-vue";

/** Rubrique « Recommandations » de l'enrôlement (06/11/2026) : les mêmes, limitées aux volontaires. */
export default function RecommandationsEnrolement() {
  return <RecommandationsVue operationFixe="ENROLEMENT" />;
}
