import { describe, it, expect } from 'vitest';
import {
  bubbleSortSteps,
  selectionSortSteps,
  insertionSortSteps,
  mergeSortSteps,
  quickSortSteps,
} from './sortingStepEngine.js';

// Mirrors the replay logic in components/sorting/useSortPlayer.js: apply every
// swap/overwrite step to a working copy and check the result is actually sorted -
// not just that steps were emitted.
function replay(steps, initial) {
  const arr = [...initial];
  steps.forEach((step) => {
    if (step.type === 'swap') {
      [arr[step.i], arr[step.j]] = [arr[step.j], arr[step.i]];
    }
    if (step.type === 'overwrite') {
      arr[step.i] = step.val;
    }
  });
  return arr;
}

const ALGORITHMS = {
  bubble: bubbleSortSteps,
  selection: selectionSortSteps,
  insertion: insertionSortSteps,
  merge: mergeSortSteps,
  quick: quickSortSteps,
};

const CASES = [
  [5, 3, 8, 1, 9, 2],
  [1],
  [],
  [2, 2, 2],
  [9, 8, 7, 6, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 5],
];

describe('sortingStepEngine', () => {
  Object.entries(ALGORITHMS).forEach(([name, fn]) => {
    describe(name, () => {
      CASES.forEach((input) => {
        it(`sorts ${JSON.stringify(input)} correctly`, () => {
          const steps = fn(input);
          const result = replay(steps, input);
          const expected = [...input].sort((a, b) => a - b);
          expect(result).toEqual(expected);
        });
      });

      it('ends with a done step', () => {
        const steps = fn([3, 1, 2]);
        expect(steps.at(-1)).toEqual({ type: 'done' });
      });
    });
  });
});
