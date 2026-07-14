import type { Writable } from "node:stream";
import type { Argv, CommandModule } from "yargs";
import { loadRepositoryProfile } from "../services/repositoryProfile.js";

export async function runDoctor(
  profilePath: string,
  json: boolean,
  output: Writable = process.stdout,
): Promise<number> {
  const result = await loadRepositoryProfile(profilePath);
  if (json) output.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (result.ok) output.write(`AIris OS profile: OK (${result.path})\n`);
  else {
    output.write(`AIris OS profile: INVALID (${result.path})\n`);
    for (const error of result.errors) output.write(`- ${error}\n`);
  }
  return result.ok ? 0 : 1;
}

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
    process.exitCode = await runDoctor(String(argv["profile"]), Boolean(argv["json"]));
  },
};
