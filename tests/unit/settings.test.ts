import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  defaults, loadSettings, parseSettings, record, saveEnabled, subscribeEnabled,
  LEGACY_ENABLED_KEY, SETTINGS_KEY,
} from '../../src/shared/settings';

type ChangeListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;

function stubChrome(initial: Record<string, unknown> = {}) {
  const store = { ...initial };
  const listeners: ChangeListener[] = [];
  const get = vi.fn(async (keys: string[]) =>
    Object.fromEntries(keys.filter((key) => key in store).map((key) => [key, store[key]])));
  const set = vi.fn(async (items: Record<string, unknown>) => {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: store[key], newValue: value };
      store[key] = value;
    }
    for (const listener of [...listeners]) listener(changes, 'sync');
  });
  vi.stubGlobal('chrome', {
    storage: {
      sync: { get, set },
      onChanged: { addListener: (listener: ChangeListener) => { listeners.push(listener); } },
    },
  });
  return { store, listeners, get, set };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('settings', () => {
  it('defaults to enabled', () => {
    expect(defaults()).toEqual({ version: 1, enabled: true });
  });
  it('parses the versioned object', () => {
    expect(parseSettings({ version: 1, enabled: false })).toEqual({ version: 1, enabled: false });
  });
  it.each([
    null, [], {}, { version: 2, enabled: true }, { version: 1 },
    { version: 1, enabled: 'true' }, { version: 1, enabled: true, extra: 1 },
  ])('rejects invalid settings case %#', (value) => {
    expect(() => parseSettings(value)).toThrow('設定の形式');
  });
  it('recognizes records only', () => {
    expect(record({ enabled: false })).toBe(true);
    expect(record(null)).toBe(false);
    expect(record([])).toBe(false);
    expect(record('enabled')).toBe(false);
  });
  it('loads defaults when nothing is stored', async () => {
    stubChrome();
    await expect(loadSettings()).resolves.toEqual({ version: 1, enabled: true });
  });
  it('migrates the legacy boolean key', async () => {
    stubChrome({ [LEGACY_ENABLED_KEY]: false });
    await expect(loadSettings()).resolves.toEqual({ version: 1, enabled: false });
  });
  it('ignores a malformed legacy value', async () => {
    stubChrome({ [LEGACY_ENABLED_KEY]: 'false' });
    await expect(loadSettings()).resolves.toEqual({ version: 1, enabled: true });
  });
  it('prefers the versioned key over the legacy one', async () => {
    stubChrome({ [SETTINGS_KEY]: { version: 1, enabled: false }, [LEGACY_ENABLED_KEY]: true });
    await expect(loadSettings()).resolves.toEqual({ version: 1, enabled: false });
  });
  it('rejects a malformed stored object', async () => {
    stubChrome({ [SETTINGS_KEY]: { version: 1, enabled: 'no' } });
    await expect(loadSettings()).rejects.toThrow('設定の形式');
  });
  it('writes the versioned object', async () => {
    const { store } = stubChrome();
    await saveEnabled(false);
    expect(store[SETTINGS_KEY]).toEqual({ version: 1, enabled: false });
  });
  it('notifies on sync changes and falls back on broken values', () => {
    const { listeners } = stubChrome();
    const seen: boolean[] = [];
    subscribeEnabled((value) => seen.push(value));
    listeners[0]!({ [SETTINGS_KEY]: { newValue: { version: 1, enabled: false } } }, 'sync');
    listeners[0]!({ [SETTINGS_KEY]: { newValue: { version: 9 } } }, 'sync');
    listeners[0]!({}, 'sync');
    listeners[0]!({ [SETTINGS_KEY]: { newValue: { version: 1, enabled: false } } }, 'local');
    expect(seen).toEqual([false, true]);
  });
});
