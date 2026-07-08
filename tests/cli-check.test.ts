import { beforeEach, describe, expect, it, vi } from "vitest";
import { input, select } from "@inquirer/prompts";
import type Database from "better-sqlite3";
import { SCHEMA_NAMES, type LlmProvider } from "../src/llm/provider.js";
import { openDb } from "../src/storage/db.js";
import { runCheck } from "../src/cli/commands/check.js";
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
}));

const mockedInput = vi.mocked(input);
const mockedSelect = vi.mocked(select);

function submittedEvents(db: Database.Database) {
  return db
    .prepare("SELECT * FROM learning_events WHERE event_name = ?")
    .all("explain_check_submitted");
}

describe("runCheck", () => {
  beforeEach(() => {
    mockedInput.mockReset();
    mockedSelect.mockReset();
  });

  it("asks the explain-check question, evaluates the mocked answer, prints the result, and records explain_check_submitted", async () => {
    const provider = new MockLlmProvider();
    const db = openDb(":memory:");
    mockedInput.mockResolvedValue("같은 클래스 내부 호출은 프록시를 거치지 않는다.");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCheck(provider, db, "Codex output text");

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

    await runCheck(stubProvider, db, "Codex output text");

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

    await runCheck(stub, db, "Codex output text");

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

    await runCheck(provider, db, "Codex output text");

    const call = mockedInput.mock.calls[0]?.[0] as {
      validate?: (value: string) => boolean | string;
    };

    expect(call.validate?.("")).not.toBe(true);
    expect(call.validate?.("real answer")).toBe(true);
  });
});
