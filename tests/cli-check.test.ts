import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirm, input, select } from "@inquirer/prompts";
import type Database from "better-sqlite3";
import { SCHEMA_NAMES, type LlmProvider } from "../src/llm/provider.js";
import { openDb } from "../src/storage/db.js";
import { runCheck } from "../src/cli/commands/check.js";
import { createConceptCard } from "../src/storage/concept-card-repository.js";
import type { NewConceptCard } from "../src/types/concept-card.js";
import {
  CONCEPT_DETECTION_FIXTURE,
  CONCEPT_DETECTION_FIXTURE_MULTI,
  EXPLAIN_EVALUATION_FIXTURE,
  MockLlmProvider,
} from "./fixtures/llm-fixtures.js";

class MultiConceptStubProvider implements LlmProvider {
  public lastEvaluationPrompt = "";

  async completeText(): Promise<string> {
    return "";
  }

  async completeJson<T>(prompt: string, schemaName: string): Promise<T> {
    if (schemaName === SCHEMA_NAMES.conceptDetection) {
      return CONCEPT_DETECTION_FIXTURE_MULTI as T;
    }

    this.lastEvaluationPrompt = prompt;
    return EXPLAIN_EVALUATION_FIXTURE as T;
  }
}

vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

const mockedInput = vi.mocked(input);
const mockedSelect = vi.mocked(select);
const mockedConfirm = vi.mocked(confirm);

function eventsNamed(db: Database.Database, eventName: string) {
  return db
    .prepare("SELECT * FROM learning_events WHERE event_name = ?")
    .all(eventName);
}

function submittedEvents(db: Database.Database) {
  return eventsNamed(db, "explain_check_submitted");
}

function allCards(db: Database.Database) {
  return db.prepare("SELECT * FROM concept_cards").all() as Array<{
    id: string;
    concept_name: string;
  }>;
}

const EXISTING_CARD_INPUT: NewConceptCard = {
  conceptName: CONCEPT_DETECTION_FIXTURE.concepts[0].name,
  sourceType: "error_fix",
  sourceSummary: "previous summary",
  userExplanation: "이전 설명",
  correctedExplanation: "이전 교정 설명",
  status: "unclear",
  firstExplainScore: 1,
  missingPoints: ["예전 미흡 포인트"],
  misconceptions: [],
  reviewQuestions: ["예전 질문"],
};

describe("runCheck", () => {
  beforeEach(() => {
    mockedInput.mockReset();
    mockedSelect.mockReset();
    mockedConfirm.mockReset();
  });

  it("asks the explain-check question, evaluates the mocked answer, prints the result, and records explain_check_submitted", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    mockedInput.mockResolvedValue("같은 클래스 내부 호출은 프록시를 거치지 않는다.");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(provider, db, "Codex output text", "ko");

    expect(mockedInput).toHaveBeenCalledTimes(1);
    expect(mockedSelect).not.toHaveBeenCalled(); // fixture has exactly 1 concept

    const printed = logSpy.mock.calls.flat().join("\n");
    expect(printed).toContain(
      CONCEPT_DETECTION_FIXTURE.concepts[0].explainPrompt,
    );
    expect(printed).toContain("needs_review");

    expect(submittedEvents(db)).toHaveLength(1);

    logSpy.mockRestore();
  });

  it("prints a friendly message and skips prompting when no concepts are detected", async () => {
    const stubProvider: LlmProvider = {
      completeText: vi.fn(),
      completeJson: vi.fn().mockResolvedValue({ concepts: [] }),
    };
    const db = openDb(":memory:");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(stubProvider, db, "Codex output text", "ko");

    expect(mockedInput).not.toHaveBeenCalled();
    expect(mockedSelect).not.toHaveBeenCalled();
    expect(submittedEvents(db)).toHaveLength(0);

    logSpy.mockRestore();
  });

  it("calls select() with the detected concepts as choices and evaluates the concept the user picked", async () => {
    const stub = new MultiConceptStubProvider();
    const db = openDb(":memory:");
    const [first, second] = CONCEPT_DETECTION_FIXTURE_MULTI.concepts;
    mockedSelect.mockResolvedValue(second);
    mockedInput.mockResolvedValue("프록시 기반으로 AOP를 구현하기 때문입니다.");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(stub, db, "Codex output text", "ko");

    expect(mockedSelect).toHaveBeenCalledTimes(1);
    const selectCall = mockedSelect.mock.calls[0][0];
    expect(selectCall.choices).toEqual([
      { name: first.name, value: first },
      { name: second.name, value: second },
    ]);

    expect(stub.lastEvaluationPrompt).toContain(second.name);
    expect(stub.lastEvaluationPrompt).toContain(second.explainPrompt);
    expect(stub.lastEvaluationPrompt).not.toContain(first.explainPrompt);

    logSpy.mockRestore();
  });

  it("passes a validate function to input() that rejects empty answers", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    mockedInput.mockResolvedValue("real answer");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(provider, db, "Codex output text", "ko");

    const call = mockedInput.mock.calls[0]?.[0] as {
      validate?: (value: string) => boolean | string;
    };

    expect(call.validate?.("")).not.toBe(true);
    expect(call.validate?.("real answer")).toBe(true);
  });

  it("saves the evaluation as a new concept card and records concept_card_created", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    mockedInput.mockResolvedValue("같은 클래스 내부 호출은 프록시를 거치지 않는다.");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(provider, db, "Codex output text", "ko");

    const cards = allCards(db);
    expect(cards).toHaveLength(1);
    expect(cards[0].concept_name).toBe(CONCEPT_DETECTION_FIXTURE.concepts[0].name);

    const cardCreatedEvents = eventsNamed(db, "concept_card_created");
    expect(cardCreatedEvents).toHaveLength(1);
    expect((cardCreatedEvents[0] as { concept_id: string }).concept_id).toBe(
      cards[0].id,
    );

    const printed = logSpy.mock.calls.flat().join("\n");
    expect(printed).toContain(cards[0].id);

    expect(mockedConfirm).not.toHaveBeenCalled(); // no pre-existing card with this name

    logSpy.mockRestore();
  });

  it("asks to update via confirm() and updates the existing card in place when the conceptName already exists", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    const existing = createConceptCard(db, EXISTING_CARD_INPUT);
    mockedInput.mockResolvedValue("같은 클래스 내부 호출은 프록시를 거치지 않는다.");
    mockedConfirm.mockResolvedValue(true);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(provider, db, "Codex output text", "ko");

    expect(mockedConfirm).toHaveBeenCalledTimes(1);

    const cards = allCards(db);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(existing.id);

    const cardCreatedEvents = eventsNamed(db, "concept_card_created");
    expect((cardCreatedEvents[0] as { concept_id: string }).concept_id).toBe(
      existing.id,
    );
  });

  it("creates a separate new card when the user declines the update via confirm()", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    const existing = createConceptCard(db, EXISTING_CARD_INPUT);
    mockedInput.mockResolvedValue("같은 클래스 내부 호출은 프록시를 거치지 않는다.");
    mockedConfirm.mockResolvedValue(false);
    vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(provider, db, "Codex output text", "ko");

    const cards = allCards(db);
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.id)).toContain(existing.id);
  });
});
