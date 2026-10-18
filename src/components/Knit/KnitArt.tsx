import { useId, type ReactNode } from 'react';
import { PATCH_ROWS, ROW_STITCHES, type KnitItemId } from '@/lib/knit/knit';
import { ITEMS, type Tex, type Yarn } from './knitItems';

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

/** 这一周的一小块布（周回顾「活动」最底下那一行）：一天一行，一行最多画 `perRow` 针；今天那一行亮，
 *  别的日子暗一点。 */
export function WeekSwatch({ perDay, today, perRow = 12, cell = 4 }: { perDay: number[]; today: number; perRow?: number; cell?: number }) {
  const w = perRow * cell;
  const h = perDay.length * cell;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {perDay.map((n, row) =>
        Array.from({ length: perRow }, (_, i) => (
          <g key={`${row}-${i}`} opacity={i < n && row !== today ? 0.55 : 1}>
            <Stitch x={i * cell} y={row * cell} w={cell} h={cell} color={i < n ? accent : 'var(--ink-2)'} faint={i >= n} />
          </g>
        )),
      )}
    </svg>
  );
}

// ——— 柜子里的东西 ——————————————————————————————————————————————————————————————————————————————
// 形状在 knitItems.ts。每一片：毛线色打底 → 针法纹理 → 一层明暗（左上亮、右下暗）→ 一道描边；
// 底下一道影子，落在搁板上。还没织：只有虚线轮廓（图案、条纹这些贴片不画）。

const yarnVar = (y: Yarn): string => `var(--yarn-${y})`;
const INK_VAR = 'var(--yarn-ink)';

