import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig, writeConfig } from "../src/storage/config.js";

describe("config storage", () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("returns undefined when config.json does not exist", () => {
    tempDir = mkdtempSync(join(tmpdir(), "ownit-config-"));

    expect(readConfig(tempDir)).toBeUndefined();
  });

  it("writes config.json and reads it back", () => {
    tempDir = mkdtempSync(join(tmpdir(), "ownit-config-"));

    writeConfig(tempDir, { language: "en" });

    expect(readConfig(tempDir)).toEqual({ language: "en" });
  });
});
