import { describe, expect, it, vi } from "vitest";
import { CUVIQ_VIEWER_TAG, defineCuviqViewer } from "../../src/define";

describe("custom-element registration", () => {
  it("is idempotent", () => {
    const registry = { get: vi.fn(), define: vi.fn() } as unknown as CustomElementRegistry;
    defineCuviqViewer(registry);
    expect(registry.define).toHaveBeenCalledTimes(1);
    (registry.get as ReturnType<typeof vi.fn>).mockReturnValue(class {});
    defineCuviqViewer(registry);
    expect(registry.define).toHaveBeenCalledTimes(1);
    expect(CUVIQ_VIEWER_TAG).toBe("cuviq-viewer");
  });
});
