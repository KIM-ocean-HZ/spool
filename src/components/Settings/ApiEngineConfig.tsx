import ApiKey from '@/components/AiSetup/ApiKey';
import Toggle from '@/components/ui/Toggle';
import { resolveVendor, vendorName } from '@/lib/ai/vendors';
import { useT } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settingsStore';
import RoadCard from './RoadCard';

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
// P9U-5：和本机 CLI 那一块同样的框（RoadCard）、同样的分量。
export default function ApiEngineConfig() {
  const t = useT();
  const enabled = useSettingsStore((s) => s.apiEngineEnabled);
  const timeoutSecs = useSettingsStore((s) => s.apiTimeoutSecs);
  const vendor = useSettingsStore((s) => resolveVendor(s.apiVendor, s.apiBaseUrl));
  const update = useSettingsStore((s) => s.update);

  return (
    // P9U-5: the other of the two equal cards. ⛔ The old 「这一节是给不想装命令行工具的人的第二条路」 is gone —
    // Ocean: 「两个比重一样」. The §6.3 sentence stays on screen as the card's own line.
    <RoadCard
      title={t('API key')}
      note={t(
        'Spool 主程序不发任何网络请求。连上 key 之后，请求由 Spool 启动的一个本地小程序发出，用你自己的 key 和额度，内容会到达你选的那家模型厂商。',
      )}
      followUp={enabled && vendor.search === null ? t('{vendor} 的 key 不能联网搜', { vendor: vendorName(vendor, t) }) : null}
    >
      <ApiKey />
      {enabled && (
        <label className="mt-2.5 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted">{t('单次最长等待（秒）')}</span>
          <input
            type="number"
            min={10}
            max={900}
            value={timeoutSecs}
            onChange={(e) => void update({ apiTimeoutSecs: Number(e.target.value) || 180 })}
            className="w-20 rounded border border-line bg-paper px-2 py-0.5 text-right text-[11px] text-ink outline-none focus:border-accent"
          />
        </label>
      )}
    </RoadCard>
  );
}

/** P9U-5 — 「备份压缩前的原文」, under its own heading now that 压缩 runs on either road.
 *  ⭐ Stays in Settings (Ocean 2026-08-23 第 5 条：「不留原文的开关放到设置里面」); the compress tab
 *  says which way it is set at the moment the button is pressed (CompressBoard's footer). */
export function CompressSettings() {
  const t = useT();
  const keepOriginal = useSettingsStore((s) => s.compressKeepOriginal);
  const update = useSettingsStore((s) => s.update);
  return (
    <div className="py-2.5">
      <div className="text-sm text-ink">{t('压缩')}</div>
      {/* ⭐ R1 §1c（Ocean：「未压缩的原库需要备份保存，默认备份，用户可关」）。 */}
      <div className="mt-1.5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] text-ink">{t('备份压缩前的原文')}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted/80">
            {t('压缩把块的正文换成更短的版本。留着原文，块的工具条上就有一个入口能打开看，也能随时换回去；关掉的话省一点磁盘，但压过就找不回原来的字了。')}
          </p>
        </div>
        <Toggle checked={keepOriginal} onChange={(v) => void update({ compressKeepOriginal: v })} />
      </div>
    </div>
  );
}
