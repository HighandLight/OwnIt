import { describe, expect, it } from "vitest";
import { redact } from "../src/core/redaction.js";

describe("redact", () => {
  it("masks a Bearer token", () => {
    const input = "Authorization: Bearer abcdefg123456";

    expect(redact(input)).toBe("Authorization: Bearer [REDACTED]");
  });

  it("masks a DB connection string", () => {
    const input = "DATABASE_URL=postgres://user:pass@localhost:5432/app";

    expect(redact(input)).toBe("DATABASE_URL=[REDACTED]");
  });

  it("masks a .env style key=value", () => {
    const input = "API_KEY=sk-xxxxx";

    expect(redact(input)).toBe("API_KEY=[REDACTED]");
  });

  it("masks a JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const input = `token seen in logs: ${jwt}`;

    expect(redact(input)).toBe("token seen in logs: [REDACTED]");
  });

  it("masks an OpenAI-style API key", () => {
    const input = "API key: sk-proj-abcdefghijklmnopqrstuvwxyz1234567890";

    expect(redact(input)).toBe("API key: [REDACTED]");
  });

  it("masks a GitHub-style token", () => {
    const input =
      "found token ghp_abcdefghijklmnopqrstuvwxyz1234567890 in the logs";

    expect(redact(input)).toBe("found token [REDACTED] in the logs");
  });

  it("masks an AWS-style access key", () => {
    const input = "leaked credential: AKIAIOSFODNN7EXAMPLE";

    expect(redact(input)).toBe("leaked credential: [REDACTED]");
  });

  it.each(["password", "secret", "token"])(
    "masks a key=value pair whose key contains '%s'",
    (keyword) => {
      const input = `my_${keyword}=hunter2`;

      expect(redact(input)).toBe(`my_${keyword}=[REDACTED]`);
    },
  );
});
