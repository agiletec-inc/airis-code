import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { runDoctor } from "./doctor.js";

describe("doctor command", () => {
  it("returns a non-zero exit code for a missing profile", async () => {
    const output = new PassThrough();
    const result = await runDoctor("/tmp/airis-profile-does-not-exist.yml", true, output);
    expect(result).toBe(1);
  });
});
