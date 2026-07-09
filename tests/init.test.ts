import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import { runInit } from "../src/cli/commands/init.js";

vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(),
}));

const mockedSelect = vi.mocked(select);

describe("ownit init", () => {
  let tempDir: string | undefined;

  beforeEach(() => {
    mockedSelect.mockReset();
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("creates the ownit directory, db file, and config file with the chosen language", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "ownit-init-"));
    const ownitDir = join(tempDir, ".ownit");
    mockedSelect.mockResolvedValue("ko");

    await runInit(ownitDir);

    expect(existsSync(ownitDir)).toBe(true);
    expect(existsSync(join(ownitDir, "ownit.db"))).toBe(true);
    const configPath = join(ownitDir, "config.json");
    expect(existsSync(configPath)).toBe(true);
    expect(JSON.parse(readFileSync(configPath, "utf-8"))).toEqual({
      language: "ko",
    });
  });

  it("asks the user to choose between Korean and English", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "ownit-init-"));
    const ownitDir = join(tempDir, ".ownit");
    mockedSelect.mockResolvedValue("en");

    await runInit(ownitDir);

    expect(mockedSelect).toHaveBeenCalledTimes(1);
    const call = mockedSelect.mock.calls[0][0];
    expect(call.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "ko" }),
        expect.objectContaining({ value: "en" }),
      ]),
    );
  });

  it("skips the language prompt and does not overwrite config.json when already initialized", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "ownit-init-"));
    const ownitDir = join(tempDir, ".ownit");
    mockedSelect.mockResolvedValue("ko");
    await runInit(ownitDir);
    mockedSelect.mockReset();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runInit(ownitDir);

    expect(mockedSelect).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.flat().join("\n")).toContain(
      "이미 초기화되어 있습니다",
    );
    const configPath = join(ownitDir, "config.json");
    expect(JSON.parse(readFileSync(configPath, "utf-8"))).toEqual({
      language: "ko",
    });

    logSpy.mockRestore();
  });

  it("skips the language prompt when a preset language is given", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "ownit-init-"));
    const ownitDir = join(tempDir, ".ownit");

    await runInit(ownitDir, "en");

    expect(mockedSelect).not.toHaveBeenCalled();
    const configPath = join(ownitDir, "config.json");
    expect(JSON.parse(readFileSync(configPath, "utf-8"))).toEqual({
      language: "en",
    });
  });
});
