/**
 * frontend/src/hooks/useRevealOnScroll.js
 *
 * What this file is for:
 * - Fires an element's entrance animation only when it actually scrolls into
 *   view, instead of on a fixed timer at page mount.
 * - Replaces the old "everything reveals together on a stopwatch" pattern
 *   (see .stage-block / .stage-delay-N in index.css) for any panel that can
 *   sit below the fold.
 *
 * What it connects to:
 * - Used via the <Reveal> component in ./Reveal.jsx
 * - Can also be used directly by any component that needs the raw
 *   [ref, isVisible] pair instead of the wrapper.
 *
 * Behavior:
 * - Observes once. As soon as the element crosses the threshold it flips to
 *   visible and stops observing — we want a one-time entrance, not a
 *   replay every time the user scrolls past.
 * - If IntersectionObserver isn't available (very old browser, or a test
 *   environment), it fails open: the element is just immediately visible
 *   instead of silently staying hidden forever.
 */
import { useEffect, useRef, useState } from "react";

export function useRevealOnScroll({ threshold = 0.18, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);
  // The IntersectionObserver-support check doesn't depend on the DOM node at
  // all, so it can decide the initial value directly (lazy initializer)
  // instead of rendering hidden once and then flipping visible via an effect.
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isVisible];
}

export default useRevealOnScroll;
