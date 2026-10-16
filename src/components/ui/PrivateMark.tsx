import { EyeOff } from 'lucide-react';
import { useT } from '@/lib/i18n';

// P9E-4 (Ocean 2026-10-15 第 119 条) — the mark on a private project: after its name in the
// sidebar, beside its title in the header. The same for a project the user made private and
// one an AI created that way. ⚠️ EyeOff, not Lock: Lock already means 「an AI entry is not
// switched on」 (P9C), and the two must not look alike.
export default function PrivateMark({ size = 11 }: { size?: number }) {
  const t = useT();
  const label = t('私密项目：通过 Spool 连接的 AI 读不到');
  return (
    <span title={label} className="flex flex-none items-center text-muted">
      <EyeOff size={size} aria-label={label} />
    </span>
  );
}
