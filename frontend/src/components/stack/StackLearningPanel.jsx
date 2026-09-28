/**
 * frontend/src/components/stack/StackLearningPanel.jsx
 *
 * What this file is for:
 * - Renders the teaching system for the Stack Visualizer.
 * - Makes the learning column feel more polished, structured, and lively.
 *
 * What it connects to:
 * - Receives explanation data, quiz data, and messages from ./StackVisualizer.jsx
 *
 * What it displays:
 * - current state summary
 * - complexity explanation
 * - before / after logic
 * - concept notes
 * - interview explanation mode
 * - mini quiz
 */

function StackLearningPanel({
  message,
  lastAction,
  logicState,
  complexity,
  conceptNotes,
  interviewExplanation,
  currentQuiz,
  quizMessage,
  quizFeedbackType,
  onQuizAnswer,
  onNextQuiz,
  currentStackText,
}) {
  return (
    <div className="stack-learning-column">
      <div className="info-card stack-card">
        <div className="panel-title">STATE / FEEDBACK</div>

        <div className="stack-state-strip">
          <div className="stack-state-tile">
            <span>CURRENT STACK</span>
            <strong>{currentStackText}</strong>
          </div>

          <div className="stack-state-tile">
            <span>ACTIVE OPERATION</span>
            <strong>{lastAction.toUpperCase()}</strong>
          </div>
        </div>

        <div className="stack-message-panel">{message}</div>
      </div>

      <div className="info-card stack-card">
        <div className="panel-title">TIME COMPLEXITY</div>

        <div className="stack-reading-row">
          <span className="stack-reading-head">{complexity.title}</span>
          <p>{complexity.description}</p>
        </div>

        <div className="stack-complexity-grid">
          <div>PUSH : O(1)</div>
          <div>POP : O(1)</div>
          <div>PEEK : O(1)</div>
          <div>CLEAR : O(n)</div>
        </div>
      </div>

      <div className="info-card stack-card">
        <div className="panel-title">BEFORE / AFTER LOGIC</div>

        <div className="stack-reading-list">
          <div className="stack-reading-row">
            <span className="stack-reading-head">BEFORE</span>
            <p>{logicState.before}</p>
          </div>

          <div className="stack-reading-row">
            <span className="stack-reading-head">ACTION</span>
            <p>{logicState.action}</p>
          </div>

          <div className="stack-reading-row">
            <span className="stack-reading-head">AFTER</span>
            <p>{logicState.after}</p>
          </div>

          <div className="stack-reading-row">
            <span className="stack-reading-head">WHY</span>
            <p>{logicState.explanation}</p>
          </div>
        </div>
      </div>

      <div className="info-card stack-card">
        <div className="panel-title">CONCEPT NOTES</div>

        <div className="stack-reading-list">
          {conceptNotes.map((note) => (
            <div key={note.title} className="stack-reading-row">
              <span className="stack-reading-head">{note.title}</span>
              <p>{note.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="info-card stack-card">
        <div className="panel-title">INTERVIEW EXPLANATION MODE</div>

        <div className="stack-reading-list">
          {interviewExplanation.map((block) => (
            <div key={block.title} className="stack-reading-row">
              <span className="stack-reading-head">{block.title}</span>
              <p>{block.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="info-card stack-card">
        <div className="panel-title">MINI QUIZ</div>

        <div className="stack-reading-list">
          <div className="stack-reading-row">
            <span className="stack-reading-head">QUESTION</span>
            <p>{currentQuiz.question}</p>
          </div>

          <div className="quiz-options">
            {currentQuiz.options.map((option) => (
              <button
                key={option}
                type="button"
                className="pixel-btn ghost quiz-option"
                onClick={() => onQuizAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className={`quiz-message ${quizFeedbackType}`}>{quizMessage}</div>

          <button type="button" className="pixel-btn ghost quiz-next-btn" onClick={onNextQuiz}>
            NEXT QUIZ
          </button>
        </div>
      </div>
    </div>
  );
}

export default StackLearningPanel;