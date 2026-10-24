import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

// P9U-5 (Ocean 2026-10-24: 「把 API 和 CLI 区分开来，两个比重一样，用户让 CLI 和 API 的功能范围完全一致」) —
// the one frame both roads sit in on the 「AI 引擎」 page: the same border, the same heading, one line on
// what it is, its own block (LocalEngine / ApiKey), and the same line at the bottom saying what it can do.
// Neither is 「the second route」 any more.
//
// ⚠️ Stacked, not side by side: the settings window is 480px wide, which would leave each column about
// 210px — narrower than the key box and the model list need. Same size, same order of parts.

/** The four AI features, the same on both roads. `followUp` = why 跟进 is not available on this one
 *  right now (Gemini CLI; a vendor without web search), or null. */
export function RoadCan({ followUp }: { followUp: string | null }) {
  const t = useT();
  return (
    <p className="mt-2.5 border-t border-line pt-2 text-[11px] text-muted">
      {t('能做：')}
      {t('周回顾')} · {t('跟进')}
      {followUp && <span style={{ color: 'var(--urgent)' }}>（{followUp}）</span>} · {t('压缩')} · {t('过期检测')}
    </p>
  );
}

export default function RoadCard({
  title,
  note,
  followUp,
  children,
}: {
  title: string;
  note: string;
  followUp: string | null;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-line bg-paper p-3">
      <div className="text-sm text-ink">{title}</div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{note}</p>
      <div className="mt-2.5">{children}</div>
      <RoadCan followUp={followUp} />
    </section>
  );
}
