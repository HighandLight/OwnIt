import { randomUUID } from "node:crypto";
import { input } from "@inquirer/prompts";
import type Database from "better-sqlite3";
import { pickReviewQuestion, toRecallConcept } from "../../core/recall-check.js";
import { evaluateExplanation } from "../../core/explain-evaluator.js";
import type { LlmProvider } from "../../llm/provider.js";
import {
  recordRecallResult,
  selectNextReviewCard,
} from "../../storage/concept-card-repository.js";
import { createEvent } from "../../storage/event-repository.js";
import type { Language } from "../../types/config.js";
import { printEvaluation } from "./check.js";

export async function runRecall(
  provider: LlmProvider,
  db: Database.Database,
  language: Language,
): Promise<void> {
  const card = selectNextReviewCard(db);

  if (!card) {
    console.log("review할 카드가 없습니다.");
    return;
  }

  const sessionId = randomUUID();
  const question = pickReviewQuestion(card);

  createEvent(db, {
    eventName: "recall_check_offered",
    sessionId,
    conceptId: card.id,
    properties: { conceptName: card.conceptName },
  });

  console.log(
    `\n지난번에 학습한 개념입니다.\n\nQ. ${question}\n힌트 없이 답해보세요.\n`,
  );

  const answer = await input({
    message: "답변을 입력하세요:",
    validate: (value: string) =>
      value.trim().length > 0 ? true : "답변을 입력해주세요.",
  });

  createEvent(db, {
    eventName: "recall_check_submitted",
    sessionId,
    conceptId: card.id,
    properties: { conceptName: card.conceptName },
  });

  const recallConcept = toRecallConcept(card, question);
  const evaluation = await evaluateExplanation(
    provider,
    recallConcept,
    answer,
    language,
  );

  createEvent(db, {
    eventName: "recall_check_evaluated",
    sessionId,
    conceptId: card.id,
    properties: { score: evaluation.score, status: evaluation.status },
  });

  const updatedCard = recordRecallResult(db, card.id, evaluation);

  console.log(`상태 변화: ${card.status} → ${updatedCard.status}`);
  printEvaluation(evaluation);
  console.log("\nConcept Card 업데이트 완료.");
}
