import { describe, expect, it } from "vitest";
import { operationalCommands } from "./operational.js";

describe("operational command registration", () => {
  it("exposes doctor and status through the shared CLI registration", () => {
    expect(operationalCommands.map((command) => command.command)).toEqual(["doctor", "status"]);
  });
});
