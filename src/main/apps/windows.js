const fs = require('fs');
const path = require('path');

// Windows：スタートメニューのショートカット（.lnk）が置かれるフォルダ
const DIRS = [
  path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
];

// アンインストーラやヘルプなど、起動したいアプリではないもの
const IGNORE = /uninstall|アンインストール|readme|ヘルプ|\bhelp\b/i;

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
  for (const dir of DIRS) collectShortcuts(dir, files);

  const found = new Map();
  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    if (IGNORE.test(name)) continue;
    if (!found.has(name)) found.set(name, { name, path: file });
  }
  return [...found.values()];
}

module.exports = { scanWindows };
