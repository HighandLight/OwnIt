export interface LlmProvider {
  completeText(prompt: string): Promise<string>;
  completeJson<T>(prompt: string, schemaName: string): Promise<T>;
}

export const SCHEMA_NAMES = {
  conceptDetection: "concept-detection",
  explainEvaluation: "explain-evaluation",
} as const;
