const fs = require('fs');
const os = require('os');
const path = require('path');
const { getMacIcon } = require('./mac');
const { getWindowsIcon } = require('./windows');
const { iconFromImageFile } = require('./file');

const CONCURRENCY = 8; // 同時に動かす変換の数

// アプリのパス → アイコン（data URL）。一度取ったものは使い回す
const cache = new Map();

async function getIcon(app, tmpDir) {
  if (cache.has(app.path)) return cache.get(app.path);
  let icon = null;
  if (app.iconFile) {
    icon = iconFromImageFile(app.iconFile); // アイコンのファイルが分かっているもの（Steam のゲーム）
  } else if (!app.path.startsWith('steam://')) {
    icon = process.platform === 'win32' ? await getWindowsIcon(app.path, tmpDir) : await getMacIcon(app.path, tmpDir);
  }
  cache.set(app.path, icon);
  return icon;
}

// アプリの一覧に、アイコンを付けて返す
async function withIcons(apps) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'launcher-icons-'));
  const result = new Array(apps.length);
  let next = 0;
  // CONCURRENCY 個ずつ、順に取る
  const worker = async () => {
    while (next < apps.length) {
      const i = next++;
      result[i] = { ...apps[i], icon: await getIcon(apps[i], tmpDir) };
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
  return result;
}

module.exports = { withIcons };
