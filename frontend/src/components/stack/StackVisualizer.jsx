/**
 * frontend/src/components/stack/StackVisualizer.jsx
 *
 * What this file is for:
 * - Main container for the Stack Visualizer milestone.
 * - Owns stack state, history, quiz state, explanations, animation flags, and validation.
 * - Imports the final stack-only polish stylesheet so the stack cards feel tighter, cleaner, and more premium.
 *
 * What it connects to:
 * - Uses ./StackControls.jsx
 * - Uses ./StackStage.jsx
 * - Uses ./StackLearningPanel.jsx
 * - Uses ./StackHistoryPanel.jsx
 * - Uses ./stack.css
 * - Uses ../utils/stackHelpers.js
 * - Uses ../data/stackQuizData.js
 *
 * What it displays:
 * - stack page hero
 * - controls for push / pop / peek / clear / reset
 * - vertical animated stack
 * - learning panels
 * - clickable history restore
 */

import { useEffect, useMemo, useState } from "react";
import StackControls from "./StackControls.jsx";
import StackStage from "./StackStage.jsx";
import StackLearningPanel from "./StackLearningPanel.jsx";
import StackHistoryPanel from "./StackHistoryPanel.jsx";
import "./stack.css";
import {
  buildInterviewExplanation,
  buildLogicText,
  buildOperationSummary,
  formatStackInline,
  getComplexityExplanation,
  getConceptNotes,
  makeStackItems,
  makeStackSnapshotLabel,
  validatePushValue,
} from "../utils/stackHelpers.js";
import { STACK_QUIZ_DATA } from "../data/stackQuizData.js";

