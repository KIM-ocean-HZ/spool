import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMenuPosition } from '@/components/ui/useMenuPosition';
import { apiKeyPresent, saveApiKey, sidecarPresent } from '@/lib/ai/compress';
import { aiSetupPlan, cliSwitchesPatch, type AiRoute, type McpSwitch } from '@/lib/engine/gate';
import { useT } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import { ENGINE_LABEL, useEngineStore } from '@/stores/engineStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/toastStore';

// P9C (Ocean HANDOFF §9.2 第 93 – 95 条) — the 「AI 引擎」 piece of Settings, brought to wherever an
// AI entry is locked: 「锁着的地方提示用户去打开，给一个快捷键，不需要返回设置」.
//
// Two halves, the free one first, each only when its road applies (`aiSetupPlan`):
//   * the local Claude Code / Codex (Mac only): install links, or the MCP switches still off;
//   * DeepSeek: the key box (only if none is stored) and the switch.
// 「现在打开」 changes exactly the settings it names and sends nothing anywhere — no request, no
// balance check. Once it is on, the locked place reads the same store and opens by itself.
//
// ⛔ No Gemini CLI here (memory `gemini-free-tier-closed`: its free tier is gone, and the
// follow-up search cannot run on it), and no endpoint / model / reasoning — those stay in
// Settings, where one sentence points.

type Update = (patch: {
  mcpEnabled?: boolean;
  mcpWriteEnabled?: boolean;
  apiEngineEnabled?: boolean;
}) => Promise<void>;

/** The CLI half's 「现在打开」: exactly the switches that were off. */
export const turnOnCli = (missing: McpSwitch[], update: Update): Promise<void> =>
  update(cliSwitchesPatch(missing));

/** The DeepSeek half's 「现在打开」: store the key when one was typed (same keychain path as
 *  Settings), then the switch. Nothing else. */
export async function turnOnApi(
  key: string | null,
  update: Update,
  saveKey: (key: string) => Promise<void> = saveApiKey,
): Promise<void> {
  if (key !== null) await saveKey(key.trim());
  await update({ apiEngineEnabled: true });
}

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
  const update = useSettingsStore((s) => s.update);
  const status = useEngineStore((s) => s.status);
  const probe = useEngineStore((s) => s.probe);

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  // null = still asking; counted as present until it says otherwise, as Settings does.
  const [sidecar, setSidecar] = useState<boolean | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probedOnce, setProbedOnce] = useState(false);

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

  const act = async (run: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await run();
      onDone?.();
    } catch (e) {
      toast.error(t('没打开'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const recheck = async (): Promise<void> => {
    setProbing(true);
    await probe();
    setProbing(false);
    setProbedOnce(true);
  };

  const primary =
    'rounded-md border border-accent bg-accent/10 px-2.5 py-1 text-xs text-accent transition-colors enabled:hover:bg-accent/20 disabled:opacity-50';
  const secondary =
    'rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-ink-2 transition-colors enabled:hover:border-line-strong disabled:opacity-50';

  return (
    <div className="space-y-3 text-[11px] leading-relaxed text-muted">
      {plan.cli && (
        <section className="space-y-1.5">
          <div className="text-xs text-ink">
            {plan.cli.kind === 'switches' && engineName
              ? t('用本机的 {engine}（不花钱）', { engine: engineName })
              : t('用本机的 Claude Code / Codex（不花钱）')}
          </div>
          {plan.cli.kind === 'install' ? (
            <>
              <div className="flex flex-wrap gap-x-3">
                {(['claude-code', 'codex'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      void invoke('open_mcp_client_page', { client: c }).catch((e) =>
                        console.warn('[ai-setup] open install page failed', e),
                      )
                    }
                    className="text-xs text-accent underline-offset-2 hover:underline"
                  >
                    {c === 'codex' ? t('装 Codex') : t('装 Claude Code')}
                  </button>
                ))}
              </div>
              <p>{t('装好之后，在终端里登录一次它自己的账号。')}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={probing}
                  onClick={() => void recheck()}
                  className={secondary}
                >
                  {probing ? t('检测中…') : t('装好了，再检测一次')}
                </button>
              </div>
              {probedOnce && !probing && (
                <p>{t('还是没检测到。装在别处的话，可以在设置的「AI 引擎」里手动指定路径。')}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-ink-2">
                {plan.cli.missing.length === 2
                  ? t('还差打开两个开关：「MCP 服务」和「允许 AI 写入」。')
                  : plan.cli.missing[0] === 'mcpEnabled'
                    ? t('还差打开「MCP 服务」。')
                    : t('还差打开「允许 AI 写入」。')}
              </p>
              <p>
                {t('这些开关也管你接的别的 AI（Claude、ChatGPT 里的 Codex 这些）：打开之后，它们也能读你的项目、往里加块；加的块都带来源标注，不会伪装成你写的。')}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const missing = plan.cli?.kind === 'switches' ? plan.cli.missing : [];
                  void act(() => turnOnCli(missing, update));
                }}
                className={primary}
              >
                {t('现在打开')}
              </button>
            </>
          )}
        </section>
      )}

      {plan.api && (
        <section className={`space-y-1.5 ${plan.cli ? 'border-t border-line pt-3' : ''}`}>
          <div className="text-xs text-ink">{t('用 DeepSeek（按字数花钱，用你自己的 key）')}</div>
          {/* ⚠️ The sentence Settings keeps on screen at all times (ApiEngineConfig: §6.3
              「不要因为不好讲就不讲」), word for word. */}
          <p>
            {t(
              'Spool 主程序不发任何网络请求。打开这个开关之后，请求由 Spool 启动的一个本地小程序发出，用你自己的 key 和额度，内容会到达你选的那家模型厂商。',
            )}
          </p>
          {plan.api.kind === 'no-sidecar' ? (
            <p style={{ color: 'var(--urgent)' }}>
              {t('找不到负责联网的那个小程序（spool-ai）。重装一次 Spool 应该能修好。')}
            </p>
          ) : plan.api.kind === 'checking' ? (
            <p className="flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" />
              {t('正在看你存没存过 key…')}
            </p>
          ) : (
            <>
              {plan.api.needsKey && (
                <>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="sk-…"
                    spellCheck={false}
                    className="w-full rounded border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-accent"
                  />
                  <p>
                    {t('key 存在你这台电脑的系统钥匙串里，和别的密码放在一起。它不会进设置文件，也不会跟着导出的库走。')}
                  </p>
                </>
              )}
              <button
                type="button"
                disabled={busy || (plan.api.needsKey && key.trim() === '')}
                onClick={() => {
                  const needsKey = plan.api?.kind === 'enable' && plan.api.needsKey;
                  void act(() => turnOnApi(needsKey ? key : null, update));
                }}
                className={primary}
              >
                {t('现在打开')}
              </button>
              <p>{t('接口地址和模型在设置里改。')}</p>
            </>
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
