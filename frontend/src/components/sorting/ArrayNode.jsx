import PixelNumber from "../shared/PixelNumber.jsx";

function ArrayNode({
  value,
  index,
  active = false,
  compared = false,
  swapped = false,
  sorted = false
}) {

  const className = [
    "array-node",
    active ? "is-active" : "",
    compared ? "is-compare" : "",
    swapped ? "is-swap" : "",
    sorted ? "is-sorted" : ""
  ].join(" ");

  return (
    <div className="array-node-wrap">

      <div className="array-node-header">
        <div className="array-node-title">NODE {index}</div>
        <div className="array-node-id">#{index}</div>
      </div>

      <div className={className}>

        {/* grid layer */}
        <div className="array-node-grid" />

        {/* glass reflection */}
        <div className="array-node-glass" />

        {/* value chamber */}
        <div className="array-node-value">

          <div className="array-node-label">
            VALUE
          </div>

          <div className="array-node-number">
            <PixelNumber
              value={value}
              active={active || compared || swapped || sorted}
            />
          </div>

        </div>

        {/* corner brackets */}
        <div className="corner tl"/>
        <div className="corner tr"/>
        <div className="corner bl"/>
        <div className="corner br"/>

      </div>

      <div className="array-node-index">
        INDEX.{index}
      </div>

    </div>
  );
}

export default ArrayNode;