import { useState } from "react";

function TerminalConsole({ onRunScript, isRunning }) {
  const [code, setCode] = useState(`// INITIALIZE SYSTEM
const list = new LinkedList();

// ENTER COMMANDS
list.append(10);
list.append(20);
list.prepend(5);
`);

  return (
    <div className="info-card terminal-panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="panel-title" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>ROOT TERMINAL</span>
        <span style={{ color: "var(--pink-glow)" }}>{isRunning ? "EXECUTING..." : "READY"}</span>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        style={{
          backgroundColor: "#050505",
          color: "#e0e0e0",
          fontFamily: "monospace",
          fontSize: "12px",
          border: "1px solid #333",
          padding: "10px",
          height: "150px",
          width: "100%",
          marginTop: "10px",
          resize: "none",
          outline: "none",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--pink-glow)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#333";
        }}
      />

      <button
        className="pixel-btn"
        type="button"
        onClick={() => onRunScript(code)}
        disabled={isRunning}
        style={{
          marginTop: "10px",
          alignSelf: "flex-end",
          borderColor: "var(--pink-glow)",
          color: "var(--pink-glow)",
        }}
      >
        {isRunning ? "RUNNING..." : "EXECUTE SCRIPT"}
      </button>
    </div>
  );
}

export default TerminalConsole;