function StackVisualizer({ pagePhase = "idle" }) {
  const initialValues = useMemo(() => [12, 24, 36], []);
  const [stack, setStack] = useState(() => makeStackItems(initialValues));
  const [inputValue, setInputValue] = useState("");

  const [message, setMessage] = useState("Stack system ready.");
  const [lastAction, setLastAction] = useState("idle");
  const [logicState, setLogicState] = useState(() =>
    buildLogicText("reset", [], initialValues, "Initial stack loaded.")
  );
  const [peekFlashId, setPeekFlashId] = useState(null);

  const [history, setHistory] = useState([
    {
      id: 1,
      label: "reset()",
      snapshot: initialValues,
    },
  ]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(1);

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizMessage, setQuizMessage] = useState("Try the current stack quiz.");
  const [quizFeedbackType, setQuizFeedbackType] = useState("neutral");

  const topItem = stack.length > 0 ? stack[stack.length - 1] : null;
  const topValue = topItem ? topItem.value : null;

  const addHistory = (label, snapshot) => {
    setHistory((prev) => {
      const nextId = prev.length > 0 ? prev[0].id + 1 : 1;
      const nextHistory = [
        {
          id: nextId,
          label,
          snapshot: [...snapshot],
        },
        ...prev,
      ].slice(0, 14);

      setSelectedHistoryId(nextId);
      return nextHistory;
    });
  };

  const updateLearning = (operation, beforeValues, afterValues, detail) => {
    setLastAction(operation);
    setLogicState(buildLogicText(operation, beforeValues, afterValues, detail));
    setMessage(buildOperationSummary(operation, beforeValues, afterValues, detail));
  };

  const handlePush = () => {
    const validation = validatePushValue(inputValue);

    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }

    const nextValue = validation.value;
    const beforeValues = stack.map((item) => item.value);
    const nextValues = [...beforeValues, nextValue];
    const nextStack = makeStackItems(nextValues, "enter");

    setStack(nextStack);
    setInputValue("");
    addHistory(`push(${nextValue})`, nextValues);
    updateLearning("push", beforeValues, nextValues, `${nextValue} was added to the top of the stack.`);
  };

  const handlePop = () => {
    if (stack.length === 0) {
      setMessage("Pop cannot run because the stack is empty.");
      return;
    }

    const beforeValues = stack.map((item) => item.value);
    const removed = beforeValues[beforeValues.length - 1];

    setStack((prev) =>
      prev.map((item, index) =>
        index === prev.length - 1 ? { ...item, phase: "exit" } : item
      )
    );

    updateLearning(
      "pop",
      beforeValues,
      beforeValues.slice(0, -1),
      `${removed} was removed from the top of the stack.`
    );

    window.clearTimeout(window.__stackPopTimeout__);
    window.__stackPopTimeout__ = window.setTimeout(() => {
      setStack((prev) => prev.slice(0, -1));
      addHistory(`pop() -> removed ${removed}`, beforeValues.slice(0, -1));
    }, 320);
  };

  const handlePeek = () => {
    if (stack.length === 0) {
      setMessage("Peek cannot show a top element when the stack has no items.");
      return;
    }

    const beforeValues = stack.map((item) => item.value);
    const peeked = beforeValues[beforeValues.length - 1];

    setPeekFlashId(stack[stack.length - 1].id);
    updateLearning(
      "peek",
      beforeValues,
      beforeValues,
      `${peeked} is currently at the top. Peek reads it without removing it.`
    );

    window.clearTimeout(window.__stackPeekTimeout__);
    window.__stackPeekTimeout__ = window.setTimeout(() => {
      setPeekFlashId(null);
    }, 500);
  };

  const handleClear = () => {
    if (stack.length === 0) {
      setMessage("Clear is unnecessary because the stack is already empty.");
      return;
    }

    const beforeValues = stack.map((item) => item.value);

    setStack((prev) => prev.map((item) => ({ ...item, phase: "exit" })));
    updateLearning("clear", beforeValues, [], "All stack elements are being removed.");

    window.clearTimeout(window.__stackClearTimeout__);
    window.__stackClearTimeout__ = window.setTimeout(() => {
      setStack([]);
      addHistory("clear()", []);
    }, 360);
  };

  const handleReset = () => {
    const beforeValues = stack.map((item) => item.value);
    const resetStack = makeStackItems(initialValues, "enter");

    setStack(resetStack);
    setInputValue("");
    addHistory("reset()", initialValues);
    updateLearning(
      "reset",
      beforeValues,
      initialValues,
      "Reset restored the initial teaching stack."
    );
  };

  const handleRestoreHistory = (historyItem) => {
    const beforeValues = stack.map((item) => item.value);
    const restored = historyItem.snapshot;

    setStack(makeStackItems(restored, "enter"));
    setSelectedHistoryId(historyItem.id);
    updateLearning(
      "restore",
      beforeValues,
      restored,
      `Restored a previous stack snapshot: ${makeStackSnapshotLabel(restored)}`
    );
  };

  const handleQuizAnswer = (selectedOption) => {
    const currentQuiz = STACK_QUIZ_DATA[quizIndex];
    const isCorrect = selectedOption === currentQuiz.answer;

    setQuizFeedbackType(isCorrect ? "success" : "error");
    setQuizMessage(
      isCorrect
        ? `Correct — ${currentQuiz.explanation}`
        : `Not quite — ${currentQuiz.explanation}`
    );
  };

  const handleNextQuiz = () => {
    setQuizIndex((prev) => (prev + 1) % STACK_QUIZ_DATA.length);
    setQuizMessage("New question loaded.");
    setQuizFeedbackType("neutral");
  };

  useEffect(() => {
    const hasTransientItems = stack.some((item) => item.phase !== "idle");
    if (!hasTransientItems) return undefined;

    const settleTimeout = window.setTimeout(() => {
      setStack((prev) =>
        prev.map((item) => (item.phase === "idle" ? item : { ...item, phase: "idle" }))
      );
    }, 340);

    return () => window.clearTimeout(settleTimeout);
  }, [stack]);

  useEffect(() => {
    return () => {
      window.clearTimeout(window.__stackPopTimeout__);
      window.clearTimeout(window.__stackPeekTimeout__);
      window.clearTimeout(window.__stackClearTimeout__);
    };
  }, []);

  const currentQuiz = STACK_QUIZ_DATA[quizIndex];
  const complexity = getComplexityExplanation(lastAction);
  const conceptNotes = getConceptNotes();
  const interviewExplanation = buildInterviewExplanation(topValue);

  return (
    <div className={`stack-page stack-page-phase-${pagePhase}`}>
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / STACK LAB</p>
        <h1>STACK VISUALIZER</h1>
        <p className="subtitle">
          Explore LIFO behavior with smoother push / pop / peek motion, clearer chamber feedback,
          before-and-after logic, clickable history restore, interview prep, and quiz-based practice.
        </p>
      </section>

      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">STACK OPERATIONS</div>

        <StackControls
          inputValue={inputValue}
          setInputValue={setInputValue}
          onPush={handlePush}
          onPop={handlePop}
          onPeek={handlePeek}
          onClear={handleClear}
          onReset={handleReset}
          isEmpty={stack.length === 0}
        />
      </section>

      <section className="stack-layout-grid stage-block stage-delay-3">
        <section className="visual-panel stack-visual-panel stack-stage-boot">
          <div className="visual-header">
            <div className="panel-title">STACK DISPLAY</div>
            <div className="visual-hint">Top is always the last element pushed.</div>
          </div>

          <StackStage
            stack={stack}
            peekFlashId={peekFlashId}
            topValue={topValue}
            message={message}
            lastAction={lastAction}
          />
        </section>

        <div className="stage-block stage-delay-4">
          <StackLearningPanel
            message={message}
            lastAction={lastAction}
            logicState={logicState}
            complexity={complexity}
            conceptNotes={conceptNotes}
            interviewExplanation={interviewExplanation}
            currentQuiz={currentQuiz}
            quizMessage={quizMessage}
            quizFeedbackType={quizFeedbackType}
            onQuizAnswer={handleQuizAnswer}
            onNextQuiz={handleNextQuiz}
            currentStackText={formatStackInline(stack.map((item) => item.value))}
          />
        </div>
      </section>

      <div className="stage-block stage-delay-5">
        <StackHistoryPanel
          history={history}
          selectedHistoryId={selectedHistoryId}
          onRestoreHistory={handleRestoreHistory}
        />
      </div>
    </div>
  );
}

export default StackVisualizer;