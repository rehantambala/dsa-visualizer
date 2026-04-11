import PixelBlock from '../shared/PixelBlock.jsx';

function BinaryTreeStage({ nodes = [], active }) {
  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="visual-header"><div className="panel-title">BINARY TREE STAGE</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        {nodes.map((node) => (
          <PixelBlock key={node.id} value={node.value} isActive={active === node.id} statusLabel={node.label} />
        ))}
      </div>
    </section>
  );
}

export default BinaryTreeStage;
