import { randomUUID } from "node:crypto";
import { input, select } from "@inquirer/prompts";
import type Database from "better-sqlite3";
import { detectConcepts } from "../../core/concept-detector.js";
import { evaluateExplanation } from "../../core/explain-evaluator.js";
import type { LlmProvider } from "../../llm/provider.js";
import { createEvent } from "../../storage/event-repository.js";
import type { DetectedConcept } from "../../types/concept.js";
import type { ExplainEvaluation } from "../../types/evaluation.js";

export async function runCheck(
  provider: LlmProvider,
  db: Database.Database,
  inputText: string,
): Promise<void> {
  const concepts = await detectConcepts(provider, inputText);

  if (concepts.length === 0) {
    console.log("이번 답변에는 새로운 학습 개념이 없는 것 같아요.");
    return;
  }

  const concept = await selectConcept(concepts);

  console.log(`\nQ. ${concept.explainPrompt}\n`);

  const answer = await input({
    message: "여기에 답변을 입력하세요:",
    validate: (value: string) =>
      value.trim().length > 0 ? true : "답변을 입력해주세요.",
  });

  createEvent(db, {
    eventName: "explain_check_submitted",
    sessionId: randomUUID(),
    properties: { conceptName: concept.name },
  });

  const evaluation = await evaluateExplanation(provider, concept, answer);

  printEvaluation(evaluation);
}

async function selectConcept(
  concepts: DetectedConcept[],
): Promise<DetectedConcept> {
  if (concepts.length === 1) {
    return concepts[0];
  }

  return select({
    message: "체크할 개념을 선택하세요:",
    choices: concepts.map((concept) => ({
      name: concept.name,
      value: concept,
    })),
  });
}

function printEvaluation(evaluation: ExplainEvaluation): void {
  console.log(`평가: ${evaluation.status}\n`);

  if (evaluation.correctParts.length > 0) {
    console.log("좋은 점:");
    for (const part of evaluation.correctParts) {
      console.log(`- ${part}`);
    }
    console.log("");
  }

  if (evaluation.missingPoints.length > 0) {
    console.log("보완:");
    for (const point of evaluation.missingPoints) {
      console.log(`- ${point}`);
    }
  }
}
