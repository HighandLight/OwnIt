#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("ownit")
    .description("Turn Codex answers into your own knowledge.")
    .version("0.1.0");

  program
    .command("init")
    .description("Initialize local DB and config in ~/.ownit")
    .action(() => {
      runInit();
    });

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createProgram().parse(process.argv);
}
