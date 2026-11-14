const { app } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

const ICON_SIZE = 64; // 画面では 24px で表示する。高解像度の画面用に大きめに作る
const CONCURRENCY = 8; // 同時に動かす変換の数

// アプリのパス → アイコン（data URL）。一度取ったものは使い回す
const cache = new Map();

// Mac：アプリ自身が持つアイコンファイル（.icns）を、標準の sips で PNG にして読む
// （Electron の nativeImage は .icns を読めず、getFileIcon は汎用のアイコンしか返さなかった）
async function iconFromBundle(appPath, tmpDir) {
  const plist = path.join(appPath, 'Contents', 'Info.plist');
  const { stdout } = await execFileAsync('plutil', ['-extract', 'CFBundleIconFile', 'raw', '-o', '-', plist]);
  let file = stdout.trim();
  if (!file) return null;
  if (!file.endsWith('.icns')) file += '.icns';
  const icnsPath = path.join(appPath, 'Contents', 'Resources', file);
  if (!fs.existsSync(icnsPath)) return null;

  const pngPath = path.join(tmpDir, `${cache.size}-${Math.random().toString(36).slice(2)}.png`);
  await execFileAsync('sips', ['-s', 'format', 'png', '-Z', String(ICON_SIZE), icnsPath, '--out', pngPath]);
  const png = await fs.promises.readFile(pngPath);
  return `data:image/png;base64,${png.toString('base64')}`;
}

// Mac：.icns を持たないアプリ（新しい形式のアイコン）は、OS に聞いて PNG にしてもらう
async function iconFromWorkspace(appPath, tmpDir) {
  const pngPath = path.join(tmpDir, `ws-${Math.random().toString(36).slice(2)}.png`);
  await execFileAsync('osascript', ['-l', 'JavaScript', path.join(__dirname, 'icon.jxa'), appPath, pngPath]);
  const png = await fs.promises.readFile(pngPath);
  return `data:image/png;base64,${png.toString('base64')}`;
}

// Windows など：OS が返すアイコン
async function iconFromOS(appPath) {
  const image = await app.getFileIcon(appPath);
  return image.isEmpty() ? null : image.toDataURL();
}

async function getIcon(appPath, tmpDir) {
  if (cache.has(appPath)) return cache.get(appPath);
  let icon = null;
  if (process.platform === 'darwin') {
    // 速い方法（.icns）を先に試し、だめなら OS に聞く。どちらも取れなければ、アイコンなし
    icon = await iconFromBundle(appPath, tmpDir).catch(() => null);
    if (!icon) icon = await iconFromWorkspace(appPath, tmpDir).catch(() => null);
  } else {
    icon = await iconFromOS(appPath).catch(() => null);
  }
  cache.set(appPath, icon);
  return icon;
}

// アプリの一覧に、アイコンを付けて返す
async function withIcons(apps) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lancher-icons-'));
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
