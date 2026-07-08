import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { OwnItConfig } from "../types/config.js";
import { OWNIT_DIR } from "./db.js";

export function readConfig(
  ownitDir: string = OWNIT_DIR,
): OwnItConfig | undefined {
  const configPath = join(ownitDir, "config.json");
  if (!existsSync(configPath)) {
    return undefined;
  }

  return JSON.parse(readFileSync(configPath, "utf-8")) as OwnItConfig;
}

export function writeConfig(ownitDir: string, config: OwnItConfig): void {
  const configPath = join(ownitDir, "config.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}
