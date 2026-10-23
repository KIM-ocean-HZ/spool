import type { ThreadStatus } from '@/lib/db/threads';
import { useT } from '@/lib/i18n';

// A 4px filled dot whose colour encodes the thread's status (PLAN_EN.md §9.9, §13.2).
// Replaces the v2.5 ProgressRing — a discrete signal the user never has to maintain,
// not a continuous one to keep up to date. No animation: visuals stay quiet.

interface Props {
  status: ThreadStatus;
  /** P9S-4: an AI has written something in this project the user has not looked at yet. The dot turns
   *  green with a faint halo drawn outside its 4px, so the row does not move. */
  aiNew?: boolean;
}

const STATUS_COLOR: Record<ThreadStatus, string> = {
  active: 'var(--status-active)',
  parked: 'var(--status-parked)',
  done: 'var(--status-done)',
};

const STATUS_LABEL: Record<ThreadStatus, string> = {
  active: '进行中',
  parked: '搁置',
  done: '已完成',
};

export default function StatusDot({ status, aiNew = false }: Props) {
  const t = useT();
  return (
    <svg
      width={4}
      height={4}
      viewBox="0 0 4 4"
      className="flex-none overflow-visible"
      role="img"
      aria-label={aiNew ? t('AI 写进来了新内容') : t(STATUS_LABEL[status])}
    >
      {aiNew && <circle cx={2} cy={2} r={4} fill="var(--ai-new)" fillOpacity={0.22} />}
      <circle cx={2} cy={2} r={aiNew ? 2.5 : 2} fill={aiNew ? 'var(--ai-new)' : STATUS_COLOR[status]} />
    </svg>
  );
}
