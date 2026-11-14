const { Tray, Menu } = require('electron');
const path = require('path');
const { t } = require('../shared/messages');

// 変数に持っておく（持たないと、あとで片付けられてアイコンが消える）
let tray;
let onShowWindow;
let onOpenSettings;

// 今の言語で、ツールチップとメニューを作る
function refreshTray() {
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
function createTray({ onShow, onSettings }) {
  onShowWindow = onShow;
  onOpenSettings = onSettings;
  // tray@2x.png は、高解像度の画面で自動的に使われる
  tray = new Tray(path.join(__dirname, '../assets/tray.png'));
  refreshTray();
  // Windows では、左クリックでも窓を出す（Mac はクリックでメニューが開く）
  tray.on('click', onShow);
}

module.exports = { createTray, refreshTray };
