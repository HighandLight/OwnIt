import type { ConceptSourceType } from "./concept-card.js";

export type DetectedConcept = {
  name: string;
  reason: string;
  sourceType: ConceptSourceType;
  confidence: number;
  explainPrompt: string;
};
