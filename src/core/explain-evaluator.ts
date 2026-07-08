import { SCHEMA_NAMES, type LlmProvider } from "../llm/provider.js";
import type { DetectedConcept } from "../types/concept.js";
import type { EvaluationStatus, ExplainEvaluation } from "../types/evaluation.js";
import { redact } from "./redaction.js";

const INSTRUCTIONS = `You are evaluating whether a developer truly understood a concept.
Evaluate the user's explanation using this rubric:
- core concept included
- cause-effect relationship is correct
- connected to the coding context
- no major misconception

Return strict JSON:
{
  "score": 1 | 2 | 3 | 4 | 5,
  "status": "passed" | "needs_review" | "unclear",
  "correctParts": string[],
  "missingPoints": string[],
  "misconceptions": string[],
  "correctedExplanation": string,
  "reviewQuestions": string[]
}`;

export function statusFromScore(
  score: number,
  hasMisconceptions: boolean,
): EvaluationStatus {
  if (score <= 2) return "unclear";
  if (score <= 4) return "needs_review";
  return hasMisconceptions ? "needs_review" : "passed";
}

export async function evaluateExplanation(
  provider: LlmProvider,
  concept: DetectedConcept,
  userExplanation: string,
): Promise<ExplainEvaluation> {
  const redactedExplanation = redact(userExplanation);

  const prompt = `${INSTRUCTIONS}

Concept: ${concept.name}
Question asked: ${concept.explainPrompt}
User's explanation: ${redactedExplanation}`;

  const response = await provider.completeJson<ExplainEvaluation>(
    prompt,
    SCHEMA_NAMES.explainEvaluation,
  );

  return {
    ...response,
    status: statusFromScore(response.score, response.misconceptions.length > 0),
  };
}
