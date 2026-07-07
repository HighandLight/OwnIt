import { beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "../src/storage/db.js";
import { createEvent, getEventById } from "../src/storage/event-repository.js";
import type { NewLearningEvent } from "../src/types/events.js";

const newEvent: NewLearningEvent = {
  eventName: "checkpoint_offered",
  sessionId: "session-1",
  conceptId: "concept-1",
  properties: { source: "codex" },
};

describe("event-repository", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb(":memory:");
  });

  it("creates an event and returns it with a generated id and timestamp", () => {
    const created = createEvent(db, newEvent);

    expect(created.id).toBeTruthy();
    expect(created.eventName).toBe("checkpoint_offered");
    expect(created.createdAt).toBeTruthy();
  });

  it("reads back a created event by id", () => {
    const created = createEvent(db, newEvent);

    const found = getEventById(db, created.id);

    expect(found).toEqual(created);
  });

  it("returns undefined for an unknown id", () => {
    expect(getEventById(db, "does-not-exist")).toBeUndefined();
  });
});
