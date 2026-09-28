/**
 * frontend/src/data/linkedListLearningData.js
 *
 * What this file is for:
 * - Central learning content for the Linked List Visualizer.
 * - Keeps quiz questions, concept notes, and interview explanation text in one place.
 *
 * What it connects to:
 * - Used by ../components/linked/LinkedListVisualizer.jsx
 *
 * What it displays:
 * - mini quiz content
 * - concept note content
 * - interview explanation mode content
 */

export const LINKED_LIST_CONCEPT_NOTES = [
  {
    title: "Singly linked list structure",
    body:
      "A singly linked list stores each element inside a node. Every node keeps a value and a pointer to the next node. HEAD gives you the entry point into the chain.",
  },
  {
    title: "Why traversal matters",
    body:
      "Unlike arrays, linked lists do not support direct index access. To reach index 4, you must start at HEAD and follow links one node at a time.",
  },
  {
    title: "Insert and delete intuition",
    body:
      "The power of linked lists comes from pointer rewiring. Once you already have the previous node, insert and delete are about reconnecting next references instead of shifting every element.",
  },
  {
    title: "Best tradeoff to remember",
    body:
      "Linked lists are great when frequent head insertion or deletion matters more than fast random access. Arrays win when you need quick indexing and cache-friendly memory layout.",
  },
];

export const LINKED_LIST_INTERVIEW_EXPLANATIONS = {
  overview: {
    tab: "OVERVIEW",
    title: "How to explain a linked list in an interview",
    points: [
      "A linked list is a linear data structure made of nodes, where each node stores data and a reference to the next node.",
      "It does not require contiguous memory like an array, so nodes can live in different places in memory.",
      "You usually start traversal from HEAD and keep following next pointers until you reach NULL.",
      "The biggest tradeoff is that linked lists are flexible for pointer rewiring but slow for random access.",
    ],
  },
  traversal: {
    tab: "TRAVERSAL",
    title: "How to explain traversal, find, and update",
    points: [
      "To find or update a node, you cannot jump directly to an index like an array.",
      "You begin at HEAD and walk node by node until you reach the target position or value.",
      "That is why find(value), updateAt(index), and most middle operations are O(n).",
      "A clear way to say it: traversal cost dominates the operation.",
    ],
  },
  "insert-delete": {
    tab: "INSERT / DELETE",
    title: "How to explain pointer rewiring",
    points: [
      "For prepend, create a new node, point it to the old head, then move HEAD to the new node.",
      "For insert in the middle, traverse to the previous node, set newNode.next to previous.next, then set previous.next to newNode.",
      "For delete in the middle, traverse to the previous node and skip the target by setting previous.next to target.next.",
      "The key interview phrase is pointer rewiring instead of element shifting.",
    ],
  },
  tradeoffs: {
    tab: "TRADEOFFS",
    title: "When to choose a linked list",
    points: [
      "Choose a linked list when you care about fast structural edits near the head or when nodes are inserted and removed frequently.",
      "Avoid it when you need fast random access, because index-based lookup is O(n).",
      "Arrays usually have better locality of reference and often perform better in practice for read-heavy work.",
      "In interviews, mention both asymptotic complexity and real-world cache behavior.",
    ],
  },
};

export const LINKED_LIST_QUIZ = [
  {
    question: "Which linked list operation is naturally O(1) at the head of a singly linked list?",
    options: [
      "find(value)",
      "prepend(value)",
      "insertAt(4, value)",
      "scan to tail",
    ],
    answerIndex: 1,
    explanation:
      "prepend(value) only creates a new node, points it to the old head, and moves HEAD. No traversal is needed.",
  },
  {
    question: "Why is find(value) usually O(n) in a singly linked list?",
    options: [
      "Because every node stores two values",
      "Because linked lists must scan from HEAD node by node",
      "Because deletion is expensive",
      "Because arrays are faster",
    ],
    answerIndex: 1,
    explanation:
      "A singly linked list cannot jump directly to an index or address by position. It has to move from HEAD through each next pointer.",
  },
  {
    question: "What changes during a middle insert in a singly linked list?",
    options: [
      "All values shift right in memory",
      "Two links are rewired around the new node",
      "HEAD must always become NULL",
      "The list becomes sorted automatically",
    ],
    answerIndex: 1,
    explanation:
      "Middle insert is about rewiring previous.next and newNode.next. Values do not shift like they do in an array.",
  },
  {
    question: "What is the main weakness of linked lists compared with arrays?",
    options: [
      "They cannot store numbers",
      "They use black themes only",
      "Random access by index is slow",
      "They cannot delete nodes",
    ],
    answerIndex: 2,
    explanation:
      "Arrays support O(1) indexed access, while linked lists require traversal from HEAD, making random access O(n).",
  },
];