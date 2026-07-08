import { beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "../src/storage/db.js";
import {
  createConceptCard,
  getConceptCardByConceptName,
  getConceptCardById,
  selectNextReviewCard,
  updateConceptCard,
} from "../src/storage/concept-card-repository.js";
import type {
  ConceptCardStatus,
  NewConceptCard,
} from "../src/types/concept-card.js";

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

  describe("selectNextReviewCard", () => {
    function seedCard(
      db: Database.Database,
      conceptName: string,
      status: ConceptCardStatus,
    ) {
      return createConceptCard(db, {
        ...newCard,
        conceptName,
        status,
      });
    }

    function setLastReviewedAt(
      db: Database.Database,
      id: string,
      isoDate: string,
    ) {
      db.prepare(
        "UPDATE concept_cards SET last_reviewed_at = ? WHERE id = ?",
      ).run(isoDate, id);
    }

    function setCreatedAt(db: Database.Database, id: string, isoDate: string) {
      db.prepare("UPDATE concept_cards SET created_at = ? WHERE id = ?").run(
        isoDate,
        id,
      );
    }

    it("returns undefined when there are no concept cards", () => {
      expect(selectNextReviewCard(db)).toBeUndefined();
    });

    it("prefers a needs_review card over unclear and passed cards", () => {
      seedCard(db, "unclear concept", "unclear");
      const needsReview = seedCard(db, "needs_review concept", "needs_review");
      const passed = seedCard(db, "passed concept", "passed");
      setLastReviewedAt(db, passed.id, "2026-01-01T00:00:00.000Z");

      expect(selectNextReviewCard(db)?.id).toBe(needsReview.id);
    });

    it("falls back to an unclear card when there is no needs_review card", () => {
      const unclear = seedCard(db, "unclear concept", "unclear");
      const passed = seedCard(db, "passed concept", "passed");
      setLastReviewedAt(db, passed.id, "2026-01-01T00:00:00.000Z");

      expect(selectNextReviewCard(db)?.id).toBe(unclear.id);
    });

    it("falls back to the oldest-reviewed passed card when there is no needs_review or unclear card", () => {
      const olderReview = seedCard(db, "older review", "passed");
      setLastReviewedAt(db, olderReview.id, "2026-01-01T00:00:00.000Z");
      const newerReview = seedCard(db, "newer review", "passed");
      setLastReviewedAt(db, newerReview.id, "2026-06-01T00:00:00.000Z");

      expect(selectNextReviewCard(db)?.id).toBe(olderReview.id);
    });

    it("falls back to the most recently created unreviewed passed card when nothing else qualifies", () => {
      const older = seedCard(db, "older unreviewed", "passed");
      setCreatedAt(db, older.id, "2026-01-01T00:00:00.000Z");
      const newer = seedCard(db, "newer unreviewed", "passed");
      setCreatedAt(db, newer.id, "2026-06-01T00:00:00.000Z");

      expect(selectNextReviewCard(db)?.id).toBe(newer.id);
    });

    it("picks needs_review over everything when all four groups are present", () => {
      const needsReview = seedCard(db, "needs_review concept", "needs_review");
      seedCard(db, "unclear concept", "unclear");
      const reviewedPassed = seedCard(db, "reviewed passed", "passed");
      setLastReviewedAt(db, reviewedPassed.id, "2026-01-01T00:00:00.000Z");
      seedCard(db, "unreviewed passed", "passed");

      expect(selectNextReviewCard(db)?.id).toBe(needsReview.id);
    });
  });
});
