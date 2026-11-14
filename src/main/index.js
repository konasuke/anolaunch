const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require('electron');
const path = require('path');
const { getApps } = require('./apps');
const { withIcons } = require('./icons');

const HOTKEY = 'CommandOrControl+Shift+Space';

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 340,
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

function toggleWindow() {
  if (win.isVisible()) {
    win.hide();
  } else {
    win.center();
    win.show();
    win.focus();
  }
}

app.whenReady().then(() => {
  ipcMain.handle('get-apps', () => withIcons(getApps()));

  // 一覧にあるアプリだけ起動する（画面側から任意のパスを渡されても開かない）
  ipcMain.handle('launch-app', async (event, appPath) => {
    if (!getApps().some((a) => a.path === appPath)) return;
    win.hide();
    const error = await shell.openPath(appPath);
    if (error) console.error(`起動できませんでした: ${appPath}: ${error}`);
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
