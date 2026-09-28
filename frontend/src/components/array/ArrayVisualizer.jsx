/**
 * frontend/src/components/array/ArrayVisualizer.jsx
 *
 * Array visualizer page - extracted out of App.jsx, which used to own this
 * logic inline while every other data structure (Stack, Queue, LinkedList,
 * Sorting, Graph, Tree, Pathfinding) already had its own component. Array was
 * the one outlier still living in the root component alongside routing/nav
 * state; this brings it in line with the rest of the app's structure.
 *
 * What it connects to:
 * - Uses ./PixelArrayDisplay.jsx for the visual array blocks
 *
 * What it displays:
 * - create/randomize/clear controls
 * - insert/delete/update/reset operations
 * - the pixel array display
 * - state, complexity, and clickable history panels
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { sounds } from "../utils/audioEngine.js";
import PixelArrayDisplay from "./PixelArrayDisplay.jsx";

function ArrayVisualizer({ pagePhase = "idle" }) {
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

  const actionTimeoutRef = useRef(null);
  const deleteTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      window.clearTimeout(actionTimeoutRef.current);
      window.clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

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

    window.clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = window.setTimeout(() => {
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
      sounds.error();
      setMessage("Invalid create input. Use comma-separated numbers only.");
      return;
    }

    sounds.success();
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
      sounds.error();
      setMessage("Enter a valid value and index for insert.");
      return;
    }

    if (parsedIndex < 0 || parsedIndex > array.length) {
      sounds.error();
      setMessage(
        `Insert index out of range. Current size is ${array.length}. Allowed range: 0 to ${array.length}.`
      );
      return;
    }

    const next = [...array];
    next.splice(parsedIndex, 0, parsedValue);

    sounds.arrayInsert();
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
      sounds.error();
      setMessage("Enter a valid index for delete.");
      return;
    }

    if (array.length === 0) {
      sounds.error();
      setMessage("Array is empty. Nothing to delete.");
      return;
    }

    if (parsedIndex < 0 || parsedIndex >= array.length) {
      sounds.error();
      setMessage(
        `Delete index out of range. Current size is ${array.length}. Allowed range: 0 to ${array.length - 1}.`
      );
      return;
    }

    const removed = array[parsedIndex];

    sounds.arrayDelete();
    setActiveIndex(parsedIndex);
    setAnimatedIndex(parsedIndex);
    setLastAction("delete");
    setMessage(`Deleting value ${removed} from index ${parsedIndex}...`);

    window.clearTimeout(deleteTimeoutRef.current);
    deleteTimeoutRef.current = window.setTimeout(() => {
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
      sounds.error();
      setMessage("Enter a valid value and index for update.");
      return;
    }

    if (array.length === 0) {
      sounds.error();
      setMessage("Array is empty. Nothing to update.");
      return;
    }

    if (parsedIndex < 0 || parsedIndex >= array.length) {
      sounds.error();
      setMessage(
        `Update index out of range. Current size is ${array.length}. Allowed range: 0 to ${array.length - 1}.`
      );
      return;
    }

    const oldValue = array[parsedIndex];
    const next = [...array];
    next[parsedIndex] = parsedValue;

    sounds.arrayUpdate();
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
    sounds.toggle();
    setArray(initialArray);
    setCreateInput(initialArray.join(","));
    setActiveIndex(null);
    setAnimatedIndex(null);
    setLastAction("reset");
    setMessage("Array reset to initial values.");
    addHistory("reset()", initialArray);
  };

  const handleClear = () => {
    sounds.arrayDelete();
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

    sounds.success();
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

  return (
    <div className={`array-page array-page-phase-${pagePhase}`}>
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
    </div>
  );
}

export default ArrayVisualizer;
