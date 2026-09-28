/**
 * frontend/src/components/sorting/SortBlock.jsx
 *
 * A single square element block in the sorting stage.
 * State drives all visual feedback — no logic here.
 *
 * States: "idle" | "compare" | "swap" | "pivot" | "sorted"
 */

import { motion } from "framer-motion";

const STATE_VARIANTS = {
  idle:    { y: 0,   scale: 1,    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  compare: { y: -10, scale: 1.06, transition: { duration: 0.2,  ease: [0.22, 1, 0.36, 1] } },
  swap:    { y: 0,   scale: 1.08, transition: { duration: 0.3,  ease: [0.22, 1, 0.36, 1] } },
  pivot:   { y: -6,  scale: 1.04, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  sorted:  { y: 0,   scale: 1,    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const BADGE_LABEL = {
  idle:    "···",
  compare: "CMP",
  swap:    "SWP",
  pivot:   "PVT",
  sorted:  " ✓ ",
};

export default function SortBlock({ value, state = "idle", layoutId, index = 0 }) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      className={`sort-block sort-block--${state}`}
      style={{ "--i": index }}
      initial={{ opacity: 0, y: 18, scale: 0.85 }}
      animate={{ opacity: 1, y: STATE_VARIANTS[state]?.y ?? 0, scale: STATE_VARIANTS[state]?.scale ?? 1 }}
      transition={{
        ...(STATE_VARIANTS[state]?.transition ?? STATE_VARIANTS.idle.transition),
        delay: index * 0.03,
      }}
    >
      {/* Corner brackets — same visual language as .pixel-block-corners */}
      <div className="sort-block-corners" aria-hidden>
        <span /><span /><span /><span />
      </div>
      {state === "swap" && <span className="sort-block-flash" aria-hidden />}

      <div className="sort-block-value">{value}</div>
      <div className="sort-block-badge">{BADGE_LABEL[state]}</div>
    </motion.div>
  );
}