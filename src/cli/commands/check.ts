import { randomUUID } from "node:crypto";
import { confirm, input, select } from "@inquirer/prompts";
import type Database from "better-sqlite3";
import { buildConceptCard } from "../../core/concept-card-builder.js";
import { detectConcepts } from "../../core/concept-detector.js";
import { evaluateExplanation } from "../../core/explain-evaluator.js";
import type { LlmProvider } from "../../llm/provider.js";
import {
  createConceptCard,
  getConceptCardByConceptName,
  updateConceptCard,
} from "../../storage/concept-card-repository.js";
import { createEvent } from "../../storage/event-repository.js";
import type { ConceptCard } from "../../types/concept-card.js";
import type { DetectedConcept } from "../../types/concept.js";
import type { Language } from "../../types/config.js";
import type { ExplainEvaluation } from "../../types/evaluation.js";

export async function runCheck(
  provider: LlmProvider,
  db: Database.Database,
  inputText: string,
  language: Language,
  save: boolean = true,
): Promise<void> {
  const sessionId = randomUUID();

  const concepts = await detectConcepts(provider, inputText, language);

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
    sessionId,
    properties: { conceptName: concept.name },
  });

  const evaluation = await evaluateExplanation(
    provider,
    concept,
    answer,
    language,
  );

  printEvaluation(evaluation);

  if (!save) {
    return;
  }

  const savedCard = await saveConceptCard(db, concept, answer, evaluation);

  createEvent(db, {
    eventName: "concept_card_created",
    sessionId,
    conceptId: savedCard.id,
    properties: { conceptName: concept.name },
  });

  console.log(`\nConcept Card 저장 완료. (id: ${savedCard.id})`);
}

async function saveConceptCard(
  db: Database.Database,
  concept: DetectedConcept,
  userExplanation: string,
  evaluation: ExplainEvaluation,
): Promise<ConceptCard> {
  const newCard = buildConceptCard(concept, userExplanation, evaluation);
  const existing = getConceptCardByConceptName(db, concept.name);

  if (!existing) {
    return createConceptCard(db, newCard);
  }

  const shouldUpdate = await confirm({
    message: `"${concept.name}" 카드가 이미 있어요. 업데이트할까요?`,
    default: true,
  });

  return shouldUpdate
    ? updateConceptCard(db, existing.id, newCard)
    : createConceptCard(db, newCard);
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

export function printEvaluation(evaluation: ExplainEvaluation): void {
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
