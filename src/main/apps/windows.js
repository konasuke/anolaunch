const { shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { KIND } = require('../../shared/kinds');

// Windows：スタートメニューのショートカット（.lnk）が置かれるフォルダ
const DIRS = [
  path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
];

// アンインストーラやヘルプなど、起動したいアプリではないもの
const IGNORE = /uninstall|アンインストール|readme|ヘルプ|\bhelp\b/i;

// インターネットショートカット（.url）の URL を読む。Steam のゲームは、steam://rungameid/番号 の .url で置かれる
function readUrl(file) {
  try {
    const match = fs.readFileSync(file, 'utf8').match(/^URL=(.+)$/m);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

// フォルダの中を、サブフォルダも含めて辿り、.lnk と .url のパスを集める
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
    else if (/\.(lnk|url)$/i.test(entry.name)) out.push(full);
  }
}

// ショートカットの指す先が無い（アンインストール後にショートカットだけ残った）ものは、起動できないので除く
function isBroken(file) {
  if (!file.toLowerCase().endsWith('.lnk')) return false;
  try {
    const { target } = shell.readShortcutLink(file);
    return Boolean(target) && !fs.existsSync(target);
  } catch {
    return false; // 読めないものは、除かずに残す
  }
}

function scanWindows() {
  const files = [];
  for (const dir of DIRS) collectShortcuts(dir, files);

  const found = new Map();
  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    if (IGNORE.test(name) || isBroken(file)) continue;
    // Web のページへのリンクは、アプリではないので除く（steam:// など、アプリを開くものだけ残す）
    if (file.toLowerCase().endsWith('.url') && /^https?:/i.test(readUrl(file))) continue;
    if (found.has(name)) continue;
    const app = { name, path: file, kind: KIND.APP };
    // Steam のゲームの .url は、Steam から集めたものとの重なりを除くために、番号を持たせる
    const steamId = file.toLowerCase().endsWith('.url') && readUrl(file).match(/^steam:\/\/rungameid\/(\d+)/i)?.[1];
    if (steamId) {
      app.steamId = steamId;
      app.kind = KIND.GAME;
    }
    found.set(name, app);
  }
  return [...found.values()];
}

module.exports = { scanWindows };
