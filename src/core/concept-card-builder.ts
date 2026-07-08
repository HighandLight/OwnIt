import { redact } from "./redaction.js";
import type { NewConceptCard } from "../types/concept-card.js";
import type { DetectedConcept } from "../types/concept.js";
import type { ExplainEvaluation } from "../types/evaluation.js";

export function buildConceptCard(
  concept: DetectedConcept,
  userExplanation: string,
  evaluation: ExplainEvaluation,
): NewConceptCard {
  return {
    conceptName: concept.name,
    sourceType: concept.sourceType,
    sourceSummary: concept.reason,
    userExplanation: redact(userExplanation),
    correctedExplanation: evaluation.correctedExplanation,
    status: evaluation.status,
    firstExplainScore: evaluation.score,
    missingPoints: evaluation.missingPoints,
    misconceptions: evaluation.misconceptions,
    reviewQuestions: evaluation.reviewQuestions,
  };
}
