const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const { getApps } = require('./apps');
const { preloadUwp } = require('./apps/uwp');
const { withIcons } = require('./icons');
const { createTray, refreshTray } = require('./tray');
const { launch } = require('./launch');
const { getSettings, updateSettings } = require('./settings');
const { allMessages, setLanguage } = require('../shared/messages');

const HOTKEY = 'CommandOrControl+Shift+Space';

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
  setLanguage(getSettings().language);
  createTray({ onShow: showWindow });

  // 画面に出す文言（今の言語のもの）を、画面側に渡す
  ipcMain.handle('get-messages', () => allMessages());

  // 設定の読み書き。保存したら、言語をすぐ反映する（トレイと、画面の文言を作り直す）
  ipcMain.handle('get-settings', () => getSettings());
  ipcMain.handle('set-settings', (event, partial) => {
    const settings = updateSettings(partial);
    setLanguage(settings.language);
    refreshTray();
    win.webContents.send('messages-changed');
    return settings;
  });

  // Windows のストアアプリは、読み込みに時間がかかる（約2秒）ので、起動時に始めておき、一覧を返す前に待つ
  const uwpReady = preloadUwp();
  ipcMain.handle('get-apps', async () => {
    await uwpReady;
    return withIcons(getApps());
  });

  // 一覧にあるアプリだけ起動する（画面側から任意のパスを渡されても開かない）
  ipcMain.handle('launch-app', async (event, appPath) => {
    if (!getApps().some((a) => a.path === appPath)) return;
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

  if (!globalShortcut.register(HOTKEY, toggleWindow)) {
    console.error(`ホットキー ${HOTKEY} を登録できませんでした`);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ランチャーなので、窓を全部閉じても終了しない（常駐する）
app.on('window-all-closed', () => {});
