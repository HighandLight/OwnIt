#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { runCheck } from "./commands/check.js";
import { runInit } from "./commands/init.js";
import { runRecall } from "./commands/recall.js";
import { OpenAiProvider } from "../llm/openai-provider.js";
import { openDb } from "../storage/db.js";
import { readConfig } from "../storage/config.js";
import type { Language } from "../types/config.js";

const DEFAULT_LANGUAGE: Language = "ko";

function resolveLanguage(): Language {
  return readConfig()?.language ?? DEFAULT_LANGUAGE;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("ownit")
    .description("Turn Codex answers into your own knowledge.")
    .version("0.1.0");

  program
    .command("init")
    .description("Initialize local DB and config in ~/.ownit")
    .action(async () => {
      await runInit();
    });

  program
    .command("check")
    .description("Run an Explain Check on a Codex answer")
    .option("--text <text>", "직접 텍스트 입력")
    .action(async (options: { text?: string }) => {
      if (!options.text) {
        console.error('사용법: ownit check --text "..."');
        process.exitCode = 1;
        return;
      }

      const db = openDb();
      try {
        await runCheck(
          new OpenAiProvider(),
          db,
          options.text,
          resolveLanguage(),
        );
      } finally {
        db.close();
      }
    });

  program
    .command("recall")
    .description("Run a Recall Check on a saved Concept Card")
    .action(async () => {
      const db = openDb();
      try {
        await runRecall(new OpenAiProvider(), db, resolveLanguage());
      } finally {
        db.close();
      }
    });

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createProgram().parse(process.argv);
}
