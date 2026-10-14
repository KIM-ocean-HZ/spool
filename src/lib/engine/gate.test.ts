import { describe, expect, it } from 'vitest';
import {
  aiEntryState,
  aiSetupPlan,
  canShowEngineActions,
  cliSwitchesPatch,
  effectiveAutoRoute,
  engineActionsDisabled,
  type AiRoute,
  type AiSetupInput,
  type EngineGateInput,
} from './gate';

// DESIGN_AI_ENGINE §4: the render-condition matrix (detection × two switches × opt-out).
// This is the whole of "zero AI in the product itself" as the user experiences it — if
// the gate leaks, a machine without Claude Code shows a menu that cannot work.
const all: EngineGateInput = {
  cliAvailable: true,
  mcpEnabled: true,
  mcpWriteEnabled: true,
  actionsEnabled: true,
};

describe('engine action gate', () => {
  it('shows only when every condition holds', () => {
    expect(canShowEngineActions(all)).toBe(true);
  });

  it('hides when any single condition fails', () => {
    const keys: (keyof EngineGateInput)[] = [
      'cliAvailable',
      'mcpEnabled',
      'mcpWriteEnabled',
      'actionsEnabled',
    ];
    for (const k of keys) {
      expect(canShowEngineActions({ ...all, [k]: false }), `${k} must gate the group`).toBe(false);
    }
  });

  it('hides on a bare default library (nothing configured, no CLI)', () => {
    expect(
      canShowEngineActions({
        cliAvailable: false,
        mcpEnabled: false,
        mcpWriteEnabled: false,
        actionsEnabled: true,
      }),
    ).toBe(false);
  });

  // §1.1: read access alone is not enough. The actions exist to write a block back, so
  // the write switch is a precondition rather than something to degrade around.
  it('hides when MCP is on but writing is not', () => {
    expect(canShowEngineActions({ ...all, mcpWriteEnabled: false })).toBe(false);
  });

  // §1.2: a task already queued for THIS thread disables rather than hides — hiding
  // would make the menu jump under the user's cursor.
  it('disables while this thread already has a task, without hiding', () => {
    const busy = { ...all, busyOnThisThread: true };
    expect(canShowEngineActions(busy)).toBe(true);
    expect(engineActionsDisabled(busy)).toBe(true);
    expect(engineActionsDisabled(all)).toBe(false);
  });

  // M2: the lock is per thread, not global. A run on one project must not lock every
  // other project's menu, or the serial queue could never be filled.
  it('leaves another thread selectable while one is running', () => {
    expect(engineActionsDisabled({ ...all, busyOnThisThread: false })).toBe(false);
  });
});

describe('effectiveAutoRoute (W2)', () => {
  it('takes the road that was asked for when it is walkable', () => {
    expect(effectiveAutoRoute('cli', true, true)).toBe('cli');
    expect(effectiveAutoRoute('api', true, true)).toBe('api');
  });

  it('⭐ falls back rather than silently doing nothing', () => {
    // 打开了「每周自动回顾一次」却一次都不跑,是用户发现不了的那种坏。
    expect(effectiveAutoRoute('cli', false, true)).toBe('api');
    expect(effectiveAutoRoute('api', true, false)).toBe('cli');
  });

  it('两条都走不通就一条都不跑', () => {
    expect(effectiveAutoRoute('cli', false, false)).toBeNull();
    expect(effectiveAutoRoute('api', false, false)).toBeNull();
  });
});

