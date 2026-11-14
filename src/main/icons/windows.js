const { app, shell, nativeImage } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { ICON_SIZE } = require('./constants');

const execFileAsync = promisify(execFile);

// 汎用の .exe アイコン。中身が空の .exe に対して OS が返すもの（一度だけ作る）
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

// getFileIcon が汎用アイコンしか返さないファイル（Antigravity など）は、
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

// ショートカット（.lnk）の指す先のアイコンを、OS に聞いて取る
// （.lnk 自体のアイコンだと、ショートカットの矢印が付くことがあるため）
async function iconFromShortcut(appPath, tmpDir) {
  let target = appPath;
  if (appPath.toLowerCase().endsWith('.url')) {
    // .url（Steam のゲームなど）は、IconFile= に、アイコンのファイルが書かれている
    const match = fs.readFileSync(appPath, 'utf8').match(/^IconFile=(.+)$/m);
    const iconFile = match ? match[1].trim() : '';
    if (iconFile && fs.existsSync(iconFile)) target = iconFile;
  } else {
    try {
      const link = shell.readShortcutLink(appPath);
      // アイコンが別に指定されていればそれ、なければ起動先のファイル
      target = (link.icon && fs.existsSync(link.icon) && link.icon) || link.target || appPath;
    } catch {
      // .lnk として読めなければ、そのまま渡す
    }
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

async function getWindowsIcon(appPath, tmpDir) {
  return iconFromShortcut(appPath, tmpDir).catch(() => null);
}

module.exports = { getWindowsIcon };
