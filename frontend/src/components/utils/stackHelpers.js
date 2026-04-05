/**
 * frontend/src/utils/stackHelpers.js
 *
 * What this file is for:
 * - Pure helper functions for stack validation, explanations, and formatting.
 *
 * What it connects to:
 * - Used by ../components/stack/StackVisualizer.jsx
 *
 * What it displays:
 * - This file does not render UI directly.
 * - It supports stack logic and teaching text generation.
 */

let stackItemCounter = 0;

export function makeStackItems(values, phase = "idle") {
  return values.map((value) => {
    stackItemCounter += 1;
    return {
      id: `stack-node-${stackItemCounter}`,
      value,
      phase,
    };
  });
}

export function validatePushValue(rawValue) {
  if (rawValue === "") {
    return {
      valid: false,
      message: "Push needs a value before it can add a new element.",
    };
  }

  const parsed = Number(rawValue);

  if (Number.isNaN(parsed)) {
    return {
      valid: false,
      message: "Push only accepts a valid number.",
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}

export function formatStackInline(values) {
  if (!values || values.length === 0) {
    return "[]";
  }

  return `[${values.join(", ")}]`;
}

export function makeStackSnapshotLabel(values) {
  if (!values || values.length === 0) {
    return "[]";
  }

  return `[${values.join(", ")}]`;
}

export function buildLogicText(operation, beforeValues, afterValues, detail) {
  return {
    before: formatStackInline(beforeValues),
    action: operation.toUpperCase(),
    after: formatStackInline(afterValues),
    explanation: detail,
  };
}

export function buildOperationSummary(operation, beforeValues, afterValues, detail) {
  const op = operation.toUpperCase();
  return `${op}: ${detail} Before ${formatStackInline(beforeValues)} -> After ${formatStackInline(afterValues)}.`;
}

export function getComplexityExplanation(lastAction) {
  const map = {
    push: {
      title: "PUSH IS O(1)",
      description:
        "Push only places one new value at the top. No traversal or shifting through the rest of the stack is needed.",
    },
    pop: {
      title: "POP IS O(1)",
      description:
        "Pop removes only the top value. It does not scan or re-arrange the rest of the stack.",
    },
    peek: {
      title: "PEEK IS O(1)",
      description:
        "Peek reads the top value directly without removing anything or visiting other nodes.",
    },
    clear: {
      title: "CLEAR IS O(n)",
      description:
        "Clear removes every element in the stack, so total work grows with the number of elements.",
    },
    reset: {
      title: "RESET REBUILDS STATE",
      description:
        "Reset restores a baseline teaching state. Conceptually it rebuilds the stack to the chosen starting values.",
    },
    restore: {
      title: "RESTORE LOADS A SNAPSHOT",
      description:
        "Restore replaces the current stack with a stored snapshot, which is useful for comparing previous states.",
    },
    idle: {
      title: "STACK OPERATIONS FOCUS ON THE TOP",
      description:
        "The main benefit of a stack is direct top access. That is why push, pop, and peek are constant-time operations.",
    },
  };

  return map[lastAction] || map.idle;
}

export function getConceptNotes() {
  return [
    {
      title: "WHAT A STACK IS",
      text: "A stack is a linear data structure that follows Last In, First Out. The most recently added value is removed first.",
    },
    {
      title: "WHAT TOP MEANS",
      text: "The top is the only directly accessible end of the stack. Push adds there, pop removes there, and peek reads there.",
    },
    {
      title: "COMMON USES",
      text: "Stacks are used in undo systems, browser history, recursion call stacks, expression parsing, and backtracking problems.",
    },
  ];
}

export function buildInterviewExplanation(topValue) {
  return [
    {
      title: "CORE DEFINITION",
      text: "In an interview, explain a stack as a LIFO data structure with insertion and deletion happening only at the top.",
    },
    {
      title: "WHY IT IS EFFICIENT",
      text: "Because operations are restricted to one end, push, pop, and peek avoid traversal and are typically O(1).",
    },
    {
      title: "HOW TO EXPLAIN THE CURRENT STATE",
      text:
        topValue === null
          ? "Right now the stack is empty, so there is no top value."
          : `Right now the top value is ${topValue}, which is the next element that pop would remove.`,
    },
  ];
}