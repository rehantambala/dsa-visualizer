/**
 * frontend/src/data/stackQuizData.js
 *
 * What this file is for:
 * - Stores mini quiz questions for the Stack Visualizer.
 *
 * What it connects to:
 * - Used by ../components/stack/StackVisualizer.jsx
 *
 * What it displays:
 * - This file does not render UI directly.
 * - It provides stack quiz content and answer keys.
 */

export const STACK_QUIZ_DATA = [
  {
    question: "If the stack is [2, 4, 6], what does pop() remove?",
    options: ["2", "4", "6", "nothing"],
    answer: "6",
    explanation: "Stacks are LIFO, so pop removes the most recently pushed value at the top.",
  },
  {
    question: "After push(9) on [1, 3], what becomes the top?",
    options: ["1", "3", "9", "the stack becomes empty"],
    answer: "9",
    explanation: "Push adds a new value directly to the top of the stack.",
  },
  {
    question: "Does peek() change the stack?",
    options: ["Yes, it removes the top", "Yes, it clears the stack", "No, it only reads the top", "No, but it shuffles values"],
    answer: "No, it only reads the top",
    explanation: "Peek inspects the top value without modifying the stack structure.",
  },
];