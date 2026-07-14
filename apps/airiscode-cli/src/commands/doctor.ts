import type { Argv, CommandModule } from "yargs";
import { loadRepositoryProfile } from "../services/repositoryProfile.js";

export const doctorCommand: CommandModule = {
  command: "doctor",
  describe: "Validate the repository's AIris OS profile",
  builder: (yargs: Argv) =>
    yargs
      .option("profile", {
        type: "string",
        default: ".airis/airis.yml",
        describe: "Path to the AIris OS repository profile",
      })
      .option("json", { type: "boolean", default: false, describe: "Print machine-readable JSON" }),
  handler: async (argv) => {
    const result = await loadRepositoryProfile(String(argv["profile"]));
    if (argv["json"]) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else if (result.ok) process.stdout.write(`AIris OS profile: OK (${result.path})\n`);
    else {
      process.stdout.write(`AIris OS profile: INVALID (${result.path})\n`);
      for (const error of result.errors) process.stdout.write(`- ${error}\n`);
    }
    if (!result.ok) process.exitCode = 1;
  },
};
