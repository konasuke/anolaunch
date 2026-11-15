import { app } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { KIND } from '../../shared/kinds';
import type { AppEntry } from '../../shared/types';

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
function pickLogo(installDir: string, logoRelPath: string): string | null {
  const full = path.join(installDir, logoRelPath);
  const dir = path.dirname(full);
  const base = path.basename(full, path.extname(full));
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.startsWith(`${base}.`) && f.endsWith('.png'));
  } catch {
    return null;
  }
  const score = (f: string): number => {
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
function logoOf(installDir: string, appId: string): string | null {
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

// 読み込んだストアアプリ。getApps は同期で呼ばれるので、先に読み込んで持っておく
let cache: AppEntry[] = [];

// ファイルにも残す（次の起動のとき、PowerShell を待たずに、すぐ使えるように）
const FILE_VERSION = 1;

function cacheFile() {
  return path.join(app.getPath('userData'), 'uwp-apps.json');
}

function readCacheFile(): AppEntry[] | null {
  try {
    const saved = JSON.parse(fs.readFileSync(cacheFile(), 'utf8'));
    return saved.version === FILE_VERSION && Array.isArray(saved.apps) ? saved.apps : null;
  } catch {
    return null;
  }
}

function writeCacheFile(apps: AppEntry[]): void {
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    fs.writeFileSync(cacheFile(), JSON.stringify({ version: FILE_VERSION, apps }));
  } catch {
    // 保存できなくても、困らない（次の起動で、また読み込む）
  }
}

// PowerShell で、今のストアアプリを取り直す。成功したら、メモリとファイルを入れ替える
async function loadUwp(): Promise<void> {
  if (process.platform !== 'win32') return;
  try {
    const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', SCRIPT], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    const data: { apps?: { Name: string; AppID: string }[]; pkgs?: { PackageFamilyName: string; InstallLocation: string }[] } = JSON.parse(stdout);
    const installDirs = new Map((data.pkgs || []).map((p) => [p.PackageFamilyName, p.InstallLocation] as const));
    cache = (data.apps || []).map(({ Name, AppID }): AppEntry => {
      const [family, appId] = AppID.split('!');
      const dir = installDirs.get(family);
      return { name: Name, path: PREFIX + AppID, kind: KIND.STORE, iconFile: dir ? logoOf(dir, appId) : null };
    });
    writeCacheFile(cache);
  } catch (error) {
    console.error('ストアアプリを読み込めませんでした:', error instanceof Error ? error.message : error);
  }
}

// 起動時に呼ぶ。前に保存した一覧があれば、それをすぐ使う（待たない）。無ければ（初めての起動）、PowerShell で読み込む
// 最新の状態への更新は、reloadUwp を、別に呼ぶ
function preloadUwp(): Promise<void> {
  const saved = process.platform === 'win32' ? readCacheFile() : null;
  if (saved) {
    cache = saved;
    return Promise.resolve();
  }
  return loadUwp();
}

// PowerShell で読み込み直す（再スキャンや、キャッシュの削除のとき）。終わるまで、前の一覧を使い続ける
function reloadUwp(): Promise<void> {
  return loadUwp();
}

function getUwpApps(): AppEntry[] {
  return cache;
}

export { PREFIX, preloadUwp, reloadUwp, getUwpApps };
