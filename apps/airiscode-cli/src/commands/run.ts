import type { Argv, CommandModule } from "yargs";
import { appendRunEvent, listRunEvents, rebuildRunStatus } from "../services/runStore.js";

const runIdOption = { type: "string" as const, demandOption: true, describe: "Run identifier" };

const emitCommand: CommandModule = {
  command: "emit",
  describe: "Append a safe local AIris OS run event",
  builder: (yargs: Argv) =>
    yargs
      .option("run-id", runIdOption)
      .option("state", { type: "string", demandOption: true })
      .option("repository", { type: "string", demandOption: true })
      .option("idempotency-key", { type: "string", demandOption: true })
      .option("occurred-at", { type: "string" })
      .option("issue", { type: "string" })
      .option("attention", { type: "string", default: "none" })
      .option("message", { type: "string" }),
  handler: async (argv) => {
    const result = await appendRunEvent({
      runId: String(argv["run-id"]),
      state: argv["state"] as never,
      repository: String(argv.repository),
      idempotencyKey: String(argv["idempotency-key"]),
      occurredAt: String(argv["occurred-at"] ?? new Date().toISOString()),
      issue: argv.issue as string | undefined,
      attention: argv.attention as never,
      message: argv.message as string | undefined,
    });
    await rebuildRunStatus({}, String(argv["run-id"]));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  },
};

const statusCommand: CommandModule = {
  command: "status",
  describe: "Replay events and emit the current machine-readable status",
  builder: (yargs: Argv) => yargs.option("run-id", { ...runIdOption, demandOption: false }),
  handler: async (argv) => {
    const status = await rebuildRunStatus({}, argv["run-id"] as string | undefined);
    process.stdout.write(`${JSON.stringify(status)}\n`);
    if (!status) process.exitCode = 1;
  },
};

const eventsCommand: CommandModule = {
  command: "events",
  describe: "List validated local run events",
  builder: (yargs: Argv) => yargs.option("run-id", { type: "string" }),
  handler: async (argv) => {
    process.stdout.write(
      `${JSON.stringify(await listRunEvents({}, argv["run-id"] as string | undefined))}\n`,
    );
  },
};

export const runCommands: readonly CommandModule[] = [emitCommand, statusCommand, eventsCommand];

export const runCommand: CommandModule = {
  command: "run",
  describe: "Inspect and update the local AIris OS run store",
  builder: (yargs: Argv) =>
    runCommands.reduce((parser, command) => parser.command(command), yargs).demandCommand(1),
  handler: () => undefined,
};
