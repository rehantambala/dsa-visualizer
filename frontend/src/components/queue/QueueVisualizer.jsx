/**
 * frontend/src/components/queue/QueueVisualizer.jsx
 *
 * What this file is for:
 * - Main Queue visualizer page logic.
 * - Owns queue state, queue operations, traversal animation state, history, quiz, notes, and interview mode.
 * - Fixes dequeue so the front item exits smoothly and the remaining queue settles left in a clean way.
 * - Upgrades enqueue so the rear side feels like a real loading dock.
 *
 * What it connects to:
 * - Uses ./QueueStage.jsx to render the queue machine layout
 * - Uses ./queue.css for queue-specific styling
 * - Uses ../../data/queueLearningData.js for quiz data, concept notes, and interview content
 *
 * What it displays:
 * - hero section
 * - queue operation controls
 * - queue machine with front / rear docks
 * - state, complexity, and logic panels
 * - concept notes
 * - interview explanation mode
 * - mini quiz
 * - clickable history restore
 */

import { useEffect, useMemo, useRef, useState } from "react";
import QueueStage from "./QueueStage.jsx";
import {
  QUEUE_CONCEPT_NOTES,
  QUEUE_INTERVIEW_EXPLANATIONS,
  QUEUE_QUIZ,
} from "../../data/queueLearningData.js";
import "./queue.css";

