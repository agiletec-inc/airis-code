import type { Argv, CommandModule } from "yargs";
import { loadRunStatus } from "../services/runStatus.js";

export async function runStatus(path: string): Promise<number> {
  const result = await loadRunStatus(path);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.ok ? 0 : 1;
}

export const statusCommand: CommandModule = {
  command: "status",
  describe: "Read the local AIris OS run status for CLI and menu-bar clients",
  builder: (yargs: Argv) =>
    yargs
      .option("file", { type: "string", default: ".airis/status.json" })
      .option("json", { type: "boolean", default: false }),
  handler: async (argv) => {
    process.exitCode = await runStatus(String(argv["file"]));
  },
};
