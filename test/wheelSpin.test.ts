import { describe, expect, it } from "vitest";
import { shouldStartSpin } from "../src/client/components/wheelSpin";

describe("shouldStartSpin", () => {
  it("ignores the initial token so mount / StrictMode remount does not auto-spin", () => {
    expect(shouldStartSpin(0, 0, 8)).toBe(false);
  });

  it("starts when the parent bumps the token", () => {
    expect(shouldStartSpin(1, 0, 8)).toBe(true);
    expect(shouldStartSpin(2, 1, 8)).toBe(true);
  });

  it("does nothing when the token has not changed", () => {
    expect(shouldStartSpin(1, 1, 8)).toBe(false);
  });

  it("does not start an empty wheel", () => {
    expect(shouldStartSpin(1, 0, 0)).toBe(false);
  });

  it("still starts a second token even though a spin is already in progress", () => {
    // The first effect's cleanup has already cleared that spin's timer.
    // Skipping here is what used to leave SPIN stuck on double-click.
    const alreadySpinning = true;
    expect(alreadySpinning && shouldStartSpin(2, 1, 6)).toBe(true);
  });
});
