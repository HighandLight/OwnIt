import { beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "../src/storage/db.js";
import {
  createConceptCard,
  getConceptCardByConceptName,
  getConceptCardById,
  updateConceptCard,
} from "../src/storage/concept-card-repository.js";
import type { NewConceptCard } from "../src/types/concept-card.js";

const newCard: NewConceptCard = {
  conceptName: "Spring @Transactional self-invocation",
  sourceType: "error_fix",
  sourceSummary: "same-class method call skips the proxy",
  userExplanation: "같은 클래스 내부에서 호출하면 프록시를 거치지 않는다.",
  correctedExplanation:
    "같은 클래스 내부에서 메서드를 직접 호출하면 Spring 프록시를 거치지 않기 때문에 @Transactional이 적용되지 않을 수 있다.",
  status: "needs_review",
  firstExplainScore: 3,
  missingPoints: ["self-invocation 용어 언급 부족"],
  misconceptions: [],
  reviewQuestions: ["왜 self-invocation에서는 @Transactional이 동작하지 않나요?"],
};

describe("concept-card-repository", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(":memory:");
  });

  it("creates a concept card and returns it with generated id and timestamps", () => {
    const created = createConceptCard(db, newCard);

    expect(created.id).toBeTruthy();
    expect(created.conceptName).toBe(newCard.conceptName);
    expect(created.reviewCount).toBe(0);
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBe(created.createdAt);
  });

  it("reads back a created concept card by id", () => {
    const created = createConceptCard(db, newCard);

    const found = getConceptCardById(db, created.id);

    expect(found).toEqual(created);
  });

  it("returns undefined for an unknown id", () => {
    expect(getConceptCardById(db, "does-not-exist")).toBeUndefined();
  });

  it("finds a concept card by its exact conceptName", () => {
    const created = createConceptCard(db, newCard);

    const found = getConceptCardByConceptName(db, newCard.conceptName);

    expect(found).toEqual(created);
  });

  it("returns undefined from getConceptCardByConceptName when no card matches", () => {
    expect(getConceptCardByConceptName(db, "no such concept")).toBeUndefined();
  });

  it("updates an existing concept card's content and bumps updatedAt", () => {
    const created = createConceptCard(db, newCard);

    const updatedInput: NewConceptCard = {
      ...newCard,
      status: "passed",
      firstExplainScore: 5,
      missingPoints: [],
    };

    const updated = updateConceptCard(db, created.id, updatedInput);

    expect(updated.id).toBe(created.id);
    expect(updated.status).toBe("passed");
    expect(updated.firstExplainScore).toBe(5);
    expect(updated.missingPoints).toEqual([]);
    expect(updated.createdAt).toBe(created.createdAt);

    const reloaded = getConceptCardById(db, created.id);
    expect(reloaded).toEqual(updated);
  });
});
