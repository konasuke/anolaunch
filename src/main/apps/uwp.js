const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { KIND } = require('../../shared/kinds');

const execFileAsync = promisify(execFile);

// 起動に使う接頭辞。ストアアプリは、shell:AppsFolder\パッケージ名!アプリ名 を開くと起動する
const PREFIX = 'shell:AppsFolder\\';

// スタートメニューのアプリ一覧（Get-StartApps）と、インストール済みのストアアプリの場所（Get-AppxPackage）を、一度に取る
const SCRIPT =
  '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;' +
  '$apps=@(Get-StartApps | Where-Object { $_.AppID -like "*!*" } | Select-Object Name,AppID);' +
  '$pkgs=@(Get-AppxPackage | Select-Object PackageFamilyName,InstallLocation);' +
  '@{apps=$apps;pkgs=$pkgs} | ConvertTo-Json -Compress -Depth 3';

// ロゴの画像ファイルを選ぶ。Assets の中には、サイズ違い・色違いが何種類も並ぶので、一覧で見やすい順に選ぶ
function pickLogo(installDir, logoRelPath) {
  const full = path.join(installDir, logoRelPath);
  const dir = path.dirname(full);
  const base = path.basename(full, path.extname(full));
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.startsWith(`${base}.`) && f.endsWith('.png'));
  } catch {
    return null;
  }
  const score = (f) => {
    if (/contrast|lightunplated|darkunplated/i.test(f)) return 99; // 高コントラスト版などは使わない
    const size = f.match(/targetsize-(\d+)/i);
    if (size) return Math.abs(Number(size[1]) - 48) + (/altform-unplated/i.test(f) ? 0 : 1); // 48px に近いもの
    if (/scale-200/i.test(f)) return 60;
    if (/scale-100/i.test(f)) return 61;
    return 70;
  };
  files.sort((a, b) => score(a) - score(b));
  return files.length > 0 && score(files[0]) < 99 ? path.join(dir, files[0]) : null;
}

// AppxManifest.xml から、アプリ（Id）のロゴの場所を読む
function logoOf(installDir, appId) {
  try {
    const xml = fs.readFileSync(path.join(installDir, 'AppxManifest.xml'), 'utf8');
    // 該当の <Application> の中の、小さいロゴの指定
    const block = xml.split(/<Application\s/).slice(1).find((b) => new RegExp(`Id="${appId}"`, 'i').test(b.split('>')[0]));
    const match = (block || xml).match(/Square44x44Logo="([^"]+)"/) || (block || xml).match(/Square150x150Logo="([^"]+)"/);
    return match ? pickLogo(installDir, match[1]) : null;
  } catch {
    return null;
  }
}

// 読み込んだストアアプリ。getApps は同期で呼ばれるので、先に一度だけ読み込んで持っておく
let cache = [];
let loading = null;

async function loadUwp() {
  if (process.platform !== 'win32') return;
  try {
    const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', SCRIPT], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    const data = JSON.parse(stdout);
    const installDirs = new Map((data.pkgs || []).map((p) => [p.PackageFamilyName, p.InstallLocation]));
    cache = (data.apps || []).map(({ Name, AppID }) => {
      const [family, appId] = AppID.split('!');
      const dir = installDirs.get(family);
      return { name: Name, path: PREFIX + AppID, kind: KIND.STORE, iconFile: dir ? logoOf(dir, appId) : null };
    });
  } catch (error) {
    console.error('ストアアプリを読み込めませんでした:', error.message);
  }
}

// 読み込みを始める（一度だけ）。終わるまで待ちたいときは、返ってくる Promise を待つ
function preloadUwp() {
  if (!loading) loading = loadUwp();
  return loading;
}

// 読み込み直す（キャッシュの削除用）。終わるまで、前の一覧を使い続ける
function reloadUwp() {
  loading = loadUwp();
  return loading;
}

function getUwpApps() {
  return cache;
}

module.exports = { PREFIX, preloadUwp, reloadUwp, getUwpApps };
