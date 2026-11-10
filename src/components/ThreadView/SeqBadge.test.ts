import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Block } from '@/lib/db/blocks';
import SeqBadge, { digitLayout, projectDigits, ringFor } from './SeqBadge';

// Ocean 2026-11-10: 「可以永远保证数字在圆心位置，且不会超出圆」. "Always" is checked, not sampled: every number
// up to 99 999, in every ring big enough to be asked to hold it (a project's ring can be bigger than the number).
const STROKE = 1;
const GAP = 0.75;

describe('SeqBadge geometry', () => {
  it('puts the digits’ ink box centre on the ring centre and keeps its corners inside the ring', () => {
    let worst = Infinity; // smallest clearance seen, px
    for (let n = 0; n <= 99_999; n++) {
      const text = String(n);
      for (let ringDigits = text.length; ringDigits <= 5; ringDigits++) {
        const ring = ringFor(ringDigits);
        const { scale, tx, ty, box } = digitLayout(text, ring);
        const c = ring.diameter / 2;
        // Centre of the ink box on screen.
        const cx = tx + (scale * (box.x0 + box.x1)) / 2;
        const cy = ty - (scale * (box.y0 + box.y1)) / 2;
        if (Math.abs(cx - c) > 1e-9 || Math.abs(cy - c) > 1e-9) throw new Error(`${text} off centre in ring ${ringDigits}`);
        const room = c - STROKE - GAP;
        const halfW = (scale * (box.x1 - box.x0)) / 2;
        const halfH = (scale * (box.y1 - box.y0)) / 2;
        const clearance = room - Math.hypot(halfW, halfH);
        if (clearance < -1e-9) throw new Error(`${text} reaches the ring (${ringDigits}-digit ring)`);
        worst = Math.min(worst, clearance);
      }
    }
    // The widest number of each length sits exactly on the boundary by construction (so, GAP px clear of the
    // stroke); floating point puts that at ±1e-15.
    expect(worst).toBeGreaterThan(-1e-9);
  });

  it('is 13 / 15 / 18 / 22 px across, with the one-digit ring keeping the clock’s 9 px digits', () => {
    expect([1, 2, 3, 4, 5].map((n) => ringFor(n).diameter)).toEqual([13, 15, 18, 22, 26]);
    expect(ringFor(1).font).toBe(9);
    for (let n = 1; n <= 5; n++) expect(ringFor(n).font).toBeLessThanOrEqual(9);
    // Readable, not crushed: the shrink for three digits stays modest.
    expect(ringFor(3).font).toBeGreaterThan(7.5);
  });
});

describe('SeqBadge size per project', () => {
  const blocks = (...seqs: (number | null)[]) => seqs.map((seq) => ({ seq }) as Block);

  it('takes the digit count of the project’s highest number', () => {
    expect(projectDigits(undefined)).toBe(1);
    expect(projectDigits(blocks())).toBe(1);
    expect(projectDigits(blocks(3, null, 7))).toBe(1);
    expect(projectDigits(blocks(1, 13, 9))).toBe(2);
    expect(projectDigits(blocks(397, 2))).toBe(3);
  });

  it('draws a ring, the digits as shapes, and names the number for screen readers', () => {
    const html = renderToStaticMarkup(createElement(SeqBadge, { seq: 7 }));
    expect(html).toContain('width="13"');
    expect(html).toContain('aria-label="#7"');
    expect(html).toContain('<circle');
    expect(html.match(/<path /g)).toHaveLength(1);
    expect(html).not.toMatch(/>7</); // drawn, not typeset
  });

  it('gives a number the ring its own digits need when it is longer than the project’s', () => {
    const html = renderToStaticMarkup(createElement(SeqBadge, { seq: 1234 }));
    expect(html).toContain('width="22"');
    expect(html.match(/<path /g)).toHaveLength(4);
  });
});
