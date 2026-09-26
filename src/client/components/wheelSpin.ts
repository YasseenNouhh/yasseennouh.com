/**
 * Whether a spinToken change should schedule a landing.
 *
 * Do not fold an in-progress `spinning` flag into this. React runs the
 * previous effect's cleanup first, which clears that spin's landing timer.
 * Returning early because the wheel is still visually spinning drops
 * onLanded and leaves the parent stuck on SPINNING… — a double-click on
 * SPIN is enough to trigger it.
 */
export function shouldStartSpin(spinToken: number, seenToken: number, sliceCount: number): boolean {
  return spinToken !== seenToken && spinToken !== 0 && sliceCount > 0;
}
