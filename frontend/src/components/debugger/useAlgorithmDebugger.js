import { useEffect, useMemo, useRef, useState } from 'react';
import { sounds } from '../utils/audioEngine.js';

// Shared by Graph, Binary Tree, and Pathfinding visualizers. Step shapes differ
// slightly (current/activeId, visited/visitedIds, path) but all follow the same
// "one step per algorithm move" pattern, so a single generic sound heuristic
// here instruments every step-through animation for all three visualizers at once.
function playStepSound(step) {
  if (!step) return;
  const hasPath = Array.isArray(step.path) && step.path.length > 0;
  if (hasPath) {
    sounds.pathFound();
    return;
  }
  const msg = (step.message || '').toLowerCase();
  if (msg.includes('unreachable') || msg.includes('no path') || msg.includes('not found')) {
    sounds.noPath();
    return;
  }
  const activeNode = step.current ?? step.activeId;
  if (activeNode !== undefined && activeNode !== null) {
    const order = Array.isArray(step.visited)
      ? step.visited.length
      : Array.isArray(step.visitedIds)
      ? step.visitedIds.length
      : 0;
    sounds.visit(order);
    return;
  }
  if (step.edge) {
    sounds.edgeTraverse();
  }
}

export function useAlgorithmDebugger(steps, speed = 240) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const prevIndexRef = useRef(0);
  const skipNextSoundRef = useRef(true);

  // BUG FIXED: stepIndex never reset when a new `steps` array arrived from a fresh
  // operation (insert/run/traverse/etc). Leftover stepIndex from the PREVIOUS
  // operation stayed in place - if the new steps array was shorter, currentStep
  // silently fell back to steps[0] (the "starting..." message, not the result);
  // if longer, it pointed at an unrelated mid-operation snapshot. Either way the
  // visualizer looked like it did nothing. Jumping to the LAST step on every new
  // steps array shows the completed result immediately, and STEP BACK/forward let
  // the user scrub backward through the real history to study it - consistent
  // with these being "debugger" controls (stopped at the end, rewind to inspect).
  useEffect(() => {
    // A fresh steps array lands on its last index automatically (see comment
    // above) - that's a jump, not a scrub, so don't fire the per-step sound for it.
    skipNextSoundRef.current = true;
    setStepIndex(Math.max(steps.length - 1, 0));
    setIsPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const currentStep = useMemo(() => steps[stepIndex] || steps[0], [steps, stepIndex]);

  // Fires a sound whenever stepIndex advances forward via stepForward/autoPlay
  // (scrubbing backward stays silent so rewinding doesn't sound like progress).
  useEffect(() => {
    if (skipNextSoundRef.current) {
      skipNextSoundRef.current = false;
      prevIndexRef.current = stepIndex;
      return;
    }
    if (stepIndex > prevIndexRef.current) {
      playStepSound(currentStep);
    }
    prevIndexRef.current = stepIndex;
  }, [stepIndex, currentStep]);

  const stepForward = () => setStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)));
  const stepBack = () => setStepIndex((prev) => Math.max(prev - 1, 0));
  const pause = () => setIsPlaying(false);
  // If already sitting at (or near) the last step - which is the default landing
  // spot now - AUTO PLAY restarts from the beginning instead of doing nothing.
  const autoPlay = () => {
    setStepIndex((prev) => (prev >= steps.length - 1 ? 0 : prev));
    setIsPlaying(true);
  };
  const reset = () => {
    setIsPlaying(false);
    setStepIndex(0);
  };

  useEffect(() => {
    if (!isPlaying) return undefined;
    if (stepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return undefined;
    }
    const id = window.setTimeout(stepForward, speed);
    return () => window.clearTimeout(id);
  }, [isPlaying, stepIndex, steps.length, speed]);

  return {
    stepIndex,
    setStepIndex,
    isPlaying,
    currentStep,
    stepForward,
    stepBack,
    pause,
    autoPlay,
    reset,
  };
}
