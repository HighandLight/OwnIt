import { SCHEMA_NAMES, type LlmProvider } from "../llm/provider.js";
import type { DetectedConcept } from "../types/concept.js";
import { redact } from "./redaction.js";

const MIN_CONFIDENCE = 0.6;

const INSTRUCTIONS = `You are a learning assistant for software developers.
Given a Codex answer or coding explanation, extract 1 to 3 concepts worth learning.
Focus on concepts that help the user solve similar problems later.
Do not extract trivial syntax or one-off implementation details.

Return strict JSON:
{
  "concepts": [
    {
      "name": string,
      "reason": string,
      "sourceType": "error_fix" | "concept_explanation" | "code_review" | "manual",
      "confidence": number,
      "explainPrompt": string
    }
  ]
}`;

type ConceptDetectionResponse = {
  concepts: DetectedConcept[];
};

export async function detectConcepts(
  provider: LlmProvider,
  inputText: string,
): Promise<DetectedConcept[]> {
  const redactedInput = redact(inputText);
  const prompt = `${INSTRUCTIONS}\n\nCodex output:\n${redactedInput}`;

  const response = await provider.completeJson<ConceptDetectionResponse>(
    prompt,
    SCHEMA_NAMES.conceptDetection,
  );

  const concepts = response.concepts ?? [];

  return concepts.filter((concept) => concept.confidence >= MIN_CONFIDENCE);
}
