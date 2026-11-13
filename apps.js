const fs = require('fs');
const os = require('os');
const path = require('path');

// Mac：.app が置かれるフォルダ
const MAC_DIRS = [
  '/Applications',
  '/Applications/Utilities',
  '/System/Applications',
  '/System/Applications/Utilities',
  path.join(os.homedir(), 'Applications'),
];

function scanMac() {
  const found = new Map();
  for (const dir of MAC_DIRS) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue; // フォルダがなければ飛ばす
    }
    for (const entry of entries) {
      if (!entry.endsWith('.app')) continue;
      const name = entry.slice(0, -'.app'.length);
      if (!found.has(name)) found.set(name, { name, path: path.join(dir, entry) });
    }
  }
  return [...found.values()];
}

// Windows：スタートメニューのショートカットを読む（まだ作っていない）
function scanWindows() {
  return [];
}

function getApps() {
  const apps = process.platform === 'win32' ? scanWindows() : scanMac();
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { getApps };