// P9C (Ocean 第 93 – 99 条): the whole table — three kinds of entry × ready or not × 「显示 AI 功能」
// × Mac / Windows.
describe('aiEntryState (P9C)', () => {
  const routes: AiRoute[] = ['any', 'cli', 'api'];

  it('「显示 AI 功能」 off hides everything — ready or not, either platform (第 98 条)', () => {
    for (const route of routes)
      for (const ready of [true, false])
        for (const isMac of [true, false])
          expect(aiEntryState({ ready, route, showAi: false, isMac }), `${route} ${ready} ${isMac}`).toBe(
            'hidden',
          );
  });

  it('a ready entry is drawn as it always was', () => {
    for (const route of routes)
      for (const isMac of [true, false])
        expect(aiEntryState({ ready: true, route, showAi: true, isMac })).toBe('ready');
  });

  it('not ready on a Mac: locked, never hidden (第 94 条 overturns 08-17)', () => {
    for (const route of routes)
      expect(aiEntryState({ ready: false, route, showAi: true, isMac: true })).toBe('locked');
  });

  it('not ready on Windows: a CLI-only entry stays hidden (第 97 条), the others lock', () => {
    expect(aiEntryState({ ready: false, route: 'cli', showAi: true, isMac: false })).toBe('hidden');
    expect(aiEntryState({ ready: false, route: 'any', showAi: true, isMac: false })).toBe('locked');
    expect(aiEntryState({ ready: false, route: 'api', showAi: true, isMac: false })).toBe('locked');
  });
});

describe('aiSetupPlan (P9C)', () => {
  // A Mac with nothing set up: no CLI, both MCP switches off, DeepSeek off with no key.
  const bare: AiSetupInput = {
    route: 'any',
    isMac: true,
    cliAvailable: false,
    mcpEnabled: false,
    mcpWriteEnabled: false,
    apiOn: false,
    apiKeyPresent: false,
    sidecarPresent: true,
  };

  it('no CLI: offers to install one, free road first, DeepSeek with a key box', () => {
    expect(aiSetupPlan(bare)).toEqual({
      cli: { kind: 'install' },
      api: { kind: 'enable', needsKey: true },
    });
  });

  it('CLI there but the MCP service is off: names just that switch', () => {
    expect(aiSetupPlan({ ...bare, cliAvailable: true, mcpWriteEnabled: true }).cli).toEqual({
      kind: 'switches',
      missing: ['mcpEnabled'],
    });
  });

  it('CLI there but writing is off: names just that switch', () => {
    expect(aiSetupPlan({ ...bare, cliAvailable: true, mcpEnabled: true }).cli).toEqual({
      kind: 'switches',
      missing: ['mcpWriteEnabled'],
    });
  });

  it('CLI there with both switches off: names both', () => {
    expect(aiSetupPlan({ ...bare, cliAvailable: true }).cli).toEqual({
      kind: 'switches',
      missing: ['mcpEnabled', 'mcpWriteEnabled'],
    });
  });

  it('DeepSeek with a key already stored: just the switch, no key box', () => {
    expect(aiSetupPlan({ ...bare, apiKeyPresent: true }).api).toEqual({ kind: 'enable', needsKey: false });
  });

  it('DeepSeek while the keychain has not answered yet: no key box until it does', () => {
    expect(aiSetupPlan({ ...bare, apiKeyPresent: null }).api).toEqual({ kind: 'checking' });
  });

  it('DeepSeek with the request program missing: nothing to turn on', () => {
    expect(aiSetupPlan({ ...bare, apiKeyPresent: true, sidecarPresent: false }).api).toEqual({
      kind: 'no-sidecar',
    });
  });

  it('each entry only offers the road it runs on', () => {
    expect(aiSetupPlan({ ...bare, route: 'cli' }).api).toBeNull();
    expect(aiSetupPlan({ ...bare, route: 'api' }).cli).toBeNull();
  });

  it('Windows: never the CLI half (第 97 条)', () => {
    expect(aiSetupPlan({ ...bare, isMac: false })).toEqual({
      cli: null,
      api: { kind: 'enable', needsKey: true },
    });
  });

  it('a road that is already open is not offered again', () => {
    expect(aiSetupPlan({ ...bare, apiOn: true }).api).toBeNull();
    expect(
      aiSetupPlan({ ...bare, cliAvailable: true, mcpEnabled: true, mcpWriteEnabled: true }).cli,
    ).toBeNull();
  });
});

describe('cliSwitchesPatch (P9C)', () => {
  it('turns on exactly the switches that were off — no other key', () => {
    expect(cliSwitchesPatch(['mcpWriteEnabled'])).toEqual({ mcpWriteEnabled: true });
    expect(cliSwitchesPatch(['mcpEnabled', 'mcpWriteEnabled'])).toEqual({
      mcpEnabled: true,
      mcpWriteEnabled: true,
    });
  });
});
