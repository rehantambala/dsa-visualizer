import DebuggerControls from '../debugger/DebuggerControls.jsx';

function BinaryTreeControls({ value, setValue, onInsert, onDelete, onSearch, onTraverse, debuggerProps }) {
  return (
    <section className="control-panel stage-block stage-delay-2">
      <div className="panel-title">BINARY TREE CONTROLS</div>
      <div className="controls-grid">
        <div className="field"><label>VALUE</label><input value={value} onChange={(e) => setValue(e.target.value)} type="number" /></div>
        <button className="pixel-btn" type="button" onClick={onInsert}>BST INSERT</button>
        <button className="pixel-btn" type="button" onClick={onDelete}>BST DELETE</button>
        <button className="pixel-btn" type="button" onClick={onSearch}>BST SEARCH</button>
        <button className="pixel-btn ghost" type="button" onClick={() => onTraverse('inorder')}>INORDER</button>
        <button className="pixel-btn ghost" type="button" onClick={() => onTraverse('preorder')}>PREORDER</button>
        <button className="pixel-btn ghost" type="button" onClick={() => onTraverse('postorder')}>POSTORDER</button>
        <button className="pixel-btn ghost" type="button" onClick={() => onTraverse('level')}>LEVEL ORDER</button>
      </div>
      <DebuggerControls {...debuggerProps} />
    </section>
  );
}

export default BinaryTreeControls;
