/**
 * frontend/src/algorithms/sortingStepEngine.js
 *
 * Generates step-by-step instruction arrays for every sorting algorithm.
 * Zero UI dependencies — the visualizer only plays the step tape.
 *
 * Step types:
 *   { type: "compare",    i, j }         — two indices being compared
 *   { type: "swap",       i, j }         — two indices being swapped
 *   { type: "overwrite",  i, val }       — index i set to val (merge sort)
 *   { type: "pivot",      index }        — mark pivot
 *   { type: "sorted",     index }        — element permanently in place
 *   { type: "range",      lo, hi }       — active subarray highlight
 *   { type: "pass",       pass }         — informational: new outer pass
 *   { type: "done" }                     — all sorted
 */

export function bubbleSortSteps(arr) {
  const steps = [];
  const a = [...arr];
  const n = a.length;

  // Track which indices have been marked "sorted" in a Set as we go, instead of
  // re-scanning the whole (ever-growing) steps array with .some() for every
  // index afterward — that was O(n * steps.length) of avoidable work just to
  // build step metadata, on top of the actual O(n^2) sort itself.
  const sortedIndices = new Set();

  for (let pass = 0; pass < n - 1; pass++) {
    steps.push({ type: "pass", pass });
    let swapped = false;
    for (let i = 0; i < n - pass - 1; i++) {
      steps.push({ type: "compare", i, j: i + 1 });
      if (a[i] > a[i + 1]) {
        steps.push({ type: "swap", i, j: i + 1 });
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
      }
    }
    const sortedIndex = n - pass - 1;
    steps.push({ type: "sorted", index: sortedIndex });
    sortedIndices.add(sortedIndex);
    if (!swapped) break;
  }

  // sweep remaining unsorted elements to sorted
  for (let i = 0; i < n; i++) {
    if (!sortedIndices.has(i)) {
      steps.push({ type: "sorted", index: i });
      sortedIndices.add(i);
    }
  }

  steps.push({ type: "done" });
  return steps;
}

export function selectionSortSteps(arr) {
  const steps = [];
  const a = [...arr];
  const n = a.length;

  for (let i = 0; i < n - 1; i++) {
    steps.push({ type: "pass", pass: i });
    let minIdx = i;
    steps.push({ type: "pivot", index: minIdx });

    for (let j = i + 1; j < n; j++) {
      steps.push({ type: "compare", i: minIdx, j });
      if (a[j] < a[minIdx]) {
        minIdx = j;
        steps.push({ type: "pivot", index: minIdx });
      }
    }

    if (minIdx !== i) {
      steps.push({ type: "swap", i, j: minIdx });
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
    }
    steps.push({ type: "sorted", index: i });
  }

  steps.push({ type: "sorted", index: n - 1 });
  steps.push({ type: "done" });
  return steps;
}

export function insertionSortSteps(arr) {
  const steps = [];
  const a = [...arr];
  const n = a.length;

  steps.push({ type: "sorted", index: 0 });

  for (let i = 1; i < n; i++) {
    steps.push({ type: "pass", pass: i });
    let j = i;
    while (j > 0) {
      steps.push({ type: "compare", i: j - 1, j });
      if (a[j] < a[j - 1]) {
        steps.push({ type: "swap", i: j - 1, j });
        [a[j], a[j - 1]] = [a[j - 1], a[j]];
        j--;
      } else {
        break;
      }
    }
    steps.push({ type: "sorted", index: j });
  }

  steps.push({ type: "done" });
  return steps;
}

export function mergeSortSteps(arr) {
  const steps = [];
  const a = [...arr];
  const aux = [...arr];

  function mergeSort(lo, hi) {
    if (hi - lo < 1) return;
    const mid = Math.floor((lo + hi) / 2);
    mergeSort(lo, mid);
    mergeSort(mid + 1, hi);
    merge(lo, mid, hi);
  }

  function merge(lo, mid, hi) {
    steps.push({ type: "range", lo, hi });
    for (let k = lo; k <= hi; k++) aux[k] = a[k];

    let i = lo;
    let j = mid + 1;

    for (let k = lo; k <= hi; k++) {
      if (i > mid) {
        steps.push({ type: "compare", i: j, j: k });
        a[k] = aux[j++];
        steps.push({ type: "overwrite", i: k, val: a[k] });
      } else if (j > hi) {
        steps.push({ type: "compare", i, j: k });
        a[k] = aux[i++];
        steps.push({ type: "overwrite", i: k, val: a[k] });
      } else if (aux[j] < aux[i]) {
        steps.push({ type: "compare", i, j });
        a[k] = aux[j++];
        steps.push({ type: "overwrite", i: k, val: a[k] });
      } else {
        steps.push({ type: "compare", i, j });
        a[k] = aux[i++];
        steps.push({ type: "overwrite", i: k, val: a[k] });
      }
    }

    for (let k = lo; k <= hi; k++) {
      steps.push({ type: "sorted", index: k });
    }
  }

  mergeSort(0, a.length - 1);
  steps.push({ type: "done" });
  return steps;
}

export function quickSortSteps(arr) {
  const steps = [];
  const a = [...arr];

  function quickSort(lo, hi) {
    if (lo >= hi) {
      if (lo === hi) steps.push({ type: "sorted", index: lo });
      return;
    }
    steps.push({ type: "range", lo, hi });
    const p = partition(lo, hi);
    steps.push({ type: "sorted", index: p });
    quickSort(lo, p - 1);
    quickSort(p + 1, hi);
  }

  function partition(lo, hi) {
    const pivotVal = a[hi];
    steps.push({ type: "pivot", index: hi });
    let i = lo - 1;

    for (let j = lo; j < hi; j++) {
      steps.push({ type: "compare", i: j, j: hi });
      if (a[j] <= pivotVal) {
        i++;
        if (i !== j) {
          steps.push({ type: "swap", i, j });
          [a[i], a[j]] = [a[j], a[i]];
        }
      }
    }

    const pivotPos = i + 1;
    if (pivotPos !== hi) {
      steps.push({ type: "swap", i: pivotPos, j: hi });
      [a[pivotPos], a[hi]] = [a[hi], a[pivotPos]];
    }
    return pivotPos;
  }

  quickSort(0, a.length - 1);
  steps.push({ type: "done" });
  return steps;
}