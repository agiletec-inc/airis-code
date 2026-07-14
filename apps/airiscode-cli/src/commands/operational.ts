import type { Argv, CommandModule } from "yargs";
import { doctorCommand } from "./doctor.js";
import { statusCommand } from "./status.js";

export const operationalCommands: readonly CommandModule[] = [doctorCommand, statusCommand];

export function registerOperationalCommands(yargs: Argv): Argv {
  return operationalCommands.reduce((parser, command) => parser.command(command), yargs);
}
