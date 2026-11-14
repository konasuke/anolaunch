const fs = require('fs');
const os = require('os');
const path = require('path');
const { getMacIcon } = require('./mac');
const { getWindowsIcon } = require('./windows');

const CONCURRENCY = 8; // 同時に動かす変換の数

// アプリのパス → アイコン（data URL）。一度取ったものは使い回す
const cache = new Map();

async function getIcon(appPath, tmpDir) {
  if (cache.has(appPath)) return cache.get(appPath);
  const icon =
    process.platform === 'win32' ? await getWindowsIcon(appPath, tmpDir) : await getMacIcon(appPath, tmpDir);
  cache.set(appPath, icon);
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
      result[i] = { ...apps[i], icon: await getIcon(apps[i].path, tmpDir) };
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await fs.promises.rm(tmpDir, { recursive: true, force: true });
  return result;
}

module.exports = { withIcons };
