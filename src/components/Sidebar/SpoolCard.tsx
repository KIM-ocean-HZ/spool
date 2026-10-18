import { usePanelFace } from '@/hooks/usePanelFace';
import { useSettingsStore } from '@/stores/settingsStore';
import BreakClock from './BreakClock';
import { KnitFace, KnitFooter, useKnitRefresh } from '@/components/Knit/KnitPanel';
import { useKnitStore } from '@/stores/knitStore';

// 首日价值二期 (DESIGN_FIRST_DAY_VALUE) — 「我攒了多少」, now knitted.
//
// 织布（Ocean 2026-10-17 选的 B，HANDOFF §9.2 第 154 – 155 条）：the spool that wound every 100
// captures is gone (「UI 设计很简陋，并且没什么趣味性」). 10-18 the 情人节 heart went the same way
// (第 156 条「情人节也换成织布，逻辑一样，就改颜色」) — there is no branch on the theme in this panel
// any more; the yarn colours are tokens (`--yarn-*`, tokens.css).
//
// ⚠️⚠️ **`AI 写入 N 条` used to be here and was cut on purpose** (Ocean 2026-08-11:
// 「把 AI 写入去掉，太多数字显得太乱」). The panel has one subject — the user's own pile — and the
// knitting keeps it: a stitch is a block of your own, AI write-backs never count.
//
// ⚠️ Decisions in here are Ocean's and cost something. Don't quietly undo them:
//
// 1. **Nothing is written.** Every number is a query (一期's rule, §5-1): stitches and patches are
//    counted from the blocks each time; only what was knitted (spent) is kept, in knit.json.
// 2. **The card is always here** (拍板 3), on a day with nothing knitted too — a progress mark that
//    hides on the day you did nothing is missing on precisely the day it had a job.
// 3. **Layout, laid out five times** (Ocean, in order: 「右边什么都没有,而左边很紧凑」 → 「太大个了」 →
//    「文字和数字放一起,不能拆分到距离这么远」 → 「黑色字体和灰色字体交替摆放很乱」 →
//    「保证线轴左边只有两行字」): a phrase is never split; one tone, no emphasis; exactly two lines
//    beside the mark. KnitPanel keeps all three.
export default function SpoolCard() {
  // 休息提醒 (2026-08-19 second pass, Ocean) — the panel has a SECOND FACE: the countdown for the
  // current sitting, alternating with the counts (BreakClock; usePanelFace owns the when).
  // ⚠️ With the reminder switched off there is nothing to count down to, and his rule for that
  // case is 「面板就只显示捕捉数量」 — which is exactly what usePanelFace returns when handed false.
  const breakReminderEnabled = useSettingsStore((s) => s.breakReminderEnabled);
  const face = usePanelFace(breakReminderEnabled);
  // The counts the knitting face, the cupboard and the weekly line read (knitStore): re-read after a
  // capture, after any change to the blocks on screen, and when the window comes back to the front.
  useKnitRefresh();
  // Nothing until the first count is in, rather than a frame of 「今天织了 0 针」.
  const loaded = useKnitStore((s) => s.loaded);
  if (!loaded) return null;

  return (
    /* ⚠️ A frame, but still no fill — 变体 D, which Ocean picked out of B/C/D (HANDOFF §0.10 ①).
       The two halves of that are separate decisions and both have to hold:

       - **No fill.** A card lighter than the rail it sits in is a raised object, and this panel
         is a readout, not an object (Ocean 2026-08-11: 「简洁，安静，不抢眼」).
       - **A hairline border, added back.** Unframed, the panel's own inner rule sat a few pixels
         from 最近's section rule with nothing to say which side of it the row under it belonged
         to — two horizontal lines that close together read as one paragraph break. The frame is
         what makes the inner rule an internal division rather than a boundary in the rail. */
    <div className="mt-2.5 rounded-md border border-line px-3 py-2">
      <div className="flex items-center gap-3">{face === 'clock' ? <BreakClock /> : <KnitFace />}</div>
      {/* Under the rule, on both faces: how many patches are put by and what is next. */}
      <KnitFooter />
    </div>
  );
}
