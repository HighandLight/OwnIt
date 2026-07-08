import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "../src/llm/openai-provider.js";

describe("parseJsonResponse", () => {
  it("parses plain JSON with no code fence", () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips a ```json code fence before parsing", () => {
    const raw = '```json\n{"a":1}\n```';

    expect(parseJsonResponse(raw)).toEqual({ a: 1 });
  });

  it("strips a plain ``` code fence (no language tag) before parsing", () => {
    const raw = '```\n{"a":1}\n```';

    expect(parseJsonResponse(raw)).toEqual({ a: 1 });
  });

  it("trims surrounding whitespace around a fenced response", () => {
    const raw = '  \n```json\n{"a":1}\n```\n  ';

    expect(parseJsonResponse(raw)).toEqual({ a: 1 });
  });
});
