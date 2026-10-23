import { useEffect, useRef, useState } from 'react';
import { isFollowUpSource, isMcpSource, sourceIcon } from '@/lib/blocks/sourceIcon';
import type { Block } from '@/lib/db/blocks';
import { isImeComposing } from '@/lib/utils/ime';
import { useBlocksStore } from '@/stores/blocksStore';
import { useT } from '@/lib/i18n';

interface Props {
  block: Block;
  // Digest view renders blocks read-only — the badge becomes a static label.
  readOnly?: boolean;
}

// Editable provenance badge (PLAN_EN.md §Phase 5: "Editable source"). The badge sits
// in the block header next to the timestamp. Clicking flips it to an inline input —
// Enter or blur commits, Esc cancels. When the block has no source yet, the badge is
// hidden by default and surfaces on hover of the parent block ("+ 来源") so the user
// can label captures whose foreground-app detection missed.
export default function SourceBadge({ block, readOnly }: Props) {
  const t = useT();
  const setSource = useBlocksStore((s) => s.setSource);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(block.source ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setValue(block.source ?? '');
  }, [block.source, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = async (): Promise<void> => {
    const trimmed = value.trim();
    const next = trimmed.length > 0 ? trimmed : null;
    setEditing(false);
    if (next === (block.source ?? null)) return;
    try {
      await setSource(block.id, next);
    } catch (e) {
      console.error('[source-badge] persist failed', e);
    }
  };

  const cancel = (): void => {
    setValue(block.source ?? '');
    setEditing(false);
  };

  // MCP-written blocks (cowork, Ocean #4): dedicated icon + a hint of accent so the
  // AI's contributions read apart from the user's at a glance — badge only, the block
  // body stays identical (§2.5 presence-not-pressure; §2.6 rejected colored blocks).
  const mcp = isMcpSource(block.source);
  const badgeTone = mcp ? 'text-accent' : 'text-muted';
  // P9S-6: a follow-up's find says so before anything else on the line.
  const followUpTag = isFollowUpSource(block.source) ? <FollowUpTag /> : null;

  // Digest read-mode (§11.2): the badge is a static label, no click-to-edit.
  if (readOnly) {
    if (!block.source) return null;
    const Icon = sourceIcon(block.source);
    return (
      <span className={`inline-flex items-center gap-1 px-1 text-[10px] ${badgeTone}`}>
        {followUpTag}
        <Icon size={12} className="flex-none" />
        {block.source}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (isImeComposing(e.nativeEvent)) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder={t('标注来源')}
        maxLength={40}
        spellCheck={false}
        className="w-[120px] rounded border border-line-strong bg-paper px-1 py-0 font-ui text-[10px] text-ink outline-none focus:border-accent"
      />
    );
  }

  if (block.source) {
    // Source-category icon at the head of the badge (PLAN_EN.md §9.3) — current text
    // colour, no fill, the source label follows it.
    const Icon = sourceIcon(block.source);
    return (
      <span className="inline-flex items-center gap-1">
      {followUpTag}
      <button
        onClick={() => setEditing(true)}
        className={`inline-flex items-center gap-1 rounded px-1 py-0 text-[10px] ${badgeTone} transition-colors hover:bg-paper-2 hover:text-ink`}
        title={t('点击编辑来源')}
      >
        <Icon size={12} className="flex-none" />
        {block.source}
      </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="rounded px-1 py-0 text-[10px] text-muted/60 opacity-0 transition-opacity hover:bg-paper-2 hover:text-ink group-hover:opacity-100"
      title={t('添加来源标签')}
    >
      {t('+ 来源')}
    </button>
  );
}

/** P9S-6 — 「跟进」, in the same small bordered pill the timeline uses for 「已不作数」. Also on the review
 *  card (ReviewPanel), so the mark is the same before and after the block is let in. */
export function FollowUpTag() {
  const t = useT();
  return (
    <span
      title={t('这一块是「联网搜索」跟进带回来的')}
      className="flex-none rounded border border-accent/50 px-1 text-[10px] leading-[14px] text-accent"
    >
      {t('跟进')}
    </span>
  );
}
