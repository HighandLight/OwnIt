#!/usr/bin/env node
import { Command } from "commander";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("ownit")
    .description("Turn Codex answers into your own knowledge.")
    .version("0.1.0");

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createProgram().parse(process.argv);
}
