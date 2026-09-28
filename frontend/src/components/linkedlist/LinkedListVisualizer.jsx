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
import { sounds } from "../utils/audioEngine.js";
import { io } from "socket.io-client";
import LinkedListStage from "./LinkedListStage.jsx";
import { logRun } from "../../utils/logRun.js";
import { getSessionId } from "../../utils/session.js";
import { AUTH_FETCH_OPTIONS, API_BASE } from "../../services/api.js";

// Socket.io can't go through the same-origin Vercel proxy the REST API_BASE
// (imported above) relies on in production - see services/api.js for why REST
// calls need that proxy for the auth cookie to survive. A websocket connection
// isn't proxied the same way, so it always needs the backend's real absolute
// origin. Set VITE_SOCKET_URL to the deployed backend URL (e.g. the Render URL);
// it falls back to localhost for local dev where frontend and backend run on
// different ports anyway.
const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";
import TerminalConsole from "../shared/TerminalConsole.jsx";
import TimeScrubber from "../shared/TimeScrubber.jsx";
import {
  LINKED_LIST_CONCEPT_NOTES,
  LINKED_LIST_INTERVIEW_EXPLANATIONS,
  LINKED_LIST_QUIZ,
} from "../../data/linkedListLearningData.js";

function LinkedListVisualizer({ pagePhase = "idle" }) {
  const initialValues = useMemo(() => [12, 24, 36, 48], []);
  const nodeIdRef = useRef(initialValues.length + 1);
  const timeoutIdsRef = useRef([]);
  const nodesRef = useRef([]);
  const isBusyRef = useRef(false);
  const isExecutingCodeRef = useRef(false);
  const operationQueueRef = useRef(Promise.resolve());
  // Holds the latest handleAppend/handlePrepend/etc. closures, refreshed every
  // render (see the assignment right before the return). The socket effect
  // below only connects once ([] deps - reconnecting on every render would be
  // wrong), so its "receive-operation" listener can't close over these
  // handlers directly or it would call the stale first-render versions for
  // the entire lifetime of the connection. Routing through this ref instead
  // means it always calls whichever version is current when a remote op
  // actually arrives.
  const handlersRef = useRef({});

  const buildNode = (value) => ({
    id: `linked-node-${nodeIdRef.current++}`,
    value,
  });

  const buildNodesFromValues = (values) => values.map((value) => buildNode(value));

  const formatChain = (values) =>
    values.length > 0 ? `HEAD → ${values.join(" → ")} → NULL` : "HEAD → NULL";

  const [nodes, setNodes] = useState(() =>
    initialValues.map((value, i) => ({ id: `linked-node-${i + 1}`, value }))
  );

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
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [inRoom, setInRoom] = useState(false);

  const syncNodeIdRef = (nodeList) => {
    const maxSuffix = nodeList.reduce((maxId, node) => {
      if (typeof node?.id !== "string") return maxId;

      const matched = node.id.match(/linked-node-(\d+)/);
      if (!matched) return maxId;

      return Math.max(maxId, Number(matched[1]));
    }, 0);

    nodeIdRef.current = maxSuffix + 1;
  };

  const normalizeSavedNodes = (savedState) => {
    if (!Array.isArray(savedState)) return [];

    return savedState
      .map((item) => {
        if (item && typeof item === "object" && "value" in item) {
          return {
            id:
              typeof item.id === "string" && item.id.trim() !== ""
                ? item.id
                : `linked-node-${nodeIdRef.current++}`,
            value: item.value,
          };
        }

        if (typeof item === "number") {
          return buildNode(item);
        }

        return null;
      })
      .filter(Boolean);
  };

  const normalizeSavedHistory = (savedHistory) => {
    if (!Array.isArray(savedHistory)) return [];

    return savedHistory
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;

        const snapshotSource = Array.isArray(item.snapshot)
          ? item.snapshot
          : Array.isArray(item.currentState)
            ? item.currentState
            : [];

        const snapshot = snapshotSource
          .map((entry) => (entry && typeof entry === "object" && "value" in entry ? entry.value : entry))
          .filter((value) => typeof value === "number");

        const fallbackId = savedHistory.length - index;

        return {
          id: typeof item.id === "number" ? item.id : fallbackId,
          label: typeof item.label === "string" && item.label.trim() !== "" ? item.label : `snapshot ${fallbackId}`,
          snapshot,
        };
      })
      .filter(Boolean);
  };

  const values = nodes.map((node) => node.value);
  const controlsDisabled = isBusy || isExecutingCode;

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
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    isExecutingCodeRef.current = isExecutingCode;
  }, [isExecutingCode]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        // BUG FIXED: this used to hit the literal path .../guest-session/LinkedList -
        // one shared save slot for every visitor. getSessionId() is a real per-browser
        // id; a logged-in user's session cookie (if any) overrides it server-side to
        // their own account - see resolveSessionId() in simulationController.js.
        const response = await fetch(`${API_BASE}/api/simulations/${getSessionId()}/LinkedList`, {
          credentials: AUTH_FETCH_OPTIONS.credentials,
        });

        if (!response.ok) {
          if (response.status !== 404) {
            console.error(`SYSTEM ERROR: Failed to read from core memory. Status ${response.status}.`);
          }
          return;
        }

        const data = await response.json();

        if (!data.success || !data.data) return;

        const restoredNodes = normalizeSavedNodes(data.data.currentState);
        const restoredHistory = normalizeSavedHistory(data.data.history);
        const restoredIndex = restoredNodes.length > 0 ? 0 : null;

        syncNodeIdRef(restoredNodes);
        nodesRef.current = restoredNodes;
        setNodes(restoredNodes);

        if (restoredHistory.length > 0) {
          setHistory(restoredHistory);
          setSelectedHistoryId(restoredHistory[0].id);
        }

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
        setValueInput(restoredIndex === null ? "" : String(restoredNodes[restoredIndex]?.value ?? ""));
        setFindInput("");
        setInterviewTopic("overview");

        const restoredValues = restoredNodes.map((node) => node.value);
        setLearningPanels({
          beforeValues: restoredValues,
          afterValues: restoredValues,
          caption:
            restoredValues.length > 0
              ? "Saved simulation memory restored. The linked list and timeline are back in place."
              : "Saved simulation memory restored. HEAD is currently pointing to NULL.",
          focus: "reset",
          detail:
            "Saved state restore rebuilds the linked-list teaching view from persisted simulation data.",
        });
        setOperationLabel("RESTORED");
        setOperationHint("The most recently saved simulation state was loaded from the backend.");
        setMessage("SYSTEM: Previous simulation state restored.");
      } catch (error) {
        console.error("SYSTEM ERROR: Failed to read from core memory.", error);
      }
    };

    loadSavedState();
  }, []);

  useEffect(() => {
    const newSocket = io(SOCKET_BASE);
    setSocket(newSocket);

    newSocket.on("receive-operation", (data) => {
      enqueueOperation(async () => {
        const handlers = handlersRef.current;

        if (data.operation === "APPEND") {
          await handlers.handleAppend(data.value, true);
          return;
        }

        if (data.operation === "PREPEND") {
          await handlers.handlePrepend(data.value, true);
          return;
        }

        if (data.operation === "DELETE_AT") {
          await handlers.handleDeleteAt(data.index, true);
          return;
        }

        if (data.operation === "DELETE") {
          const deleteIndex = nodesRef.current.findIndex((node) => node.value === data.value);

          if (deleteIndex !== -1) {
            await handlers.handleDeleteAt(deleteIndex, true);
          }
          return;
        }

        if (data.operation === "CLEAR") {
          await handlers.handleClear(true);
          return;
        }

        if (data.operation === "RESET") {
          await handlers.handleReset(true);
        }
      });
    });

    newSocket.on("user-joined", (data) => {
      setOperationLabel("COLLAB ONLINE");
      setOperationHint("A teammate joined your shared lab room.");
      setMessage(data.message || "A new engineer has joined the lab.");
    });

    return () => {
      newSocket.close();
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

  const getCurrentValues = () => nodesRef.current.map((node) => node.value);

  const enqueueOperation = (operationFn) => {
    const queued = operationQueueRef.current.then(operationFn, operationFn);
    operationQueueRef.current = queued.catch(() => {});
    return queued;
  };

  const emitOperation = (payload) => {
    if (!socket || !inRoom) return;
    socket.emit("send-operation", payload);
  };

  const pulseFocusLock = (index) => {
    setFocusLockIndex(index);
    schedule(() => {
      setFocusLockIndex((prev) => (prev === index ? null : prev));
    }, 700);
  };

  const prepareOperation = () => {
    if (isBusyRef.current) return false;

    clearAllTimers();
    isBusyRef.current = true;
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

  const parseIndex = ({ allowEnd = false, rawIndex = indexInput, currentNodes = nodesRef.current } = {}) => {
    if (String(rawIndex).trim() === "") {
      setMessage("Enter an index first.");
      setOperationLabel("INPUT NEEDED");
      setOperationHint("Pick a node index before running this action.");
      return null;
    }

    const parsed = Number(rawIndex);

    if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      setMessage("Index must be a whole number.");
      setOperationLabel("INVALID INPUT");
      setOperationHint("Indexes in this visualizer are whole numbers only.");
      return null;
    }

    if (!allowEnd && currentNodes.length === 0) {
      setMessage("The list is empty, so there is no valid node index yet.");
      setOperationLabel("EMPTY LIST");
      setOperationHint("Append or prepend to create the first node.");
      return null;
    }

    const upperBound = allowEnd ? currentNodes.length : currentNodes.length - 1;

    if (parsed < 0 || parsed > upperBound) {
      setMessage(
        allowEnd
          ? `Index out of range. For insertAt, use 0 to ${currentNodes.length}.`
          : `Index out of range. For this list, use 0 to ${currentNodes.length - 1}.`
      );
      setOperationLabel("OUT OF RANGE");
      setOperationHint(
        allowEnd
          ? `Insert positions allowed: 0 to ${currentNodes.length}.`
          : `Node indexes allowed: 0 to ${currentNodes.length - 1}.`
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
      sounds.traverseStep(index);
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

  const handleAppend = async (rawValue = valueInput, isRemote = false) => {
    const parsedValue = parseNumericValue(rawValue, "value");
    if (parsedValue === null) return;
    if (!prepareOperation()) return;

    const beforeValues = getCurrentValues();
    const currentNodes = [...nodesRef.current];
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

      sounds.nodeCreate();
      const nextNodes = [...nodesRef.current, buildNode(parsedValue)];
      nodesRef.current = nextNodes;
      setNodes(nextNodes);
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

      if (!isRemote) {
        emitOperation({
          roomId,
          operation: "APPEND",
          value: parsedValue,
        });
      }

      await wait(320);
      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
    }
  };

  const handlePrepend = async (rawValue = valueInput, isRemote = false) => {
    const parsedValue = parseNumericValue(rawValue, "value");
    if (parsedValue === null) return;
    if (!prepareOperation()) return;

    const beforeValues = getCurrentValues();
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

      sounds.nodeCreate();
      const nextNodes = [buildNode(parsedValue), ...nodesRef.current];
      nodesRef.current = nextNodes;
      setNodes(nextNodes);
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

      if (!isRemote) {
        emitOperation({
          roomId,
          operation: "PREPEND",
          value: parsedValue,
        });
      }

      await wait(320);
      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      isBusyRef.current = false;
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

      sounds.nodeCreate();
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

  const handleDeleteAt = async (rawIndex = indexInput, isRemote = false) => {
    if (nodesRef.current.length === 0) {
      sounds.error();
      setMessage("The list is empty. There is nothing to delete.");
      setOperationLabel("EMPTY LIST");
      setOperationHint("Append or prepend to create nodes first.");
      return;
    }

    const parsedIndex = parseIndex({ rawIndex });
    if (parsedIndex === null) return;
    if (!prepareOperation()) return;

    const beforeValues = getCurrentValues();
    const currentNodes = [...nodesRef.current];
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
      sounds.nodeRemove();
      setMessage(`Unlinking node ${parsedIndex} with value ${removedValue}...`);
      setOperationLabel("UNLINKING");
      setOperationHint("The target node is being detached from the chain.");

      await wait(280);

      const nextNodes = nodesRef.current.filter((_, index) => index !== parsedIndex);
      nodesRef.current = nextNodes;
      setNodes(nextNodes);

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

      if (!isRemote) {
        emitOperation({
          roomId,
          operation: "DELETE_AT",
          index: parsedIndex,
          value: removedValue,
        });
      }

      setPendingAction("idle");
      setPendingIndex(null);
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
    }
  };

  const handleUpdateAt = async () => {
    if (nodes.length === 0) {
      sounds.error();
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

      sounds.arrayUpdate();
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
      sounds.error();
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
        sounds.traverseStep(index);
        setMessage(`Searching for ${targetValue}. Checking node ${index} with value ${currentNodes[index].value}.`);
        await wait(190);

        if (currentNodes[index].value === targetValue) {
          locatedIndex = index;
          break;
        }
      }

      if (locatedIndex !== null) {
        setFoundIndex(locatedIndex);
        sounds.found();
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
        sounds.notFound();
        setOperationLabel("NOT FOUND");
        setOperationHint("Traversal reached NULL without finding the value.");
        setMessage(`Value ${targetValue} was not found before reaching NULL.`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleClear = async (isRemote = false) => {
    if (!prepareOperation()) return;

    const beforeValues = getCurrentValues();

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

      sounds.nodeRemove();
      nodesRef.current = [];
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

      if (!isRemote) {
        emitOperation({
          roomId,
          operation: "CLEAR",
        });
      }

      setPendingAction("idle");
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
    }
  };

  const handleReset = async (isRemote = false) => {
    if (!prepareOperation()) return;

    const beforeValues = getCurrentValues();
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
      sounds.toggle();
      const resetNodes = buildNodesFromValues(resetValues);
      nodesRef.current = resetNodes;
      setNodes(resetNodes);
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

      if (!isRemote) {
        emitOperation({
          roomId,
          operation: "RESET",
        });
      }

      await wait(200);
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
    }
  };

  const handleRestoreHistory = (historyItem) => {
    if (isBusy) return;

    clearAllTimers();

    const restoredValues = [...historyItem.snapshot];
    const restoredNodes = buildNodesFromValues(restoredValues);
    const restoredIndex = restoredValues.length > 0 ? 0 : null;

    nodesRef.current = restoredNodes;
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

  const handleSaveToDatabase = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/simulations/save`, {
        method: "POST",
        credentials: AUTH_FETCH_OPTIONS.credentials,
        headers: {
          "Content-Type": "application/json",
          ...AUTH_FETCH_OPTIONS.csrfHeader,
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          dataStructure: "LinkedList",
          currentState: nodes,
          history,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("SYSTEM: Simulation state successfully written to core memory.");
        logRun({
          algorithm: "manual-ops",
          visualizer: "Linked List",
          inputSize: nodes.length,
          steps: history.length,
        });
        setOperationLabel("STATE SAVED");
        setOperationHint("The current linked-list snapshot is now persisted in the database.");
        setMessage("Saved the current linked-list state to the backend.");
      } else {
        throw new Error(data.message || "Save failed.");
      }
    } catch (error) {
      console.error("SYSTEM ERROR: Failed to write to memory.", error);
      setOperationLabel("SAVE FAILED");
      setOperationHint("The frontend could not persist the simulation state right now.");
      setMessage("Could not connect to the database to save this state.");
    }
  };

  const handleJoinRoom = () => {
    const normalizedRoomId = roomId.trim();

    if (!socket || !normalizedRoomId) return;

    socket.emit("join-room", normalizedRoomId);
    setRoomId(normalizedRoomId);
    setInRoom(true);
    setOperationLabel("CHANNEL OPEN");
    setOperationHint(`Connected to collaborative lab room [${normalizedRoomId}].`);
    setMessage(`Joined channel ${normalizedRoomId}.`);
  };

  const handleExecuteCode = async (rawCode) => {
    if (controlsDisabled) return;

    setIsExecutingCode(true);
    isExecutingCodeRef.current = true;
    setOperationLabel("COMPILING");
    setOperationHint("Sending your script to the execution sandbox.");
    setMessage("SYSTEM: Compiling linked-list script.");

    try {
      const response = await fetch(`${API_BASE}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_FETCH_OPTIONS.csrfHeader },
        body: JSON.stringify({
          code: rawCode,
          dataStructure: "LinkedList",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.message || "Execution failed.");
      }

      setOperationLabel("SCRIPT READY");
      setOperationHint("Sandbox instructions received. Replaying them into the visualizer.");
      setMessage(`SYSTEM: ${data.operations.length} instruction(s) loaded for playback.`);

      for (const operation of data.operations) {
        await wait(800);

        await enqueueOperation(async () => {
          if (operation.type === "INIT") {
            await handleClear();
            return;
          }

          if (operation.type === "APPEND") {
            await handleAppend(operation.value);
            return;
          }

          if (operation.type === "PREPEND") {
            await handlePrepend(operation.value);
            return;
          }

          if (operation.type === "DELETE") {
            const deleteIndex = nodesRef.current.findIndex((node) => node.value === operation.value);

            if (deleteIndex === -1) {
              setOperationLabel("DELETE SKIPPED");
              setOperationHint("The sandbox requested a delete for a value that is not in the list.");
              setMessage(`Delete skipped. Value ${operation.value} was not found in the current chain.`);
              return;
            }

            await handleDeleteAt(deleteIndex);
            return;
          }

          if (operation.type === "LOG") {
            setOperationLabel("SCRIPT LOG");
            setOperationHint("Console output captured from the sandbox.");
            setMessage(String(operation.value));
          }
        });
      }

      setOperationLabel("SCRIPT COMPLETE");
      setOperationHint("All sandbox operations have been replayed.");
      setMessage("SYSTEM: Script execution completed successfully.");
    } catch (error) {
      console.error("Execution failed", error);
      setOperationLabel("COMPILER ERROR");
      setOperationHint("The execution sandbox rejected the submitted script.");
      setMessage(`COMPILER ERROR: ${error.message}`);
    } finally {
      isExecutingCodeRef.current = false;
      setIsExecutingCode(false);
    }
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

  // Refreshed after every render via the effect below (not written directly
  // in the render body - a plain ref write during render works today, but
  // isn't guaranteed safe under React's rules; an effect with no dependency
  // array is the canonical way to keep a ref current on every render without
  // re-running anything else).
  useEffect(() => {
    handlersRef.current = { handleAppend, handlePrepend, handleDeleteAt, handleClear, handleReset };
  });

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

        <div className="controls-row">
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

          <button className="pixel-btn" type="button" onClick={() => handleAppend()} disabled={controlsDisabled}>
            APPEND
          </button>

          <button className="pixel-btn" type="button" onClick={() => handlePrepend()} disabled={controlsDisabled}>
            PREPEND
          </button>

          <button className="pixel-btn" type="button" onClick={handleInsertAt} disabled={controlsDisabled}>
            INSERT AT
          </button>

          <button className="pixel-btn" type="button" onClick={handleFind} disabled={controlsDisabled}>
            FIND
          </button>

          <button
            className="pixel-btn"
            type="button"
            onClick={handleSaveToDatabase}
            disabled={controlsDisabled}
            style={{ borderColor: "var(--pink-glow)", color: "var(--pink-glow)" }}
          >
            SAVE STATE
          </button>
        </div>
      </section>

      <section className="control-panel stage-block stage-delay-3">
        <div className="panel-title">EDIT / RESET OPERATIONS</div>

        <div className="controls-grid linked-secondary-grid">
          <div className="linked-secondary-note">Click any node to preload its index and current value.</div>

          <button className="pixel-btn" type="button" onClick={handleUpdateAt} disabled={controlsDisabled}>
            UPDATE AT
          </button>

          <button className="pixel-btn" type="button" onClick={() => handleDeleteAt()} disabled={controlsDisabled}>
            DELETE AT
          </button>

          <button className="pixel-btn ghost" type="button" onClick={() => handleClear()} disabled={controlsDisabled}>
            CLEAR
          </button>

          <button className="pixel-btn ghost" type="button" onClick={() => handleReset()} disabled={controlsDisabled}>
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

        <div className="info-card multiplayer-panel" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>COLLAB CHANNEL</span>
            <span style={{ color: inRoom ? "var(--pink-glow)" : "#666" }}>
              {inRoom ? `CONNECTED: [${roomId}]` : "OFFLINE"}
            </span>
          </div>

          {!inRoom ? (
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="ENTER ROOM ID (e.g. LAB-01)"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: "#050505",
                  color: "#fff",
                  border: "1px solid #333",
                  padding: "8px",
                  fontFamily: "monospace",
                }}
              />
              <button className="pixel-btn" type="button" onClick={handleJoinRoom}>
                CONNECT
              </button>
            </div>
          ) : (
            <div style={{ color: "#aaa", fontSize: "12px" }}>
              Live socket connection established. Awaiting remote instructions...
            </div>
          )}
        </div>

        <TerminalConsole onRunScript={handleExecuteCode} isRunning={isExecutingCode} />

        <TimeScrubber
          history={history}
          selectedHistoryId={selectedHistoryId}
          onScrub={handleRestoreHistory}
        />

        <div className="info-card linked-history-panel">
          <div className="panel-title">HISTORY (CLICK TO RESTORE)</div>

          <div className="history-list">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`history-item ${selectedHistoryId === item.id ? "is-selected" : ""}`}
                onClick={() => handleRestoreHistory(item)}
                disabled={controlsDisabled}
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
