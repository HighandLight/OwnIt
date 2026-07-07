import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OWNIT_DIR, openDb } from "../../storage/db.js";

export function runInit(ownitDir: string = OWNIT_DIR): void {
  mkdirSync(ownitDir, { recursive: true });

  const db = openDb(join(ownitDir, "ownit.db"));
  db.close();

  const configPath = join(ownitDir, "config.json");
  if (!existsSync(configPath)) {
    writeFileSync(configPath, `${JSON.stringify({}, null, 2)}\n`);
  }

  console.log(`Initialized OwnIt at ${ownitDir}`);
}
