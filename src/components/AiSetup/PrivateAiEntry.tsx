import { EyeOff } from 'lucide-react';
import { useT } from '@/lib/i18n';

// P9E-3 (Ocean 2026-10-15 第 122 条) — an AI entry inside a private project. Spool's own AI
// features leave a private project alone, so the entry is closed whether or not an engine is
// set up. Same grey and layout as LockedAiEntry, but no button: the engine is not what is
// missing, and turning it on would change nothing. The way out is making the project not
// private, from the sidebar's right-click menu.
// ⚠️ EyeOff, not Lock: in this app Lock already means 「this AI entry is not switched on」 (P9C).

/** The one sentence, wherever a private project closes an AI entry. */
function PrivateReason() {
  const t = useT();
  return (
    <>
      {t(
        '私密项目：通过 Spool 连接的 AI 读不到它，Spool 自带的 AI 也不碰它。要用这里，先在左栏右键这个项目，点「取消私密」。',
      )}
    </>
  );
}

export default function PrivateAiEntry({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1.5 text-xs text-muted opacity-70">
        <EyeOff size={11} className="flex-none" />
        {label}
      </span>
      <p className="text-[11px] leading-relaxed text-muted">
        <PrivateReason />
      </p>
    </div>
  );
}

/** A project tab (压缩 / 过期检测) in a private project: its own name and the same sentence. */
export function PrivateAiPage({ label }: { label: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-[420px]">
        <PrivateAiEntry label={label} />
      </div>
    </div>
  );
}

/** The small mark after a tab's name in a private project. */
export function PrivateTabMark() {
  return <EyeOff size={10} className="ml-1 inline-block align-[-1px]" aria-hidden />;
}
