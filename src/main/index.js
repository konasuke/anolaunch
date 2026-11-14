const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const { initAppList, getAppList, findApp, refreshApps } = require('./app-list');
const { getIcon, clearIconCache, cleanupIcons, pruneIconCache } = require('./icons');
const { createTray, refreshTray } = require('./tray');
const { launch } = require('./launch');
const { getSettings, updateSettings, getDefaults, isValidHotkey } = require('./settings');
const { registerHotkey } = require('./hotkey');
const { applyAutoStart } = require('./autostart');
const { openSettingsWindow, refreshSettingsWindowTitle, setHotkeyRecording } = require('./settings-window');
const { allMessages, setLanguage } = require('../shared/messages');
const { unpacked } = require('./unpacked');

const WIDTH = 600;
const MIN_HEIGHT = 60; // 入力欄だけのとき（画面側が測った高さで、すぐ置き換わる）
const MAX_HEIGHT = 420; // 結果が多くても、これより大きくしない

let win;

function createWindow() {
  win = new BrowserWindow({
    width: WIDTH,
    height: MIN_HEIGHT,
    useContentSize: true,
    show: false,
    icon: unpacked(path.join(__dirname, '../assets/icon.ico')), // Alt+Tab などに出るアイコン
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 他のところをクリックしたら隠す
  win.on('blur', () => win.hide());

  // Esc で隠す
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      win.hide();
    }
  });
}

// マウスのあるモニターで、横は中央、縦は上から 1/4 の位置に置く
// （窓の上端を固定するので、結果が増えると下に伸びる）
function positionWindow() {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  win.setPosition(
    Math.round(workArea.x + (workArea.width - WIDTH) / 2),
    Math.round(workArea.y + workArea.height * 0.25)
  );
}

function showWindow() {
  if (!win || win.isVisible()) return;
  positionWindow();
  win.show();
  win.focus();
  win.webContents.send('window-shown');
  // 窓を出したときに、裏で、一覧を最新にする（アプリの追加・削除に、再起動なしで対応するため。30 秒に 1 回まで）
  refreshApps();
}

function toggleWindow() {
  if (win.isVisible()) win.hide();
  else showWindow();
}

// 二重起動を防ぐ。すでに動いているときは、あとから起動したほうがすぐ終わる
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

// あとから起動されたら、動いているほうの窓を出す（ホットキーの代わりに使える）
app.on('second-instance', showWindow);

app.whenReady().then(() => {
  if (!hasLock) return;

  // Mac：常駐するので、Dock にアイコンを出さない（目印はメニューバーのトレイ）
  if (process.platform === 'darwin') app.dock.hide();

  // 保存してある設定を反映してから、トレイを作る（言語がトレイの文言に効くため）
  const settings = getSettings();
  setLanguage(settings.language);
  createTray({ onShow: showWindow, onSettings: openSettingsWindow });
  applyAutoStart(settings.autoStart);

  // 画面に出す文言（今の言語のもの）を、画面側に渡す
  ipcMain.handle('get-messages', () => allMessages());

  // 設定の読み書き。保存したら、すぐ反映する
  ipcMain.handle('get-settings', () => getSettings());
  ipcMain.handle('get-default-settings', () => getDefaults());
  // 設定画面が、キーの表示と入力の変換を、どの OS に合わせるかを知るための情報
  ipcMain.handle('get-app-info', () => ({ platform: process.platform }));
  // ランチャーの歯車ボタン・ショートカットから、設定画面を開く
  ipcMain.on('open-settings', () => openSettingsWindow());

  // 設定画面がホットキーの入力を始めた・やめたことを受け取る（入力中だけ、キーをメイン側で受け取る）
  ipcMain.on('hotkey-recording', (event, recording) => setHotkeyRecording(Boolean(recording)));
  ipcMain.handle('set-settings', (event, partial) => {
    const before = getSettings();
    // ホットキーは、先に登録を試す。登録できなければ、何も保存せずに、失敗を返す
    if (partial && partial.hotkey !== undefined && partial.hotkey !== before.hotkey) {
      if (!isValidHotkey(partial.hotkey) || !registerHotkey(partial.hotkey, toggleWindow)) {
        return { settings: before, error: 'hotkey' };
      }
    }
    const after = updateSettings(partial);
    if (after.autoStart !== before.autoStart) applyAutoStart(after.autoStart);
    if (after.language !== before.language) {
      setLanguage(after.language);
      refreshTray();
      refreshSettingsWindowTitle();
      // 開いている窓（ランチャーと設定画面）に、文言が変わったことを伝える
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send('messages-changed');
    }
    return { settings: after };
  });

  // アプリの一覧は、アイコン抜きで、すぐ返す。アイコンは、画面が表示する行の分だけ、あとから get-icon で取りに来る
  // （画面から来る要求は、一覧にあるアプリだけ受け付ける）
  // 再スキャンで一覧が変わったら、ランチャーの窓に知らせて、取り直させる
  initAppList({ onListChange: () => win.webContents.send('apps-changed') });
  ipcMain.handle('get-apps', () => getAppList());
  ipcMain.handle('get-icon', (event, appPath) => {
    const found = findApp(appPath);
    return found ? getIcon(found) : null;
  });

  // 起動の少しあとに、一覧を最新にする（保存してあったストアアプリの一覧は、古いかもしれない）。
  // ログイン直後の、ほかのアプリの起動と取り合わないよう、すぐにはやらない
  setTimeout(() => refreshApps({ force: true }), 5000);

  // キャッシュを削除する：取ってあるアイコンを（ファイルも）捨て、一覧も取り直す。
  // 終わったら、ランチャーの窓に伝えて、一覧とアイコンを取り直させる
  ipcMain.handle('clear-cache', async () => {
    clearIconCache();
    await refreshApps({ force: true });
    win.webContents.send('cache-cleared');
  });

  // 一覧にあるアプリだけ起動する（画面側から任意のパスを渡されても開かない）
  ipcMain.handle('launch-app', async (event, appPath) => {
    if (!findApp(appPath)) return;
    win.hide();
    const error = await launch(appPath);
    if (error) console.error(`起動できませんでした: ${appPath}: ${error}`);
  });

  // 画面側が測った中身の高さに、窓の高さを合わせる
  ipcMain.on('resize-window', (event, height) => {
    if (!win || !Number.isFinite(height)) return;
    win.setContentSize(WIDTH, Math.min(Math.max(Math.ceil(height), MIN_HEIGHT), MAX_HEIGHT));
  });

  createWindow();

  // 長く使われていないアイコンのファイルを、起動の少しあとに掃除する（起動の邪魔をしないため）
  setTimeout(pruneIconCache, 30 * 1000);

  if (!registerHotkey(settings.hotkey, toggleWindow)) {
    console.error(`ホットキー ${settings.hotkey} を登録できませんでした`);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  cleanupIcons();
});

// ランチャーなので、窓を全部閉じても終了しない（常駐する）
app.on('window-all-closed', () => {});
