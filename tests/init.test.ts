import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "../src/cli/commands/init.js";

describe("ownit init", () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("creates the ownit directory, db file, and config file", () => {
    tempDir = mkdtempSync(join(tmpdir(), "ownit-init-"));
    const ownitDir = join(tempDir, ".ownit");

    runInit(ownitDir);

    expect(existsSync(ownitDir)).toBe(true);
    expect(existsSync(join(ownitDir, "ownit.db"))).toBe(true);
    expect(existsSync(join(ownitDir, "config.json"))).toBe(true);
  });
});
