const fs = require('fs');
const os = require('os');
const path = require('path');
const { getMacIcon } = require('./mac');
const { getWindowsIcon } = require('./windows');
const { iconFromImageFile } = require('./file');

const CONCURRENCY = 8; // 同時に動かす変換の数（別プロセスを呼ぶ OS があるので、増やしすぎない）

// アプリのパス → アイコン（data URL）を取る処理。一度取ったものは使い回す（取っている最中のものも、同じ処理を待つ）
const cache = new Map();

// 変換の途中ファイルを置く一時フォルダ。初めて使うときに作り、終了時に消す
let tmpDir = null;
function getTmpDir() {
  if (!tmpDir) tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-icons-'));
  return tmpDir;
}

function cleanupIcons() {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
}

// 同時に動かす数を CONCURRENCY までにする待ち行列
const queue = [];
let running = 0;

function pump() {
  while (running < CONCURRENCY && queue.length > 0) {
    const { task, resolve } = queue.shift();
    running++;
    task()
      .catch(() => null) // 取れなければ、アイコンなし
      .then(resolve)
      .finally(() => {
        running--;
        pump();
      });
  }
}

function limit(task) {
  return new Promise((resolve) => {
    queue.push({ task, resolve });
    pump();
  });
}

async function fetchIcon(app) {
  if (app.iconFile) return iconFromImageFile(app.iconFile); // アイコンのファイルが分かっているもの（Steam のゲーム）
  if (/^(steam|shell):/.test(app.path)) return null;
  const dir = getTmpDir();
  return process.platform === 'win32' ? getWindowsIcon(app.path, dir) : getMacIcon(app.path, dir);
}

// アプリ1件のアイコン（data URL。取れなければ null）を返す。画面に出すときに、必要な分だけ呼ぶ
function getIcon(app) {
  if (!cache.has(app.path)) cache.set(app.path, limit(() => fetchIcon(app)));
  return cache.get(app.path);
}

// 取ってあるアイコンを全部捨てる（次に表示するとき、取り直す）
function clearIconCache() {
  cache.clear();
}

module.exports = { getIcon, clearIconCache, cleanupIcons };
