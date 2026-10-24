import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useState } from 'react';
import { cliSwitchesPatch } from '@/lib/engine/gate';
import { useT } from '@/lib/i18n';
import { ENGINE_LABEL, useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';

// P9T (Ocean 2026-10-24: 「设置里面的 AI 引擎的注释根本起不了作用，解释这么多也比不过一个好用的自动
// 连接，重做」) — the local CLI, in the only three states a user can be in, with the one thing to press
// in each. The same block on the settings page and in the popover a locked AI button opens, so both
// say the same thing.
//
//   没找到        → install links, 「重新查找」, 「手动选择…」 (a file picker — nobody has to open a
//                   terminal and type `which` any more)
//   找到了·没连上 → 「连接」 (第 182 条: one button, not switched on behind the user's back) and the one
//                   line that says what it opens
//   已连接        → the name, and which copy (ChatGPT's own Codex says so — 第 183 条)
//
// Finding it is Rust's job (engine.rs `search_dirs`); coming back to the window after installing one
// looks again by itself (engineStore `probeIfMissing`).

/** P9T 第 183 条: the Codex inside the ChatGPT desktop app, used when there is no Codex of the user's own. */
export const isChatGptCodex = (path: string | null | undefined): boolean =>
  !!path && path.includes('/ChatGPT.app/');

const INSTALL = ['claude-code', 'codex'] as const;

export default function LocalEngine({ onConnected }: { onConnected?: () => void }) {
  const t = useT();
  const status = useEngineStore((s) => s.status);
  const probe = useEngineStore((s) => s.probe);
  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const mcpWriteEnabled = useSettingsStore((s) => s.mcpWriteEnabled);
  const manualPath = useSettingsStore((s) => s.aiEnginePath);
  const update = useSettingsStore((s) => s.update);
  const [finding, setFinding] = useState(false);

  const find = async (): Promise<void> => {
    setFinding(true);
    try {
      await probe();
    } finally {
      setFinding(false);
    }
  };
  const pick = async (): Promise<void> => {
    const picked = await open({ multiple: false, directory: false });
    if (typeof picked !== 'string') return;
    await update({ aiEnginePath: picked });
    await find();
  };

  const link = 'text-accent underline-offset-2 hover:underline disabled:opacity-50';
  const findAgain = (
    <button type="button" disabled={finding} onClick={() => void find()} className={link}>
      {t('重新查找')}
    </button>
  );

  if (status === null || (finding && !status.available)) {
    return <p className="text-xs text-muted">{t('正在找…')}</p>;
  }

  if (!status.available) {
    return (
      <div className="space-y-1 text-xs">
        <p className="text-ink-2">{t('没找到 Claude Code 或 Codex')}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {INSTALL.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                void invoke('open_mcp_client_page', { client: c }).catch((e) =>
                  console.warn('[engine] open install page failed', e),
                )
              }
              className={link}
            >
              {c === 'codex' ? t('装 Codex') : t('装 Claude Code')}
            </button>
          ))}
          <span className="text-line-strong">·</span>
          {findAgain}
          <button type="button" onClick={() => void pick()} className={link}>
            {t('手动选择…')}
          </button>
        </div>
        {manualPath ? (
          <p className="text-[11px]" style={{ color: 'var(--urgent)' }}>
            {t('选的这个文件不是 Claude Code / Codex，或者打不开。')}{' '}
            <button
              type="button"
              onClick={() => void update({ aiEnginePath: null }).then(find)}
              className="underline underline-offset-2"
            >
              {t('清除')}
            </button>
          </p>
        ) : (
          <p className="text-[11px] text-muted">{t('装好、在终端里登录一次之后，回到 Spool 它会自己出现。')}</p>
        )}
      </div>
    );
  }

  const kind = status.selected ?? status.engines[0]?.kind ?? 'claude';
  const name = isChatGptCodex(status.path)
    ? t('{engine}（ChatGPT 自带的）', { engine: ENGINE_LABEL[kind] })
    : ENGINE_LABEL[kind];
  const missing = (['mcpEnabled', 'mcpWriteEnabled'] as const).filter((k) =>
    k === 'mcpEnabled' ? !mcpEnabled : !mcpWriteEnabled,
  );

  if (missing.length > 0) {
    return (
      <div className="space-y-1 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-ink-2" title={status.path ?? undefined}>
            {t('找到了 {engine}', { engine: name })}
          </span>
          <button
            type="button"
            onClick={() => void update(cliSwitchesPatch(missing)).then(() => onConnected?.())}
            className="rounded-md border border-accent bg-accent/10 px-2.5 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
          >
            {t('连接')}
          </button>
        </div>
        <p className="text-[11px] text-muted">{t('连接之后，你接过的别的 AI 也能读写项目。')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span style={{ color: 'var(--status-active)' }} title={status.path ?? undefined}>
        {status.engines.length > 1
          ? t('✓ 已连接 {name}（还装了另外 {n} 个）', { name, n: status.engines.length - 1 })
          : t('✓ 已连接 {name}', { name })}
      </span>
      {findAgain}
    </div>
  );
}
