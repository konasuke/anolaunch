import { BrowserWindow, screen } from 'electron';
import { refreshApps } from '../app-list';
import { PRELOAD, loadPage } from '../load-page';
import { EVENT } from '../../shared/ipc-channels';
import windowIcon from '../../../resources/icon.ico?asset&asarUnpack';

const WIDTH = 600;
const MIN_HEIGHT = 60; // 入力欄だけのとき（画面側が測った高さで、すぐ置き換わる）
const MAX_HEIGHT = 420; // 結果が多くても、これより大きくしない

let win: BrowserWindow;

function createLauncherWindow(): void {
  win = new BrowserWindow({
    width: WIDTH,
    height: MIN_HEIGHT,
    useContentSize: true,
    show: false,
    icon: windowIcon, // Alt+Tab などに出るアイコン
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Mac：全画面のアプリの上にも出す（これが無いと、デスクトップのスペースに戻されてしまう）
  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setAlwaysOnTop(true, 'screen-saver');
  }

  loadPage(win, 'index.html');

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
function positionWindow(): void {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  win.setPosition(
    Math.round(workArea.x + (workArea.width - WIDTH) / 2),
    Math.round(workArea.y + workArea.height * 0.25)
  );
}

function showLauncher(): void {
  if (!win || win.isVisible()) return;
  positionWindow();
  win.show();
  win.focus();
  win.webContents.send(EVENT.windowShown);
  // 窓を出したときに、裏で、一覧を最新にする（アプリの追加・削除に、再起動なしで対応するため。30 秒に 1 回まで）
  refreshApps();
}

function hideLauncher(): void {
  win.hide();
}

function toggleLauncher(): void {
  if (win.isVisible()) hideLauncher();
  else showLauncher();
}

// 画面側が測った中身の高さに、窓の高さを合わせる
function resizeLauncher(height: number): void {
  if (!win || !Number.isFinite(height)) return;
  win.setContentSize(WIDTH, Math.min(Math.max(Math.ceil(height), MIN_HEIGHT), MAX_HEIGHT));
}

// ランチャーの窓の画面に、通知を送る
function sendToLauncher(channel: string): void {
  win.webContents.send(channel);
}

export { createLauncherWindow, showLauncher, hideLauncher, toggleLauncher, resizeLauncher, sendToLauncher };
