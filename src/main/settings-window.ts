import { BrowserWindow } from 'electron';
import { t } from '../shared/messages';
import { PRELOAD, loadPage } from './load-page';
import windowIcon from '../../resources/icon.ico?asset&asarUnpack';

// 窓のアイコン（タイトルバーとタスクバー）。指定しないと、Electron の標準のアイコンになる（Mac は、アプリのアイコンが使われる）

type Modifiers = { control: boolean; alt: boolean; shift: boolean; meta: boolean };

let win: BrowserWindow | null = null;
// ホットキーの入力中か（設定画面が知らせてくる）
let recordingHotkey = false;

function setHotkeyRecording(recording: boolean): void {
  recordingHotkey = recording;
}

// 設定画面を開く。すでに開いていれば、前に出す
function openSettingsWindow(): void {
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
    return;
  }
  const window = new BrowserWindow({
    width: 480,
    height: 340,
    useContentSize: true,
    title: t('settings.title'),
    icon: windowIcon,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win = window;
  window.setMenu(null);
  loadPage(window, 'settings/index.html');

  // 直前に押されていた修飾キー（Alt+Space の判定に使う）
  let modifiers: Modifiers = { control: false, alt: false, shift: false, meta: false };
  const sendKey = (key: string, code: string, m: Modifiers) =>
    window.webContents.send('hotkey-key', { key, code, ctrlKey: m.control, altKey: m.alt, shiftKey: m.shift, metaKey: m.meta });

  // ホットキーの入力中は、押されたキーを、画面（ページ）ではなく、ここで受け取って渡す
  window.webContents.on('before-input-event', (event, input) => {
    modifiers = { control: input.control, alt: input.alt, shift: input.shift, meta: input.meta };
    if (!recordingHotkey || input.type !== 'keyDown') return;
    event.preventDefault();
    sendKey(input.key, input.code, modifiers);
  });

  // Alt+Space は、Windows が「窓のメニュー（移動・閉じるなど）」を開くキーなので、ページには届かず、
  // 窓のメニューが開いて、窓の操作が奪われる。このとき届く system-context-menu を止めて（preventDefault）、
  // Alt+Space が押されたものとして、画面に渡す
  window.on('system-context-menu', (event) => {
    if (!recordingHotkey || !modifiers.alt) return;
    event.preventDefault();
    sendKey(' ', 'Space', modifiers);
  });

  window.on('closed', () => {
    win = null;
    recordingHotkey = false;
  });
}

// 言語が変わったときに、窓のタイトルを付け直す
function refreshSettingsWindowTitle(): void {
  if (win && !win.isDestroyed()) win.setTitle(t('settings.title'));
}

export { openSettingsWindow, refreshSettingsWindowTitle, setHotkeyRecording };
