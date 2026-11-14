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

// Windows：スタートメニューのショートカット（.lnk）が置かれるフォルダ
const WINDOWS_DIRS = [
  path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
];

// アンインストーラやヘルプなど、起動したいアプリではないもの
const WINDOWS_IGNORE = /uninstall|アンインストール|readme|ヘルプ|\bhelp\b/i;

// フォルダの中を、サブフォルダも含めて辿り、.lnk のパスを集める
function collectShortcuts(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // フォルダがなければ飛ばす
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectShortcuts(full, out);
    else if (entry.name.toLowerCase().endsWith('.lnk')) out.push(full);
  }
}

function scanWindows() {
  const files = [];
  for (const dir of WINDOWS_DIRS) collectShortcuts(dir, files);

  const found = new Map();
  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    if (WINDOWS_IGNORE.test(name)) continue;
    if (!found.has(name)) found.set(name, { name, path: file });
  }
  return [...found.values()];
}

function getApps() {
  const apps = process.platform === 'win32' ? scanWindows() : scanMac();
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { getApps };
