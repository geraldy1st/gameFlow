/**
 * GameFlow v3 — pagination instead of scrolling (port of the mockup's pager): the visible area decides how many
 * columns and rows fit; arrows and dots move between pages. Never overflow: auto.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

export function Pager<T>({
  items,
  render,
  minW = 150,
  itemH = 60,
  gap = 8,
  maxCols = 4,
  t,
  label,
  className = "",
}: {
  items: T[];
  render: (item: T, i: number) => ReactNode;
  minW?: number;
  itemH?: number;
  gap?: number;
  maxCols?: number;
  t: TFn;
  label: string;
  className?: string;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ cols: 1, rows: 3 });
  const [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const cols = Math.max(1, Math.min(maxCols, Math.floor((w + gap) / (minW + gap))));
      const rows = Math.max(1, Math.floor((h + gap) / (itemH + gap)));
      setFit((f) => (f.cols === cols && f.rows === rows ? f : { cols, rows }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minW, itemH, gap, maxCols]);
  const per = fit.cols * fit.rows;
  const pages = Math.max(1, Math.ceil(items.length / per));
  const at = Math.min(page, pages - 1);
  const shown = items.slice(at * per, at * per + per);
  return (
    <div className={`v3-pg ${className}`}>
      <div
        className="v3-pg-area"
        ref={area}
        role="list"
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${fit.cols}, minmax(0, 1fr))`, gridAutoRows: `${itemH}px`, gap }}
      >
        {shown.map((it, i) => (
          <div role="listitem" key={at * per + i} className="v3-pg-cell">
            {render(it, at * per + i)}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="v3-pg-foot">
          <button type="button" disabled={at === 0} onClick={() => setPage(at - 1)} aria-label={t("Previous page")}>
            ←
          </button>
          <span className="v3-dots" aria-label={t("Page {n} of {m}", { n: at + 1, m: pages })}>
            {Array.from({ length: pages }, (_, i) => (
              <i key={i} className={i === at ? "on" : ""} />
            ))}
          </span>
          <button type="button" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} aria-label={t("Next page")}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
