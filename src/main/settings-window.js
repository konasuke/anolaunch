const { BrowserWindow } = require('electron');
const path = require('path');
const { t } = require('../shared/messages');
const { unpacked } = require('./unpacked');

// 窓のアイコン（タイトルバーとタスクバー）。指定しないと、Electron の標準のアイコンになる（Mac は、アプリのアイコンが使われる）
const WINDOW_ICON = unpacked(path.join(__dirname, '../assets/icon.ico'));

let win = null;
// ホットキーの入力中か（設定画面が知らせてくる）
let recordingHotkey = false;

function setHotkeyRecording(recording) {
  recordingHotkey = recording;
}

// 設定画面を開く。すでに開いていれば、前に出す
function openSettingsWindow() {
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
    return;
  }
  win = new BrowserWindow({
    width: 480,
    height: 340,
    useContentSize: true,
    title: t('settings.title'),
    icon: WINDOW_ICON,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, '../renderer/settings/index.html'));

  // 直前に押されていた修飾キー（Alt+Space の判定に使う）
  let modifiers = { control: false, alt: false, shift: false, meta: false };
  const sendKey = (key, code, m) =>
    win.webContents.send('hotkey-key', { key, code, ctrlKey: m.control, altKey: m.alt, shiftKey: m.shift, metaKey: m.meta });

  // ホットキーの入力中は、押されたキーを、画面（ページ）ではなく、ここで受け取って渡す
  win.webContents.on('before-input-event', (event, input) => {
    modifiers = { control: input.control, alt: input.alt, shift: input.shift, meta: input.meta };
    if (!recordingHotkey || input.type !== 'keyDown') return;
    event.preventDefault();
    sendKey(input.key, input.code, modifiers);
  });

  // Alt+Space は、Windows が「窓のメニュー（移動・閉じるなど）」を開くキーなので、ページには届かず、
  // 窓のメニューが開いて、窓の操作が奪われる。このとき届く system-context-menu を止めて（preventDefault）、
  // Alt+Space が押されたものとして、画面に渡す
  win.on('system-context-menu', (event) => {
    if (!recordingHotkey || !modifiers.alt) return;
    event.preventDefault();
    sendKey(' ', 'Space', modifiers);
  });

  win.on('closed', () => {
    win = null;
    recordingHotkey = false;
  });
}

// 言語が変わったときに、窓のタイトルを付け直す
function refreshSettingsWindowTitle() {
  if (win && !win.isDestroyed()) win.setTitle(t('settings.title'));
}

module.exports = { openSettingsWindow, refreshSettingsWindowTitle, setHotkeyRecording };
