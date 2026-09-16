/**
 * Monotonic generation counter for overlapping fetches.
 *
 * Tag clicks and SPIN both kick off /api/spin/candidates (and tag clicks also
 * refetch /api/recipes). Those requests complete in arbitrary order, so a
 * slower earlier click can overwrite a newer result — swapping the wheel
 * mid-spin, emptying the pantry, or showing a filter that doesn't match the
 * pressed chip.
 */
export function createFetchGeneration() {
  let current = 0;
  return {
    begin(): number {
      return ++current;
    },
    isLatest(token: number): boolean {
      return token === current;
    },
  };
}
