/**
 * frontend/src/components/shared/Reveal.jsx
 *
 * What this file is for:
 * - Thin wrapper that plays a panel's entrance animation the moment it
 *   scrolls into view, using ../../hooks/useRevealOnScroll.js.
 * - Meant as a drop-in replacement for the old "stage-block stage-delay-N"
 *   pattern (still used for above-the-fold content in index.css) on any
 *   panel that can sit below the fold on a tall page.
 *
 * What it connects to:
 * - Used by LandingPage.jsx, QueueVisualizer.jsx, BinaryTreeVisualizer.jsx,
 *   and (incrementally) the rest of the visualizer pages.
 * - Reads .reveal / .reveal.is-visible from index.css for the actual
 *   animation.
 *
 * Usage:
 *   <Reveal as="section" className="visual-panel" index={2}>...</Reveal>
 *
 * `index` staggers siblings — each step adds a small delay so a group of
 * cards cascades in one after another instead of all firing at once.
 */
import { useRevealOnScroll } from "../../hooks/useRevealOnScroll.js";

function Reveal({ as: Tag = "div", index = 0, className = "", children, ...rest }) {
  const [ref, isVisible] = useRevealOnScroll();

  return (
    <Tag
      ref={ref}
      className={`reveal ${isVisible ? "is-visible" : ""} ${className}`.trim()}
      style={{ "--reveal-index": index }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
