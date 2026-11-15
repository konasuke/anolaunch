import { app } from 'electron';
import fs from 'fs';
import path from 'path';

// お気に入りのアプリ。アプリの path の配列を、入れた順に、OS のアプリ用データフォルダの favorites.json に保存する。
// 設定（settings.json）とは別にしてある（設定の「初期値に戻す」などで、お気に入りまで消えないように）

function favoritesFile() {
  return path.join(app.getPath('userData'), 'favorites.json');
}

// ファイルから読む。無いとき、壊れているときは、空の一覧にする
function load(): string[] {
  try {
    const raw = JSON.parse(fs.readFileSync(favoritesFile(), 'utf8'));
    if (Array.isArray(raw)) return [...new Set(raw.filter((p) => typeof p === 'string'))];
  } catch {
    // ファイルが無い、壊れているとき
  }
  return [];
}

function save(list: string[]): void {
  const file = favoritesFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 一時ファイルに書いてから入れ替える（書き込みの途中で止まっても、元のファイルが壊れない）
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, file);
}

let current: string[] | null = null;

function getFavorites(): string[] {
  if (!current) current = load();
  return [...current];
}

// 入っていれば外し、入っていなければ末尾に足す。切り替えた後の一覧を返す
function toggleFavorite(appPath: string): string[] {
  const list = getFavorites();
  const index = list.indexOf(appPath);
  if (index >= 0) list.splice(index, 1);
  else list.push(appPath);
  save(list);
  current = list;
  return [...list];
}

export { getFavorites, toggleFavorite };
