import { describe, expect, it } from 'vitest';
import { roadsOf, routeFor } from './roads';

// P9U — the two roads, asked the same way for every AI feature.
const base = {
  cliAvailable: true,
  mcpEnabled: true,
  mcpWriteEnabled: true,
  actionsEnabled: true,
  apiEngineEnabled: true,
  apiKeyPresent: true,
  isMac: true,
};

describe('roadsOf', () => {
  it('the CLI road is a connected CLI on a Mac; the API road is the switch', () => {
    expect(roadsOf(base)).toEqual({ cli: true, api: true });
    expect(roadsOf({ ...base, mcpEnabled: false })).toEqual({ cli: false, api: true });
    expect(roadsOf({ ...base, isMac: false })).toEqual({ cli: false, api: true });
    expect(roadsOf({ ...base, apiEngineEnabled: false })).toEqual({ cli: true, api: false });
  });

  // DISCOVERED-20261111-3: a switch left on over a key that is gone is not a road — every AI entry
  // then asks for a key, the way Settings does. Not asked yet (null) counts as there.
  it('the API road also needs the key to be there', () => {
    expect(roadsOf({ ...base, apiKeyPresent: false })).toEqual({ cli: true, api: false });
    expect(roadsOf({ ...base, apiKeyPresent: null })).toEqual({ cli: true, api: true });
    expect(roadsOf({ ...base, isMac: false, apiKeyPresent: false })).toEqual({ cli: false, api: false });
  });

  it('「显示 AI 功能」 off closes both', () => {
    expect(roadsOf({ ...base, actionsEnabled: false })).toEqual({ cli: false, api: false });
  });
});

describe('routeFor', () => {
  it('the feature’s own pick when both are connected, the connected one otherwise, none if neither', () => {
    expect(routeFor('cli', { cli: true, api: true })).toBe('cli');
    expect(routeFor('api', { cli: true, api: true })).toBe('api');
    expect(routeFor('api', { cli: true, api: false })).toBe('cli');
    expect(routeFor('cli', { cli: false, api: true })).toBe('api');
    expect(routeFor('cli', { cli: false, api: false })).toBeNull();
  });
});
