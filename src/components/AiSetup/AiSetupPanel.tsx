import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMenuPosition } from '@/components/ui/useMenuPosition';
import ApiKey from './ApiKey';
import LocalEngine from './LocalEngine';
import { apiKeyPresent, sidecarPresent } from '@/lib/ai/compress';
import { aiSetupPlan, type AiRoute } from '@/lib/engine/gate';
import { useT } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import { ENGINE_LABEL, useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';

// P9C (Ocean HANDOFF §9.2 第 93 – 95 条) — the 「AI 引擎」 piece of Settings, brought to wherever an
// AI entry is locked: 「锁着的地方提示用户去打开，给一个快捷键，不需要返回设置」.
//
// Two halves, the free one first, each only when its road applies (`aiSetupPlan`):
//   * the local Claude Code / Codex (Mac only): install links, or the MCP switches still off;
//   * the API key (P9U-3: any vendor's — `ApiKey`, the same block as Settings): paste a key and it
//     connects; connecting asks that vendor for its model list (free) and nothing else.
// Once it is on, the locked place reads the same store and opens by itself.
//
// ⛔ No Gemini CLI here (memory `gemini-free-tier-closed`: its free tier is gone, and the
// follow-up search cannot run on it), and no endpoint / model / reasoning — those stay in
// Settings, where one sentence points.

interface PanelProps {
  route: AiRoute;
  /** Called once a 「现在打开」 went through — the popover closes itself on it. */
  onDone?: () => void;
}

export function AiSetupPanel({ route, onDone }: PanelProps) {
  const t = useT();
  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const mcpWriteEnabled = useSettingsStore((s) => s.mcpWriteEnabled);
  const apiOn = useSettingsStore((s) => s.apiEngineEnabled);
  const status = useEngineStore((s) => s.status);

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  // null = still asking; counted as present until it says otherwise, as Settings does.
  const [sidecar, setSidecar] = useState<boolean | null>(null);

  const wantsApi = route !== 'cli' && !apiOn;
  useEffect(() => {
    if (!wantsApi) return;
    void apiKeyPresent().then(setHasKey, () => setHasKey(false));
    void sidecarPresent().then(setSidecar, () => setSidecar(false));
  }, [wantsApi]);

  const plan = aiSetupPlan({
    route,
    isMac: IS_MAC,
    cliAvailable: status?.available === true,
    mcpEnabled,
    mcpWriteEnabled,
    apiOn,
    apiKeyPresent: hasKey,
    sidecarPresent: sidecar !== false,
  });
  const engineName = status?.selected ? ENGINE_LABEL[status.selected] : null;

  return (
    <div className="space-y-3 text-[11px] leading-relaxed text-muted">
      {plan.cli && (
        <section className="space-y-1.5">
          <div className="text-xs text-ink">
            {plan.cli.kind === 'switches' && engineName
              ? t('用本机的 {engine}（不花钱）', { engine: engineName })
              : t('用本机的 Claude Code / Codex（不花钱）')}
          </div>
          {/* P9T: the same block as Settings → AI 引擎 — 没找到 / 找到了·连接 / 已连接, no paragraphs. */}
          <LocalEngine onConnected={onDone} />
        </section>
      )}

      {plan.api && (
        <section className={`space-y-1.5 ${plan.cli ? 'border-t border-line pt-3' : ''}`}>
          <div className="text-xs text-ink">{t('用你自己的 API key（按字数花钱）')}</div>
          {/* ⚠️ The sentence Settings keeps on screen at all times (ApiEngineConfig: §6.3
              「不要因为不好讲就不讲」), word for word. */}
          <p>
            {t(
              'Spool 主程序不发任何网络请求。连上 key 之后，请求由 Spool 启动的一个本地小程序发出，用你自己的 key 和额度，内容会到达你选的那家模型厂商。',
            )}
          </p>
          {plan.api.kind === 'checking' ? (
            <p className="flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" />
              {t('正在看你存没存过 key…')}
            </p>
          ) : (
            <ApiKey onConnected={onDone} />
          )}
        </section>
      )}
    </div>
  );
}

interface PopoverProps {
  /** Where the button that opened it sits (viewport coordinates). */
  anchor: { x: number; y: number };
  route: AiRoute;
  onClose: () => void;
}

/** The same panel, floating next to the button that asked for it. Esc and a click outside
 *  close it, like the rail's right-click menus (`useMenuPosition` keeps it on screen). */
export function AiSetupPopover({ anchor, route, onClose }: PopoverProps) {
  const pos = useMenuPosition(anchor);

  useEffect(() => {
    const onDown = (): void => onClose();
    // Capture phase, and stopped there: this popover can sit inside a panel that also closes
    // on Esc (the follow-up editor), and one Esc should close only the top thing.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={pos.ref}
      role="dialog"
      className="fixed z-50 max-h-[calc(100vh-16px)] w-[320px] overflow-y-auto rounded-md border border-line-strong bg-paper p-3 shadow-[var(--shadow-card)]"
      style={pos.style}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <AiSetupPanel route={route} onDone={onClose} />
    </div>,
    document.body,
  );
}
