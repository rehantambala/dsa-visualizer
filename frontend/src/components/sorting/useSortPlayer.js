/**
 * frontend/src/components/sorting/useSortPlayer.js
 *
 * Custom hook: drives step-by-step playback of a sorting step array.
 * Owns all timer logic. Returns display state + control callbacks.
 *
 * Returns:
 *   displayArray   — current array ordering to render
 *   blockStates    — per-index state string ("idle"|"compare"|"swap"|"pivot"|"sorted")
 *   rangeIndices   — [lo, hi] of active sub-range (merge/quick)
 *   stats          — { cmp, swap, pass }
 *   status         — "idle" | "running" | "paused" | "done"
 *   message        — human-readable current step description
 *   stepIndex      — current step number
 *   totalSteps     — total steps
 *   play / pause / stepForward / reset
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { sounds } from "../utils/audioEngine.js";

const SPEED_MS = { slow: 1000, medium: 400, fast: 80 };

export default function useSortPlayer(steps, initialArray, speed) {
  const [displayArray, setDisplayArray]   = useState([...initialArray]);
  const [blockStates,  setBlockStates]    = useState(initialArray.map(() => "idle"));
  const [rangeIndices, setRangeIndices]   = useState(null);   // [lo, hi] | null
  const [stats,        setStats]          = useState({ cmp: 0, swap: 0, pass: 0 });
  const [status,       setStatus]         = useState("idle"); // "idle"|"running"|"paused"|"done"
  const [message,      setMessage]        = useState("System ready. Press SORT to begin.");
  const [stepIndex,    setStepIndex]      = useState(0);

  // mutable refs — avoid stale closures in interval
  const arrRef       = useRef([...initialArray]);
  const statesRef    = useRef(initialArray.map(() => "idle"));
  const statsRef     = useRef({ cmp: 0, swap: 0, pass: 0 });
  const stepIdxRef   = useRef(0);
  const timerRef     = useRef(null);
  const statusRef    = useRef("idle");

  // `steps` mirrored into a ref so play()/applyOneStep() always see the latest
  // value even when called from a stale closure (e.g. a setTimeout scheduled
  // right after setSteps(), before this hook has re-rendered with the new
  // array — that stale-closure gap is exactly what was silently no-op'ing
  // every "▶ SORT" press).
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  // reset everything when steps or initialArray change
  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    arrRef.current     = [...initialArray];
    statesRef.current  = initialArray.map(() => "idle");
    statsRef.current   = { cmp: 0, swap: 0, pass: 0 };
    stepIdxRef.current = 0;
    statusRef.current  = "idle";
    setDisplayArray([...initialArray]);
    setBlockStates(initialArray.map(() => "idle"));
    setRangeIndices(null);
    setStats({ cmp: 0, swap: 0, pass: 0 });
    setStatus("idle");
    setStepIndex(0);
    setMessage("Array reset. Press SORT to begin.");
  }, [initialArray]);

  // apply one step, mutating the refs
  const applyOneStep = useCallback(() => {
    const idx = stepIdxRef.current;
    const steps = stepsRef.current;
    if (!steps || idx >= steps.length) return false;

    const step   = steps[idx];
    const arr    = arrRef.current;
    const states = statesRef.current;
    const st     = statsRef.current;

    // clear compare/swap highlights from last tick — keep sorted
    for (let k = 0; k < states.length; k++) {
      if (states[k] === "compare" || states[k] === "swap" || states[k] === "pivot") {
        states[k] = "idle";
      }
    }

    if (step.type === "compare") {
      states[step.i] = "compare";
      states[step.j] = "compare";
      st.cmp++;
      sounds.compare(arr[step.i]);
      setMessage(`Comparing [${step.i}]=${arr[step.i]} ↔ [${step.j}]=${arr[step.j]}`);
    }

    if (step.type === "swap") {
      states[step.i] = "swap";
      states[step.j] = "swap";
      sounds.swap(arr[step.i]);
      [arr[step.i], arr[step.j]] = [arr[step.j], arr[step.i]];
      st.swap++;
      setMessage(`Swapping [${step.i}] ↔ [${step.j}]`);
      setDisplayArray([...arr]);
    }

    if (step.type === "overwrite") {
      sounds.overwrite(step.val);
      arr[step.i] = step.val;
      states[step.i] = "swap";
      setMessage(`Writing ${step.val} → index [${step.i}]`);
      setDisplayArray([...arr]);
    }

    if (step.type === "pivot") {
      states[step.index] = "pivot";
      sounds.pivotSet(arr[step.index]);
      setMessage(`Pivot set at [${step.index}] = ${arr[step.index]}`);
    }

    if (step.type === "sorted") {
      states[step.index] = "sorted";
      sounds.markSorted(arr[step.index]);
      setMessage(`Element [${step.index}] = ${arr[step.index]} is in its final position.`);
    }

    if (step.type === "range") {
      setRangeIndices([step.lo, step.hi]);
      setMessage(`Working on subarray [${step.lo}…${step.hi}]`);
    }

    if (step.type === "pass") {
      st.pass = step.pass + 1;
      setMessage(`Pass ${step.pass + 1} started.`);
    }

    if (step.type === "done") {
      for (let k = 0; k < states.length; k++) states[k] = "sorted";
      setRangeIndices(null);
      sounds.sortComplete();
      setMessage("✓ Sorting complete.");
      setBlockStates([...states]);
      setStats({ ...st });
      setStatus("done");
      statusRef.current = "done";
      clearInterval(timerRef.current);
      stepIdxRef.current = idx + 1;
      setStepIndex(idx + 1);
      return false;
    }

    setBlockStates([...states]);
    setStats({ ...st });
    stepIdxRef.current = idx + 1;
    setStepIndex(idx + 1);
    return true;
  }, []);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (statusRef.current !== "running") {
        clearInterval(timerRef.current);
        return;
      }
      applyOneStep();
    }, SPEED_MS[speed] ?? 400);
  }, [applyOneStep, speed]);

  const play = useCallback(() => {
    if (!stepsRef.current || stepsRef.current.length === 0) return;
    statusRef.current = "running";
    setStatus("running");
    startTimer();
  }, [startTimer]);

  const pause = useCallback(() => {
    clearInterval(timerRef.current);
    statusRef.current = "paused";
    setStatus("paused");
    setMessage("Paused. Press RESUME to continue.");
  }, []);

  const stepForward = useCallback(() => {
    if (statusRef.current === "running") return;
    applyOneStep();
  }, [applyOneStep]);

  // restart timer when speed changes mid-playback
  useEffect(() => {
    if (statusRef.current === "running") startTimer();
  }, [speed, startTimer]);

  return {
    displayArray, blockStates, rangeIndices,
    stats, status, message, stepIndex, totalSteps: steps?.length ?? 0,
    play, pause, stepForward, reset,
  };
}