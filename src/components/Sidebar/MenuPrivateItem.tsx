import { EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/i18n';

// P9E-4 (Ocean 2026-10-15 第 119 条) — 「设为私密 / 取消私密」 as a row of a project's right-click
// menu, acting on the whole selection like 「移到工作区」. Two steps, the shape of MenuDeleteItem:
// the first click opens a short explanation in place, the second makes it so.
// ⚠️ The explanation says what it is honestly (task book §2.2): it keeps the project out of
// what Spool hands an AI — not out of reach of an AI that reads files on the disk itself.

/** Any project in the selection not yet private ⇒ the row makes them all private. */
export const privateMenuTurnsOn = (flags: boolean[]): boolean => flags.some((p) => !p);

export function PrivateConfirm({
  turnOn,
  onConfirm,
  onCancel,
}: {
  turnOn: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <div className="w-[260px] space-y-1.5 px-3 py-2 text-[11px] leading-relaxed text-ink-2">
      {turnOn ? (
        <>
          <p>{t('通过 Spool 连接的 AI（Claude、Codex……）读不到私密项目，也不知道它存在，但还能往里写。')}</p>
          <p>{t('Spool 自带的 AI 功能（周回顾、压缩、过期检测、跟进）也不碰它。你自己用起来和平常一样。')}</p>
          <p className="text-muted">
            {t('管不了的一种：能直接读你电脑上文件的 AI，绕开 Spool 去读，还是读得到。')}
          </p>
        </>
      ) : (
        <p>{t('取消私密之后，通过 Spool 连接的 AI 又能读到它，Spool 自带的 AI 功能也能用了。')}</p>
      )}
      <div className="flex items-center gap-3 pt-0.5">
        <button type="button" role="menuitem" onClick={onConfirm} className="text-xs font-medium text-accent">
          {turnOn ? t('设为私密') : t('取消私密')}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-muted hover:text-ink">
          {turnOn ? t('取消') : t('保持私密')}
        </button>
      </div>
    </div>
  );
}

export default function MenuPrivateItem({
  turnOn,
  onConfirm,
}: {
  turnOn: boolean;
  onConfirm: () => void;
}) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  if (asking) {
    return <PrivateConfirm turnOn={turnOn} onConfirm={onConfirm} onCancel={() => setAsking(false)} />;
  }
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => setAsking(true)}
      className="flex w-full items-center gap-1.5 px-3 py-1 text-left text-xs text-ink hover:bg-paper-2"
    >
      <EyeOff size={11} className="flex-none text-muted" />
      {turnOn ? t('设为私密…') : t('取消私密…')}
    </button>
  );
}
