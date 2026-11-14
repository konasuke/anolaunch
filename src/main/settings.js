const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { LANGUAGES } = require('../shared/messages');

// 設定の項目。値が正しいかを確かめる関数も、ここに並べる（項目を足すときは、ここと defaults に足す）
const VALIDATORS = {
  language: (value) => LANGUAGES.includes(value),
};

// 初期値。言語は、OS の言語が日本語なら日本語、それ以外は英語
function defaults() {
  return { language: app.getLocale().toLowerCase().startsWith('ja') ? 'ja' : 'en' };
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

module.exports = { getSettings, updateSettings };
