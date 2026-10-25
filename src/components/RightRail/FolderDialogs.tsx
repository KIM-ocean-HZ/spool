import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { Check, Copy } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  MAX_STATE_FILES,
  connectFolder,
  disconnectFolder,
  folderError,
  protocolDiff,
  setFolderPointers,
  setFolderStateFiles,
  setGlobalHint,
  type FolderCandidate,
  type FolderInspect,
  type FolderView,
} from '@/lib/folders/api';
import { defaultPicks, lineDiff } from '@/lib/folders/view';
import { useT } from '@/lib/i18n';
import { useFolderStore } from '@/stores/folderStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/toastStore';

// P9Y (task book §3.1 – §3.4, §3.7) — the dialogs behind the folder card in the right rail.
//
// ⭐ Connecting is four steps, and every write Spool will make in the user's folder is named in
// them before it happens (task book §3.2: 「每一处都要用户在连接时看到过」): Spool 会做什么 → 勾现状
// 文件 → git → 让 AI 读到它. A second project joining a folder already linked skips the last two —
// the folder already has its answers (§3.5).
// ⚠️ Plain words, one step per screen, every choice with what it gets and what it costs (memory
// `write-plainly-for-ocean`).

function Dialog({
  title,
  children,
  footer,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 p-8" onClick={onClose}>
      <div
        className={`flex max-h-full ${wide ? 'w-[640px]' : 'w-[460px]'} flex-col rounded-lg border border-line-strong bg-paper`}
        style={{ boxShadow: 'var(--shadow-toast)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 space-y-2.5 overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-ink-2">
          <p className="font-serif text-lg text-ink">{title}</p>
          {children}
        </div>
        <footer className="flex flex-none items-center justify-end gap-2 border-t border-line bg-paper-2/40 px-5 py-3 text-xs">
          {footer}
        </footer>
      </div>
    </div>
  );
}

const quiet =
  'rounded-md border border-line bg-paper px-3 py-1.5 text-ink-2 transition-colors hover:border-line-strong disabled:opacity-50';
const primary =
  'rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-accent transition-colors hover:bg-accent/20 disabled:opacity-50';

/** Step 2, and 「改现状文件」 on the card. */
function StateFilesPicker({
  candidates,
  picked,
  onChange,
}: {
  candidates: FolderCandidate[];
  picked: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  // A pick that is no longer offered (its file was renamed) still shows, so it can be unticked.
  const rows = useMemo(() => {
    const extra = picked
      .filter((p) => !candidates.some((c) => c.spec === p))
      .map((spec) => ({ spec, path: spec, recommended: false, modified: 0 }));
    return [...candidates, ...extra];
  }, [candidates, picked]);
  const full = picked.length >= MAX_STATE_FILES;
  return (
    <>
      <p>
        {t(
          '勾 1 – 3 份写着「现在做什么、做到哪」的文件，比如计划、交接、README。AI 读这几份就知道现状；它们一改，Spool 就知道文件夹走到前面去了。',
        )}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted">{t('这个文件夹里没找到写给人看的文档。可以先不选，之后在卡片上再选。')}</p>
      ) : (
        <ul className="space-y-0.5">
          {rows.map((c) => {
            const on = picked.includes(c.spec);
            return (
              <li key={c.spec}>
                <label
                  className={`flex items-start gap-2 rounded px-1 py-0.5 ${!on && full ? 'opacity-50' : 'cursor-pointer hover:bg-paper-2/60'}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 flex-none"
                    checked={on}
                    disabled={!on && full}
                    onChange={() => onChange(on ? picked.filter((p) => p !== c.spec) : [...picked, c.spec])}
                  />
                  <span className="min-w-0">
                    <span className="break-all font-mono text-[12px] text-ink">{c.path}</span>
                    {c.recommended && <span className="ml-1.5 text-[11px] text-accent">{t('推荐')}</span>}
                    {c.spec.includes('*') && (
                      <span className="block text-[11px] text-muted">
                        {t('带日期的一组，以后总读日期最新的那一份')}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {full && <p className="text-[11px] text-muted">{t('最多 {n} 份。', { n: MAX_STATE_FILES })}</p>}
    </>
  );
}

const COPY_LINE_KEY = '这个文件夹连着 Spool，开工前先读根目录的 SPOOL.md。';

/** Step 4, and 「让 AI 读到它」 on the card. */
function PointersForm({
  hasClaudeMd,
  hasAgentsMd,
  claude,
  agents,
  global,
  onChange,
}: {
  hasClaudeMd: boolean;
  hasAgentsMd: boolean;
  claude: boolean;
  agents: boolean;
  global: boolean;
  onChange: (next: { claude: boolean; agents: boolean; global: boolean }) => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const line = t(COPY_LINE_KEY);
  const row = (
    on: boolean,
    enabled: boolean,
    label: string,
    what: string,
    toggle: () => void,
  ): JSX.Element => (
    <label className={`flex items-start gap-2 rounded px-1 py-1 ${enabled ? 'cursor-pointer hover:bg-paper-2/60' : 'opacity-50'}`}>
      <input type="checkbox" className="mt-1 flex-none" checked={on} disabled={!enabled} onChange={toggle} />
      <span>
        <span className="block text-ink">{label}</span>
        <span className="block text-[11px] text-muted">{what}</span>
      </span>
    </label>
  );
  return (
    <>
      <p>{t('在这个文件夹里工作的 AI 不会自己去读 SPOOL.md。选一种或几种让它读到；都不选也行，之后在卡片上还能改。')}</p>
      <div className="space-y-0.5">
        {row(
          claude,
          hasClaudeMd,
          t('这个文件夹的 CLAUDE.md 加一行 @SPOOL.md'),
          hasClaudeMd
            ? t('Claude Code（VS Code、终端里的）开工时会把 SPOOL.md 一起读进去。')
            : t('这个文件夹没有 CLAUDE.md，Spool 不会新建。'),
          () => onChange({ claude: !claude, agents, global }),
        )}
        {row(
          agents,
          hasAgentsMd,
          t('这个文件夹的 AGENTS.md 加一句「开工前先读 SPOOL.md」'),
          hasAgentsMd
            ? t('Codex（命令行和桌面版）读 AGENTS.md。它没有导入的写法，只能靠这句话。')
            : t('这个文件夹没有 AGENTS.md，Spool 不会新建。'),
          () => onChange({ claude, agents: !agents, global }),
        )}
        {row(
          global,
          true,
          t('全局说明里加一句「工作目录里有 SPOOL.md 就先读它」'),
          t('改「一键接入」写在 ~/.claude/CLAUDE.md、~/.codex/AGENTS.md 里的那一段。以后连的文件夹都算数；只对做过一键接入的客户端有用。'),
          () => onChange({ claude, agents, global: !global }),
        )}
      </div>
      <div className="rounded-md border border-line px-3 py-2">
        <p className="text-[11px] text-muted">
          {t('不读这些文件的 AI（比如 Claude 桌面版的普通聊天、ChatGPT），开工时把这句贴给它：')}
        </p>
        <div className="mt-1 flex items-start gap-2">
          <span className="min-w-0 flex-1 select-text text-ink">{line}</span>
          <button
            type="button"
            onClick={() =>
              void writeText(line)
                .then(() => setCopied(true))
                .catch((e) => toast.error(String(e)))
            }
            className="flex flex-none items-center gap-1 text-[11px] text-muted transition-colors hover:text-accent"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? t('复制好了') : t('复制')}
          </button>
        </div>
      </div>
    </>
  );
}

/** Ticking 「全局说明里加一句」 saves the setting and rewrites the clients already hooked up. */
const applyGlobalHint = async (on: boolean): Promise<void> => {
  const st = useSettingsStore.getState();
  if (st.folderGlobalHint === on) return;
  await st.update({ folderGlobalHint: on });
  await setGlobalHint(on);
};

type Step = 'what' | 'state' | 'git' | 'ai';

/** The four steps (task book §5 A1 / A2), for a workspace (§8, 第 210 条). */
export function ConnectDialog({
  workspaceId,
  title,
  inspect,
  onClose,
}: {
  workspaceId: string;
  /** The workspace's name. */
  title: string;
  inspect: FolderInspect;
  onClose: () => void;
}) {
  const t = useT();
  const joining = inspect.linkedTo.length > 0;
  const steps: Step[] = joining ? ['what', 'state'] : inspect.git ? ['what', 'state', 'git', 'ai'] : ['what', 'state', 'ai'];
  const [step, setStep] = useState<Step>('what');
  const [picked, setPicked] = useState<string[]>(() => defaultPicks(inspect.candidates));
  // 第 2 题：推荐「只留在这台电脑」。
  const [localOnly, setLocalOnly] = useState(true);
  // 第 4 问：默认都不勾，用户自己选。
  const globalNow = useSettingsStore((s) => s.folderGlobalHint);
  const [ptr, setPtr] = useState({ claude: false, agents: false, global: globalNow });
  const [busy, setBusy] = useState(false);
  const reloadAll = useFolderStore((s) => s.reloadAll);
  const at = steps.indexOf(step);
  const last = at === steps.length - 1;
  const join = (names: string[]): string => names.map((n) => t('「{name}」', { name: n })).join(t('、'));

  const finish = async (): Promise<void> => {
    setBusy(true);
    try {
      await connectFolder({
        workspaceId,
        path: inspect.path,
        stateFiles: picked,
        gitExclude: inspect.git && localOnly,
        pointerClaude: ptr.claude,
        pointerAgents: ptr.agents,
      });
      if (!joining) await applyGlobalHint(ptr.global);
      await reloadAll();
      toast.notice(t('连好了：SPOOL.md 在「{name}」最外面', { name: inspect.name }));
      onClose();
    } catch (e) {
      toast.error(folderError(e));
    } finally {
      setBusy(false);
    }
  };

  const body = ((): ReactNode => {
    switch (step) {
      case 'what':
        return (
          <>
            <p className="select-text break-all font-mono text-[12px] text-muted">{inspect.short}</p>
            <p className="text-ink">
              {t('把工作区「{title}」连到这个文件夹。工作区里没完成、不私密的项目都算它的，以后新建的也算；子工作区跟着它，除非另连一个。', { title })}
            </p>
            <p>{t('连上之后，Spool 会：')}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('列出里面的文件，看上次之后改了什么。只看文件名、大小和修改时间。')}</li>
              <li>{t('读你下一步勾的几份现状文件。')}</li>
              <li>
                {t('在这个文件夹最外面放一份 SPOOL.md，告诉在这里工作的 AI：对应哪个 Spool 项目、冲突时谁说了算、什么时候写回。你可以打开看、自己改。')}
              </li>
              <li>{t('不读代码，不在后台盯着，不调用 git。')}</li>
            </ul>
            {joining && (
              <p className="text-ink">
                {t('这个文件夹已经连着工作区{them}，「{title}」会加进同一份 SPOOL.md。', {
                  them: join(inspect.linkedTo),
                  title,
                })}
              </p>
            )}
            {!joining && inspect.parent && (
              <p>
                {t('上层的 {path} 已经连着 Spool。这里会再有一份 SPOOL.md，在这个子文件夹里工作的 AI 读近的那份。', {
                  path: inspect.parent,
                })}
              </p>
            )}
            {!joining && inspect.children.length > 0 && (
              <p>
                {t('下面的 {path} 已经连着 Spool，它那份 SPOOL.md 不受影响。', { path: inspect.children.join(t('、')) })}
              </p>
            )}
            {!joining && inspect.hasProtocol && (
              <p>{t('文件夹里已经有一份 SPOOL.md。Spool 先备份，再把自己那一段放在最上面，你的内容留在下面。')}</p>
            )}
            {inspect.notListed.length > 0 && (
              <p className="text-[11px] text-muted">
                {t('{dirs} 被 .gitignore 忽略、里面文件太多，不列。', { dirs: inspect.notListed.join(t('、')) })}
              </p>
            )}
            {inspect.truncated && (
              <p className="text-[11px] text-muted">{t('文件太多，Spool 只看前 20,000 个。')}</p>
            )}
          </>
        );
      case 'state':
        return <StateFilesPicker candidates={inspect.candidates} picked={picked} onChange={setPicked} />;
      case 'git':
        return (
          <>
            <p>{t('这是一个 git 仓库。SPOOL.md 要不要跟着提交？')}</p>
            {[
              {
                value: true,
                label: t('只留在这台电脑（推荐）'),
                good: t('仓库公开也不会把你的 Spool 项目名推上 GitHub；不动 .gitignore。'),
                cost: t('换一台电脑 clone 下来没有这份文件，要在那台电脑的 Spool 里重新连一次。'),
              },
              {
                value: false,
                label: t('跟着提交'),
                good: t('别的电脑、合作者 clone 下来就有。'),
                cost: t('项目名会进 git 历史；没装 Spool 的人看到这个文件没用。'),
              },
            ].map((o) => (
              <label key={String(o.value)} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-paper-2/60">
                <input type="radio" className="mt-1 flex-none" checked={localOnly === o.value} onChange={() => setLocalOnly(o.value)} />
                <span>
                  <span className="block text-ink">{o.label}</span>
                  <span className="block text-[11px] text-muted">{t('好处：{x}', { x: o.good })}</span>
                  <span className="block text-[11px] text-muted">{t('代价：{x}', { x: o.cost })}</span>
                </span>
              </label>
            ))}
            <p className="text-[11px] text-muted">
              {t('「只留在这台电脑」是往 .git/info/exclude 加一行 SPOOL.md。那是 git 自带的、只对这台电脑生效的忽略清单。')}
            </p>
          </>
        );
      case 'ai':
        return (
          <PointersForm
            hasClaudeMd={inspect.hasClaudeMd}
            hasAgentsMd={inspect.hasAgentsMd}
            claude={ptr.claude}
            agents={ptr.agents}
            global={ptr.global}
            onChange={setPtr}
          />
        );
    }
  })();

  const heading: Record<Step, string> = {
    what: t('把「{ws}」连到文件夹「{name}」', { ws: title, name: inspect.name }),
    state: t('哪几份文件写着现状'),
    git: t('SPOOL.md 跟不跟 git'),
    ai: t('让 AI 读到它'),
  };

  return (
    <Dialog
      title={heading[step]}
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-[11px] text-muted">
            {t('第 {i} / {n} 步', { i: at + 1, n: steps.length })}
          </span>
          <button type="button" onClick={at === 0 ? onClose : () => setStep(steps[at - 1]!)} className={quiet}>
            {at === 0 ? t('取消') : t('上一步')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={last ? () => void finish() : () => setStep(steps[at + 1]!)}
            className={primary}
          >
            {last ? t('连接') : t('下一步')}
          </button>
        </>
      }
    >
      {body}
    </Dialog>
  );
}

/** 「改现状文件」 on the card. */
export function StateFilesDialog({
  view,
  candidates,
  onClose,
}: {
  view: FolderView;
  candidates: FolderCandidate[];
  onClose: () => void;
}) {
  const t = useT();
  const [picked, setPicked] = useState<string[]>(() => view.state.map((s) => s.spec));
  const reloadAll = useFolderStore((s) => s.reloadAll);
  const save = async (): Promise<void> => {
    try {
      await setFolderStateFiles(view.workspaceId, picked);
      await reloadAll();
      onClose();
    } catch (e) {
      toast.error(folderError(e));
    }
  };
  return (
    <Dialog
      title={t('哪几份文件写着现状')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={quiet}>
            {t('取消')}
          </button>
          <button type="button" onClick={() => void save()} className={primary}>
            {t('保存')}
          </button>
        </>
      }
    >
      <StateFilesPicker candidates={candidates} picked={picked} onChange={setPicked} />
    </Dialog>
  );
}

/** 「让 AI 读到它」 on the card. */
export function PointersDialog({ view, onClose }: { view: FolderView; onClose: () => void }) {
  const t = useT();
  const globalNow = useSettingsStore((s) => s.folderGlobalHint);
  const [ptr, setPtr] = useState({ claude: view.claudePoints, agents: view.agentsPoints, global: globalNow });
  const reloadAll = useFolderStore((s) => s.reloadAll);
  const save = async (): Promise<void> => {
    try {
      await setFolderPointers(view.workspaceId, ptr.claude, ptr.agents);
      await applyGlobalHint(ptr.global);
      await reloadAll();
      onClose();
    } catch (e) {
      toast.error(folderError(e));
    }
  };
  return (
    <Dialog
      title={t('让 AI 读到它')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={quiet}>
            {t('取消')}
          </button>
          <button type="button" onClick={() => void save()} className={primary}>
            {t('保存')}
          </button>
        </>
      }
    >
      <PointersForm
        hasClaudeMd={view.hasClaudeMd}
        hasAgentsMd={view.hasAgentsMd}
        claude={ptr.claude}
        agents={ptr.agents}
        global={ptr.global}
        onChange={setPtr}
      />
    </Dialog>
  );
}

/** 「断开」 (and 「换文件夹」, which is this, then connecting again). */
export function DisconnectDialog({
  view,
  replacing,
  onClose,
  onDone,
}: {
  view: FolderView;
  replacing: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [remove, setRemove] = useState(true);
  const reloadAll = useFolderStore((s) => s.reloadAll);
  const go = async (): Promise<void> => {
    try {
      await disconnectFolder(view.workspaceId, remove);
      await reloadAll();
      onDone();
    } catch (e) {
      toast.error(folderError(e));
    }
  };
  return (
    <Dialog
      title={replacing ? t('换一个文件夹') : t('断开工作区「{title}」和 {path}', { title: view.workspace, path: view.short })}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={quiet}>
            {t('取消')}
          </button>
          <button type="button" onClick={() => void go()} className={primary}>
            {replacing ? t('断开，选新的') : t('断开')}
          </button>
        </>
      }
    >
      {replacing && <p>{t('先断开现在这个（{path}），再选新的。', { path: view.short })}</p>}
      <>
          <p>{t('{path} 里的 SPOOL.md 怎么办？', { path: view.short })}</p>
          {[
            {
              value: true,
              label: t('删掉 Spool 那一段'),
              what: t(
                '只剩 Spool 放的那个标题时，整个文件一起删；CLAUDE.md、AGENTS.md、.git/info/exclude 里 Spool 加的那一行也拿掉（你改过的不动）。',
              ),
            },
            {
              value: false,
              label: t('留着'),
              what: t('文件夹里什么都不动。SPOOL.md 以后不再更新。'),
            },
          ].map((o) => (
            <label key={String(o.value)} className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-paper-2/60">
              <input type="radio" className="mt-1 flex-none" checked={remove === o.value} onChange={() => setRemove(o.value)} />
              <span>
                <span className="block text-ink">{o.label}</span>
                <span className="block text-[11px] text-muted">{o.what}</span>
              </span>
            </label>
          ))}
          <p className="text-[11px] text-muted">
            {t('还有别的工作区连着这个文件夹的话，SPOOL.md 留着，只把这个工作区从里面拿掉。')}
          </p>
      </>
    </Dialog>
  );
}

/** 「看差别」: Spool's section as the file has it, against what Spool would write now. */
export function DiffDialog({
  workspaceId,
  onClose,
  onReplace,
}: {
  workspaceId: string;
  onClose: () => void;
  onReplace: () => void;
}) {
  const t = useT();
  const [pair, setPair] = useState<[string, string] | null>(null);
  useEffect(() => {
    protocolDiff(workspaceId)
      .then(setPair)
      .catch((e) => toast.error(folderError(e)));
  }, [workspaceId]);
  const lines = pair ? lineDiff(pair[0], pair[1]) : [];
  return (
    <Dialog
      wide
      title={t('SPOOL.md 里 Spool 那一段')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={quiet}>
            {t('留着我改的')}
          </button>
          <button type="button" onClick={onReplace} className={primary}>
            {t('换成新的')}
          </button>
        </>
      }
    >
      <p className="text-[11px] text-muted">
        {t('带 − 的是文件里现在的样子（你改过的），带 + 的是 Spool 现在要写的。换成新的之前，旧的会先备份。')}
      </p>
      <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md border border-line p-2 font-mono text-[11px] leading-relaxed">
        {lines.map((l, i) => (
          <div
            key={i}
            className={l.kind === 'del' ? 'text-muted line-through' : l.kind === 'add' ? 'text-accent' : 'text-ink-2'}
          >
            {(l.kind === 'del' ? '− ' : l.kind === 'add' ? '+ ' : '  ') + l.text}
          </div>
        ))}
      </pre>
    </Dialog>
  );
}
