import OpenAI from "openai";
import type { LlmProvider } from "./provider.js";

const DEFAULT_MODEL = "gpt-4.1-mini";

const CODE_FENCE = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

export function parseJsonResponse<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(CODE_FENCE);
  return JSON.parse(fenced ? fenced[1] : trimmed) as T;
}

export class OpenAiProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(model: string = process.env.OWNIT_MODEL ?? DEFAULT_MODEL) {
    this.client = new OpenAI();
    this.model = model;
  }

  async completeText(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async completeJson<T>(prompt: string, schemaName: string): Promise<T> {
    const raw = await this.requestJson(prompt);

    try {
      return parseJsonResponse<T>(raw);
    } catch {
      const retryRaw = await this.requestJson(prompt);
      try {
        return parseJsonResponse<T>(retryRaw);
      } catch (error) {
        throw new Error(
          `Failed to parse JSON response for schema "${schemaName}": ${(error as Error).message}`,
        );
      }
    }
  }

  private async requestJson(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content ?? "{}";
  }
}
