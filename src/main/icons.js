const { app, shell, nativeImage } = require('electron');
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

// Windows：ショートカット（.lnk）の指す先のアイコンを、OS に聞いて取る
// （.lnk 自体のアイコンだと、ショートカットの矢印が付くことがあるため）
async function iconFromOS(appPath, tmpDir) {
  let target = appPath;
  try {
    const link = shell.readShortcutLink(appPath);
    // アイコンが別に指定されていればそれ、なければ起動先のファイル
    target = (link.icon && fs.existsSync(link.icon) && link.icon) || link.target || appPath;
  } catch {
    // .lnk として読めなければ、そのまま渡す
  }
  // .ico ファイルが指定されている場合、getFileIcon は .ico 全般の汎用アイコンを返してしまうので、
  // 中身の画像を直接読む
  if (target.toLowerCase().endsWith('.ico')) {
    const ico = nativeImage.createFromPath(target);
    if (!ico.isEmpty()) return ico.resize({ height: ICON_SIZE }).toDataURL();
  }
  const image = await app.getFileIcon(target, { size: 'large' });
  const icon = image.isEmpty() ? null : image.toDataURL();
  // 取れたのが汎用の .exe アイコンなら、アプリ固有のアイコンが取れていない
  if (icon && icon === (await genericExeIcon(tmpDir))) return iconFromExtract(target);
  return icon;
}

// Windows：汎用の .exe アイコン。中身が空の .exe に対して OS が返すもの（一度だけ作る）
let genericExePromise = null;
function genericExeIcon(tmpDir) {
  if (!genericExePromise) {
    genericExePromise = (async () => {
      const file = path.join(tmpDir, 'generic.exe');
      await fs.promises.writeFile(file, '');
      return (await app.getFileIcon(file, { size: 'large' })).toDataURL();
    })().catch(() => null); // 作れなければ、汎用アイコンの判定をしないだけ
  }
  return genericExePromise;
}

// Windows：getFileIcon が汎用アイコンしか返さないファイル（Antigravity など）は、
// PowerShell（System.Drawing）でファイルに埋め込まれたアイコンを取り出す
async function iconFromExtract(filePath) {
  const script =
    'Add-Type -AssemblyName System.Drawing;' +
    '$i=[System.Drawing.Icon]::ExtractAssociatedIcon($env:LAUNCHER_ICON_PATH);' +
    '$ms=New-Object System.IO.MemoryStream;' +
    '$i.ToBitmap().Save($ms,[System.Drawing.Imaging.ImageFormat]::Png);' +
    '[Convert]::ToBase64String($ms.ToArray())';
  const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', script], {
    env: { ...process.env, LAUNCHER_ICON_PATH: filePath },
  });
  const base64 = stdout.trim();
  return base64 ? `data:image/png;base64,${base64}` : null;
}

async function getIcon(appPath, tmpDir) {
  if (cache.has(appPath)) return cache.get(appPath);
  let icon = null;
  if (process.platform === 'darwin') {
    // 速い方法（.icns）を先に試し、だめなら OS に聞く。どちらも取れなければ、アイコンなし
    icon = await iconFromBundle(appPath, tmpDir).catch(() => null);
    if (!icon) icon = await iconFromWorkspace(appPath, tmpDir).catch(() => null);
  } else {
    icon = await iconFromOS(appPath, tmpDir).catch(() => null);
  }
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
