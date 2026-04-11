import PixelBlock from '../shared/PixelBlock.jsx';

function BinaryTreeStage({ nodes = [], active }) {
  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="visual-header"><div className="panel-title">BINARY TREE STAGE</div></div>
      <div className="sorting-stage-wrap algo-stage-grid">
        {nodes.map((node) => (
          <PixelBlock key={node.id} value={node.value} active={active === node.id} />
        ))}
      </div>
    </section>
  );
}

export default BinaryTreeStage;
