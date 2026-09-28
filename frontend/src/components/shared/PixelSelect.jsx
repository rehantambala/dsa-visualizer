/**
 * frontend/src/components/shared/PixelSelect.jsx
 *
 * Native <select> popups render with the OS's own list styling — that's the plain
 * white system dropdown breaking the black/pink pixel theme. This is a fully custom
 * themed replacement: same value/onChange contract as a normal select, but the open
 * panel is real DOM we control (glow border, animated entrance, hover states).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function PixelSelect({ value, onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value)) || options[0];

  useEffect(() => {
    function onDocClick(e) {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target) &&
        !e.target.closest('.pixel-select-panel')
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // The panel is portaled straight to <body> so it always paints above everything,
  // regardless of stacking contexts created by animated ancestor sections (which is
  // what was trapping the old in-place panel behind later sections' content). We
  // still need its pixel position, so measure the trigger and re-measure on
  // scroll/resize while open.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return undefined;

    const measure = () => setRect(triggerRef.current.getBoundingClientRect());
    measure();

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => String(o.value) === String(value));
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) commit(options[highlight]);
      else setOpen(true);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
  };

  const panel = open && rect && (
    <ul
      className="pixel-select-panel"
      role="listbox"
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      }}
    >
      <span className="pixel-select-scan" aria-hidden="true" />
      <span className="pixel-select-corner tl" aria-hidden="true" />
      <span className="pixel-select-corner tr" aria-hidden="true" />
      <span className="pixel-select-corner bl" aria-hidden="true" />
      <span className="pixel-select-corner br" aria-hidden="true" />
      {options.map((opt, idx) => {
        const isSelected = String(opt.value) === String(value);
        return (
          <li
            key={opt.value}
            role="option"
            aria-selected={isSelected}
            className={`pixel-select-option ${isSelected ? 'is-selected' : ''} ${idx === highlight ? 'is-highlighted' : ''}`}
            style={{ '--i': idx }}
            onMouseEnter={() => setHighlight(idx)}
            onMouseDown={(e) => {
              e.preventDefault();
              commit(opt);
            }}
          >
            <span className="pixel-select-check" aria-hidden="true">{isSelected ? '✓' : ''}</span>
            {opt.label}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="pixel-select" ref={rootRef} data-open={open || undefined}>
      <button
        ref={triggerRef}
        type="button"
        className="pixel-select-trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="pixel-select-value">{selected ? selected.label : ''}</span>
        <span className="pixel-select-chevron" aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}

export default PixelSelect;
