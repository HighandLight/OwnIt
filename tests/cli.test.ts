import { describe, expect, it } from "vitest";
import { createProgram } from "../src/cli/index.js";

describe("ownit CLI", () => {
  it("shows name and description in --help output", () => {
    const program = createProgram();
    const help = program.helpInformation();

    expect(program.name()).toBe("ownit");
    expect(help).toContain("ownit");
    expect(help).toContain("Turn Codex answers into your own knowledge.");
  });
});
