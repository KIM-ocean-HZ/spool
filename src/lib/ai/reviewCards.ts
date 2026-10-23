// P9S-5 (Ocean 2026-10-23, HANDOFF §9.2 第 172 条): 「周回顾的一周信息我不想把所有项目的信息全部堆在
// 一块，做成每个项目一张卡片……做好格式化，显示在卡片上」 — the review text, cut into one card per
// project.
//
// ⚠️ A review is prose a model wrote, stored as one string (engine_runs.result_text). The prompts now ask
// for `## <project title>` per project (mcp.rs, both roads), but every review written before that — and
// any run where the model drifts — opens a project with a whole bold line instead (`**FLUX …**`, the
// real 10-21 one). Both are read as a card's title. Anything that will not split falls back to the old
// single block: `splitReview` returns null and the page draws the text as it always did.
//
// ⛔ Nothing is cut or reworded here. Every line of the text ends up somewhere on screen, in order.

export interface ReviewLine {
  /** 「做了什么」 / 「What moved」 … — null for a line that carried no label. */
  label: string | null;
  text: string;
}

export interface ReviewCard {
  title: string;
  /** What the model wrote after the title on the same line — 「（2026-09-23 截止，还剩 28 天）」. */
  note: string;
  lines: ReviewLine[];
}

export interface SplitReview {
  /** Whatever came before the first project (usually nothing). */
  intro: string;
  cards: ReviewCard[];
  /** The closing sentence — the one thing worth doing next — and anything else after the last card. */
  outro: string;
}

const HEADING = /^#{1,3}\s+(.+?)\s*#*\s*$/;
// The older way a review opened a project: a bold name, alone on its line or followed by a short note
// (「**Flux**（2026-09-23 截止，还剩 28 天）」). ⚠️ Not when a colon follows the bold — that is a labelled
// row (「**做了什么**：…」) — and not when a whole paragraph follows it (「**Flux** — 这一周没动。…」): a
// review written that way has no rows to put on a card, so it stays one block.
const BOLD_OPEN = /^\*\*([^*]+?)\*\*(.*)$/;
const NOTE_MAX = 40;
// `- **做了什么**：…`, without the bullet too, and with the colon inside the bold (`**做了什么：**`).
const FIELD = /^\s*(?:[-*•]\s+)?\*\*(.+?)\*\*\s*[：:]?\s*(.*)$/;
const BULLET = /^\s*[-*•]\s+/;
// The same row without the bold (「- 做了什么：…」, the 08-25 review): a bullet, a short label, a colon.
const PLAIN_FIELD = /^\s*[-*•]\s+([^：:*\s][^：:*]{0,11})[：:]\s*(.*)$/;
const COLON_END = /[：:]\s*$/;

const titleOf = (line: string): { title: string; note: string } | null => {
  const h = HEADING.exec(line);
  if (h) return { title: h[1]!.replace(/\*\*/g, '').replace(COLON_END, '').trim(), note: '' };
  const b = BOLD_OPEN.exec(line.trim());
  if (!b) return null;
  const rest = b[2]!.trim();
  if (/^[：:]/.test(rest) || COLON_END.test(b[1]!) || rest.length > NOTE_MAX) return null;
  return { title: b[1]!.trim(), note: rest };
};

/** A row label: bold, then a colon (outside or inside the bold) — or a short plain label on a bullet. */
const fieldOf = (line: string): ReviewLine | null => {
  const f = FIELD.exec(line);
  if (!f) {
    const p = PLAIN_FIELD.exec(line);
    return p ? { label: p[1]!.trim(), text: p[2]!.trim() } : null;
  }
  const inside = COLON_END.test(f[1]!);
  const after = line.slice(line.indexOf('**' + f[1]! + '**') + f[1]!.length + 4).trimStart();
  if (!inside && !/^[：:]/.test(after)) return null;
  return { label: f[1]!.replace(COLON_END, '').trim(), text: f[2]!.trim() };
};

export const splitReview = (text: string): SplitReview | null => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const intro: string[] = [];
  const cards: ReviewCard[] = [];
  // Lines of the last card that are not part of its labelled rows yet — they become the outro if no
  // further card follows.
  let tail: string[] = [];

  const flushTail = (into: ReviewCard): void => {
    const rest = tail.join('\n').trim();
    if (rest) into.lines.push({ label: null, text: rest });
    tail = [];
  };

  for (const line of lines) {
    const head = titleOf(line);
    if (head !== null) {
      const prev = cards[cards.length - 1];
      if (prev) flushTail(prev);
      cards.push({ ...head, lines: [] });
      continue;
    }
    const card = cards[cards.length - 1];
    if (!card) {
      intro.push(line);
      continue;
    }
    const field = fieldOf(line);
    if (field) {
      flushTail(card);
      card.lines.push(field);
      continue;
    }
    // A wrapped continuation of the row just above.
    const last = card.lines[card.lines.length - 1];
    if (last && tail.length === 0 && /^\s+\S/.test(line) && !BULLET.test(line)) {
      last.text = `${last.text}\n${line.trim()}`;
      continue;
    }
    // Any other bullet is a row of this card, just without a label (「- 离截止还有 28 天。」). Only plain
    // paragraphs wait in `tail` — after the last card, they are the closing text.
    if (BULLET.test(line)) {
      flushTail(card);
      card.lines.push({ label: null, text: line.replace(BULLET, '').trim() });
      continue;
    }
    tail.push(line);
  }

  // A closing sentence the model wrote entirely in bold reads like a title with nothing under it. A real
  // project always has rows, so an empty last 「card」 is the outro.
  let outro = tail.join('\n').trim();
  const last = cards[cards.length - 1];
  if (last && last.lines.length === 0 && cards.length > 1) {
    cards.pop();
    outro = [`**${last.title}**${last.note ? ` ${last.note}` : ''}`, outro].filter(Boolean).join('\n\n');
  }
  if (cards.length === 0) return null;
  return { intro: intro.join('\n').trim(), cards, outro };
};
