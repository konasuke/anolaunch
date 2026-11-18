import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { Aliases } from '../../shared/types';

// アプリの別名。アプリの path → 別名の配列を、OS のアプリ用データフォルダの aliases.json に保存する。
// 設定（settings.json）とは別にしてある（設定の「初期値に戻す」などで、別名まで消えないように）

const MAX_ALIASES = 10; // 1 つのアプリに付けられる別名の数
const MAX_LENGTH = 50; // 別名 1 つの長さ

function aliasesFile() {
  return path.join(app.getPath('userData'), 'aliases.json');
}

// 別名の配列を整える：文字列だけ、前後の空白を削る、空は除く、大文字小文字を区別せず重なりを除く、数と長さに上限
function normalize(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const text = item.trim().slice(0, MAX_LENGTH);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= MAX_ALIASES) break;
  }
  return result;
}

// ファイルから読む。無いとき、壊れているときは、空にする
function load(): Aliases {
  const result: Aliases = {};
  try {
    const raw = JSON.parse(fs.readFileSync(aliasesFile(), 'utf8'));
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [appPath, list] of Object.entries(raw)) {
        const aliases = normalize(list);
        if (aliases.length > 0) result[appPath] = aliases;
      }
    }
  } catch {
    // ファイルが無い、壊れているとき
  }
  return result;
}

function save(aliases: Aliases): void {
  const file = aliasesFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 一時ファイルに書いてから入れ替える（書き込みの途中で止まっても、元のファイルが壊れない）
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(aliases, null, 2));
  fs.renameSync(tmp, file);
}

let current: Aliases | null = null;

function getAliases(): Aliases {
  if (!current) current = load();
  return { ...current };
}

// 1 つのアプリの別名を、置き換える（空にすると、そのアプリの別名を消す）。置き換えた後の全部を返す
function setAliases(appPath: string, aliases: unknown): Aliases {
  const all = getAliases();
  const list = normalize(aliases);
  if (list.length > 0) all[appPath] = list;
  else delete all[appPath];
  save(all);
  current = all;
  return { ...all };
}

export { getAliases, setAliases };
