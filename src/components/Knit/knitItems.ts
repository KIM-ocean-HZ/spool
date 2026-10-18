import type { KnitItemId } from '@/lib/knit/knit';

// 织布 —— 柜子里每一件的画（Ocean 10-18「再做精致一些，当前的比较简陋」）。
//
// 一件 = 几块「片」叠起来，画在 64 × 64 里，底边 y ≈ 58 落在搁板上。每一片是一种毛线色（tokens.css 的
// `--yarn-*`，经典 / 深色 / 情人节各一套）+ 一种针法纹理（下面 TEX），KnitArt 再给它加一层明暗和一道
// 描边。线（`line`）是绳子、流苏、提手这类：先画一道深色的边，再画毛线色。
// ⚠️ 新加东西：在 KNIT_ITEMS（lib/knit/knit.ts）、knitItemName（stores/knitStore.ts）和这里各加一份。

export type Yarn = 'rust' | 'mustard' | 'sage' | 'denim' | 'oat' | 'plum' | 'brown';

/** 针法：平针（V）、罗纹（竖条）、起伏针（横条）、桂花针（点）、麻花、镂空、网眼、费尔岛提花（带颜色）。 */
export type Tex = 'knit' | 'rib' | 'garter' | 'seed' | 'cable' | 'lace' | 'mesh' | `fair-${Yarn}`;

export type Part =
  | {
      d: string;
      yarn: Yarn;
      tex?: Tex;
      /** 有洞的形状（发带那一圈）。 */
      evenodd?: boolean;
      /** 里面 / 开口（压暗）。 */
      inner?: boolean;
      /** 图案、条纹这类贴在别的片上的：不描边、不加明暗。 */
      bare?: boolean;
    }
  | { line: string; yarn: Yarn | 'ink'; w?: number };

export interface ItemArt {
  parts: Part[];
  /** 落在搁板上的影子：[中心 x, 半宽]。 */
  shadow?: [number, number];
  /** 整件转一下（度，绕中心）。 */
  rotate?: number;
}

const f = (n: number): string => String(Math.round(n * 100) / 100);

