import { useEffect, useMemo, useState } from 'react';

export function useAlgorithmDebugger(steps, speed = 240) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentStep = useMemo(() => steps[stepIndex] || steps[0], [steps, stepIndex]);

  const stepForward = () => setStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)));
  const stepBack = () => setStepIndex((prev) => Math.max(prev - 1, 0));
  const pause = () => setIsPlaying(false);
  const autoPlay = () => setIsPlaying(true);
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
