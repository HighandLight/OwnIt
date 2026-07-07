export type ConceptSourceType =
  | "error_fix"
  | "concept_explanation"
  | "code_review"
  | "manual";

export type ConceptCardStatus = "passed" | "needs_review" | "unclear";

export type ConceptCard = {
  id: string;
  conceptName: string;
  sourceType: ConceptSourceType;
  sourceSummary?: string;
  sourceHash?: string;

  userExplanation: string;
  correctedExplanation: string;

  status: ConceptCardStatus;

  firstExplainScore: number;
  latestRecallScore?: number;

  missingPoints: string[];
  misconceptions: string[];
  reviewQuestions: string[];

  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
};

export type NewConceptCard = Omit<
  ConceptCard,
  "id" | "reviewCount" | "createdAt" | "updatedAt" | "lastReviewedAt"
>;
