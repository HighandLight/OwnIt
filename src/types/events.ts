export type LearningEvent = {
  id: string;
  eventName: string;
  conceptId?: string;
  sessionId: string;
  properties?: Record<string, unknown>;
  createdAt: string;
};

export type NewLearningEvent = Omit<LearningEvent, "id" | "createdAt">;
