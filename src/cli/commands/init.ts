import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import { OWNIT_DIR, openDb } from "../../storage/db.js";
import { readConfig, writeConfig } from "../../storage/config.js";
import type { Language } from "../../types/config.js";

export async function runInit(ownitDir: string = OWNIT_DIR): Promise<void> {
  mkdirSync(ownitDir, { recursive: true });

  const db = openDb(join(ownitDir, "ownit.db"));
  db.close();

  const existingConfig = readConfig(ownitDir);
  if (existingConfig) {
    console.log(
      `이미 초기화되어 있습니다. (language: ${existingConfig.language})`,
    );
    return;
  }

  const language = await select<Language>({
    message: "Concept Card와 질문에 사용할 언어를 선택하세요",
    choices: [
      { name: "한국어", value: "ko" },
      { name: "English", value: "en" },
    ],
  });

  writeConfig(ownitDir, { language });

  console.log(`Initialized OwnIt at ${ownitDir}`);
}
