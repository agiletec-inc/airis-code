import type { Argv, CommandModule } from "yargs";
import { loadRunStatus } from "../services/runStatus.js";

export const statusCommand: CommandModule = {
  command: "status",
  describe: "Read the local AIris OS run status for CLI and menu-bar clients",
  builder: (yargs: Argv) =>
    yargs
      .option("file", { type: "string", default: ".airis/status.json" })
      .option("json", { type: "boolean", default: false }),
  handler: async (argv) => {
    const result = await loadRunStatus(String(argv["file"]));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  },
};
