/**
 * frontend/src/data/queueLearningData.js
 *
 * What this file is for:
 * - Central learning content for the Queue Visualizer.
 * - Keeps quiz questions, concept notes, and interview explanation text in one place.
 *
 * What it connects to:
 * - Used by ../components/queue/QueueVisualizer.jsx
 *
 * What it displays:
 * - mini quiz content
 * - concept note content
 * - interview explanation mode content
 */

export const QUEUE_CONCEPT_NOTES = [
  {
    title: "FIFO rule",
    body:
      "A queue follows First In, First Out. The oldest item leaves first, and every new item joins at the rear.",
  },
  {
    title: "Two important ends",
    body:
      "You usually care about only two ends in a queue: FRONT for dequeue and peek, and REAR for enqueue.",
  },
  {
    title: "Why queues matter",
    body:
      "Queues model waiting lines, task scheduling, buffering, and breadth-first processing where order of arrival matters.",
  },
  {
    title: "Queue vs stack",
    body:
      "A stack removes the most recent item first. A queue removes the oldest item first. That one rule changes how problems are solved.",
  },
];

export const QUEUE_INTERVIEW_EXPLANATIONS = {
  overview: {
    tab: "OVERVIEW",
    title: "How to explain a queue in an interview",
    points: [
      "A queue is a linear data structure that follows First In, First Out.",
      "Insertion happens at the rear, and removal happens at the front.",
      "It is useful whenever arrival order must be preserved.",
      "A clean example is customers waiting in line or tasks waiting for service.",
    ],
  },
  operations: {
    tab: "OPERATIONS",
    title: "How to explain enqueue, dequeue, and peek",
    points: [
      "enqueue(value) adds a new item at the rear of the queue.",
      "dequeue() removes the front item, which is the oldest waiting item.",
      "peek() returns the front item without removing it.",
      "These are the core queue operations you should explain first.",
    ],
  },
  complexity: {
    tab: "COMPLEXITY",
    title: "How to explain queue complexity",
    points: [
      "In queue ADT terms, enqueue and dequeue are treated as O(1).",
      "peek is also O(1) because it looks only at the front item.",
      "find is O(n) because you may need to scan through the queue.",
      "Mention that real implementation details can differ depending on array, linked list, or circular buffer design.",
    ],
  },
  usecases: {
    tab: "USE CASES",
    title: "How to explain where queues are used",
    points: [
      "Queues are used in scheduling systems, printers, buffering, networking, and BFS traversal.",
      "They are ideal when items must be handled in the same order they arrived.",
      "A queue keeps processing fair because older items leave before newer ones.",
      "It is a great structure when ordering matters more than random access.",
    ],
  },
};

export const QUEUE_QUIZ = [
  {
    question: "Which queue rule is correct?",
    options: [
      "Last In, First Out",
      "First In, First Out",
      "Random In, Random Out",
      "Newest item always leaves first",
    ],
    answerIndex: 1,
    explanation:
      "A queue follows FIFO, which means the oldest inserted item leaves first.",
  },
  {
    question: "Where does enqueue(value) place the new item?",
    options: [
      "At the front",
      "In the middle",
      "At the rear",
      "It replaces the front",
    ],
    answerIndex: 2,
    explanation:
      "enqueue(value) always adds the new item at the rear end of the queue.",
  },
  {
    question: "What does peek() do?",
    options: [
      "Deletes the rear item",
      "Returns the front item without removing it",
      "Sorts the queue",
      "Moves front to rear",
    ],
    answerIndex: 1,
    explanation:
      "peek() reads the front item only. It does not remove anything from the queue.",
  },
  {
    question: "Why is find(value) O(n) in a queue?",
    options: [
      "Because queues cannot store numbers",
      "Because you may need to scan across the whole queue",
      "Because dequeue is O(n)",
      "Because rear is always null",
    ],
    answerIndex: 1,
    explanation:
      "To find a value, the queue may need to inspect items one by one from front to rear.",
  },
];