/** 椭圆（闭合路径）。 */
export const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${f(cx - rx)},${f(cy)} a${f(rx)},${f(ry)} 0 1 0 ${f(2 * rx)},0 a${f(rx)},${f(ry)} 0 1 0 ${f(-2 * rx)},0 z`;

/** 毛线球（绒球）：圆周上一圈小鼓包。 */
export const fluffy = (cx: number, cy: number, r: number, n = 11): string => {
  const pt = (a: number, rr: number) => `${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`;
  let d = `M${pt(0, r)}`;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    d += ` Q${pt((a0 + a1) / 2, r * 1.32)} ${pt(a1, r)}`;
  }
  return `${d} z`;
};

/** 从 (x1,y1) 到 (x2,y2) 一串向外鼓的小半圆（蕾丝的花边）。 */
const scallops = (x1: number, y1: number, x2: number, y2: number, n: number): string => {
  const r = Math.hypot(x2 - x1, y2 - y1) / n / 2;
  let d = '';
  for (let k = 1; k <= n; k++) d += ` A${f(r)},${f(r)} 0 0 1 ${f(x1 + ((x2 - x1) * k) / n)},${f(y1 + ((y2 - y1) * k) / n)}`;
  return d;
};

const fringe = (xs: number[], y: number, len: number, dx = 0): string => xs.map((x) => `M${x},${y} l${dx},${len}`).join(' ');

/** 毛衣 / 开衫的身子：领口、两只袖子、下摆。 */
const SWEATER = 'M23,9 L12,13 L4,40 L11,42.5 L16,27 L16,56 L48,56 L48,27 L53,42.5 L60,40 L52,13 L41,9 C39,14 25,14 23,9 Z';
const CUFFS: Part[] = [
  { d: 'M4,40 L11,42.5 L9.8,46.6 L2.8,44 Z', yarn: 'oat', tex: 'rib' },
  { d: 'M60,40 L53,42.5 L54.2,46.6 L61.2,44 Z', yarn: 'oat', tex: 'rib' },
];

export const ITEMS: Record<KnitItemId, ItemArt> = {
  // ① 入门 ———————————————————————————————————————————————————————————————————————————————
  dishcloth: {
    parts: [
      { line: 'M18.5,17 C14.5,8.5 24.5,7 23.5,17', yarn: 'sage', w: 1.8 },
      { d: 'M14,17 h36 v36 h-36 z', yarn: 'sage', tex: 'garter' },
      { d: 'M14,22 h36 v2.6 h-36 z', yarn: 'oat', tex: 'garter', bare: true },
      { d: 'M14,44 h36 v4 h-36 z', yarn: 'oat', tex: 'garter', bare: true },
    ],
  },
  coaster: {
    parts: [
      { d: 'M12,48 a20,7 0 0 0 40,0 v3 a20,7 0 0 1 -40,0 z', yarn: 'rust', tex: 'rib' },
      { d: ellipse(32, 48, 20, 7), yarn: 'rust', tex: 'garter' },
      { d: 'M14,42 a18,6 0 0 0 36,0 v3 a18,6 0 0 1 -36,0 z', yarn: 'mustard', tex: 'rib' },
      { d: ellipse(32, 42, 18, 6), yarn: 'mustard', tex: 'garter' },
      { line: ellipse(32, 42, 11, 3.6), yarn: 'ink', w: 0.7 },
      { line: 'M39,26 c5,0 5,9 0,9', yarn: 'oat', w: 2 },
      { d: 'M25,22 h14 v17 a2,2 0 0 1 -2,2 h-10 a2,2 0 0 1 -2,-2 z', yarn: 'oat' },
      { d: 'M25,26 h14 v3 h-14 z', yarn: 'denim', bare: true },
      { line: 'M29,18 c-1.5,-2 1.5,-3 0,-6 M34,18 c-1.5,-2 1.5,-3 0,-6', yarn: 'ink', w: 0.8 },
    ],
  },
  bookmark: {
    rotate: -10,
    shadow: [32, 9],
    parts: [
      { d: 'M25,5 h14 v41 l-7,6 l-7,-6 z', yarn: 'plum', tex: 'seed' },
      { d: 'M25,10 h14 v3 h-14 z', yarn: 'oat', tex: 'garter', bare: true },
      { d: 'M25,38 h14 v3 h-14 z', yarn: 'oat', tex: 'garter', bare: true },
      { d: 'M32,19 l4.5,6 l-4.5,6 l-4.5,-6 z', yarn: 'mustard', tex: 'knit', bare: true },
      { line: 'M32,52 v3', yarn: 'mustard', w: 1.2 },
      { d: 'M29.6,55 h4.8 l1.8,6.5 h-8.4 z', yarn: 'mustard', tex: 'rib' },
      { d: ellipse(32, 55.4, 2.8, 1.5), yarn: 'mustard' },
    ],
  },
  headband: {
    parts: [
      { d: 'M7,50 C7,13 57,13 57,50 L47.5,50 C47.5,25 16.5,25 16.5,50 Z', yarn: 'denim', tex: 'rib' },
      { d: 'M25,14.5 C28.5,20.5 35.5,20.5 39,14.5 L38,27.5 C35.5,31 28.5,31 26,27.5 Z', yarn: 'denim', tex: 'garter' },
      { line: 'M26.4,26 C29.5,22.5 34.5,22.5 37.6,26 M27,17.5 C30,21 34,21 37,17.5', yarn: 'ink', w: 0.7 },
    ],
  },
  scarf: {
    parts: [
      { d: 'M43,20 L48,16 L53.5,45 L45,47 Z', yarn: 'rust', tex: 'knit' },
      { d: 'M44.6,28.5 L49.9,27.3 L50.5,30.4 L45.1,31.6 Z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M46,37 L51.4,35.6 L52,38.7 L46.5,40 Z', yarn: 'oat', tex: 'knit', bare: true },
      { line: fringe([46, 49, 52], 46.4, 5, 0.6), yarn: 'rust', w: 1.2 },
      { d: 'M16,16 C18,7 46,7 48,16 L43,20 C41,13 23,13 21,20 Z', yarn: 'rust', tex: 'rib' },
      { d: 'M16,16 L21,20 L23,51 L13,51 Z', yarn: 'rust', tex: 'knit' },
      { d: 'M14.4,29 L21.6,29 L21.8,32.2 L14.1,32.2 Z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M13.7,39.5 L22.2,39.5 L22.4,42.7 L13.5,42.7 Z', yarn: 'oat', tex: 'knit', bare: true },
      { line: fringe([14, 16.8, 19.6, 22.4], 51, 5.5), yarn: 'rust', w: 1.2 },
    ],
  },
  pillow: {
    parts: [
      { d: 'M11,17 Q32,13 53,17 Q56,35 53,53 Q32,57 11,53 Q8,35 11,17 Z', yarn: 'mustard', tex: 'knit' },
      { d: 'M26,15.6 Q32,15.2 38,15.6 L38,54.4 Q32,54.8 26,54.4 Z', yarn: 'oat', tex: 'cable', bare: true },
      { line: 'M26,15.6 L26,54.4 M38,15.6 L38,54.4', yarn: 'ink', w: 0.7 },
      { d: fluffy(11, 17, 2.6, 7), yarn: 'oat' },
      { d: fluffy(53, 17, 2.6, 7), yarn: 'oat' },
      { d: fluffy(11, 53, 2.6, 7), yarn: 'oat' },
      { d: fluffy(53, 53, 2.6, 7), yarn: 'oat' },
    ],
  },

  // ② 简单 ———————————————————————————————————————————————————————————————————————————————
  armwarmers: {
    parts: [
      { d: 'M11,15 h14 l1.5,33 h-17 z', yarn: 'plum', tex: 'knit' },
      { d: 'M11,11 h14 v6 h-14 z', yarn: 'oat', tex: 'rib' },
      { d: 'M9.5,46 h17 v7 h-17 z', yarn: 'oat', tex: 'rib' },
      { d: 'M10.2,30 h15.6 l0.2,3 h-16 z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M39,18 h14 l1.5,33 h-17 z', yarn: 'plum', tex: 'knit' },
      { d: 'M39,14 h14 v6 h-14 z', yarn: 'oat', tex: 'rib' },
      { d: 'M37.5,49 h17 v7 h-17 z', yarn: 'oat', tex: 'rib' },
      { d: 'M38.2,33 h15.6 l0.2,3 h-16 z', yarn: 'oat', tex: 'knit', bare: true },
    ],
  },
  cowl: {
    parts: [
      { d: `${ellipse(32, 37, 25, 19)} ${ellipse(32, 30, 14, 8)}`, yarn: 'sage', tex: 'rib', evenodd: true },
      { d: ellipse(32, 30, 14, 8), yarn: 'sage', inner: true },
      { d: 'M9.4,42 C16,52 48,52 54.6,42 L53.4,46.5 C46,56 18,56 10.6,46.5 Z', yarn: 'oat', tex: 'seed', bare: true },
      { line: 'M7.5,35 C12,47 52,47 56.5,35', yarn: 'ink', w: 0.6 },
    ],
  },
  marketbag: {
    parts: [
      { d: 'M40,9 L44.5,4 L46.5,5.2 L44,24 L40.5,24 Z', yarn: 'sage', bare: true },
      { line: 'M42,8 L45.5,4.6', yarn: 'ink', w: 0.6 },
      { d: ellipse(22, 25, 5, 5), yarn: 'mustard' },
      { line: 'M22.5,30 C22.5,10 31,10 31,30 M33,30 C33,10 41.5,10 41.5,30', yarn: 'denim', w: 2.2 },
      { d: 'M13,30 h38 l-4,24 a2,2 0 0 1 -2,2 h-26 a2,2 0 0 1 -2,-2 z', yarn: 'denim', tex: 'mesh' },
      { d: 'M12.5,27 h39 v4 h-39 z', yarn: 'denim', tex: 'rib' },
    ],
  },
  babyblanket: {
    parts: [
      { d: 'M55,33 L60,24 V43 L55,52 Z', yarn: 'oat', inner: true },
      { d: 'M9,33 L14,24 H60 L55,33 Z', yarn: 'oat', tex: 'seed' },
      { d: 'M11.8,28 L13.4,25.4 H59 L57.6,28 Z', yarn: 'sage', tex: 'knit', bare: true },
      { d: 'M9,33 h46 v19 h-46 z', yarn: 'oat', tex: 'seed' },
      { line: 'M9,39.5 h46 M9,45.5 h46', yarn: 'ink', w: 0.6 },
      { d: 'M9,48.5 h46 v3.5 h-46 z', yarn: 'sage', tex: 'garter', bare: true },
      { d: 'M27,36.5 c0,-2.2 3.4,-2.2 3.4,0 c0,-2.2 3.4,-2.2 3.4,0 c0,2.2 -3.4,4 -3.4,4 c0,0 -3.4,-1.8 -3.4,-4 z', yarn: 'rust', bare: true },
    ],
  },
  teacosy: {
    parts: [
      { d: 'M13,43 l-7,-9 l3,-1.5 l8,7 z', yarn: 'denim' },
      { line: 'M51,33 c7,0 7,11 0,11', yarn: 'denim', w: 2.4 },
      { d: 'M12,51 C12,23 52,23 52,51 Z', yarn: 'mustard', tex: 'rib' },
      { d: 'M11,47.5 h42 v4.5 h-42 z', yarn: 'rust', tex: 'garter' },
      { d: 'M13,38 C20,35 44,35 51,38 L51.5,41.5 C44,38.5 20,38.5 12.5,41.5 Z', yarn: 'rust', tex: 'knit', bare: true },
      { d: fluffy(32, 22, 5.5), yarn: 'rust' },
    ],
  },
  beanie: {
    parts: [
      { d: 'M14,41 C14,19 50,19 50,41 Z', yarn: 'sage', tex: 'knit' },
      { d: 'M15.4,32 C21,29.4 43,29.4 48.6,32 L49.5,36.4 C43,34.2 21,34.2 14.5,36.4 Z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M11,40 h42 a2,2 0 0 1 2,2 v8 a2,2 0 0 1 -2,2 h-42 a2,2 0 0 1 -2,-2 v-8 a2,2 0 0 1 2,-2 z', yarn: 'rust', tex: 'rib' },
      { d: fluffy(32, 15, 6.5), yarn: 'oat' },
    ],
  },

  // ③ 中级 ———————————————————————————————————————————————————————————————————————————————
  mittens: {
    parts: [
      { line: 'M17.5,54 C17.5,61 46.5,61 46.5,54', yarn: 'rust', w: 1 },
      { d: 'M26,31 C33.5,30 33.5,40.5 26,41.5 Z', yarn: 'rust', tex: 'knit' },
      { d: 'M9,31 C9,14 26,14 26,31 L26,45 L9,45 Z', yarn: 'rust', tex: 'knit' },
      { d: 'M9,35 h17 v3 h-17 z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M8,45 h19 v9 h-19 z', yarn: 'oat', tex: 'rib' },
      { d: 'M38,31 C30.5,30 30.5,40.5 38,41.5 Z', yarn: 'rust', tex: 'knit' },
      { d: 'M38,31 C38,14 55,14 55,31 L55,45 L38,45 Z', yarn: 'rust', tex: 'knit' },
      { d: 'M38,35 h17 v3 h-17 z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M37,45 h19 v9 h-19 z', yarn: 'oat', tex: 'rib' },
    ],
  },
  socks: {
    parts: [
      { d: 'M18,8 H34 V35 C34,39 37,41 41,41 H50 C54.5,41 57,44.5 57,49 C57,53.5 54.5,57 50,57 H25 C19.5,57 16,53 16,47 Z', yarn: 'denim', tex: 'knit' },
      { d: 'M18,8 H34 V15 H17.6 Z', yarn: 'oat', tex: 'rib' },
      { d: 'M17.4,20 H34 V23 H17.2 Z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M17,28 H34 V31 H16.8 Z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M16,45 C16,52 20,57 26,57 L31,57 L31,50.5 C25.5,50.5 22.5,47.5 22,43 Z', yarn: 'mustard', tex: 'knit' },
      { d: 'M49,41 H50 C54.5,41 57,44.5 57,49 C57,53.5 54.5,57 50,57 H47.5 C49.5,52 49.5,46 49,41 Z', yarn: 'mustard', tex: 'knit' },
    ],
  },
  cablescarf: {
    parts: [
      { line: 'M9,12 H55', yarn: 'brown', w: 2.6 },
      { d: ellipse(8.5, 12, 2.4, 2.4), yarn: 'brown' },
      { d: ellipse(55.5, 12, 2.4, 2.4), yarn: 'brown' },
      { d: 'M21,10 h22 v4 h-22 z', yarn: 'oat', inner: true },
      { d: 'M21,13 h22 v39 h-22 z', yarn: 'oat', tex: 'seed' },
      { d: 'M25.5,13 h6 v39 h-6 z', yarn: 'oat', tex: 'cable', bare: true },
      { d: 'M32.5,13 h6 v39 h-6 z', yarn: 'oat', tex: 'cable', bare: true },
      { line: 'M25.5,13 V52 M31.5,13 V52 M32.5,13 V52 M38.5,13 V52', yarn: 'ink', w: 0.5 },
      { line: fringe([22.5, 25.5, 28.5, 31.5, 34.5, 37.5, 40.5], 52, 6), yarn: 'oat', w: 1.3 },
    ],
  },
  slippers: {
    parts: [
      { d: ellipse(21, 34, 10, 21), yarn: 'rust', tex: 'garter' },
      { d: `${ellipse(21, 42, 7.4, 11.4)} ${ellipse(21, 42, 5.8, 9.6)}`, yarn: 'oat', tex: 'rib', evenodd: true },
      { d: ellipse(21, 42, 5.8, 9.6), yarn: 'rust', inner: true },
      { d: fluffy(21, 18, 4.2, 9), yarn: 'oat' },
      { d: ellipse(43, 36, 10, 21), yarn: 'rust', tex: 'garter' },
      { d: `${ellipse(43, 44, 7.4, 11.4)} ${ellipse(43, 44, 5.8, 9.6)}`, yarn: 'oat', tex: 'rib', evenodd: true },
      { d: ellipse(43, 44, 5.8, 9.6), yarn: 'rust', inner: true },
      { d: fluffy(43, 20, 4.2, 9), yarn: 'oat' },
    ],
  },
  plush: {
    parts: [
      { d: ellipse(20.5, 12.5, 6, 6), yarn: 'brown', tex: 'knit' },
      { d: ellipse(43.5, 12.5, 6, 6), yarn: 'brown', tex: 'knit' },
      { d: ellipse(20.5, 12.5, 3, 3), yarn: 'oat', bare: true },
      { d: ellipse(43.5, 12.5, 3, 3), yarn: 'oat', bare: true },
      { d: 'M19.5,38 c-6.5,2 -8.5,9.5 -4.5,11.5 c3,1.5 6.5,-3 7.5,-7.5 z', yarn: 'brown', tex: 'knit' },
      { d: 'M44.5,38 c6.5,2 8.5,9.5 4.5,11.5 c-3,1.5 -6.5,-3 -7.5,-7.5 z', yarn: 'brown', tex: 'knit' },
      { d: ellipse(32, 46, 14, 11.5), yarn: 'brown', tex: 'knit' },
      { d: ellipse(32, 47.5, 7.5, 6.5), yarn: 'oat', tex: 'garter', bare: true },
      { d: ellipse(22.5, 55, 6, 4.2), yarn: 'brown', tex: 'knit' },
      { d: ellipse(41.5, 55, 6, 4.2), yarn: 'brown', tex: 'knit' },
      { d: ellipse(32, 24, 14, 12), yarn: 'brown', tex: 'knit' },
      { d: ellipse(32, 29, 6.2, 4.6), yarn: 'oat', tex: 'garter' },
      { d: 'M30,27.2 h4 l-2,2.4 z', yarn: 'brown', inner: true },
      { line: 'M32,29.6 v1.6 M30.2,31.6 q1.8,1.2 3.6,0', yarn: 'ink', w: 0.8 },
      { d: ellipse(26.5, 21.5, 1.4, 1.6), yarn: 'brown', inner: true },
      { d: ellipse(37.5, 21.5, 1.4, 1.6), yarn: 'brown', inner: true },
      { d: 'M20.5,34 C26,37.5 38,37.5 43.5,34 L43.5,37.5 C38,41 26,41 20.5,37.5 Z', yarn: 'rust', tex: 'rib' },
    ],
  },
  vest: {
    parts: [
      { d: 'M20,8 L26,8 L32,24 L38,8 L44,8 C44,15 47,19 52,21 L52,56 L12,56 L12,21 C17,19 20,15 20,8 Z', yarn: 'denim', tex: 'knit' },
      { d: 'M22,33 l5,6 l-5,6 l-5,-6 z', yarn: 'mustard', tex: 'knit', bare: true },
      { d: 'M32,33 l5,6 l-5,6 l-5,-6 z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M42,33 l5,6 l-5,6 l-5,-6 z', yarn: 'mustard', tex: 'knit', bare: true },
      { d: 'M27,27 l5,6 l-5,6 l-5,-6 z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M37,27 l5,6 l-5,6 l-5,-6 z', yarn: 'oat', tex: 'knit', bare: true },
      { d: 'M27,39 l5,6 l-5,6 l-5,-6 z', yarn: 'mustard', tex: 'knit', bare: true },
      { d: 'M37,39 l5,6 l-5,6 l-5,-6 z', yarn: 'mustard', tex: 'knit', bare: true },
      { d: 'M26,8 L32,24 L38,8 L35.4,8 L32,17.4 L28.6,8 Z', yarn: 'oat', tex: 'rib' },
      { d: 'M12,50 h40 v6 h-40 z', yarn: 'oat', tex: 'rib' },
    ],
  },

  // ④ 熟练 ———————————————————————————————————————————————————————————————————————————————
  colorworkhat: {
    parts: [
      { d: 'M14,42 C14,19 50,19 50,42 Z', yarn: 'oat', tex: 'knit' },
      { d: 'M15.2,30 C22,27.4 42,27.4 48.8,30 L49.8,37.4 C42,35.4 22,35.4 14.2,37.4 Z', yarn: 'oat', tex: 'fair-rust', bare: true },
      { d: 'M14.2,37.4 C22,35.4 42,35.4 49.8,37.4 L50,40.6 L14,40.6 Z', yarn: 'denim', tex: 'knit', bare: true },
      { d: 'M11,40 h42 a2,2 0 0 1 2,2 v8 a2,2 0 0 1 -2,2 h-42 a2,2 0 0 1 -2,-2 v-8 a2,2 0 0 1 2,-2 z', yarn: 'denim', tex: 'rib' },
      { d: fluffy(32, 15.5, 6.5), yarn: 'rust' },
    ],
  },
  cardigan: {
    parts: [
      { d: 'M23,9 L12,13 L4,40 L11,42.5 L16,27 L16,56 L48,56 L48,27 L53,42.5 L60,40 L52,13 L41,9 L32,27 Z', yarn: 'plum', tex: 'knit' },
      ...CUFFS,
      { d: 'M16,51 h32 v5 h-32 z', yarn: 'oat', tex: 'rib' },
      { d: 'M18.5,40 h8 v8 h-8 z', yarn: 'plum', tex: 'knit' },
      { d: 'M18.5,40 h8 v2.2 h-8 z', yarn: 'oat', tex: 'rib', bare: true },
      { d: 'M37.5,40 h8 v8 h-8 z', yarn: 'plum', tex: 'knit' },
      { d: 'M37.5,40 h8 v2.2 h-8 z', yarn: 'oat', tex: 'rib', bare: true },
      { d: 'M23,9 L32,27 L32,56 L28.8,56 L28.8,28 L20.4,10 Z', yarn: 'oat', tex: 'rib' },
      { d: 'M41,9 L32,27 L32,56 L35.2,56 L35.2,28 L43.6,10 Z', yarn: 'oat', tex: 'rib' },
      { d: ellipse(30.4, 33, 1.5, 1.5), yarn: 'mustard' },
      { d: ellipse(30.4, 41, 1.5, 1.5), yarn: 'mustard' },
      { d: ellipse(30.4, 49, 1.5, 1.5), yarn: 'mustard' },
    ],
  },
  shawl: {
    parts: [
      { d: `M4,13 L60,13${scallops(60, 13, 32, 54, 12)}${scallops(32, 54, 4, 13, 12)} Z`, yarn: 'sage', tex: 'lace' },
      { d: 'M4,13 L60,13 L58,16 L6,16 Z', yarn: 'sage', tex: 'garter', bare: true },
      { line: 'M12,19 L32,48 L52,19', yarn: 'ink', w: 0.6 },
      { line: 'M32,55 v2 M4,13 v3 M60,13 v3', yarn: 'mustard', w: 1.2 },
      { d: 'M29.8,57 h4.4 l1.4,5 h-7.2 z', yarn: 'mustard', tex: 'rib' },
      { d: 'M1.8,16 h4.4 l1.2,5 h-6.8 z', yarn: 'mustard', tex: 'rib' },
      { d: 'M57.8,16 h4.4 l1.2,5 h-6.8 z', yarn: 'mustard', tex: 'rib' },
    ],
  },
  sweater: {
    parts: [
      { d: SWEATER, yarn: 'oat', tex: 'seed' },
      { d: 'M21,19 h5.5 v32 h-5.5 z', yarn: 'oat', tex: 'cable', bare: true },
      { d: 'M29.25,16 h5.5 v35 h-5.5 z', yarn: 'oat', tex: 'cable', bare: true },
      { d: 'M37.5,19 h5.5 v32 h-5.5 z', yarn: 'oat', tex: 'cable', bare: true },
      { line: 'M21,19 V51 M26.5,19 V51 M29.25,16 V51 M34.75,16 V51 M37.5,19 V51 M43,19 V51', yarn: 'ink', w: 0.5 },
      ...CUFFS,
      { d: 'M16,51 h32 v5 h-32 z', yarn: 'oat', tex: 'rib' },
      { d: 'M23,9 C25,14 39,14 41,9 L38.6,7.8 C36.6,11 27.4,11 25.4,7.8 Z', yarn: 'oat', tex: 'rib' },
    ],
  },
  fairisle: {
    parts: [
      { d: SWEATER, yarn: 'denim', tex: 'knit' },
      { d: 'M23,9 L12,13 L9.6,20 C18,29.5 46,29.5 54.4,20 L52,13 L41,9 C39,14 25,14 23,9 Z', yarn: 'oat', tex: 'fair-rust', bare: true },
      { d: 'M9.6,20 C18,29.5 46,29.5 54.4,20 L55.3,23.4 C46,33 18,33 8.7,23.4 Z', yarn: 'mustard', tex: 'knit', bare: true },
      { line: 'M9.6,20 C18,29.5 46,29.5 54.4,20 M8.7,23.4 C18,33 46,33 55.3,23.4', yarn: 'ink', w: 0.5 },
      { d: 'M16,46 h32 v5 h-32 z', yarn: 'oat', tex: 'fair-denim', bare: true },
      { d: 'M16,51 h32 v5 h-32 z', yarn: 'denim', tex: 'rib' },
      { d: 'M4,40 L11,42.5 L9.8,46.6 L2.8,44 Z', yarn: 'denim', tex: 'rib' },
      { d: 'M60,40 L53,42.5 L54.2,46.6 L61.2,44 Z', yarn: 'denim', tex: 'rib' },
      { d: 'M23,9 C25,14 39,14 41,9 L38.6,7.8 C36.6,11 27.4,11 25.4,7.8 Z', yarn: 'denim', tex: 'rib' },
    ],
  },
  blanket: {
    parts: [
      { line: fringe([11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53], 53, 5), yarn: 'rust', w: 1.1 },
      { d: 'M9,9 h46 v44 h-46 z', yarn: 'oat', tex: 'garter' },
      ...(
        [
          ['rust', 'cable'],
          ['mustard', 'seed'],
          ['sage', 'knit'],
          ['denim', 'fair-oat'],
          ['plum', 'lace'],
          ['rust', 'garter'],
          ['sage', 'knit'],
          ['mustard', 'cable'],
          ['denim', 'seed'],
        ] as [Yarn, Tex][]
      ).map(([yarn, tex], i): Part => {
        const x = 12 + (i % 3) * 13.34;
        const y = 12 + Math.floor(i / 3) * 12.67;
        return { d: `M${f(x)},${f(y)} h13.34 v12.67 h-13.34 z`, yarn, tex };
      }),
      { d: 'M41,9 L55,9 L55,23 Z', yarn: 'oat', inner: true },
      { d: 'M41,9 L55,23 L41,23 Z', yarn: 'oat', tex: 'garter' },
    ],
  },
};
