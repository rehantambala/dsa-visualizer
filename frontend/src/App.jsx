/**
 * frontend/src/App.jsx
 *
 * What this file is for:
 * - Main page for the DSA Visualizer.
 * - Keeps the Array Visualizer logic.
 * - Keeps the Stack Visualizer mode.
 * - Adds Queue Visualizer mode switching.
 * - Keeps Linked List Visualizer mode switching.
 * - Controls the stylish futuristic page transition between modes.
 *
 * What it connects to:
 * - Uses ./components/array/PixelArrayDisplay.jsx for the Array view
 * - Uses ./components/stack/StackVisualizer.jsx for the Stack view
 * - Uses ./components/queue/QueueVisualizer.jsx for the Queue view
 * - Uses ./components/linked/LinkedListVisualizer.jsx for the Linked List view
 *
 * What it displays:
 * - top navigation
 * - array visualizer page
 * - stack visualizer page
 * - queue visualizer page
 * - linked list visualizer page
 * - nav-origin transition pulse and staged page reveal
 */

import { useEffect, useMemo, useState } from "react";
import PixelArrayDisplay from "./components/array/PixelArrayDisplay.jsx";
import StackVisualizer from "./components/stack/StackVisualizer.jsx";
import QueueVisualizer from "./components/queue/QueueVisualizer.jsx";
import LinkedListVisualizer from "./components/linkedlist/LinkedListVisualizer.jsx";
import SortingVisualizer from "./components/sorting/SortingVisualizer.jsx";
import BinaryTreeVisualizer from "./components/tree/BinaryTreeVisualizer.jsx";
import GraphVisualizer from "./components/graph/GraphVisualizer.jsx";
import PathfindingVisualizer from "./components/pathfinding/PathfindingVisualizer.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";

