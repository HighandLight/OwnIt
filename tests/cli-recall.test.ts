import { beforeEach, describe, expect, it, vi } from "vitest";
import { input } from "@inquirer/prompts";
import type Database from "better-sqlite3";
import { openDb } from "../src/storage/db.js";
import { runRecall } from "../src/cli/commands/recall.js";
import {
  createConceptCard,
  getConceptCardById,
} from "../src/storage/concept-card-repository.js";
import type { NewConceptCard } from "../src/types/concept-card.js";
import {
  EXPLAIN_EVALUATION_FIXTURE,
  MockLlmProvider,
} from "./fixtures/llm-fixtures.js";

vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

const mockedInput = vi.mocked(input);

function eventsNamed(db: Database.Database, eventName: string) {
  return db
    .prepare("SELECT * FROM learning_events WHERE event_name = ?")
    .all(eventName) as Array<{
    session_id: string;
    concept_id: string | null;
  }>;
}

const CARD_INPUT: NewConceptCard = {
  conceptName: "Spring @Transactional self-invocation",
  sourceType: "error_fix",
  sourceSummary: "에러 해결의 핵심 원리로 사용됨",
  userExplanation: "이전 설명",
  correctedExplanation: "이전 교정 설명",
  status: "unclear",
  firstExplainScore: 1,
  missingPoints: ["예전 미흡 포인트"],
  misconceptions: [],
  reviewQuestions: [
    "왜 self-invocation에서는 @Transactional이 동작하지 않나요?",
  ],
};

describe("runRecall", () => {
  beforeEach(() => {
    mockedInput.mockReset();
  });

  it("prints a message and records no events when there is no card to review", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runRecall(provider, db);

    expect(logSpy.mock.calls.flat().join("\n")).toContain(
      "review할 카드가 없습니다.",
    );
    expect(mockedInput).not.toHaveBeenCalled();
    expect(eventsNamed(db, "recall_check_offered")).toHaveLength(0);
    expect(eventsNamed(db, "recall_check_submitted")).toHaveLength(0);
    expect(eventsNamed(db, "recall_check_evaluated")).toHaveLength(0);

    logSpy.mockRestore();
  });

  it("asks the review question, evaluates the answer, updates the card, and records offered/submitted/evaluated under one sessionId", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    const card = createConceptCard(db, CARD_INPUT);
    mockedInput.mockResolvedValue("같은 클래스 내부 호출은 프록시를 거치지 않는다.");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runRecall(provider, db);

    expect(mockedInput).toHaveBeenCalledTimes(1);

    const printed = logSpy.mock.calls.flat().join("\n");
    expect(printed).toContain(CARD_INPUT.reviewQuestions[0]);
    expect(printed).toContain("unclear"); // previous status
    expect(printed).toContain("needs_review"); // new status from fixture (score 4)
    expect(printed).toContain("Concept Card 업데이트 완료.");

    const offered = eventsNamed(db, "recall_check_offered");
    const submitted = eventsNamed(db, "recall_check_submitted");
    const evaluated = eventsNamed(db, "recall_check_evaluated");
    expect(offered).toHaveLength(1);
    expect(submitted).toHaveLength(1);
    expect(evaluated).toHaveLength(1);

    const sessionId = offered[0].session_id;
    expect(submitted[0].session_id).toBe(sessionId);
    expect(evaluated[0].session_id).toBe(sessionId);
    expect(offered[0].concept_id).toBe(card.id);
    expect(submitted[0].concept_id).toBe(card.id);
    expect(evaluated[0].concept_id).toBe(card.id);

    const updatedCard = getConceptCardById(db, card.id);
    expect(updatedCard?.status).toBe(EXPLAIN_EVALUATION_FIXTURE.status);
    expect(updatedCard?.latestRecallScore).toBe(EXPLAIN_EVALUATION_FIXTURE.score);
    expect(updatedCard?.reviewCount).toBe(1);
    expect(updatedCard?.lastReviewedAt).toBeTruthy();

    logSpy.mockRestore();
  });

  it("passes a validate function to input() that rejects empty answers", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    createConceptCard(db, CARD_INPUT);
    mockedInput.mockResolvedValue("real answer");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runRecall(provider, db);

    const call = mockedInput.mock.calls[0]?.[0] as {
      validate?: (value: string) => boolean | string;
    };

    expect(call.validate?.("")).not.toBe(true);
    expect(call.validate?.("real answer")).toBe(true);
  });
});
