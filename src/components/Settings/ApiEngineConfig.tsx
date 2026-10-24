import ApiKey from '@/components/AiSetup/ApiKey';
import Toggle from '@/components/ui/Toggle';
import { useT } from '@/lib/i18n';
import { IS_MAC } from '@/lib/platform';
import { useSettingsStore } from '@/stores/settingsStore';

// 形态 C 的设置（WORKPLAN-2026-08-20 §6.2 / §6.3）。
//
// ⚠️ 这一节存在本身就在改一句对外说了很久的话，所以它必须自己把话说清楚。原来的说法是
// 「Spool 永不联网」；§6.3 把它精确化成：
//
//   主进程不发任何网络请求。打开这个开关之后，请求由 Spool 启动的**本地子进程**发出，
//   用你自己的 key 和额度，内容到达你选的那家模型厂商。
//
// §6.3 还有一句必须照做的：「不要因为不好讲就不讲」。所以那段话是**常驻**在页面上的，
// 不是折在「详细说明」里等人去点。
//
// P9U-3（第 188 条）：key / 哪一家 / 模型 / 思考力度 全在 `AiSetup/ApiKey` —— 和锁着的地方弹出来的
// 是同一块。粘 key 连上就是打开，「断开」就是关上，所以原来那个总开关不再单独摆一个。
export default function ApiEngineConfig() {
  const t = useT();
  const enabled = useSettingsStore((s) => s.apiEngineEnabled);
  const timeoutSecs = useSettingsStore((s) => s.apiTimeoutSecs);
  const keepOriginal = useSettingsStore((s) => s.compressKeepOriginal);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="space-y-3 py-2.5">
      <div className="min-w-0">
        <div className="text-xs text-ink">{t('用你自己的 API key')}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          {t(
            'Spool 主程序不发任何网络请求。连上 key 之后，请求由 Spool 启动的一个本地小程序发出，用你自己的 key 和额度，内容会到达你选的那家模型厂商。',
          )}
        </p>
      </div>

      {/* ⚠️ 这一句在开关关着的时候也要在：它是「已经装了 CLI 的人不用填 key」这条路的指路牌。
          §6.2：形态 B 并行保留，不是被取代。
          P9H-5（DISCOVERED-20261014-6，Ocean 10-16 第 150 条）：只在 Mac 上 —— 它指着的「本机 AI 引擎」
          那一节只在 Mac 上画（Settings/index.tsx），Windows 上这句是指向一个不存在的地方。 */}
      {IS_MAC && (
        <p className="text-[11px] leading-relaxed text-muted/80">
          {t('已经装了 claude / codex 这类命令行工具的话，用「AI 引擎」那一节就行，一分钱不花、一个 key 不用填。这一节是给不想装命令行工具的人的第二条路。')}
        </p>
      )}

      <ApiKey />

      {enabled && (
        <div className="space-y-2.5 rounded-md border border-line bg-paper-2/30 p-3">
          {/* ⭐ R1 §1c（Ocean：「未压缩的原库需要备份保存，默认备份，用户可关」）。
              ⚠️ 关掉之后那句话**同时印在核对面的页脚上** —— 用户不会为了压一次上下文
              先去翻一遍设置，而这一条关系到他的字改不改得回来。 */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] text-ink">{t('备份压缩前的原文')}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted/80">
                {t('压缩把块的正文换成更短的版本。留着原文，块的工具条上就有一个入口能打开看，也能随时换回去；关掉的话省一点磁盘，但压过就找不回原来的字了。')}
              </p>
            </div>
            <Toggle
              checked={keepOriginal}
              onChange={(v) => void update({ compressKeepOriginal: v })}
            />
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted">{t('单次最长等待（秒）')}</span>
            <input
              type="number"
              min={10}
              max={900}
              value={timeoutSecs}
              onChange={(e) => void update({ apiTimeoutSecs: Number(e.target.value) || 180 })}
              className="w-20 rounded border border-line bg-paper px-2 py-1 text-right text-[11px] text-ink outline-none focus:border-accent"
            />
          </label>
        </div>
      )}
    </div>
  );
}
