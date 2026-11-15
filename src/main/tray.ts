import { Tray, Menu } from 'electron';
import { t } from '../shared/messages';
import trayIcon from '../../resources/tray.png?asset&asarUnpack';

// 変数に持っておく（持たないと、あとで片付けられてアイコンが消える）
let tray: Tray;
let onShowWindow: () => void;
let onOpenSettings: () => void;

// 今の言語で、ツールチップとメニューを作る
function refreshTray(): void {
  tray.setToolTip(t('tray.tooltip'));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: t('tray.show'), click: onShowWindow },
      { label: t('tray.settings'), click: onOpenSettings },
      { type: 'separator' },
      { label: t('tray.quit'), role: 'quit' },
    ])
  );
}

// 常駐中の目印（タスクトレイ。Mac ではメニューバー）と、終了の操作を作る
function createTray({ onShow, onSettings }: { onShow: () => void; onSettings: () => void }): void {
  onShowWindow = onShow;
  onOpenSettings = onSettings;
  // tray@2x.png は、高解像度の画面で自動的に使われる
  tray = new Tray(trayIcon);
  refreshTray();
  // Windows では、左クリックでも窓を出す（Mac はクリックでメニューが開く）
  tray.on('click', onShow);
}

export { createTray, refreshTray };
