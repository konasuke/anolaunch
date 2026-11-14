const { app } = require('electron');

// PC 起動時の自動起動を、オン・オフする
// 開発中（npm start）は、node_modules の中の electron.exe を登録してしまうので、何もしない
function applyAutoStart(enabled) {
  if (!app.isPackaged) return false;
  app.setLoginItemSettings({ openAtLogin: enabled });
  return true;
}

module.exports = { applyAutoStart };
