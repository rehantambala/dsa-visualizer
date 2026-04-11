import PixelNumber from "../shared/PixelNumber.jsx";

function SortingStage({
  values,
  comparedIndices,
  swappedIndices,
  pivotIndex,
  sortedIndices,
  currentStepType,
}) {
  return (
    <section className="visual-panel stage-block stage-delay-3 sorting-stage-panel">
      <div className="visual-header">
        <div className="panel-title">SORTING STAGE</div>
        <div className="visual-hint">Square pixel cards show compare, swap, pivot, and sorted states.</div>
      </div>

      <div className="sorting-stage-wrap">
        {values.map((value, index) => {
          const isCompared = comparedIndices.includes(index);
          const isSwapped = swappedIndices.includes(index);
          const isPivot = pivotIndex === index;
          const isSorted = sortedIndices.includes(index);

          return (
            <div
              key={`sort-card-${index}`}
              className={[
                "sorting-card-shell",
                isCompared ? "is-compared" : "",
                isSwapped ? "is-swapped" : "",
                isPivot ? "is-pivot" : "",
                isSorted ? "is-sorted" : "",
                currentStepType === "done" ? "is-final" : "",
              ]
                .join(" ")
                .trim()}
            >
              <PixelNumber value={value} active={isCompared || isSwapped || isPivot || isSorted} />
              <div className="sorting-card-energy" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SortingStage;
