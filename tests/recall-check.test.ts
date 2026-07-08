import { describe, expect, it } from "vitest";
import {
  pickReviewQuestion,
  toRecallConcept,
} from "../src/core/recall-check.js";
import type { ConceptCard } from "../src/types/concept-card.js";

const CARD: ConceptCard = {
  id: "card-1",
  conceptName: "Spring @Transactional self-invocation",
  sourceType: "error_fix",
  sourceSummary: "에러 해결의 핵심 원리로 사용됨",
  userExplanation: "같은 클래스 내부에서 호출하면 프록시를 거치지 않는다.",
  correctedExplanation:
    "같은 클래스 내부에서 메서드를 직접 호출하면 Spring 프록시를 거치지 않기 때문에 @Transactional이 적용되지 않을 수 있다.",
  status: "needs_review",
  firstExplainScore: 4,
  missingPoints: ["self-invocation 용어 언급 부족"],
  misconceptions: [],
  reviewQuestions: [
    "왜 self-invocation에서는 @Transactional이 동작하지 않나요?",
    "@Transactional이 적용되려면 호출이 어떤 경로를 거쳐야 하나요?",
  ],
  reviewCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("pickReviewQuestion", () => {
  it("returns the first review question", () => {
    expect(pickReviewQuestion(CARD)).toBe(CARD.reviewQuestions[0]);
  });

  it("throws when the card has no review questions", () => {
    const cardWithNoQuestions: ConceptCard = { ...CARD, reviewQuestions: [] };

    expect(() => pickReviewQuestion(cardWithNoQuestions)).toThrow();
  });
});

describe("toRecallConcept", () => {
  it("maps the card and chosen question into a DetectedConcept-shaped object", () => {
    const question = CARD.reviewQuestions[1];

    const concept = toRecallConcept(CARD, question);

    expect(concept.name).toBe(CARD.conceptName);
    expect(concept.sourceType).toBe(CARD.sourceType);
    expect(concept.explainPrompt).toBe(question);
  });
});
