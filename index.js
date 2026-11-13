const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

const HOTKEY = 'CommandOrControl+Shift+Space';

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 80,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

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
