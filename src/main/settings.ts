import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { LANGUAGES } from '../shared/messages';
import type { Language } from '../shared/messages';
import type { Settings } from '../shared/types';

// ホットキーの書き方（Electron の Accelerator）。修飾キー（Ctrl など）＋キー、または F1〜F24 だけ
const MODIFIERS = ['CommandOrControl', 'CmdOrCtrl', 'Command', 'Cmd', 'Control', 'Ctrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta'];

function isValidHotkey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parts = value.split('+');
  const key = parts.pop();
  if (!key || !parts.every((part) => MODIFIERS.includes(part))) return false;
  return parts.length > 0 || /^F([1-9]|1\d|2[0-4])$/.test(key);
}

// 設定の項目。値が正しいかを確かめる関数も、ここに並べる（項目を足すときは、ここと defaults に足す）
// （satisfies により、Settings に項目を足して、ここに足し忘れると、型のエラーになる）
const VALIDATORS = {
  language: (value: unknown): value is Language => (LANGUAGES as readonly unknown[]).includes(value),
  hotkey: isValidHotkey,
  autoStart: (value: unknown): value is boolean => typeof value === 'boolean',
} satisfies { [K in keyof Settings]: (value: unknown) => value is Settings[K] };

// 初期値。言語は、OS の言語が日本語なら日本語、それ以外は英語
function defaults(): Settings {
  return {
    language: app.getLocale().toLowerCase().startsWith('ja') ? 'ja' : 'en',
    hotkey: 'CommandOrControl+Shift+Space',
    autoStart: true, // PC 起動時に、自動で起動する（インストール版だけで効く。設定画面で、オフにできる）
  };
}

// 保存先（OS ごとのアプリ用のデータフォルダの中）
function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

// 正しい値だけを取り出す（知らない項目や、正しくない値は捨てる）
function sanitize(raw: unknown): Partial<Settings> {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, isValid] of Object.entries(VALIDATORS)) {
    if (isValid(source[key])) result[key] = source[key];
  }
  return result as Partial<Settings>;
}

// 設定をファイルに保存する
function writeSettings(settings: Settings): void {
  const file = settingsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 一時ファイルに書いてから入れ替える（書き込みの途中で止まっても、元のファイルが壊れない）
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
  fs.renameSync(tmp, file);
}

// アプリの名前を変えたとき（launcher → Anolaunch）、設定の保存先のフォルダも変わる。
// 新しい保存先に設定が無いときだけ、前の名前のフォルダにあった設定を、引き継ぐ
const OLD_FOLDER_NAMES = ['launcher'];

function readOldSettings(): Partial<Settings> {
  for (const name of OLD_FOLDER_NAMES) {
    try {
      const old = sanitize(JSON.parse(fs.readFileSync(path.join(app.getPath('appData'), name, 'settings.json'), 'utf8')));
      if (Object.keys(old).length > 0) return old;
    } catch {
      // 前の設定が無いときは、何もしない
    }
  }
  return {};
}

function load(): Settings {
  try {
    return { ...defaults(), ...sanitize(JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))) };
  } catch {
    // 設定のファイルが無い、壊れているとき
  }
  const settings = { ...defaults(), ...readOldSettings() };
  writeSettings(settings); // 引き継いだ設定を、新しい保存先に残す（初期値だけのときも、作っておく）
  return settings;
}

let current: Settings | null = null;

function getSettings(): Settings {
  if (!current) current = load();
  return { ...current };
}

// 設定を更新して、ファイルに保存する。保存した後の設定を返す
function updateSettings(partial: unknown): Settings {
  current = { ...getSettings(), ...sanitize(partial) };
  writeSettings(current);
  return { ...current };
}

// 初期値を返す（設定画面の「初期値に戻す」用）
function getDefaults(): Settings {
  return defaults();
}

export { getSettings, updateSettings, getDefaults, isValidHotkey };
