import { useEffect, useMemo, useState } from "react";
import SortingControls from "./SortingControls.jsx";
import SortingStage from "./SortingStage.jsx";
import SortingLearningPanel from "./SortingLearningPanel.jsx";
import "./sorting.css";

const BASE_ARRAY = [33, 12, 48, 7, 25, 39, 4, 19, 42, 16];

const makeRandomArray = (size = 10) =>
  Array.from({ length: size }, () => Math.floor(Math.random() * 48) + 3);

const pushCompare = (steps, arr, i, j, message) => {
  steps.push({ type: "compare", array: [...arr], comparedIndices: [i, j], message });
};

const pushSwap = (steps, arr, i, j, message) => {
  steps.push({ type: "swap", array: [...arr], swappedIndices: [i, j], message });
};

const pushPivot = (steps, arr, pivotIndex, message) => {
  steps.push({ type: "pivot", array: [...arr], pivotIndex, message });
};

const pushWrite = (steps, arr, writeIndex, message) => {
  steps.push({ type: "write", array: [...arr], swappedIndices: [writeIndex], message });
};

function buildBubbleSteps(source) {
  const arr = [...source];
  const steps = [];

  for (let i = 0; i < arr.length - 1; i += 1) {
    for (let j = 0; j < arr.length - i - 1; j += 1) {
      pushCompare(steps, arr, j, j + 1, `Compare ${arr[j]} and ${arr[j + 1]}.`);
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        pushSwap(steps, arr, j, j + 1, `Swap out-of-order pair ${arr[j + 1]} and ${arr[j]}.`);
      }
    }
  }

  steps.push({ type: "done", array: [...arr], message: "Bubble sort complete." });
  return steps;
}

function buildSelectionSteps(source) {
  const arr = [...source];
  const steps = [];

  for (let i = 0; i < arr.length - 1; i += 1) {
    let minIndex = i;

    for (let j = i + 1; j < arr.length; j += 1) {
      pushCompare(steps, arr, minIndex, j, `Selection scan: compare candidate minimum with index ${j}.`);
      if (arr[j] < arr[minIndex]) minIndex = j;
    }

    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
      pushSwap(steps, arr, i, minIndex, `Place new minimum at sorted index ${i}.`);
    }
  }

  steps.push({ type: "done", array: [...arr], message: "Selection sort complete." });
  return steps;
}

function buildInsertionSteps(source) {
  const arr = [...source];
  const steps = [];

  for (let i = 1; i < arr.length; i += 1) {
    let j = i;

    while (j > 0) {
      pushCompare(steps, arr, j - 1, j, `Insertion compare at ${j - 1} and ${j}.`);
      if (arr[j - 1] <= arr[j]) break;
      [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
      pushSwap(steps, arr, j - 1, j, `Shift ${arr[j]} right and insert ${arr[j - 1]} left.`);
      j -= 1;
    }
  }

  steps.push({ type: "done", array: [...arr], message: "Insertion sort complete." });
  return steps;
}

function buildMergeSteps(source) {
  const arr = [...source];
  const steps = [];

  const mergeSort = (left, right) => {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);
    mergeSort(left, mid);
    mergeSort(mid + 1, right);

    const buffer = [];
    let i = left;
    let j = mid + 1;

    while (i <= mid && j <= right) {
      pushCompare(steps, arr, i, j, `Merge compare left ${arr[i]} and right ${arr[j]}.`);
      if (arr[i] <= arr[j]) {
        buffer.push(arr[i]);
        i += 1;
      } else {
        buffer.push(arr[j]);
        j += 1;
      }
    }

    while (i <= mid) {
      buffer.push(arr[i]);
      i += 1;
    }

    while (j <= right) {
      buffer.push(arr[j]);
      j += 1;
    }

    for (let k = 0; k < buffer.length; k += 1) {
      arr[left + k] = buffer[k];
      pushWrite(steps, arr, left + k, `Write ${buffer[k]} back to merged range.`);
    }
  };

  mergeSort(0, arr.length - 1);
  steps.push({ type: "done", array: [...arr], message: "Merge sort complete." });
  return steps;
}

function buildQuickSteps(source) {
  const arr = [...source];
  const steps = [];

  const quickSort = (low, high) => {
    if (low >= high) return;

    const pivot = arr[high];
    let i = low;
    pushPivot(steps, arr, high, `Pivot selected: ${pivot}.`);

    for (let j = low; j < high; j += 1) {
      pushCompare(steps, arr, j, high, `Compare index ${j} with pivot ${pivot}.`);
      if (arr[j] <= pivot) {
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          pushSwap(steps, arr, i, j, `Move ${arr[i]} to left partition.`);
        }
        i += 1;
      }
    }

    [arr[i], arr[high]] = [arr[high], arr[i]];
    pushSwap(steps, arr, i, high, `Pivot ${pivot} moved to final partition index ${i}.`);

    quickSort(low, i - 1);
    quickSort(i + 1, high);
  };

  quickSort(0, arr.length - 1);
  steps.push({ type: "done", array: [...arr], message: "Quick sort complete." });
  return steps;
}

