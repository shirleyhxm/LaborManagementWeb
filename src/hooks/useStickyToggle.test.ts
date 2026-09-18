import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { readStickyToggle, writeStickyToggle } from "./useStickyToggle";

/**
 * The hook itself is a thin wrapper around these two, which hold everything worth testing:
 * what a fresh mount reads back, and what survives storage misbehaving. Tested directly
 * rather than through a renderer, so this needs no React testing dependency the project
 * does not already carry.
 */
describe("sticky toggle storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the default when nothing is stored", () => {
    expect(readStickyToggle("panel", false)).toBe(false);
    expect(readStickyToggle("panel", true)).toBe(true);
  });

  // The regression this exists for: the value has to outlive the component, because
  // switching tabs unmounts it and a remount must not silently undo the user's choice.
  it("reads back what was written, which is what a remount does", () => {
    writeStickyToggle("panel", true);
    expect(readStickyToggle("panel", false)).toBe(true);

    writeStickyToggle("panel", false);
    expect(readStickyToggle("panel", true)).toBe(false);
  });

  it("keeps separate keys apart", () => {
    writeStickyToggle("a", true);
    expect(readStickyToggle("b", false)).toBe(false);
  });

  it("namespaces its keys, so it cannot collide with auth or business state", () => {
    writeStickyToggle("panel", true);
    expect(window.localStorage.getItem("panel")).toBeNull();
    expect(window.localStorage.getItem("ui:panel")).toBe("true");
  });

  it("does not throw when writing is unavailable", () => {
    // Private browsing throws on write in some browsers. Losing the preference is
    // acceptable; breaking the button is not.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writeStickyToggle("panel", true)).not.toThrow();
  });

  it("falls back to the default when reading throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(readStickyToggle("panel", true)).toBe(true);
  });
});
