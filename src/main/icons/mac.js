const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { ICON_SIZE } = require('./constants');

const execFileAsync = promisify(execFile);

// アプリ自身が持つアイコンファイル（.icns）を、標準の sips で PNG にして読む
// （Electron の nativeImage は .icns を読めず、getFileIcon は汎用のアイコンしか返さなかった）
async function iconFromBundle(appPath, tmpDir) {
  const plist = path.join(appPath, 'Contents', 'Info.plist');
  const { stdout } = await execFileAsync('plutil', ['-extract', 'CFBundleIconFile', 'raw', '-o', '-', plist]);
  let file = stdout.trim();
  if (!file) return null;
  if (!file.endsWith('.icns')) file += '.icns';
  const icnsPath = path.join(appPath, 'Contents', 'Resources', file);
  if (!fs.existsSync(icnsPath)) return null;

  const pngPath = path.join(tmpDir, `${Math.random().toString(36).slice(2)}.png`);
  await execFileAsync('sips', ['-s', 'format', 'png', '-Z', String(ICON_SIZE), icnsPath, '--out', pngPath]);
  const png = await fs.promises.readFile(pngPath);
  return `data:image/png;base64,${png.toString('base64')}`;
}

// .icns を持たないアプリ（新しい形式のアイコン）は、OS に聞いて PNG にしてもらう
async function iconFromWorkspace(appPath, tmpDir) {
  const pngPath = path.join(tmpDir, `ws-${Math.random().toString(36).slice(2)}.png`);
  await execFileAsync('osascript', ['-l', 'JavaScript', path.join(__dirname, 'icon.jxa'), appPath, pngPath]);
  const png = await fs.promises.readFile(pngPath);
  return `data:image/png;base64,${png.toString('base64')}`;
}

// 速い方法（.icns）を先に試し、だめなら OS に聞く。どちらも取れなければ、アイコンなし
async function getMacIcon(appPath, tmpDir) {
  const icon = await iconFromBundle(appPath, tmpDir).catch(() => null);
  if (icon) return icon;
  return iconFromWorkspace(appPath, tmpDir).catch(() => null);
}

module.exports = { getMacIcon };
