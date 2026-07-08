export type EvaluationStatus = "passed" | "needs_review" | "unclear";

export type ExplainEvaluation = {
  score: number;
  status: EvaluationStatus;
  correctParts: string[];
  missingPoints: string[];
  misconceptions: string[];
  correctedExplanation: string;
  reviewQuestions: string[];
};
