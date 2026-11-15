import fs from 'fs';
import os from 'os';
import path from 'path';
import { getMacIcon, macIconKey } from './mac';
import { getWindowsIcon, windowsIconKey } from './windows';
import { iconFromImageFile } from './file';
import { readCachedIcon, writeCachedIcon, clearDiskCache, pruneDiskCache } from './cache';
import type { AppEntry } from '../../shared/types';

const CONCURRENCY = 8; // 同時に動かす変換の数（別プロセスを呼ぶ OS があるので、増やしすぎない）

// アプリのパス → アイコン（data URL）を取る処理。一度取ったものは使い回す（取っている最中のものも、同じ処理を待つ）
const cache = new Map<string, Promise<string | null>>();

// 変換の途中ファイルを置く一時フォルダ。初めて使うときに作り、終了時に消す
let tmpDir: string | null = null;
function getTmpDir(): string {
  if (!tmpDir) tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anolaunch-icons-'));
  return tmpDir;
}

function cleanupIcons(): void {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
}

// 同時に動かす数を CONCURRENCY までにする待ち行列
const queue: { task: () => Promise<string | null>; resolve: (icon: string | null) => void }[] = [];
let running = 0;

function pump(): void {
  while (running < CONCURRENCY && queue.length > 0) {
    const { task, resolve } = queue.shift()!;
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

function limit(task: () => Promise<string | null>): Promise<string | null> {
  return new Promise((resolve) => {
    queue.push({ task, resolve });
    pump();
  });
}

// OS に聞いて取る（時間がかかる）。取れたら、ファイルにも残す
async function fetchFromOS(app: AppEntry): Promise<string | null> {
  const isWindows = process.platform === 'win32';
  const key = isWindows ? windowsIconKey(app.path) : macIconKey(app.path);
  if (key) {
    const saved = readCachedIcon(key); // 前に取ったものが、ファイルに残っていれば、それを使う
    if (saved) return saved;
  }
  const dir = getTmpDir();
  const icon = await (isWindows ? getWindowsIcon(app.path, dir) : getMacIcon(app.path, dir));
  if (icon && key) writeCachedIcon(key, icon);
  return icon;
}

async function fetchIcon(app: AppEntry): Promise<string | null> {
  if (app.iconFile) return iconFromImageFile(app.iconFile); // アイコンのファイルが分かっているもの（Steam のゲーム、ストアアプリ）。読むだけなので、残さない
  if (/^(steam|shell):/.test(app.path)) return null;
  return fetchFromOS(app);
}

// アプリ1件のアイコン（data URL。取れなければ null）を返す。画面に出すときに、必要な分だけ呼ぶ
function getIcon(app: AppEntry): Promise<string | null> {
  let icon = cache.get(app.path);
  if (!icon) {
    icon = limit(() => fetchIcon(app));
    cache.set(app.path, icon);
  }
  return icon;
}

// 取ってあるアイコンを全部捨てる（メモリも、ファイルも）。次に表示するとき、OS に聞いて取り直す
function clearIconCache(): void {
  cache.clear();
  clearDiskCache();
}

export { getIcon, clearIconCache, cleanupIcons, pruneDiskCache as pruneIconCache };
