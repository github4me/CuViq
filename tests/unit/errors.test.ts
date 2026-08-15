import { describe, expect, it } from "vitest";
import { normalizeLoadError } from "../../src/errors";

describe("public error normalization", () => {
  it.each([
    ["DRACOLoader instance is required", "DECODER_REQUIRED"],
    ["Fetch responded with 404 Not Found", "RESOURCE_MISSING"],
    ["Blocked by CORS policy", "CORS_ERROR"],
    ["TypeError: Failed to fetch", "CORS_ERROR"],
    ["Unexpected token in JSON", "LOAD_FAILED"],
  ])("maps %s to %s", (message, code) => {
    expect(normalizeLoadError(new Error(message), "/model.glb").code).toBe(code);
  });
});
