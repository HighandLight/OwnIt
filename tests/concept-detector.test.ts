import { describe, expect, it, vi } from "vitest";
import type { LlmProvider } from "../src/llm/provider.js";
import { SCHEMA_NAMES } from "../src/llm/provider.js";
import { detectConcepts } from "../src/core/concept-detector.js";
import {
  CONCEPT_DETECTION_FIXTURE,
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

describe("detectConcepts", () => {
  it("redacts secrets in the input text before sending the prompt to the provider", async () => {
    const stub = new StubLlmProvider({ concepts: [] });
    const input =
      "Codex output: use sk-proj-abcdefghijklmnopqrstuvwxyz1234567890 to authenticate";

    await detectConcepts(stub, input, "ko");

    expect(stub.lastPrompt).toContain("[REDACTED]");
    expect(stub.lastPrompt).not.toContain(
      "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
    );
  });

  it("returns concepts parsed from the LLM's concept-detection response", async () => {
    const provider = new MockLlmProvider();

    const result = await detectConcepts(provider, "some Codex answer", "ko");

    expect(result).toEqual(CONCEPT_DETECTION_FIXTURE.concepts);
  });

  it("calls completeJson with the concept-detection schema name", async () => {
    const stub = new StubLlmProvider({ concepts: [] });

    await detectConcepts(stub, "some Codex answer", "ko");

    expect(stub.lastSchemaName).toBe(SCHEMA_NAMES.conceptDetection);
  });

  it("filters out concepts with confidence below 0.6", async () => {
    const stub = new StubLlmProvider({
      concepts: [
        {
          name: "high confidence concept",
          reason: "reason",
          sourceType: "error_fix",
          confidence: 0.9,
          explainPrompt: "explain?",
        },
        {
          name: "low confidence concept",
          reason: "reason",
          sourceType: "error_fix",
          confidence: 0.4,
          explainPrompt: "explain?",
        },
      ],
    });

    const result = await detectConcepts(stub, "some Codex answer", "ko");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("high confidence concept");
  });

  it("returns an empty array when the LLM reports no concepts", async () => {
    const stub = new StubLlmProvider({ concepts: [] });

    const result = await detectConcepts(stub, "some Codex answer", "ko");

    expect(result).toEqual([]);
  });

  it("propagates an error instead of swallowing it when completeJson rejects", async () => {
    const failingProvider: LlmProvider = {
      completeText: vi.fn(),
      completeJson: vi.fn().mockRejectedValue(new Error("network error")),
    };

    await expect(
      detectConcepts(failingProvider, "some Codex answer", "ko"),
    ).rejects.toThrow("network error");
  });

  it.each(["ko", "en"] as const)(
    "includes a %s-language directive in the prompt",
    async (language) => {
      const stub = new StubLlmProvider({ concepts: [] });

      await detectConcepts(stub, "some Codex answer", language);

      expect(stub.lastPrompt.toLowerCase()).toContain(
        language === "ko" ? "한국어" : "english",
      );
    },
  );

  it("always instructs the LLM to keep sourceType in English regardless of language", async () => {
    const stub = new StubLlmProvider({ concepts: [] });

    await detectConcepts(stub, "some Codex answer", "ko");

    expect(stub.lastPrompt).toContain("sourceType");
    expect(stub.lastPrompt.toLowerCase()).toContain("english");
  });
});