/** 针法纹理（每一种一个 <pattern>，深色细线画在毛线色上面）。 */
function Textures({ uid, used }: { uid: string; used: Set<Tex> }) {
  const line = { fill: 'none', stroke: INK_VAR, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const defs: ReactNode[] = [];
  for (const tex of used) {
    const id = `${uid}-${tex}`;
    if (tex === 'knit') {
      defs.push(
        <pattern key={tex} id={id} width="3.6" height="3.2" patternUnits="userSpaceOnUse">
          <path d="M0.45,0.5 L1.8,2.7 L3.15,0.5" {...line} strokeWidth="0.55" opacity="0.32" />
        </pattern>,
      );
    } else if (tex === 'rib') {
      defs.push(
        <pattern key={tex} id={id} width="2.4" height="3" patternUnits="userSpaceOnUse">
          <path d="M1.2,0 V3" {...line} strokeWidth="0.75" opacity="0.26" />
        </pattern>,
      );
    } else if (tex === 'garter') {
      defs.push(
        <pattern key={tex} id={id} width="4" height="2.6" patternUnits="userSpaceOnUse">
          <path d="M0,1.3 q1,-1.1 2,0 t2,0" {...line} strokeWidth="0.6" opacity="0.3" />
        </pattern>,
      );
    } else if (tex === 'seed') {
      defs.push(
        <pattern key={tex} id={id} width="3.4" height="3.4" patternUnits="userSpaceOnUse">
          <circle cx="0.85" cy="0.85" r="0.48" fill={INK_VAR} opacity="0.32" />
          <circle cx="2.55" cy="2.55" r="0.48" fill={INK_VAR} opacity="0.32" />
        </pattern>,
      );
    } else if (tex === 'cable') {
      defs.push(
        <pattern key={tex} id={id} width="5.5" height="7" patternUnits="userSpaceOnUse">
          <path d="M1.2,0 C1.2,2.6 4.3,4.4 4.3,7 M4.3,0 C4.3,2.2 3.4,3 2.75,3.5 M2.75,3.5 C2.1,4 1.2,4.8 1.2,7" {...line} strokeWidth="0.85" opacity="0.38" />
        </pattern>,
      );
    } else if (tex === 'lace') {
      defs.push(
        <pattern key={tex} id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.8" fill="none" stroke={INK_VAR} strokeWidth="0.5" opacity="0.42" />
          <circle cx="4.5" cy="4.5" r="0.8" fill="none" stroke={INK_VAR} strokeWidth="0.5" opacity="0.42" />
          <path d="M3,0 L6,3 M0,3 L3,6" {...line} strokeWidth="0.4" opacity="0.25" />
        </pattern>,
      );
    } else if (tex === 'mesh') {
      defs.push(
        <pattern key={tex} id={id} width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0,0 L5,5 M5,0 L0,5" {...line} strokeWidth="0.8" opacity="0.4" />
        </pattern>,
      );
    } else {
      // fair-<yarn>: 费尔岛 —— 一排排小菱形和点，用另一种毛线色织进去。
      const c = yarnVar(tex.slice(5) as Yarn);
      defs.push(
        <pattern key={tex} id={id} width="6" height="7" patternUnits="userSpaceOnUse">
          <path d="M3,0.7 L5.2,3.5 L3,6.3 L0.8,3.5 Z" fill={c} />
          <circle cx="3" cy="3.5" r="0.7" fill={yarnVar('oat')} />
          <circle cx="0" cy="0" r="0.6" fill={c} />
          <circle cx="6" cy="0" r="0.6" fill={c} />
          <circle cx="0" cy="7" r="0.6" fill={c} />
          <circle cx="6" cy="7" r="0.6" fill={c} />
        </pattern>,
      );
    }
  }
  return <>{defs}</>;
}

/** 一件东西。`made` = 织成了（上色 + 针脚）；不然只有虚线轮廓。 */
export function KnitItemArt({ id, made, size = 64 }: { id: KnitItemId; made: boolean; size?: number }) {
  const uid = `k${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = ITEMS[id];
  const used = new Set<Tex>();
  for (const p of art.parts) if ('d' in p && p.tex) used.add(p.tex);
  const [sx, srx] = art.shadow ?? [32, 21];

  const body = art.parts.map((p, i) => {
    if ('line' in p) {
      const w = p.w ?? 1.6;
      if (!made) {
        return p.yarn === 'ink' ? null : (
          <path key={i} d={p.line} fill="none" stroke="var(--muted)" strokeWidth="1" strokeDasharray="2.2 2.2" strokeLinecap="round" opacity={0.6} />
        );
      }
      if (p.yarn === 'ink') {
        return <path key={i} d={p.line} fill="none" stroke={INK_VAR} strokeWidth={w} strokeLinecap="round" opacity={0.45} />;
      }
      return (
        <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={p.line} stroke={INK_VAR} strokeWidth={w + 1.1} opacity={0.5} />
          <path d={p.line} stroke={yarnVar(p.yarn)} strokeWidth={w} />
        </g>
      );
    }
    const rule = p.evenodd ? 'evenodd' : undefined;
    if (!made) {
      return p.bare || p.inner ? null : (
        <path key={i} d={p.d} fillRule={rule} fill="none" stroke="var(--muted)" strokeWidth="1.1" strokeDasharray="2.2 2.2" strokeLinecap="round" opacity={0.75} />
      );
    }
    return (
      <g key={i}>
        <path d={p.d} fillRule={rule} fill={yarnVar(p.yarn)} />
        {p.tex && <path d={p.d} fillRule={rule} fill={`url(#${uid}-${p.tex})`} />}
        {p.inner && <path d={p.d} fill={INK_VAR} opacity={0.42} />}
        {!p.bare && !p.inner && <path d={p.d} fillRule={rule} fill={`url(#${uid}-shade)`} />}
        {!p.bare && <path d={p.d} fillRule={rule} fill="none" stroke={INK_VAR} strokeWidth="0.9" strokeLinejoin="round" opacity={0.62} />}
      </g>
    );
  });

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        {made && <Textures uid={uid} used={used} />}
      </defs>
      {made && <ellipse cx={sx} cy={60.2} rx={srx} ry={1.8} fill={INK_VAR} opacity={0.13} />}
      <g transform={art.rotate ? `rotate(${art.rotate} 32 32)` : undefined}>{body}</g>
    </svg>
  );
}
