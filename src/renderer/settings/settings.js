// 画面に出す文言（メインプロセスから受け取る）
let messages = {};
const t = (key) => messages[key] ?? key;

// 今の設定。変えた時点で保存するので、画面の値と保存してある値は、いつも同じ
let settings = {};
let defaultSettings = {};
// 実行環境（どの OS か。キーの表示と入力の変換に使う）
let appInfo = { platform: 'win32' };

const $ = (id) => document.getElementById(id);
const languageSelect = $('language');
const hotkeyButton = $('hotkey');
const resetButton = $('reset');
const autostartBox = $('autostart');
const clearCacheButton = $('clear-cache');

// キャッシュ削除ボタンの状態（ボタンの文字になる文言のキー）
let clearCacheState = 'settings.cache.clear';

let recording = false;

// --- ホットキーの表示と、キー入力 → Electron の書き方への変換 ---

const KEY_NAMES = {
  Space: 'Space', Enter: 'Return', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Backquote: '`',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
};

// 押したキーの文字（key）から、Electron のキー名にする。code が届かないとき（画面上のキーボードなど）の代わり
const KEY_NAMES_BY_KEY = {
  ' ': 'Space', Enter: 'Return', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
};

// キーの種類（物理的なキー。code）から、Electron のキー名にする。code が無ければ、key（押した文字）から。変換できなければ null
function keyName({ code, key }) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return key;
  if (/^F([1-9]|1\d|2[0-4])$/.test(key)) return key;
  return KEY_NAMES_BY_KEY[key] ?? null;
}

// キー入力を、Electron の Accelerator（例：CommandOrControl+Shift+Space）にする。変換できないキーのときは null
function toAccelerator(event) {
  const key = keyName(event);
  if (!key) return null;
  const isMac = appInfo.platform === 'darwin';
  const parts = [];
  // Ctrl（Windows）と Command（Mac）は、OS をまたいで同じ意味の CommandOrControl にする
  if (isMac ? event.metaKey : event.ctrlKey) parts.push('CommandOrControl');
  if (isMac && event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (!isMac && event.metaKey) parts.push('Super');
  parts.push(key);
  return parts.join('+');
}

// 画面に出す形（CommandOrControl を、Windows は Ctrl、Mac は Cmd に）
function displayHotkey(accelerator) {
  const ctrl = appInfo.platform === 'darwin' ? 'Cmd' : 'Ctrl';
  return accelerator.replace('CommandOrControl', ctrl).split('+').join(' + ');
}

// --- 画面の表示 ---

function render() {
  document.title = t('settings.title');
  $('language-label').textContent = t('settings.language');
  $('hotkey-label').textContent = t('settings.hotkey');
  $('autostart-label').textContent = t('settings.autostart');
  resetButton.textContent = t('settings.hotkey.reset');
  resetButton.hidden = settings.hotkey === defaultSettings.hotkey;

  // 言語の選択肢。名前は、どの言語で表示していても、その言語自身の名前
  languageSelect.replaceChildren(
    ...['ja', 'en'].map((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = t(`settings.language.${code}`);
      option.selected = code === settings.language;
      return option;
    })
  );

  hotkeyButton.classList.toggle('recording', recording);
  hotkeyButton.textContent = recording ? t('settings.hotkey.recording') : displayHotkey(settings.hotkey);

  autostartBox.checked = Boolean(settings.autoStart);

  $('cache-label').textContent = t('settings.cache');
  $('cache-note').textContent = t('settings.cache.note');
  clearCacheButton.textContent = t(clearCacheState); // 削除中・削除した直後は、ボタンの文字が変わる
}

// ホットキーのエラー表示。表示するメッセージのキーを覚えておき、言語が変わったら、言い直す
let hotkeyErrorKey = null;
function showHotkeyError(key) {
  hotkeyErrorKey = key;
  $('hotkey-error').textContent = key ? t(key) : '';
}

// --- 設定の保存（変えた時点で保存する） ---

async function save(partial) {
  const result = await window.api.setSettings(partial);
  settings = result.settings;
  return result;
}

// 言語を変えたら、文言は、メインからの通知（messages-changed）で入れ替わる
languageSelect.addEventListener('change', () => save({ language: languageSelect.value }));

autostartBox.addEventListener('change', () => save({ autoStart: autostartBox.checked }));

// ホットキーを変える。登録できなければ、保存されず、今のキーのまま
async function changeHotkey(accelerator) {
  const result = await save({ hotkey: accelerator });
  showHotkeyError(result.error === 'hotkey' ? 'settings.hotkey.failed' : null);
  render();
}

resetButton.addEventListener('click', () => changeHotkey(defaultSettings.hotkey));

// ホットキーの入力を始める・やめる。入力中は、押されたキーを、メインプロセスが受け取って渡してくれる
// （Alt+Space など、Windows が窓の操作に使うキーは、ページには届かないため）
function setRecording(value) {
  recording = value;
  window.api.setHotkeyRecording(value);
  render();
}

const stopRecording = () => setRecording(false);

hotkeyButton.addEventListener('click', () => {
  showHotkeyError(null);
  setRecording(true);
});

// キャッシュを削除する。終わるまでボタンを押せなくし、終わったら、2 秒だけ「削除しました」と出す
clearCacheButton.addEventListener('click', async () => {
  clearCacheButton.disabled = true;
  clearCacheState = 'settings.cache.clearing';
  render();
  await window.api.clearCache();
  clearCacheState = 'settings.cache.cleared';
  render();
  setTimeout(() => {
    clearCacheState = 'settings.cache.clear';
    clearCacheButton.disabled = false;
    render();
  }, 2000);
});

// 入力中に押されたキー（メインプロセスから届く）
window.api.onHotkeyKey((event) => {
  if (!recording) return;
  if (event.key === 'Escape') return stopRecording();
  if (['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'].includes(event.key)) return; // 修飾キーだけのときは、次を待つ
  const accelerator = toAccelerator(event);
  if (!accelerator) return;
  stopRecording();
  // 修飾キーが無いキーは、F1〜F24 だけ使える
  if (!accelerator.includes('+') && !/^F\d+$/.test(accelerator)) {
    showHotkeyError('settings.hotkey.needModifier');
    return;
  }
  changeHotkey(accelerator);
});

// Esc で設定画面を閉じる（ホットキーの入力中の Esc は、メインから届き、入力をやめるだけ）
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !recording) window.close();
});

hotkeyButton.addEventListener('blur', () => {
  if (recording) stopRecording();
});

// 言語が変わったら、文言を受け取り直して、表示を作り直す
window.api.onMessagesChanged(async () => {
  messages = await window.api.getMessages();
  render();
  showHotkeyError(hotkeyErrorKey);
});

async function init() {
  [messages, settings, defaultSettings, appInfo] = await Promise.all([
    window.api.getMessages(),
    window.api.getSettings(),
    window.api.getDefaultSettings(),
    window.api.getAppInfo(),
  ]);
  render();
}

init();
