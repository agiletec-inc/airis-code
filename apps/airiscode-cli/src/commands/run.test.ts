import { describe, expect, it } from "vitest";
import { runCommand, runCommands } from "./run.js";

describe("run command registration", () => {
  it("exposes event, status, and events subcommands", () => {
    expect(runCommand.command).toBe("run");
    expect(runCommands.map((command) => command.command)).toEqual(["emit", "status", "events"]);
  });
});
