import PixelNumber from "../shared/PixelNumber.jsx";

function SortingStage({
  values,
  comparedIndices,
  swappedIndices,
  pivotIndex,
  sortedIndices,
  currentStepType,
}) {
  const maxValue = values.length > 0 ? Math.max(...values) : 1;

  return (
    <section className="visual-panel stage-block stage-delay-3 sorting-stage-panel">
      <div className="visual-header">
        <div className="panel-title">SORTING STAGE</div>
        <div className="visual-hint">Neon bars show comparisons, swaps, pivot focus, and sorted locks.</div>
      </div>

      <div className="sorting-stage-wrap">
        {values.map((value, index) => {
          const normalizedHeight = Math.max(12, (value / maxValue) * 100);
          const isCompared = comparedIndices.includes(index);
          const isSwapped = swappedIndices.includes(index);
          const isPivot = pivotIndex === index;
          const isSorted = sortedIndices.includes(index);

          return (
            <div
              key={`sort-bar-${index}`}
              className={[
                "sorting-bar-shell",
                isCompared ? "is-compared" : "",
                isSwapped ? "is-swapped" : "",
                isPivot ? "is-pivot" : "",
                isSorted ? "is-sorted" : "",
                currentStepType === "done" ? "is-final" : "",
              ]
                .join(" ")
                .trim()}
            >
              <div className="sorting-bar-grid" />
              <div className="sorting-bar" style={{ height: `${normalizedHeight}%` }} />
              <div className="sorting-bar-value">
                <PixelNumber value={value} active={isCompared || isSwapped || isPivot || isSorted} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SortingStage;
