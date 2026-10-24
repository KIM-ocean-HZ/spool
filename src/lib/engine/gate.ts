// DESIGN_AI_ENGINE §1.1 — when the local-CLI actions are usable.
//
// Three conditions, all required: the Claude Code CLI was detected, the MCP service
// switch is on, and "允许 AI 写入" is on. The actions write blocks through the existing
// MCP surface, so without the write switch they cannot do the thing they promise.
// (The fourth input, `actionsEnabled`, is 「显示 AI 功能」 — see below.)
//
// ⚠️ What happens when they are NOT usable changed on 2026-10-14 (P9C, Ocean HANDOFF §9.2
// 第 93 – 99 条). The old rule was §1.1's 安静原则, set 08-17: any condition unmet and the
// entry did not render at all — no greyed-out entries, no hint, Settings the only place the
// state showed. Ocean overturned it for every place that uses an AI (第 94 条):
//
//   「所有界面保持统一，但是没装AI engine的用户看到有地方是锁着的，然后锁着的地方提示用户去打开，
//     给一个快捷键，不需要返回设置」(第 93 条)
//
// So an entry that is not ready is LOCKED rather than hidden: its own name greyed, a lock, one
// sentence on why, and a button that opens the 「AI 引擎」 piece of Settings right there
// (components/AiSetup — 第 95 条). `aiEntryState` below is that rule; each place still decides
// "ready" exactly the way it always did — only what is drawn when it is not ready changed.
// Two exceptions keep things hidden: 「显示 AI 功能」 switched off hides every AI entry and every
// lock (第 98 条), and on Windows an entry that only a local CLI can run stays hidden, because
// there is no local engine there to turn on (第 97 条).

export interface EngineGateInput {
  /** Whether `claude` was found on this machine (Rust: ai_engine_status). */
  cliAvailable: boolean;
  mcpEnabled: boolean;
  mcpWriteEnabled: boolean;
  /** 「显示 AI 功能」 (第 98 条; was §1.4's CLI-only opt-out). Default true. */
  actionsEnabled: boolean;
  /**
   * §1.2: whether THIS thread already has a task running or waiting.
   *
   * M1 read this as "anything is running anywhere", which was right when a second click
   * was simply refused. M2 has a queue, and a global lock would make it unreachable —
   * you could never line up a second project's tidy-up while the first ran. The rule that
   * survives is the one the queue is actually for: one task per thread, because two
   * distils of the same project produce two conclusions off the same material.
   */
  busyOnThisThread?: boolean;
}

export const canShowEngineActions = (g: EngineGateInput): boolean =>
  g.cliAvailable && g.mcpEnabled && g.mcpWriteEnabled && g.actionsEnabled;

// Visible but not clickable, so the user can see why nothing happens on a second click.
// Distinct from the hidden case above: hiding mid-run would make the menu jump.
export const engineActionsDisabled = (g: EngineGateInput): boolean =>
  g.busyOnThisThread === true;

/** Which road an AI entry runs on. `any` = a local CLI or an API key, whichever is there. */
export type AiRoute = 'any' | 'cli' | 'api';

/** `private` (P9E-3) = the entry is in a private project: closed whatever the engine says. */
export type AiEntryState = 'ready' | 'locked' | 'hidden' | 'private';

export interface AiEntryInput {
  /** Whether the entry is usable today — computed at each place exactly as before P9C. */
  ready: boolean;
  route: AiRoute;
  /** 「显示 AI 功能」 (`aiEngineActionsEnabled`). */
  showAi: boolean;
  isMac: boolean;
  /** P9E-3 (Ocean 2026-10-15 第 122 条): the entry acts on a private project. Spool's own AI
   *  features leave those alone, so the entry is closed whether or not the engine is ready —
   *  and its way out is making the project not private, not the 「AI 引擎」 piece. */
  privateProject?: boolean;
}

