// P9V-2：从 StaleReview.tsx 挪出来 —— 「只查这个项目」和「查整个工作区」两页共用，⛔ 两边别长歪。

// 一个数一格 —— ⚠️ 和压缩那一页的 `Stat` 同一个样子，⛔ 两边别长歪。
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-wide text-muted/70">{label}</div>
      <div className="font-mono text-[13px]">{value}</div>
    </div>
  );
}

// ⚠️ 三个动作**并排**，⛔ 没有一个被做成主按钮 —— 哪一个对，只有用户知道，
// 而把其中一个做得更显眼就是在替他选。悬停说明写的是「会发生什么」，不是名词解释。
export function Choice({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="rounded border border-line bg-paper px-2 py-0.5 text-[11px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
    >
      {label}
    </button>
  );
}