function QueueVisualizer({ pagePhase = "idle" }) {
  const initialValues = useMemo(() => [14, 28, 42, 56], []);
  const itemIdRef = useRef(1);
  const timeoutIdsRef = useRef([]);

  const buildItem = (value) => ({
    id: `queue-item-${itemIdRef.current++}`,
    value,
  });

  const buildItemsFromValues = (values) => values.map((value) => buildItem(value));

  const formatQueue = (values) =>
    values.length > 0 ? `FRONT → ${values.join(" | ")} ← REAR` : "FRONT → EMPTY ← REAR";

  const [items, setItems] = useState(() => buildItemsFromValues(initialValues));

  const [valueInput, setValueInput] = useState("");
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

  const [incomingGhostValue, setIncomingGhostValue] = useState(null);
  const [outgoingGhostValue, setOutgoingGhostValue] = useState(null);
  const [entryPulseActive, setEntryPulseActive] = useState(false);
  const [exitPulseActive, setExitPulseActive] = useState(false);
  const [bridgeToken, setBridgeToken] = useState(null);
  const [rowMotion, setRowMotion] = useState(null);

  const [message, setMessage] = useState(
    "Queue ready. New items enter from REAR and old items leave from FRONT."
  );
  const [operationLabel, setOperationLabel] = useState("IDLE");
  const [operationHint, setOperationHint] = useState(
    "Enqueue injects from the right REAR dock. Dequeue ejects from the left FRONT dock."
  );

  const [logicBefore, setLogicBefore] = useState(formatQueue(initialValues));
  const [logicAfter, setLogicAfter] = useState(formatQueue(initialValues));
  const [logicCaption, setLogicCaption] = useState(
    "Initial queue loaded. The front item is served first, and new items arrive at the rear."
  );

  const [complexityFocus, setComplexityFocus] = useState("enqueue");
  const [complexityDetail, setComplexityDetail] = useState(
    "In queue ADT terms, enqueue is O(1) because the new item joins at the rear."
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

  const values = items.map((item) => item.value);

  const complexityRows = [
    { key: "enqueue", label: "ENQUEUE", value: "O(1)" },
    { key: "dequeue", label: "DEQUEUE", value: "O(1)" },
    { key: "peek", label: "PEEK", value: "O(1)" },
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
    setLogicBefore(formatQueue(beforeValues));
    setLogicAfter(formatQueue(afterValues));
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

  const resetTransientVisuals = () => {
    setHoverIndex(null);
    setTraversedIndices([]);
    setFoundIndex(null);
    setScannerIndex(null);
    setPendingAction("idle");
    setPendingIndex(null);
    setIncomingGhostValue(null);
    setOutgoingGhostValue(null);
    setEntryPulseActive(false);
    setExitPulseActive(false);
    setBridgeToken(null);
    setRowMotion(null);
  };

  const prepareOperation = () => {
    if (isBusy) return false;

    clearAllTimers();
    setIsBusy(true);
    resetTransientVisuals();
    setOperationLabel("RUNNING");

    return true;
  };

  const parseValue = (rawValue, label) => {
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

  const handleSelectCell = (index) => {
    if (isBusy || !items[index]) return;

    setSelectedIndex(index);
    setActiveIndex(index);
    setScannerIndex(index);
    setValueInput(String(items[index].value));
    setFoundIndex(null);
    setOperationLabel("TARGET LOCK");
    setOperationHint("Selected queue cartridge locked for inspection.");
    setMessage(
      `Target lock on queue cell ${index} with value ${items[index].value}. FRONT serves first, REAR receives new arrivals.`
    );
    pulseFocusLock(index);
  };

  const handleEnqueue = async () => {
    const parsedValue = parseValue(valueInput, "value");
    if (parsedValue === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const nextValues = [...beforeValues, parsedValue];

    setInterviewTopic("operations");
    setLearningPanels({
      beforeValues,
      afterValues: nextValues,
      caption:
        "enqueue(value) injects a new item through the REAR side of the queue without disturbing older waiting items.",
      focus: "enqueue",
      detail: "In queue ADT terms, enqueue is O(1) because the new item joins directly at the rear.",
    });

    try {
      setOperationLabel("ENQUEUE");
      setOperationHint("Opening the REAR dock and loading a new item into the chamber.");

      setIncomingGhostValue(parsedValue);
      setEntryPulseActive(true);

      await wait(140);

      setBridgeToken({
        type: "enqueue",
        value: parsedValue,
        key: `enqueue-${Date.now()}`,
      });

      await wait(160);

      setPendingAction("enqueue");
      setPendingIndex(beforeValues.length);
      setItems((prev) => [...prev, buildItem(parsedValue)]);
      setRowMotion("enqueue");
      setSelectedIndex(nextValues.length - 1);
      setActiveIndex(nextValues.length - 1);
      setScannerIndex(nextValues.length - 1);
      setValueInput("");
      setMessage(`Enqueued ${parsedValue} from the rear dock. FIFO order is preserved.`);
      addHistory(`enqueue(${parsedValue})`, nextValues);
      pulseFocusLock(nextValues.length - 1);

      await wait(360);

      setIncomingGhostValue(null);
      setEntryPulseActive(false);
      setBridgeToken(null);
      setRowMotion(null);
      setPendingAction("idle");
      setPendingIndex(null);
      setOperationLabel("ENQUEUE COMPLETE");
      setOperationHint("The newest item is now parked at the REAR side of the queue.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDequeue = async () => {
    if (items.length === 0) {
      setMessage("The queue is empty. There is nothing to dequeue.");
      setOperationLabel("EMPTY QUEUE");
      setOperationHint("Enqueue a value first.");
      return;
    }

    if (!prepareOperation()) return;

    const beforeValues = [...values];
    const removedValue = beforeValues[0];
    const nextValues = beforeValues.slice(1);

    setInterviewTopic("operations");
    setLearningPanels({
      beforeValues,
      afterValues: nextValues,
      caption:
        "dequeue() ejects only the front item, which is the oldest item currently waiting in the queue.",
      focus: "dequeue",
      detail: "In queue ADT terms, dequeue is O(1) because removal happens at the front.",
    });

    try {
      setOperationLabel("DEQUEUE");
      setOperationHint("Opening the FRONT dock and ejecting the oldest waiting item.");

      setPendingAction("dequeue");
      setPendingIndex(0);
      setActiveIndex(0);
      setScannerIndex(0);
      setExitPulseActive(true);
      setMessage(`Dequeuing front value ${removedValue} through the exit dock...`);

      await wait(120);

      setBridgeToken({
        type: "dequeue",
        value: removedValue,
        key: `dequeue-${Date.now()}`,
      });
      setOutgoingGhostValue(removedValue);

      await wait(220);

      setItems((prev) => prev.slice(1));
      setPendingAction("idle");
      setPendingIndex(null);
      setRowMotion("dequeue");

      const nextSelectedIndex = nextValues.length > 0 ? 0 : null;

      setSelectedIndex(nextSelectedIndex);
      setActiveIndex(nextSelectedIndex);
      setScannerIndex(nextSelectedIndex);
      setValueInput(nextSelectedIndex === null ? "" : String(nextValues[0]));
      addHistory("dequeue()", nextValues);

      if (nextSelectedIndex !== null) {
        pulseFocusLock(0);
      }

      await wait(340);

      setRowMotion(null);
      setOutgoingGhostValue(null);
      setExitPulseActive(false);
      setBridgeToken(null);
      setOperationLabel("DEQUEUE COMPLETE");
      setOperationHint("The next waiting item has shifted into the FRONT position.");
      setMessage(`Dequeued ${removedValue} from the front. FIFO order remains intact.`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePeek = async () => {
    if (items.length === 0) {
      setMessage("The queue is empty. There is nothing to peek.");
      setOperationLabel("EMPTY QUEUE");
      setOperationHint("Enqueue a value first.");
      return;
    }

    if (!prepareOperation()) return;

    const beforeValues = [...values];

    setInterviewTopic("operations");
    setLearningPanels({
      beforeValues,
      afterValues: beforeValues,
      caption: "peek() inspects the current front item without removing it from the queue.",
      focus: "peek",
      detail: "peek is O(1) because it looks only at the current front item.",
    });

    try {
      setOperationLabel("PEEK");
      setOperationHint("Locking onto the FRONT item without removing it.");
      setPendingAction("peek");
      setPendingIndex(0);
      setExitPulseActive(true);
      setSelectedIndex(0);
      setActiveIndex(0);
      setScannerIndex(0);
      setValueInput(String(beforeValues[0]));
      setMessage(`Peek sees front value ${beforeValues[0]}. Nothing left the queue.`);
      pulseFocusLock(0);

      await wait(320);

      setExitPulseActive(false);
      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = async () => {
    if (items.length === 0) {
      setMessage("The queue is empty. There is nothing to find.");
      setOperationLabel("EMPTY QUEUE");
      setOperationHint("Enqueue a value first.");
      return;
    }

    const targetValue = parseValue(findInput, "find value");
    if (targetValue === null) return;
    if (!prepareOperation()) return;

    const beforeValues = [...values];

    setInterviewTopic("complexity");
    setLearningPanels({
      beforeValues,
      afterValues: beforeValues,
      caption:
        "find(value) scans across the queue from FRONT to REAR until it finds a match or reaches the end.",
      focus: "find",
      detail: "find is O(n) because the queue may need to inspect items one by one.",
    });

    try {
      setOperationLabel("FIND");
      setOperationHint("Scanning the chamber from the FRONT side toward the REAR side.");

      const visited = [];
      let locatedIndex = null;

      for (let currentIndex = 0; currentIndex < items.length; currentIndex += 1) {
        visited.push(currentIndex);
        setTraversedIndices([...visited]);
        setActiveIndex(currentIndex);
        setScannerIndex(currentIndex);
        setMessage(
          `Searching for ${targetValue}. Checking queue cell ${currentIndex} with value ${items[currentIndex].value}.`
        );
        await wait(190);

        if (items[currentIndex].value === targetValue) {
          locatedIndex = currentIndex;
          break;
        }
      }

      if (locatedIndex !== null) {
        setFoundIndex(locatedIndex);
        setSelectedIndex(locatedIndex);
        setActiveIndex(locatedIndex);
        setScannerIndex(locatedIndex);
        setValueInput(String(items[locatedIndex].value));
        setOperationLabel("FOUND");
        setOperationHint("Match found before the scan reached the REAR side.");
        setMessage(`Found value ${targetValue} at queue cell ${locatedIndex}.`);
        pulseFocusLock(locatedIndex);
      } else {
        setFoundIndex(null);
        setOperationLabel("NOT FOUND");
        setOperationHint("The scan reached the REAR side without a match.");
        setMessage(`Value ${targetValue} was not found in the queue.`);
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
      caption: "clear() drains the full queue and leaves no waiting items in the chamber.",
      focus: "clear",
      detail:
        "clear is treated here as O(1) in queue ADT terms because the visualizer resets the active queue state.",
    });

    try {
      setOperationLabel("CLEAR");
      setOperationHint("Draining the full queue chamber.");
      setExitPulseActive(true);

      await wait(220);

      setItems([]);
      setSelectedIndex(null);
      setActiveIndex(null);
      setScannerIndex(null);
      setFocusLockIndex(null);
      setValueInput("");
      setFindInput("");
      setExitPulseActive(false);
      setOperationLabel("CLEARED");
      setOperationHint("The queue chamber is empty now.");
      setMessage("Cleared the queue. No items are waiting.");
      addHistory("clear()", []);
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
      caption:
        "reset() rebuilds the starter queue so you can replay FIFO behavior from a clean state.",
      focus: "reset",
      detail: "reset is O(n) here because the visualizer rebuilds the starter queue items again.",
    });

    try {
      setItems(buildItemsFromValues(resetValues));
      setSelectedIndex(0);
      setActiveIndex(0);
      setScannerIndex(0);
      setFocusLockIndex(0);
      setValueInput(String(resetValues[0]));
      setFindInput("");
      setOperationLabel("RESET COMPLETE");
      setOperationHint("Starter queue chamber loaded again.");
      setMessage("Reset complete. The default queue is loaded again.");
      addHistory(`reset [${resetValues.join(", ")}]`, resetValues);

      await wait(220);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRestoreHistory = (historyItem) => {
    if (isBusy) return;

    clearAllTimers();

    const restoredValues = [...historyItem.snapshot];
    const restoredItems = buildItemsFromValues(restoredValues);
    const restoredIndex = restoredValues.length > 0 ? 0 : null;

    resetTransientVisuals();
    setItems(restoredItems);
    setSelectedHistoryId(historyItem.id);
    setSelectedIndex(restoredIndex);
    setActiveIndex(restoredIndex);
    setScannerIndex(restoredIndex);
    setFocusLockIndex(restoredIndex);
    setValueInput(restoredIndex === null ? "" : String(restoredValues[0]));
    setFindInput("");
    setInterviewTopic("overview");
    setLearningPanels({
      beforeValues: restoredValues,
      afterValues: restoredValues,
      caption: `History restore reloaded this snapshot: ${historyItem.label}.`,
      focus: "reset",
      detail: "History restore reconstructs a saved queue state so you can replay FIFO behavior again.",
    });
    setOperationLabel("RESTORED");
    setOperationHint("Snapshot loaded back into the queue visualizer.");
    setMessage(`Restored snapshot: ${historyItem.label}`);
  };

  const handleQuizOption = (optionIndex) => {
    if (quizChoice !== null) return;

    const activeQuiz = QUEUE_QUIZ[quizIndex];
    const isCorrect = optionIndex === activeQuiz.answerIndex;

    setQuizChoice(optionIndex);
    setQuizFeedback({
      isCorrect,
      text: isCorrect ? `Correct. ${activeQuiz.explanation}` : `Not quite. ${activeQuiz.explanation}`,
    });
  };

  const handleNextQuiz = () => {
    setQuizIndex((prev) => (prev + 1) % QUEUE_QUIZ.length);
    setQuizChoice(null);
    setQuizFeedback(null);
  };

  const activeQuiz = QUEUE_QUIZ[quizIndex];
  const activeInterview = QUEUE_INTERVIEW_EXPLANATIONS[interviewTopic];

  return (
    <div className={`queue-page queue-page-${pagePhase}`}>
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / QUEUE LAB</p>
        <h1>QUEUE VISUALIZER</h1>
        <p className="subtitle">
          This queue is now built as a clean machine layout: FRONT dock on the left, REAR dock on
          the right, and a central chamber that clearly shows FIFO flow.
        </p>
      </section>

      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">INPUT / PRIMARY OPERATIONS</div>

        <div className="controls-grid queue-controls-grid">
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
            <label>FIND VALUE</label>
            <input
              type="number"
              value={findInput}
              onChange={(e) => setFindInput(e.target.value)}
              placeholder="e.g. 42"
            />
          </div>

          <button className="pixel-btn" type="button" onClick={handleEnqueue} disabled={isBusy}>
            ENQUEUE
          </button>

          <button className="pixel-btn" type="button" onClick={handleDequeue} disabled={isBusy}>
            DEQUEUE
          </button>

          <button className="pixel-btn" type="button" onClick={handlePeek} disabled={isBusy}>
            PEEK
          </button>

          <button className="pixel-btn" type="button" onClick={handleFind} disabled={isBusy}>
            FIND
          </button>
        </div>
      </section>

      <section className="control-panel stage-block stage-delay-3">
        <div className="panel-title">RESET / STATE TOOLS</div>

        <div className="controls-grid queue-secondary-grid">
          <div className="queue-secondary-note">
            Click any queue cell to inspect it. FRONT is the oldest waiting item and REAR is the newest.
          </div>

          <button className="pixel-btn ghost" type="button" onClick={handleClear} disabled={isBusy}>
            CLEAR
          </button>

          <button className="pixel-btn ghost" type="button" onClick={handleReset} disabled={isBusy}>
            RESET
          </button>
        </div>
      </section>

      <section className="visual-panel queue-visual-panel stack-stage-boot stage-block stage-delay-4">
        <div className="visual-header">
          <div className="panel-title">QUEUE MACHINE</div>
          <div className="visual-hint">
            Right side loads new items. Left side serves old items.
          </div>
        </div>

        <QueueStage
          items={items}
          activeIndex={activeIndex}
          hoverIndex={hoverIndex}
          selectedIndex={selectedIndex}
          scannerIndex={scannerIndex}
          focusLockIndex={focusLockIndex}
          traversedIndices={traversedIndices}
          foundIndex={foundIndex}
          pendingAction={pendingAction}
          pendingIndex={pendingIndex}
          incomingGhostValue={incomingGhostValue}
          outgoingGhostValue={outgoingGhostValue}
          entryPulseActive={entryPulseActive}
          exitPulseActive={exitPulseActive}
          bridgeToken={bridgeToken}
          rowMotion={rowMotion}
          onHoverIndex={setHoverIndex}
          onSelectIndex={handleSelectCell}
        />

        <div className="queue-message-band">{message}</div>

        <div className="queue-live-strip">
          <div className="queue-live-card">
            <span className="queue-live-label">MODE</span>
            <strong className="queue-live-value">{operationLabel}</strong>
          </div>

          <div className="queue-live-card">
            <span className="queue-live-label">FRONT</span>
            <strong className="queue-live-value">{values.length > 0 ? values[0] : "--"}</strong>
          </div>

          <div className="queue-live-card">
            <span className="queue-live-label">REAR</span>
            <strong className="queue-live-value">
              {values.length > 0 ? values[values.length - 1] : "--"}
            </strong>
          </div>

          <div className="queue-live-card queue-live-card-wide">
            <span className="queue-live-label">LIVE HINT</span>
            <strong className="queue-live-value">{operationHint}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-grid queue-summary-grid stage-block stage-delay-5">
        <div className="info-card">
          <div className="panel-title">STATE</div>

          <div className="info-list">
            <div className="info-row">
              <span>SIZE</span>
              <strong>{values.length}</strong>
            </div>

            <div className="info-row">
              <span>FRONT VALUE</span>
              <strong>{values.length > 0 ? values[0] : "--"}</strong>
            </div>

            <div className="info-row">
              <span>REAR VALUE</span>
              <strong>{values.length > 0 ? values[values.length - 1] : "--"}</strong>
            </div>

            <div className="info-row">
              <span>SELECTED CELL</span>
              <strong>
                {selectedIndex === null || values[selectedIndex] === undefined
                  ? "--"
                  : `${selectedIndex} / ${values[selectedIndex]}`}
              </strong>
            </div>

            <div className="info-row">
              <span>SCAN PATH</span>
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

      <section className="queue-learning-grid stage-block stage-delay-5">
        <div className="info-card">
          <div className="panel-title">CONCEPT NOTES</div>

          <div className="queue-note-list">
            {QUEUE_CONCEPT_NOTES.map((note) => (
              <div key={note.title} className="queue-note">
                <div className="queue-note-title">{note.title}</div>
                <div className="queue-note-text">{note.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <div className="panel-title">INTERVIEW EXPLANATION MODE</div>

          <div className="queue-topic-switches">
            {Object.entries(QUEUE_INTERVIEW_EXPLANATIONS).map(([topicKey, topicValue]) => (
              <button
                key={topicKey}
                type="button"
                className={`queue-topic-btn ${interviewTopic === topicKey ? "active" : ""}`}
                onClick={() => setInterviewTopic(topicKey)}
              >
                {topicValue.tab}
              </button>
            ))}
          </div>

          <div className="queue-interview-card-title">{activeInterview.title}</div>

          <ul className="queue-interview-bullet-list">
            {activeInterview.points.map((point) => (
              <li key={point} className="queue-interview-bullet">
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
            {quizFeedback ? quizFeedback.text : "Pick one answer to test your queue intuition."}
          </div>

          <button className="pixel-btn quiz-next-btn" type="button" onClick={handleNextQuiz}>
            NEXT QUESTION
          </button>
        </div>

        <div className="info-card queue-history-panel">
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
                <span className="history-snapshot">{formatQueue(item.snapshot)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default QueueVisualizer;