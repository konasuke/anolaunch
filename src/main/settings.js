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
    autoStart: false,
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

function load() {
  let saved = {};
  try {
    saved = sanitize(JSON.parse(fs.readFileSync(settingsFile(), 'utf8')));
  } catch {
    // ファイルが無い、壊れているときは、初期値で始める
  }
  return { ...defaults(), ...saved };
}

let current = null;

function getSettings() {
  if (!current) current = load();
  return { ...current };
}

// 設定を更新して、ファイルに保存する。保存した後の設定を返す
function updateSettings(partial) {
  current = { ...getSettings(), ...sanitize(partial) };
  const file = settingsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 一時ファイルに書いてから入れ替える（書き込みの途中で止まっても、元のファイルが壊れない）
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(current, null, 2));
  fs.renameSync(tmp, file);
  return { ...current };
}

// 初期値を返す（設定画面の「初期値に戻す」用）
function getDefaults() {
  return defaults();
}

module.exports = { getSettings, updateSettings, getDefaults, isValidHotkey };
