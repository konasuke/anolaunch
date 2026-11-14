const { Tray, Menu } = require('electron');
const path = require('path');

// 変数に持っておく（持たないと、あとで片付けられてアイコンが消える）
let tray;

// 常駐中の目印（タスクトレイ。Mac ではメニューバー）と、終了の操作を作る
function createTray({ onShow }) {
  // tray@2x.png は、高解像度の画面で自動的に使われる
  tray = new Tray(path.join(__dirname, '../assets/tray.png'));
  tray.setToolTip('Launcher');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '表示', click: onShow },
      { type: 'separator' },
      { label: '終了', role: 'quit' },
    ])
  );
  // Windows では、左クリックでも窓を出す（Mac はクリックでメニューが開く）
  tray.on('click', onShow);
}

module.exports = { createTray };
