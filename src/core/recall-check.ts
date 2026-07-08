import type { ConceptCard } from "../types/concept-card.js";
import type { DetectedConcept } from "../types/concept.js";

export function pickReviewQuestion(card: ConceptCard): string {
  const [question] = card.reviewQuestions;
  if (!question) {
    throw new Error(`Concept card ${card.id} has no review questions`);
  }

  return question;
}

export function toRecallConcept(
  card: ConceptCard,
  reviewQuestion: string,
): DetectedConcept {
  return {
    name: card.conceptName,
    reason: card.sourceSummary ?? "",
    sourceType: card.sourceType,
    confidence: 1,
    explainPrompt: reviewQuestion,
  };
}
