import { describe, expect, it } from "vitest";
import type { LlmProvider } from "../src/llm/provider.js";
import { SCHEMA_NAMES } from "../src/llm/provider.js";
import type { DetectedConcept } from "../src/types/concept.js";
import {
  evaluateExplanation,
  statusFromScore,
} from "../src/core/explain-evaluator.js";
import {
  EXPLAIN_EVALUATION_FIXTURE,
  MockLlmProvider,
} from "./fixtures/llm-fixtures.js";

class StubLlmProvider implements LlmProvider {
  public lastPrompt = "";
  public lastSchemaName = "";

  constructor(private readonly response: unknown) {}

  async completeText(): Promise<string> {
    return "";
  }

  async completeJson<T>(prompt: string, schemaName: string): Promise<T> {
    this.lastPrompt = prompt;
    this.lastSchemaName = schemaName;
    return this.response as T;
  }
}

const CONCEPT: DetectedConcept = {
  name: "Spring @Transactional self-invocation",
  reason: "에러 해결의 핵심 원리로 사용됨",
  sourceType: "error_fix",
  confidence: 0.88,
  explainPrompt:
    "왜 같은 클래스 내부 호출에서는 @Transactional이 적용되지 않을 수 있나요?",
};

describe("statusFromScore", () => {
  it.each([
    [1, false, "unclear"],
    [2, false, "unclear"],
    [3, false, "needs_review"],
    [4, false, "needs_review"],
    [5, false, "passed"],
    [5, true, "needs_review"],
  ] as const)(
    "maps score=%s, hasMisconceptions=%s to %s",
    (score, hasMisconceptions, expected) => {
      expect(statusFromScore(score, hasMisconceptions)).toBe(expected);
    },
  );
});

describe("evaluateExplanation", () => {
  it("redacts secrets in the user explanation before sending the prompt", async () => {
    const stub = new StubLlmProvider(EXPLAIN_EVALUATION_FIXTURE);
    const explanation =
      "제 API 키는 sk-proj-abcdefghijklmnopqrstuvwxyz1234567890 인데 이걸로 인증했어요";

    await evaluateExplanation(stub, CONCEPT, explanation, "ko");

    expect(stub.lastPrompt).toContain("[REDACTED]");
    expect(stub.lastPrompt).not.toContain(
      "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
    );
  });

  it("returns an evaluation parsed from the LLM's explain-evaluation response", async () => {
    const provider = new MockLlmProvider();

    const result = await evaluateExplanation(
      provider,
      CONCEPT,
      "같은 클래스 내부에서 호출하면 프록시를 거치지 않는다.",
      "ko",
    );

    expect(result.correctParts).toEqual(EXPLAIN_EVALUATION_FIXTURE.correctParts);
    expect(result.missingPoints).toEqual(EXPLAIN_EVALUATION_FIXTURE.missingPoints);
    expect(result.correctedExplanation).toBe(
      EXPLAIN_EVALUATION_FIXTURE.correctedExplanation,
    );
  });

  it("recomputes status from score locally instead of trusting the LLM's status field", async () => {
    const stub = new StubLlmProvider({
      ...EXPLAIN_EVALUATION_FIXTURE,
      score: 5,
      status: "needs_review", // LLM says needs_review, but score/misconceptions say passed
      misconceptions: [],
    });

    const result = await evaluateExplanation(stub, CONCEPT, "any explanation", "ko");

    expect(result.status).toBe("passed");
  });

  it("calls completeJson with the explain-evaluation schema name", async () => {
    const stub = new StubLlmProvider(EXPLAIN_EVALUATION_FIXTURE);

    await evaluateExplanation(stub, CONCEPT, "any explanation", "ko");

    expect(stub.lastSchemaName).toBe(SCHEMA_NAMES.explainEvaluation);
  });

  it.each(["ko", "en"] as const)(
    "includes a %s-language directive in the prompt",
    async (language) => {
      const stub = new StubLlmProvider(EXPLAIN_EVALUATION_FIXTURE);

      await evaluateExplanation(stub, CONCEPT, "any explanation", language);

      expect(stub.lastPrompt.toLowerCase()).toContain(
        language === "ko" ? "한국어" : "english",
      );
    },
  );
});
