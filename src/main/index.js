const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const { getApps } = require('./apps');
const { preloadUwp } = require('./apps/uwp');
const { withIcons } = require('./icons');
const { createTray } = require('./tray');
const { launch } = require('./launch');

const HOTKEY = 'CommandOrControl+Shift+Space';

const WIDTH = 600;
const MIN_HEIGHT = 60; // 入力欄だけのとき（画面側が測った高さで、すぐ置き換わる）
const MAX_HEIGHT = 340; // 結果が多くても、これより大きくしない

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

  createTray({ onShow: showWindow });

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