function buildHeapSteps(source) {
  const arr = [...source];
  const steps = [];

  const heapify = (n, i) => {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < n) {
      pushCompare(steps, arr, largest, left, `Heap compare parent and left child.`);
      if (arr[left] > arr[largest]) largest = left;
    }

    if (right < n) {
      pushCompare(steps, arr, largest, right, `Heap compare current largest with right child.`);
      if (arr[right] > arr[largest]) largest = right;
    }

    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      pushSwap(steps, arr, i, largest, `Promote larger child in heap.`);
      heapify(n, largest);
    }
  };

  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i -= 1) {
    heapify(arr.length, i);
  }

  for (let end = arr.length - 1; end > 0; end -= 1) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    pushSwap(steps, arr, 0, end, `Move heap max to sorted tail.`);
    heapify(end, 0);
  }

  steps.push({ type: "done", array: [...arr], message: "Heap sort complete." });
  return steps;
}

const buildStepsForAlgorithm = (algorithm, source) => {
  if (algorithm === "bubble") return buildBubbleSteps(source);
  if (algorithm === "selection") return buildSelectionSteps(source);
  if (algorithm === "insertion") return buildInsertionSteps(source);
  if (algorithm === "merge") return buildMergeSteps(source);
  if (algorithm === "quick") return buildQuickSteps(source);
  return buildHeapSteps(source);
};

function SortingVisualizer({ pagePhase = "idle" }) {
  const [initialArray, setInitialArray] = useState(BASE_ARRAY);
  const [algorithm, setAlgorithm] = useState("bubble");
  const [stepIndex, setStepIndex] = useState(0);
  const [speed, setSpeed] = useState(280);
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = useMemo(() => buildStepsForAlgorithm(algorithm, initialArray), [algorithm, initialArray]);
  const currentStep = steps[stepIndex] || { array: initialArray, type: "idle", message: "Ready." };

  const comparedCount = useMemo(
    () => steps.slice(0, stepIndex + 1).filter((step) => step.type === "compare").length,
    [steps, stepIndex]
  );

  const swapCount = useMemo(
    () => steps.slice(0, stepIndex + 1).filter((step) => step.type === "swap" || step.type === "write").length,
    [steps, stepIndex]
  );

  const handleAlgorithmChange = (nextAlgorithm) => {
    setAlgorithm(nextAlgorithm);
    setStepIndex(0);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setStepIndex(0);
    setIsPlaying(false);
  };

  const handleShuffle = () => {
    setInitialArray(makeRandomArray(initialArray.length));
    setStepIndex(0);
    setIsPlaying(false);
  };

  const handleStep = () => {
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePlayPause = () => {
    if (stepIndex >= steps.length - 1) {
      setStepIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  useEffect(() => {
    if (!isPlaying) return undefined;
    if (stepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, speed);

    return () => window.clearTimeout(timer);
  }, [isPlaying, stepIndex, steps.length, speed]);

  const sortedIndices = currentStep.type === "done" ? currentStep.array.map((_, index) => index) : [];

  return (
    <div className={`sorting-page sorting-page-phase-${pagePhase}`}>
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / SORTING LAB</p>
        <h1>SORTING VISUALIZER</h1>
        <p className="subtitle">
          Step through comparisons, swaps, writes, and pivots with neon cyber feedback.
        </p>
      </section>

      <SortingControls
        algorithm={algorithm}
        onAlgorithmChange={handleAlgorithmChange}
        speed={speed}
        onSpeedChange={setSpeed}
        onShuffle={handleShuffle}
        onReset={handleReset}
        onStep={handleStep}
        onPlayPause={handlePlayPause}
        isPlaying={isPlaying}
        canStep={stepIndex < steps.length - 1}
        isComplete={stepIndex >= steps.length - 1}
      />

      <SortingStage
        values={currentStep.array}
        comparedIndices={currentStep.comparedIndices || []}
        swappedIndices={currentStep.swappedIndices || []}
        pivotIndex={currentStep.pivotIndex ?? null}
        sortedIndices={sortedIndices}
        currentStepType={currentStep.type}
      />

      <SortingLearningPanel
        algorithm={algorithm}
        stepIndex={stepIndex}
        totalSteps={Math.max(steps.length - 1, 0)}
        message={currentStep.message}
        comparedCount={comparedCount}
        swapCount={swapCount}
      />
    </div>
  );
}

export default SortingVisualizer;