function App() {
  const [mode, setMode] = useState("sorting");
  const [displayMode, setDisplayMode] = useState("sorting");
  const [transitionPhase, setTransitionPhase] = useState("idle");
  const [transitionOrigin, setTransitionOrigin] = useState({ x: 0, y: 0 });

  const initialArray = useMemo(() => [20, 3, 20, 6], []);
  const [array, setArray] = useState(initialArray);

  const [value, setValue] = useState("");
  const [index, setIndex] = useState("");
  const [createInput, setCreateInput] = useState("20,3,20,6");

  const [history, setHistory] = useState([
    {
      id: 1,
      label: "create [20, 3, 20, 6]",
      snapshot: [20, 3, 20, 6],
    },
  ]);

  const [selectedHistoryId, setSelectedHistoryId] = useState(1);

  const [activeIndex, setActiveIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [animatedIndex, setAnimatedIndex] = useState(null);

  const [message, setMessage] = useState("System ready.");
  const [lastAction, setLastAction] = useState("idle");

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
      ].slice(0, 12);

      setSelectedHistoryId(nextId);
      return next;
    });
  };

  const triggerAnimation = (targetIndex, actionType, text) => {
    setActiveIndex(targetIndex);
    setAnimatedIndex(targetIndex);
    setLastAction(actionType);
    setMessage(text);

    window.clearTimeout(window.__pixelActionTimeout__);
    window.__pixelActionTimeout__ = window.setTimeout(() => {
      setAnimatedIndex(null);
      setLastAction("idle");
    }, 1000);
  };

  const parseCreateInput = () => {
    if (!createInput.trim()) return [];

    const parts = createInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const numbers = parts.map(Number);

    if (numbers.some(Number.isNaN)) {
      return null;
    }

    return numbers;
  };

  const handleCreate = () => {
    const parsed = parseCreateInput();

    if (parsed === null) {
      setMessage("Invalid create input. Use comma-separated numbers only.");
      return;
    }

    setArray(parsed);
    setActiveIndex(null);
    setAnimatedIndex(null);
    setLastAction("create");
    setMessage(`Created array with ${parsed.length} element${parsed.length === 1 ? "" : "s"}.`);
    addHistory(`create [${parsed.join(", ")}]`, parsed);
  };

  const handleInsert = () => {
    const parsedValue = Number(value);
    const parsedIndex = Number(index);

    if (value === "" || index === "" || Number.isNaN(parsedValue) || Number.isNaN(parsedIndex)) {
      setMessage("Enter a valid value and index for insert.");
      return;
    }

    if (parsedIndex < 0 || parsedIndex > array.length) {
      setMessage(
        `Insert index out of range. Current size is ${array.length}. Allowed range: 0 to ${array.length}.`
      );
      return;
    }

    const next = [...array];
    next.splice(parsedIndex, 0, parsedValue);

    setArray(next);
    addHistory(`insert(${parsedIndex}, ${parsedValue})`, next);
    triggerAnimation(
      parsedIndex,
      "insert",
      `Inserted ${parsedValue} at index ${parsedIndex}. Elements shifted right.`
    );

    setValue("");
    setIndex("");
  };

  const handleDelete = () => {
    const parsedIndex = Number(index);

    if (index === "" || Number.isNaN(parsedIndex)) {
      setMessage("Enter a valid index for delete.");
      return;
    }

    if (array.length === 0) {
      setMessage("Array is empty. Nothing to delete.");
      return;
    }

    if (parsedIndex < 0 || parsedIndex >= array.length) {
      setMessage(
        `Delete index out of range. Current size is ${array.length}. Allowed range: 0 to ${array.length - 1}.`
      );
      return;
    }

    const removed = array[parsedIndex];

    setActiveIndex(parsedIndex);
    setAnimatedIndex(parsedIndex);
    setLastAction("delete");
    setMessage(`Deleting value ${removed} from index ${parsedIndex}...`);

    window.clearTimeout(window.__pixelDeleteTimeout__);
    window.__pixelDeleteTimeout__ = window.setTimeout(() => {
      setArray((prev) => {
        const next = [...prev];
        next.splice(parsedIndex, 1);
        addHistory(`delete(${parsedIndex})`, next);
        return next;
      });

      setMessage(`Deleted value ${removed} from index ${parsedIndex}. Elements shifted left.`);
      setAnimatedIndex(null);
      setLastAction("idle");
    }, 900);

    setIndex("");
  };

  const handleUpdate = () => {
    const parsedValue = Number(value);
    const parsedIndex = Number(index);

    if (value === "" || index === "" || Number.isNaN(parsedValue) || Number.isNaN(parsedIndex)) {
      setMessage("Enter a valid value and index for update.");
      return;
    }

    if (array.length === 0) {
      setMessage("Array is empty. Nothing to update.");
      return;
    }

    if (parsedIndex < 0 || parsedIndex >= array.length) {
      setMessage(
        `Update index out of range. Current size is ${array.length}. Allowed range: 0 to ${array.length - 1}.`
      );
      return;
    }

    const oldValue = array[parsedIndex];
    const next = [...array];
    next[parsedIndex] = parsedValue;

    setArray(next);
    addHistory(`update(${parsedIndex}, ${parsedValue})`, next);
    triggerAnimation(
      parsedIndex,
      "update",
      `Updated index ${parsedIndex} from ${oldValue} to ${parsedValue}.`
    );

    setValue("");
    setIndex("");
  };

  const handleReset = () => {
    setArray(initialArray);
    setCreateInput(initialArray.join(","));
    setActiveIndex(null);
    setAnimatedIndex(null);
    setLastAction("reset");
    setMessage("Array reset to initial values.");
    addHistory("reset()", initialArray);
  };

  const handleClear = () => {
    setArray([]);
    setActiveIndex(null);
    setAnimatedIndex(null);
    setLastAction("clear");
    setMessage("Array cleared.");
    addHistory("clear()", []);
  };

  const handleRandomize = () => {
    const size = Math.floor(Math.random() * 5) + 4;
    const randomArray = Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10);

    setArray(randomArray);
    setCreateInput(randomArray.join(","));
    setActiveIndex(null);
    setAnimatedIndex(null);
    setLastAction("create");
    setMessage("Generated random array.");
    addHistory(`random [${randomArray.join(", ")}]`, randomArray);
  };

  const handleSelectIndex = (selectedIndexValue) => {
    setIndex(String(selectedIndexValue));
    setActiveIndex(selectedIndexValue);
    setMessage(`Selected index ${selectedIndexValue}.`);
  };

  const handleRestoreHistory = (historyItem) => {
    setArray([...historyItem.snapshot]);
    setCreateInput(historyItem.snapshot.join(","));
    setSelectedHistoryId(historyItem.id);
    setActiveIndex(null);
    setAnimatedIndex(null);
    setLastAction("restore");
    setMessage(`Restored state: ${historyItem.label}`);
  };

  const handleValueEnter = (e) => {
    if (e.key === "Enter" && index !== "" && value !== "") {
      handleUpdate();
    }
  };

  const handleIndexEnter = (e) => {
    if (e.key === "Enter") {
      if (value !== "" && index !== "") {
        handleInsert();
      } else if (value === "" && index !== "") {
        handleDelete();
      }
    }
  };

  const handleModeChange = (nextMode, event) => {
    if (nextMode === mode || transitionPhase !== "idle") return;

    const rect = event.currentTarget.getBoundingClientRect();
    setTransitionOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });

    setMode(nextMode);
    setTransitionPhase("out");

    window.clearTimeout(window.__pageSwitchMidTimeout__);
    window.clearTimeout(window.__pageSwitchDoneTimeout__);

    window.__pageSwitchMidTimeout__ = window.setTimeout(() => {
      setDisplayMode(nextMode);
      setTransitionPhase("in");
    }, 240);

    window.__pageSwitchDoneTimeout__ = window.setTimeout(() => {
      setTransitionPhase("idle");
    }, 840);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(window.__pixelActionTimeout__);
      window.clearTimeout(window.__pixelDeleteTimeout__);
      window.clearTimeout(window.__pageSwitchMidTimeout__);
      window.clearTimeout(window.__pageSwitchDoneTimeout__);
    };
  }, []);

  const scanFragments = Array.from({ length: 20 }, (_, indexValue) => indexValue);

  const renderArrayPage = () => (
    <>
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / ARRAY LAB</p>
        <h1>ARRAY VISUALIZER</h1>
        <p className="subtitle">
          Click blocks, target indexes, manipulate the array, and restore any past state from
          history.
        </p>
      </section>

      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">CREATE / INPUT</div>

        <div className="controls-grid controls-grid-create">
          <div className="field">
            <label>CREATE ARRAY</label>
            <input
              type="text"
              value={createInput}
              onChange={(e) => setCreateInput(e.target.value)}
              placeholder="e.g. 4,7,2,9"
            />
          </div>

          <button className="pixel-btn" onClick={handleCreate} type="button">
            CREATE
          </button>

          <button className="pixel-btn" onClick={handleRandomize} type="button">
            RANDOM
          </button>

          <button className="pixel-btn ghost" onClick={handleClear} type="button">
            CLEAR
          </button>
        </div>
      </section>

      <section className="control-panel stage-block stage-delay-3">
        <div className="panel-title">OPERATIONS</div>

        <div className="controls-grid">
          <div className="field">
            <label>VALUE</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleValueEnter}
              placeholder="e.g. 8"
            />
          </div>

          <div className="field">
            <label>INDEX</label>
            <input
              type="number"
              value={index}
              onChange={(e) => setIndex(e.target.value)}
              onKeyDown={handleIndexEnter}
              placeholder="e.g. 2"
            />
          </div>

          <button className="pixel-btn" onClick={handleInsert} type="button">
            INSERT
          </button>

          <button className="pixel-btn" onClick={handleDelete} disabled={array.length === 0} type="button">
            DELETE
          </button>

          <button className="pixel-btn" onClick={handleUpdate} disabled={array.length === 0} type="button">
            UPDATE
          </button>

          <button className="pixel-btn ghost" onClick={handleReset} type="button">
            RESET
          </button>
        </div>
      </section>

      <section className="visual-panel stage-block stage-delay-4">
        <div className="visual-header">
          <div className="panel-title">ARRAY DISPLAY</div>
          <div className="visual-hint">Click a block to target its index. Hover to inspect.</div>
        </div>

        <PixelArrayDisplay
          array={array}
          activeIndex={activeIndex}
          hoverIndex={hoverIndex}
          animatedIndex={animatedIndex}
          onHoverIndex={setHoverIndex}
          onSelectIndex={handleSelectIndex}
          lastAction={lastAction}
        />
      </section>

      <section className="dashboard-grid stage-block stage-delay-5">
        <div className="info-card">
          <div className="panel-title">STATE</div>

          <div className="info-list">
            <div className="info-row">
              <span>SIZE</span>
              <strong>{array.length}</strong>
            </div>

            <div className="info-row">
              <span>ACTIVE INDEX</span>
              <strong>{activeIndex === null ? "--" : activeIndex}</strong>
            </div>

            <div className="info-row">
              <span>HOVER INDEX</span>
              <strong>{hoverIndex === null ? "--" : hoverIndex}</strong>
            </div>

            <div className="info-row">
              <span>LAST MESSAGE</span>
              <strong className="message-text">{message}</strong>
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="panel-title">TIME COMPLEXITY</div>

          <div className="complexity-list">
            <div>ACCESS : O(1)</div>
            <div>SEARCH : O(n)</div>
            <div>INSERT : O(n)</div>
            <div>DELETE : O(n)</div>
          </div>
        </div>

        <div className="info-card">
          <div className="panel-title">HISTORY (CLICK TO RESTORE)</div>

          <div className="history-list">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`history-item ${selectedHistoryId === item.id ? "is-selected" : ""}`}
                onClick={() => handleRestoreHistory(item)}
              >
                <span className="history-label">{item.label}</span>
                <span className="history-snapshot">[{item.snapshot.join(", ")}]</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const renderActivePage = () => {
    if (displayMode === "array") {
      return renderArrayPage();
    }

    if (displayMode === "stack") {
      return <StackVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "queue") {
      return <QueueVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "linked-list") {
      return <LinkedListVisualizer pagePhase={transitionPhase} />;
    }
    if (displayMode === "tree") return <BinaryTreeVisualizer pagePhase={transitionPhase} />;
    if (displayMode === "graph") return <GraphVisualizer pagePhase={transitionPhase} />;
    if (displayMode === "pathfinding") return <PathfindingVisualizer pagePhase={transitionPhase} />;
    if (displayMode === "analytics") return <AnalyticsDashboard pagePhase={transitionPhase} />;

    return <SortingVisualizer pagePhase={transitionPhase} />;
  };

  return (
    <div className="app-shell">
      <div className="pixel-noise" />
      <div className="pink-glow pink-glow-one" />
      <div className="pink-glow pink-glow-two" />

      <div
        className={`page-energy-layer ${transitionPhase !== "idle" ? "is-active" : ""}`}
        style={{
          "--energy-x": `${transitionOrigin.x}px`,
          "--energy-y": `${transitionOrigin.y}px`,
        }}
      >
        <div className="page-energy-core" />
        <div className="page-energy-ring" />
        <div className="page-energy-scanline" />
        <div className="page-energy-fragments">
          {scanFragments.map((fragment) => (
            <span
              key={fragment}
              className="page-energy-fragment"
              style={{
                top: `${14 + (fragment % 10) * 7}%`,
                animationDelay: `${fragment * 18}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <header className="topbar">
        <div className="brand">DSA VISUALIZER</div>

        <nav className="nav">
          <button
            className={`nav-link ${mode === "array" ? "active" : ""}`}
            onClick={(event) => handleModeChange("array", event)}
            type="button"
          >
            ARRAY
          </button>

          <button
            className={`nav-link ${mode === "stack" ? "active" : ""}`}
            onClick={(event) => handleModeChange("stack", event)}
            type="button"
          >
            STACK
          </button>

          <button
            className={`nav-link ${mode === "queue" ? "active" : ""}`}
            onClick={(event) => handleModeChange("queue", event)}
            type="button"
          >
            QUEUE
          </button>

          <button
            className={`nav-link ${mode === "linked-list" ? "active" : ""}`}
            onClick={(event) => handleModeChange("linked-list", event)}
            type="button"
          >
            LINKED LIST
          </button>


          <button
            className={`nav-link ${mode === "sorting" ? "active" : ""}`}
            onClick={(event) => handleModeChange("sorting", event)}
            type="button"
          >
            SORTING
          </button>

          <button className={`nav-link ${mode === "tree" ? "active" : ""}`} onClick={(event) => handleModeChange("tree", event)} type="button">TREE</button>
          <button className={`nav-link ${mode === "graph" ? "active" : ""}`} onClick={(event) => handleModeChange("graph", event)} type="button">GRAPH</button>
          <button className={`nav-link ${mode === "pathfinding" ? "active" : ""}`} onClick={(event) => handleModeChange("pathfinding", event)} type="button">PATH</button>
          <button className={`nav-link ${mode === "analytics" ? "active" : ""}`} onClick={(event) => handleModeChange("analytics", event)} type="button">ANALYTICS</button>
        </nav>
      </header>

      <main className={`page page-transition-${transitionPhase}`}>
        <div key={displayMode} className={`page-mode-shell page-mode-shell-${transitionPhase}`}>
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
}

export default App;