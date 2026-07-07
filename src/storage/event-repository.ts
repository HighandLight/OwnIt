import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { LearningEvent, NewLearningEvent } from "../types/events.js";

type LearningEventRow = {
  id: string;
  event_name: string;
  concept_id: string | null;
  session_id: string;
  properties_json: string | null;
  created_at: string;
};

function rowToLearningEvent(row: LearningEventRow): LearningEvent {
  return {
    id: row.id,
    eventName: row.event_name,
    conceptId: row.concept_id ?? undefined,
    sessionId: row.session_id,
    properties: row.properties_json
      ? JSON.parse(row.properties_json)
      : undefined,
    createdAt: row.created_at,
  };
}

export function createEvent(
  db: Database.Database,
  input: NewLearningEvent,
): LearningEvent {
  const event: LearningEvent = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO learning_events (id, event_name, concept_id, session_id, properties_json, created_at)
     VALUES (@id, @eventName, @conceptId, @sessionId, @propertiesJson, @createdAt)`,
  ).run({
    id: event.id,
    eventName: event.eventName,
    conceptId: event.conceptId ?? null,
    sessionId: event.sessionId,
    propertiesJson: event.properties ? JSON.stringify(event.properties) : null,
    createdAt: event.createdAt,
  });

  return event;
}

export function getEventById(
  db: Database.Database,
  id: string,
): LearningEvent | undefined {
  const row = db
    .prepare(`SELECT * FROM learning_events WHERE id = ?`)
    .get(id) as LearningEventRow | undefined;

  return row ? rowToLearningEvent(row) : undefined;
}