/** P9C — what one AI entry draws. See the header for where each branch comes from. */
export const aiEntryState = ({ ready, route, showAi, isMac, privateProject }: AiEntryInput): AiEntryState => {
  if (!showAi) return 'hidden';
  if (route === 'cli' && !isMac && privateProject) return 'hidden';
  if (privateProject) return 'private';
  if (ready) return 'ready';
  if (route === 'cli' && !isMac) return 'hidden';
  return 'locked';
};

/** The two MCP switches the local-CLI road needs (`canShowEngineActions`). */
export type McpSwitch = 'mcpEnabled' | 'mcpWriteEnabled';

export interface AiSetupInput {
  route: AiRoute;
  isMac: boolean;
  cliAvailable: boolean;
  mcpEnabled: boolean;
  mcpWriteEnabled: boolean;
  apiOn: boolean;
  /** `null` = still asking the keychain (a read can take a while after an update). */
  apiKeyPresent: boolean | null;
  sidecarPresent: boolean;
}

/**
 * What the 「AI 引擎」 piece offers while an entry is locked. Free road first.
 *
 * - `cli`: the local Claude Code / Codex half, Mac only. `install` = none found; `switches` =
 *   one is there and these MCP switches are what is missing.
 * - `api`: the API key half (any vendor since P9U-3). `enable` turns the switch on — `needsKey` when no key is stored
 *   yet; `no-sidecar` = the small program that makes the requests is missing, nothing to offer.
 *
 * A half is `null` when its road does not apply to the entry or is already open.
 */
export interface AiSetupPlan {
  cli: null | { kind: 'install' } | { kind: 'switches'; missing: McpSwitch[] };
  api: null | { kind: 'no-sidecar' } | { kind: 'checking' } | { kind: 'enable'; needsKey: boolean };
}

export const aiSetupPlan = (s: AiSetupInput): AiSetupPlan => {
  let cli: AiSetupPlan['cli'] = null;
  if (s.route !== 'api' && s.isMac) {
    if (!s.cliAvailable) {
      cli = { kind: 'install' };
    } else {
      const missing = (['mcpEnabled', 'mcpWriteEnabled'] as const).filter((k) => !s[k]);
      if (missing.length > 0) cli = { kind: 'switches', missing };
    }
  }
  let api: AiSetupPlan['api'] = null;
  if (s.route !== 'cli' && !s.apiOn) {
    api = !s.sidecarPresent
      ? { kind: 'no-sidecar' }
      : s.apiKeyPresent === null
        ? { kind: 'checking' }
        : { kind: 'enable', needsKey: !s.apiKeyPresent };
  }
  return { cli, api };
};

/** The settings patch 「打开」 sends for the CLI half: exactly the switches that were off. */
export const cliSwitchesPatch = (missing: McpSwitch[]): Partial<Record<McpSwitch, boolean>> =>
  Object.fromEntries(missing.map((k) => [k, true]));

/**
 * `W2` —— 自动回顾**实际**走哪条路。
 *
 * ⚠️ 存的那个偏好可能指着一条**今天走不通**的路：他选了 CLI 然后把 CLI 卸了，或者选了
 * API 然后把总开关关了。⛔ 那时候不能什么都不做 —— 用户打开的是「每周自动回顾一次」，
 * 一个不声不响什么也不跑的开关，是这个项目最怕的那类 bug。
 *
 * ⭐ 所以能走的那条就走，**但界面必须把「实际走的是哪条」写出来**（`ReviewBoard` 那一行）。
 * 退让是可以的，⛔ 悄悄退让不行 —— 另一条路是按字数花钱的。
 *
 * `null` = 两条都走不通,那就一条都不跑。
 */
export const effectiveAutoRoute = (
  preferred: 'cli' | 'api',
  cliReady: boolean,
  apiOn: boolean,
): 'cli' | 'api' | null => {
  if (preferred === 'api') return apiOn ? 'api' : cliReady ? 'cli' : null;
  return cliReady ? 'cli' : apiOn ? 'api' : null;
};
