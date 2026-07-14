import { describe, expect, it } from "vitest";
import yargs from "yargs/yargs";
import { runCommand, runCommands } from "./run.js";

describe("run command registration", () => {
  it("exposes event, status, and events subcommands", () => {
    expect(runCommand.command).toBe("run");
    expect(runCommands.map((command) => command.command)).toEqual(["emit", "status", "events"]);
  });

  it("parses the nested events command through yargs", async () => {
    await yargs([]).exitProcess(false).command(runCommand).parseAsync(["run", "events"]);
  });
});
