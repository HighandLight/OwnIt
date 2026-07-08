import { describe, expect, it } from "vitest";
import {
  CONCEPT_DETECTION_FIXTURE,
  EXPLAIN_EVALUATION_FIXTURE,
  MockLlmProvider,
  SCHEMA_NAMES,
} from "./fixtures/llm-fixtures.js";

describe("MockLlmProvider", () => {
  it("returns the concept detection fixture for the concept-detection schema", async () => {
    const provider = new MockLlmProvider();

    const result = await provider.completeJson(
      "any prompt",
      SCHEMA_NAMES.conceptDetection,
    );

    expect(result).toEqual(CONCEPT_DETECTION_FIXTURE);
  });

  it("returns the explain evaluation fixture for the explain-evaluation schema", async () => {
    const provider = new MockLlmProvider();

    const result = await provider.completeJson(
      "any prompt",
      SCHEMA_NAMES.explainEvaluation,
    );

    expect(result).toEqual(EXPLAIN_EVALUATION_FIXTURE);
  });

  it("throws for an unknown schemaName instead of hitting the network", async () => {
    const provider = new MockLlmProvider();

    await expect(
      provider.completeJson("any prompt", "unknown-schema"),
    ).rejects.toThrow(/unknown-schema/);
  });
});
