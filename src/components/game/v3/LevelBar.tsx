/** GameFlow v3 — a level bar without a cap: at 100 % the level goes up by one and the bar starts again from 0. */
import { useEffect, useRef, useState } from "react";
import { formatCompact, levelState, type Curve } from "@/game/format-compact";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

export function LevelBar({ label, xp, curve, color, t, icon, compact = false }: { label: string; xp: number; curve: Curve; color?: string; t: TFn; icon?: React.ReactNode; compact?: boolean }) {
  const st = levelState(xp, curve);
  const prev = useRef(st.level);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (st.level > prev.current) {
      setPop(true);
      const id = setTimeout(() => setPop(false), 600);
      prev.current = st.level;
      return () => clearTimeout(id);
    }
    prev.current = st.level;
  }, [st.level]);
  const pct = Math.round(st.ratio * 100);
  return (
    <div className="v3-lvbar" style={color ? ({ "--c": color } as React.CSSProperties) : undefined}>
      {!compact && (
        <span className="v3-lab">
          <span>
            {icon}
            {label}
          </span>
        </span>
      )}
      <span className={`v3-lv ${pop ? "pop" : ""}`}>{t("Lv. {n}", { n: formatCompact(st.level) })}</span>
      <span className="v3-track" role="progressbar" aria-label={t("{skill}: level {n}", { skill: label, n: st.level })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
      </span>
      {!compact && (
        <span className="v3-num">
          {formatCompact(Math.floor(st.into))} / {formatCompact(Math.ceil(st.need))}
        </span>
      )}
    </div>
  );
}
