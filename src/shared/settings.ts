export interface Settings {
  version: 1;
  enabled: boolean;
}

export const SETTINGS_KEY = 'settings';
/** 旧バージョンが保存していた boolean のキー。移行のため読み取りのみ行う。 */
export const LEGACY_ENABLED_KEY = 'enabled';

export function defaults(): Settings {
  return { version: 1, enabled: true };
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSettings(value: unknown): Settings {
  if (!record(value) || value.version !== 1 || typeof value.enabled !== 'boolean' ||
      Object.keys(value).some((key) => key !== 'version' && key !== 'enabled')) {
    throw new Error('設定の形式が正しくありません。');
  }
  return { version: 1, enabled: value.enabled };
}

/** 保存済みの設定を読む。旧形式の boolean キーしかなければ引き継ぐ。 */
export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get([SETTINGS_KEY, LEGACY_ENABLED_KEY]);
  const value = stored[SETTINGS_KEY];
  if (value === undefined) {
    const legacy = stored[LEGACY_ENABLED_KEY];
    return typeof legacy === 'boolean' ? { version: 1, enabled: legacy } : defaults();
  }
  return parseSettings(value);
}

export async function saveEnabled(enabled: boolean): Promise<void> {
  const settings: Settings = { version: 1, enabled };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

/** 設定の変更を監視する。壊れた値は既定値として扱う。 */
export function subscribeEnabled(listener: (enabled: boolean) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const change = changes[SETTINGS_KEY];
    if (!change) return;
    try {
      listener(parseSettings(change.newValue).enabled);
    } catch {
      listener(defaults().enabled);
    }
  });
}
