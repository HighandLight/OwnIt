import type Database from "better-sqlite3";

const CREATE_CONCEPT_CARDS = `
CREATE TABLE IF NOT EXISTS concept_cards (
  id TEXT PRIMARY KEY,
  concept_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_summary TEXT,
  source_hash TEXT,

  user_explanation TEXT NOT NULL,
  corrected_explanation TEXT NOT NULL,

  status TEXT NOT NULL,
  first_explain_score INTEGER NOT NULL,
  latest_recall_score INTEGER,

  missing_points_json TEXT NOT NULL,
  misconceptions_json TEXT NOT NULL,
  review_questions_json TEXT NOT NULL,

  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_reviewed_at TEXT
);
`;

const CREATE_LEARNING_EVENTS = `
CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  concept_id TEXT,
  session_id TEXT NOT NULL,
  properties_json TEXT,
  created_at TEXT NOT NULL
);
`;

const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_concept_cards_status ON concept_cards(status);
CREATE INDEX IF NOT EXISTS idx_concept_cards_concept_name ON concept_cards(concept_name);
CREATE INDEX IF NOT EXISTS idx_learning_events_event_name ON learning_events(event_name);
CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON learning_events(created_at);
`;

export function applySchema(db: Database.Database): void {
  db.exec(CREATE_CONCEPT_CARDS);
  db.exec(CREATE_LEARNING_EVENTS);
  db.exec(CREATE_INDEXES);
}
