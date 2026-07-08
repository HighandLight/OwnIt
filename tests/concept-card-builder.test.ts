import { describe, expect, it } from "vitest";
import { buildConceptCard } from "../src/core/concept-card-builder.js";
import type { DetectedConcept } from "../src/types/concept.js";
import type { ExplainEvaluation } from "../src/types/evaluation.js";

const CONCEPT: DetectedConcept = {
  name: "Spring @Transactional self-invocation",
  reason: "에러 해결의 핵심 원리로 사용됨",
  sourceType: "error_fix",
  confidence: 0.88,
  explainPrompt:
    "왜 같은 클래스 내부 호출에서는 @Transactional이 적용되지 않을 수 있나요?",
};

const EVALUATION: ExplainEvaluation = {
  score: 4,
  status: "needs_review",
  correctParts: ["프록시를 거쳐야 한다는 점을 언급했습니다."],
  missingPoints: ["self-invocation에서는 프록시를 거치지 않는다는 설명이 부족합니다."],
  misconceptions: [],
  correctedExplanation:
    "같은 클래스 내부에서 메서드를 직접 호출하면 Spring 프록시를 거치지 않기 때문에 @Transactional이 적용되지 않을 수 있다.",
  reviewQuestions: ["왜 self-invocation에서는 @Transactional이 동작하지 않나요?"],
};

describe("buildConceptCard", () => {
  it("maps concept + user explanation + evaluation into a NewConceptCard", () => {
    const card = buildConceptCard(
      CONCEPT,
      "같은 클래스 내부에서 호출하면 프록시를 거치지 않는다.",
      EVALUATION,
    );

    expect(card).toEqual({
      conceptName: CONCEPT.name,
      sourceType: CONCEPT.sourceType,
      sourceSummary: CONCEPT.reason,
      userExplanation: "같은 클래스 내부에서 호출하면 프록시를 거치지 않는다.",
      correctedExplanation: EVALUATION.correctedExplanation,
      status: EVALUATION.status,
      firstExplainScore: EVALUATION.score,
      missingPoints: EVALUATION.missingPoints,
      misconceptions: EVALUATION.misconceptions,
      reviewQuestions: EVALUATION.reviewQuestions,
    });
  });

  it("does not include id, createdAt, or updatedAt (repository's job, not the builder's)", () => {
    const card = buildConceptCard(CONCEPT, "설명", EVALUATION);

    expect(card).not.toHaveProperty("id");
    expect(card).not.toHaveProperty("createdAt");
    expect(card).not.toHaveProperty("updatedAt");
  });

  it("redacts secrets in the user explanation before storing it", () => {
    const explanation =
      "제 키는 sk-proj-abcdefghijklmnopqrstuvwxyz1234567890 입니다";

    const card = buildConceptCard(CONCEPT, explanation, EVALUATION);

    expect(card.userExplanation).toContain("[REDACTED]");
    expect(card.userExplanation).not.toContain(
      "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
    );
  });
});
