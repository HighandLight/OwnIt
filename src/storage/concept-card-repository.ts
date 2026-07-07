import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { ConceptCard, NewConceptCard } from "../types/concept-card.js";

type ConceptCardRow = {
  id: string;
  concept_name: string;
  source_type: ConceptCard["sourceType"];
  source_summary: string | null;
  source_hash: string | null;
  user_explanation: string;
  corrected_explanation: string;
  status: ConceptCard["status"];
  first_explain_score: number;
  latest_recall_score: number | null;
  missing_points_json: string;
  misconceptions_json: string;
  review_questions_json: string;
  review_count: number;
  created_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
};

function rowToConceptCard(row: ConceptCardRow): ConceptCard {
  return {
    id: row.id,
    conceptName: row.concept_name,
    sourceType: row.source_type,
    sourceSummary: row.source_summary ?? undefined,
    sourceHash: row.source_hash ?? undefined,
    userExplanation: row.user_explanation,
    correctedExplanation: row.corrected_explanation,
    status: row.status,
    firstExplainScore: row.first_explain_score,
    latestRecallScore: row.latest_recall_score ?? undefined,
    missingPoints: JSON.parse(row.missing_points_json),
    misconceptions: JSON.parse(row.misconceptions_json),
    reviewQuestions: JSON.parse(row.review_questions_json),
    reviewCount: row.review_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
  };
}

export function createConceptCard(
  db: Database.Database,
  input: NewConceptCard,
): ConceptCard {
  const now = new Date().toISOString();
  const card: ConceptCard = {
    ...input,
    id: randomUUID(),
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO concept_cards (
      id, concept_name, source_type, source_summary, source_hash,
      user_explanation, corrected_explanation,
      status, first_explain_score, latest_recall_score,
      missing_points_json, misconceptions_json, review_questions_json,
      review_count, created_at, updated_at, last_reviewed_at
    ) VALUES (
      @id, @conceptName, @sourceType, @sourceSummary, @sourceHash,
      @userExplanation, @correctedExplanation,
      @status, @firstExplainScore, @latestRecallScore,
      @missingPointsJson, @misconceptionsJson, @reviewQuestionsJson,
      @reviewCount, @createdAt, @updatedAt, @lastReviewedAt
    )`,
  ).run({
    id: card.id,
    conceptName: card.conceptName,
    sourceType: card.sourceType,
    sourceSummary: card.sourceSummary ?? null,
    sourceHash: card.sourceHash ?? null,
    userExplanation: card.userExplanation,
    correctedExplanation: card.correctedExplanation,
    status: card.status,
    firstExplainScore: card.firstExplainScore,
    latestRecallScore: card.latestRecallScore ?? null,
    missingPointsJson: JSON.stringify(card.missingPoints),
    misconceptionsJson: JSON.stringify(card.misconceptions),
    reviewQuestionsJson: JSON.stringify(card.reviewQuestions),
    reviewCount: card.reviewCount,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    lastReviewedAt: card.lastReviewedAt ?? null,
  });

  return card;
}

export function getConceptCardById(
  db: Database.Database,
  id: string,
): ConceptCard | undefined {
  const row = db
    .prepare(`SELECT * FROM concept_cards WHERE id = ?`)
    .get(id) as ConceptCardRow | undefined;

  return row ? rowToConceptCard(row) : undefined;
}
