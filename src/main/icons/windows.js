const { app, shell, nativeImage } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { ICON_SIZE } = require('./constants');
const { statKey } = require('./cache');

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
// PowerShell（System.Drawing）でファイルに埋め込まれたアイコンを取り出す。
// PowerShell は起動が重い（1回ごとに数百ミリ秒）ので、短い間に来た依頼を、1回の起動にまとめて渡す
const BATCH_DELAY_MS = 100; // 依頼が来てから、まとめて実行するまで待つ時間
const BATCH_SIZE = 20; // 1回の PowerShell に渡す数の上限（環境変数に入れる長さの制限があるため）

// 渡された複数のパスから、アイコン（PNG を base64 にしたもの）を取り出す。結果は、渡した順の配列（取れなければ空文字）
const EXTRACT_SCRIPT =
  '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;' +
  'Add-Type -AssemblyName System.Drawing;' +
  // パスは、「|」で区切って渡す（Windows のファイル名には使えない文字なので、パスの中に混ざらない）
  '$paths=$env:LAUNCHER_ICON_PATHS -split "\\|";' +
  '$out=@();' +
  'foreach ($p in $paths) {' +
  '  $b64="";' +
  '  try {' +
  '    $i=[System.Drawing.Icon]::ExtractAssociatedIcon($p);' +
  '    $ms=New-Object System.IO.MemoryStream;' +
  '    $i.ToBitmap().Save($ms,[System.Drawing.Imaging.ImageFormat]::Png);' +
  '    $b64=[Convert]::ToBase64String($ms.ToArray())' +
  '  } catch {}' +
  '  $out+=$b64' +
  '};' +
  'ConvertTo-Json -Compress -InputObject @($out)';

let pending = []; // { filePath, resolve }
let batchTimer = null;

async function runBatch(batch) {
  try {
    const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', EXTRACT_SCRIPT], {
      encoding: 'utf8',
      env: { ...process.env, LAUNCHER_ICON_PATHS: batch.map((b) => b.filePath).join('|') },
    });
    const results = JSON.parse(stdout);
    const list = Array.isArray(results) ? results : [results];
    batch.forEach((b, i) => b.resolve(list[i] ? `data:image/png;base64,${list[i]}` : null));
  } catch {
    batch.forEach((b) => b.resolve(null)); // 取れなければ、アイコンなし
  }
}

function flushBatches() {
  batchTimer = null;
  const all = pending;
  pending = [];
  for (let i = 0; i < all.length; i += BATCH_SIZE) runBatch(all.slice(i, i + BATCH_SIZE));
}

function iconFromExtract(filePath) {
  return new Promise((resolve) => {
    pending.push({ filePath, resolve });
    if (!batchTimer) batchTimer = setTimeout(flushBatches, BATCH_DELAY_MS);
  });
}

// ショートカットから、アイコンを取り出す元のファイルを決める
// （.lnk 自体のアイコンだと、ショートカットの矢印が付くことがあるため、指す先のファイルにする）
function iconSourceOf(appPath) {
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
  return target;
}

// ファイルに残すアイコンの鍵。ショートカットと、アイコンを取り出す元のファイルの、大きさと更新日時
// （どちらかが変わると、鍵が変わり、取り直される。ファイルが無いときは null で、残さない）
function windowsIconKey(appPath) {
  try {
    const parts = [statKey(appPath), statKey(iconSourceOf(appPath))];
    return parts.every(Boolean) ? parts.join('|') : null;
  } catch {
    return null;
  }
}

// ショートカット（.lnk）の指す先のアイコンを、OS に聞いて取る
async function iconFromShortcut(appPath, tmpDir) {
  const target = iconSourceOf(appPath);
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

module.exports = { getWindowsIcon, windowsIconKey };
