import { Lock } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { AiRoute } from '@/lib/engine/gate';
import { useT } from '@/lib/i18n';
import { AiSetupPopover } from './AiSetupPanel';

// P9C — what an AI entry looks like while no road to it is open, the same everywhere: its own
// name greyed, a lock, one sentence on why, and a button that opens the 「AI 引擎」 piece right
// here (Ocean 第 93、95 条 — no trip to Settings, no tab switch).

/** A button that opens the 「AI 引擎」 piece beside itself. */
export function AiSetupButton({
  route,
  className,
  title,
  children,
}: {
  route: AiRoute;
  className: string;
  title?: string;
  children: ReactNode;
}) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <button
        type="button"
        title={title}
        // The popover closes on any mousedown outside it; this one is the toggle instead.
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor((a) => (a ? null : { x: r.left, y: r.bottom + 4 }));
        }}
        className={className}
      >
        {children}
      </button>
      {anchor && <AiSetupPopover anchor={anchor} route={route} onClose={() => setAnchor(null)} />}
    </>
  );
}

export default function LockedAiEntry({
  label,
  reason,
  route,
}: {
  /** The entry's own name, as it reads when it works. */
  label: string;
  reason: ReactNode;
  route: AiRoute;
}) {
  const t = useT();
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5 text-xs text-muted opacity-70">
          <Lock size={11} className="flex-none" />
          {label}
        </span>
        <AiSetupButton
          route={route}
          className="text-[11px] text-accent underline-offset-2 hover:underline"
        >
          {t('怎么打开')}
        </AiSetupButton>
      </div>
      <p className="text-[11px] leading-relaxed text-muted">{reason}</p>
    </div>
  );
}
