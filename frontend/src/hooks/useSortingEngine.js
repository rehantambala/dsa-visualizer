import { useState, useRef, useCallback, useEffect } from 'react';
import { playSortSound } from '../components/utils/audioEngine';

export const useSortingEngine = () => {
  const [array, setArray] = useState([]); // Array of objects: { id, value, state }
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.25x to 2x
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  
  const timerRef = useRef(null);
  const historyIdRef = useRef(1);
  const arrayRef = useRef([]);

  useEffect(() => {
    arrayRef.current = array;
  }, [array]);

  const buildHistoryEntry = useCallback((snapshot, label, stepIndex = 0) => ({
    id: historyIdRef.current++,
    snapshot: snapshot.map(item => ({ ...item })),
    label,
    stepIndex
  }), []);

  // Initialize array with unique IDs so Framer Motion can track them during swaps
  const generateArray = useCallback((size = 15, type = 'random') => {
    const newArr = Array.from({ length: size }, (_, i) => {
      let val = Math.floor(Math.random() * 99) + 1;
      if (type === 'sorted') val = i + 1;
      if (type === 'reverse') val = size - i;
      return { id: `block-${Date.now()}-${i}`, value: val, state: 'normal' };
    });
    historyIdRef.current = 1;
    setArray(newArr);
    setSteps([]);
    setCurrentStepIndex(0);
    const initialEntry = buildHistoryEntry(newArr, `Initial array: ${type}`, 0);
    setHistory([initialEntry]);
    setSelectedHistoryId(initialEntry.id);
    setIsRunning(false);
  }, [buildHistoryEntry]);

  const loadSteps = useCallback((generatedSteps) => {
    setSteps(generatedSteps);
    setCurrentStepIndex(0);
  }, []);

  const executeStep = useCallback((stepIndex) => {
    if (stepIndex >= steps.length) {
      setIsRunning(false);
      return;
    }

    const step = steps[stepIndex];
    
    setArray(prevArr => {
      const newArr = [...prevArr];

      if (step.type === 'compare' || step.type === 'swap') {
        const val = prevArr[step.i]?.value || 50;
        playSortSound(val);
      }
      
      // Reset previous compare/swap states to normal, keeping 'sorted' intact
      newArr.forEach(item => {
        if (item.state !== 'sorted') item.state = 'normal';
      });

      if (step.type === 'compare') {
        newArr[step.i].state = 'comparing';
        newArr[step.j].state = 'comparing';
      } 
      else if (step.type === 'swap') {
        newArr[step.i].state = 'swapping';
        newArr[step.j].state = 'swapping';
        // Physically swap for Framer Motion layout transition
        const temp = newArr[step.i];
        newArr[step.i] = newArr[step.j];
        newArr[step.j] = temp;
      }
      else if (step.type === 'pivot') {
        newArr[step.index].state = 'pivot';
      }
      else if (step.type === 'sorted') {
        newArr[step.index].state = 'sorted';
      }

      const historyEntry = buildHistoryEntry(newArr, `Step ${stepIndex + 1}: ${step.type}`, stepIndex + 1);
      setHistory(prev => [...prev, historyEntry]);
      setSelectedHistoryId(historyEntry.id);

      return newArr;
    });

    setCurrentStepIndex(stepIndex + 1);
  }, [buildHistoryEntry, steps]);

  // Handle Playback loop
  const play = useCallback(() => {
    if (currentStepIndex >= steps.length) return;
    setIsRunning(true);
    
    const baseDelay = 600; // ms
    const executeNext = (idx) => {
      executeStep(idx);
      if (idx < steps.length - 1) {
        timerRef.current = setTimeout(() => executeNext(idx + 1), baseDelay / speed);
      } else {
        setIsRunning(false);
      }
    };
    
    executeNext(currentStepIndex);
  }, [currentStepIndex, steps, speed, executeStep]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimeout(timerRef.current);
  }, []);

  const stepForward = useCallback(() => {
    if (!isRunning && currentStepIndex < steps.length) {
      executeStep(currentStepIndex);
    }
  }, [isRunning, currentStepIndex, steps.length, executeStep]);

  const restoreHistory = useCallback((historyItem) => {
    if (!historyItem?.snapshot) return;

    clearTimeout(timerRef.current);
    const restoredSnapshot = historyItem.snapshot.map(item => ({ ...item }));
    setIsRunning(false);
    setArray(restoredSnapshot);
    setCurrentStepIndex(historyItem.stepIndex ?? 0);
    setSelectedHistoryId(historyItem.id);
  }, []);

 // Bottom of useSortingEngine.js
  return {
    array, 
    generateArray, // <--- MAKE SURE THIS IS HERE
    steps, 
    loadSteps, 
    currentStepIndex,
    isRunning, 
    play, 
    pause, 
    stepForward, 
    speed, 
    setSpeed, 
    history,
    selectedHistoryId,
    restoreHistory
  };
};
