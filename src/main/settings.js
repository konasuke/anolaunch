const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { LANGUAGES } = require('../shared/messages');

// ホットキーの書き方（Electron の Accelerator）。修飾キー（Ctrl など）＋キー、または F1〜F24 だけ
const MODIFIERS = ['CommandOrControl', 'CmdOrCtrl', 'Command', 'Cmd', 'Control', 'Ctrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta'];

function isValidHotkey(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('+');
  const key = parts.pop();
  if (!key || !parts.every((part) => MODIFIERS.includes(part))) return false;
  return parts.length > 0 || /^F([1-9]|1\d|2[0-4])$/.test(key);
}

// 設定の項目。値が正しいかを確かめる関数も、ここに並べる（項目を足すときは、ここと defaults に足す）
const VALIDATORS = {
  language: (value) => LANGUAGES.includes(value),
  hotkey: isValidHotkey,
  autoStart: (value) => typeof value === 'boolean',
};

// 初期値。言語は、OS の言語が日本語なら日本語、それ以外は英語
function defaults() {
  return {
    language: app.getLocale().toLowerCase().startsWith('ja') ? 'ja' : 'en',
    hotkey: 'CommandOrControl+Shift+Space',
    autoStart: true, // PC 起動時に、自動で起動する（インストール版だけで効く。設定画面で、オフにできる）
  };
}

// 保存先（OS ごとのアプリ用のデータフォルダの中）
function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

// 正しい値だけを取り出す（知らない項目や、正しくない値は捨てる）
function sanitize(raw) {
  const result = {};
  for (const [key, isValid] of Object.entries(VALIDATORS)) {
    if (raw && isValid(raw[key])) result[key] = raw[key];
  }
  return result;
}

// 設定をファイルに保存する
function writeSettings(settings) {
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

function readOldSettings() {
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

function load() {
  try {
    return { ...defaults(), ...sanitize(JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))) };
  } catch {
    // 設定のファイルが無い、壊れているとき
  }
  const settings = { ...defaults(), ...readOldSettings() };
  writeSettings(settings); // 引き継いだ設定を、新しい保存先に残す（初期値だけのときも、作っておく）
  return settings;
}

let current = null;

function getSettings() {
  if (!current) current = load();
  return { ...current };
}

// 設定を更新して、ファイルに保存する。保存した後の設定を返す
function updateSettings(partial) {
  current = { ...getSettings(), ...sanitize(partial) };
  writeSettings(current);
  return { ...current };
}

// 初期値を返す（設定画面の「初期値に戻す」用）
function getDefaults() {
  return defaults();
}

module.exports = { getSettings, updateSettings, getDefaults, isValidHotkey };
