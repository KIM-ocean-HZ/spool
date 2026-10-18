import { useId, type ReactNode } from 'react';
import { PATCH_ROWS, ROW_STITCHES, type KnitItemId } from '@/lib/knit/knit';

// 织布（Ocean 2026-10-17）的画：一针（V）、一块布、柜子里的东西。全用配色变量（tokens.css），
// 浅色 / 深色 / 情人节不用另画。⚠️ 都是 aria-hidden 的装饰：说事的是旁边那几个字。

const accent = 'var(--accent)';

/** 一针：一个 V，画在 w × h 的格子里。`faint` = 还没织的那一针（虚影）。 */
export function Stitch({ x, y, w, h, color, faint }: { x: number; y: number; w: number; h: number; color: string; faint?: boolean }) {
  return (
    <path
      d={`M${x + w * 0.12},${y + h * 0.12} L${x + w * 0.5},${y + h * 0.88} L${x + w * 0.88},${y + h * 0.12}`}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(1.1, w * 0.26)}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={faint ? 0.18 : 1}
    />
  );
}

/** 正在织的这一块：7 行 × 5 针，从上往下、一行一行织。`onPatch` 针织好了，其中最后 `today` 针是今天织的
 *  （主色，其余的织好了但是暗一点）。 */
export function PatchSwatch({ onPatch, today, cell = 6 }: { onPatch: number; today: number; cell?: number }) {
  const w = ROW_STITCHES * cell;
  const h = PATCH_ROWS * cell;
  const firstToday = Math.max(0, onPatch - today);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {Array.from({ length: ROW_STITCHES * PATCH_ROWS }, (_, i) => {
        const done = i < onPatch;
        return (
          <g key={i} opacity={done && i < firstToday ? 0.55 : 1}>
            <Stitch
              x={(i % ROW_STITCHES) * cell}
              y={Math.floor(i / ROW_STITCHES) * cell}
              w={cell}
              h={cell}
              color={done ? accent : 'var(--ink-2)'}
              faint={!done}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** 一天一行（周回顾）：这一天的针数，一行最多 `perRow` 针。 */
export function DayRow({ count, perRow, cell, color = accent }: { count: number; perRow: number; cell: number; color?: string }) {
  return (
    <svg width={perRow * cell} height={cell} viewBox={`0 0 ${perRow * cell} ${cell}`} aria-hidden>
      {Array.from({ length: perRow }, (_, i) => (
        <Stitch key={i} x={i * cell} y={0} w={cell} h={cell} color={i < count ? color : 'var(--ink-2)'} faint={i >= count} />
      ))}
    </svg>
  );
}

// ——— 柜子里的东西 ——————————————————————————————————————————————————————————————————————————————
// 每一件是几块「布」拼起来的形状。织成了：底色 + 针脚纹理 + 描边；还没织：只有虚线轮廓。

interface Part {
  d: string;
  color: string;
  /** 这一块有没有针脚纹理（绒球、扣子之类的小东西没有）。 */
  knit?: boolean;
}

const BLUE = 'var(--activity-capture)';
const GREEN = 'var(--activity-ai)';
const ORANGE = 'var(--activity-self)';
const INK = 'var(--ink)';

const PARTS: Record<KnitItemId, Part[]> = {
  coaster: [
    { d: 'M17,17 h30 a4,4 0 0 1 4,4 v22 a4,4 0 0 1 -4,4 h-30 a4,4 0 0 1 -4,-4 v-22 a4,4 0 0 1 4,-4 z', color: accent, knit: true },
    { d: 'M19,47 v6 M24,47 v6 M29,47 v6 M34,47 v6 M39,47 v6 M44,47 v6', color: accent },
  ],
  scarf: [
    { d: 'M16,18 C18,9 46,9 48,18 L43,22 C41,15 23,15 21,22 Z', color: BLUE, knit: true },
    { d: 'M16,18 L21,22 L22,50 L14,50 Z', color: BLUE, knit: true },
    { d: 'M43,22 L48,18 L52,44 L44,46 Z', color: BLUE, knit: true },
    { d: 'M15.2,31 L21.5,31 M14.6,40 L21.8,40 M45.6,30 L49.6,29 M46.6,38 L50.8,37', color: accent },
    { d: 'M15,50 v5 M18,50 v5 M21,50 v5 M45,46 l0.8,5 M48.5,45.4 l0.8,5 M51.5,44.6 l0.8,5', color: BLUE },
  ],
  beanie: [
    { d: 'M14,40 C14,20 50,20 50,40 Z', color: GREEN, knit: true },
    { d: 'M12,40 h40 a2,2 0 0 1 2,2 v7 a2,2 0 0 1 -2,2 h-40 a2,2 0 0 1 -2,-2 v-7 a2,2 0 0 1 2,-2 z', color: accent, knit: true },
    { d: 'M32,8.5 a6.5,6.5 0 1 1 0,13 a6.5,6.5 0 1 1 0,-13 z', color: accent },
  ],
  mittens: [
    { d: 'M9,30 C9,16 25,16 25,30 L25,45 L9,45 Z', color: ORANGE, knit: true },
    { d: 'M25,30 c6,0 7,9 0,11', color: ORANGE },
    { d: 'M8,45 h18 v8 h-18 z', color: accent, knit: true },
    { d: 'M39,30 C39,16 55,16 55,30 L55,45 L39,45 Z', color: ORANGE, knit: true },
    { d: 'M39,30 c-6,0 -7,9 0,11', color: ORANGE },
    { d: 'M38,45 h18 v8 h-18 z', color: accent, knit: true },
  ],
  plush: [
    { d: 'M20,9 a6,6 0 1 1 0,12 a6,6 0 1 1 0,-12 z M44,9 a6,6 0 1 1 0,12 a6,6 0 1 1 0,-12 z', color: accent, knit: true },
    { d: 'M32,40 a15,13 0 1 1 0,26 a15,13 0 1 1 0,-26 z', color: accent, knit: true },
    { d: 'M32,11 a13,12 0 1 1 0,24 a13,12 0 1 1 0,-24 z', color: accent, knit: true },
    { d: 'M27,21 a1.6,1.6 0 1 1 0,3.2 a1.6,1.6 0 1 1 0,-3.2 z M37,21 a1.6,1.6 0 1 1 0,3.2 a1.6,1.6 0 1 1 0,-3.2 z M30,27 h4 l-2,2.2 z', color: INK },
  ],
  sweater: [
    {
      d: 'M23,11 L12,15 L4,30 L11,34 L16,27 L16,54 L48,54 L48,27 L53,34 L60,30 L52,15 L41,11 C39,17 25,17 23,11 Z',
      color: BLUE,
      knit: true,
    },
    { d: 'M16,49 h32 M4,30 l7,4 M60,30 l-7,4 M23,11 C25,17 39,17 41,11', color: accent },
  ],
  blanket: [
    { d: 'M9,14 h46 v36 h-46 z', color: GREEN, knit: true },
    { d: 'M9,23 h46 v6 h-46 z M9,37 h46 v6 h-46 z', color: ORANGE, knit: true },
    { d: 'M55,14 L55,30 L39,14 Z', color: BLUE, knit: true },
    { d: 'M12,50 v5 M17,50 v5 M22,50 v5 M27,50 v5 M32,50 v5 M37,50 v5 M42,50 v5 M47,50 v5 M52,50 v5', color: GREEN },
  ],
};

/** 一件东西。`made` = 织成了（上色 + 针脚）；不然只有虚线轮廓。 */
export function KnitItemArt({ id, made, size = 64 }: { id: KnitItemId; made: boolean; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const parts = PARTS[id];
  const patterns: ReactNode[] = [];
  const seen = new Set<string>();
  if (made) {
    for (const p of parts) {
      if (!p.knit || seen.has(p.color)) continue;
      seen.add(p.color);
      patterns.push(
        <pattern key={p.color} id={`k${uid}${seen.size}`} width="5" height="4.4" patternUnits="userSpaceOnUse">
          <path d="M0.6,0.6 L2.5,3.8 L4.4,0.6" fill="none" stroke={p.color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </pattern>,
      );
    }
  }
  const patternOf = (color: string): string => `url(#k${uid}${[...seen].indexOf(color) + 1})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>{patterns}</defs>
      {parts.map((p, i) => {
        const closed = /z\s*$/i.test(p.d.trim());
        if (!made) {
          return (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="1.2"
              strokeDasharray="2.5 2.5"
              strokeLinecap="round"
              opacity={0.7}
            />
          );
        }
        if (!closed) {
          return <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth="1.8" strokeLinecap="round" />;
        }
        return (
          <g key={i}>
            <path d={p.d} fill={p.color} fillOpacity={p.knit ? 0.2 : 0.85} />
            {p.knit && <path d={p.d} fill={patternOf(p.color)} />}
            <path d={p.d} fill="none" stroke={p.color} strokeWidth="1.4" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}
