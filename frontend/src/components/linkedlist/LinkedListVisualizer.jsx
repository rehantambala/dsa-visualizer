/**
 * frontend/src/components/linked/LinkedListVisualizer.jsx
 *
 * What this file is for:
 * - Main Linked List visualizer page logic.
 * - Owns linked list state, operations, traversal animation state, history, quiz, notes, and interview mode.
 * - Adds stronger interaction feel with target lock, scan state, and live operation feedback.
 *
 * What it connects to:
 * - Uses ./LinkedListStage.jsx to render the linked chain
 * - Uses ../../data/linkedListLearningData.js for quiz data, concept notes, and interview content
 *
 * What it displays:
 * - hero section
 * - operation controls
 * - linked list node chain with HEAD / TAIL
 * - state, complexity, and logic panels
 * - concept notes
 * - interview explanation mode
 * - mini quiz
 * - clickable history restore
 */

import { useEffect, useMemo, useRef, useState } from "react";
import LinkedListStage from "./LinkedListStage.jsx";
import {
  LINKED_LIST_CONCEPT_NOTES,
  LINKED_LIST_INTERVIEW_EXPLANATIONS,
  LINKED_LIST_QUIZ,
} from "../../data/linkedListLearningData.js";

function LinkedListVisualizer({ pagePhase = "idle" }) {
  const initialValues = useMemo(() => [12, 24, 36, 48], []);
  const nodeIdRef = useRef(1);
  const timeoutIdsRef = useRef([]);

  const buildNode = (value) => ({
    id: `linked-node-${nodeIdRef.current++}`,
    value,
  });

  const buildNodesFromValues = (values) => values.map((value) => buildNode(value));

  const formatChain = (values) =>
    values.length > 0 ? `HEAD → ${values.join(" → ")} → NULL` : "HEAD → NULL";

  const [nodes, setNodes] = useState(() => buildNodesFromValues(initialValues));

  const [valueInput, setValueInput] = useState("");
  const [indexInput, setIndexInput] = useState("");
  const [findInput, setFindInput] = useState("");

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scannerIndex, setScannerIndex] = useState(null);
  const [focusLockIndex, setFocusLockIndex] = useState(0);
  const [traversedIndices, setTraversedIndices] = useState([]);
  const [foundIndex, setFoundIndex] = useState(null);

  const [pendingAction, setPendingAction] = useState("idle");
  const [pendingIndex, setPendingIndex] = useState(null);
  const [linkPulseIndex, setLinkPulseIndex] = useState(null);

  const [message, setMessage] = useState(
    "Linked list ready. HEAD points to the first node. Click any node to target-lock it."
  );
  const [operationLabel, setOperationLabel] = useState("IDLE");
  const [operationHint, setOperationHint] = useState(
    "Hover nodes, click to preload index/value, then run an operation."
  );

  const [logicBefore, setLogicBefore] = useState(formatChain(initialValues));
  const [logicAfter, setLogicAfter] = useState(formatChain(initialValues));
  const [logicCaption, setLogicCaption] = useState(
    "Initial singly linked list loaded. Every node stores a value and a next pointer."
  );

  const [complexityFocus, setComplexityFocus] = useState("append");
  const [complexityDetail, setComplexityDetail] = useState(
    "Append is O(n) in this visualizer because we start from HEAD and traverse to the tail before attaching the new node."
  );

  const [history, setHistory] = useState([
    {
      id: 1,
      label: `reset [${initialValues.join(", ")}]`,
      snapshot: [...initialValues],
    },
  ]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(1);

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);

  const [interviewTopic, setInterviewTopic] = useState("overview");
  const [isBusy, setIsBusy] = useState(false);

  const values = nodes.map((node) => node.value);

  const complexityRows = [
    { key: "prepend", label: "PREPEND", value: "O(1)" },
    { key: "append", label: "APPEND", value: "O(n)" },
    { key: "insertAt", label: "INSERT AT", value: "O(n)" },
    { key: "deleteAt", label: "DELETE AT", value: "O(n)" },
    { key: "updateAt", label: "UPDATE AT", value: "O(n)" },
    { key: "find", label: "FIND", value: "O(n)" },
    { key: "clear", label: "CLEAR", value: "O(1)" },
    { key: "reset", label: "RESET", value: "O(n)" },
  ];

  const clearAllTimers = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  };

  const schedule = (fn, ms) => {
    const timeoutId = window.setTimeout(fn, ms);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  };

  const wait = (ms) =>
    new Promise((resolve) => {
      schedule(resolve, ms);
    });

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const setLearningPanels = ({ beforeValues, afterValues, caption, focus, detail }) => {
    setLogicBefore(formatChain(beforeValues));
    setLogicAfter(formatChain(afterValues));
    setLogicCaption(caption);
    setComplexityFocus(focus);
    setComplexityDetail(detail);
  };

  const addHistory = (label, snapshot) => {
    setHistory((prev) => {
      const nextId = prev.length > 0 ? prev[0].id + 1 : 1;
      const next = [
        {
          id: nextId,
          label,
          snapshot: [...snapshot],
        },
        ...prev,
      ].slice(0, 14);

      setSelectedHistoryId(nextId);
      return next;
    });
  };

  const pulseFocusLock = (index) => {
    setFocusLockIndex(index);
    schedule(() => {
      setFocusLockIndex((prev) => (prev === index ? null : prev));
    }, 700);
  };

  const prepareOperation = () => {
    if (isBusy) return false;

    clearAllTimers();
    setIsBusy(true);
    setHoverIndex(null);
    setTraversedIndices([]);
    setFoundIndex(null);
    setScannerIndex(null);
    setPendingAction("idle");
    setPendingIndex(null);
    setLinkPulseIndex(null);
    setOperationLabel("RUNNING");

    return true;
  };

  const parseNumericValue = (rawValue, label) => {
    if (String(rawValue).trim() === "") {
      setMessage(`Enter a ${label}.`);
      setOperationLabel("INPUT NEEDED");
      setOperationHint(`The ${label} field is required for this action.`);
      return null;
    }

    const parsed = Number(rawValue);

    if (Number.isNaN(parsed)) {
      setMessage(`${label[0].toUpperCase()}${label.slice(1)} must be a valid number.`);
      setOperationLabel("INVALID INPUT");
      setOperationHint(`Use numeric input for ${label}.`);
      return null;
    }

    return parsed;
  };

  const parseIndex = ({ allowEnd = false } = {}) => {
    if (String(indexInput).trim() === "") {
      setMessage("Enter an index first.");
      setOperationLabel("INPUT NEEDED");
      setOperationHint("Pick a node index before running this action.");
      return null;
    }

    const parsed = Number(indexInput);

    if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      setMessage("Index must be a whole number.");
      setOperationLabel("INVALID INPUT");
      setOperationHint("Indexes in this visualizer are whole numbers only.");
      return null;
    }

    if (!allowEnd && nodes.length === 0) {
      setMessage("The list is empty, so there is no valid node index yet.");
      setOperationLabel("EMPTY LIST");
      setOperationHint("Append or prepend to create the first node.");
      return null;
    }

    const upperBound = allowEnd ? nodes.length : nodes.length - 1;

    if (parsed < 0 || parsed > upperBound) {
      setMessage(
        allowEnd
          ? `Index out of range. For insertAt, use 0 to ${nodes.length}.`
          : `Index out of range. For this list, use 0 to ${nodes.length - 1}.`
      );
      setOperationLabel("OUT OF RANGE");
      setOperationHint(
        allowEnd
          ? `Insert positions allowed: 0 to ${nodes.length}.`
          : `Node indexes allowed: 0 to ${nodes.length - 1}.`
      );
      return null;
    }

    return parsed;
  };

  const animateTraversal = async (targetIndex, label, currentNodes) => {
    if (targetIndex < 0 || currentNodes.length === 0) return;

    const visited = [];

    for (let index = 0; index <= targetIndex; index += 1) {
      visited.push(index);
      setTraversedIndices([...visited]);
      setActiveIndex(index);
      setScannerIndex(index);
      setOperationLabel(label);
      setOperationHint(`Following next pointers from HEAD toward node ${targetIndex}.`);
      setMessage(`${label}. Visiting node ${index} with value ${currentNodes[index].value}.`);
      await wait(180);
    }
  };

  const handleSelectNode = (index) => {
    if (isBusy || !nodes[index]) return;

    setSelectedIndex(index);
    setActiveIndex(index);
    setScannerIndex(index);
    setIndexInput(String(index));
    setValueInput(String(nodes[index].value));
    setFoundIndex(null);
    setOperationLabel("TARGET LOCK");
    setOperationHint("Selected node is now preloaded into the controls.");
    setMessage(
      `Target lock on node ${index} with value ${nodes[index].value}. You can update it, delete it, or use it as an insert reference.`
    );
    pulseFocusLock(index);
  };

  const handleAppend = async () => {
    const parsedValue = parseNumericValue(valueInput, "value");
    if (parsedValue === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const currentNodes = [...nodes];
    const nextValues = [...beforeValues, parsedValue];

    setInterviewTopic("insert-delete");
    setLearningPanels({
      beforeValues,
      afterValues: nextValues,
      caption:
        beforeValues.length === 0
          ? "The list was empty, so append creates the first node and HEAD now points to it."
          : "Append walks from HEAD to the current tail, then rewires tail.next to the new node.",
      focus: "append",
      detail:
        beforeValues.length === 0
          ? "Appending into an empty linked list is O(1) because the new node becomes HEAD immediately."
          : "Append is O(n) here because this visualizer follows a head-first singly linked list path until it reaches the tail.",
    });

    try {
      setOperationLabel("APPEND");
      setOperationHint(
        beforeValues.length === 0
          ? "No traversal needed. The new node becomes the first node."
          : "Traverse to TAIL, then connect tail.next to the new node."
      );

      if (beforeValues.length > 0) {
        await animateTraversal(beforeValues.length - 1, "APPEND PATH", currentNodes);
      }

      setPendingAction("append");
      setPendingIndex(beforeValues.length);
      setLinkPulseIndex(beforeValues.length > 0 ? beforeValues.length - 1 : null);

      setNodes((prev) => [...prev, buildNode(parsedValue)]);
      setSelectedIndex(nextValues.length - 1);
      setActiveIndex(nextValues.length - 1);
      setScannerIndex(nextValues.length - 1);
      setIndexInput(String(nextValues.length - 1));
      setValueInput("");
      setOperationLabel("APPEND COMPLETE");
      setOperationHint("A new node was attached to the tail side of the chain.");
      setMessage(`Appended ${parsedValue} to the tail. The chain now grows by one node.`);
      addHistory(`append(${parsedValue})`, nextValues);
      pulseFocusLock(nextValues.length - 1);

      await wait(320);
      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrepend = async () => {
    const parsedValue = parseNumericValue(valueInput, "value");
    if (parsedValue === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const nextValues = [parsedValue, ...beforeValues];

    setInterviewTopic("insert-delete");
    setLearningPanels({
      beforeValues,
      afterValues: nextValues,
      caption: "Prepend creates a new node, points it to the old head, then moves HEAD to this new node.",
      focus: "prepend",
      detail: "Prepend is O(1) because only the HEAD pointer changes. No traversal is required.",
    });

    try {
      setOperationLabel("PREPEND");
      setOperationHint("Create a new node, point it to the old head, then move HEAD.");

      setPendingAction("prepend");
      setPendingIndex(0);

      setNodes((prev) => [buildNode(parsedValue), ...prev]);
      setLinkPulseIndex(beforeValues.length > 0 ? 0 : null);
      setSelectedIndex(0);
      setActiveIndex(0);
      setScannerIndex(0);
      setIndexInput("0");
      setValueInput("");
      setOperationLabel("PREPEND COMPLETE");
      setOperationHint("HEAD now points to the brand-new first node.");
      setMessage(`Prepended ${parsedValue}. HEAD now points to the new first node.`);
      addHistory(`prepend(${parsedValue})`, nextValues);
      pulseFocusLock(0);

      await wait(320);
      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleInsertAt = async () => {
    const parsedValue = parseNumericValue(valueInput, "value");
    if (parsedValue === null) return;

    const parsedIndex = parseIndex({ allowEnd: true });
    if (parsedIndex === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const currentNodes = [...nodes];
    const nextValues = [...beforeValues];
    nextValues.splice(parsedIndex, 0, parsedValue);

    setInterviewTopic("insert-delete");
    setLearningPanels({
      beforeValues,
      afterValues: nextValues,
      caption:
        parsedIndex === 0
          ? "insertAt(0, value) behaves like prepend: create a node, point it to the old head, and move HEAD."
          : "Insert walks to the previous node, sets newNode.next to the old next node, then reconnects previous.next to the new node.",
      focus: "insertAt",
      detail:
        parsedIndex === 0
          ? "At index 0, insertAt is O(1) because it only rewires HEAD."
          : "For general positions, insertAt is O(n) because the list must traverse to the insertion point first.",
    });

    try {
      setOperationLabel("INSERT");
      setOperationHint(
        parsedIndex === 0
          ? "Index 0 behaves like prepend."
          : "Traverse to the previous node, then reconnect the links around the new node."
      );

      if (parsedIndex > 0) {
        await animateTraversal(parsedIndex - 1, "INSERT PATH", currentNodes);
      }

      setPendingAction("insert");
      setPendingIndex(parsedIndex);
      setLinkPulseIndex(parsedIndex > 0 ? parsedIndex - 1 : beforeValues.length > 0 ? 0 : null);

      setNodes((prev) => {
        const next = [...prev];
        next.splice(parsedIndex, 0, buildNode(parsedValue));
        return next;
      });

      setSelectedIndex(parsedIndex);
      setActiveIndex(parsedIndex);
      setScannerIndex(parsedIndex);
      setIndexInput(String(parsedIndex));
      setValueInput("");
      setOperationLabel("INSERT COMPLETE");
      setOperationHint("The surrounding pointers were reconnected around the new node.");
      setMessage(`Inserted ${parsedValue} at index ${parsedIndex}. Links were reconnected around the new node.`);
      addHistory(`insertAt(${parsedIndex}, ${parsedValue})`, nextValues);
      pulseFocusLock(parsedIndex);

      await wait(320);
      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteAt = async () => {
    if (nodes.length === 0) {
      setMessage("The list is empty. There is nothing to delete.");
      setOperationLabel("EMPTY LIST");
      setOperationHint("Append or prepend to create nodes first.");
      return;
    }

    const parsedIndex = parseIndex();
    if (parsedIndex === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const currentNodes = [...nodes];
    const removedValue = beforeValues[parsedIndex];
    const nextValues = beforeValues.filter((_, index) => index !== parsedIndex);

    setInterviewTopic("insert-delete");
    setLearningPanels({
      beforeValues,
      afterValues: nextValues,
      caption:
        parsedIndex === 0
          ? "Deleting the head means moving HEAD to the second node. The old head is removed from the chain."
          : "Delete walks to the previous node, skips the target node, and reconnects previous.next to the target's next node.",
      focus: "deleteAt",
      detail:
        parsedIndex === 0
          ? "Deleting at the head is O(1) because only HEAD changes."
          : "General deleteAt is O(n) because the list must traverse to the node before the deletion target.",
    });

    try {
      setOperationLabel("DELETE");
      setOperationHint(
        parsedIndex === 0
          ? "Move HEAD forward and drop the old first node."
          : "Traverse to the previous node, then skip the target node."
      );

      if (parsedIndex > 0) {
        await animateTraversal(parsedIndex - 1, "DELETE PATH", currentNodes);
      }

      setPendingAction("delete");
      setPendingIndex(parsedIndex);
      setLinkPulseIndex(parsedIndex > 0 ? parsedIndex - 1 : nextValues.length > 1 ? 0 : null);
      setMessage(`Unlinking node ${parsedIndex} with value ${removedValue}...`);
      setOperationLabel("UNLINKING");
      setOperationHint("The target node is being detached from the chain.");

      await wait(280);

      setNodes((prev) => prev.filter((_, index) => index !== parsedIndex));

      const nextActiveIndex =
        nextValues.length === 0 ? null : Math.min(parsedIndex, nextValues.length - 1);

      setSelectedIndex(nextActiveIndex);
      setActiveIndex(nextActiveIndex);
      setScannerIndex(nextActiveIndex);
      setIndexInput(nextActiveIndex === null ? "" : String(nextActiveIndex));
      setValueInput(nextActiveIndex === null ? "" : String(nextValues[nextActiveIndex]));
      setOperationLabel("DELETE COMPLETE");
      setOperationHint("The chain closed the gap by reconnecting around the removed node.");
      setMessage(`Deleted value ${removedValue} at index ${parsedIndex}. Links reconnected successfully.`);
      addHistory(`deleteAt(${parsedIndex})`, nextValues);

      if (nextActiveIndex !== null) {
        pulseFocusLock(nextActiveIndex);
      }

      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateAt = async () => {
    if (nodes.length === 0) {
      setMessage("The list is empty. There is nothing to update.");
      setOperationLabel("EMPTY LIST");
      setOperationHint("Append or prepend to create nodes first.");
      return;
    }

    const parsedValue = parseNumericValue(valueInput, "value");
    if (parsedValue === null) return;

    const parsedIndex = parseIndex();
    if (parsedIndex === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const currentNodes = [...nodes];
    const oldValue = beforeValues[parsedIndex];
    const nextValues = [...beforeValues];
    nextValues[parsedIndex] = parsedValue;

    setInterviewTopic("traversal");
    setLearningPanels({
      beforeValues,
      afterValues: nextValues,
      caption: "Update traverses to the target node and changes the value stored in that node.",
      focus: "updateAt",
      detail: "updateAt is O(n) because the list must walk from HEAD to the target index before editing the node value.",
    });

    try {
      setOperationLabel("UPDATE");
      setOperationHint("Traverse from HEAD until the target node is reached.");
      await animateTraversal(parsedIndex, "UPDATE PATH", currentNodes);

      setPendingAction("update");
      setPendingIndex(parsedIndex);

      setNodes((prev) =>
        prev.map((node, index) =>
          index === parsedIndex
            ? {
                ...node,
                value: parsedValue,
              }
            : node
        )
      );

      setSelectedIndex(parsedIndex);
      setActiveIndex(parsedIndex);
      setScannerIndex(parsedIndex);
      setIndexInput(String(parsedIndex));
      setValueInput(String(parsedValue));
      setOperationLabel("UPDATE COMPLETE");
      setOperationHint("The node stayed in place; only the stored value changed.");
      setMessage(`Updated node ${parsedIndex} from ${oldValue} to ${parsedValue}.`);
      addHistory(`updateAt(${parsedIndex}, ${parsedValue})`, nextValues);
      pulseFocusLock(parsedIndex);

      await wait(320);
      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = async () => {
    if (nodes.length === 0) {
      setMessage("The list is empty. There is nothing to find.");
      setOperationLabel("EMPTY LIST");
      setOperationHint("Append or prepend to create nodes first.");
      return;
    }

    const targetValue = parseNumericValue(findInput, "find value");
    if (targetValue === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const currentNodes = [...nodes];

    setInterviewTopic("traversal");
    setLearningPanels({
      beforeValues,
      afterValues: beforeValues,
      caption: "find(value) starts at HEAD and checks each node one by one until it either matches the value or reaches NULL.",
      focus: "find",
      detail: "find is O(n) because a singly linked list has to scan node by node from HEAD until the value is found or the chain ends.",
    });

    try {
      setOperationLabel("FIND");
      setOperationHint("Follow the chain one node at a time until the value matches or NULL is reached.");

      const visited = [];
      let locatedIndex = null;

      for (let index = 0; index < currentNodes.length; index += 1) {
        visited.push(index);
        setTraversedIndices([...visited]);
        setActiveIndex(index);
        setScannerIndex(index);
        setMessage(`Searching for ${targetValue}. Checking node ${index} with value ${currentNodes[index].value}.`);
        await wait(190);

        if (currentNodes[index].value === targetValue) {
          locatedIndex = index;
          break;
        }
      }

      if (locatedIndex !== null) {
        setFoundIndex(locatedIndex);
        setSelectedIndex(locatedIndex);
        setActiveIndex(locatedIndex);
        setScannerIndex(locatedIndex);
        setIndexInput(String(locatedIndex));
        setValueInput(String(currentNodes[locatedIndex].value));
        setOperationLabel("FOUND");
        setOperationHint("Match located before reaching NULL.");
        setMessage(`Found value ${targetValue} at index ${locatedIndex}.`);
        pulseFocusLock(locatedIndex);
      } else {
        setFoundIndex(null);
        setOperationLabel("NOT FOUND");
        setOperationHint("Traversal reached NULL without finding the value.");
        setMessage(`Value ${targetValue} was not found before reaching NULL.`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async () => {
    if (!prepareOperation()) return;

    const beforeValues = [...values];

    setInterviewTopic("overview");
    setLearningPanels({
      beforeValues,
      afterValues: [],
      caption: "clear() models the list as HEAD → NULL. The chain is dropped and no nodes remain reachable.",
      focus: "clear",
      detail: "clear is treated as O(1) in linked-list terms because the teaching model sets HEAD to NULL.",
    });

    try {
      setOperationLabel("CLEAR");
      setOperationHint("Drop the full chain so HEAD points directly to NULL.");
      setPendingAction("clear");
      setPendingIndex(null);

      await wait(120);

      setNodes([]);
      setSelectedIndex(null);
      setActiveIndex(null);
      setScannerIndex(null);
      setFocusLockIndex(null);
      setIndexInput("");
      setValueInput("");
      setFindInput("");
      setOperationLabel("CLEARED");
      setOperationHint("The list is empty now.");
      setMessage("Cleared the list. HEAD now points to NULL.");
      addHistory("clear()", []);

      setPendingAction("idle");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReset = async () => {
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const resetValues = [...initialValues];

    setInterviewTopic("overview");
    setLearningPanels({
      beforeValues,
      afterValues: resetValues,
      caption: "reset() rebuilds the default teaching list so you can replay operations from a known state.",
      focus: "reset",
      detail: "Reset is O(n) here because the visualizer rebuilds the default linked list node by node.",
    });

    try {
      setOperationLabel("RESET");
      setOperationHint("Rebuilding the starter chain.");
      setNodes(buildNodesFromValues(resetValues));
      setSelectedIndex(0);
      setActiveIndex(0);
      setScannerIndex(0);
      setFocusLockIndex(0);
      setIndexInput("0");
      setValueInput(String(resetValues[0]));
      setFindInput("");
      setOperationLabel("RESET COMPLETE");
      setOperationHint("Starter list loaded and ready again.");
      setMessage("Reset complete. The default linked list is loaded again.");
      addHistory(`reset [${resetValues.join(", ")}]`, resetValues);

      await wait(200);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRestoreHistory = (historyItem) => {
    if (isBusy) return;

    clearAllTimers();

    const restoredValues = [...historyItem.snapshot];
    const restoredNodes = buildNodesFromValues(restoredValues);
    const restoredIndex = restoredValues.length > 0 ? 0 : null;

    setNodes(restoredNodes);
    setSelectedHistoryId(historyItem.id);
    setSelectedIndex(restoredIndex);
    setActiveIndex(restoredIndex);
    setScannerIndex(restoredIndex);
    setFocusLockIndex(restoredIndex);
    setHoverIndex(null);
    setTraversedIndices([]);
    setFoundIndex(null);
    setPendingAction("idle");
    setPendingIndex(null);
    setLinkPulseIndex(null);
    setIndexInput(restoredIndex === null ? "" : String(restoredIndex));
    setValueInput(restoredIndex === null ? "" : String(restoredValues[restoredIndex]));
    setFindInput("");
    setInterviewTopic("overview");
    setLearningPanels({
      beforeValues: restoredValues,
      afterValues: restoredValues,
      caption: `History restore reloaded this snapshot: ${historyItem.label}.`,
      focus: "reset",
      detail: "History restore reconstructs a saved linked-list state so you can replay actions and study the pointer behavior again.",
    });
    setOperationLabel("RESTORED");
    setOperationHint("Snapshot loaded back into the visualizer.");
    setMessage(`Restored snapshot: ${historyItem.label}`);
  };

  const handleQuizOption = (optionIndex) => {
    if (quizChoice !== null) return;

    const activeQuiz = LINKED_LIST_QUIZ[quizIndex];
    const isCorrect = optionIndex === activeQuiz.answerIndex;

    setQuizChoice(optionIndex);
    setQuizFeedback({
      isCorrect,
      text: isCorrect ? `Correct. ${activeQuiz.explanation}` : `Not quite. ${activeQuiz.explanation}`,
    });
  };

  const handleNextQuiz = () => {
    setQuizIndex((prev) => (prev + 1) % LINKED_LIST_QUIZ.length);
    setQuizChoice(null);
    setQuizFeedback(null);
  };

  const activeQuiz = LINKED_LIST_QUIZ[quizIndex];
  const activeInterview = LINKED_LIST_INTERVIEW_EXPLANATIONS[interviewTopic];
  const tailValue = values.length > 0 ? values[values.length - 1] : "--";
  const selectedValue =
    selectedIndex !== null && values[selectedIndex] !== undefined ? values[selectedIndex] : "--";

  return (
    <div className={`linked-list-page linked-list-page-${pagePhase}`}>
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / LINKED LIST LAB</p>
        <h1>LINKED LIST VISUALIZER</h1>
        <p className="subtitle">
          Learn how a singly linked list moves through nodes, rewires pointers, and trades random
          access for fast head insertion. Now the interaction feels more alive: target-lock,
          traversal scan, beam-like reconnects, and stronger hover feedback.
        </p>
      </section>

      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">INPUT / PRIMARY OPERATIONS</div>

        <div className="controls-grid linked-controls-grid">
          <div className="field">
            <label>VALUE</label>
            <input
              type="number"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="e.g. 64"
            />
          </div>

          <div className="field">
            <label>INDEX</label>
            <input
              type="number"
              value={indexInput}
              onChange={(e) => setIndexInput(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>

          <div className="field">
            <label>FIND VALUE</label>
            <input
              type="number"
              value={findInput}
              onChange={(e) => setFindInput(e.target.value)}
              placeholder="e.g. 36"
            />
          </div>

          <button className="pixel-btn" type="button" onClick={handleAppend} disabled={isBusy}>
            APPEND
          </button>

          <button className="pixel-btn" type="button" onClick={handlePrepend} disabled={isBusy}>
            PREPEND
          </button>

          <button className="pixel-btn" type="button" onClick={handleInsertAt} disabled={isBusy}>
            INSERT AT
          </button>

          <button className="pixel-btn" type="button" onClick={handleFind} disabled={isBusy}>
            FIND
          </button>
        </div>
      </section>

      <section className="control-panel stage-block stage-delay-3">
        <div className="panel-title">EDIT / RESET OPERATIONS</div>

        <div className="controls-grid linked-secondary-grid">
          <div className="linked-secondary-note">Click any node to preload its index and current value.</div>

          <button className="pixel-btn" type="button" onClick={handleUpdateAt} disabled={isBusy}>
            UPDATE AT
          </button>

          <button className="pixel-btn" type="button" onClick={handleDeleteAt} disabled={isBusy}>
            DELETE AT
          </button>

          <button className="pixel-btn ghost" type="button" onClick={handleClear} disabled={isBusy}>
            CLEAR
          </button>

          <button className="pixel-btn ghost" type="button" onClick={handleReset} disabled={isBusy}>
            RESET
          </button>
        </div>
      </section>

      <section className="visual-panel linked-visual-panel stack-stage-boot stage-block stage-delay-4">
        <div className="visual-header">
          <div className="panel-title">LINKED CHAIN</div>
          <div className="visual-hint">
            Hover wakes nodes and arrows. Click target-locks a node. Traversal animates data flow.
          </div>
        </div>

        <LinkedListStage
          nodes={nodes}
          activeIndex={activeIndex}
          hoverIndex={hoverIndex}
          selectedIndex={selectedIndex}
          scannerIndex={scannerIndex}
          focusLockIndex={focusLockIndex}
          traversedIndices={traversedIndices}
          foundIndex={foundIndex}
          pendingAction={pendingAction}
          pendingIndex={pendingIndex}
          linkPulseIndex={linkPulseIndex}
          onHoverIndex={setHoverIndex}
          onSelectIndex={handleSelectNode}
        />

        <div className="linked-message-band">{message}</div>

        <div className="linked-live-strip">
          <div className="linked-live-card">
            <span className="linked-live-label">MODE</span>
            <strong className="linked-live-value">{operationLabel}</strong>
          </div>

          <div className="linked-live-card">
            <span className="linked-live-label">TARGET</span>
            <strong className="linked-live-value">
              {selectedIndex === null ? "--" : `#${selectedIndex} / ${selectedValue}`}
            </strong>
          </div>

          <div className="linked-live-card">
            <span className="linked-live-label">HOVER</span>
            <strong className="linked-live-value">
              {hoverIndex === null ? "--" : `#${hoverIndex} / ${values[hoverIndex]}`}
            </strong>
          </div>

          <div className="linked-live-card linked-live-card-wide">
            <span className="linked-live-label">LIVE HINT</span>
            <strong className="linked-live-value">{operationHint}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-grid linked-summary-grid stage-block stage-delay-5">
        <div className="info-card">
          <div className="panel-title">STATE</div>

          <div className="info-list">
            <div className="info-row">
              <span>SIZE</span>
              <strong>{values.length}</strong>
            </div>

            <div className="info-row">
              <span>HEAD VALUE</span>
              <strong>{values.length > 0 ? values[0] : "--"}</strong>
            </div>

            <div className="info-row">
              <span>TAIL VALUE</span>
              <strong>{tailValue}</strong>
            </div>

            <div className="info-row">
              <span>SELECTED NODE</span>
              <strong>{selectedIndex === null ? "--" : `${selectedIndex} / ${selectedValue}`}</strong>
            </div>

            <div className="info-row">
              <span>TRAVERSAL PATH</span>
              <strong>{traversedIndices.length > 0 ? traversedIndices.join(" → ") : "--"}</strong>
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="panel-title">TIME COMPLEXITY</div>

          <div className="info-list">
            {complexityRows.map((row) => (
              <div
                key={row.key}
                className={`complexity-row ${complexityFocus === row.key ? "active" : ""}`}
              >
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          <div className="complexity-detail">{complexityDetail}</div>
        </div>

        <div className="info-card logic-card">
          <div className="panel-title">BEFORE / AFTER LOGIC</div>

          <p className="logic-caption">{logicCaption}</p>

          <div className="logic-chain-list">
            <div className="logic-chain-box">
              <span className="logic-chain-label">BEFORE</span>
              <div className="logic-chain-value">{logicBefore}</div>
            </div>

            <div className="logic-chain-box">
              <span className="logic-chain-label">AFTER</span>
              <div className="logic-chain-value">{logicAfter}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="linked-learning-grid stage-block stage-delay-5">
        <div className="info-card">
          <div className="panel-title">CONCEPT NOTES</div>

          <div className="linked-note-list">
            {LINKED_LIST_CONCEPT_NOTES.map((note) => (
              <div key={note.title} className="linked-note">
                <div className="linked-note-title">{note.title}</div>
                <div className="linked-note-text">{note.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <div className="panel-title">INTERVIEW EXPLANATION MODE</div>

          <div className="interview-topic-switches">
            {Object.entries(LINKED_LIST_INTERVIEW_EXPLANATIONS).map(([topicKey, topicValue]) => (
              <button
                key={topicKey}
                type="button"
                className={`interview-topic-btn ${interviewTopic === topicKey ? "active" : ""}`}
                onClick={() => setInterviewTopic(topicKey)}
              >
                {topicValue.tab}
              </button>
            ))}
          </div>

          <div className="interview-card-title">{activeInterview.title}</div>

          <ul className="interview-bullet-list">
            {activeInterview.points.map((point) => (
              <li key={point} className="interview-bullet">
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="info-card">
          <div className="panel-title">MINI QUIZ</div>

          <div className="stack-reading-row">
            <span className="stack-reading-head">QUESTION</span>
            <p>{activeQuiz.question}</p>
          </div>

          <div className="quiz-options">
            {activeQuiz.options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                className="pixel-btn ghost quiz-option"
                onClick={() => handleQuizOption(optionIndex)}
                disabled={quizChoice !== null}
              >
                {option}
              </button>
            ))}
          </div>

          <div
            className={`quiz-message ${
              quizFeedback
                ? quizFeedback.isCorrect
                  ? "success"
                  : "error"
                : ""
            }`}
          >
            {quizFeedback ? quizFeedback.text : "Pick one answer to test your linked list intuition."}
          </div>

          <button className="pixel-btn quiz-next-btn" type="button" onClick={handleNextQuiz}>
            NEXT QUESTION
          </button>
        </div>

        <div className="info-card linked-history-panel">
          <div className="panel-title">HISTORY (CLICK TO RESTORE)</div>

          <div className="history-list">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`history-item ${selectedHistoryId === item.id ? "is-selected" : ""}`}
                onClick={() => handleRestoreHistory(item)}
                disabled={isBusy}
              >
                <span className="history-label">{item.label}</span>
                <span className="history-snapshot">{formatChain(item.snapshot)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default LinkedListVisualizer;