import { SCHEMA_NAMES, type LlmProvider } from "../../src/llm/provider.js";

export { SCHEMA_NAMES };

// PRD 11.3 Concept Detection 예시
export const CONCEPT_DETECTION_FIXTURE = {
  concepts: [
    {
      name: "Spring @Transactional self-invocation",
      reason: "에러 해결의 핵심 원리로 사용됨",
      sourceType: "error_fix",
      confidence: 0.88,
      explainPrompt:
        "왜 같은 클래스 내부 호출에서는 @Transactional이 적용되지 않을 수 있나요?",
    },
  ],
};

// PRD 8.5 Feedback Evaluation 예시 (1~5점 스케일 반영)
export const EXPLAIN_EVALUATION_FIXTURE = {
  score: 4,
  status: "needs_review",
  correctParts: ["프록시를 거쳐야 한다는 점을 언급했습니다."],
  missingPoints: [
    "self-invocation에서는 프록시를 거치지 않는다는 설명이 부족합니다.",
  ],
  misconceptions: [],
  correctedExplanation:
    "같은 클래스 내부에서 메서드를 직접 호출하면 Spring 프록시를 거치지 않기 때문에 @Transactional이 적용되지 않을 수 있다.",
  reviewQuestions: [
    "왜 self-invocation에서는 @Transactional이 동작하지 않나요?",
    "@Transactional이 적용되려면 호출이 어떤 경로를 거쳐야 하나요?",
  ],
};

const FIXTURES_BY_SCHEMA: Record<string, unknown> = {
  [SCHEMA_NAMES.conceptDetection]: CONCEPT_DETECTION_FIXTURE,
  [SCHEMA_NAMES.explainEvaluation]: EXPLAIN_EVALUATION_FIXTURE,
};

export class MockLlmProvider implements LlmProvider {
  async completeText(): Promise<string> {
    return "";
  }

  async completeJson<T>(_prompt: string, schemaName: string): Promise<T> {
    if (!(schemaName in FIXTURES_BY_SCHEMA)) {
      throw new Error(`No fixture registered for schemaName: ${schemaName}`);
    }

    return FIXTURES_BY_SCHEMA[schemaName] as T;
  }
}
