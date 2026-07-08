import { SCHEMA_NAMES, type LlmProvider } from "../llm/provider.js";
import type { DetectedConcept } from "../types/concept.js";
import type { Language } from "../types/config.js";
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

const LANGUAGE_DIRECTIVE: Record<Language, string> = {
  ko: "모든 응답 필드(name, reason, explainPrompt 등)는 한국어로 작성하세요.",
  en: "Write all response fields (name, reason, explainPrompt, etc.) in English.",
};

const SOURCE_TYPE_DIRECTIVE =
  'The sourceType value must always stay in English exactly as one of: "error_fix", "concept_explanation", "code_review", "manual" — never translate it.';

type ConceptDetectionResponse = {
  concepts: DetectedConcept[];
};

export async function detectConcepts(
  provider: LlmProvider,
  inputText: string,
  language: Language,
): Promise<DetectedConcept[]> {
  const redactedInput = redact(inputText);
  const prompt = `${INSTRUCTIONS}

${LANGUAGE_DIRECTIVE[language]}
${SOURCE_TYPE_DIRECTIVE}

Codex output:
${redactedInput}`;

  const response = await provider.completeJson<ConceptDetectionResponse>(
    prompt,
    SCHEMA_NAMES.conceptDetection,
  );

  const concepts = response.concepts ?? [];

  return concepts.filter((concept) => concept.confidence >= MIN_CONFIDENCE);
}
