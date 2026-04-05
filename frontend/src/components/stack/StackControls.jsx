/**
 * frontend/src/components/stack/StackControls.jsx
 *
 * What this file is for:
 * - Renders the input and operation buttons for the Stack Visualizer.
 * - Adds a small interaction hint so the controls feel more guided.
 *
 * What it connects to:
 * - Receives handlers and state from ./StackVisualizer.jsx
 *
 * What it displays:
 * - value input
 * - push button
 * - pop button
 * - peek button
 * - clear button
 * - reset button
 * - control hint text
 */

function StackControls({
  inputValue,
  setInputValue,
  onPush,
  onPop,
  onPeek,
  onClear,
  onReset,
  isEmpty,
}) {
  const handleInputEnter = (e) => {
    if (e.key === "Enter") {
      onPush();
    }
  };

  return (
    <div className="controls-grid stack-controls-grid">
      <div className="field">
        <label>PUSH VALUE</label>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputEnter}
          placeholder="e.g. 18"
        />
      </div>

      <button type="button" className="pixel-btn" onClick={onPush}>
        PUSH
      </button>

      <button type="button" className="pixel-btn" onClick={onPop} disabled={isEmpty}>
        POP
      </button>

      <button type="button" className="pixel-btn" onClick={onPeek} disabled={isEmpty}>
        PEEK
      </button>

      <button type="button" className="pixel-btn ghost" onClick={onClear} disabled={isEmpty}>
        CLEAR
      </button>

      <button type="button" className="pixel-btn ghost" onClick={onReset}>
        RESET
      </button>

      <div className="stack-controls-note">
        Enter a value and press <strong>Enter</strong> or <strong>PUSH</strong>. The top element is
        always the last value added.
      </div>
    </div>
  );
}

export default StackControls;